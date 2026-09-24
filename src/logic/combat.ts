import React from 'react';
import {
  Zap,
  Shield,
  Bomb,
  Hammer,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Snowflake,
  Feather,
  Coffee,
  Ghost,
  Wind,
  Magnet,
  Crosshair,
  HardHat,
  Axe,
  Hand,
  Footprints,
  Mountain,
  Heart,
  Cloud,
  Swords,
  Eye,
  Biohazard,
} from 'lucide-react';
import type { Card, Player, LogEntry, Lang, CardType } from '../types';
import { TEXT } from '../data/translations';
import { SKILL_DB } from '../data/skills';
import { FINAL_LEVEL, MAX_HP } from '../data/constants';

// --- ICON HELPER ---
export const getCardIcon = (id: string) => {
  switch (id) {
    case 'charge': return React.createElement(Zap, { className: "text-yellow-400 fill-yellow-400/20", size: 48 });
    case 'defend': return React.createElement(Shield, { className: "text-blue-400 fill-blue-400/20", size: 48 });
    case 'hong':
    case 'hong2': return React.createElement(Bomb, { className: "text-red-400 fill-red-400/20", size: 48 });
    case 'liuke': return React.createElement(Hammer, { className: "text-red-400 fill-red-400/20", size: 48 });
    case 'ka': return React.createElement("div", { className: "text-5xl" }, "✂️");
    case 'ji': return React.createElement("div", { className: "text-5xl" }, "🐥");
    case 'kajifen': return React.createElement(Sparkles, { className: "text-purple-400 fill-purple-400/20", size: 48 });
    case 'kajisuper': return React.createElement("div", { className: "text-5xl" }, "🌟");
    case 'ascend': return React.createElement(ArrowUp, { className: "text-green-400", size: 48 });
    case 'descend': return React.createElement(ArrowDown, { className: "text-green-400", size: 48 });
    case 'pegasus': return React.createElement("div", { className: "text-5xl" }, "🦄");
    case 'meteor': return React.createElement("div", { className: "text-5xl" }, "☄️");
    case 'icesword':
    case 'iceult': return React.createElement(Snowflake, { className: "text-cyan-300", size: 48 });
    case 'smallfly': return React.createElement(Feather, { className: "text-white", size: 48 });
    case 'dragonclaw':
    case 'fireclaw':
    case 'dragondef': return React.createElement("div", { className: "text-5xl" }, "🐉");
    case 'hotmilk':
    case 'boiler': return React.createElement(Coffee, { className: "text-orange-300", size: 48 });
    case 'madian': return React.createElement("div", { className: "text-5xl" }, "🐎");
    case 'hangman': return React.createElement(Ghost, { className: "text-gray-400", size: 48 });
    case 'bigfly': return React.createElement(Wind, { className: "text-white", size: 48 });
    case 'absorb': return React.createElement(Magnet, { className: "text-purple-400", size: 48 });
    case 'gun':
    case 'gungod': return React.createElement(Crosshair, { className: "text-red-500", size: 48 });
    case 'helmetatk':
    case 'helmetdef': return React.createElement(HardHat, { className: "text-yellow-500", size: 48 });
    case 'machete': return React.createElement(Axe, { className: "text-red-600", size: 48 });
    case 'triplekill': return React.createElement("div", { className: "text-5xl" }, "☠️");
    case 'handatk':
    case 'handdef':
    case 'shatter': return React.createElement(Hand, { className: "text-amber-700", size: 48 });
    case 'footatk':
    case 'footdef':
    case 'triplekick': return React.createElement(Footprints, { className: "text-amber-800", size: 48 });
    case 'aoxi': return React.createElement("div", { className: "text-5xl" }, "🌪️");
    case 'oneg':
    case 'threeg':
    case 'fiveg':
    case 'seveng':
    case 'bang':
    case 'stab': return React.createElement(Hammer, { className: "text-gray-400", size: 48 });
    case 'wave':
    case 'superwave': return React.createElement("div", { className: "text-5xl" }, "🌊"); 
    case 'hongtian': return React.createElement(Cloud, { className: "text-sky-400", size: 48 });
    case 'hongdi': return React.createElement(Mountain, { className: "text-stone-500", size: 48 });
    case 'hearteye': return React.createElement("div", { className: "flex" }, React.createElement(Heart, { className: "text-red-500" }), React.createElement(Eye, { className: "text-white" }));
    case 'poison': return React.createElement(Biohazard, { className: "text-green-500", size: 48 });
    case 'skydragon': return React.createElement("div", { className: "text-5xl" }, "🐲");
    case 'doublewing': return React.createElement("div", { className: "text-5xl" }, "🪽");
    case 'vajra': return React.createElement("div", { className: "text-5xl" }, "🛡️");
    case 'allbomb': return React.createElement("div", { className: "text-5xl" }, "💣");
    case 'heartpoison': return React.createElement("div", { className: "text-5xl" }, "🖤");
    default:
      if (id.includes('def')) return React.createElement(Shield, { className: "text-blue-400", size: 48 });
      return React.createElement(Swords, { className: "text-red-400", size: 48 });
  }
};

// --- LOGIC ---
// “会打人”的卡：只有 ATTACK / ULTIMATE；防守类 combo（比如双翼齐飞）不算
export const isOffensiveCard = (card: Card) =>
  card.type === 'ATTACK' || card.type === 'ULTIMATE';

// combo 的“有效等级” = 组成它的技能里最高的那个等级
export const getEffectiveLevel = (card: Card): number => {
  if (card.tags?.includes('combo')) {
    switch (card.id) {
      case 'skydragon':   // 由 1,2,3 组成 -> 3
        return 3;
      case 'doublewing':  // 2,5 -> 5（虽然主要是防御，但算个最高等级）
        return 5;
      case 'vajra':       // 8,10,11 -> 11
        return 11;
      case 'allbomb':     // 20,21 -> 21
      case 'heartpoison':
        return 21;
      default:
        return card.levelRequired;
    }
  }
  return card.levelRequired;
};

export const isBasicTier2Level0 = (c: Card) =>
  c.type === 'ATTACK' &&
  c.tier === 2 &&
  c.levelRequired === 0 &&

  (c.id === 'hong2' || c.id === 'liuke');

/**
 * card1 是否“压制” card2：
 * - 只考虑双方都是 ATTACK/ULTIMATE 的情况
 * - 先看 tier：高 tier 赢
 * - tier 相同：
 *   - 普通 vs 普通：有效等级高的赢
 *   - combo vs 普通：
 *       有效等级高 -> combo 赢
 *       有效等级 ≤ 普通 -> 平手（即 combo 会和更高级终极打平）
 *   - 普通 vs combo：普通不能压制 combo（无论高低，保持平手或被 combo 打）
 *   - combo vs combo：有效等级高的 combo 赢
 */
export const doesCard1Overpower = (card1: Card, card2: Card): boolean => {
  if (!isOffensiveCard(card1) || !isOffensiveCard(card2)) return false;

  // 🔸 EXCEPTION:
  // Lvl 0 基础 T2 攻击（轰轰 / 六克）和任何 T2 攻击技能打架时 => 一律平手
  // -> 无论谁是 card1 / card2，都不“压制”对方
  const card1IsBasic0 = isBasicTier2Level0(card1);
  const card2IsBasic0 = isBasicTier2Level0(card2);
  const card1IsT2Atk = card1.type === 'ATTACK' && card1.tier === 2;
  const card2IsT2Atk = card2.type === 'ATTACK' && card2.tier === 2;

  if (
    (card1IsBasic0 && card2IsT2Atk) ||
    (card2IsBasic0 && card1IsT2Atk)
  ) {
    // tie => nobody overpowers
    return false;
  }

  // 2. Exception: Ji (Tier 4) Ties
  // Ji is Level 0, but it should tie with other Tier 4 Ultimates (like Meteor Lv1)
  const isJiTie = (c1: Card, c2: Card) =>
    c1.id === 'ji' && 
    c2.type === 'ULTIMATE' && 
    c2.tier === 4 && 
    !c2.tags?.includes('combo');

  if (isJiTie(card1, card2) || isJiTie(card2, card1)) {
    return false; // Force Tie
  }

  const isKajifen = (c: Card) => c.id === 'kajifen';
  const isT5Combo = (c: Card) => c.tier === 5 && c.tags?.includes('combo');

  if ((isKajifen(card1) && isT5Combo(card2)) || (isKajifen(card2) && isT5Combo(card1))) {
    return false; // Force Tie
  }

  // 1) 先比 tier
  if (card1.tier !== card2.tier) {
    return card1.tier > card2.tier;
  }

  const combo1 = !!card1.tags?.includes('combo');
  const combo2 = !!card2.tags?.includes('combo');
  const lvl1 = getEffectiveLevel(card1);
  const lvl2 = getEffectiveLevel(card2);

  // combo vs combo：有效等级高的赢
  if (combo1 && combo2) {
    return lvl1 > lvl2;
  }

  // combo vs 普通：只在有效等级更高时赢，否则平手
  if (combo1 && !combo2) {
    return lvl1 > lvl2;
  }

  // 普通 vs combo：普通不能压制 combo
  if (!combo1 && combo2) {
    return false;
  }

  // 普通 vs 普通：等级高的赢
  return lvl1 > lvl2;
};

export const getShowdownWinner = (players: Player[]): string[] => {
  const candidates: { id: string; score: number }[] = [];
  
  // 1. Pre-calculate simulated layers (Movement logic)
  const simLayers: Record<string, number> = {};
  players.forEach(p => {
      let l = p.layer;
      const c = SKILL_DB.find(card => card.id === p.selectedCardId);
      if (c) {
        if (c.tags?.includes('layer_up')) l += 1;
        if (c.tags?.includes('layer_down')) l -= 1;
        if (c.tags?.includes('layer_up_temp')) l += 1;
        if (c.tags?.includes('layer_up_2_temp')) l += 2;
        if (c.tags?.includes('layer_up_3_temp')) l += 3;
      }
      simLayers[p.id] = l;
  });

  // 2. Simulate Combat to find valid hits
  players.forEach((p) => {
    if (!p.selectedCardId || p.isDead) return;
    const card = SKILL_DB.find((c) => c.id === p.selectedCardId);
    if (!card || !isOffensiveCard(card)) return; 

    let landedHit = false;
    players.forEach((target) => {
      if (target.id === p.id || target.isDead || !target.selectedCardId) return;
      
      const pLayer = simLayers[p.id];
      const tLayer = simLayers[target.id];
      const dist = Math.abs(pLayer - tLayer);
      let inRange = false;
      
      if (card.id === 'kajifen' || card.id === 'kajisuper' || card.tags?.includes('hit_all')) inRange = true;
      else if (card.id === 'ka' || card.id === 'ji') { if (dist <= 1) inRange = true; }
      else if (card.tags?.includes('combo') && card.type === 'ULTIMATE') { if (dist <= 3) inRange = true; }
      else if (card.type === 'ULTIMATE') { if (dist <= 2) inRange = true; }
      else if (card.tags?.includes('hit_up')) { if (tLayer > pLayer) inRange = true; }
      else if (card.tags?.includes('hit_down')) { if (tLayer < pLayer) inRange = true; }
      else { if (pLayer === tLayer) inRange = true; }

      if (!inRange) return; 

      const targetCard = SKILL_DB.find(c => c.id === target.selectedCardId)!;
      let hitSuccess = false;

      // Check interactions
      if (targetCard.type === 'CHARGE') hitSuccess = true;
      else if (targetCard.type === 'DEFEND') {
          if (card.id === 'machete') hitSuccess = true;
          else if (card.id === 'gun') hitSuccess = true;
          else if (card.id === 'wave') {
             const strongDefs = ['ninedef', 'bigfly', 'smallfly', 'fivedef', 'eightdef', 'handdef', 'footdef'];
             if (!strongDefs.includes(targetCard.id)) hitSuccess = true;
          }
          else if (card.type === 'ULTIMATE' && !targetCard.tags?.includes('dodge_ult')) hitSuccess = true;
      }
      else if (targetCard.type === 'SPECIAL') {
          if (targetCard.id === 'shatter') {
             if (card.type === 'ULTIMATE' && card.tier >= 5) hitSuccess = true;
          }
          else if (targetCard.id === 'doublewing') hitSuccess = true; 
          else hitSuccess = true;
      }
      else if (isOffensiveCard(targetCard)) {
          const isRemote = targetCard.tags?.includes('hit_up') || targetCard.tags?.includes('hit_down');
          if (pLayer === tLayer && isRemote) hitSuccess = true;
          else if (doesCard1Overpower(card, targetCard)) hitSuccess = true;
      }
      else if (targetCard.type === 'ABSORB') {
          if (targetCard.id === 'aoxi' && card.id === 'liuke') hitSuccess = true;
          else if (targetCard.tags?.includes('sharp_absorb') && ['hong','hong2','hongtian','hongdi','wave'].includes(card.id)) hitSuccess = true;
          else if (card.type === 'ULTIMATE') hitSuccess = true;
      }

      if (hitSuccess) landedHit = true;
    });

    if (!landedHit) return;

    const lvl = getEffectiveLevel(card);
    const isCombo = card.tags?.includes('combo') ? 1 : 0;
    const score = card.tier * 100 + lvl + isCombo * 10;
    candidates.push({ id: p.id, score });
  });

  // 3. Determine Winners (Multi-Slam Logic)
  if (candidates.length > 0) {
    const maxScore = Math.max(...candidates.map(c => c.score));
    const winners = candidates.filter(c => c.score === maxScore);
    
    // Rule: If everyone tied (winners count == total candidates count), NO SLAM.
    if (winners.length > 1 && winners.length === candidates.length) {
       return [];
    }
    
    // Otherwise (Single winner OR Multiple winners who beat someone), SLAM ALL WINNERS.
    return winners.map(w => w.id);
  }

  return [];
};

export const calculateTurnOutcome = (
  currentPlayers: Player[],
  turn: number,
  matchCount: number,
  lang: Lang
): { players: Player[]; logs: LogEntry[]; isGameOver: boolean; winner?: Player } => {
  let logs: LogEntry[] = [];

  const survivors = currentPlayers
    .map((p) => ({
      ...p,
      disabledSkills: p.disabledSkills || [],
      freeSkills: p.freeSkills || [],
      kills: p.kills || 0, // Ensure kills exist
    }))
    .filter((p) => !p.isDead);

  const deadPlayers = currentPlayers
    .map((p) => ({ ...p }))
    .filter((p) => p.isDead);

  // 1. APPLY COSTS / LAYER TAGS
  survivors.forEach((p) => {
    const card = SKILL_DB.find((c) => c.id === p.selectedCardId)!;
    p.lastAction = card.name.en;
    p.lastCardId = card.id;

    let isFreeUse = false;
    if (p.freeSkills && p.freeSkills.includes(card.id)) {
      const index = p.freeSkills.indexOf(card.id);
      if (index > -1) {
        p.freeSkills.splice(index, 1); 
        isFreeUse = true;
      }
    } else if (p.tempSkills && p.tempSkills.includes(card.id)) {
       const index = p.tempSkills.indexOf(card.id);
       if (index > -1) p.tempSkills.splice(index, 1);
    }

    if (card.type !== 'CHARGE' && !isFreeUse) {
      p.energy -= card.cost;
    }

    if (card.tags?.includes('layer_up')) {
      p.layer += 1;
      logs.push({ turn, text: lang === 'zh' ? `${p.name} 升到了 ${p.layer}层` : `${p.name} ascends to ${p.layer}F`, type: 'move' });
    }
    if (card.tags?.includes('layer_down')) {
      p.layer -= 1;
      logs.push({ turn, text: lang === 'zh' ? `${p.name} 降到了 ${p.layer}层` : `${p.name} descends to ${p.layer}F`, type: 'move' });
    }
    if (card.tags?.includes('layer_up_temp')) p.tempLayerMod = 1;
    if (card.tags?.includes('layer_up_2_temp')) p.tempLayerMod = 2;
    if (card.tags?.includes('layer_up_3_temp')) p.tempLayerMod = 3;
  });

  const damageMap: { [id: string]: number } = {};
  const disableMap: { [id: string]: string[] } = {};
  const absorbGainEnergy: { [id: string]: number } = {};
  const absorbGainSkills: { [id: string]: string[] } = {};
  
  // 🟢 NEW: Track who killed whom this turn
  const killContributors: { [victimId: string]: Set<string> } = {}; 
  const recordKill = (attackerId: string, victimId: string) => {
      if (!killContributors[victimId]) killContributors[victimId] = new Set();
      killContributors[victimId].add(attackerId);
  };

  survivors.forEach((p) => {
    damageMap[p.id] = 0;
    disableMap[p.id] = [];
    absorbGainEnergy[p.id] = 0;
    absorbGainSkills[p.id] = [];
  });

  const getLayer = (p: Player) => p.layer + p.tempLayerMod;

  // 2. COMBAT
  for (let i = 0; i < survivors.length; i++) {
    for (let j = 0; j < survivors.length; j++) {
      if (i === j) continue;

      const p1 = survivors[i];
      const p2 = survivors[j];
      const card1 = SKILL_DB.find((c) => c.id === p1.selectedCardId)!;
      const card2 = SKILL_DB.find((c) => c.id === p2.selectedCardId)!;

      // EXCEPTION: Big Fly vs Small Fly
      if (card1.id === 'bigfly' && card2.id === 'smallfly') {
         if (getLayer(p1) > getLayer(p2)) {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 大飞高空截杀 ${p2.name} (小飞)!` : `${p1.name} Big Fly intercepts ${p2.name} from above!`, type: 'combat' });
         }
         continue; 
      }

      let inRange = false;
      const dist = Math.abs(getLayer(p1) - getLayer(p2));

      if (card1.id === 'kajifen' || card1.id === 'kajisuper' || card1.tags?.includes('hit_all')) inRange = true;
      else if (card1.id === 'ka' || card1.id === 'ji') { if (dist <= 1) inRange = true; }
      else if (card1.tags?.includes('combo') && card1.type === 'ULTIMATE') { if (dist <= 3) inRange = true; }
      else if (card1.type === 'ULTIMATE') { if (dist <= 2) inRange = true; }
      else if (card1.tags?.includes('hit_up')) { if (getLayer(p2) > getLayer(p1)) inRange = true; }
      else if (card1.tags?.includes('hit_down')) { if (getLayer(p2) < getLayer(p1)) inRange = true; }
      else { if (getLayer(p1) === getLayer(p2)) inRange = true; }

      if (!inRange) continue;

      const sameLayer = getLayer(p1) === getLayer(p2);

      if (card1.type === 'ABSORB') continue;

      // REACTION CHECKS (p2 Absorbing/Shatter)
      if (card2.type === 'ABSORB') {
        const mult = card2.id === 'aoxi' ? 2 : 1;
        if (card2.tags?.includes('sharp_absorb')) {
          const dangerousMoves = ['hong', 'hong2', 'hongtian', 'hongdi', 'wave'];
          if (card1.type === 'ATTACK' && dangerousMoves.includes(card1.id)) {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击杀 ${p2.name} (吸取失败)!` : `${p1.name} kills ${p2.name} (Absorb failed)!`, type: 'combat' });
            continue;
          }
        }
        if (card2.id === 'aoxi' && card1.id === 'liuke') {
           damageMap[p2.id] += MAX_HP;
           recordKill(p1.id, p2.id); // 🟢 Kill Credit
           logs.push({ turn, text: lang === 'zh' ? `${p1.name} 六克击杀 ${p2.name} (奥吸失败)!` : `${p1.name} 6g Strike kills ${p2.name} (Ultra Absorb failed)!`, type: 'combat' });
           continue;
        }
        if (card1.type === 'CHARGE') {
          const gain = mult * 2; 
          absorbGainEnergy[p2.id] += gain;
          logs.push({ turn, text: lang === 'zh' ? `${p2.name} 吸收 ${p1.name} 的攒 (+${gain} 费)!` : `${p2.name} absorbs ${p1.name}'s Charge (+${gain} energy)!`, type: 'info' });
          continue;
        }
        if (card1.type === 'ULTIMATE') {
          damageMap[p2.id] += MAX_HP;
          recordKill(p1.id, p2.id); // 🟢 Kill Credit
          logs.push({ turn, text: lang === 'zh' ? `${p2.name} 被终极击杀 (吸收失败)!` : `${p2.name} is killed by an Ultimate (Absorb failed)!`, type: 'combat' });
          continue;
        }
        if (card1.type === 'DEFEND') {
          if (card1.id === 'defend') { /* no effect */ } 
          else { for (let k = 0; k < mult; k++) absorbGainSkills[p2.id].push(card1.id); }
          continue;
        }
        if (card1.type === 'ATTACK' || card1.type === 'SPECIAL') {
          for (let k = 0; k < mult; k++) absorbGainSkills[p2.id].push(card1.id);
          continue;
        }
        continue;
      }

      if (card1.id === 'shatter' && sameLayer) {
        if (card2.type === 'ULTIMATE' && card2.tier >= 5) {
          damageMap[p1.id] += MAX_HP; 
          recordKill(p2.id, p1.id); // 🟢 Kill Credit (Reversed: p2 killed p1)
          logs.push({ turn, text: lang === 'zh' ? `${p2.name} 的 ${card2.name.zh} (T${card2.tier}) 击碎了破碎!` : `${p2.name}'s ${card2.name.en} (T${card2.tier}) broke through Shatter!`, type: 'combat' });
          continue; 
        }
        if (['CHARGE','ATTACK', 'DEFEND', 'SPECIAL', 'ULTIMATE'].includes(card2.type)) {
          if (!disableMap[p2.id].includes(card2.id)) disableMap[p2.id].push(card2.id);
          continue; 
        }
      }

      // OFFENSIVE ACTIONS
      if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE' || card1.type === 'SPECIAL') {
        if (card2.type === 'CHARGE') {
          if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE') {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击杀 ${p2.name} (攒)!` : `${p1.name} kills ${p2.name} (Charging)!`, type: 'combat' });
          }
        } 
        else if (card2.type === 'DEFEND') {
          if (card2.tags?.includes('dodge_ult') && (card1.type === 'ULTIMATE' || card1.id === 'ka' || card1.id === 'ji')) {
             /* Dodged */
          } 
          else if (card1.id === 'machete' && card2.id === 'defend') {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 砍刀击碎 ${p2.name}!` : `${p1.name} Machete shatters ${p2.name}!`, type: 'combat' });
          } 
          else if (card1.id === 'gun' && card2.id === 'defend') {
            damageMap[p2.id] += 1;
            // Gun deals 1 dmg. Check if fatal. MaxHP is 2. If already dmg=1, this is fatal.
            // Simplified: We assume gun might kill if HP is low. We'll handle kill credit in "Apply Results" by checking damageMap? 
            // Actually, best to credit here provisionally. Gun usually isn't 1-hit kill unless injured.
            // Let's just mark it. If they die, they get credit.
            recordKill(p1.id, p2.id); 
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 定枪穿透 ${p2.name}!` : `${p1.name} Sniper pierces ${p2.name}!`, type: 'combat' });
          } 
          else if (card1.id === 'wave') {
            const strongDefs = ['ninedef', 'bigfly', 'smallfly', 'fivedef', 'eightdef', 'handdef', 'footdef'];
            if (!strongDefs.includes(card2.id)) {
              damageMap[p2.id] += MAX_HP;
              recordKill(p1.id, p2.id); // 🟢 Kill Credit
              logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击溃 ${p2.name} 防御!` : `${p1.name} washes away ${p2.name}!`, type: 'combat' });
            }
          } 
          else if (card1.type === 'ULTIMATE') {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 终极破防 ${p2.name}!` : `${p1.name} Ult breaks ${p2.name}!`, type: 'combat' });
          }
        } 
        else if (card2.type === 'SPECIAL') {
          if (card2.id === 'shatter') {
            if (card1.type === 'ULTIMATE' && card1.tier >= 5) {
              damageMap[p2.id] += MAX_HP;
              recordKill(p1.id, p2.id); // 🟢 Kill Credit
              logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击碎了 ${p2.name} 的破碎!` : `${p1.name} shattered ${p2.name}'s Shatter!`, type: 'combat' });
            }
          }
          else if (card2.id === 'doublewing') {
            if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE') {
               damageMap[p2.id] += MAX_HP;
               recordKill(p1.id, p2.id); // 🟢 Kill Credit
               logs.push({ turn, text: lang === 'zh' ? `${p1.name} 的 ${card1.name.zh} 击落了 ${p2.name} (双翼)!` : `${p1.name}'s ${card1.name.en} shoots down ${p2.name} (Double Wing)!`, type: 'combat' });
            }
          }
          else if (card2.id === 'ascend' || card2.id === 'descend') {
            if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE') {
              damageMap[p2.id] += MAX_HP;
              recordKill(p1.id, p2.id); // 🟢 Kill Credit
              logs.push({ turn, text: lang === 'zh' ? `${p1.name} 预判了移动，击杀 ${p2.name}!` : `${p1.name} predicted the move and killed ${p2.name}!`, type: 'combat' });
            }
          }
        }
        else if (card2.type === 'ATTACK' || card2.type === 'ULTIMATE') {
          const isRemoteOnly = card2.tags?.includes('hit_up') || card2.tags?.includes('hit_down');
          if (isRemoteOnly && sameLayer) {
             damageMap[p2.id] += MAX_HP;
             recordKill(p1.id, p2.id); // 🟢 Kill Credit
             logs.push({ turn, text: lang === 'zh' ? `${p1.name} 趁虚而入，在同层击杀了无法回防的 ${p2.name}!` : `${p1.name} catches ${p2.name} off guard!`, type: 'combat' });
          }
          if (doesCard1Overpower(card1, card2)) {
             damageMap[p2.id] += MAX_HP;
             recordKill(p1.id, p2.id); // 🟢 Kill Credit
             logs.push({ turn, text: lang === 'zh' ? `${p1.name} [${card1.name.zh}] 压制了 ${p2.name}!` : `${p1.name} [${card1.name.en}] overpowers ${p2.name}!`, type: 'combat' });
          }
        }
      }
    }
  }

  // 3. APPLY RESULTS
  survivors.forEach((p) => {
    const card = SKILL_DB.find((c) => c.id === p.selectedCardId)!;

    if (card.type === 'ABSORB' && damageMap[p.id] < MAX_HP) {
      if (absorbGainEnergy[p.id] > 0) {
        p.energy += absorbGainEnergy[p.id];
        logs.push({ turn, text: lang === 'zh' ? `${p.name} 吸取 +${absorbGainEnergy[p.id]} 费` : `${p.name} absorbed +${absorbGainEnergy[p.id]} energy`, type: 'info' });
      }
      if (absorbGainSkills[p.id]?.length > 0) {
        p.freeSkills = [...(p.freeSkills || []), ...absorbGainSkills[p.id]];
      }
    }
    if (card.type === 'CHARGE' && damageMap[p.id] < MAX_HP) p.energy += 2;
    if (disableMap[p.id]?.length > 0) p.disabledSkills = Array.from(new Set([...(p.disabledSkills || []), ...disableMap[p.id]]));

    if (damageMap[p.id] > 0) {
      p.hp -= damageMap[p.id];
      if (p.hp <= 0) {
        p.isDead = true;
        p.hp = 0;
        
        // 🟢 NEW: Process Kills
        const killers = killContributors[p.id];
        if (killers) {
           killers.forEach(kId => {
              const killer = survivors.find(s => s.id === kId);
              if (killer) killer.kills += 1;
           });
        }

        logs.push({ turn, text: lang === 'zh' ? `${p.name} 阵亡!` : `${p.name} died!`, type: 'death' });
      }
    }
    p.tempLayerMod = 0;
    p.selectedCardId = null;
  });

  // Survivor Reset logic...
  const newlyDeadCount = survivors.filter((p) => p.isDead).length;
  const activeSurvivors = survivors.filter((p) => !p.isDead);
  if (newlyDeadCount > 0 && activeSurvivors.length > 1) {
    activeSurvivors.forEach((p) => {
      p.hp = MAX_HP;
      p.energy = 0;
      p.layer = 0;
      p.tempLayerMod = 0;
      p.disabledSkills = [];
      p.freeSkills = []; 
    });
    logs.push({ turn, text: TEXT[lang].survivorReset, type: 'info' });
  }

  const finalPlayers = [...survivors, ...deadPlayers].sort((a, b) => a.id.localeCompare(b.id));
  const living = finalPlayers.filter((p) => !p.isDead);

  let isGameOver = false;
  let winner: Player | undefined = undefined;

  if (living.length <= 1) {
    isGameOver = true;
    if (living.length === 1) {
      winner = living[0];
      
      // 🟢 NEW: If Final Level reached, log the Kill Leader
      if (matchCount >= FINAL_LEVEL) {
          const killLeader = finalPlayers.reduce((prev, curr) => 
            ((curr.kills || 0) > (prev.kills || 0) ? curr : prev), 
          finalPlayers[0]);

          logs.push({ 
            turn, 
            text: lang === 'zh' 
              ? `🏆 最终决战结束! 击杀王: ${killLeader.name} (${killLeader.kills}杀)` 
              : `🏆 FINAL BATTLE OVER! Kill Leader: ${killLeader.name} (${killLeader.kills} Kills)`, 
            type: 'win' 
          });
      } else {
          // Standard Win Logic (Give Skill)
          const newLvl = matchCount;
          const newCards = SKILL_DB.filter(c => c.levelRequired === newLvl);
          // ... (Existing skill unlock logic) ...
          let typeToCheck: CardType | null = null;
          if (newCards.some(c => c.type === 'ULTIMATE')) typeToCheck = 'ULTIMATE';
          else if (newCards.some(c => c.type === 'ATTACK')) typeToCheck = 'ATTACK';
          else if (newCards.some(c => c.type === 'DEFEND')) typeToCheck = 'DEFEND';
          const isSpecial = !typeToCheck || newCards.some(c => c.type === 'SPECIAL');
          let count = 0;
          if (typeToCheck && !isSpecial) {
            winner.inventory.forEach(lvl => {
               if (lvl === 0) return;
               const cardsAtLvl = SKILL_DB.filter(c => c.levelRequired === lvl);
               if (cardsAtLvl.some(c => c.type === typeToCheck)) count++;
            });
          }
          if (typeToCheck && count >= 4 && !winner.inventory.includes(newLvl)) {
             winner.pendingLevel = newLvl;
             logs.push({ turn, text: lang === 'zh' ? `🏆 ${winner.name} 获胜! (需弃牌)` : `🏆 ${winner.name} WINS! (Full slots)`, type: 'win' });
          } else {
            if (!winner.inventory.includes(newLvl)) winner.inventory.push(newLvl);
            logs.push({ turn, text: lang === 'zh' ? `🏆 ${winner.name} 获胜! (获得 Lv${matchCount})` : `🏆 ${winner.name} WINS! (Got Lv${matchCount})`, type: 'win' });
          }
      }
    } else {
      logs.push({ turn, text: lang === 'zh' ? `平局!` : `Draw!`, type: 'death' });
    }
  }

  return { players: finalPlayers, logs, isGameOver, winner };
};

export const getBotMove = (bot: Player, allPlayers: Player[]) => {
  const allKnownCards = getPlayerCards(bot, allPlayers);
  const affordable = allKnownCards.filter(c => 
    bot.energy >= c.cost && 
    !bot.disabledSkills?.includes(c.id) // 👈 机器人不能出被封印的牌
  );
  if (affordable.length === 0) return 'charge';
  let choice = affordable[0];
  const r = Math.random();
  if (bot.energy < 1) {
    choice = r > 0.3
      ? affordable.find((c) => c.type === 'CHARGE') || choice
      : affordable.find((c) => c.type === 'DEFEND') || choice;
  } else if (bot.energy >= 3 && r > 0.4) {
    const ults = affordable.filter((c) => c.type === 'ULTIMATE');
    if (ults.length > 0) choice = ults[Math.floor(Math.random() * ults.length)];
  } else {
    choice = affordable[Math.floor(Math.random() * affordable.length)];
  }
  return choice ? choice.id : 'charge';
};

export const getPlayerCards = (p: Player, allPlayers?: Player[]) => {
  const hongTianUnlocked = allPlayers
    ? allPlayers.some((pl) => pl.inventory.includes(20))
    : false;

  const knownCards = SKILL_DB.filter((c) => {
    // 🔥 关键修复：检查这张卡是否是临时卡
    const isTempSkill = p.tempSkills?.includes(c.id) ?? false;

    // 如果是 Lv100 且不是临时卡，才隐藏
    if (c.levelRequired === 100 && !isTempSkill) return false;

    const hasFreeSkill = p.freeSkills?.includes(c.id) ?? false;
    
    // 只要 仓库有 OR 是基础 OR 有免费 OR 有临时，都算拥有
    const hasSkill =
      p.inventory.includes(c.levelRequired) ||
      c.levelRequired === 0 ||
      hasFreeSkill ||
      isTempSkill;

    const specialCond =
      ['ascend', 'descend'].includes(c.id) ? hongTianUnlocked : true;

    return hasSkill && specialCond;
  });

  const inv = p.inventory;
  const has = (lvl: number) => inv.includes(lvl);
  const tryAddCombo = (id: string) => {
    const c = SKILL_DB.find((x) => x.id === id);
    if (c) knownCards.push(c);
  };

  if (has(1) && has(2) && has(3)) tryAddCombo('skydragon');
  if (has(2) && has(5)) tryAddCombo('doublewing');
  if (has(8) && has(10) && has(11)) tryAddCombo('vajra');
  if (has(20) && has(21)) {
    tryAddCombo('allbomb');
    tryAddCombo('heartpoison');
  }

  // SHARED SKILL LOGIC
  if (allPlayers) {
    // Check if anyone (including self) enabled sharing and has the required level
    const anyoneSharingDragon = allPlayers.some(pl => pl.isShared && pl.inventory.includes(3)); // Lv3 = Dragon
    const anyoneSharing9g = allPlayers.some(pl => pl.isShared && pl.inventory.includes(18));   // Lv18 = 9g

    if (anyoneSharingDragon) {
       const c = SKILL_DB.find(x => x.id === 'dragondef');
       // Only add if I don't already have it
       if (c && !knownCards.some(k => k.id === c.id)) knownCards.push(c);
    }
    if (anyoneSharing9g) {
       const c = SKILL_DB.find(x => x.id === 'ninedef');
       if (c && !knownCards.some(k => k.id === c.id)) knownCards.push(c);
    }
  }
  // END ADDITION

  return knownCards;
};
