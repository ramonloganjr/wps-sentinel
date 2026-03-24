import React from 'react';
import { useAppStore } from '../../store/useAppStore';

export const StatsGrid: React.FC = () => {
  const { vessels, alerts } = useAppStore();
  const list = Object.values(vessels);

  const stats = [
    { id: 'wps',     value: list.filter((v) => v.inWPS).length,                                          label: 'In WPS',   cls: 'sv-wps' },
    { id: 'eez',     value: list.length,                                                                  label: 'In EEZ',   cls: 'sv-eez' },
    { id: 'alerts',  value: alerts.length,                                                                label: 'Alerts',   cls: 'sv-alert' },
    { id: 'gov',     value: list.filter((v) => v.type === 'military' || v.type === 'coastguard').length, label: "Gov't",    cls: 'sv-gov' },
  ];

  return (
    <section className="sb-card">
      <h2 className="sb-heading">Overview</h2>
      <div className="sb-stats">
        {stats.map((s) => (
          <div key={s.id} className="sb-stat">
            <span className={`sb-stat-val ${s.cls}`}>{s.value}</span>
            <span className="sb-stat-lbl">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
