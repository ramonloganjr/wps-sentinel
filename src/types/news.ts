export interface NewsItem {
  id: string;           // dedup key: hash of link
  title: string;
  link: string;
  pubDate: string;      // ISO string
  author: string;
  thumbnail: string;
  description: string;
  source: string;
  topic: NewsTopic;
  score: number;        // computed relevance score (higher = more prominent)
  priority: 'high' | 'normal'; // high = WPS-tier, normal = broader EEZ
}

export type NewsTopic =
  | 'wps'
  | 'eez'
  | 'maritime'
  | 'defense'
  | 'diplomacy';

export interface TopicFeed {
  key: NewsTopic;
  label: string;
  rss: string;
  weight: number;       // base score multiplier for this feed
  pollMs: number;       // individual poll interval
}

export type NewsStatus = 'idle' | 'loading' | 'success' | 'error';
