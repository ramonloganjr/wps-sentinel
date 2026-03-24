import { create } from 'zustand';
import type { Vessel, Alert, FilterState, LayerState, ConnectionStatus } from '../types';

interface AppState {
  vessels: Record<string, Vessel>;
  setVessels: (vessels: Record<string, Vessel>) => void;
  upsertVessel: (vessel: Vessel) => void;
  pruneStaleVessels: (maxAgeMs: number) => void;

  alerts: Alert[];
  addAlert: (alert: Alert) => void;

  selectedVessel: Vessel | null;
  setSelectedVessel: (vessel: Vessel | null) => void;

  trackedMMSI: string | null;
  setTrackedMMSI: (mmsi: string | null) => void;

  filters: FilterState;
  setFilter: (key: keyof FilterState, value: boolean) => void;

  layers: LayerState;
  setLayer: (key: keyof LayerState, value: boolean) => void;

  isSatellite: boolean;
  toggleSatellite: () => void;

  status: ConnectionStatus;
  setStatus: (status: ConnectionStatus) => void;
  lastUpdate: Date | null;
  setLastUpdate: (d: Date) => void;
}

export const useAppStore = create<AppState>((set) => ({
  vessels: {},
  setVessels: (vessels) => set({ vessels }),
  upsertVessel: (vessel) =>
    set((s) => ({ vessels: { ...s.vessels, [vessel.mmsi]: vessel } })),
  pruneStaleVessels: (maxAgeMs) =>
    set((s) => {
      const now = Date.now();
      const vessels = { ...s.vessels };
      Object.keys(vessels).forEach((mmsi) => {
        const v = vessels[mmsi];
        if (v.lastSeenMs && now - v.lastSeenMs > maxAgeMs) delete vessels[mmsi];
      });
      return { vessels };
    }),

  alerts: [],
  addAlert: (alert) =>
    set((s) => ({ alerts: [alert, ...s.alerts].slice(0, 20) })),

  selectedVessel: null,
  setSelectedVessel: (vessel) => set({ selectedVessel: vessel }),

  trackedMMSI: null,
  setTrackedMMSI: (mmsi) => set({ trackedMMSI: mmsi }),

  filters: { cargo: true, tanker: true, fishing: true, military: true, coastguard: true, unknown: true },
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  layers: { eez: true, wpsZone: true, landmarks: true, heatmap: false, incursions: true },
  setLayer: (key, value) =>
    set((s) => ({ layers: { ...s.layers, [key]: value } })),

  isSatellite: false,
  toggleSatellite: () => set((s) => ({ isSatellite: !s.isSatellite })),

  status: 'connecting',
  setStatus: (status) => set({ status }),

  lastUpdate: null,
  setLastUpdate: (d) => set({ lastUpdate: d }),
}));
