const CACHE_KEY  = 'ph_eez_news_v2';
const CACHE_TTL  = 5 * 60 * 1000;   // 5 min — matches poll interval
const SEEN_KEY   = 'ph_eez_seen_v2'; // persisted dedup set
const SEEN_MAX   = 500;              // max link hashes to remember

interface CacheEntry<T> {
  data: T;
  ts: number;
}

// ── Generic cache ─────────────────────────────────────────────────────────

export function getCached<T>(key = CACHE_KEY): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.ts > CACHE_TTL) { sessionStorage.removeItem(key); return null; }
    return entry.data;
  } catch { return null; }
}

export function setCache<T>(data: T, key = CACHE_KEY): void {
  try {
    sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota — skip */ }
}

// ── Seen-link dedup (persisted across refreshes in sessionStorage) ─────────

export function getSeenLinks(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

export function addSeenLinks(links: string[]): void {
  try {
    const seen = getSeenLinks();
    links.forEach((l) => seen.add(l));
    // Trim to max size (keep newest — just slice the set)
    const arr = Array.from(seen);
    const trimmed = arr.length > SEEN_MAX ? arr.slice(arr.length - SEEN_MAX) : arr;
    sessionStorage.setItem(SEEN_KEY, JSON.stringify(trimmed));
  } catch { /* quota — skip */ }
}

// ── Simple string hash for dedup IDs ─────────────────────────────────────

export function hashLink(url: string): string {
  let h = 0;
  for (let i = 0; i < url.length; i++) h = (Math.imul(31, h) + url.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}
