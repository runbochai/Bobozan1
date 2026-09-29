// src/data/ultCutins.ts
// 必杀技演出（cut-in）数据：每个 ULTIMATE 技能对应一张像素立绘 + 喊话台词 + 特效类型
import type { Card, Player } from '../types';

export type UltFx = 'meteor' | 'slash' | 'burst' | 'wave' | 'ice' | 'steam' | 'stars' | 'beam' | 'palm' | 'kick';

export interface UltCutinDef {
  skillId: string;
  /** Transparent pixel character artwork under public/ultcutins. */
  image: string;
  shouts: { zh: string[]; en: string[] };
  fx: UltFx;
  /** 特效主色 */
  fxColor: string;
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
};

export interface UltCutinPick {
  def: UltCutinDef;
  playerName: string;
  skillName: string;
  level: number;
}

/**
 * 只有“等级终极技”（levelRequired 1–99 的 ULTIMATE）才播必杀演出；
 * 咔叽系（ka/ji/kajifen/kajisuper）与联合技（skydragon/vajra/heartpoison）不播。
 */
export function isLevelUltimate(card: Card): boolean {
  return card.type === 'ULTIMATE' && card.levelRequired >= 1 && card.levelRequired < 100;
}

/**
 * 从本回合出牌中挑出所有要播演出的必杀：只看活着的玩家出的等级终极技，
 * 按 tier 从高到低排（同 tier 按出场顺序，可多个同屏一起播）。没有则返回空数组。
 */
export function pickUltCutins(players: Player[], skillDb: Card[], lang: 'zh' | 'en'): UltCutinPick[] {
  const picks: (UltCutinPick & { tier: number })[] = [];
  for (const p of players) {
    if (p.isDead || !p.selectedCardId) continue;
    const card = skillDb.find(c => c.id === p.selectedCardId);
    if (!card || !isLevelUltimate(card)) continue;
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
