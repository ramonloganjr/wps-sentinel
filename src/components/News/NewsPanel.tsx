import React, { useState } from 'react';
import { useNews, TOPIC_FEEDS } from '../../hooks/useNews';
import { NewsCard } from './NewsCard';
import { NewsCardSkeleton } from './NewsCardSkeleton';
import type { NewsTopic } from '../../types/news';

const PAGE_SIZE = 20;
const SKELETONS = Array.from({ length: 10 });

export const NewsPanel: React.FC = () => {
  const { items, allItems, status, lastFetched, isFallback, activeTopic, setActiveTopic, refresh } = useNews();
  const [page, setPage] = useState(1);

  const isLoading = status === 'loading' && allItems.length === 0;
  const handleTopic = (t: NewsTopic | 'all') => { setActiveTopic(t); setPage(1); };

  const updatedStr = lastFetched
    ? lastFetched.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null;

  const counts: Record<string, number> = { all: allItems.length };
  for (const f of TOPIC_FEEDS) counts[f.key] = allItems.filter((i) => i.topic === f.key).length;

  const visible = items.slice(0, page * PAGE_SIZE);
  const hasMore = items.length > page * PAGE_SIZE;

  return (
    <section className="nf" aria-label="Intelligence Feed">

      {/* ── Header bar ── */}
      <div className="nf-bar">
        <div className="nf-bar-left">
          <span className={`nf-dot${status === 'loading' ? ' nf-dot--spin' : ''}`} aria-hidden="true" />
          <h2 className="nf-title">Intelligence Feed</h2>
          <span className={`nf-status${isFallback ? ' nf-status--warn' : ' nf-status--live'}`}>
            {isFallback ? 'Cached' : 'Live'}
          </span>
        </div>
        <div className="nf-bar-right">
          {updatedStr && !isLoading && (
            <span className="nf-updated">{updatedStr}</span>
          )}
          <button
            type="button"
            className="nf-refresh"
            onClick={refresh}
            disabled={status === 'loading'}
            aria-label="Refresh feed"
          >
            <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor"
              strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={status === 'loading' ? 'spin' : ''} aria-hidden="true">
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* ── Topic tabs ── */}
      <div className="nf-tabs" role="toolbar" aria-label="Filter by topic">
        {[{ key: 'all' as const, label: 'All' }, ...TOPIC_FEEDS.map((f) => ({ key: f.key, label: f.label }))].map(({ key, label }) => {
          const active = activeTopic === key;
          const count  = counts[key] ?? 0;
          return (
            <button
              key={key}
              type="button"
              className={`nf-tab${active ? ' nf-tab--active' : ''}${key === 'wps' ? ' nf-tab--wps' : ''}`}
              onClick={() => handleTopic(key as NewsTopic | 'all')}
              data-active={active}
            >
              {label}
              {count > 0 && <span className="nf-tab-n">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* ── Feed table ── */}
      <div className="nf-feed">
        {isLoading
          ? SKELETONS.map((_, i) => <NewsCardSkeleton key={i} />)
          : visible.length > 0
            ? visible.map((item, i) => <NewsCard key={item.id} item={item} index={i} />)
            : (
              <div className="nf-empty">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
                  strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                No stories available
                <button type="button" className="nf-refresh" onClick={refresh}>Retry</button>
              </div>
            )
        }
      </div>

      {/* ── Footer ── */}
      {!isLoading && items.length > 0 && (
        <div className="nf-footer">
          <span className="nf-count">{visible.length} / {items.length}</span>
          {hasMore && (
            <button type="button" className="nf-more" onClick={() => setPage((p) => p + 1)}>
              Show more
            </button>
          )}
        </div>
      )}
    </section>
  );
};
