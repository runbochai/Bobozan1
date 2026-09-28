import { SKILL_DB} from '../data/skills';
import {
EXPEDITION_RELICS,
EXPEDITION_TEMP_SKILLS,
type ExpeditionPersonality,
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

// 多方混战：盯威胁最大的活着的对手（能量最高者），不再只盯玩家
const opponents = players.filter((p) => p.id !== enemy.id &&!p.isDead);
const threat =
opponents.length > 0
? [...opponents].sort((a, b) => b.energy - a.energy || (b.hp ?? 0) - (a.hp ?? 0))[0]
: players.find((p) => p.id === playerId);
const player = threat;
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

// ============ 战后奖励：治疗 / 血量上限 / 限次秘技 / 遗物 / 蓄势 ============

export type RewardOption =
| { kind: 'heal'; amount: number}
| { kind: 'maxhp'}
| { kind: 'temp'; cardId: string; uses: number}
| { kind: 'relic'; relicId: string}
| { kind: 'burst'};

function shuffle<T>(arr: T[]): T[] {
const a = [...arr];
for (let i = a.length - 1; i > 0; i--) {
const j = Math.floor(Math.random() * (i + 1));
[a[i], a[j]] = [a[j], a[i]];
}
return a;
}

export function genRewardOptions(
stageIdx: number,
hp: number,
maxHp: number,
relicIds: string[],
optionCount = 3,
): RewardOption[] {
const rest: RewardOption[] = [];
// 体魄：血量上限 +1（当前血量也 +1）
rest.push({ kind: 'maxhp'});
// 秘技：按进度解锁的限次高阶卡
const tempPool = EXPEDITION_TEMP_SKILLS.filter((t) => stageIdx >= t.minStage);
if (tempPool.length > 0) {
const t = tempPool[Math.floor(Math.random() * tempPool.length)];
const uses = t.uses[0] + Math.floor(Math.random() * (t.uses[1] - t.uses[0] + 1));
rest.push({ kind: 'temp', cardId: t.id, uses});
}
// 遗物：还有没拿到的才出现
const relicPool = shuffle(EXPEDITION_RELICS.filter((r) =>!relicIds.includes(r.id)));
if (relicPool.length > 0) rest.push({ kind: 'relic', relicId: relicPool[0].id});
// 蓄势：下一关开局 +2 能量（一次性）
rest.push({ kind: 'burst'});
// 受伤时治疗必出，其余随机
const injured = hp < maxHp;
const options = shuffle(rest).slice(0, Math.max(0, optionCount - (injured ? 1 : 0)));
if (injured) options.push({ kind: 'heal', amount: 2});
return shuffle(options);
}

// ============ 遗物：硬皮甲（每场战斗首次受伤 -1） ============

export function applyIronhide(
hpBefore: number,
hpAfter: number,
maxHp: number,
alreadyUsed: boolean,
): { hp: number; triggered: boolean} {
if (!alreadyUsed && hpAfter < hpBefore) {
return { hp: Math.min(maxHp, hpAfter + 1), triggered: true};
}
return { hp: hpAfter, triggered: alreadyUsed};
}
