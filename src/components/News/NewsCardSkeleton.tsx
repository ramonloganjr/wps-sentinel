import React from 'react';

export const NewsCardSkeleton: React.FC = () => (
  <div className="ni ni--sk" aria-hidden="true">
    <span className="ni-idx ni-sk-block ni-sk-idx" />
    <span className="ni-tag ni-sk-block ni-sk-tag" />
    <span className="ni-title ni-sk-block ni-sk-title" />
    <span className="ni-source ni-sk-block ni-sk-source" />
    <span className="ni-time ni-sk-block ni-sk-time" />
  </div>
);
