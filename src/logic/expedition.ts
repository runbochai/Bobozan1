import { SKILL_DB} from '../data/skills';
import {
EXPEDITION_RELICS,
EXPEDITION_STAGES,
REWARD_LEVEL_POOL,
type ExpeditionPersonality,
} from '../data/expedition';
import type { LocalizedText, Player} from '../types';

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

const player = players.find((p) => p.id === playerId);
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

// ============ 战后三选一 ============

export type RewardOption =
| { kind: 'level'; level: number}
| { kind: 'relic'; relicId: string}
| { kind: 'heal'};

function shuffle<T>(arr: T[]): T[] {
const a = [...arr];
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}

/** 某个等级是否能帮玩家凑出联合技 */
export function comboHintFor(level: number, inventory: number[]): LocalizedText | null {
const has = (l: number) => inventory.includes(l) || l === level;
if (has(2) && has(5)) {
return { zh: '✨ 可解锁联合技「双翼」', en: '✨ Unlocks combo [Double Wing]'};
}
if (has(1) && has(2) && has(3)) {
return { zh: '✨ 可解锁联合技「天龙」', en: '✨ Unlocks combo [Sky Dragon]'};
}
return null;
}

export function genRewardOptions(
stageIdx: number,
inventory: number[],
relicIds: string[],
optionCount = 3,
): RewardOption[] {
const stage = EXPEDITION_STAGES[stageIdx];
const pool = (REWARD_LEVEL_POOL[stage?.rewardTier?? 1] as number[]).filter(
(l) =>!inventory.includes(l),
);

const options: RewardOption[] = [];
for (const level of shuffle(pool).slice(0, 2)) {
options.push({ kind: 'level', level});
}

const relicPool = shuffle(EXPEDITION_RELICS.filter((r) =>!relicIds.includes(r.id)));
if (relicPool.length > 0 && options.length < optionCount) {
options.push({ kind: 'relic', relicId: relicPool[0].id});
}
if (options.length < optionCount) {
options.push({ kind: 'heal'});
}
// 实在不够（理论上不会），用治疗凑满
while (options.length < optionCount) {
options.push({ kind: 'heal'});
}
return shuffle(options).slice(0, optionCount);
}
