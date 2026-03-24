export type VesselType = 'cargo' | 'tanker' | 'fishing' | 'military' | 'coastguard' | 'unknown';
export type AlertType = 'INCURSION' | 'SUSPICIOUS';
export type ConnectionStatus = 'connecting' | 'live' | 'error' | 'offline';

export interface Vessel {
  mmsi: string;
  name: string;
  flag: string;
  type: VesselType;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  status: string;
  lastSeen: string;
  lastSeenMs?: number;
  inWPS?: boolean;
}

export interface Alert {
  type: AlertType;
  message: string;
  mmsi?: string;
  time: Date;
  vessel?: Vessel;
}

export interface VesselTypeConfig {
  color: string;
  label: string;
  iconPath: string;
}

export interface FilterState {
  cargo: boolean;
  tanker: boolean;
  fishing: boolean;
  military: boolean;
  coastguard: boolean;
  unknown: boolean;
}

export interface LayerState {
  eez: boolean;
  wpsZone: boolean;
  landmarks: boolean;
  heatmap: boolean;
  incursions: boolean;
}
