import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { VESSEL_TYPES } from '../../constants';
import type { FilterState, VesselType } from '../../types';

const FILTER_KEYS: (keyof FilterState)[] = [
  'cargo', 'tanker', 'fishing', 'military', 'coastguard', 'unknown',
];

export const FilterSection: React.FC = () => {
  const filters = useAppStore((s) => s.filters);
  const setFilter = useAppStore((s) => s.setFilter);

  return (
    <section className="sb-card">
      <h2 className="sb-heading">Vessel Types</h2>
      <ul className="sb-list" role="list">
        {FILTER_KEYS.map((key) => {
          const cfg = VESSEL_TYPES[key as VesselType];
          const active = filters[key];
          return (
            <li key={key}>
              <label className={`sb-row${active ? '' : ' sb-row--off'}`}>
                <input
                  type="checkbox"
                  className="sb-check"
                  checked={active}
                  onChange={(e) => setFilter(key, e.target.checked)}
                />
                <span className="sb-vessel-icon" aria-hidden="true">
                  <img src={cfg.iconPath} alt="" width="38" height="15" />
                </span>
                <span className="sb-label">{cfg.label}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
};
