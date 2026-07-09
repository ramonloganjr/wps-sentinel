import { describe, it, expect } from 'vitest';
import {
  haversineNm, pointInPolygon, isValidCoordinate, sanitizePosition,
  midToFlag, aisTypeToVesselType, isIncursion, isInWPS, normalizeFlag,
} from './ais';
import type { Vessel } from '../types';

function vessel(partial: Partial<Vessel>): Vessel {
  return {
    mmsi: '000000000', name: 'Test', flag: 'XX', type: 'unknown',
    lat: 0, lng: 0, speed: 0, heading: 0, status: 'Test',
    lastSeen: new Date().toISOString(),
    ...partial,
  };
}

describe('haversineNm', () => {
  it('is ~60nm per degree of latitude', () => {
    expect(haversineNm(0, 0, 1, 0)).toBeCloseTo(60, 0);
  });
  it('is zero for identical points', () => {
    expect(haversineNm(14, 120, 14, 120)).toBe(0);
  });
});

describe('pointInPolygon', () => {
  const square: [number, number][] = [[0, 0], [0, 10], [10, 10], [10, 0]];
  it('detects an interior point', () => {
    expect(pointInPolygon(5, 5, square)).toBe(true);
  });
  it('rejects an exterior point', () => {
    expect(pointInPolygon(20, 20, square)).toBe(false);
  });
});

describe('isValidCoordinate', () => {
  it('rejects the AIS null-island sentinel (0,0)', () => {
    expect(isValidCoordinate(0, 0)).toBe(false);
  });
  it('rejects out-of-range values', () => {
    expect(isValidCoordinate(100, 200)).toBe(false);
  });
  it('rejects points far outside the EEZ bounding box', () => {
    expect(isValidCoordinate(13, 100)).toBe(false);
  });
  it('accepts a point inside the Philippine EEZ', () => {
    expect(isValidCoordinate(12.27, 122.16)).toBe(true);
  });
});

describe('sanitizePosition', () => {
  it('returns null for invalid input', () => {
    expect(sanitizePosition('abc', 120)).toBeNull();
    expect(sanitizePosition(0, 0)).toBeNull();
  });
  it('rounds a valid position to 6 decimals', () => {
    expect(sanitizePosition(12.123456789, 122.987654321)).toEqual({ lat: 12.123457, lng: 122.987654 });
  });
});

describe('midToFlag', () => {
  it('maps known MIDs to ISO codes', () => {
    expect(midToFlag('548123456')).toBe('PH');
    expect(midToFlag('412000001')).toBe('CN');
    expect(midToFlag('338999999')).toBe('US');
    expect(midToFlag('574000000')).toBe('VN');
  });
  it('falls back to XX for unknown or malformed MMSI', () => {
    expect(midToFlag('999000000')).toBe('XX');
    expect(midToFlag('12')).toBe('XX');
  });
});

describe('aisTypeToVesselType', () => {
  it('maps AIS ship-type codes to app types', () => {
    expect(aisTypeToVesselType(30)).toBe('fishing');
    expect(aisTypeToVesselType(35)).toBe('military');
    expect(aisTypeToVesselType(55)).toBe('coastguard');
    expect(aisTypeToVesselType(70)).toBe('cargo');
    expect(aisTypeToVesselType(89)).toBe('tanker');
  });
  it('resolves unknown/absent codes to unknown', () => {
    expect(aisTypeToVesselType(60)).toBe('unknown');
    expect(aisTypeToVesselType(0)).toBe('unknown');
    expect(aisTypeToVesselType(undefined)).toBe('unknown');
    expect(aisTypeToVesselType(NaN)).toBe('unknown');
  });
});

describe('isIncursion', () => {
  it('flags a foreign vessel inside a sensitive zone (Scarborough)', () => {
    expect(isIncursion(vessel({ flag: 'CN', lat: 15.1333, lng: 117.75 }))).toBe(true);
  });
  it('never flags Philippine-flagged vessels', () => {
    expect(isIncursion(vessel({ flag: 'PH', lat: 15.1333, lng: 117.75 }))).toBe(false);
  });
  it('never flags unknown-flag (XX) vessels', () => {
    expect(isIncursion(vessel({ flag: 'XX', lat: 15.1333, lng: 117.75 }))).toBe(false);
  });
  it('does not flag a foreign vessel far from any sensitive zone', () => {
    expect(isIncursion(vessel({ flag: 'CN', lat: 5, lng: 125 }))).toBe(false);
  });
});

describe('isInWPS', () => {
  it('detects a vessel inside the WPS zone', () => {
    expect(isInWPS(vessel({ lat: 13, lng: 118 }))).toBe(true);
  });
  it('rejects a vessel east of the WPS eastern boundary', () => {
    expect(isInWPS(vessel({ lat: 13, lng: 122 }))).toBe(false);
  });
});

describe('normalizeFlag', () => {
  it('uppercases and truncates to two characters', () => {
    expect(normalizeFlag('ph')).toBe('PH');
    expect(normalizeFlag('')).toBe('XX');
  });
});
