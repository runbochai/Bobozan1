import { SKILL_DB } from '../data/skills';
import {
EXPEDITION_EQUIPMENTS,
EXPEDITION_RELICS,
drawGachaCard,
type ExpeditionEquipment,
type ExpeditionEnemyDef,
type ExpeditionPersonality,
type ExpeditionStage,
} from '../data/expedition';
import type { Player} from '../types';

export const EXPEDITION_BEST_KEY = 'bobozan-expedition-best';

export function loadExpeditionBest(): number {
try {
return Number(localStorage.getItem(EXPEDITION_BEST_KEY) || 0);
} catch {
return 0;
}
}

export function saveExpeditionBest(cleared: number): void {
try {
const prev = loadExpeditionBest();
if (cleared > prev) localStorage.setItem(EXPEDITION_BEST_KEY, String(cleared));
} catch {
/* ignore */
}
}

// ============ 敌人 AI：按性格加权出牌 ============

const cardTypeOf = (cardId: string) => SKILL_DB.find((c) => c.id === cardId)?.type;

/** 多方混战：挑威胁最大的活着的对手（能量最高，能量相同看血量），不再只盯玩家 */
export function pickThreat(enemyId: string, players: Player[], playerId: string): Player | undefined {
const opponents = players.filter((p) => p.id !== enemyId &&!p.isDead);
if (opponents.length === 0) return players.find((p) => p.id === playerId);
return [...opponents].sort((a, b) => b.energy - a.energy || (b.hp ?? 0) - (a.hp ?? 0))[0];
}

export function expeditionBotMove(
enemy: Player,
players: Player[],
personality: ExpeditionPersonality,
playerId: string,
): string {
const allKnown = SKILL_DB.filter(
(c) =>
(enemy.inventory.includes(c.levelRequired) || c.levelRequired === 0) &&
!enemy.disabledSkills?.includes(c.id) &&
c.type !== 'SPECIAL',
);
const affordable = allKnown.filter((c) => enemy.energy >= c.cost);
if (affordable.length === 0) return 'charge';

const player = pickThreat(enemy.id, players, playerId);
const playerCharged = (player?.energy?? 0) >= 3;
const playerLastType = player?.lastCardId? cardTypeOf(player.lastCardId): null;

const scored = affordable.map((c) => {
let w = 1;
if (c.type === 'CHARGE') {
w = personality.charge * (enemy.energy < 2? 1.7: 0.6);
} else if (c.type === 'ATTACK') {
w = personality.aggression * (1 + enemy.energy * 0.08);
// 聪明的敌人：你残血时更爱进攻
if (personality.smart > 0.5 && (player?.hp?? 99) <= 1) w *= 1.6;
} else if (c.type === 'DEFEND') {
w = personality.defense;
// 聪明的敌人：你能量充足时更爱防守
if (personality.smart > 0.5 && playerCharged) w *= 1.9;
} else if (c.type === 'ULTIMATE') {
w = personality.aggression * 1.5;
// 聪明的敌人：你龟缩时用终极破防
if (personality.smart > 0.5 && playerLastType === 'DEFEND') w *= 1.7;
} else if (c.type === 'ABSORB') {
// 聪明的敌人（Boss）更爱吸收：锐吸/奥吸
w = 0.5 + personality.smart * 0.9;
} else {
w = 0.5;
}
// 同类型里略偏向高 tier
w *= 1 + (c.tier || 0) * 0.04;
// 抖动，避免完全可预测
w *= 0.6 + Math.random() * 0.8;
return { id: c.id, w};
});

scored.sort((a, b) => b.w - a.w);
return scored[0].id;
}

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
// 注意：没有任何开局能量加成。

export type RewardOption =
| { kind: 'heal'; amount: number}
| { kind: 'levelup'; level: number}
| { kind: 'maxhp'}
| { kind: 'temp'; cardId: string; uses: number}
| { kind: 'relic'; relicId: string};

/** 远征玩家等级上限：Boss 们更强（8/10/11/12 级），玩家靠装备与限次卡追赶 */
export const EXPEDITION_MAX_LEVEL = 5;

function shuffle<T>(arr: T[]): T[] {
const a = [...arr];
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
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
): RewardOption[] {
const rest: RewardOption[] = [];
// 升级：稳定 +1 级，解锁下一级技能卡（满级后不再出现）
const curMax = Math.max(0, ...inventory);
if (curMax < EXPEDITION_MAX_LEVEL) rest.push({ kind: 'levelup', level: curMax + 1});
// 体魄：血量上限 +1（当前血量也 +1）
rest.push({ kind: 'maxhp'});
// 秘技：从全部技能池随机抽一张限次卡（类似复仇抽卡）
const gacha = drawGachaCard();
rest.push({ kind: 'temp', cardId: gacha.cardId, uses: gacha.uses});
// 遗物：还有没拿到的才出现
const relicPool = shuffle(EXPEDITION_RELICS.filter((r) =>!relicIds.includes(r.id)));
if (relicPool.length > 0) rest.push({ kind: 'relic', relicId: relicPool[0].id});
// 受伤时治疗必出，其余随机
const injured = hp < maxHp;
const options = shuffle(rest).slice(0, Math.max(0, optionCount - (injured ? 1 : 0)));
if (injured) options.push({ kind: 'heal', amount: 1});
return shuffle(options);
}

// ============ 金币与商城 ============

/** 胜利金币：基础 6 + 关卡数，精英关 +5，Boss 关 +20 */
export function goldForWin(stageIdx: number, stage: ExpeditionStage): number {
let g = 6 + stageIdx;
if (stage.enemies.some((e) => e.elite)) g += 5;
if (stage.enemies.some((e) => e.boss)) g += 20;
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

/**
 * 生成商城商品：2 张限次卡 + 1 件未拥有的装备 + 1 瓶疗伤药。
 * 升级徽章满级后不再出现；装备卖完则补限次卡。
 */
export function genShopItems(ownedEquipment: string[], maxLevel: number): ShopItem[] {
const items: ShopItem[] = [];
const pushCard = () => {
const g = drawGachaCard();
items.push({ kind: 'tempcard', cardId: g.cardId, uses: g.uses, price: shopCardPrice(g.cardId)});
};
pushCard();
pushCard();
const unowned = shuffle(
EXPEDITION_EQUIPMENTS.filter(
(e) =>!ownedEquipment.includes(e.id) && (e.id !== 'levelbadge' || maxLevel < EXPEDITION_MAX_LEVEL)
)
);
if (unowned.length > 0) items.push({ kind: 'equipment', equipment: unowned[0]});
else pushCard();
items.push({ kind: 'potion', price: POTION_PRICE});
return shuffle(items);
}

/** 限次卡售价：5 + 等级×2 */
export function shopCardPrice(cardId: string): number {
const c = SKILL_DB.find((x) => x.id === cardId);
const tier = c ? c.levelRequired : 1;
return 5 + tier * 2;
}

// ============ 遗物：硬皮甲（每场战斗首次受伤 -1） ============

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
