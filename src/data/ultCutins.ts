// src/data/ultCutins.ts
// 必杀技演出（cut-in）数据：每个 ULTIMATE 技能对应一张像素立绘 + 喊话台词 + 特效类型
import type { Card, Player } from '../types';

export type UltFx = 'meteor' | 'slash' | 'burst' | 'wave';

export interface UltCutinDef {
  skillId: string;
  /** public/ultcutins 下的图片（hangman 复用敌人头像） */
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
    'burst', '#7dd3fc'),
  fireclaw: def('fireclaw', 'avatars/enemies/dragon_elder.webp',
    ['火焰龙爪！', '燃起来吧！'],
    ['Flame Dragon Claw!', 'Burn it all!'],
    'burst', '#ef4444'),
  boiler: def('boiler', 'ultcutins/boiler.webp',
    ['锅炉全开！', '蒸汽爆发！'],
    ['Boiler at full blast!', 'Steam eruption!'],
    'burst', '#f59e0b'),
  hangman: def('hangman', 'avatars/enemies/hangman.webp',
    ['来陪我吧……', '嘻嘻嘻……'],
    ['Come join me...', 'Hee hee hee...'],
    'burst', '#a78bfa'),
  gungod: def('gungod', 'ultcutins/gungod.webp',
    ['穿梭射击！', '一枪定音！'],
    ['Warp shot!', 'One shot decides it!'],
    'burst', '#22d3ee'),
  triplekill: def('triplekill', 'ultcutins/triplekill.webp',
    ['一砍！二砍！三必杀！', '三连斩！'],
    ['One slash! Two slashes! Triple kill!', 'Triple Slash!'],
    'slash', '#f8fafc'),
  triplekick: def('triplekick', 'ultcutins/triplekick.webp',
    ['吃我三连踹！', '连环腿！'],
    ['Take my triple kick!', 'Chain kicks!'],
    'slash', '#fbbf24'),
  pointdiff: def('pointdiff', 'ultcutins/pointdiff.webp',
    ['点差分晓！', '算无遗策！'],
    ['The point gap decides!', 'Every calc precise!'],
    'burst', '#fde68a'),
  threestar: def('threestar', 'ultcutins/threestar.webp',
    ['三星汇聚！', '神龙降临！'],
    ['Three stars converge!', 'Divine dragon descends!'],
    'burst', '#facc15'),
  fiveslap: def('fiveslap', 'ultcutins/fiveslap.webp',
    ['五连拍！', '啪啪啪啪啪！'],
    ['Five slaps!', 'Slap slap slap slap slap!'],
    'burst', '#fb7185'),
  superwave: def('superwave', 'ultcutins/superwave.webp',
    ['超级第一波！', '气功全开！'],
    ['Super First Wave!', 'Full power!'],
    'wave', '#60a5fa'),
  ka: def('ka', 'ultcutins/ka.webp',
    ['咔！'],
    ['Ka!'],
    'burst', '#f87171'),
  ji: def('ji', 'ultcutins/ji.webp',
    ['叽！'],
    ['Ji!'],
    'burst', '#60a5fa'),
  kajifen: def('kajifen', 'ultcutins/kajifen.webp',
    ['咔叽粉，参上！'],
    ['KaJi, reporting in!'],
    'burst', '#f9a8d4'),
  kajisuper: def('kajisuper', 'ultcutins/kajisuper.webp',
    ['超级咔叽，降临！'],
    ['Super KaJi descends!'],
    'burst', '#fde047'),
  skydragon: def('skydragon', 'ultcutins/skydragon.webp',
    ['天龙剑，出鞘！'],
    ['Sky Dragon Sword, unsheathed!'],
    'slash', '#38bdf8'),
  vajra: def('vajra', 'ultcutins/vajra.webp',
    ['三大金刚，护法！'],
    ['Three Vajras, protect!'],
    'burst', '#fbbf24'),
  heartpoison: def('heartpoison', 'ultcutins/heartpoison.webp',
    ['诛心毒气，弥漫！'],
    ['Heart poison spreads!'],
    'burst', '#4ade80'),
};

export interface UltCutinPick {
  def: UltCutinDef;
  playerName: string;
  skillName: string;
}

/**
 * 从本回合出牌中挑一个必杀做演出：只看活着的玩家出的 ULTIMATE，
 * 取 tier 最高者（并列取先出场的）。没有则返回 null。
 */
export function pickUltCutin(players: Player[], skillDb: Card[]): UltCutinPick | null {
  let best: UltCutinPick | null = null;
  let bestTier = -1;
  for (const p of players) {
    if (p.isDead || !p.selectedCardId) continue;
    const card = skillDb.find(c => c.id === p.selectedCardId);
    if (!card || card.type !== 'ULTIMATE') continue;
    const cutin = ULT_CUTINS[card.id];
    if (!cutin) continue;
    if (card.tier > bestTier) {
      bestTier = card.tier;
      best = { def: cutin, playerName: p.name, skillName: card.name.zh };
    }
  }
  return best;
}

/** 随机挑一句喊话 */
export function pickShout(cutinDef: UltCutinDef, lang: 'zh' | 'en'): string {
  const lines = lang === 'zh' ? cutinDef.shouts.zh : cutinDef.shouts.en;
  return lines[Math.floor(Math.random() * lines.length)];
}
