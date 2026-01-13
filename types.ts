
export type IconType = string; // Emoji character

export interface Track {
  id: string;
  name: string;
  icon: IconType;
  color: string; // Tailwind color class base (e.g. 'blue', 'rose')
  order: number;
}

export enum NodeType {
  MILESTONE = 'MILESTONE', // Permanently thickens line
  MOMENT = 'MOMENT',       // Local bulge
}

export interface LifeNode {
  id: string;
  trackId: string;
  timestamp: number;
  title: string;
  description?: string;
  weight: number; // 1-10 scale, determines bubble size
  type: NodeType;
  linkedNodeId?: string; // For connecting cross-track
}

export interface AppState {
  tracks: Track[];
  nodes: LifeNode[];
  zoomLevel: number; // Pixels per day
  scrollX: number;
}

export const COLORS = [
  'slate', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'
];

export const EMOJI_CATEGORIES = {
  "Smileys & People": ['😀', '🥰', '😎', '🤔', '😭', '🤯', '🥳', '❤️', '👋', '👍', '✌️', '💪', '🧠', '👶', '🧑', '🧓', '👮', '👷', '👩‍🎓', '👨‍💻', '🦸', '🤵', '👰', '🧘', '🤝', '👀', '👄', '👣'],
  "Animals & Nature": ['🐶', '🐱', '🌿'],
  "Food & Drink": ['🍎', '🍔', '☕️'],
  "Activity": [
    // Sports & Athletics
    '⚽️', '🏀', '🏈', '⚾️', '🎾', '🏐', '🏉', '🏓', '🏸', '🏒', '🏑', '🏏', '⛳️', '🏹', '🎣', '🥊', '🥋', 
    '🛹', '🎿', '⛸️', '🛷', '🏋️', '🏄', '🏊', '🤽', '🚣', '🧗', '🧘', '🏃', '🤸', '🚴', '🚵', '🏇', '🤺', 
    '🎳', '🎱', 
    // Games
    '🎮', '🕹️', '👾', '🎲', '♟️', '🎯', '🎰', '🧩', '🃏',
    // Creative & Arts (Photo, Video, Painting)
    '🎨', '🖌️', '🖍️', '📸', '📹', '🎥', '🎞️', '🎬', '🎭', 
    // Music & Dance
    '💃', '🕺', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🎻', '🪕', 
    // Crafts & Writing
    '🧶', '🧵', '🖊️', '🖋️'
  ],
  "Travel & Places": ['🚗', '🚕', '🚌', '🏎️', '🚓', '🚑', '🚒', '🚚', '🚲', '🛵', '🚂', '✈️', '🚀', '🛸', '🚁', '⛵️', '⚓️', '🚧', '🚦', '🗺️', '🏟️', '🎡', '🎢', '🏖️', '⛰️', '🏕️', '🏠', '🏡', '🏢', '🏥', '🏦', '🏫', '🏛️', '⛪️', '⛩️', '🌉', '⛺️', '🌋', '🛤️', '🏙️'],
  "Objects": ['⌚️', '📱', '💻', '⌨️', '🖥️', '📷', '📺', '💡', '💵', '💰', '💳', '💎', '🔨', '🔧', '🧱', '💣', '💊', '🧬', '🧹', '🧸', '🛍️', '🎁', '🎈', '✉️', '📦', '📊', '📚', '✏️', '🔐', '🗝️', '🔭', '🔬', '🕯️', '🔦', '📓', '🕶️']
};
