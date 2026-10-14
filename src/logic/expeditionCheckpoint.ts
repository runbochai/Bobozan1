import { SKILL_DB } from '../data/skills';
import { EXPEDITION_EQUIPMENTS, EXPEDITION_MAX_HP, EXPEDITION_RELICS, EXPEDITION_SKILL_LEVELS, EXPEDITION_STAGES } from '../data/expedition';
import type { ExpeditionDifficulty } from '../data/expeditionDifficulty';
import type { ExpeditionRun } from './expeditionRuntime';

export const EXPEDITION_CHECKPOINT_KEY = 'bobozan-expedition-checkpoint';
export const EXPEDITION_CHECKPOINT_VERSION = 1;
const MAX_CHECKPOINT_BYTES = 64 * 1024;
const UINT32_MAX = 0xffffffff;
const skillIds = new Set(SKILL_DB.map(card => card.id));
const permanentSkills = new Map(SKILL_DB.filter(card => card.levelRequired > 0 && card.levelRequired < 100
  && !card.tags?.includes('combo')).map(card => [card.id, card.levelRequired]));
const skillLevels = new Set([0, ...EXPEDITION_SKILL_LEVELS]);
const relicIds = new Set(EXPEDITION_RELICS.map(relic => relic.id));
const equipmentIds = new Set(EXPEDITION_EQUIPMENTS.map(item => item.id));

/** A local restart point at the beginning of a battle, never a network-room snapshot. */
export interface ExpeditionCheckpoint {
  version: typeof EXPEDITION_CHECKPOINT_VERSION;
  /** Captured BEFORE setupExpeditionStage: setup gear bonuses must not be applied twice. */
  run: ExpeditionRun;
  stageIdx: number;
  /** Only previously revealed hero moves; enemy intents and current choices are excluded. */
  heroHistory?: string[];
  name?: string;
  avatar?: string;
  savedAt: number;
  /** Reusing this seed also preserves the setup dice draw across reloads. */
  setupSeed: number;
}

export interface ExpeditionCheckpointInput {
  run: ExpeditionRun;
  stageIdx: number;
  heroHistory?: readonly string[];
  name?: string;
  avatar?: string;
  setupSeed?: number;
}

const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const integer = (value: unknown, min = 0): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= min;
const stageIndex = (value: unknown, difficulty: ExpeditionDifficulty): value is number => integer(value)
  && (difficulty === 'endless' || value < EXPEDITION_STAGES.length);
const difficultyOf = (value: unknown): ExpeditionDifficulty | null => value === undefined || value === 'beginner'
  ? 'beginner' : value === 'normal' || value === 'endless' ? value : null;

function strings(value: unknown, allowed: ReadonlySet<string>, unique = true, limit = allowed.size): value is string[] {
  return Array.isArray(value) && value.length <= limit
    && value.every(item => typeof item === 'string' && allowed.has(item))
    && (!unique || new Set(value).size === value.length);
}

/** Copy only expedition fields; unrelated or hidden properties are never traversed. */
function readRun(value: unknown): ExpeditionRun | null {
  if (!object(value)) return null;
  const difficulty = difficultyOf(value.difficulty);
  if (!difficulty || !stageIndex(value.stageIdx, difficulty)
    || !strings(value.relics, relicIds) || !strings(value.equipment, equipmentIds)
    || !Array.isArray(value.inventory) || value.inventory.length > skillLevels.size
    || !value.inventory.includes(0) || value.inventory.some(level => !skillLevels.has(level))
    || new Set(value.inventory).size !== value.inventory.length
    || typeof value.hp !== 'number' || !Number.isFinite(value.hp) || value.hp <= 0
    || typeof value.maxHp !== 'number' || !Number.isFinite(value.maxHp) || value.maxHp < value.hp || value.maxHp > EXPEDITION_MAX_HP
    || !integer(value.gold) || typeof value.ironShirtUsed !== 'boolean' || typeof value.dollUsed !== 'boolean'
    || (value.route !== 'rest' && value.route !== 'risk')
    || !Array.isArray(value.tempCards) || value.tempCards.length > skillIds.size) return null;

  const inventory: number[] = [...value.inventory];
  const tempCards: ExpeditionRun['tempCards'] = [];
  const seenCards = new Set<string>();
  for (const card of value.tempCards) {
    if (!object(card) || typeof card.cardId !== 'string' || !skillIds.has(card.cardId)
      || seenCards.has(card.cardId) || !integer(card.usesLeft, 1)) return null;
    seenCards.add(card.cardId);
    tempCards.push({ cardId: card.cardId, usesLeft: card.usesLeft });
  }
  if (value.skillLoadout !== undefined && (!strings(value.skillLoadout, new Set(permanentSkills.keys()))
    || value.skillLoadout.some(id => !inventory.includes(permanentSkills.get(id)!)))) return null;
  if (value.pendingLevel !== undefined && value.pendingLevel !== null
    && (!integer(value.pendingLevel, 1) || !skillLevels.has(value.pendingLevel))) return null;
  if (value.crownCleared !== undefined && (!Array.isArray(value.crownCleared)
    || value.crownCleared.length > EXPEDITION_STAGES.length
    || value.crownCleared.some(index => !integer(index) || index >= EXPEDITION_STAGES.length)
    || new Set(value.crownCleared).size !== value.crownCleared.length)) return null;

  const run: ExpeditionRun = {
    difficulty, stageIdx: value.stageIdx, relics: [...value.relics], equipment: [...value.equipment],
    inventory, hp: value.hp, maxHp: value.maxHp, gold: value.gold, tempCards,
    ironShirtUsed: value.ironShirtUsed, dollUsed: value.dollUsed, route: value.route,
    ...(value.skillLoadout !== undefined ? { skillLoadout: [...value.skillLoadout as string[]] } : {}),
    ...(value.pendingLevel !== undefined ? { pendingLevel: value.pendingLevel as number | null } : {}),
    ...(value.crownCleared !== undefined ? { crownCleared: [...value.crownCleared as number[]] } : {}),
  };
  for (const key of ['endlessLevel', 'endlessEnemyLevel', 'endlessDefeats', 'endlessEnteredStageIdx', 'endlessClearedStageIdx', 'endlessRouteStageIdx'] as const) {
    const count = value[key];
    if (count === undefined) continue;
    if (difficulty !== 'endless' || !integer(count, key === 'endlessEnemyLevel' ? 1 : 0)) return null;
    run[key] = count;
  }
  return run;
}

function readCheckpoint(value: unknown): ExpeditionCheckpoint | null {
  if (!object(value) || value.version !== EXPEDITION_CHECKPOINT_VERSION || !integer(value.savedAt)
    || !integer(value.setupSeed) || value.setupSeed > UINT32_MAX) return null;
  const run = readRun(value.run);
  if (!run || !stageIndex(value.stageIdx, run.difficulty ?? 'beginner')) return null;
  if (value.heroHistory !== undefined && !strings(value.heroHistory, skillIds, false, 12)) return null;
  if (value.name !== undefined && (typeof value.name !== 'string' || value.name.length > 256)) return null;
  if (value.avatar !== undefined && (typeof value.avatar !== 'string' || value.avatar.length > 2048)) return null;
  return {
    version: EXPEDITION_CHECKPOINT_VERSION, run, stageIdx: value.stageIdx, savedAt: value.savedAt, setupSeed: value.setupSeed,
    ...(value.heroHistory !== undefined ? { heroHistory: [...value.heroHistory as string[]] } : {}),
    ...(value.name !== undefined ? { name: value.name as string } : {}),
    ...(value.avatar !== undefined ? { avatar: value.avatar as string } : {}),
  };
}

/** Build an isolated, validated snapshot even when browser storage is unavailable. */
export function createExpeditionCheckpoint(input: ExpeditionCheckpointInput, savedAt = Date.now()): ExpeditionCheckpoint | null {
  try {
    return readCheckpoint({ version: EXPEDITION_CHECKPOINT_VERSION, run: input.run, stageIdx: input.stageIdx,
      heroHistory: input.heroHistory, name: input.name, avatar: input.avatar, savedAt,
      setupSeed: input.setupSeed ?? Math.floor(Math.random() * (UINT32_MAX + 1)) });
  } catch {
    return null;
  }
}

/** Only setup randomness is replayed; combat and rewards retain their ordinary randomness. */
export function createExpeditionCheckpointRandom(checkpoint: Pick<ExpeditionCheckpoint, 'setupSeed'>): () => number {
  let state = checkpoint.setupSeed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / (UINT32_MAX + 1);
  };
}

export function saveExpeditionCheckpoint(input: ExpeditionCheckpointInput, savedAt = Date.now()): ExpeditionCheckpoint | null {
  const checkpoint = createExpeditionCheckpoint(input, savedAt);
  if (!checkpoint) return null;
  try {
    const serialized = JSON.stringify(checkpoint);
    if (serialized.length > MAX_CHECKPOINT_BYTES) return null;
    localStorage.setItem(EXPEDITION_CHECKPOINT_KEY, serialized);
    return checkpoint;
  } catch {
    return null;
  }
}

export function loadExpeditionCheckpoint(): ExpeditionCheckpoint | null {
  try {
    const raw = localStorage.getItem(EXPEDITION_CHECKPOINT_KEY);
    return raw && raw.length <= MAX_CHECKPOINT_BYTES ? readCheckpoint(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function clearExpeditionCheckpoint(): void {
  try {
    localStorage.removeItem(EXPEDITION_CHECKPOINT_KEY);
  } catch {
    // Storage restrictions never block local play or leaving a campaign.
  }
}
