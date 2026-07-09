import L from 'leaflet';

// leaflet.markercluster is a UMD plugin that augments a global `L` at load
// time. When bundled it references a bare `L`, throwing "L is not defined" in
// production unless Leaflet is exposed on window first. Importing this module
// before `import 'leaflet.markercluster'` guarantees the global exists.
declare global {
  interface Window { L: typeof L }
}

window.L = L;

export default L;
