import { SENSITIVE_ZONES, WPS_ZONE_POLYGON, AISSTREAM_BOUNDING_BOX } from '../constants';
import type { Vessel } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────
const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_NM = 3440.065; // nautical miles

// ── Haversine distance (nautical miles) ──────────────────────────────────────
/**
 * Returns the great-circle distance between two points in nautical miles.
 * More accurate than Euclidean degree-distance for maritime zone checks.
 */
export function haversineNm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * DEG_TO_RAD) * Math.cos(lat2 * DEG_TO_RAD) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_NM * Math.asin(Math.sqrt(a));
}

// ── Point-in-polygon (ray casting) ──────────────────────────────────────────
/**
 * Polygon vertices must be [lat, lng] pairs — consistent with Vessel coords.
 * GeoJSON uses [lng, lat]; always swap when importing from GeoJSON.
 */
export function pointInPolygon(lat: number, lng: number, polygon: [number, number][]): boolean {
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const [yi, xi] = polygon[i]; // yi = lat, xi = lng
    const [yj, xj] = polygon[j];
    const intersect =
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

// ── Coordinate validation ────────────────────────────────────────────────────
/**
 * Validates that a lat/lng pair is:
 * - Finite numbers
 * - Not the AIS default null-island (0, 0)
 * - Within the Philippine EEZ bounding box with a 2° margin
 */
export function isValidCoordinate(lat: number, lng: number): boolean {
  if (!isFinite(lat) || !isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false; // AIS null-island sentinel
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;

  const [[minLat, minLng], [maxLat, maxLng]] = AISSTREAM_BOUNDING_BOX;
  const MARGIN = 2; // degrees — allow slight overshoot at EEZ edge
  return (
    lat >= minLat - MARGIN &&
    lat <= maxLat + MARGIN &&
    lng >= minLng - MARGIN &&
    lng <= maxLng + MARGIN
  );
}

/**
 * Clamps a value to [min, max] and rounds to 6 decimal places (~0.1m precision).
 */
export function clampCoord(value: number, min: number, max: number): number {
  return Math.round(Math.min(Math.max(value, min), max) * 1e6) / 1e6;
}

/**
 * Sanitizes and validates a vessel's lat/lng.
 * Returns null if the position is invalid and should be discarded.
 */
export function sanitizePosition(lat: unknown, lng: unknown): { lat: number; lng: number } | null {
  const la = Number(lat);
  const lo = Number(lng);
  if (!isValidCoordinate(la, lo)) return null;
  return {
    lat: clampCoord(la, -90, 90),
    lng: clampCoord(lo, -180, 180),
  };
}

// ── Zone checks ──────────────────────────────────────────────────────────────
export function isInWPS(vessel: Vessel): boolean {
  return pointInPolygon(vessel.lat, vessel.lng, WPS_ZONE_POLYGON);
}

export function isIncursion(vessel: Vessel): boolean {
  // Philippine and unknown-flag vessels are not flagged as incursions
  if (vessel.flag === 'PH' || vessel.flag === 'XX') return false;
  return SENSITIVE_ZONES.some(
    (z) => haversineNm(vessel.lat, vessel.lng, z.lat, z.lng) <= z.radiusNm
  );
}

// ── Utilities ────────────────────────────────────────────────────────────────
export function normalizeFlag(flag: string): string {
  return String(flag || 'XX').toUpperCase().slice(0, 2);
}

export function exportData(vessels: Vessel[], alerts: unknown[]): void {
  const payload = {
    exportedAt: new Date().toISOString(),
    source: 'WPS Sentinel',
    vessels,
    alerts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wps-sentinel-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
