import { useEffect, useRef, useCallback } from 'react';
import {
  AISSTREAM_API_KEY, AISSTREAM_WS_URL, AISSTREAM_BOUNDING_BOX,
  AIS_STALE_MS, REFRESH_MS, MOCK_VESSELS,
} from '../constants';
import { useAppStore } from '../store/useAppStore';
import type { Vessel } from '../types';
import {
  isIncursion, isInWPS, sanitizePosition, midToFlag, aisTypeToVesselType,
} from '../utils/ais';

// ── Data source priority ──────────────────────────────────────────────────────
// 1. AISStream.io  — WebSocket, real-time, requires API key (confirmed working)
// 2. Mock data     — always available, simulated EEZ positions
//
// Architecture supports plugging in additional REST API providers (e.g. OpenAIS.org)
// as intermediate fallbacks when they become reliably available.

// ── Mock positions — each vessel uses its own defined position ────────────────

function generateMockVessels(): Vessel[] {
  return MOCK_VESSELS.map((def, i) => {
    const [baseLat, baseLng] = def.position;
    // Small random jitter (±0.05°, ~3nm) so vessels drift slightly without
    // leaving the 12nm sensitive-zone radius that drives incursion alerts.
    const lat = Math.round((baseLat + (Math.random() - 0.5) * 0.1) * 1e6) / 1e6;
    const lng = Math.round((baseLng + (Math.random() - 0.5) * 0.1) * 1e6) / 1e6;
    const vessel: Vessel = {
      mmsi: `${def.mmsiPrefix}${String(i).padStart(6, '0')}`,
      name: def.name,
      flag: def.flag,
      type: def.type,
      lat, lng,
      speed: parseFloat(def.type === 'fishing' ? (Math.random() * 5).toFixed(1) : (Math.random() * 18 + 2).toFixed(1)),
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

  const socketRef         = useRef<WebSocket | null>(null);
  const renderTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mockIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef        = useRef(0);
  const destroyedRef      = useRef(false);
  const alertedMMSIs      = useRef<Set<string>>(new Set());
  // Static AIS metadata (name/type) arrives in separate ShipStaticData messages,
  // keyed by MMSI, and is merged into position reports as it becomes available.
  const staticDataRef     = useRef<Record<string, { name?: string; type?: Vessel['type'] }>>({});

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

  // ── Mock polling fallback ───────────────────────────────────────────────
  const startMock = useCallback(() => {
    if (destroyedRef.current) return;
    if (mockIntervalRef.current) return;

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

  // ── AISStream WebSocket connect ─────────────────────────────────────────
  const connect = useCallback(() => {
    if (destroyedRef.current) return;
    if (!AISSTREAM_API_KEY) { startMock(); return; }

    setStatus('connecting');

    let ws: WebSocket;
    try {
      ws = new WebSocket(AISSTREAM_WS_URL);
    } catch {
      startMock();
      return;
    }

    socketRef.current = ws;

    ws.onopen = () => {
      if (destroyedRef.current) { ws.close(); return; }
      attemptRef.current = 0;
      stopMock();
      ws.send(JSON.stringify({
        APIKey: AISSTREAM_API_KEY,
        BoundingBoxes: [[AISSTREAM_BOUNDING_BOX[0], AISSTREAM_BOUNDING_BOX[1]]],
        // PositionReport → coordinates/speed; ShipStaticData → name + ship type.
        FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
      }));
      setStatus('live');
    };

    ws.onmessage = (event) => {
      if (destroyedRef.current) return;
      try {
        const msg  = JSON.parse(event.data);
        const meta = msg?.MetaData;
        const mmsi = meta?.MMSI;
        if (!mmsi) return;
        const key = String(mmsi);

        // ── Static data: cache name/type, patch any live vessel already shown ──
        const staticData = msg?.Message?.ShipStaticData;
        if (msg?.MessageType === 'ShipStaticData' && staticData) {
          const name = staticData?.Name?.trim();
          const type = aisTypeToVesselType(Number(staticData?.Type));
          staticDataRef.current[key] = {
            name: name || staticDataRef.current[key]?.name,
            type: type !== 'unknown' ? type : staticDataRef.current[key]?.type,
          };
          const existing = useAppStore.getState().vessels[key];
          if (existing) {
            const merged: Vessel = {
              ...existing,
              name: staticDataRef.current[key].name || existing.name,
              type: staticDataRef.current[key].type ?? existing.type,
            };
            upsertVessel(merged);
            checkAndAlert(merged);
            scheduleRender();
          }
          return;
        }

        // ── Position report ──
        const position = msg?.Message?.PositionReport;
        if (!position) return;

        const lat = position?.Latitude  ?? meta?.latitude;
        const lng = position?.Longitude ?? meta?.longitude;
        if (typeof lat !== 'number' || typeof lng !== 'number') return;

        const pos = sanitizePosition(lat, lng);
        if (!pos) return;

        const cached  = staticDataRef.current[key];
        // AIS TrueHeading uses 511 to mean "not available"; drop it to 0.
        const rawHdg  = Number(position?.TrueHeading);
        const heading = rawHdg >= 0 && rawHdg < 360 ? rawHdg : 0;

        const vessel: Vessel = {
          mmsi: key,
          name: cached?.name || meta?.ShipName?.trim() || `Vessel ${mmsi}`,
          flag: midToFlag(key),
          type: cached?.type ?? 'unknown',
          lat: pos.lat, lng: pos.lng,
          speed:   Math.min(Number(position?.Sog) || 0, 50),
          heading,
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
      if (!destroyedRef.current) setStatus('error');
    };

    ws.onclose = () => {
      if (destroyedRef.current) return;
      socketRef.current = null;

      // Start mock immediately so the UI is never empty
      startMock();

      // Exponential backoff reconnect to AISStream
      if (attemptRef.current < RECONNECT_ATTEMPTS) {
        const delay = Math.min(RECONNECT_BASE_MS * 2 ** attemptRef.current, RECONNECT_MAX_MS);
        attemptRef.current += 1;
        setStatus('offline');
        reconnectTimerRef.current = setTimeout(() => {
          if (!destroyedRef.current) connect();
        }, delay);
      }
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
      if (renderTimerRef.current)    clearTimeout(renderTimerRef.current);
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
