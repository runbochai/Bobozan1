// --- 1. TYPE DEFINITIONS ---
export type Lang = 'zh' | 'en';
export type CardType = 'CHARGE' | 'ATTACK' | 'DEFEND' | 'ULTIMATE' | 'ABSORB' | 'SPECIAL';
export type HandCategory = 'CHARGE' | 'ATTACK' | 'DEFEND' | 'ULTIMATE' | 'SPECIAL';
export type HandViewMode = 'CATEGORIES' | 'CARDS';

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface Card {
  id: string;
  name: LocalizedText;
  cost: number;
  type: CardType;
  levelRequired: number; 
  tier: number; 
  description: LocalizedText;
  tags?: string[];
}

export interface Player {
  id: string;
  name: string;
  avatar?: string;
  isBot: boolean;
  hp: number;
  energy: number;
  isDead: boolean;
  inventory: number[];
  layer: number;
  tempLayerMod: number;
  selectedCardId: string | null;
  lastCardId: string | null;
  lastAction: string | null;
  disabledSkills?: string[];
  emoji?: string | null;     // 当前表情
  emojiAt?: number | null;
  freeSkills?: string[];   // 💚 absorbed skills that can be used at 0 cost
  pendingLevel?: number | null;
  isShared?: boolean;
  loseStreak?: number;      // 连败场次
  tempSkills?: string[];    // 临时技能 (复仇/赏金)，需花费能量，不占手牌上限，本局有效
  revengeObtainedAt?: number | null;
  kills?: number;
}


export interface LogEntry {
  turn: number;
  text: string;
  type: 'info' | 'combat' | 'death' | 'win' | 'move';
}

export interface GameState {
  status: 'LOBBY' | 'PLAYING' | 'SHOWDOWN' | 'GAMEOVER';
  turn: number;
  matchCount: number;
  players: Player[];
  logs: LogEntry[];
  hostId: string;
  revengeMode?: boolean;
}
