import { Track, LifeNode, NodeType } from './types';

export const INITIAL_ZOOM = 0.5; // pixels per day
export const MIN_ZOOM = 0.05;    // Zoom out to see decades
export const MAX_ZOOM = 10.0;    // Zoom in to see weeks/months clearly

export const DEFAULT_TRACKS: Track[] = [];

export const DEFAULT_NODES: LifeNode[] = [];

export const getColorHex = (colorName: string, shade: number = 500) => {
  // A simplified map for canvas/svg coloring where we can't easily use Tailwind classes
  // In a real app, you might map this more extensively or use CSS variables.
  const map: Record<string, string> = {
    slate: '#64748b', red: '#ef4444', orange: '#f97316', amber: '#f59e0b',
    yellow: '#eab308', lime: '#84cc16', green: '#22c55e', emerald: '#10b981',
    teal: '#14b8a6', cyan: '#06b6d4', sky: '#0ea5e9', blue: '#3b82f6',
    indigo: '#6366f1', violet: '#8b5cf6', purple: '#a855f7', fuchsia: '#d946ef',
    pink: '#ec4899', rose: '#f43f5e'
  };
  return map[colorName] || '#94a3b8';
};