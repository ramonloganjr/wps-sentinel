import { useEffect, useRef, useCallback } from 'react';
import {
  AISSTREAM_API_KEY, AISSTREAM_WS_URL, AISSTREAM_BOUNDING_BOX,
  AIS_STALE_MS, REFRESH_MS, MOCK_VESSEL_NAMES, VESSEL_TYPES,
} from '../constants';
import { useAppStore } from '../store/useAppStore';
import type { Vessel, VesselType } from '../types';
import { isIncursion, isInWPS, sanitizePosition } from '../utils/ais';

// ── Mock positions spread across the full Philippine EEZ ─────────────────────
const MOCK_POSITIONS: [number, number][] = [
  [15.13, 117.75], [12.50, 116.00], [10.50, 114.50],
  [ 9.73, 115.87], [ 9.84, 118.79], [11.00, 117.00],
  [18.50, 121.50], [17.00, 120.50], [16.00, 119.80],
  [14.00, 124.50], [12.00, 125.00], [10.00, 126.00],
  [16.50, 124.00], [15.00, 123.50],
  [ 6.50, 120.50], [ 5.50, 119.00], [ 7.50, 122.00],
  [ 8.00, 117.50], [ 9.00, 118.50], [ 6.00, 121.50],
];

function generateMockVessels(): Vessel[] {
  const types = Object.keys(VESSEL_TYPES) as VesselType[];
  const flags = ['PH', 'CN', 'VN', 'MY', 'US', 'XX', 'PH', 'PH'];
  return Array.from({ length: 20 }, (_, i) => {
    const type = types[i % types.length];
    const flag = (type === 'military' && i === 1) || (type === 'fishing' && i === 4) ? 'CN' : flags[i % flags.length];
    const [baseLat, baseLng] = MOCK_POSITIONS[i % MOCK_POSITIONS.length];
    const lat = Math.round((baseLat + (Math.random() - 0.5) * 0.6) * 1e6) / 1e6;
    const lng = Math.round((baseLng + (Math.random() - 0.5) * 0.6) * 1e6) / 1e6;
    const vessel: Vessel = {
      mmsi: `400${String(i).padStart(6, '0')}`,
      name: MOCK_VESSEL_NAMES[i % MOCK_VESSEL_NAMES.length],
      flag, type, lat, lng,
      speed: parseFloat(type === 'fishing' ? (Math.random() * 5).toFixed(1) : (Math.random() * 18 + 2).toFixed(1)),
      heading: Math.floor(Math.random() * 360),
      status: Math.random() > 0.2 ? 'Underway' : 'Anchored',
      lastSeen: new Date().toISOString(),
      lastSeenMs: Date.now(),
    };
    vessel.inWPS = isInWPS(vessel);
    return vessel;
  });
}

// ── Reconnection config ───────────────────────────────────────────────────────
const RECONNECT_BASE_MS  = 3_000;
const RECONNECT_MAX_MS   = 60_000;
const RECONNECT_ATTEMPTS = 5;

export function useAISStream() {
  const { upsertVessel, pruneStaleVessels, setStatus, setLastUpdate, addAlert, alerts } = useAppStore();

  const socketRef        = useRef<WebSocket | null>(null);
  const renderTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIntervalRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef       = useRef(0);
  const destroyedRef     = useRef(false);
  const alertedMMSIs     = useRef<Set<string>>(new Set());

  const checkAndAlert = useCallback((vessel: Vessel) => {
    if (isIncursion(vessel)) {
      const key = `${vessel.mmsi}-INCURSION`;
      if (!alertedMMSIs.current.has(key)) {
        alertedMMSIs.current.add(key);
        addAlert({ type: 'INCURSION', message: `${vessel.name} (${vessel.flag}) near sensitive zone`, mmsi: vessel.mmsi, time: new Date(), vessel });
      }
    }
  }, [addAlert]);

  useEffect(() => {
    alertedMMSIs.current = new Set(alerts.map(a => `${a.mmsi}-${a.type}`));
  }, [alerts]);

  const scheduleRender = useCallback(() => {
    if (renderTimerRef.current) return;
    renderTimerRef.current = setTimeout(() => {
      renderTimerRef.current = null;
      pruneStaleVessels(AIS_STALE_MS);
      setLastUpdate(new Date());
    }, 300);
  }, [pruneStaleVessels, setLastUpdate]);

  // ── Mock polling ─────────────────────────────────────────────────────────
  const startMock = useCallback(() => {
    if (destroyedRef.current) return;
    if (mockIntervalRef.current) return; // already running

    const poll = () => {
      if (destroyedRef.current) return;
      const vessels = generateMockVessels();
      const map: Record<string, Vessel> = {};
      vessels.forEach(v => { map[v.mmsi] = v; checkAndAlert(v); });
      useAppStore.getState().setVessels(map);
      setStatus('live');
      setLastUpdate(new Date());
    };

    poll();
    mockIntervalRef.current = setInterval(poll, REFRESH_MS);
  }, [checkAndAlert, setStatus, setLastUpdate]);

  const stopMock = useCallback(() => {
    if (mockIntervalRef.current) {
      clearInterval(mockIntervalRef.current);
      mockIntervalRef.current = null;
    }
  }, []);

  // ── WebSocket connect ─────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (destroyedRef.current) return;
    if (!AISSTREAM_API_KEY) { startMock(); return; }

    setStatus('connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(AISSTREAM_WS_URL);
    } catch {
      // WebSocket constructor itself can throw in some environments
      startMock();
      return;
    }

    socketRef.current = ws;

    ws.onopen = () => {
      if (destroyedRef.current) { ws.close(); return; }
      attemptRef.current = 0; // reset backoff on success
      stopMock();             // stop mock if it was running as fallback
      ws.send(JSON.stringify({
        APIKey: AISSTREAM_API_KEY,
        BoundingBoxes: [[AISSTREAM_BOUNDING_BOX[0], AISSTREAM_BOUNDING_BOX[1]]],
        FilterMessageTypes: ['PositionReport'],
      }));
      setStatus('live');
    };

    ws.onmessage = (event) => {
      if (destroyedRef.current) return;
      try {
        const msg = JSON.parse(event.data);
        const position = msg?.Message?.PositionReport;
        const meta     = msg?.MetaData;
        const mmsi     = meta?.MMSI;
        if (!mmsi || !position) return;

        const lat = position?.Latitude  ?? meta?.latitude;
        const lng = position?.Longitude ?? meta?.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        const pos = sanitizePosition(lat, lng);
        if (!pos) return;

        const vessel: Vessel = {
          mmsi: String(mmsi),
          name: meta?.ShipName?.trim() || `Vessel ${mmsi}`,
          flag: 'XX', type: 'unknown',
          lat: pos.lat, lng: pos.lng,
          speed:   Math.min(Number(position?.Sog) || 0, 50),
          heading: ((Number(position?.TrueHeading) || 0) + 360) % 360,
          status:  'Reporting',
          lastSeen:   meta?.time_utc ? new Date(meta.time_utc).toISOString() : new Date().toISOString(),
          lastSeenMs: meta?.time_utc ? new Date(meta.time_utc).getTime()     : Date.now(),
        };
        vessel.inWPS = isInWPS(vessel);
        upsertVessel(vessel);
        checkAndAlert(vessel);
        scheduleRender();
      } catch (err) {
        if (import.meta.env.DEV) console.error('AISStream parse error:', err);
      }
    };

    ws.onerror = () => {
      // onerror always precedes onclose — just log, handle in onclose
      if (!destroyedRef.current) setStatus('error');
    };

    ws.onclose = () => {
      if (destroyedRef.current) return;
      socketRef.current = null;

      // Start mock immediately so the UI isn't empty during reconnect
      startMock();

      // Exponential backoff reconnect
      if (attemptRef.current < RECONNECT_ATTEMPTS) {
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attemptRef.current, RECONNECT_MAX_MS);
        attemptRef.current += 1;
        setStatus('offline');
        reconnectTimerRef.current = setTimeout(() => {
          if (!destroyedRef.current) connect();
        }, delay);
      }
      // After max attempts, stay on mock — status already 'live' from mock
    };
  }, [startMock, stopMock, checkAndAlert, scheduleRender, upsertVessel, setStatus]);

  // ── Mount / unmount ───────────────────────────────────────────────────────
  useEffect(() => {
    destroyedRef.current = false;
    connect();

    return () => {
      destroyedRef.current = true;
      socketRef.current?.close();
      socketRef.current = null;
      stopMock();
      if (renderTimerRef.current)   clearTimeout(renderTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
