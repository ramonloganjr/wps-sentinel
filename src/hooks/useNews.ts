import { useState, useEffect, useCallback, useRef } from 'react';
import type { NewsItem, NewsStatus, NewsTopic, TopicFeed } from '../types/news';
import { getCached, setCache, addSeenLinks, hashLink } from '../utils/newsCache';
import { FALLBACK_NEWS } from '../utils/newsFallback';

// ── Feed registry ─────────────────────────────────────────────────────────
// weight: base score multiplier — WPS gets 2.0, others 1.0–1.4
// pollMs: WPS polls every 3 min, others every 6 min

export const TOPIC_FEEDS: TopicFeed[] = [
  {
    key: 'wps',
    label: 'West Philippine Sea',
    rss: 'https://news.google.com/rss/search?q=west+philippine+sea&hl=en-US&gl=US&ceid=US:en',
    weight: 2.0,
    pollMs: 3 * 60_000,
  },
  {
    key: 'eez',
    label: 'Philippine EEZ',
    rss: 'https://news.google.com/rss/search?q=philippine+exclusive+economic+zone+EEZ&hl=en-US&gl=US&ceid=US:en',
    weight: 1.4,
    pollMs: 6 * 60_000,
  },
  {
    key: 'maritime',
    label: 'Maritime',
    rss: 'https://news.google.com/rss/search?q=philippines+maritime+south+china+sea&hl=en-US&gl=US&ceid=US:en',
    weight: 1.2,
    pollMs: 6 * 60_000,
  },
  {
    key: 'defense',
    label: 'Defense',
    rss: 'https://news.google.com/rss/search?q=philippines+navy+coast+guard+patrol+shoal&hl=en-US&gl=US&ceid=US:en',
    weight: 1.2,
    pollMs: 6 * 60_000,
  },
  {
    key: 'diplomacy',
    label: 'Diplomacy',
    rss: 'https://news.google.com/rss/search?q=philippines+china+UNCLOS+arbitration+sovereignty&hl=en-US&gl=US&ceid=US:en',
    weight: 1.0,
    pollMs: 6 * 60_000,
  },
];

// ── Relevance scoring ─────────────────────────────────────────────────────
// Keywords that boost score when found in title/description

const WPS_KEYWORDS = [
  'west philippine sea', 'wps', 'ayungin', 'scarborough', 'panatag',
  'kalayaan', 'spratly', 'paracel', 'spratlys', 'bajo de masinloc',
  'second thomas', 'whitsun reef', 'julian felipe',
];

const EEZ_KEYWORDS = [
  'exclusive economic zone', 'eez', 'unclos', 'arbitral', 'arbitration',
  'sovereign', 'sovereignty', 'territorial', '200 nautical',
  'philippine coast guard', 'pcg', 'brp sierra madre', 'afp', 'paf',
  'south china sea', 'scs', 'nine-dash', 'nine dash',
];

function scoreItem(item: Omit<NewsItem, 'score' | 'priority'>, feed: TopicFeed): number {
  const haystack = `${item.title} ${item.description}`.toLowerCase();
  let score = feed.weight * 100;

  // WPS keyword boost (+40 each, capped)
  let wpsHits = 0;
  for (const kw of WPS_KEYWORDS) {
    if (haystack.includes(kw)) wpsHits++;
  }
  score += Math.min(wpsHits * 40, 160);

  // EEZ keyword boost (+15 each, capped)
  let eezHits = 0;
  for (const kw of EEZ_KEYWORDS) {
    if (haystack.includes(kw)) eezHits++;
  }
  score += Math.min(eezHits * 15, 90);

  // Recency decay: full score within 6h, then linear decay over 48h
  const ageMs = Date.now() - new Date(item.pubDate).getTime();
  const ageH  = ageMs / 3_600_000;
  if (ageH > 6) {
    const decay = Math.max(0, 1 - (ageH - 6) / 42); // 0→1 over 42h window
    score *= (0.5 + 0.5 * decay);
  }

  return Math.round(score);
}

// ── Config ────────────────────────────────────────────────────────────────

const FETCH_TIMEOUT_MS = 10_000;
const STAGGER_MS       = 1_500;   // 1.5s between feeds — faster initial paint
const MAX_PER_FEED     = 15;
const MAX_TOTAL        = 80;

// ── CORS proxy rotation ───────────────────────────────────────────────────

const IS_DEV = import.meta.env.DEV;

const PROXIES: Array<(u: string) => string> = IS_DEV
  ? [
      (u) => {
        const url = new URL(u);
        return `/rss-proxy${url.pathname}${url.search}`;
      },
    ]
  : [
      // rss2json — converts RSS to JSON, very reliable, no CORS issues
      (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}`,
      // allorigins — fallback raw proxy
      (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
      // corsproxy.io — secondary fallback
      (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    ];

// ── RSS helpers ───────────────────────────────────────────────────────────

function getText(el: Element, tag: string): string {
  return el.querySelector(tag)?.textContent?.trim() ?? '';
}

function getThumbnail(item: Element): string {
  const media =
    item.querySelector('content') ??
    item.querySelector('thumbnail') ??
    item.querySelector('enclosure');
  if (media) return media.getAttribute('url') ?? media.getAttribute('src') ?? '';
  const desc = getText(item, 'description');
  const m = desc.match(/src="([^"]+\.(jpg|jpeg|png|webp)[^"]*)"/i);
  return m?.[1] ?? '';
}

function extractSource(title: string, author: string): { cleanTitle: string; source: string } {
  const m = title.match(/^(.*?)\s+-\s+([^-]+)$/);
  if (m) return { cleanTitle: m[1].trim(), source: m[2].trim() };
  return { cleanTitle: title, source: author || 'News' };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s{2,}/g, ' ').trim();
}

function parseRSS(xml: string, feed: TopicFeed): NewsItem[] {
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) return [];
    const items = Array.from(doc.querySelectorAll('item'));
    if (!items.length) return [];

    return items.slice(0, MAX_PER_FEED).map((item) => {
      const rawTitle = getText(item, 'title');
      const { cleanTitle, source } = extractSource(rawTitle, getText(item, 'author'));
      const pubDate = getText(item, 'pubDate');
      const link = getText(item, 'link') || item.querySelector('link')?.textContent?.trim() || '';
      const base: Omit<NewsItem, 'score' | 'priority'> = {
        id: hashLink(link),
        title: cleanTitle,
        link,
        pubDate: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        author: getText(item, 'author'),
        thumbnail: getThumbnail(item),
        description: stripHtml(getText(item, 'description')).slice(0, 220),
        source,
        topic: feed.key,
      };
      const score = scoreItem(base, feed);
      // High priority: WPS feed OR any item with strong WPS keyword hits
      const haystack = `${base.title} ${base.description}`.toLowerCase();
      const wpsHits  = WPS_KEYWORDS.filter((kw) => haystack.includes(kw)).length;
      const priority: NewsItem['priority'] = (feed.key === 'wps' || wpsHits >= 2) ? 'high' : 'normal';
      return { ...base, score, priority };
    }).filter((i) => i.title && i.link);
  } catch { return []; }
}

// ── Fetch single feed ─────────────────────────────────────────────────────

async function fetchOneFeed(feed: TopicFeed): Promise<NewsItem[]> {
  for (const buildUrl of PROXIES) {
    try {
      const url = buildUrl(feed.rss);
      const res = await fetch(url, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { Accept: 'application/json, application/rss+xml, application/xml, text/xml, */*' },
      });
      if (!res.ok) continue;

      // rss2json returns JSON
      if (url.includes('rss2json.com')) {
        const json = await res.json();
        if (json.status !== 'ok' || !json.items?.length) continue;
        const items: NewsItem[] = json.items.slice(0, MAX_PER_FEED).map((item: {
          title: string; link: string; pubDate: string; author: string;
          thumbnail: string; description: string; enclosure?: { link: string };
        }) => {
          const { cleanTitle, source } = extractSource(item.title, item.author);
          const thumbnail = item.thumbnail || item.enclosure?.link || '';
          const base: Omit<NewsItem, 'score' | 'priority'> = {
            id: hashLink(item.link),
            title: cleanTitle,
            link: item.link,
            pubDate: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
            author: item.author,
            thumbnail,
            description: stripHtml(item.description).slice(0, 220),
            source,
            topic: feed.key,
          };
          const score = scoreItem(base, feed);
          const haystack = `${base.title} ${base.description}`.toLowerCase();
          const wpsHits = WPS_KEYWORDS.filter((kw) => haystack.includes(kw)).length;
          const priority: NewsItem['priority'] = (feed.key === 'wps' || wpsHits >= 2) ? 'high' : 'normal';
          return { ...base, score, priority };
        }).filter((i: NewsItem) => i.title && i.link);
        if (items.length) return items;
        continue;
      }

      // Raw XML proxy
      const text = await res.text();
      if (!text.includes('<item')) continue;
      const items = parseRSS(text, feed);
      if (items.length) return items;
    } catch { continue; }
  }
  return [];
}

// ── Merge, deduplicate, rank ──────────────────────────────────────────────

function mergeRanked(batches: NewsItem[][]): NewsItem[] {
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const batch of batches) {
    for (const item of batch) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        merged.push(item);
      }
    }
  }
  // Sort by score descending (recency + relevance + feed weight)
  merged.sort((a, b) => b.score - a.score);
  return merged.slice(0, MAX_TOTAL);
}

// ── Staggered initial fetch ───────────────────────────────────────────────

async function fetchAllStaggered(
  onProgress: (partial: NewsItem[]) => void
): Promise<NewsItem[]> {
  const results: NewsItem[][] = TOPIC_FEEDS.map(() => []);
  await Promise.all(
    TOPIC_FEEDS.map((feed, i) =>
      new Promise<void>((resolve) => {
        setTimeout(async () => {
          results[i] = await fetchOneFeed(feed);
          onProgress(mergeRanked(results));
          resolve();
        }, i * STAGGER_MS);
      })
    )
  );
  return mergeRanked(results);
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useNews() {
  const [items, setItems]             = useState<NewsItem[]>([]);
  const [status, setStatus]           = useState<NewsStatus>('idle');
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const [activeTopic, setActiveTopic] = useState<NewsTopic | 'all'>('all');

  const loadingRef  = useRef(false);
  const timersRef   = useRef<ReturnType<typeof setInterval>[]>([]);
  const itemsRef    = useRef<NewsItem[]>([]);

  // Keep itemsRef in sync for use inside callbacks without stale closure
  useEffect(() => { itemsRef.current = items; }, [items]);

  // ── Full load (all feeds) ──
  const loadAll = useCallback(async (force = false) => {
    if (loadingRef.current && !force) return;

    if (!force) {
      const cached = getCached<NewsItem[]>();
      if (cached?.length) {
        setItems(cached);
        setStatus('success');
        setLastFetched(new Date());
        return;
      }
    }

    loadingRef.current = true;
    setStatus('loading');

    // Seed with fallback immediately so the feed is never blank while fetching
    if (itemsRef.current.length === 0) {
      setItems(FALLBACK_NEWS);
    }

    const onProgress = (partial: NewsItem[]) => {
      if (partial.length > 0) { setItems(partial); setStatus('success'); }
    };

    const fetched = await fetchAllStaggered(onProgress);
    loadingRef.current = false;

    if (fetched.length) {
      addSeenLinks(fetched.map((i) => i.id));
      setCache(fetched);
      setItems(fetched);
      setStatus('success');
    } else {
      // All proxies failed — keep whatever is visible (fallback or stale)
      setItems((prev) => prev.length ? prev : FALLBACK_NEWS);
      setStatus('error');
    }
    setLastFetched(new Date());
  }, []);

  // ── Incremental refresh for a single feed ──
  const refreshFeed = useCallback(async (feed: TopicFeed) => {
    const fresh = await fetchOneFeed(feed);
    if (!fresh.length) return;

    setItems((prev) => {
      // Merge fresh items into existing, re-rank
      const merged = mergeRanked([fresh, prev]);
      setCache(merged);
      addSeenLinks(fresh.map((i) => i.id));
      return merged;
    });
    setLastFetched(new Date());
  }, []);

  // Initial load
  useEffect(() => {
    loadAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Per-feed staggered polling timers
  useEffect(() => {
    // Clear any existing timers
    timersRef.current.forEach(clearInterval);
    timersRef.current = TOPIC_FEEDS.map((feed) =>
      setInterval(() => refreshFeed(feed), feed.pollMs)
    );
    return () => timersRef.current.forEach(clearInterval);
  }, [refreshFeed]);

  // Refresh on tab visibility regain
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadAll();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadAll]);

  const filtered = activeTopic === 'all'
    ? items
    : items.filter((i) => i.topic === activeTopic);

  return {
    items: filtered,
    allItems: items,
    status,
    lastFetched,
    isFallback: status === 'error',
    activeTopic,
    setActiveTopic,
    refresh: () => loadAll(true),
  };
}
