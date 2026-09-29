// src/data/ultCutins.ts
// 等级必杀和联合技能的像素立绘、喊话与过场特效。
import type { Card, Player } from '../types';

export type UltFx = 'meteor' | 'slash' | 'burst' | 'wave' | 'ice' | 'steam' | 'stars' | 'beam' | 'palm' | 'kick' | 'wings' | 'guard' | 'detonation' | 'poison';
export type ComboCutinId = 'skydragon' | 'doublewing' | 'vajra' | 'allbomb' | 'heartpoison';

export interface UltCutinDef {
  skillId: string;
  /** Transparent pixel character artwork under public/ultcutins. */
  image: string;
  shouts: { zh: string[]; en: string[] };
  fx: UltFx;
  /** 特效主色 */
  fxColor: string;
  combo?: ComboCutinId;
}

const def = (
  skillId: string,
  image: string,
  shoutsZh: string[],
  shoutsEn: string[],
  fx: UltFx,
  fxColor: string,
): UltCutinDef => ({
  skillId,
  image, // 相对路径（public 下），渲染时再经 assetUrl 解析 base path
  shouts: { zh: shoutsZh, en: shoutsEn },
  fx,
  fxColor,
});

export const ULT_CUTINS: Record<string, UltCutinDef> = {
  meteor: def('meteor', 'ultcutins/meteor.webp',
    ['我来助你！', '嘶——！', '天马流星坠！'],
    ["I've got you!", 'Neighhh!', 'Pegasus Meteor Fall!'],
    'meteor', '#fb923c'),
  iceult: def('iceult', 'ultcutins/iceult.webp',
    ['玄天冰剑，封！', '冰封千里！'],
    ['Mystic Ice Sword, seal!', 'Frozen for miles!'],
    'ice', '#7dd3fc'),
  fireclaw: def('fireclaw', 'ultcutins/fireclaw.webp',
    ['火焰龙爪！', '燃起来吧！'],
    ['Flame Dragon Claw!', 'Burn it all!'],
    'slash', '#ef4444'),
  boiler: def('boiler', 'ultcutins/boiler.webp',
    ['锅炉全开！', '蒸汽爆发！'],
    ['Boiler at full blast!', 'Steam eruption!'],
    'steam', '#f59e0b'),
  hangman: def('hangman', 'ultcutins/hangman.webp',
    ['来陪我吧……', '嘻嘻嘻……'],
    ['Come join me...', 'Hee hee hee...'],
    'burst', '#a78bfa'),
  gungod: def('gungod', 'ultcutins/gungod.webp',
    ['穿梭射击！', '一枪定音！'],
    ['Warp shot!', 'One shot decides it!'],
    'beam', '#22d3ee'),
  triplekill: def('triplekill', 'ultcutins/triplekill.webp',
    ['一砍！二砍！三必杀！', '三连斩！'],
    ['One slash! Two slashes! Triple kill!', 'Triple Slash!'],
    'slash', '#f8fafc'),
  triplekick: def('triplekick', 'ultcutins/triplekick.webp',
    ['吃我三连踹！', '连环腿！'],
    ['Take my triple kick!', 'Chain kicks!'],
    'kick', '#fbbf24'),
  pointdiff: def('pointdiff', 'ultcutins/pointdiff.webp',
    ['点差分晓！', '算无遗策！'],
    ['The point gap decides!', 'Every calc precise!'],
    'burst', '#fde68a'),
  threestar: def('threestar', 'ultcutins/threestar.webp',
    ['三星汇聚！', '神龙降临！'],
    ['Three stars converge!', 'Divine dragon descends!'],
    'stars', '#facc15'),
  fiveslap: def('fiveslap', 'ultcutins/fiveslap.webp',
    ['五连拍！', '啪啪啪啪啪！'],
    ['Five slaps!', 'Slap slap slap slap slap!'],
    'palm', '#fb7185'),
  superwave: def('superwave', 'ultcutins/superwave.webp',
    ['超级第一波！', '气功全开！'],
    ['Super First Wave!', 'Full power!'],
    'wave', '#60a5fa'),
  skydragon: { ...def('skydragon', 'ultcutins/fireclaw.webp',
    ['天、冰、火——天龙剑！', '三力合一，斩！'],
    ['Sky, ice and flame—Sky Dragon!', 'Three powers, one blade!'],
    'slash', '#a5f0df'), combo: 'skydragon' },
  doublewing: { ...def('doublewing', 'ultcutins/iceult.webp',
    ['双翼齐飞！', '振翅，冲破云霄！'],
    ['Twin wings, take flight!', 'Rise beyond the clouds!'],
    'wings', '#b8d9ff'), combo: 'doublewing' },
  vajra: { ...def('vajra', 'ultcutins/fiveslap.webp',
    ['三大金刚，合阵！', '金刚之力，破！'],
    ['Three Vajras, unite!', 'Vajra power, break through!'],
    'guard', '#ffe09a'), combo: 'vajra' },
  allbomb: { ...def('allbomb', 'ultcutins/superwave.webp',
    ['轰天！轰地！轰！', '天地齐鸣！'],
    ['Sky blast! Earth blast! BOOM!', 'Let the heavens and earth roar!'],
    'detonation', '#ffbe89'), combo: 'allbomb' },
  heartpoison: { ...def('heartpoison', 'ultcutins/hangman.webp',
    ['诛心毒气，散！', '心之毒雾，绽放！'],
    ['Heart Poison, spread!', 'Bloom, venom of the heart!'],
    'poison', '#d0aae9'), combo: 'heartpoison' },
};

export interface UltCutinPick {
  def: UltCutinDef;
  playerName: string;
  skillName: string;
  level: number;
}

/**
 * 等级终极技的规则分类；联合技仍保留其原有 ATTACK / SPECIAL / ULTIMATE 类型。
 */
export function isLevelUltimate(card: Card): boolean {
  return card.type === 'ULTIMATE' && card.levelRequired >= 1 && card.levelRequired < 100;
}

/** One eligibility check for the overlay, cast delay and both settlement timers. */
export function hasBattleCutin(card: Card): boolean {
  return !!ULT_CUTINS[card.id] && (isLevelUltimate(card) || !!card.tags?.includes('combo'));
}

/**
 * 从本回合出牌中挑出活着的玩家使用的等级必杀及联合技，
 * 按 tier 从高到低排（同 tier 按出场顺序，可多个同屏一起播）。没有则返回空数组。
 */
export function pickUltCutins(players: Player[], skillDb: Card[], lang: 'zh' | 'en'): UltCutinPick[] {
  const picks: (UltCutinPick & { tier: number })[] = [];
  for (const p of players) {
    if (p.isDead || !p.selectedCardId) continue;
    const card = skillDb.find(c => c.id === p.selectedCardId);
    if (!card || !hasBattleCutin(card)) continue;
    const cutin = ULT_CUTINS[card.id];
    if (!cutin) continue;
    picks.push({ def: cutin, playerName: p.name, skillName: card.name[lang], level: card.levelRequired, tier: card.tier });
  }
  return picks
    .sort((a, b) => b.tier - a.tier) // sort 稳定，同 tier 保持出场顺序
    .map(({ def, playerName, skillName, level }) => ({ def, playerName, skillName, level }));
}

/** 随机挑一句喊话 */
export function pickShout(cutinDef: UltCutinDef, lang: 'zh' | 'en'): string {
  const lines = lang === 'zh' ? cutinDef.shouts.zh : cutinDef.shouts.en;
  return lines[Math.floor(Math.random() * lines.length)];
}
