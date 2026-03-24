# WPS Sentinel — West Philippine Sea Monitor

> Real-time maritime domain awareness platform monitoring vessel activity, incursions, and AIS data across the West Philippine Sea and the Philippine Exclusive Economic Zone.

**Live:** [https://wps.ramonloganjr.com](https://wps.ramonloganjr.com/)

## Inspiration

WPS Sentinel is inspired by World Monitor, a global maritime situational awareness platform. This implementation is a lightweight, purpose-driven version with a strictly defined scope — focused exclusively on the Philippine Exclusive Economic Zone (EEZ), with particular emphasis on the West Philippine Sea (WPS), where ongoing territorial disputes and regional tensions between the Philippines and the People's Republic of China continue to escalate.

The platform is designed as a preparatory and monitoring tool in the context of potential Pacific conflict scenarios. This includes developments leading up to the 100th anniversary of the founding of the Chinese People's Liberation Army (PLA) in 2027 — a date widely cited in strategic and defense analyses as a potential inflection point for regional stability in the South China Sea and the broader Indo-Pacific theater.

WPS Sentinel does not aim to replicate the full feature set of World Monitor. Its purpose is narrow and deliberate: to provide accessible, real-time maritime domain awareness for the Philippine EEZ, aggregating AIS vessel data and open-source intelligence relevant to Philippine sovereignty and maritime security.

## Overview

WPS Sentinel streams live AIS vessel positions via WebSocket, renders them on an interactive dark-themed map, and provides an intelligence news feed aggregating WPS/EEZ-related stories from multiple sources. It is installable as a Progressive Web App on any device and browser, requiring no native installation.

## Tech Stack

| | Technology | Role |
|---|---|---|
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" width="20"/> | **React 19** | Component-based UI |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" width="20"/> | **TypeScript** | Static typing |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vitejs/vitejs-original.svg" width="20"/> | **Vite 8 + Rolldown** | Dev server & production builds |
| <img src="https://leafletjs.com/docs/images/logo.png" width="20"/> | **Leaflet + MarkerCluster** | Interactive mapping |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg" width="20"/> | **Zustand** | Global state management |
| — | **AISStream.io** | Real-time AIS WebSocket stream |
| <img src="https://www.google.com/favicon.ico" width="20"/> | **Google News RSS** | Intelligence feed via rss2json proxy |
| <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg" width="20"/> | **CSS3 / Barlow** | Dark glass design system |
| — | **PWA / Service Worker** | Installable on all platforms |

## Features

- Live AIS vessel tracking with automatic reconnection and mock data fallback
- Philippine EEZ boundary (Marine Regions MRGID 8322 authoritative coordinates)
- West Philippine Sea priority monitoring zone overlay
- 6 vessel type filters with custom SVG icons (Cargo, Tanker, Fishing, Military, Coast Guard, Unknown)
- 5 toggleable map layers (EEZ, WPS Zone, Landmarks, Vessel Density, Incursion Alerts)
- Incursion detection for foreign-flagged vessels near sensitive zones (Scarborough Shoal, Ayungin, Whitsun Reef, Mischief Reef)
- Intelligence news feed — multi-proxy RSS aggregation (rss2json primary), relevance scoring, WPS prioritization, topic tabs
- Satellite imagery toggle (Esri World Imagery)
- Vessel detail panel with tracking and flagging actions
- JSON data export
- Zoom controls positioned bottom-right above Leaflet attribution
- Mobile-first responsive design — sidebar drawer on mobile/tablet, static on desktop
- PWA install banner — cross-platform (Android, iOS, Windows, macOS, Linux; Chrome, Edge, Safari, Firefox)
- Dark Matter theme (`#070707`) with liquid glass aesthetic (`backdrop-filter: blur + saturate`)
- Strictly Barlow font throughout, including Leaflet controls

## PWA Install Support

The install banner appears automatically and adapts per platform:

| Platform | Browser | Behavior |
|---|---|---|
| Android | Chrome / Edge | Native one-tap install prompt |
| iOS | Safari | Share > Add to Home Screen instructions |
| Windows / Linux | Chrome / Edge | Native one-tap install prompt |
| macOS | Safari | File > Add to Dock instructions |
| Any | Firefox | Browser menu > Install instructions |
| Already installed | Any | Banner hidden |

## Getting Started

### Prerequisites

- Node.js 18+
- An [AISStream.io](https://aisstream.io) API key (free tier available)

### Installation

```bash
git clone https://github.com/ramonloganjr/wps-sentinel.git
cd wps-sentinel
npm install
```

### Configure API Key

Copy `.env.example` to `.env.local` and set your key:

```bash
cp .env.example .env.local
```

```env
VITE_AISSTREAM_API_KEY=your_api_key_here
```

The `.env.local` file is excluded from version control via `.gitignore`. Never commit API keys directly to source files.

### Run Locally

```bash
npm run dev
```

Opens at [http://localhost:5173](http://localhost:5173). The Vite dev server proxies news RSS feeds locally to avoid CORS issues.

### Build for Production

```bash
npm run build
```

Output goes to `dist/` — ready to upload to cPanel or any static host. The `dist/` directory is excluded from version control.

### Deploy to cPanel

Upload the **contents** of `dist/` directly into `public_html/`:

```
public_html/
├── .htaccess       ← enable hidden files in File Manager to see this
├── index.html
├── manifest.json
├── sw.js
├── assets/         ← hashed JS/CSS chunks
├── img/
└── data/
```

The included `.htaccess` handles HTTPS redirect, SPA fallback, gzip compression, 1-year cache for hashed assets, and security headers.

### Preview Production Build

```bash
npm run preview
```

## Project Structure

```
src/
├── components/
│   ├── Map/MapView.tsx        # Leaflet map, vessel markers, layer controls, zoom positioning
│   ├── News/                  # Intelligence feed (NewsPanel, NewsCard, NewsCardSkeleton)
│   ├── Sidebar/               # Filter, Layer, Stats, Alert panels
│   ├── Header.tsx             # App header with status indicators and install button
│   ├── Footer.tsx             # App footer
│   └── VesselDetail.tsx       # Vessel info panel
├── hooks/
│   ├── useAISStream.ts        # WebSocket AIS connection with reconnect + mock fallback
│   ├── useMapInstance.ts      # Leaflet map init, layer setup, zoom control positioning
│   ├── useNews.ts             # Multi-feed RSS aggregation with rss2json + fallback proxies
│   └── useTheme.ts            # Dark theme enforcement
├── store/
│   └── useAppStore.ts         # Zustand global state
├── constants/index.ts         # Coordinates, vessel types, zone polygons (no API keys)
├── data/
│   ├── eezData.ts             # GeoJSON (EEZ + WPS + landmarks) inlined as TypeScript
│   └── philippine-eez.xml     # Source: Marine Regions MRGID 8322 WFS response
├── types/                     # TypeScript interfaces
├── utils/                     # AIS helpers, news cache, fallback data
└── index.css                  # Full design system (dark theme, glass UI, responsive)
public/
├── .htaccess                  # Apache config for cPanel deployment
├── manifest.json              # PWA manifest
├── sw.js                      # Service worker (cache-first assets, network-first HTML)
└── img/ship/                  # Custom SVG vessel icons
.env.example                   # Template — copy to .env.local and fill in keys
.env.local                     # Your local secrets — excluded from version control
.gitignore                     # Excludes node_modules/, dist/, .env.local, .vscode/
```

## Data Sources

- **EEZ Boundary:** Marine Regions MRGID 8322 (VLIZ, Belgium) — authoritative NAMRIA RA 9522 coordinates
- **AIS Data:** [AISStream.io](https://aisstream.io) real-time WebSocket API
- **Base Map:** CartoDB Dark Matter tiles
- **Satellite:** Esri World Imagery
- **News:** Google News RSS via [rss2json.com](https://rss2json.com) (WPS, EEZ, Maritime, Defense, Diplomacy topics)

## AIS Connection Behavior

- Connects to `wss://stream.aisstream.io/v0/stream` on mount
- On failure (503, network error, etc.): mock vessel data activates immediately so the UI is never empty
- Exponential backoff reconnect: 3s → 6s → 12s → 24s → 48s (max 5 attempts)
- Once live connection succeeds, mock data is replaced with real positions
- After max attempts, app stays on mock data indefinitely

## News Feed Behavior

- Primary proxy: [rss2json.com](https://rss2json.com) (JSON, no CORS issues)
- Fallback proxies: allorigins.win, corsproxy.io
- 5 topic feeds polled on staggered intervals (WPS every 3 min, others every 6 min)
- Relevance scoring: WPS keyword hits (+40 each), EEZ keyword hits (+15 each), recency decay
- Fallback news items shown immediately on mount while live fetch is in progress
- Results cached in `sessionStorage` to avoid redundant fetches

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

- Source code: [MIT License](LICENSE)
- Docs & media: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)
