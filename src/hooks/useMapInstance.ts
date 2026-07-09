import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { EEZ_CENTER, EEZ_ZOOM } from '../constants';
import eezData from '../data/eezData';

interface GeoLayers {
  eez: L.GeoJSON | null;
  wpsZone: L.GeoJSON | null;
  landmarks: L.GeoJSON | null;
  incursions: L.LayerGroup | null;
  heatmap: L.LayerGroup | null;
}

export function useMapInstance(containerId: string) {
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const satelliteRef = useRef<L.TileLayer | null>(null);
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [geoLayers, setGeoLayers] = useState<GeoLayers>({
    eez: null, wpsZone: null, landmarks: null, incursions: null, heatmap: null,
  });

  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map(containerId, {
      center: EEZ_CENTER,
      zoom: EEZ_ZOOM,
      zoomControl: false,   // we reposition it to bottom-right manually
      attributionControl: true,
    });

    // Move zoom control to bottom-right, above attribution
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // ── Custom panes — explicit z-index stack ─────────────────────────────
    // Leaflet default: tilePane=200, overlayPane=400, markerPane=600, tooltipPane=650, popupPane=700
    // We insert our geo layers below the default markerPane so vessels always sit on top.
    map.createPane('heatmapPane').style.zIndex  = '310';
    map.createPane('eezPane').style.zIndex      = '320';
    map.createPane('wpsPane').style.zIndex      = '330';
    map.createPane('landmarkPane').style.zIndex = '340';
    map.createPane('incursionPane').style.zIndex = '350';
    // Vessel cluster uses the default markerPane (600) — always above all geo layers

    tileRef.current = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }
    ).addTo(map);

    satelliteRef.current = L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Tiles &copy; Esri', maxZoom: 18 }
    );

    // ── Heatmap pane (lowest geo layer) ──────────────────────────────────
    const heatmap = L.layerGroup([], { pane: 'heatmapPane' });

    // ── EEZ boundary — authoritative NAMRIA RA 9522 line ────────────────
    const eez = L.geoJSON(eezData, {
      filter: (f) => f.properties?.type === 'EEZ',
      style: {
        color: '#39ff14',
        weight: 1,
        opacity: 0.7,
        fillColor: '#39ff14',
        fillOpacity: 0.02,
        pane: 'eezPane',
      },
      pane: 'eezPane',
    }).addTo(map);

    // ── WPS priority zone — subtle fill, crisp boundary ──────────────────
    const wpsZone = L.geoJSON(eezData, {
      filter: (f) => f.properties?.type === 'WPS',
      style: {
        color: '#38bdf8',
        weight: 1,
        opacity: 0.55,
        fillColor: '#38bdf8',
        fillOpacity: 0.04,
        dashArray: '8 5',
        pane: 'wpsPane',
      },
      pane: 'wpsPane',
      onEachFeature: (_f, layer) => {
        layer.bindTooltip(
          '<span style="font-weight:600;color:#38bdf8;font-size:11px">West Philippine Sea</span><br>' +
          '<span style="font-size:10px;color:#94a3b8">Priority Monitoring Zone</span>',
          { sticky: true, direction: 'center', className: 'map-tooltip' }
        );
      },
    }).addTo(map);

    // ── Landmarks + exclusion zones ───────────────────────────────────────
    const landmarks = L.geoJSON(eezData, {
      filter: (f) => f.properties?.type === 'landmark' || f.properties?.type === 'exclusion',
      pane: 'landmarkPane',
      pointToLayer: (feature, latlng) => {
        if (feature.properties?.type === 'exclusion') {
          return L.circle(latlng, {
            radius: 12 * 1852,
            color: '#f59e0b', weight: 0.75, dashArray: '4 6',
            fillColor: '#f59e0b', fillOpacity: 0.03,
            interactive: false, pane: 'landmarkPane',
          });
        }
        const hi = feature.properties?.priority === 'high';
        return L.circleMarker(latlng, {
          radius: hi ? 5 : 4,
          color: hi ? '#ef4444' : '#f59e0b',
          fillColor: hi ? '#ef4444' : '#f59e0b',
          fillOpacity: 1, weight: 0,
          pane: 'landmarkPane',
        });
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties?.type === 'exclusion') return;
        const p = feature.properties ?? {};
        layer.bindPopup(
          `<div class="popup-title">${p.name ?? ''}</div>` +
          `<div class="popup-body">${p.description ?? ''}</div>`
        );
        layer.bindTooltip(p.name ?? '', { permanent: false, direction: 'top', className: 'map-tooltip' });
      },
    }).addTo(map);

    // ── Incursion alerts layer ────────────────────────────────────────────
    const incursions = L.layerGroup([], { pane: 'incursionPane' }).addTo(map);

    // ── Vessel cluster — added last, uses default markerPane (z=600) ─────
    // This guarantees vessels always render above every geo layer.
    const cluster = L.markerClusterGroup({ maxClusterRadius: 40, spiderfyOnMaxZoom: true, showCoverageOnHover: false });
    cluster.addTo(map);
    clusterRef.current = cluster;

    mapRef.current = map;

    // Layers are synchronous — set state immediately so toggle effects fire
    setGeoLayers({ eez, wpsZone, landmarks, incursions, heatmap });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [containerId]);

  return { mapRef, tileRef, satelliteRef, clusterRef, geoLayers };
}
