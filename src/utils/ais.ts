import { SENSITIVE_ZONES, WPS_ZONE_POLYGON, AISSTREAM_BOUNDING_BOX } from '../constants';
import type { Vessel, VesselType } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────
const DEG_TO_RAD = Math.PI / 180;
const EARTH_RADIUS_NM = 3440.065; // nautical miles

// ── MMSI → flag (ITU Maritime Identification Digits) ─────────────────────────
/**
 * Maps the first three MMSI digits (MID) to an ISO 3166-1 alpha-2 flag.
 * Covers the South China Sea / Indo-Pacific region plus major maritime and
 * flag-of-convenience states — i.e. every flag realistically seen in the
 * Philippine EEZ bounding box. Unmapped prefixes fall back to 'XX'.
 * Source: ITU Table of Maritime Identification Digits.
 */
const MID_TO_ISO: Record<string, string> = {
  // ── South China Sea / Southeast Asia ──
  '548': 'PH',
  '412': 'CN', '413': 'CN', '414': 'CN', '477': 'HK', '453': 'MO', '416': 'TW',
  '574': 'VN', '533': 'MY', '525': 'ID', '567': 'TH', '508': 'BN',
  '514': 'KH', '515': 'KH', '506': 'MM',
  '563': 'SG', '564': 'SG', '565': 'SG', '566': 'SG',
  // ── East Asia ──
  '431': 'JP', '432': 'JP', '440': 'KR', '441': 'KR', '445': 'KP',
  // ── South Asia ──
  '419': 'IN', '405': 'BD', '417': 'LK', '463': 'PK',
  // ── Oceania ──
  '503': 'AU', '512': 'NZ', '540': 'NC', '553': 'PG',
  // ── Americas ──
  '338': 'US', '366': 'US', '367': 'US', '368': 'US', '369': 'US', '358': 'US', '359': 'US',
  '316': 'CA', '710': 'BR',
  // ── Europe ──
  '273': 'RU', '271': 'TR',
  '232': 'GB', '233': 'GB', '234': 'GB', '235': 'GB',
  '226': 'FR', '227': 'FR', '228': 'FR',
  '211': 'DE', '218': 'DE',
  '244': 'NL', '245': 'NL', '246': 'NL',
  '247': 'IT', '224': 'ES', '225': 'ES',
  '237': 'GR', '239': 'GR', '240': 'GR', '241': 'GR',
  '257': 'NO', '258': 'NO', '259': 'NO', '219': 'DK', '220': 'DK',
  // ── Middle East ──
  '403': 'SA', '470': 'AE', '471': 'AE', '422': 'IR',
  // ── Flags of convenience (common on cargo/tankers) ──
  '351': 'PA', '352': 'PA', '353': 'PA', '354': 'PA', '355': 'PA', '356': 'PA',
  '357': 'PA', '370': 'PA', '371': 'PA', '372': 'PA', '373': 'PA', '374': 'PA',
  '636': 'LR', '637': 'LR', '538': 'MH', '215': 'MT', '229': 'MT', '248': 'MT', '249': 'MT', '256': 'MT',
  '209': 'CY', '210': 'CY', '212': 'CY', '308': 'BS', '309': 'BS', '311': 'BS',
};

/**
 * Derives the vessel flag (ISO alpha-2) from its MMSI.
 * Returns 'XX' when the MID is unknown or the MMSI is malformed.
 */
export function midToFlag(mmsi: string): string {
  const digits = String(mmsi).replace(/\D/g, '');
  if (digits.length < 3) return 'XX';
  return MID_TO_ISO[digits.slice(0, 3)] ?? 'XX';
}

// ── AIS ship-type code → app VesselType ──────────────────────────────────────
/**
 * Maps an AIS static ship-type code (0–99) to one of the app's vessel types.
 * See ITU-R M.1371 Table 53. Codes with no direct app equivalent (passenger,
 * sailing, pleasure, tugs, etc.) resolve to 'unknown'.
 */
export function aisTypeToVesselType(code: number | null | undefined): VesselType {
  if (code == null || !Number.isFinite(code)) return 'unknown';
  if (code === 30) return 'fishing';                 // Fishing
  if (code === 35) return 'military';                // Military operations
  if (code === 51 || code === 55) return 'coastguard'; // SAR / Law enforcement
  if (code >= 70 && code <= 79) return 'cargo';      // Cargo
  if (code >= 80 && code <= 89) return 'tanker';     // Tanker
  return 'unknown';
}

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
