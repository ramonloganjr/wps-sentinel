import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import type { LayerState } from '../../types';

interface LayerDef {
  key: keyof LayerState;
  label: string;
  colorClass: string;
  desc: string;
}

const LAYERS: LayerDef[] = [
  { key: 'eez',        label: 'Philippine EEZ',    colorClass: 'lc-eez',       desc: 'NAMRIA RA 9522 boundary' },
  { key: 'wpsZone',    label: 'WPS Zone',           colorClass: 'lc-wps',       desc: 'Priority monitoring area' },
  { key: 'landmarks',  label: 'Key Landmarks',      colorClass: 'lc-landmark',  desc: 'Disputed features & reefs' },
  { key: 'heatmap',    label: 'Vessel Density',     colorClass: 'lc-heatmap',   desc: 'Traffic concentration' },
  { key: 'incursions', label: 'Incursion Alerts',   colorClass: 'lc-incursion', desc: 'Active boundary violations' },
];

export const LayerSection: React.FC = () => {
  const layers = useAppStore((s) => s.layers);
  const setLayer = useAppStore((s) => s.setLayer);

  return (
    <section className="sb-card">
      <h2 className="sb-heading">Map Layers</h2>
      <ul className="sb-list" role="list">
        {LAYERS.map(({ key, label, colorClass, desc }) => {
          const active = layers[key];
          return (
            <li key={key}>
              <label className={`sb-row${active ? '' : ' sb-row--off'}`}>
                <input
                  type="checkbox"
                  className="sb-check"
                  checked={active}
                  onChange={(e) => setLayer(key, e.target.checked)}
                />
                <span className={`sb-swatch ${colorClass}`} aria-hidden="true" />
                <span className="sb-layer-text">
                  <span className="sb-label">{label}</span>
                  <span className="sb-desc">{desc}</span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
