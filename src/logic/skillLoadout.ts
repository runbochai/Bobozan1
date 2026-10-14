import type { Card, HandCategory } from '../types';
import { SKILL_DB } from '../data/skills';

export const SKILL_CATALOG_VERSION = 2;
export const SKILL_SLOT_LIMIT = 3;
export const SKILL_CATEGORIES = ['ATTACK', 'DEFEND', 'ULTIMATE'] as const;
export type SkillCategory = typeof SKILL_CATEGORIES[number];
export type SkillSelections = Partial<Record<SkillCategory, readonly string[]>>;
export interface SkillLoadoutState {
  inventory: number[];
  /** Version 2 removes the old Lv.13–16 skill groups and compacts later unlocks. */
  skillCatalogVersion?: number;
  skillLoadout?: string[];
  tempSkills?: string[];
  freeSkills?: string[];
  /** Old saves may have a whole level awaiting the previous discard screen. */
  pendingLevel?: number | null;
}
export interface SkillOverflow { category: SkillCategory; cards: Card[]; limit: number }

export const COMBO_COMPONENTS: Readonly<Record<string, readonly string[]>> = {
  skydragon: ['pegasus', 'icesword', 'dragonclaw'],
  doublewing: ['smallfly', 'bigfly'],
  vajra: ['helmetdef', 'handdef', 'footdef'],
  allbomb: ['hongtian', 'hongdi'],
  heartpoison: ['hongtian', 'hongdi'],
};
const byId = new Map(SKILL_DB.map(card => [card.id, card]));
const isPermanent = (card: Card) => card.levelRequired > 0 && card.levelRequired < 100 && !card.tags?.includes('combo');

/** Presentation only: absorption, movement and other defensive tools retain their combat CardType. */
export function getHandCategory(card: Card): HandCategory {
  return card.type === 'SPECIAL' || card.type === 'ABSORB' ? 'DEFEND' : card.type;
}

// Read only public ownership fields. Spreading a Player here would inspect its hidden selection.
function readSkillLoadout(holder: SkillLoadoutState) {
  const inventory = [...new Set(holder.inventory)];
  const unlocked = holder.skillLoadout ?? inventory.flatMap(level =>
    SKILL_DB.filter(card => card.levelRequired === level && isPermanent(card)).map(card => card.id));
  const skillLoadout = [...new Set(unlocked)].filter(id => {
    const card = byId.get(id);
    return card && isPermanent(card) && inventory.includes(card.levelRequired);
  });
  const pending = holder.pendingLevel;
  if (pending != null && !inventory.includes(pending)) {
    inventory.push(pending);
    skillLoadout.push(...SKILL_DB.filter(card => card.levelRequired === pending && isPermanent(card)).map(card => card.id));
  }
  return { inventory, skillLoadout, ...(pending != null ? { pendingLevel: null } : {}) };
}

export const getRetainedSkillIds = (holder: SkillLoadoutState): string[] => readSkillLoadout(holder).skillLoadout;

/** Keep available saved skills for explicit selection; retired IDs cannot create borrowed cards. */
export function normalizeSkillLoadout<T extends SkillLoadoutState>(holder: T): T & { skillLoadout: string[]; skillCatalogVersion: number } {
  return { ...holder, ...readSkillLoadout(holder), skillCatalogVersion: SKILL_CATALOG_VERSION,
    ...(holder.tempSkills ? { tempSkills: holder.tempSkills.filter(id => byId.has(id)) } : {}),
    ...(holder.freeSkills ? { freeSkills: holder.freeSkills.filter(id => byId.has(id)) } : {}),
  };
}

/** Only storage/network boundaries use this: unversioned data uses the original catalog levels. */
export function migrateLegacySkillCatalog<T extends SkillLoadoutState>(holder: T): T & { skillLoadout: string[]; skillCatalogVersion: number } {
  if ((holder.skillCatalogVersion ?? 0) >= SKILL_CATALOG_VERSION) return normalizeSkillLoadout(holder);
  const migrateLevel = (level: number): number | null => {
    if (!Number.isSafeInteger(level) || level < 0 || level > 23) return null;
    if (level <= 12) return level;
    return level >= 17 ? level - 4 : null;
  };
  const inventory = holder.inventory.flatMap(level => {
    const mapped = migrateLevel(level);
    return mapped == null ? [] : [mapped];
  });
  const pendingLevel = holder.pendingLevel == null ? holder.pendingLevel : migrateLevel(holder.pendingLevel);
  return normalizeSkillLoadout({ ...holder, inventory, ...(holder.pendingLevel != null ? { pendingLevel } : {}) });
}

export function grantSkillLevel<T extends SkillLoadoutState>(holder: T, level: number): T & { skillLoadout: string[]; skillCatalogVersion: number } {
  const next = normalizeSkillLoadout(holder);
  if (!next.inventory.includes(level)) {
    next.inventory.push(level);
    next.skillLoadout.push(...SKILL_DB.filter(card => card.levelRequired === level && isPermanent(card)).map(card => card.id));
  }
  return next;
}

export function isAcquiredSkill(holder: SkillLoadoutState, card: Card): boolean {
  return isPermanent(card) && getRetainedSkillIds(holder).includes(card.id);
}

export function getSkillOverflow(holder: SkillLoadoutState): SkillOverflow[] {
  const cards = getRetainedSkillIds(holder).map(id => byId.get(id)!);
  return SKILL_CATEGORIES.flatMap(category => {
    const matching = cards.filter(card => getHandCategory(card) === category);
    return matching.length > SKILL_SLOT_LIMIT ? [{ category, cards: matching.reverse(), limit: SKILL_SLOT_LIMIT }] : [];
  });
}

export const hasSkillOverflow = (holder: SkillLoadoutState) => getSkillOverflow(holder).length > 0;

/** A missing, stale or foreign choice is rejected as a whole, never partially applied. */
export function resolveSkillLoadout<T extends SkillLoadoutState>(holder: T, selections: SkillSelections): (T & { skillLoadout: string[]; skillCatalogVersion: number }) | null {
  const next = normalizeSkillLoadout(holder), overflow = getSkillOverflow(next);
  const categories = new Set(overflow.map(group => group.category));
  if (Object.keys(selections).some(category => !categories.has(category as SkillCategory))) return null;
  for (const group of overflow) {
    const keep = selections[group.category];
    if (!Array.isArray(keep) || keep.length > SKILL_SLOT_LIMIT || new Set(keep).size !== keep.length
      || keep.some(id => !group.cards.some(card => card.id === id))) return null;
  }
  next.skillLoadout = next.skillLoadout.filter(id => {
    const category = getHandCategory(byId.get(id)!) as SkillCategory;
    return !categories.has(category) || selections[category]!.includes(id);
  });
  return next;
}

/** Bots keep the latest three in each category, without introducing a new combat policy. */
export function autoSelectSkillLoadout<T extends SkillLoadoutState>(holder: T): T & { skillLoadout: string[]; skillCatalogVersion: number } {
  const next = normalizeSkillLoadout(holder);
  const selections = Object.fromEntries(getSkillOverflow(next).map(group =>
    [group.category, group.cards.slice(0, SKILL_SLOT_LIMIT).map(card => card.id)]));
  return resolveSkillLoadout(next, selections)!;
}

/** Sort a copy; earned and borrowed abilities precede basic cards, with newer acquisitions first. */
export function sortHandCards(holder: SkillLoadoutState & { tempSkills?: string[]; freeSkills?: string[] }, cards: readonly Card[]): Card[] {
  const owned = getRetainedSkillIds(holder);
  const borrowed = [...(holder.tempSkills ?? []), ...(holder.freeSkills ?? [])];
  const rank = (card: Card) => {
    const temporary = borrowed.lastIndexOf(card.id);
    if (temporary >= 0) return owned.length + temporary + 2;
    const retained = owned.indexOf(card.id);
    if (retained >= 0) return retained + 1;
    const components = COMBO_COMPONENTS[card.id];
    if (components) return Math.max(0, ...components.map(id => owned.indexOf(id) + 1)) + .5;
    return card.levelRequired > 0 ? .25 : -1;
  };
  return [...cards].sort((a, b) => rank(b) - rank(a));
}
