import React, { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { VESSEL_TYPES } from '../constants';
import { normalizeFlag } from '../utils/ais';

interface Props {
  onTrack: (mmsi: string, lat: number, lng: number) => void;
}

export const VesselDetail: React.FC<Props> = ({ onTrack }) => {
  const selectedVessel = useAppStore((s) => s.selectedVessel);
  const setSelectedVessel = useAppStore((s) => s.setSelectedVessel);
  const setTrackedMMSI = useAppStore((s) => s.setTrackedMMSI);
  const addAlert = useAppStore((s) => s.addAlert);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Move focus into the panel on open, close on Escape, restore focus on close.
  useEffect(() => {
    if (!selectedVessel) return;
    const prevActive = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelectedVessel(null); setTrackedMMSI(null); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prevActive?.focus?.();
    };
  }, [selectedVessel, setSelectedVessel, setTrackedMMSI]);

  if (!selectedVessel) return null;

  const v = selectedVessel;
  const flag = normalizeFlag(v.flag);
  const typeLabel = VESSEL_TYPES[v.type]?.label ?? v.type;

  const handleClose = () => {
    setSelectedVessel(null);
    setTrackedMMSI(null);
  };

  const handleTrack = () => {
    setTrackedMMSI(v.mmsi);
    onTrack(v.mmsi, v.lat, v.lng);
  };

  const handleFlag = () => {
    addAlert({ type: 'SUSPICIOUS', message: `${v.name} flagged by user`, mmsi: v.mmsi, time: new Date(), vessel: v });
  };

  return (
    <div className="vessel-detail glass-panel" role="dialog" aria-modal="true" aria-label={`Vessel details for ${v.name}`}>
      <button ref={closeRef} type="button" className="close-btn" onClick={handleClose} aria-label="Close vessel detail">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 6l12 12" /><path d="M18 6L6 18" />
        </svg>
      </button>
      <h3>
        <span className="flag-badge">{flag}</span> {v.name}
      </h3>
      <table className="detail-table">
        <tbody>
          <tr><td>MMSI</td><td>{v.mmsi}</td></tr>
          <tr><td>Flag</td><td>{v.flag}</td></tr>
          <tr><td>Type</td><td>{typeLabel}</td></tr>
          <tr><td>Speed</td><td>{v.speed} kn</td></tr>
          <tr><td>Heading</td><td>{v.heading}°</td></tr>
          <tr><td>Position</td><td>{v.lat.toFixed(4)}°N, {v.lng.toFixed(4)}°E</td></tr>
          <tr><td>Status</td><td>{v.status}</td></tr>
          <tr><td>Last Seen</td><td>{new Date(v.lastSeen).toLocaleTimeString()}</td></tr>
        </tbody>
      </table>
      <div className="detail-actions">
        <button type="button" className="action-btn" onClick={handleTrack}>Track Vessel</button>
        <button type="button" className="action-btn danger" onClick={handleFlag}>Flag as Suspicious</button>
      </div>
    </div>
  );
};
