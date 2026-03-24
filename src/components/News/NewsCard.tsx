import React from 'react';
import type { NewsItem } from '../../types/news';

interface Props {
  item: NewsItem;
  index: number;
}

export function relTime(dateStr: string): string {
  try {
    const d = Date.now() - new Date(dateStr).getTime();
    if (isNaN(d) || d < 0) return '';
    const m = Math.floor(d / 60000);
    if (m < 1)  return 'now';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h`;
    const dy = Math.floor(h / 24);
    if (dy < 7) return `${dy}d`;
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function safeHref(link: string): string {
  if (!link) return '#';
  try { new URL(link); return link; } catch { return '#'; }
}

const TOPIC_META: Record<string, { label: string; cls: string }> = {
  wps:       { label: 'WPS',       cls: 'ni-tag--wps' },
  eez:       { label: 'EEZ',       cls: 'ni-tag--eez' },
  maritime:  { label: 'Maritime',  cls: 'ni-tag--maritime' },
  defense:   { label: 'Defense',   cls: 'ni-tag--defense' },
  diplomacy: { label: 'Diplomacy', cls: 'ni-tag--diplomacy' },
};

export const NewsCard: React.FC<Props> = ({ item, index }) => {
  const time  = relTime(item.pubDate);
  const topic = TOPIC_META[item.topic] ?? { label: item.topic, cls: '' };
  const isHigh = item.priority === 'high';

  return (
    <a
      href={safeHref(item.link)}
      target="_blank"
      rel="noreferrer noopener"
      className={`ni${isHigh ? ' ni--high' : ''}`}
      aria-label={item.title}
    >
      <span className="ni-idx">{String(index + 1).padStart(2, '0')}</span>
      <span className={`ni-tag ${topic.cls}`}>{topic.label}</span>
      <span className="ni-title">{item.title}</span>
      <span className="ni-source">{item.source}</span>
      {time && <time className="ni-time" dateTime={item.pubDate}>{time}</time>}
    </a>
  );
};
