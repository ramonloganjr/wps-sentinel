import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { useMapInstance } from '../../hooks/useMapInstance';
import { useAppStore } from '../../store/useAppStore';
import { VESSEL_TYPES, EEZ_CENTER, EEZ_ZOOM } from '../../constants';
import { isIncursion, normalizeFlag, exportData } from '../../utils/ais';
import type { Vessel } from '../../types';
import { VesselDetail } from '../VesselDetail';

const MAP_ID = 'wps-map';

export const MapView: React.FC = () => {
  const { mapRef, tileRef, satelliteRef, clusterRef, geoLayers } = useMapInstance(MAP_ID);
  const { vessels, filters, layers, isSatellite, toggleSatellite, setSelectedVessel, trackedMMSI, alerts } = useAppStore();
  const markersRef = useRef<Record<string, L.Marker>>({});

  // ── Satellite toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const tile = tileRef.current;
    const sat = satelliteRef.current;
    if (!map || !tile || !sat) return;
    if (isSatellite) { map.removeLayer(tile); sat.addTo(map); }
    else { map.removeLayer(sat); tile.addTo(map); }
  }, [isSatellite, mapRef, tileRef, satelliteRef]);

  // ── EEZ layer toggle ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const eez = geoLayers.eez;
    if (!map || !eez) return;
    layers.eez ? eez.addTo(map) : map.removeLayer(eez);
  }, [layers.eez, mapRef, geoLayers.eez]);

  // ── WPS zone layer toggle ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const wps = geoLayers.wpsZone;
    if (!map || !wps) return;
    layers.wpsZone ? wps.addTo(map) : map.removeLayer(wps);
  }, [layers.wpsZone, mapRef, geoLayers.wpsZone]);

  // ── Landmark layer toggle ─────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const lm = geoLayers.landmarks;
    if (!map || !lm) return;
    layers.landmarks ? lm.addTo(map) : map.removeLayer(lm);
  }, [layers.landmarks, mapRef, geoLayers.landmarks]);

  // ── Incursion alerts layer toggle ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const inc = geoLayers.incursions;
    if (!map || !inc) return;
    layers.incursions ? inc.addTo(map) : map.removeLayer(inc);
  }, [layers.incursions, mapRef, geoLayers.incursions]);

  // ── Heatmap layer toggle ──────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    const hm = geoLayers.heatmap;
    if (!map || !hm) return;
    layers.heatmap ? hm.addTo(map) : map.removeLayer(hm);
  }, [layers.heatmap, mapRef, geoLayers.heatmap]);

  // ── Populate incursion markers layer ─────────────────────────────────────
  useEffect(() => {
    const inc = geoLayers.incursions;
    if (!inc) return;
    inc.clearLayers();
    if (!layers.incursions) return;
    Object.values(vessels).forEach((vessel) => {
      if (!isIncursion(vessel)) return;
      L.circleMarker([vessel.lat, vessel.lng], {
        radius: 14,
        color: '#ff3b3b',
        weight: 2,
        fillColor: '#ff3b3b',
        fillOpacity: 0.15,
        dashArray: '4 3',
        interactive: false,
        pane: 'incursionPane',
      } as L.CircleMarkerOptions).addTo(inc);
    });
  }, [vessels, layers.incursions, geoLayers.incursions]);

  // ── Populate heatmap layer (vessel density circles) ───────────────────────
  useEffect(() => {
    const hm = geoLayers.heatmap;
    if (!hm) return;
    hm.clearLayers();
    if (!layers.heatmap) return;
    Object.values(vessels).forEach((vessel) => {
      L.circleMarker([vessel.lat, vessel.lng], {
        radius: 18,
        color: '#ffaa00',
        weight: 0,
        fillColor: '#ffaa00',
        fillOpacity: 0.12,
        interactive: false,
        pane: 'heatmapPane',
      } as L.CircleMarkerOptions).addTo(hm);
    });
  }, [vessels, layers.heatmap, geoLayers.heatmap]);

  // ── Vessel markers ────────────────────────────────────────────────────────
  const createIcon = useCallback((vessel: Vessel) => {
    const cfg = VESSEL_TYPES[vessel.type] ?? VESSEL_TYPES.unknown;
    const alert = isIncursion(vessel);
    const inWPS = vessel.inWPS;

    // Consistent 28px wide, aspect-correct height (72×27.91 ratio)
    const w = 28;
    const h = Math.round(w * 27.91 / 72);

    const opacity = (alert || inWPS) ? '1' : '0.78';

    return L.divIcon({
      className: '',
      html: `<img src="${cfg.iconPath}" width="${w}" height="${h}" alt="${cfg.label}" style="display:block;opacity:${opacity};" />`,
      iconSize: [w, h],
      iconAnchor: [w / 2, h / 2],
    });
  }, []);

  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;

    const activeMMSIs = new Set(Object.keys(vessels));

    // Remove stale markers
    Object.keys(markersRef.current).forEach((mmsi) => {
      if (!activeMMSIs.has(mmsi)) {
        cluster.removeLayer(markersRef.current[mmsi]);
        delete markersRef.current[mmsi];
      }
    });

    // Add/update markers
    Object.values(vessels).forEach((vessel) => {
      const latlng: [number, number] = [vessel.lat, vessel.lng];
      const icon = createIcon(vessel);

      if (markersRef.current[vessel.mmsi]) {
        markersRef.current[vessel.mmsi].setLatLng(latlng).setIcon(icon);
      } else {
        const marker = L.marker(latlng, { icon });
        marker.on('click', () => setSelectedVessel(vessel));
        marker.bindTooltip(
          `<span class="flag-badge">${normalizeFlag(vessel.flag)}</span> ${vessel.name}${vessel.inWPS ? ' <span style="color:#38bdf8;font-size:9px;font-weight:700">WPS</span>' : ''}`,
          { direction: 'top' }
        );
        cluster.addLayer(marker);
        markersRef.current[vessel.mmsi] = marker;
      }
    });

    // Apply filters
    Object.entries(markersRef.current).forEach(([mmsi, marker]) => {
      const vessel = vessels[mmsi];
      if (!vessel) return;
      const enabled = filters[vessel.type as keyof typeof filters] ?? true;
      if (enabled) {
        if (!cluster.hasLayer(marker)) cluster.addLayer(marker);
      } else {
        cluster.removeLayer(marker);
      }
    });
  }, [vessels, filters, createIcon, clusterRef, setSelectedVessel]);

  // ── Track vessel ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!trackedMMSI || !mapRef.current) return;
    const vessel = vessels[trackedMMSI];
    if (vessel) mapRef.current.panTo([vessel.lat, vessel.lng]);
  }, [trackedMMSI, vessels, mapRef]);

  const handleTrack = useCallback((_mmsi: string, lat: number, lng: number) => {
    mapRef.current?.setView([lat, lng], 10);
  }, [mapRef]);

  const handleExport = useCallback(() => {
    exportData(Object.values(vessels), alerts);
  }, [vessels, alerts]);

  const handleResetView = useCallback(() => {
    mapRef.current?.setView(EEZ_CENTER, EEZ_ZOOM);
  }, [mapRef]);

  return (
    <main className="map-container">
      <div id={MAP_ID} className="map-fill" />

      <div className="map-overlay-controls">
        <button type="button" className="map-btn" onClick={handleResetView} title="Reset view" aria-label="Reset to EEZ view">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 10.5 12 3l9 7.5" /><path d="M5.5 10.5V21h13V10.5" />
          </svg>
        </button>
        <button type="button" className={`map-btn${isSatellite ? ' map-btn--active' : ''}`} onClick={toggleSatellite} title="Satellite" aria-label="Toggle satellite view">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><path d="M4.93 4.93l2.12 2.12M16.95 16.95l2.12 2.12M4.93 19.07l2.12-2.12M16.95 7.05l2.12-2.12"/>
          </svg>
        </button>
        <button type="button" className="map-btn" onClick={handleExport} title="Export data" aria-label="Export current data">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v10M8 9l4 4 4-4M4 17v3h16v-3" />
          </svg>
        </button>
      </div>

      <VesselDetail onTrack={handleTrack} />
    </main>
  );
};
