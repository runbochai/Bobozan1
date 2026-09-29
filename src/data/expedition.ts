import type { LocalizedText} from '../types';
import { SKILL_DB } from './skills';

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
tip: { zh: '点击「攒」获得能量，能量是出牌的燃料', en: 'Click [Charge] to gain Energy — the fuel for every move'},
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
tip: { zh: '先储备能量，再看意图用「防」挡住攻击', en: 'Store energy, then read intent and block with [Defend]'},
enemies: [{
id: 'coward', name: { zh: '🪵 胆小木桩', en: '🪵 Cowardly Post'}, hp: 1, inventory: [0],
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
id: 'turtle', name: { zh: '🐢 龟缩假人', en: '🐢 Turtling Dummy'}, hp: 1, inventory: [0],
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
id: 'slime', name: { zh: '🟢 史莱姆', en: '🟢 Slime'}, hp: 1.5, inventory: [0],
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
id: 'slime_a', name: { zh: '🟢 史莱姆兄', en: '🟢 Slime Bro'}, hp: 1.5, inventory: [0],
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
enemies: [{
id: 'ironwall', name: { zh: '🦍 铁壁阿强', en: '🦍 Iron Wall Qiang'}, hp: 3, inventory: [0],
personality: P(0.25, 0.85, 0.4, 0.3), elite: true,
passive: { attackBonus: 0.5 },
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
tip: { zh: '同类技能对拼，高等级压制低等级——小心他的龙爪！', en: 'In a clash, higher level wins — beware his Dragon Claw!'},
enemies: [{
id: 'dragon_elder', name: { zh: '🐉 龙爪长老', en: '🐉 Dragon Elder'}, hp: 3, inventory: [0, 3],
personality: P(0.75, 0.25, 0.35, 0.7), elite: true,
passive: { pierce: true },
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
tip: { zh: '必杀技可以压制常规终极技能，注意他的起手！', en: 'SUPERs beat normal Ults — watch his opener!'},
enemies: [{
id: 'hangman', name: { zh: '👻 吊死鬼', en: '👻 Hangman'}, hp: 3.5, inventory: [0, 5],
personality: P(0.65, 0.3, 0.35, 0.8), elite: true,
passive: { energyDrain: 1 },
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
tip: { zh: '诈唬大师满嘴跑火车：它喊"我要打你"时，可能真要动手，也可能只是在攒能量——别全信，也别全不信', en: 'The Bluff Master is full of lies: when it shouts "I\'m coming for you", it may mean it — or be secretly charging. Trust, but verify' },
enemies: [{
id: 'bluffer', name: { zh: '🎭 诈唬大师', en: '🎭 Bluff Master'}, hp: 3.5, inventory: [0, 3, 5, 7],
personality: P(0.5, 0.35, 0.6, 0.55), elite: true,
passive: { deceiver: true },
intro: { zh: '诈唬大师：我的话，你敢信吗？', en: 'Bluff Master: dare you believe a word I say?'},
}],
},
{
id: 's15', chapter: { zh: '终章 · 塔顶', en: 'Finale · Tower Top'},
name: { zh: '第 16 关 · Boss：塔主波赞', en: 'Stage 16 · Boss: Lord Bozan'},
rewardTier: 3,
tip: { zh: '塔主 4 血、每回合护甲 0.5 点，半血狂暴（能量+2、伤害+0.5），还会锐吸/奥吸收你的技能——速战速决！', en: 'Lord: 4 HP, 0.5 armor/turn, enrages at half HP, absorbs skills — end it fast!'},
enemies: [{
id: 'lord_bozan', name: { zh: '👑 塔主波赞', en: '👑 Lord Bozan'}, hp: 4, inventory: [0, 3, 5, 6, 12],
personality: P(0.7, 0.35, 0.25, 1.0), boss: true,
passive: { startEnergy: 2, energyPerTurn: 1, enrageEnergy: 2, enrageDmg: 0.5, armorPerTurn: 0.5},
intro: { zh: '波赞：能爬到这里，值得我亲自出手。半血之后，你会后悔的。', en: 'Bozan: reaching my tower earns you my personal attention. You will regret it once I enrage.'},
}],
},
{
id: 's16', chapter: { zh: '终章 · 塔心', en: 'Finale · Tower Heart'},
name: { zh: '第 17 关 · Boss：远古塔魂', en: 'Stage 17 · Boss: Ancient Tower Soul'},
rewardTier: 3,
tip: { zh: '塔魂披挂头盔/手盔/脚盔攻防，每回合护甲 0.5 点、能量 +1，攻击无视防御——它即是塔本身！', en: 'The Soul wields helm/hand/foot arms, 0.5 armor & +1 energy per turn, attacks pierce defense — it IS the tower!'},
enemies: [{
id: 'tower_soul', name: { zh: '🌑 远古塔魂', en: '🌑 Ancient Tower Soul'}, hp: 5, inventory: [0, 8, 10, 11],
personality: P(0.55, 0.7, 0.3, 0.9), boss: true,
passive: { startEnergy: 1, energyPerTurn: 1, armorPerTurn: 0.5, pierce: true },
intro: { zh: '塔魂：波赞只是守门人。我，即是塔。', en: 'Soul: Bozan was merely the gatekeeper. I am the tower.'},
}],
},
];

// ============ 前三关战斗内教学 ============
export interface ExpeditionTutorialStep {
text: LocalizedText;
highlight?: string; // A concrete card ID; reading steps do not consume a turn.
success?: LocalizedText;
}
export const EXPEDITION_LESSONS: Record<string, { title: LocalizedText; summary: LocalizedText }> = {
s0: {
title: { zh: '攒气与进攻', en: 'Charge & attack' },
summary: { zh: '攒一次获得 2 能量；「轰」消耗 1 能量。敌人攒气时，是进攻的好机会。', en: 'Charge gives 2 Energy; Blast costs 1. A charging enemy is open to attack.' },
},
s1: {
title: { zh: '看意图，学防守', en: 'Read & defend' },
summary: { zh: '先看敌人的意图。基础「防」不耗能量，能挡住「轰」，但挡不住所有招式。', en: 'Read the enemy intent first. Defend costs no Energy and blocks Blast, but not every move.' },
},
s2: {
title: { zh: '积攒能量，突破防守', en: 'Save & break through' },
summary: { zh: '「咔」消耗 3 能量，可以突破基础「防」。接下来的敌人不一定会亮出真实意图，留意自己的能量与血量。', en: 'Ka costs 3 Energy and pierces basic Defend. Later enemies may hide their intent; keep watching your Energy and HP.' },
},
};
export const EXPEDITION_TUTORIALS: Record<string, ExpeditionTutorialStep[]> = {
s0: [
{ text: { zh: '先点黄色「攒」，获得 2 能量。点击它会直接出招，双方的招式在同一回合结算。', en: 'Tap yellow Charge to gain 2 Energy. It plays immediately; both sides resolve their moves together.' }, highlight: 'charge', success: { zh: '攒气成功，能量 +2。现在可以进攻了。', en: 'Charged: +2 Energy. You are ready to attack.' } },
{ text: { zh: '打开红色「攻击」，再点「轰」（1 能量）。训练假人正在攒气，这次攻击可以击败它。', en: 'Open red Attack, then play Blast (1 Energy). The charging training dummy is vulnerable; this hit will defeat it.' }, highlight: 'hong', success: { zh: '击败训练假人！你学会了先攒气，再进攻。', en: 'Dummy defeated! Charge first, then attack.' } },
],
s1: [
{ text: { zh: '敌人旁边的气泡会显示本回合意图，下面也有提示。前三关的意图都是真实的；先看，再出招。', en: 'The enemy bubble shows its intent, also repeated below. Intent is truthful in the first three stages. Read it before choosing a move.' } },
{ text: { zh: '敌人本回合也会攒气。点「攒」，为之后的进攻储备能量。', en: 'The enemy will Charge this turn too. Play Charge to save energy for your attack.' }, highlight: 'charge', success: { zh: '能量已储备。注意：敌人下一招变成了「轰」。', en: 'Energy stored. Watch out: the enemy now intends to use Blast.' } },
{ text: { zh: '敌人要用「轰」！打开蓝色「防守」，点「防」。基础防守不消耗能量。', en: 'The enemy is using Blast! Open blue Defend and play Defend. Basic defense costs no Energy.' }, highlight: 'defend', success: { zh: '成功挡住「轰」，没有受伤，也没有消耗能量。', en: 'Blast blocked: no HP lost and no Energy spent.' } },
{ text: { zh: '敌人又开始攒气了。打开「攻击」，用「轰」抓住这个空当。', en: 'The enemy is charging again. Open Attack and use Blast to take this opening.' }, highlight: 'hong', success: { zh: '反击成功！看清意图，就能选择合适的应对。', en: 'Counterattack successful! Match your response to the enemy intent.' } },
],
s2: [
{ text: { zh: '这个假人会一直用基础「防」，挡住「轰」。这次练习用「咔」突破它的防守。', en: 'This dummy keeps using basic Defend, which blocks Blast. Practise breaking through with Ka.' } },
{ text: { zh: '「咔」需要 3 能量。先点「攒」，每次获得 2 能量。', en: 'Ka costs 3 Energy. Start with Charge, which gives 2 Energy each time.' }, highlight: 'charge', success: { zh: '第一轮攒气完成，继续为破防招式储备能量。', en: 'First Charge complete. Keep saving for your breakthrough.' } },
{ text: { zh: '再点一次「攒」，为「咔」备足能量。', en: 'Play Charge once more to build up enough Energy for Ka.' }, highlight: 'charge', success: { zh: '能量已充足！现在用「咔」突破基础防守。', en: 'Enough Energy! Use Ka to pierce basic defense.' } },
{ text: { zh: '打开紫色「终极」，点「咔」（3 能量），突破基础「防」。', en: 'Open purple Ultimate, then play Ka (3 Energy) to pierce basic Defend.' }, highlight: 'ka', success: { zh: '破防成功！三课完成，准备开始正式冒险。', en: 'Defense broken! Three lessons complete. Your adventure begins.' } },
],
};

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
5: { zh: 'Lv5 · 马甸 / 吊死鬼 / 大飞', en: 'Lv5 · Madian / Hangman / Big Fly'},
8: { zh: 'Lv8 · 头盔攻 / 头盔防', en: 'Lv8 · Helm Atk / Helm Def'},
};

export const REWARD_LEVEL_POOL: Record<1 | 2 | 3, number[]> = {
1: [1, 2, 3],
2: [2, 3, 5],
3: [3, 5, 8],
};

// 限次秘技卡池：从全部技能里随机抽（进攻 / 防守 / 特殊都有），类似复仇模式抽卡。
// 排除 0 级基础牌（抽出来没意思）、攒气牌和系统保留牌（100 级）。
export const EXPEDITION_GACHA_POOL: string[] = SKILL_DB.filter(
(c) => c.levelRequired >= 1 && c.levelRequired < 100 && c.type !== 'CHARGE'
).map((c) => c.id);

/** 抽一张限次秘技：返回卡 id 与使用次数（1-3 次） */
export function drawGachaCard(): { cardId: string; uses: number } {
const cardId = EXPEDITION_GACHA_POOL[Math.floor(Math.random() * EXPEDITION_GACHA_POOL.length)];
const uses = 1 + Math.floor(Math.random() * 3);
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
price: 30,
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
desc: { zh: '血量上限 +1（并回复 1 点）', en: '+1 max HP (and heal 1)'},
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
desc: { zh: '每场战斗开始时，获得当前金币 10%（至少 1）', en: 'Gain 10% of your gold (min 1) at each battle start'},
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
desc: { zh: '永久升 1 级（上限 5 级）', en: 'Permanently gain 1 level (max Lv.5)'},
price: 35,
},
{
id: 'skillcharm', icon: '📿',
name: { zh: '技能护符', en: 'Skill Charm'},
desc: { zh: '随机一张卡变为本轮永久可用', en: 'A random card becomes permanently usable this run'},
price: 40,
},
];
