import type { VesselType, VesselTypeConfig } from '../types';

// WPS center: centroid of the West Philippine Sea zone
export const WPS_CENTER: [number, number] = [13.0, 116.5];
export const WPS_ZOOM = 6;
// EEZ center: Marine Regions MRGID 8322 centroid (lat:12.268, lng:122.164)
export const EEZ_CENTER: [number, number] = [12.27, 122.16];
export const EEZ_ZOOM = 5;
export const REFRESH_MS = 30_000;
export const AIS_STALE_MS = 2 * 60_000;
export const AISSTREAM_WS_URL = 'wss://stream.aisstream.io/v0/stream';
export const AISSTREAM_API_KEY = import.meta.env.VITE_AISSTREAM_API_KEY ?? '';

// OpenAIS.org — open-source REST API (pg_featureserv / PostGIS)
// Currently unreliable (DNS issues). Kept as fallback option — enable when stable.
// export const OPENAIS_API_URL = 'https://api.open-ais.org/postgisftw/collections/latest_positions/items.json';

// Full Philippine EEZ bounding box — Marine Regions MRGID 8322 authoritative extent
export const AISSTREAM_BOUNDING_BOX: [[number, number], [number, number]] = [[3.1, 113.6], [22.3, 130.0]];

/**
 * WPS zone polygon — [lat, lng] pairs for pointInPolygon().
 * Derived from the western sector of the EEZ boundary (Marine Regions MRGID 8322),
 * closed eastward along the Philippine archipelago baseline (~121°E).
 * Swap GeoJSON [lng, lat] → [lat, lng] for haversine/ray-casting checks.
 */
export const WPS_ZONE_POLYGON: [number, number][] = [
  [21.03652, 121.04953], [18.76089, 118.16002], [18.01982, 117.48301],
  [17.25601, 116.44401], [17.07740, 116.39645], [16.88953, 116.35712],
  [16.76511, 116.33672], [16.64876, 116.31887], [16.56826, 116.30857],
  [16.48192, 116.29981], [16.40070, 116.29370], [16.30765, 116.28921],
  [16.20496, 116.28737], [16.01739, 116.28632], [15.89089, 116.28782],
  [15.72501, 116.29725], [15.55072, 116.31635], [15.39919, 116.34072],
  [15.27895, 116.36528], [15.11388, 116.39202], [14.80227, 116.43529],
  [14.55618, 116.46942], [14.25920, 116.51042], [13.94762, 116.55337],
  [13.66211, 116.55100], [13.34574, 116.52106], [13.04434, 116.38072],
  [12.77973, 116.24078], [12.56069, 116.12960], [12.26813, 115.98084],
  [12.00298, 115.84337], [11.76895, 115.59937], [11.53490, 115.35532],
  [11.41435, 115.23060], [11.23666, 115.05478], [11.13101, 114.95526],
  [11.03430, 114.87132], [10.91760, 114.77594], [10.74806, 114.64110],
  [10.62221, 114.54707], [10.30897, 114.34137], [10.01952, 114.16998],
  [ 9.86438, 114.07751], [ 9.71029, 113.98517], [ 9.60582, 113.92757],
  [ 9.44935, 113.84964], [ 9.28994, 113.78063], [ 9.16025, 113.73156],
  [ 9.00713, 113.68145], [ 8.93761, 113.78066], [ 8.86857, 113.88677],
  [ 8.80169, 113.99093], [ 8.73674, 114.09346], [ 8.67372, 114.19437],
  [ 8.61248, 114.29391], [ 8.55333, 114.39157], [ 8.49610, 114.48760],
  [ 8.44080, 114.58203], [ 8.38742, 114.67484], [ 8.33586, 114.76623],
  [ 8.28633, 114.85581], [ 7.57988,  116.69954], [ 7.56730, 116.98504],
  [ 7.56468, 117.00749], [ 7.56195, 117.03090], [ 7.55932, 117.05343],
  [ 7.55659, 117.07675], [ 7.55395, 117.09937], [ 7.55124, 117.12260],
  [ 7.54858, 117.14531], [ 7.54588, 117.16844], [ 7.54321, 117.19125],
  [ 7.53957, 117.21645], [ 7.53411, 117.24275], [ 7.52447, 117.26581],
  [ 7.51116, 117.28345], [ 7.49726, 117.29638], [ 7.48376, 117.31130],
  [ 7.47139, 117.32568], [ 7.45909, 117.33998], [ 7.44668, 117.35443],
  [ 7.43410, 117.36906], [ 7.42157, 117.38363], [ 7.40563, 117.39986],
  [ 7.39252, 117.41418], [ 7.37956, 117.42833], [ 7.36676, 117.44231],
  [ 7.35387, 117.45639], [ 7.34076, 117.47071], [ 7.32766, 117.48501],
  [ 7.31485, 117.49900], [ 7.30205, 117.51298], [ 7.28900, 117.52723],
  [ 7.27589, 117.54155], [ 7.26295, 117.55567], [ 7.25014, 117.56966],
  [ 7.23723, 117.58375], [ 7.22412, 117.59807], [ 7.21104, 117.61235],
  [ 7.19823, 117.62633], [ 7.18542, 117.64032], [ 7.17234, 117.65458],
  [ 7.15923, 117.66890], [ 7.14631, 117.68300], [ 7.13349, 117.69699],
  [ 7.12056, 117.71110], [ 7.10745, 117.72541], [ 7.09439, 117.73967],
  [ 7.08157, 117.75365], [ 7.06876, 117.76763], [ 7.05566, 117.78192],
  [ 7.03709, 117.80096], [ 7.02361, 117.81441], [ 7.00991, 117.82807],
  [ 6.99602, 117.84193], [ 6.98244, 117.85548], [ 6.96895, 117.86893],
  [ 6.95506, 117.88279], [ 6.94127, 117.89654], [ 6.92779, 117.90999],
  [ 6.91411, 117.92364], [ 6.90021, 117.93750], [ 6.88661, 117.95106],
  [ 6.87312, 117.96451], [ 6.85925, 117.97835], [ 6.84544, 117.99212],
  [ 6.83195, 118.00557], [ 6.81829, 118.01919], [ 6.80439, 118.03305],
  [ 6.79065, 118.04496], [ 6.76820, 118.04415], [ 6.74621, 118.04336],
  [ 6.72443, 118.04257], [ 6.70204, 118.04177], [ 6.67973, 118.04096],
  [ 6.65795, 118.04017], [ 6.63588, 118.03938], [ 6.61343, 118.03857],
  [ 6.59147, 118.03777], [ 6.56172, 118.03629], [ 6.52577, 118.03058],
  [ 6.50611, 118.02640], [ 6.48646, 118.02222], [ 6.46649, 118.01798],
  [ 6.44641, 118.01371], [ 6.42647, 118.00947], [ 6.40682, 118.00529],
  [ 6.38717, 118.00111], [ 6.36714, 117.99685], [ 6.34706, 117.99258],
  [ 6.32718, 117.98834], [ 6.30753, 117.98416], [ 6.27677, 117.98994],
  [ 6.25947, 117.99861], [ 6.24195, 118.00739], [ 6.22434, 118.01621],
  [ 6.20674, 118.02502], [ 6.20032, 118.06259], [ 6.19159, 118.08122],
  [ 6.18345, 118.09847], [ 6.17396, 118.11788], [ 6.16344, 118.13334],
  [ 6.15282, 118.14895], [ 6.14214, 118.16463], [ 6.13145, 118.18032],
  [ 6.12079, 118.19597], [ 6.11026, 118.21142], [ 6.09973, 118.22688],
  [ 6.08921, 118.24233], [ 6.07860, 118.25792], [ 6.06791, 118.27360],
  [ 6.05723, 118.28928], [ 6.04447, 118.31330], [ 6.03950, 118.33437],
  [ 6.03480, 118.35439], [ 6.03010, 118.37442], [ 6.02535, 118.39468],
  [ 6.02056, 118.41507], [ 6.01577, 118.43546], [ 6.00964, 118.45378],
  [ 6.00098, 118.47113], [ 5.99239, 118.48835], [ 5.98389, 118.50540],
  [ 5.97539, 118.52244], [ 5.96682, 118.53961], [ 5.95817, 118.55696],
  [ 5.94951, 118.57431], [ 5.94093, 118.59150], [ 5.93242, 118.60855],
  [ 5.92392, 118.62559], [ 5.91534, 118.64279], [ 5.90668, 118.66014],
  [ 5.89802, 118.67748], [ 5.88946, 118.69464], [ 5.88095, 118.71168],
  [ 5.87244, 118.72873], [ 5.86384, 118.74596], [ 5.85518, 118.76331],
  [ 5.84652, 118.78066], [ 5.83797, 118.79778], [ 5.82946, 118.81482],
  [ 5.82096, 118.83186], [ 5.81233, 118.84913], [ 5.80367, 118.86648],
  [ 5.79501, 118.88383], [ 5.78648, 118.90091], [ 5.77797, 118.91795],
  [ 5.76946, 118.93499], [ 5.76081, 118.95230], [ 5.75215, 118.96965],
  [ 5.74349, 118.98699], [ 5.73497, 119.00404], [ 5.72646, 119.02107],
  [ 5.71795, 119.03812], [ 5.70928, 119.05546], [ 5.70062, 119.07281],
  [ 5.69403, 119.09588], [ 5.68959, 119.13015], [ 5.68600, 119.15166],
  [ 5.67873, 119.18489], [ 5.67083, 119.21382], [ 5.65878, 119.24784],
  [ 5.65170, 119.26561], [ 5.64462, 119.28338], [ 5.63755, 119.30112],
  [ 5.62528, 119.32995], [ 5.61283, 119.35507], [ 5.60179, 119.37645],
  [ 5.58294, 119.40867], [ 5.57257, 119.42503], [ 5.55582, 119.43214],
  [ 5.52297, 119.44497], [ 5.48890, 119.45559], [ 5.47035, 119.46076],
  [ 5.45180, 119.46593], [ 5.41649, 119.47433], [ 5.38593, 119.47929],
  [ 5.36805, 119.48180], [ 5.34725, 119.48469], [ 5.31643, 119.48766],
  [ 5.29831, 119.48900], [ 5.27947, 119.49040], [ 5.26062, 119.49179],
  [ 5.23969, 119.49332], [ 5.20666, 119.49431], [ 5.18258, 119.47961],
  [ 5.15876, 119.45795], [ 5.13004, 119.42738], [ 5.11692, 119.41191],
  [ 5.10406, 119.39675], [ 5.09120, 119.38159], [ 5.07835, 119.36644],
  [ 5.06510, 119.35082], [ 5.05196, 119.33533], [ 5.03344, 119.31427],
  [ 5.01924, 119.29961], [ 5.00549, 119.28545], [ 4.99155, 119.27108],
  [ 4.97803, 119.25714], [ 4.96442, 119.24311], [ 4.95048, 119.22875],
  [ 4.93682, 119.21466], [ 4.92332, 119.20075], [ 4.90941, 119.18641],
  [ 4.89560, 119.17219], [ 4.88210, 119.15827], [ 4.86833, 119.14408],
  [ 4.85439, 119.12972], [ 4.84089, 119.11580], [ 4.82725, 119.10175],
  [ 4.81331, 119.08739], [ 4.79880, 119.07289], [ 4.78482, 119.05990],
  [ 4.76815, 119.04580], [ 4.75175, 119.03749], [ 4.73501, 119.02902],
  [ 4.71809, 119.02044], [ 4.69564, 119.01679], [ 4.67562, 119.01441],
  [ 4.65600, 119.01207], [ 4.63650, 119.00976], [ 4.61661, 119.00740],
  [ 4.59659, 119.00502], [ 4.55701, 119.01635], [ 4.53746, 119.02354],
  [ 4.51806, 119.03068], [ 4.49909, 119.03766], [ 4.47987, 119.04474],
  [ 4.46033, 119.05193], [ 4.43761, 119.06016], [ 4.41749, 119.06679],
  [ 4.39741, 119.07340], [ 4.37731, 119.08002], [ 4.35736, 119.08660],
  [ 4.33766, 119.09308], [ 4.31796, 119.09957], [ 4.29797, 119.10616],
  [ 4.26494, 119.11802], [ 4.22478, 119.13646], [ 4.16636, 119.17032],
  [ 4.11178, 119.20361], [ 4.06375, 119.23717],
  // Close — eastern boundary back up to start along ~121°E
  [ 4.06375, 121.04953], [21.03652, 121.04953],
];

/**
 * Sensitive zones — coordinates verified against AMTI/CSIS, Wikidata, and UNCLOS reference data.
 * radiusNm: nautical miles (1nm = 1.852km). Haversine used for distance checks.
 */
export const SENSITIVE_ZONES = [
  { lat: 15.1333, lng: 117.7500, radiusNm: 12, name: 'Scarborough Shoal (Bajo de Masinloc)' },
  { lat:  9.7333, lng: 115.8667, radiusNm: 12, name: 'Second Thomas Shoal (Ayungin)' },
  { lat:  9.9700, lng: 114.6500, radiusNm: 12, name: 'Whitsun Reef (Julian Felipe)' },
  { lat:  9.9167, lng: 115.5333, radiusNm: 12, name: 'Mischief Reef (Panganiban)' },
];

export const VESSEL_TYPES: Record<VesselType, VesselTypeConfig> = {
  cargo:      { color: '#00c8ff', label: 'Cargo',       iconPath: '/img/ship/cargo.svg' },
  tanker:     { color: '#ffaa00', label: 'Tanker',      iconPath: '/img/ship/oil-tanker.svg' },
  fishing:    { color: '#00e676', label: 'Fishing',     iconPath: '/img/ship/fishing.svg' },
  military:   { color: '#ff3b3b', label: 'Military',    iconPath: '/img/ship/military.svg' },
  coastguard: { color: '#ff8c00', label: 'Coast Guard', iconPath: '/img/ship/coast-guard.svg' },
  unknown:    { color: '#8888aa', label: 'Unknown',     iconPath: '/img/ship/unkown.svg' },
};

/**
 * Mock vessel definitions — each entry has a name, flag (ISO 3166-1 alpha-2),
 * vessel type, and MMSI prefix per ITU Maritime Identification Digits (MID).
 *
 * MID codes: PH=548, CN=412, VN=574, MY=533, US=338
 * MMSI format: MIDxxxxxx (9 digits total)
 *
 * PH vessels: positioned inside the Philippine EEZ
 * Foreign vessels: positioned just outside the EEZ perimeter, hugging the boundary
 */
export const MOCK_VESSELS: Array<{
  name: string; flag: string; type: VesselType; mmsiPrefix: string;
  position: [number, number];
}> = [
  // ── Philippine Navy / Coast Guard (inside EEZ, offshore) ──
  // BRP del Pilar: WPS patrol near Scarborough Shoal
  { name: 'BRP Gregorio del Pilar',  flag: 'PH', type: 'military',   mmsiPrefix: '548', position: [15.20, 117.80] },
  // BRP Bonifacio: patrolling Verde Island Passage (between Luzon and Mindoro)
  { name: 'BRP Andres Bonifacio',    flag: 'PH', type: 'military',   mmsiPrefix: '548', position: [13.60, 120.60] },
  // PCG Silang: Sulu Sea patrol west of Palawan
  { name: 'PCG Gabriela Silang',     flag: 'PH', type: 'coastguard', mmsiPrefix: '548', position: [ 9.80, 118.20] },
  // BRP Cabra: Mindoro Strait patrol
  { name: 'BRP Cabra',               flag: 'PH', type: 'coastguard', mmsiPrefix: '548', position: [12.80, 119.80] },
  // ── Philippine civilian (inside EEZ, offshore shipping lanes) ──
  // MV Kalayaan: Manila-bound cargo, South China Sea approach
  { name: 'MV Kalayaan',             flag: 'PH', type: 'cargo',      mmsiPrefix: '548', position: [14.20, 119.40] },
  // MV Palawan Express: Sulu Sea route between Palawan and Visayas
  { name: 'MV Palawan Express',      flag: 'PH', type: 'cargo',      mmsiPrefix: '548', position: [10.40, 119.20] },
  // FV Bantay Dagat: fishing grounds off Zambales coast (WPS side)
  { name: 'FV Bantay Dagat',         flag: 'PH', type: 'fishing',    mmsiPrefix: '548', position: [15.50, 119.20] },
  // FV Luzon Fisher: Babuyan Channel fishing grounds north of Luzon
  { name: 'FV Luzon Fisher',         flag: 'PH', type: 'fishing',    mmsiPrefix: '548', position: [19.00, 121.50] },
  // MV Cebu Star: Leyte Gulf shipping lane
  { name: 'MV Cebu Star',            flag: 'PH', type: 'cargo',      mmsiPrefix: '548', position: [10.80, 125.20] },
  // MV Romblon Star: Sibuyan Sea inter-island route
  { name: 'MV Romblon Star',         flag: 'PH', type: 'cargo',      mmsiPrefix: '548', position: [12.40, 122.80] },
  // ── Chinese vessels — loitering at the disputed features (triggers incursion alerts) ──
  // CCG maintains near-constant presence at Scarborough Shoal
  { name: 'CCG 5204',                flag: 'CN', type: 'coastguard', mmsiPrefix: '412', position: [15.1333, 117.7500] },
  // CCG blockade activity around Second Thomas Shoal (Ayungin)
  { name: 'Hai Jing 3901',           flag: 'CN', type: 'coastguard', mmsiPrefix: '412', position: [ 9.7333, 115.8667] },
  // Maritime-militia swarm at Whitsun Reef (Julian Felipe)
  { name: 'Hai Yang 001',            flag: 'CN', type: 'fishing',    mmsiPrefix: '412', position: [ 9.9700, 114.6500] },
  // Presence at Mischief Reef (Panganiban)
  { name: 'Lu Peng Yuan Yu 028',     flag: 'CN', type: 'fishing',    mmsiPrefix: '412', position: [ 9.9167, 115.5333] },
  // ── Vietnamese vessels — just outside EEZ southwestern perimeter ──
  { name: 'CSB 8003',                flag: 'VN', type: 'coastguard', mmsiPrefix: '574', position: [ 8.80, 113.50] },
  { name: 'FV Binh Thuan 01',        flag: 'VN', type: 'fishing',    mmsiPrefix: '574', position: [ 9.30, 113.60] },
  // ── Malaysian vessel — just outside EEZ southern perimeter near Sabah ──
  { name: 'KD Keris',                flag: 'MY', type: 'military',   mmsiPrefix: '533', position: [ 5.80, 118.20] },
  // ── International cargo — transiting just outside EEZ ──
  { name: 'CSCL Globe',              flag: 'CN', type: 'cargo',      mmsiPrefix: '413', position: [17.50, 116.20] },
  { name: 'MV Pacific Trader',       flag: 'US', type: 'cargo',      mmsiPrefix: '338', position: [19.00, 117.80] },
  // ── Philippine tanker (inside EEZ, Celebes Sea off southeast Mindanao) ──
  { name: 'MT Mindanao Spirit',      flag: 'PH', type: 'tanker',     mmsiPrefix: '548', position: [ 5.80, 126.50] },
];
