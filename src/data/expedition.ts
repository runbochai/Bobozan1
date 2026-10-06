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
}

export interface ExpeditionEnemyDef {
id: string;
name: LocalizedText;
hp: number;
inventory: number[]; // 等级 deck
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

const P = (aggression: number, defense: number, charge: number, smart: number): ExpeditionPersonality =>
({ aggression, defense, charge, smart});

export const EXPEDITION_STAGES: ExpeditionStage[] = [
// ---------- 序章 · 新手村 ----------
{
id: 's0', chapter: { zh: '序章 · 新手村', en: 'Prologue · Rookie Village'},
name: { zh: '第 1 关 · 木桩', en: 'Stage 1 · Dummy'},
rewardTier: 1,
tip: { zh: '攒到能量，抓住对手补气的空当。', en: 'Build Energy, then catch a refill.'},
enemies: [{
id: 'dummy', name: { zh: '🤖 训练假人', en: '🤖 Training Dummy'}, hp: 1, inventory: [0],
personality: P(0.1, 0.1, 0.9, 0),
intro: { zh: '师父：先学会攒气，再谈打架。', en: 'Master: learn to charge before you fight.'},
}],
},
{
id: 's1', chapter: { zh: '序章 · 新手村', en: 'Prologue · Rookie Village'},
name: { zh: '第 2 关 · 胆小鬼', en: 'Stage 2 · Coward'},
rewardTier: 1,
tip: { zh: '先防住进攻；等它补气时反击。', en: 'Block an attack; counter during a refill.'},
enemies: [{
id: 'coward', name: { zh: '🪵 胆小木桩', en: '🪵 Cowardly Post'}, hp: 1, inventory: [0],
personality: P(0.6, 0.25, 0.5, 0.1),
intro: { zh: '木桩瑟瑟发抖……但它偶尔也会还手！', en: 'The post trembles… but sometimes it fights back!'},
}],
},
{
id: 's2', chapter: { zh: '序章 · 新手村', en: 'Prologue · Rookie Village'},
name: { zh: '第 3 关 · 龟缩', en: 'Stage 3 · Turtle'},
rewardTier: 1,
tip: { zh: '它爱防守。攒够 3 能量，用咔破防。', en: 'It likes Defend. Save 3 Energy for Ka.'},
enemies: [{
id: 'turtle', name: { zh: '🐢 龟缩假人', en: '🐢 Turtling Dummy'}, hp: 1, inventory: [0],
personality: P(0.2, 0.75, 0.5, 0.1),
intro: { zh: '它经常防守，也会变招。', en: 'It often Defends, but can change its mind.'},
}],
},
// ---------- 第一章 · 山脚 ----------
{
id: 's3', chapter: { zh: '第一章 · 山脚', en: 'Ch.1 · Mountain Foot'},
name: { zh: '第 4 关 · 史莱姆', en: 'Stage 4 · Slime'},
rewardTier: 1,
tip: { zh: '天马只花 1 费；用轰轰或六克可以打平。', en: 'Pegasus costs 1; Double Blast or Six Cuts can tie it.'},
enemies: [{
id: 'slime', name: { zh: '🟢 史莱姆', en: '🟢 Slime'}, hp: 1.5, inventory: [0, 1],
personality: P(0.5, 0.3, 0.5, 0.2),
intro: { zh: '一只野生的史莱姆跳了出来！', en: 'A wild Slime appeared!'},
}],
},
{
id: 's4', chapter: { zh: '第一章 · 山脚', en: 'Ch.1 · Mountain Foot'},
name: { zh: '第 5 关 · 双子史莱姆', en: 'Stage 5 · Twin Slimes'},
rewardTier: 1,
tip: { zh: '留意两人的能量；他们也会互相攻击。', en: 'Watch both Energy bars; they can hit each other.'},
enemies: [
{
id: 'slime_a', name: { zh: '🟢 史莱姆兄', en: '🟢 Slime Bro'}, hp: 1, inventory: [0],
personality: P(0.45, 0.25, 0.5, 0.2),
intro: { zh: '我们兄弟同心！', en: 'Brothers fight as one!'},
},
{
id: 'slime_b', name: { zh: '🟢 史莱姆弟', en: '🟢 Slime Sis'}, hp: 1, inventory: [0],
personality: P(0.45, 0.25, 0.5, 0.2),
intro: { zh: '其利断金！', en: 'Together we are strong!'},
},
],
},
{
id: 's5', chapter: { zh: '第一章 · 山脚', en: 'Ch.1 · Mountain Foot'},
name: { zh: '第 6 关 · 精英：铁壁', en: 'Stage 6 · Elite: Iron Wall'},
rewardTier: 1,
tip: { zh: '攻、防、攒都会出。习惯是线索，不是答案。', en: 'Attack, Defend, or Charge: a habit is a clue, not a promise.'},
enemies: [{
id: 'ironwall', name: { zh: '🦍 铁壁阿强', en: '🦍 Iron Wall Qiang'}, hp: 2, inventory: [0, 1],
personality: P(0.55, 0.55, 0.55, 0.3), elite: true,
intro: { zh: '阿强：猜猜我这次会不会防。', en: 'Qiang: will I Defend this time?'},
}],
},
// ---------- 第二章 · 云雾道馆 ----------
{
id: 's6', chapter: { zh: '第二章 · 云雾道馆', en: 'Ch.2 · Mist Dojo'},
name: { zh: '第 7 关 · 疾风狼', en: 'Stage 7 · Gale Wolf'},
rewardTier: 2,
enemies: [{
id: 'wolf', name: { zh: '🐺 疾风狼', en: '🐺 Gale Wolf'}, hp: 2, inventory: [0, 1],
personality: P(0.7, 0.2, 0.4, 0.4),
intro: { zh: '疾风狼露出了天马般的獠牙……', en: 'The wolf bares its Pegasus fangs…'},
}],
},
{
id: 's7', chapter: { zh: '第二章 · 云雾道馆', en: 'Ch.2 · Mist Dojo'},
name: { zh: '第 8 关 · 双头怪', en: 'Stage 8 · Two Heads'},
rewardTier: 2,
enemies: [
{
id: 'head_a', name: { zh: '👹 左头', en: '👹 Left Head'}, hp: 2, inventory: [0, 2],
personality: P(0.75, 0.2, 0.35, 0.5),
intro: { zh: '左头：我先来！', en: 'Left Head: I go first!'},
},
{
id: 'head_b', name: { zh: '👹 右头', en: '👹 Right Head'}, hp: 1.5, inventory: [0],
personality: P(0.4, 0.4, 0.6, 0.3),
intro: { zh: '右头：我也来！', en: 'Right Head: me too!'},
},
],
},
{
id: 's8', chapter: { zh: '第二章 · 云雾道馆', en: 'Ch.2 · Mist Dojo'},
name: { zh: '第 9 关 · 精英：龙爪长老', en: 'Stage 9 · Elite: Dragon Elder'},
rewardTier: 2,
tip: { zh: '龙爪压过天马；轰轰、六克仍能打平。', en: 'Dragon Claw beats Pegasus; Double Blast and Six Cuts still tie.'},
enemies: [{
id: 'dragon_elder', name: { zh: '🐉 龙爪长老', en: '🐉 Dragon Elder'}, hp: 3, inventory: [0, 3],
personality: P(0.75, 0.25, 0.35, 0.7), elite: true,
intro: { zh: '长老：感受龙爪的等级压制吧！', en: 'Elder: feel the pressure of the Dragon Claw!'},
}],
},
// ---------- 第三章 · 黑风岭 ----------
{
id: 's9', chapter: { zh: '第三章 · 黑风岭', en: 'Ch.3 · Black Wind Ridge'},
name: { zh: '第 10 关 · 寒冰法师', en: 'Stage 10 · Frost Mage'},
rewardTier: 3,
enemies: [{
id: 'frost', name: { zh: '🧊 寒冰法师', en: '🧊 Frost Mage'}, hp: 2, inventory: [0, 2],
personality: P(0.55, 0.4, 0.35, 0.6),
intro: { zh: '法师：冰剑无情，小心你的走位。', en: 'Mage: the ice sword is merciless. Watch your step.'},
}],
},
{
id: 's10', chapter: { zh: '第三章 · 黑风岭', en: 'Ch.3 · Black Wind Ridge'},
name: { zh: '第 11 关 · 暗影三煞', en: 'Stage 11 · Shadow Trio'},
rewardTier: 3,
enemies: [
{
id: 'shadow_a', name: { zh: '🌑 影兄', en: '🌑 Shadow Bro'}, hp: 2, inventory: [0, 3],
personality: P(0.75, 0.3, 0.3, 0.7),
intro: { zh: '影兄：黑风岭可不是好闯的。', en: 'Shadow Bro: this ridge shows no mercy.'},
},
{
id: 'shadow_b', name: { zh: '🌑 影中', en: '🌑 Shadow Mid'}, hp: 1.5, inventory: [0, 2],
personality: P(0.6, 0.35, 0.4, 0.6),
intro: { zh: '影中：三打一，优势在我！', en: 'Shadow Mid: three on one!'},
},
{
id: 'shadow_c', name: { zh: '🌑 影弟', en: '🌑 Shadow Lil'}, hp: 1.5, inventory: [0, 1],
personality: P(0.45, 0.45, 0.5, 0.5),
intro: { zh: '影弟：一起上！', en: 'Shadow Lil: together!'},
},
],
},
{
id: 's11', chapter: { zh: '第三章 · 黑风岭', en: 'Ch.3 · Black Wind Ridge'},
name: { zh: '第 12 关 · 精英：吊死鬼', en: 'Stage 12 · Elite: Hangman'},
rewardTier: 3,
tip: { zh: '同档普通终极比等级；基础叽能与它打平。', en: 'Ordinary Ults compare levels; basic Ji can still tie.'},
enemies: [{
id: 'hangman', name: { zh: '👻 吊死鬼', en: '👻 Hangman'}, hp: 3, inventory: [0, 2, 5],
personality: P(0.65, 0.3, 0.35, 0.8), elite: true,
intro: { zh: '吊死鬼：终极？我的更终极。', en: 'Hangman: ultimate? Mine is more ultimate.'},
}],
},
// ---------- 终章 · 塔顶 ----------
{
id: 's12', chapter: { zh: '终章 · 塔顶', en: 'Finale · Tower Top'},
name: { zh: '第 13 关 · 马甸骑士', en: 'Stage 13 · Madian Knight'},
rewardTier: 3,
enemies: [{
id: 'knight', name: { zh: '🐎 马甸骑士', en: '🐎 Madian Knight'}, hp: 2.5, inventory: [0, 5],
personality: P(0.8, 0.2, 0.3, 0.7),
intro: { zh: '骑士：塔主座下，最后一道防线！', en: 'Knight: the last line before the Tower Lord!'},
}],
},
{
id: 's13', chapter: { zh: '终章 · 塔顶', en: 'Finale · Tower Top'},
name: { zh: '第 14 关 · 塔卫三煞', en: 'Stage 14 · Triple Guards'},
rewardTier: 3,
enemies: [
{
id: 'guard_a', name: { zh: '💂 塔卫·左', en: '💂 Guard Left'}, hp: 2, inventory: [0, 5],
personality: P(0.8, 0.25, 0.25, 0.85),
intro: { zh: '左卫：止步！', en: 'Left Guard: halt!'},
},
{
id: 'guard_b', name: { zh: '💂 塔卫·中', en: '💂 Guard Mid'}, hp: 2, inventory: [0, 3],
personality: P(0.65, 0.35, 0.35, 0.75),
intro: { zh: '中卫：擅闯者死！', en: 'Mid Guard: trespassers die!'},
},
{
id: 'guard_c', name: { zh: '💂 塔卫·右', en: '💂 Guard Right'}, hp: 2, inventory: [0, 2],
personality: P(0.5, 0.5, 0.45, 0.6),
intro: { zh: '右卫：塔主不容打扰！', en: 'Right Guard: the Lord must not be disturbed!'},
},
],
},
{
id: 's14', chapter: { zh: '终章 · 塔顶', en: 'Finale · Tower Top'},
name: { zh: '第 15 关 · 精英：诈唬大师', en: 'Stage 15 · Elite: Bluff Master'},
rewardTier: 3,
tip: { zh: '别只信台词；用能量和出牌历史判断。', en: 'Read Energy and history, not just the taunt.' },
enemies: [{
id: 'bluffer', name: { zh: '🎭 诈唬大师', en: '🎭 Bluff Master'}, hp: 3.5, inventory: [0, 2, 3, 5],
personality: P(0.5, 0.35, 0.6, 0.55), elite: true,
passive: { deceiver: true },
intro: { zh: '诈唬大师：我的话，你敢信吗？', en: 'Bluff Master: dare you believe a word I say?'},
}],
},
{
id: 's15', chapter: { zh: '终章 · 塔顶', en: 'Finale · Tower Top'},
name: { zh: '第 16 关 · Boss：塔主波赞', en: 'Stage 16 · Boss: Lord Bozan'},
rewardTier: 3,
tip: { zh: '塔主也要攒气。防攻击，抓补气，别白交终极。', en: 'The Lord must Charge too. Block attacks, catch refills, time your Ult.'},
enemies: [{
id: 'lord_bozan', name: { zh: '👑 塔主波赞', en: '👑 Lord Bozan'}, hp: 4, inventory: [0, 2, 3, 5],
personality: P(0.7, 0.35, 0.25, 1.0), boss: true,
intro: { zh: '波赞：同样的规则，看谁猜得准。', en: 'Bozan: same rules. Let us see who reads better.'},
}],
},
{
id: 's16', chapter: { zh: '终章 · 塔心', en: 'Finale · Tower Heart'},
name: { zh: '第 17 关 · Boss：远古塔魂', en: 'Stage 17 · Boss: Ancient Tower Soul'},
rewardTier: 3,
tip: { zh: '最后一战：看能量、读习惯，联合技也能被反制。', en: 'Final table: read Energy and habits. Combos have counters too.'},
enemies: [{
id: 'tower_soul', name: { zh: '🌑 远古塔魂', en: '🌑 Ancient Tower Soul'}, hp: 5, inventory: [0, 1, 2, 3, 5],
personality: P(0.55, 0.7, 0.3, 0.9), boss: true,
intro: { zh: '塔魂：波赞只是守门人。我，即是塔。', en: 'Soul: Bozan was merely the gatekeeper. I am the tower.'},
}],
},
];

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

export const LEVEL_REWARD_INFO: Record<number, LocalizedText> = {
1: { zh: 'Lv1 · 天马 / 流星坠', en: 'Lv1 · Pegasus / Meteor'},
2: { zh: 'Lv2 · 冰剑 / 小飞 / 玄天冰剑', en: 'Lv2 · Ice Sword / Small Fly / Mystic Ice'},
3: { zh: 'Lv3 · 龙爪 / 火焰龙爪 / 龙爪防', en: 'Lv3 · Dragon Claw / Fire Claw / Claw Def'},
4: { zh: 'Lv4 · 热奶 / 热锅炉', en: 'Lv4 · Hot Milk / Boiler'},
5: { zh: 'Lv5 · 马甸 / 吊死鬼 / 大飞', en: 'Lv5 · Madian / Hangman / Big Fly'},
8: { zh: 'Lv8 · 头盔攻 / 头盔防', en: 'Lv8 · Helm Atk / Helm Def'},
};

export const REWARD_LEVEL_POOL: Record<1 | 2 | 3, number[]> = {
1: [1, 2, 3],
2: [2, 3, 5],
3: [3, 4, 5],
};

// Secrets stay close to the run's level. Levels 6–7 add late-run absorption and
// partial penetration, without inaccessible layer attacks or Lv.23 shortcuts.
export const EXPEDITION_GACHA_POOL: string[] = SKILL_DB.filter(
(c) => c.levelRequired >= 1 && c.levelRequired <= 7 && c.type !== 'CHARGE'
).map((c) => c.id);

export function expeditionSecretPool(maxLevel = 0, stageIdx = 0): string[] {
const level = Number.isFinite(maxLevel) ? Math.max(0, Math.min(5, Math.floor(maxLevel))) : 0;
const stage = Number.isFinite(stageIdx) ? Math.max(0, Math.floor(stageIdx)) : 0;
const highest = Math.min(7, level + (stage >= 6 ? 2 : 1));
return EXPEDITION_GACHA_POOL.filter(id => {
  const required = SKILL_DB.find(card => card.id === id)!.levelRequired;
  return required > level && required <= highest;
});
}

/** Draw a new nearby-level secret, never a copy of the run's existing levels. */
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
desc: { zh: '本轮升 1 级（上限 5 级）', en: 'Gain 1 level for this run (max Lv.5)'},
price: 35,
},
{
id: 'skillcharm', icon: '📿',
name: { zh: '技能护符', en: 'Skill Charm'},
desc: { zh: '获得一张附近等级的未学秘技，可用 5 次；仍需支付能量', en: 'Gain 5 uses of an unlearned nearby-level skill; normal Energy costs apply'},
price: 24,
},
];
