import type { LocalizedText} from '../types';

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
tip: { zh: '点击「攒」获得能量，能量是出牌的燃料', en: 'Click [Charge] to gain Energy — the fuel for every move'},
enemies: [{
id: 'dummy', name: { zh: '🤖 训练假人', en: '🤖 Training Dummy'}, hp: 2, inventory: [0],
personality: P(0.1, 0.1, 0.9, 0),
intro: { zh: '师父：先学会攒气，再谈打架。', en: 'Master: learn to charge before you fight.'},
}],
},
{
id: 's1', chapter: { zh: '序章 · 新手村', en: 'Prologue · Rookie Village'},
name: { zh: '第 2 关 · 胆小鬼', en: 'Stage 2 · Coward'},
rewardTier: 1,
tip: { zh: '敌人要打你了！用「防」挡住伤害', en: 'The enemy is attacking! Block it with [Defend]'},
enemies: [{
id: 'coward', name: { zh: '🪵 胆小木桩', en: '🪵 Cowardly Post'}, hp: 2, inventory: [0],
personality: P(0.35, 0.5, 0.4, 0.1),
intro: { zh: '木桩瑟瑟发抖……但它偶尔也会还手！', en: 'The post trembles… but sometimes it fights back!'},
}],
},
{
id: 's2', chapter: { zh: '序章 · 新手村', en: 'Prologue · Rookie Village'},
name: { zh: '第 3 关 · 龟缩', en: 'Stage 3 · Turtle'},
rewardTier: 1,
tip: { zh: '防守可以被击破！攒 3 费以上用「终极技能」', en: 'Defenses can be broken! Save 3+ Energy for [Ultimate]'},
enemies: [{
id: 'turtle', name: { zh: '🐢 龟缩假人', en: '🐢 Turtling Dummy'}, hp: 2, inventory: [0],
personality: P(0.2, 0.85, 0.4, 0.1),
intro: { zh: '它只会缩着！用终极技能砸开它！', en: 'It only turtles! Smash it open with your Ultimate!'},
}],
},
// ---------- 第一章 · 山脚 ----------
{
id: 's3', chapter: { zh: '第一章 · 山脚', en: 'Ch.1 · Mountain Foot'},
name: { zh: '第 4 关 · 史莱姆', en: 'Stage 4 · Slime'},
rewardTier: 1,
enemies: [{
id: 'slime', name: { zh: '🟢 史莱姆', en: '🟢 Slime'}, hp: 2, inventory: [0],
personality: P(0.4, 0.3, 0.5, 0.2),
intro: { zh: '一只野生的史莱姆跳了出来！', en: 'A wild Slime appeared!'},
}],
},
{
id: 's4', chapter: { zh: '第一章 · 山脚', en: 'Ch.1 · Mountain Foot'},
name: { zh: '第 5 关 · 双子史莱姆', en: 'Stage 5 · Twin Slimes'},
rewardTier: 1,
tip: { zh: '一对二！打倒一个会触发状态重置，趁机喘息', en: 'One vs two! Knocking one out resets everyone — catch your breath'},
enemies: [
{
id: 'slime_a', name: { zh: '🟢 史莱姆兄', en: '🟢 Slime Bro'}, hp: 2, inventory: [0],
personality: P(0.45, 0.25, 0.5, 0.2),
intro: { zh: '我们兄弟同心！', en: 'Brothers fight as one!'},
},
{
id: 'slime_b', name: { zh: '🟢 史莱姆弟', en: '🟢 Slime Sis'}, hp: 2, inventory: [0],
personality: P(0.45, 0.25, 0.5, 0.2),
intro: { zh: '其利断金！', en: 'Together we are strong!'},
},
],
},
{
id: 's5', chapter: { zh: '第一章 · 山脚', en: 'Ch.1 · Mountain Foot'},
name: { zh: '第 6 关 · 精英：铁壁', en: 'Stage 6 · Elite: Iron Wall'},
rewardTier: 1,
enemies: [{
id: 'ironwall', name: { zh: '🦍 铁壁阿强', en: '🦍 Iron Wall Qiang'}, hp: 3, inventory: [0],
personality: P(0.25, 0.85, 0.4, 0.3), elite: true,
intro: { zh: '阿强：我的防守，固若金汤！', en: 'Qiang: my defense is impenetrable!'},
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
id: 'head_a', name: { zh: '👹 左头', en: '👹 Left Head'}, hp: 2, inventory: [0, 1],
personality: P(0.6, 0.25, 0.4, 0.4),
intro: { zh: '左头：我先来！', en: 'Left Head: I go first!'},
},
{
id: 'head_b', name: { zh: '👹 右头', en: '👹 Right Head'}, hp: 2, inventory: [0, 1],
personality: P(0.6, 0.25, 0.4, 0.4),
intro: { zh: '右头：我也来！', en: 'Right Head: me too!'},
},
],
},
{
id: 's8', chapter: { zh: '第二章 · 云雾道馆', en: 'Ch.2 · Mist Dojo'},
name: { zh: '第 9 关 · 精英：龙爪长老', en: 'Stage 9 · Elite: Dragon Elder'},
rewardTier: 2,
tip: { zh: '同类技能对拼，高等级压制低等级——小心他的龙爪！', en: 'In a clash, higher level wins — beware his Dragon Claw!'},
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
id: 'frost', name: { zh: '🧊 寒冰法师', en: '🧊 Frost Mage'}, hp: 3, inventory: [0, 2],
personality: P(0.55, 0.4, 0.35, 0.6),
intro: { zh: '法师：冰剑无情，小心你的走位。', en: 'Mage: the ice sword is merciless. Watch your step.'},
}],
},
{
id: 's10', chapter: { zh: '第三章 · 黑风岭', en: 'Ch.3 · Black Wind Ridge'},
name: { zh: '第 11 关 · 暗影双子', en: 'Stage 11 · Shadow Twins'},
rewardTier: 3,
enemies: [
{
id: 'shadow_a', name: { zh: '🌑 影兄', en: '🌑 Shadow Bro'}, hp: 3, inventory: [0, 2],
personality: P(0.6, 0.35, 0.35, 0.6),
intro: { zh: '影兄：黑风岭可不是好闯的。', en: 'Shadow Bro: this ridge shows no mercy.'},
},
{
id: 'shadow_b', name: { zh: '🌑 影弟', en: '🌑 Shadow Sis'}, hp: 3, inventory: [0, 2],
personality: P(0.6, 0.35, 0.35, 0.6),
intro: { zh: '影弟：一起上！', en: 'Shadow Sis: together!'},
},
],
},
{
id: 's11', chapter: { zh: '第三章 · 黑风岭', en: 'Ch.3 · Black Wind Ridge'},
name: { zh: '第 12 关 · 精英：吊死鬼', en: 'Stage 12 · Elite: Hangman'},
rewardTier: 3,
tip: { zh: '必杀技可以压制常规终极技能，注意他的起手！', en: 'SUPERs beat normal Ults — watch his opener!'},
enemies: [{
id: 'hangman', name: { zh: '👻 吊死鬼', en: '👻 Hangman'}, hp: 4, inventory: [0, 5],
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
id: 'knight', name: { zh: '🐎 马甸骑士', en: '🐎 Madian Knight'}, hp: 3, inventory: [0, 5],
personality: P(0.8, 0.2, 0.3, 0.7),
intro: { zh: '骑士：塔主座下，最后一道防线！', en: 'Knight: the last line before the Tower Lord!'},
}],
},
{
id: 's13', chapter: { zh: '终章 · 塔顶', en: 'Finale · Tower Top'},
name: { zh: '第 14 关 · 塔卫双煞', en: 'Stage 14 · Twin Guards'},
rewardTier: 3,
enemies: [
{
id: 'guard_a', name: { zh: '💂 塔卫·左', en: '💂 Guard Left'}, hp: 3, inventory: [0, 3, 5],
personality: P(0.7, 0.3, 0.3, 0.8),
intro: { zh: '左卫：止步！', en: 'Left Guard: halt!'},
},
{
id: 'guard_b', name: { zh: '💂 塔卫·右', en: '💂 Guard Right'}, hp: 3, inventory: [0, 3, 5],
personality: P(0.7, 0.3, 0.3, 0.8),
intro: { zh: '右卫：塔主不容打扰！', en: 'Right Guard: the Lord must not be disturbed!'},
},
],
},
{
id: 's14', chapter: { zh: '终章 · 塔顶', en: 'Finale · Tower Top'},
name: { zh: '第 15 关 · Boss：塔主波赞', en: 'Stage 15 · Boss: Lord Bozan'},
rewardTier: 3,
tip: { zh: '塔主每回合都会回复能量，且开局能量充沛——速战速决！', en: 'The Lord regenerates Energy every turn — end it fast!'},
enemies: [{
id: 'lord_bozan', name: { zh: '👑 塔主波赞', en: '👑 Lord Bozan'}, hp: 5, inventory: [0, 3, 5],
personality: P(0.7, 0.35, 0.25, 1.0), boss: true,
passive: { startEnergy: 2, energyPerTurn: 1},
intro: { zh: '波赞：能爬到这里，值得我亲自出手。', en: 'Bozan: reaching my tower earns you my personal attention.'},
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
id: 'jqd', icon: '💊', rarity: 'common',
name: { zh: '聚气丹', en: 'Focus Pill'},
desc: { zh: '每回合开始 +1 能量', en: '+1 Energy at the start of every turn'},
},
{
id: 'rxyd', icon: '🥋', rarity: 'common',
name: { zh: '热身腰带', en: 'Warm-up Belt'},
desc: { zh: '每场战斗第 1 回合 +2 能量', en: '+2 Energy on the first turn of each battle'},
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
desc: { zh: '每通过一层 +1 血', en: '+1 HP after clearing each floor'},
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
desc: { zh: '每轮远征抵挡一次致命伤害（保留 1 血）', en: 'Survive one lethal hit per run (kept at 1 HP)'},
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
5: { zh: 'Lv5 · 马甸 / 吊死鬼 / 大飞', en: 'Lv5 · Madian / Hangman / Big Fly'},
8: { zh: 'Lv8 · 头盔攻 / 头盔防', en: 'Lv8 · Helm Atk / Helm Def'},
};

export const REWARD_LEVEL_POOL: Record<1 | 2 | 3, number[]> = {
1: [1, 2, 3],
2: [2, 3, 5],
3: [3, 5, 8],
};
