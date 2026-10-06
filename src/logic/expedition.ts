import { SKILL_DB } from '../data/skills';
import {
EXPEDITION_EQUIPMENTS,
EXPEDITION_RELICS,
EXPEDITION_STAGES,
EXPEDITION_MAX_HP,
EXPEDITION_SKILL_LEVELS,
drawGachaCard,
expeditionSecretPool,
type ExpeditionEquipment,
type ExpeditionEnemyDef,
type ExpeditionPersonality,
type ExpeditionStage,
} from '../data/expedition';
import type { Lang } from '../types';

export {
  EXPEDITION_START_HP, EXPEDITION_MAX_HP, EXPEDITION_VIGOR_HP,
  EXPEDITION_WARMUP_ENERGY, EXPEDITION_MONEYTREE_CAP, EXPEDITION_SKILLCHARM_USES,
  EXPEDITION_REST_HEAL, EXPEDITION_CHALLENGE_HP, EXPEDITION_CHALLENGE_GOLD,
  EXPEDITION_SKILL_LEVELS, EXPEDITION_MAX_LEVEL,
} from '../data/expedition';

export const EXPEDITION_BEST_KEY = 'bobozan-expedition-best';

export function loadExpeditionBest(): number {
try {
const value = Number(localStorage.getItem(EXPEDITION_BEST_KEY) || 0);
return Number.isInteger(value) && value >= 0 && value <= EXPEDITION_STAGES.length ? value : 0;
} catch {
return 0;
}
}

export function saveExpeditionBest(cleared: number): void {
if (!Number.isInteger(cleared) || cleared < 0 || cleared > EXPEDITION_STAGES.length) return;
try {
const prev = loadExpeditionBest();
if (cleared > prev) localStorage.setItem(EXPEDITION_BEST_KEY, String(cleared));
} catch {
/* ignore */
}
}

/** Keep remaining copies in the current battle's hand, not just the next stage. */
export function consumeExpeditionCard(cards: { cardId: string; usesLeft: number }[], playedId: string | null) {
return cards.map(card => ({ ...card, usesLeft: card.usesLeft - (card.cardId === playedId ? 1 : 0) })).filter(card => card.usesLeft > 0);
}

/** Public personality only: this must never inspect the committed move. */
export function enemyHabit(personality: ExpeditionPersonality, lang: Lang): string {
const { aggression, defense, charge } = personality;
if (defense >= aggression && defense >= charge) return lang === 'zh' ? '习惯：偏爱防守' : 'Habit: defensive';
if (charge >= aggression) return lang === 'zh' ? '习惯：偏爱攒气' : 'Habit: charges often';
return lang === 'zh' ? '习惯：偏爱进攻' : 'Habit: aggressive';
}

// Keep the existing import path while AI policy remains independently testable.
export { expeditionBotMove, pickThreat } from './expeditionAI';

// ============ 敌人意图：对话气泡台词 ============
const hashStr = (str: string): number => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h * 31 + str.charCodeAt(i)) >>> 0);
  return h;
};

const TAUNTS: Record<string, { zh: string[]; en: string[] }> = {
  CHARGE: {
    zh: ['攒点能量先！', '先积攒能量……', '蓄力中，别打扰我！'],
    en: ['Charging up first!', 'Storing energy...', 'Powering up, do not disturb!'],
  },
  ATTACK: {
    zh: ['吃我一击！', '我要打你！', '看招！', '小心我这一招！'],
    en: ['Take this!', "I'm coming for you!", 'Watch out!', 'Watch my next move!'],
  },
  DEFEND: {
    zh: ['先防一回合。', '你打不着我。', '龟缩一下。'],
    en: ['Blocking this round.', "You can't hit me.", 'Turtling up.'],
  },
  ULTIMATE: {
    zh: ['终极一击！', '受死吧！', '这一击，送你上路！'],
    en: ['Ultimate strike!', 'Face your doom!', 'This one finishes you!'],
  },
  ABSORB: {
    zh: ['把你的能量交出来！', '吸干你！'],
    en: ['Hand over your energy!', 'Draining you dry!'],
  },
  SPECIAL: {
    zh: ['尝尝这个！', '有点意思的东西来了。'],
    en: ['Try this on!', 'Something special incoming.'],
  },
};
const HIDDEN_TAUNTS = {
  zh: ['呵呵，猜猜看？', '……', '你猜我要干嘛？'],
  en: ['Hehe, guess?', '...', 'Care to guess my move?'],
};

/** 意图气泡台词：显示时按真实意图类型给嘲讽，隐藏时给通用台词（不泄露）。
 *  诈唬（deceiver）：意图隐藏时喊打喊杀——可能真要动手，也可能只是在攒能量（虚假意图）。 */
export function intentTaunt(
  cardType: string | undefined, revealed: boolean,
  enemyId: string, turn: number, stageIdx: number, lang: 'zh' | 'en' = 'zh',
  deceiver = false,
): string {
  const threaten = !revealed && deceiver && (cardType === 'ATTACK' || cardType === 'CHARGE');
  const pool = threaten ? TAUNTS.ATTACK : revealed ? (TAUNTS[cardType ?? ''] ?? TAUNTS.SPECIAL) : HIDDEN_TAUNTS;
  const arr = pool[lang];
  return arr[hashStr(`${enemyId}|${turn}|${stageIdx}`) % arr.length];
}

// ============ 敌人被动徽章 ============
export interface PassiveBadge { key: string; icon: string; title: string; desc: string; }

/** 把敌人的被动转成一组小徽章（图标+悬停说明） */
export function passiveBadges(pv: ExpeditionEnemyDef['passive'], lang: 'zh' | 'en' = 'zh'): PassiveBadge[] {
  if (!pv) return [];
  const zh = lang === 'zh';
  const badges: PassiveBadge[] = [];
  if (pv.pierce) badges.push({ key: 'pierce', icon: '🏹', title: zh ? '穿透' : 'Pierce', desc: zh ? '攻击无视对方的防御，直接命中' : 'Attacks ignore defense and hit directly' });
  if (pv.deceiver) badges.push({ key: 'deceiver', icon: '🎭', title: zh ? '诈唬' : 'Bluff', desc: zh ? '满嘴跑火车：它喊"我要打你"时，可能真要动手，也可能只是在攒能量——你猜' : 'Full of bluffs: when it shouts "I\'m coming for you", it may mean it — or be secretly charging. Your call' });
  if (pv.energyDrain) badges.push({ key: 'drain', icon: '🌀', title: zh ? '吸能' : 'Energy Drain', desc: zh ? `命中时吸取目标 ${pv.energyDrain} 点能量` : `Drains ${pv.energyDrain} energy from the target on hit` });
  if (pv.attackBonus) badges.push({ key: 'fury', icon: '🗡️', title: zh ? '狂战' : 'Fury', desc: zh ? `攻击伤害 +${pv.attackBonus}` : `Attack damage +${pv.attackBonus}` });
  if (pv.armorPerTurn) badges.push({ key: 'armor', icon: '🛡️', title: zh ? '护甲' : 'Armor', desc: zh ? `每回合第一次受到的伤害 -${pv.armorPerTurn}` : `First damage taken each turn -${pv.armorPerTurn}` });
  if (pv.enrageDmg || pv.enrageEnergy) badges.push({ key: 'enrage', icon: '💢', title: zh ? '狂暴' : 'Enrage', desc: zh ? `半血后：每回合能量 +${pv.enrageEnergy ?? 0}、伤害 +${pv.enrageDmg ?? 0}` : `Below half HP: +${pv.enrageEnergy ?? 0} energy/turn, +${pv.enrageDmg ?? 0} damage` });
  if (pv.energyPerTurn) badges.push({ key: 'charge', icon: '⚡', title: zh ? '充能' : 'Recharge', desc: zh ? `每回合开始能量 +${pv.energyPerTurn}` : `+${pv.energyPerTurn} energy at turn start` });
  if (pv.startEnergy) badges.push({ key: 'start', icon: '🌅', title: zh ? '开局' : 'Opener', desc: zh ? `战斗开始时能量 +${pv.startEnergy}` : `+${pv.startEnergy} energy at battle start` });
  return badges;
}

// ============ 敌人意图显示规则 ============
export type IntentConceal = 'boss' | 'elite' | 'normal';
/**
 * 前三关（stageIdx 0-2）教学期意图全显示；
 * 之后：Boss 完全隐藏（深不可测），精英 20% 概率显示，普通怪 45% 概率显示（确定性哈希，不闪烁）
 */
export function intentRevealed(enemyId: string, turn: number, stageIdx: number, conceal: IntentConceal = 'normal'): boolean {
if (stageIdx <= 2) return true;
if (conceal === 'boss') return false;
const chance = conceal === 'elite' ? 20 : 45;
const str = `${enemyId}|${turn}|${stageIdx}`;
let h = 0;
for (let i = 0; i < str.length; i++) h = ((h * 31 + str.charCodeAt(i)) >>> 0);
return h % 100 < chance;
}

// ============ 战后奖励：治疗 / 升级 / 血量上限 / 限次秘技 / 遗物 ============
// Energy bonuses come from explicit relics, never hidden level-up stats.

export type RewardOption =
| { kind: 'heal'; amount: number}
| { kind: 'levelup'; level: number}
| { kind: 'maxhp'}
| { kind: 'temp'; cardId: string; uses: number}
| { kind: 'relic'; relicId: string};

/** Only real unlock levels count; combinations and malformed save values are not levels. */
export const expeditionLevel = (inventory: readonly number[]): number =>
  Math.max(0, ...inventory.filter(level => EXPEDITION_SKILL_LEVELS.includes(level)));

export function nextExpeditionLevel(inventory: readonly number[]): number | null {
  const current = expeditionLevel(inventory);
  return EXPEDITION_SKILL_LEVELS.find(level => level > current) ?? null;
}

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
const a = [...arr];
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(rng() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}

export function genRewardOptions(
hp: number,
maxHp: number,
relicIds: string[],
optionCount = 3,
inventory: number[] = [0],
stageIdx = 0,
rng: () => number = Math.random,
): RewardOption[] {
const rest: RewardOption[] = [];
const guaranteed: RewardOption[] = [];
// Growth and recovery remain choices; neither is hidden by a bad reward roll.
const curMax = expeditionLevel(inventory);
const nextLevel = nextExpeditionLevel(inventory);
if (nextLevel !== null) guaranteed.push({ kind: 'levelup', level: nextLevel});
const injured = hp < Math.min(maxHp, EXPEDITION_MAX_HP);
if (injured) guaranteed.push({ kind: 'heal', amount: 1});
if (maxHp < EXPEDITION_MAX_HP) rest.push({ kind: 'maxhp'});
const gacha = drawGachaCard(curMax, stageIdx, rng);
rest.push({ kind: 'temp', cardId: gacha.cardId, uses: gacha.uses});
const relicPool = EXPEDITION_RELICS.filter(r => !relicIds.includes(r.id));
if (relicPool.length > 0) {
  const weighted = relicPool.flatMap(relic => Array.from({ length: relic.rarity === 'common' ? 3 : 1 }, () => relic));
  rest.push({ kind: 'relic', relicId: weighted[Math.floor(rng() * weighted.length)].id });
}
const count = Math.max(guaranteed.length, Math.min(4, Math.floor(optionCount)));
const options = [...guaranteed, ...shuffle(rest, rng).slice(0, Math.max(0, count - guaranteed.length))];
// Saturated builds still get distinct useful choices; do not sell max-HP or
// level upgrades that can no longer work just to fill a fourth reward slot.
const offered = new Set(options.flatMap(option => option.kind === 'temp' ? [option.cardId] : []));
for (const cardId of shuffle(expeditionSecretPool(curMax, stageIdx).filter(id => !offered.has(id)), rng)) {
  if (options.length >= count) break;
  options.push({ kind: 'temp', cardId, uses: 1 + Math.floor(rng() * 3) });
}
return shuffle(options, rng);
}

// ============ 金币与商城 ============

/** 胜利金币（随机掉落）：基础 4~8 + 关卡数，精英关多掉 4~8，Boss 关多掉 15~25 */
export function goldForWin(stageIdx: number, stage: ExpeditionStage, rng: () => number = Math.random): number {
const rnd = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1));
let g = rnd(4, 8) + stageIdx;
if (stage.enemies.some((e) => e.elite)) g += rnd(4, 8);
if (stage.enemies.some((e) => e.boss)) g += rnd(15, 25);
return g;
}

export type ShopItem =
| { kind: 'tempcard'; cardId: string; uses: number; price: number}
| { kind: 'equipment'; equipment: ExpeditionEquipment}
| { kind: 'potion'; price: number};

/** 疗伤药售价 */
export const POTION_PRICE = 10;
/** 疗伤药回复量 */
export const POTION_HEAL = 1;

export interface ExpeditionShopContext {
  hp?: number;
  maxHp?: number;
  dollUsed?: boolean;
}

/**
 * 生成商城商品：2 张限次卡 + 1 件未拥有的装备 + 1 瓶疗伤药。
 * 升级徽章满级后不再出现；装备卖完则补限次卡。
 */
export function genShopItems(ownedEquipment: string[], maxLevel: number, stageIdx = 0,
  rng: () => number = Math.random, context: ExpeditionShopContext = {}): ShopItem[] {
const items: ShopItem[] = [];
const pushCard = () => {
const g = drawGachaCard(maxLevel, stageIdx, rng);
items.push({ kind: 'tempcard', cardId: g.cardId, uses: g.uses, price: shopCardPrice(g.cardId)});
};
pushCard();
pushCard();
const remainingBattles = Math.max(0, EXPEDITION_STAGES.length - stageIdx - 1);
const unowned = shuffle(
EXPEDITION_EQUIPMENTS.filter(
(e) =>!ownedEquipment.includes(e.id) && (e.id !== 'levelbadge' || nextExpeditionLevel([maxLevel]) !== null)
  && (!['moneytree', 'treasurepot'].includes(e.id) || remainingBattles * 4 >= e.price)
  && (e.id !== 'doll' || !context.dollUsed)
  && (e.id !== 'lifegem' || !((context.maxHp ?? 0) >= EXPEDITION_MAX_HP && (context.hp ?? 0) >= (context.maxHp ?? 0)))
), rng
);
if (unowned.length > 0) items.push({ kind: 'equipment', equipment: unowned[0]});
else pushCard();
items.push({ kind: 'potion', price: POTION_PRICE});
return shuffle(items, rng);
}

/** 限次卡售价：5 + 等级×2 */
export function shopCardPrice(cardId: string): number {
const c = SKILL_DB.find((x) => x.id === cardId);
const tier = c ? c.levelRequired : 1;
return 5 + tier * 2;
}

// ============ Legacy helper: first-hit Ironhide refund of 0.5 ============

export function applyIronhide(
hpBefore: number,
hpAfter: number,
maxHp: number,
alreadyUsed: boolean,
): { hp: number; triggered: boolean} {
if (!alreadyUsed && hpAfter < hpBefore) {
return { hp: Math.min(maxHp, hpAfter + 0.5), triggered: true};
}
return { hp: hpAfter, triggered: alreadyUsed};
}
