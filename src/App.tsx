import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar/Sidebar';
import { MapView } from './components/Map/MapView';
import { Footer } from './components/Footer';
import { NewsPanel } from './components/News/NewsPanel';
import { useTheme } from './hooks/useTheme';
import { useAISStream } from './hooks/useAISStream';
import { useAppStore } from './store/useAppStore';

type DeferredPrompt = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };

// ── Platform detection ────────────────────────────────────────────────────────
function detectPlatform(): 'native' | 'ios' | 'safari-mac' | 'firefox' | 'manual' | 'installed' {
  const ua = navigator.userAgent;
  // Already running as installed PWA
  if (window.matchMedia('(display-mode: standalone)').matches) return 'installed';
  // iOS Safari (iPhone/iPad) — no beforeinstallprompt
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  if (isIOS && isSafari) return 'ios';
  // macOS Safari
  const isMacOS = /macintosh/i.test(ua);
  if (isMacOS && isSafari) return 'safari-mac';
  // Firefox (desktop + Android) — no beforeinstallprompt
  if (/firefox|fxios/i.test(ua)) return 'firefox';
  // Chrome / Edge / Samsung / Opera — supports beforeinstallprompt
  return 'native';
}

const PLATFORM_HINT: Record<string, string> = {
  ios:         'Tap the Share button \u{1F4E4} then "Add to Home Screen"',
  'safari-mac':'Open File menu → "Add to Dock…"',
  firefox:     'Open the browser menu → "Install" or "Add to Home Screen"',
  manual:      'Use your browser menu to install this app',
};

const DISMISS_KEY = 'wps_install_dismissed';

export const App: React.FC = () => {
  useTheme();
  useAISStream();

  const { vessels, setSelectedVessel } = useAppStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const deferredPrompt = useRef<DeferredPrompt | null>(null);
  const [platform, setPlatform]           = useState<ReturnType<typeof detectPlatform>>('native');
  const [nativeReady, setNativeReady]     = useState(false);
  const [installed, setInstalled]         = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === '1'
  );

  useEffect(() => {
    const p = detectPlatform();
    setPlatform(p);
    if (p === 'installed') return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as DeferredPrompt;
      setNativeReady(true);
    };
    const onInstalled = () => { setInstalled(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt.current) {
      deferredPrompt.current.prompt();
      const { outcome } = await deferredPrompt.current.userChoice;
      if (outcome === 'accepted') setInstalled(true);
      deferredPrompt.current = null;
      setNativeReady(false);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setBannerDismissed(true);
  };

  // Show banner when:
  // - not already installed / running standalone
  // - not dismissed this session
  // - native: wait for beforeinstallprompt
  // - ios / safari-mac / firefox: show immediately (manual instructions)
  const isManualPlatform = platform === 'ios' || platform === 'safari-mac' || platform === 'firefox';
  const showBanner =
    !installed &&
    !bannerDismissed &&
    platform !== 'installed' &&
    (nativeReady || isManualPlatform);

  // Label & hint for the banner
  const isNative = platform === 'native' && nativeReady;
  const hint = isNative ? null : PLATFORM_HINT[platform] ?? PLATFORM_HINT.manual;

  const handleAlertClick = useCallback((mmsi: string) => {
    const vessel = vessels[mmsi];
    if (vessel) { setSelectedVessel(vessel); setSidebarOpen(false); }
  }, [vessels, setSelectedVessel]);

  return (
    <>
      <Header
        onMenuToggle={() => setSidebarOpen((o) => !o)}
        sidebarOpen={sidebarOpen}
        installable={isNative}
        onInstall={handleInstall}
      />
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      <div className="app-scroll-root">
        <div className="app-body">
          <Sidebar open={sidebarOpen} onAlertClick={handleAlertClick} />
          <MapView />
        </div>
        <div className="app-news">
          <NewsPanel />
        </div>
        <div className="app-footer-wrap">
          <Footer />
        </div>
      </div>

      {showBanner && (
        <div className="install-banner" role="complementary" aria-label="Install app">
          <div className="install-banner-left">
            <img src="img/wps-logo.svg" alt="" className="install-banner-logo" aria-hidden="true" />
            <div className="install-banner-text">
              <span className="install-banner-title">Install WPS Sentinel</span>
              <span className="install-banner-sub">
                {hint ?? 'Add to home screen for quick access'}
              </span>
            </div>
          </div>
          <div className="install-banner-actions">
            {isNative ? (
              <button type="button" className="install-banner-btn" onClick={handleInstall}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 3v10M8 9l4 4 4-4M4 17v3h16v-3"/>
                </svg>
                Install App
              </button>
            ) : (
              <span className="install-banner-badge">
                {platform === 'ios' ? '📤 Share' : platform === 'safari-mac' ? '📁 File' : '☰ Menu'}
              </span>
            )}
            <button type="button" className="install-banner-dismiss" onClick={handleDismiss} aria-label="Dismiss install banner">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18"/>
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
