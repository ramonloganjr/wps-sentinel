import React from 'react';
import { FilterSection } from './FilterSection';
import { LayerSection } from './LayerSection';
import { AlertList } from './AlertList';
import { StatsGrid } from './StatsGrid';

interface Props {
  open: boolean;
  onAlertClick: (mmsi: string) => void;
}

export const Sidebar: React.FC<Props> = ({ open, onAlertClick }) => (
  <aside className={`sidebar${open ? ' sidebar--open' : ''}`} aria-label="Controls">
    <FilterSection />
    <LayerSection />
    <AlertList onAlertClick={onAlertClick} />
    <StatsGrid />
  </aside>
);
