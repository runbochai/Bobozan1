import type { LocalizedText} from '../types';
import { SKILL_DB } from './skills';

export const EXPEDITION_START_HP = 3;
export const EXPEDITION_MAX_HP = 5;
export const EXPEDITION_VIGOR_HP = 0.5;
export const EXPEDITION_WARMUP_ENERGY = 1;
export const EXPEDITION_MONEYTREE_CAP = 4;
export const EXPEDITION_SKILLCHARM_USES = 5;
export const EXPEDITION_REST_HEAL = 0.5;
export const EXPEDITION_CHALLENGE_HP = 0.5;
export const EXPEDITION_CHALLENGE_GOLD = 4;

// ============ 远征模式：关卡 / 敌人 / 遗物 / 剧情 ============

export interface ExpeditionPersonality {
aggression: number; // 0-1 爱进攻
defense: number; // 0-1 爱防守
charge: number; // 0-1 爱攒气
smart: number; // 0-1 走位聪明程度（记仇/针对）
/** A soft tendency based only on public state and completed turns. */
habit?: 'press' | 'patient' | 'feint';
}

export interface ExpeditionEnemyDef {
id: string;
name: LocalizedText;
hp: number;
inventory: number[]; // 等级 deck
/** Only this encounter adapts its attack to the player's public level. */
levelAdvantage?: number;
/** Reuse an existing portrait and character atlas without changing enemy identity. */
avatarId?: string;
personality: ExpeditionPersonality;
intro: LocalizedText; // 开场白
passive?: {
startEnergy?: number; // 开局能量（Boss 光环）
energyPerTurn?: number; // 每回合开始回复能量
enrageEnergy?: number; // 狂暴：hp <= 一半时每回合能量改为 +enrageEnergy
enrageDmg?: number; // 狂暴：hp <= 一半时伤害 +enrageDmg
armorPerTurn?: number; // 护甲：每回合第一次受到的伤害 -armorPerTurn
attackBonus?: number; // 狂战：攻击伤害 +N
energyDrain?: number; // 吸能：命中时吸取目标 N 点能量
pierce?: boolean; // 穿透：攻击无视对方防御，直接命中
deceiver?: boolean; // 诈唬：意图隐藏时喊打喊杀，可能是真打也可能只是在攒能量
};
elite?: boolean;
boss?: boolean;
}

export interface ExpeditionStage {
id: string;
chapter: LocalizedText;
name: LocalizedText;
enemies: ExpeditionEnemyDef[];
rewardTier: 1 | 2 | 3;
tip?: LocalizedText;
}

const P = (aggression: number, defense: number, charge: number, smart: number, habit?: ExpeditionPersonality['habit']): ExpeditionPersonality =>
({ aggression, defense, charge, smart, ...(habit ? { habit } : {}) });

const expeditionStages: ExpeditionStage[] = [
// ---------- 资格赛 · 灯尾酒馆 ----------
{
id: 's0', chapter: { zh: '资格赛 · 灯尾酒馆', en: 'Qualifier · Emberwick Tavern' },
name: { zh: '第 1 关 · 阿栓的练习桌', en: 'Stage 1 · Axle’s Practice Table' },
rewardTier: 1,
tip: { zh: '攒到能量，抓住对手补气的空当。', en: 'Build Energy, then catch a refill.'},
enemies: [{
id: 'dummy', name: { zh: '阿栓的练习木桩', en: 'Axle’s Practice Dummy' }, hp: 1, inventory: [0],
personality: P(0.1, 0.1, 0.9, 0),
intro: { zh: '灯尾的灯还等着你。先坐下。', en: 'Emberwick is waiting. Take a seat.' },
}],
},
{
id: 's1', chapter: { zh: '资格赛 · 灯尾酒馆', en: 'Qualifier · Emberwick Tavern' },
name: { zh: '第 2 关 · 守住灯火', en: 'Stage 2 · Hold the Light' },
rewardTier: 1,
tip: { zh: '先防住进攻；等它补气时反击。', en: 'Block an attack; counter during a refill.'},
enemies: [{
id: 'coward', name: { zh: '酒馆陪练 · 木木', en: 'Momo · Tavern Sparring Post' }, hp: 1, inventory: [0],
personality: P(0.6, 0.25, 0.5, 0.1),
intro: { zh: '别忙着赢。先保住自己的灯。', en: 'Keep your light before chasing mine.' },
}],
},
{
id: 's2', chapter: { zh: '资格赛 · 灯尾酒馆', en: 'Qualifier · Emberwick Tavern' },
name: { zh: '第 3 关 · 入场资格', en: 'Stage 3 · Earn Your Seat' },
rewardTier: 1,
tip: { zh: '它爱防守。攒够 3 能量，用咔破防。', en: 'It likes Defend. Save 3 Energy for Ka.'},
enemies: [{
id: 'turtle', name: { zh: '龟伯 · 资格考官', en: 'Old Shell · Qualifier' }, hp: 1, inventory: [0],
personality: P(0.2, 0.75, 0.5, 0.1),
intro: { zh: '印是真的。让我看看你怎么出牌。', en: 'The seal is real. Show me how you play.' },
}],
},
// ---------- 赤焰印记 ----------
{
id: 's3', chapter: { zh: '第一枚印记 · 赤铜赛区', en: 'Ember Seal · Copper District' },
name: { zh: '第 4 关 · 与洛牙交手', en: 'Stage 4 · A Rival Named Rook' },
rewardTier: 1,
tip: { zh: '天马只花 1 费；用轰轰或六克可以打平。', en: 'Pegasus costs 1; Double Blast or Six Cuts can tie it.'},
enemies: [{
id: 'slime', avatarId: 'wolf', name: { zh: '洛牙 · 初遇', en: 'Rook · First Meeting' }, hp: 1.5, inventory: [0, 1],
personality: P(0.5, 0.3, 0.5, 0.2),
intro: { zh: '洛牙。我来讨回祖屋，先过这一桌。', en: 'Rook. I want my family’s land back. A match?' },
}],
},
{
id: 's17', chapter: { zh: '第一枚印记 · 赤铜赛区', en: 'Ember Seal · Copper District' },
name: { zh: '第 5 关 · 老将的席位', en: 'Stage 5 · The Veteran’s Seat' },
rewardTier: 1,
tip: { zh: '别硬撞更高等级的普通招；能防、能打平，也能抓攒。', en: 'Do not clash blindly with the stronger skill. Block, tie, or catch a Charge.' },
enemies: [{
id: 'veteran', avatarId: 'knight', name: { zh: '赤铜老将 · 岩盾', en: 'Flint · Ember Veteran' },
hp: 1.5, inventory: [0, 1], levelAdvantage: 1,
personality: P(0.5, 0.3, 0.6, 0.35),
intro: { zh: '我牌比你高，你未必就会输。', en: 'Stronger cards need not decide this.' },
}],
},
{
id: 's4', chapter: { zh: '第一枚印记 · 赤铜赛区', en: 'Ember Seal · Copper District' },
name: { zh: '第 6 关 · 双人混战', en: 'Stage 6 · The Sibling Table' },
rewardTier: 1,
tip: { zh: '留意两人的能量；他们也会互相攻击。', en: 'Watch both Energy bars; they can hit each other.'},
enemies: [
{
id: 'slime_a', name: { zh: '红炉兄长 · 赤', en: 'Red · Furnace Elder' }, hp: 1, inventory: [0],
personality: P(0.45, 0.25, 0.5, 0.2),
intro: { zh: '印记只有一枚。弟弟也别让。', en: 'One seal. No favors, even for family.' },
},
{
id: 'slime_b', name: { zh: '红炉小弟 · 烬', en: 'Ash · Furnace Younger' }, hp: 1, inventory: [0],
personality: P(0.45, 0.25, 0.5, 0.2),
intro: { zh: '谁说我总得听他的？', en: 'Who says I have to listen to him?' },
},
],
},
{
id: 's5', chapter: { zh: '第一枚印记 · 赤铜赛区', en: 'Ember Seal · Copper District' },
name: { zh: '第 7 关 · 余烬守印人', en: 'Stage 7 · Keeper of the Ember Seal' },
rewardTier: 1,
tip: { zh: '攻、防、攒都会出。习惯是线索，不是答案。', en: 'Attack, Defend, or Charge: a habit is a clue, not a promise.'},
enemies: [{
id: 'ironwall', name: { zh: '余烬守印人 · 铁壁', en: 'Ironwall · Ember Keeper' }, hp: 2, inventory: [0, 1],
personality: P(0.55, 0.55, 0.55, 0.3, 'press'), elite: true,
intro: { zh: '赢我，把灯尾的名字留下。', en: 'Beat me. Put Emberwick on the board.' },
}],
},
// ---------- 潮汐印记 ----------
{
id: 's6', chapter: { zh: '第二枚印记 · 潮汐赛区', en: 'Tide Seal · Tidehold' },
name: { zh: '第 8 关 · 洛牙的再挑战', en: 'Stage 8 · Rook’s Rematch' },
rewardTier: 2,
enemies: [{
id: 'wolf', avatarId: 'wolf', name: { zh: '洛牙', en: 'Rook' }, hp: 2, inventory: [0, 1],
personality: P(0.7, 0.2, 0.4, 0.4, 'press'),
intro: { zh: '灯尾来的，又见面了。这次不同。', en: 'Emberwick. Again. This time is different.' },
}],
},
{
id: 's7', chapter: { zh: '第二枚印记 · 潮汐赛区', en: 'Tide Seal · Tidehold' },
name: { zh: '第 9 关 · 潮汐双席', en: 'Stage 9 · The Tide Table' },
rewardTier: 2,
enemies: [
{
id: 'head_a', name: { zh: '潮汐哨兵 · 左潮', en: 'Left Tide · Sentinel' }, hp: 2, inventory: [0, 2],
personality: P(0.75, 0.2, 0.35, 0.5),
intro: { zh: '潮来了，轮到谁站不稳？', en: 'Tide is in. Who loses their footing?' },
},
{
id: 'head_b', name: { zh: '潮汐哨兵 · 右汐', en: 'Right Tide · Sentinel' }, hp: 1.5, inventory: [0],
personality: P(0.4, 0.4, 0.6, 0.3),
intro: { zh: '听他吵。不如看水面。', en: 'Forget his noise. Watch the water.' },
},
],
},
{
id: 's8', chapter: { zh: '第二枚印记 · 潮汐赛区', en: 'Tide Seal · Tidehold' },
name: { zh: '第 10 关 · 潮汐守印人', en: 'Stage 10 · Keeper of the Tide Seal' },
rewardTier: 2,
tip: { zh: '龙爪压过天马；轰轰、六克仍能打平。', en: 'Dragon Claw beats Pegasus; Double Blast and Six Cuts still tie.'},
enemies: [{
id: 'dragon_elder', name: { zh: '潮汐守印人 · 苍鳞', en: 'Old Scale · Tide Keeper' }, hp: 3, inventory: [0, 3],
personality: P(0.75, 0.25, 0.35, 0.7, 'patient'), elite: true,
intro: { zh: '急着出手，就看不见退潮。', en: 'Rush in, and miss the ebb.' },
}],
},
// ---------- 迷雾印记 ----------
{
id: 's9', chapter: { zh: '第三枚印记 · 迷雾赛区', en: 'Mist Seal · Veilmarket' },
name: { zh: '第 11 关 · 雾中来客', en: 'Stage 11 · A Guest in the Mist' },
rewardTier: 3,
enemies: [{
id: 'frost', name: { zh: '雾港术士 · 凝霜', en: 'Rime · Veilmarket Mage' }, hp: 2, inventory: [0, 2],
personality: P(0.55, 0.4, 0.35, 0.6, 'patient'),
intro: { zh: '这枚印记，真值一个家乡？', en: 'A seal. Is it worth your home?' },
}],
},
{
id: 's10', chapter: { zh: '第三枚印记 · 迷雾赛区', en: 'Mist Seal · Veilmarket' },
name: { zh: '第 12 关 · 三个名字', en: 'Stage 12 · Three Names' },
rewardTier: 3,
enemies: [
{
id: 'shadow_a', name: { zh: '雾市长兄 · 影一', en: 'First Shade · Veilmarket' }, hp: 2, inventory: [0, 3],
personality: P(0.75, 0.3, 0.3, 0.7),
intro: { zh: '税单来了，我们的灯就没了。', en: 'The tax bill came. Our lights went.' },
},
{
id: 'shadow_b', name: { zh: '雾市账房 · 影二', en: 'Second Shade · Bookkeeper' }, hp: 1.5, inventory: [0, 2],
personality: P(0.6, 0.35, 0.4, 0.6),
intro: { zh: '税加一笔，灯少一盏。账我记着。', en: 'Another levy. Another lantern gone. I count.' },
},
{
id: 'shadow_c', name: { zh: '雾市小弟 · 影三', en: 'Third Shade · Younger' }, hp: 1.5, inventory: [0, 1],
personality: P(0.45, 0.45, 0.5, 0.5),
intro: { zh: '别问灯去哪儿。哥不让我说。', en: 'Do not ask where. Bro says not to.' },
},
],
},
{
id: 's11', chapter: { zh: '第三枚印记 · 迷雾赛区', en: 'Mist Seal · Veilmarket' },
name: { zh: '第 13 关 · 迷雾守印人', en: 'Stage 13 · Keeper of the Mist Seal' },
rewardTier: 3,
tip: { zh: '同档普通终极比等级；基础叽能与它打平。', en: 'Ordinary Ults compare levels; basic Ji can still tie.'},
enemies: [{
id: 'hangman', name: { zh: '迷雾守印人 · 无面', en: 'Faceless · Mist Keeper' }, hp: 3, inventory: [0, 2, 5],
personality: P(0.65, 0.3, 0.35, 0.8, 'feint'), elite: true,
intro: { zh: '拿齐三印，再看看王冠的背面。', en: 'Three seals. Then look behind it.' },
}],
},
// ---------- 供能塔与王冠决战 ----------
{
id: 's12', chapter: { zh: '暗线 · 王冠供能塔', en: 'Behind the Crown · Supply Towers' },
name: { zh: '第 14 关 · 铜脉供能塔', en: 'Stage 14 · Copper Supply Tower' },
rewardTier: 3,
enemies: [{
id: 'knight', name: { zh: '铜脉塔卫 · 铁骑', en: 'Iron Rider · Copper Warden' }, hp: 2.5, inventory: [0, 5],
personality: P(0.8, 0.2, 0.3, 0.7, 'press'),
intro: { zh: '这座塔，可不只点亮王城。', en: 'This tower lights more than the court.' },
}],
},
{
id: 's13', chapter: { zh: '暗线 · 王冠供能塔', en: 'Behind the Crown · Supply Towers' },
name: { zh: '第 15 关 · 潮涌供能塔', en: 'Stage 15 · Tide Supply Tower' },
rewardTier: 3,
enemies: [
{
id: 'guard_a', name: { zh: '潮汐塔卫 · 左闸', en: 'Left Gate · Tide Warden' }, hp: 2, inventory: [0, 5],
personality: P(0.8, 0.25, 0.25, 0.85, 'press'),
intro: { zh: '断这里，王冠就少一分底气。', en: 'Cut this, and the Crown loses strength.' },
},
{
id: 'guard_b', name: { zh: '潮汐塔卫 · 中枢', en: 'Core Gate · Tide Warden' }, hp: 2, inventory: [0, 3],
personality: P(0.65, 0.35, 0.35, 0.75),
intro: { zh: '王城的灯，不能灭。', en: 'The court lights must stay on.' },
},
{
id: 'guard_c', name: { zh: '潮汐塔卫 · 右闸', en: 'Right Gate · Tide Warden' }, hp: 2, inventory: [0, 2],
personality: P(0.5, 0.5, 0.45, 0.6, 'patient'),
intro: { zh: '关闸的人，会被王冠记住。', en: 'Close it, and the Crown remembers.' },
},
],
},
{
id: 's14', chapter: { zh: '暗线 · 王冠供能塔', en: 'Behind the Crown · Supply Towers' },
name: { zh: '第 16 关 · 迷光供能塔', en: 'Stage 16 · Mist Supply Tower' },
rewardTier: 3,
tip: { zh: '别只信台词；用能量和出牌历史判断。', en: 'Read Energy and history, not just the taunt.' },
enemies: [{
id: 'bluffer', name: { zh: '迷雾塔监 · 千面', en: 'Manyface · Mist Overseer' }, hp: 3.5, inventory: [0, 2, 3, 5],
personality: P(0.5, 0.35, 0.6, 0.55, 'feint'), elite: true,
passive: { deceiver: true },
intro: { zh: '别信账本。也别太信我。', en: 'Trust no ledger. Nor me.' },
}],
},
{
id: 's15', chapter: { zh: '终局 · 王冠竞技场', en: 'Finale · Crown Arena' },
name: { zh: '第 17 关 · 洛牙的最后一桌', en: 'Stage 17 · Rook’s Last Table' },
rewardTier: 3,
tip: { zh: '洛牙会改变节奏。看公开能量和历史，别只信台词。', en: 'Rook changes tempo. Read public Energy and history, not just words.'},
enemies: [{
id: 'lord_bozan', avatarId: 'wolf', name: { zh: '洛牙 · 最后的挑战者', en: 'Rook · Last Challenger' }, hp: 4, inventory: [0, 2, 3, 5],
personality: P(0.7, 0.35, 0.25, 1.0, 'feint'), boss: true,
intro: { zh: '真坐上王位，别变成我们恨的人。', en: 'Take the throne. Do not become him.' },
}],
},
{
id: 's16', chapter: { zh: '终局 · 王冠竞技场', en: 'Finale · Crown Arena' },
name: { zh: '第 18 关 · 让王冠易主', en: 'Stage 18 · A New Ruler' },
rewardTier: 3,
tip: { zh: '未切断的供能塔会增加冠主开局能量和生命；入场前可查看。', en: 'Active supply towers add starting Energy and HP; inspect them before entry.'},
enemies: [{
id: 'tower_soul', avatarId: 'lord_bozan', name: { zh: '老国王 · 奥瑞恩', en: 'Aurion · The Old King' }, hp: 5, inventory: [0, 1, 2, 3, 5],
personality: P(0.55, 0.7, 0.3, 0.9, 'patient'), boss: true,
intro: { zh: '祖法认你的牌。我倒要看看你的本事。', en: 'The law honors your card. Show your worth.' },
}],
},
];

// Keep encounter IDs stable when inserting a lesson; only the visible sequence changes.
export const EXPEDITION_STAGES: ExpeditionStage[] = expeditionStages.map((stage, index) => ({
  ...stage,
  name: {
    zh: stage.name.zh.replace(/^第 \d+ 关/, `第 ${index + 1} 关`),
    en: stage.name.en.replace(/^Stage \d+/, `Stage ${index + 1}`),
  },
}));

// ============ 遗物 ============

export interface RelicDef {
id: string;
name: LocalizedText;
desc: LocalizedText;
rarity: 'common' | 'rare';
icon: string;
}

export const EXPEDITION_RELICS: RelicDef[] = [
{
id: 'ypj', icon: '🛡️', rarity: 'common',
name: { zh: '硬皮甲', en: 'Ironhide'},
desc: { zh: '每场战斗第一次受到伤害时，伤害 -0.5', en: 'First damage taken each battle reduced by 0.5'},
},
{
id: 'rxyd', icon: '🥋', rarity: 'common',
name: { zh: '热身腰带', en: 'Warm-up Belt'},
desc: { zh: '每场战斗第 1 回合 +1 能量', en: '+1 Energy on the first turn of each battle'},
},
{
id: 'fjqt', icon: '🥊', rarity: 'common',
name: { zh: '反击拳套', en: 'Counter Gloves'},
desc: { zh: '你的防守成功抵挡伤害时 +1 能量', en: '+1 Energy when your Defend blocks damage'},
},
{
id: 'zjling', icon: '🗡️', rarity: 'common',
name: { zh: '处决令', en: 'Execution Order'},
desc: { zh: '有敌人被淘汰的回合 +2 能量', en: '+2 Energy on turns an enemy is eliminated'},
},
{
id: 'zstai', icon: '🌿', rarity: 'common',
name: { zh: '再生苔', en: 'Moss of Renewal'},
desc: { zh: '每通过一层 +0.5 血', en: '+0.5 HP after clearing each floor'},
},
{
id: 'jsn', icon: '💉', rarity: 'common',
name: { zh: '肾上腺素', en: 'Adrenaline'},
desc: { zh: '每次受伤时 +2 能量（每场战斗限 1 次）', en: '+2 Energy when you take damage (once per battle)'},
},
{
id: 'mds', icon: '🗿', rarity: 'rare',
name: { zh: '磨刀石', en: 'Whetstone'},
desc: { zh: '每场战斗第一次终极技能后返还 2 能量', en: 'Refund 2 Energy after your first Ultimate each battle'},
},
{
id: 'tbs', icon: '🛡️', rarity: 'rare',
name: { zh: '铁布衫', en: 'Iron Shirt'},
desc: { zh: '每轮远征抵挡一次致命伤害（保留 0.5 血）', en: 'Survive one lethal hit per run (kept at 0.5 HP)'},
},
{
id: 'cbt', icon: '🗺️', rarity: 'rare',
name: { zh: '藏宝图', en: 'Treasure Map'},
desc: { zh: '战后奖励 4 选 1', en: 'Choose 1 of 4 rewards after battle'},
},
];

// ============ 等级奖励展示 ============

const regularSkills = SKILL_DB.filter(card => card.levelRequired > 0 && card.levelRequired < 100 && !card.tags?.includes('combo'));
/** Available content, not an expedition-specific progression cap. */
export const EXPEDITION_SKILL_LEVELS = [...new Set(regularSkills.map(card => card.levelRequired))].sort((a, b) => a - b);
export const EXPEDITION_MAX_LEVEL = Math.max(0, ...EXPEDITION_SKILL_LEVELS);
export const LEVEL_REWARD_INFO: Record<number, LocalizedText> = Object.fromEntries(EXPEDITION_SKILL_LEVELS.map(level => {
  const cards = regularSkills.filter(card => card.levelRequired === level);
  return [level, { zh: `Lv${level} · ${cards.map(card => card.name.zh).join(' / ')}`,
    en: `Lv${level} · ${cards.map(card => card.name.en).join(' / ')}` }];
}));

export const REWARD_LEVEL_POOL: Record<1 | 2 | 3, number[]> = {
1: [1, 2, 3],
2: [2, 3, 5],
3: [3, 4, 5],
};

// Near-level secrets grow with the run. A lone upward/downward attack would be
// unusable before room-wide movement unlocks, so it stays out of random secrets.
export const EXPEDITION_GACHA_POOL: string[] = regularSkills.filter(card =>
  card.type !== 'CHARGE' && !card.tags?.some(tag => tag === 'hit_up' || tag === 'hit_down')
).map(card => card.id);

export function expeditionSecretPool(maxLevel = 0, stageIdx = 0): string[] {
const level = Number.isFinite(maxLevel) ? Math.max(0, Math.min(EXPEDITION_MAX_LEVEL, Math.floor(maxLevel))) : 0;
const stage = Number.isFinite(stageIdx) ? Math.max(0, Math.floor(stageIdx)) : 0;
const highest = Math.min(EXPEDITION_MAX_LEVEL, level + (stage >= 6 ? 2 : 1));
const nearby = EXPEDITION_GACHA_POOL.filter(id => {
  const required = SKILL_DB.find(card => card.id === id)!.levelRequired;
  return required > level && required <= highest;
});
if (nearby.length) return nearby;
// At the end of available content (or a gap containing only layer attacks),
// gear still grants real limited-use cards instead of an undefined card ID.
return EXPEDITION_GACHA_POOL.filter(id => {
  const required = SKILL_DB.find(card => card.id === id)!.levelRequired;
  return required >= Math.max(1, level - 2) && required <= level;
});
}

/** Prefer a new nearby level; at the content end, grant another limited-use tool. */
export function drawGachaCard(maxLevel = 0, stageIdx = 0, rng: () => number = Math.random): { cardId: string; uses: number } {
const pool = expeditionSecretPool(maxLevel, stageIdx);
const cardId = pool[Math.min(pool.length - 1, Math.max(0, Math.floor(rng() * pool.length)))];
const uses = 1 + Math.min(2, Math.max(0, Math.floor(rng() * 3)));
return { cardId, uses };
}

// ============ 远征装备（商城购买，本轮远征永久有效，每件限购 1 件） ============
export interface ExpeditionEquipment {
id: string;
icon: string;
name: LocalizedText;
desc: LocalizedText;
price: number;
}
export const EXPEDITION_EQUIPMENTS: ExpeditionEquipment[] = [
{
id: 'waraxe', icon: '🗡️',
name: { zh: '狂战斧', en: 'War Axe'},
desc: { zh: '你的所有伤害 +0.5', en: '+0.5 to all damage you deal'},
price: 35,
},
{
id: 'bloodsword', icon: '🩸',
name: { zh: '嗜血剑', en: 'Blood Sword'},
desc: { zh: '每次击杀回复 0.5 点血量', en: 'Heal 0.5 HP on each kill'},
price: 25,
},
{
id: 'lifegem', icon: '❤️',
name: { zh: '生命宝石', en: 'Life Gem'},
desc: { zh: '血量上限 +1（最高 5），并回复 1 点', en: '+1 max HP (up to 5), and heal 1'},
price: 20,
},
{
id: 'luckydice', icon: '🎲',
name: { zh: '幸运骰', en: 'Lucky Dice'},
desc: { zh: '每场战斗开局随机抽一张限次卡', en: 'Draw a random limited card at each battle start'},
price: 18,
},
{
id: 'treasurepot', icon: '💰',
name: { zh: '聚宝盆', en: 'Treasure Pot'},
desc: { zh: '每次战斗胜利额外 +4 金币', en: '+4 gold on each victory'},
price: 22,
},
{
id: 'moneytree', icon: '🌱',
name: { zh: '摇钱树', en: 'Money Tree'},
desc: { zh: '每场战斗开始获得当前金币 10%（最少 1，最多 4）', en: 'Gain 10% of your gold at battle start (min 1, max 4)'},
price: 28,
},
{
id: 'doll', icon: '🛡️',
name: { zh: '替身人偶', en: 'Stand-in Doll'},
desc: { zh: '受到致命伤害时保留 0.5 点血（每轮限一次）', en: 'Survive lethal damage with 0.5 HP (once per run)'},
price: 35,
},
{
id: 'levelbadge', icon: '🎖️',
name: { zh: '升级徽章', en: 'Level Badge'},
desc: { zh: '升到下个技能等级；全部解锁后不再出售', en: 'Unlock the next skill level; unavailable once all levels are learned'},
price: 35,
},
{
id: 'skillcharm', icon: '📿',
name: { zh: '技能护符', en: 'Skill Charm'},
desc: { zh: '获得一张附近等级的限次秘技，可用 5 次；仍需支付能量', en: 'Gain 5 uses of a nearby-level skill; normal Energy costs apply'},
price: 24,
},
];
