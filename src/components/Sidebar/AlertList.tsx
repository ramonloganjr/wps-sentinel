import React from 'react';
import { useAppStore } from '../../store/useAppStore';

interface Props {
  onAlertClick: (mmsi: string) => void;
}

export const AlertList: React.FC<Props> = ({ onAlertClick }) => {
  const alerts = useAppStore((s) => s.alerts);

  return (
    <section className="sb-card">
      <h2 className="sb-heading">
        Alerts
        {alerts.length > 0 && (
          <span className="sb-badge">{alerts.length}</span>
        )}
      </h2>
      <div className="sb-alerts">
        {alerts.length === 0 ? (
          <p className="sb-empty">No active alerts</p>
        ) : (
          alerts.map((a) => (
            <div
              key={`${a.mmsi ?? 'na'}-${a.type}-${a.time.getTime()}`}
              className={`sb-alert sb-alert--${a.type === 'INCURSION' ? 'danger' : 'warn'}`}
              onClick={() => a.mmsi && onAlertClick(a.mmsi)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && a.mmsi) {
                  e.preventDefault();
                  onAlertClick(a.mmsi);
                }
              }}
            >
              <div className="sb-alert-type">{a.type}</div>
              <div className="sb-alert-msg">{a.message}</div>
              <div className="sb-alert-time">{a.time.toLocaleTimeString()}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
};
