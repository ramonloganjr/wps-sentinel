import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import type { ConnectionStatus } from '../types';

function statusLabel(s: ConnectionStatus): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface Props {
  onMenuToggle: () => void;
  sidebarOpen: boolean;
  installable?: boolean;
  onInstall?: () => void;
}

export const Header: React.FC<Props> = ({ onMenuToggle, sidebarOpen, installable, onInstall }) => {
  const status = useAppStore((s) => s.status);
  const vesselCount = useAppStore((s) => Object.keys(s.vessels).length);
  const lastUpdate = useAppStore((s) => s.lastUpdate);
  const isOffline = status === 'error' || status === 'offline';

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          type="button"
          className={`menu-btn${sidebarOpen ? ' menu-btn--active' : ''}`}
          onClick={onMenuToggle}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          data-expanded={sidebarOpen}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            {sidebarOpen
              ? <><path d="M6 6l12 12"/><path d="M18 6L6 18"/></>
              : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
            }
          </svg>
        </button>
        <img src="img/wps-logo.svg" alt="WPS Sentinel Logo" className="brand-logo" />
      </div>
      <div className="header-right">
        <div className="status-indicator">
          <span className={`pulse${isOffline ? ' offline' : ''}`} />
          <span className="hdr-status-lbl">{statusLabel(status)}</span>
        </div>
        <div className="vessel-count">
          <span>{vesselCount}</span><span className="hdr-vessels-lbl"> vessels</span>
        </div>
        <div className="last-update hdr-hide-xs">
          Updated: <span>{lastUpdate ? `${lastUpdate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })} ${lastUpdate.toLocaleTimeString()}` : '—'}</span>
        </div>
        {installable && onInstall && (
          <button type="button" className="install-btn" onClick={onInstall} aria-label="Install app">
            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3v10M8 9l4 4 4-4M4 17v3h16v-3"/>
            </svg>
            <span className="install-btn-lbl">Install</span>
          </button>
        )}
      </div>
    </header>
  );
};
