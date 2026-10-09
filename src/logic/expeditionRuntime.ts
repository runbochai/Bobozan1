import type { Lang, LogEntry, Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { EXPEDITION_SKILL_LEVELS, EXPEDITION_VIGOR_HP, EXPEDITION_WARMUP_ENERGY, EXPEDITION_MONEYTREE_CAP,
  EXPEDITION_SKILLCHARM_USES, EXPEDITION_REST_HEAL, EXPEDITION_CHALLENGE_HP, EXPEDITION_CHALLENGE_GOLD,
  drawGachaCard, expeditionSecretPool, type ExpeditionEnemyDef } from '../data/expedition';
import { calculateTurnOutcome, getPlayerLevel } from './combat';
import { consumeExpeditionCard, EXPEDITION_MAX_HP, expeditionLevel, nextExpeditionLevel, genRewardOptions, goldForWin, POTION_HEAL, type RewardOption, type ShopItem } from './expedition';
import { grantSkillLevel, normalizeSkillLoadout, type SkillLoadoutState } from './skillLoadout';
import { getExpeditionDifficulty, normalizeExpeditionDifficulty, type ExpeditionDifficulty } from '../data/expeditionDifficulty';
import { getEndlessEnemyLoadout, getExpeditionStage } from './endlessExpedition';

export type ExpeditionRoute = 'rest' | 'risk';
export type ExpeditionHistory = Record<string, string[]>;
export interface ExpeditionRun extends SkillLoadoutState {
  difficulty?: ExpeditionDifficulty;
  stageIdx: number; relics: string[]; inventory: number[]; hp: number; maxHp: number;
  tempCards: { cardId: string; usesLeft: number }[]; gold: number; equipment: string[];
  ironShirtUsed: boolean; dollUsed: boolean; route: ExpeditionRoute;
  endlessLevel?: number;
  endlessEnemyLevel?: number;
  endlessDefeats?: number;
  /** High-water marks make retry entry and win payouts safe to repeat. */
  endlessEnteredStageIdx?: number;
  endlessClearedStageIdx?: number;
  endlessRouteStageIdx?: number;
  /** Actual victories in this run; bypassed towers never count as cleared. */
  crownCleared?: number[];
}
export interface ExpeditionBattleMemory {
  maxHp: Record<string, number>;
  passives: Record<string, ExpeditionEnemyDef['passive']>;
  ironhideUsed: boolean; whetstoneUsed: boolean; adrenalineUsed: boolean;
}
export const EXPEDITION_HERO_ID = 'exp_me';
const cloneRun = (run: ExpeditionRun): ExpeditionRun => ({ ...run, relics: [...run.relics], inventory: [...run.inventory],
  difficulty: normalizeExpeditionDifficulty(run.difficulty),
  crownCleared: [...new Set((run.crownCleared ?? []).filter(index => Number.isInteger(index) && index >= 0 && index < 18))],
  ...(run.skillLoadout ? { skillLoadout: [...run.skillLoadout] } : {}),
  tempCards: run.tempCards.map(card => ({ ...card })), equipment: [...run.equipment] });
const levelOf = (run: ExpeditionRun) => expeditionLevel(run.inventory);
const addCard = (run: ExpeditionRun, cardId: string, uses: number) => {
  const found = run.tempCards.find(card => card.cardId === cardId);
  if (found) found.usesLeft += uses;
  else run.tempCards.push({ cardId, usesLeft: uses });
};

/** Adapt only to public progression, never to a hidden choice or the player's current move. */
export function resolveExpeditionEnemyLoadout(enemy: ExpeditionEnemyDef, playerInventory: readonly number[]): Pick<Player, 'inventory' | 'skillLoadout'> {
  if (!Number.isFinite(enemy.levelAdvantage) || !(enemy.levelAdvantage! > 0)) return { inventory: [...enemy.inventory] };
  const targetLevel = expeditionLevel(playerInventory) + Math.max(1, Math.floor(enemy.levelAdvantage!));
  const attacks = SKILL_DB.filter(card => card.type === 'ATTACK' && card.tier === 2
    && card.levelRequired > 0 && card.levelRequired < 100
    && !card.tags?.some(tag => ['combo', 'pierce_basic', 'break_basic', 'break_mid_def', 'hit_up', 'hit_down'].includes(tag)))
    .sort((a, b) => a.levelRequired - b.levelRequired);
  // The normal early encounter always has a higher real attack available.
  // An artificial maximum-level save gets the strongest existing card, never a fake Lv.24.
  const attack = attacks.find(card => card.levelRequired >= targetLevel) ?? attacks.at(-1);
  return attack ? { inventory: [0, attack.levelRequired], skillLoadout: [attack.id] } : { inventory: [...enemy.inventory] };
}

export function createExpeditionRun(difficulty: ExpeditionDifficulty = 'beginner'): ExpeditionRun {
  const config = getExpeditionDifficulty(difficulty);
  return { difficulty: config.id, stageIdx: 0, relics: [], inventory: [0], skillLoadout: [], hp: config.startHp, maxHp: config.startHp,
    tempCards: [], gold: 0, equipment: [], ironShirtUsed: false, dollUsed: false, route: 'rest', crownCleared: [],
    ...(config.id === 'endless' ? { endlessLevel: 0, endlessEnemyLevel: 1, endlessDefeats: 0 } : {}) };
}

/** Supply is a visible, one-time setup bonus, never hidden extra damage. */
export function getCrownSupplyBonus(run: Pick<ExpeditionRun, 'difficulty' | 'crownCleared'>) {
  const activeTowers = run.difficulty === 'endless' ? [] : [13, 14, 15].filter(index => !run.crownCleared?.includes(index));
  return { activeTowers, energy: activeTowers.length, hp: activeTowers.length * .5 };
}

/** Revive the settled state, never a pre-battle snapshot: spent cards and safeguards stay spent. */
export function reviveEndlessExpedition(previous: ExpeditionRun): ExpeditionRun {
  const run = cloneRun(previous);
  if (run.difficulty !== 'endless' || run.hp > 0) return run;
  run.endlessLevel ??= levelOf(run);
  run.endlessEnemyLevel = Math.max(run.endlessLevel + 1, (run.endlessEnemyLevel ?? run.endlessLevel + 1) + 1);
  run.endlessDefeats = (run.endlessDefeats ?? 0) + 1;
  run.hp = run.maxHp;
  return run;
}

/** Endless growth is awarded automatically on victory, never a second time in a reward or shop. */
export function genExpeditionRewards(run: ExpeditionRun, random = Math.random): RewardOption[] {
  const count = run.relics.includes('cbt') ? 4 : 3;
  const rewards = genRewardOptions(run.hp, run.maxHp, run.relics, count,
    run.inventory, run.stageIdx, random, run.difficulty !== 'endless');
  if (run.difficulty === 'endless') {
    // The ordinary generator prefers distinct nearby secrets. At saturated HP /
    // relics, that pool can contain only one or two cards; extra usable copies
    // fill the remaining choices instead of showing a short or empty reward row.
    const pool = expeditionSecretPool(levelOf(run), run.stageIdx);
    while (rewards.length < count) {
      const copies = (id: string) => rewards.filter(reward => reward.kind === 'temp' && reward.cardId === id).length;
      const fewest = Math.min(...pool.map(copies));
      const candidates = pool.filter(id => copies(id) === fewest);
      const cardId = candidates[Math.min(candidates.length - 1, Math.max(0, Math.floor(random() * candidates.length)))];
      const uses = 1 + Math.min(2, Math.max(0, Math.floor(random() * 3)));
      rewards.push({ kind: 'temp', cardId, uses });
    }
  }
  return rewards;
}

/** The same public, resolved history feeds the UI and the enemy's next decision. */
export function recordExpeditionHistory(history: ExpeditionHistory, revealed: readonly Player[]): ExpeditionHistory {
  const next = { ...history };
  for (const player of revealed) if (!player.isDead && player.selectedCardId) {
    next[player.id] = [...(history[player.id] ?? []), player.selectedCardId].slice(-3);
  }
  return next;
}

/** Recompute from source rules so stale snapshots and repeated setup never stack the bonus. */
function attackDamageBonus(player: Player, run: ExpeditionRun, memory: ExpeditionBattleMemory): number {
  const self = player.id === EXPEDITION_HERO_ID;
  const passive = memory.passives[player.id];
  const enraged = player.hp <= (memory.maxHp[player.id] ?? player.hp) / 2;
  return (self && run.equipment.includes('waraxe') ? .5 : passive?.attackBonus ?? 0)
    + (enraged ? passive?.enrageDmg ?? 0 : 0)
    + (self ? 0 : getExpeditionDifficulty(run.difficulty).enemyDamageBonus);
}

function turnStart(players: Player[], run: ExpeditionRun, memory: ExpeditionBattleMemory, first: boolean) {
  return players.map(player => {
    if (player.isDead) return player;
    const passive = memory.passives[player.id];
    const enraged = player.hp <= (memory.maxHp[player.id] ?? player.hp) / 2;
    return { ...player,
      energy: player.energy + (first && player.id === EXPEDITION_HERO_ID && run.relics.includes('rxyd') ? EXPEDITION_WARMUP_ENERGY : 0)
        + (enraged ? passive?.enrageEnergy ?? passive?.energyPerTurn ?? 0 : passive?.energyPerTurn ?? 0),
      dmgBonus: attackDamageBonus(player, run, memory),
    };
  });
}

export function setupExpeditionStage(previous: ExpeditionRun, stageIdx: number,
  identity: { name: string; avatar: string; lang: Lang }, random = Math.random) {
  const run: ExpeditionRun = normalizeSkillLoadout(cloneRun(previous)), stage = getExpeditionStage(stageIdx, run.difficulty);
  if (!stage) throw new Error('Unknown expedition stage');
  run.stageIdx = stageIdx;
  const endless = run.difficulty === 'endless';
  if (endless) {
    run.endlessLevel ??= levelOf(run);
    run.endlessEnemyLevel = Math.max(run.endlessLevel + 1, run.endlessEnemyLevel ?? 1);
    run.endlessDefeats ??= 0;
  }
  const firstEntry = !endless || stageIdx > (run.endlessEnteredStageIdx ?? -1);
  const crownSupply = stageIdx === 17 && !endless ? getCrownSupplyBonus(run) : { activeTowers: [], energy: 0, hp: 0 };
  const logs: LogEntry[] = [{ turn: 1, text: `${stage.chapter[identity.lang]} · ${stage.name[identity.lang]}`, type: 'info' }];
  if (stageIdx === 17 && !endless) logs.push({ turn: 1, type: 'info', text: identity.lang === 'zh'
    ? crownSupply.activeTowers.length
      ? `${crownSupply.activeTowers.length} 座供能塔仍在运转：冠主开局能量 +${crownSupply.energy}、生命 +${crownSupply.hp}。`
      : '三座供能塔已切断：冠主没有额外开局能量或生命。'
    : crownSupply.activeTowers.length
      ? `${crownSupply.activeTowers.length} supply towers remain: the Crown King starts with +${crownSupply.energy} Energy and +${crownSupply.hp} HP.`
      : 'All three supply towers are cut: the Crown King has no extra starting Energy or HP.' });
  if (firstEntry && run.equipment.includes('luckydice')) {
    const card = drawGachaCard(levelOf(run), stageIdx, random);
    addCard(run, card.cardId, 1);
  }
  if (firstEntry && run.equipment.includes('moneytree')) run.gold += Math.min(EXPEDITION_MONEYTREE_CAP, Math.max(1, Math.floor(run.gold / 10)));
  if (endless && firstEntry) run.endlessEnteredStageIdx = stageIdx;
  const base = { isDead: false, layer: 0, tempLayerMod: 0, selectedCardId: null, lastCardId: null, lastAction: null,
    disabledSkills: [], freeSkills: [], kills: 0, tempSkills: [] };
  const enemies: Player[] = stage.enemies.map(enemy => ({ ...base, id: `exp_${stage.id}_${enemy.id}`,
    name: enemy.name[identity.lang], avatar: `avatars/enemies/${enemy.avatarId ?? enemy.id}.webp`, isBot: true,
    hp: enemy.hp + crownSupply.hp + (run.route === 'risk' && stageIdx >= 3 ? EXPEDITION_CHALLENGE_HP : 0),
    energy: endless ? 0 : (enemy.passive?.startEnergy ?? 0) + crownSupply.energy,
    ...(endless ? { ...getEndlessEnemyLoadout(run.endlessEnemyLevel!), endlessLevel: run.endlessEnemyLevel }
      : resolveExpeditionEnemyLoadout(enemy, run.inventory)), dmgBonus: enemy.passive?.attackBonus ?? 0,
    energyDrain: enemy.passive?.energyDrain ?? 0, pierce: enemy.passive?.pierce ?? false,
  }));
  for (const [index, enemy] of stage.enemies.entries()) {
    if (!endless && enemy.levelAdvantage && expeditionLevel(enemies[index].inventory) <= levelOf(run)) {
      logs.push({ turn: 1, type: 'info', text: identity.lang === 'zh'
        ? `${enemy.name.zh}已使用现有最高等级技能，本战不再高于你的等级。`
        : `${enemy.name.en} uses the highest existing skill level; this encounter does not exceed your level.` });
    }
  }
  const hero: Player = { ...base, id: EXPEDITION_HERO_ID, name: identity.name, avatar: identity.avatar, isBot: false,
    hp: run.hp, energy: 0, inventory: [...run.inventory], skillLoadout: [...(run.skillLoadout ?? [])], tempSkills: run.tempCards.map(card => card.cardId),
    ...(endless ? { endlessLevel: run.endlessLevel } : {}),
    dmgBonus: run.equipment.includes('waraxe') ? .5 : 0 };
  const memory: ExpeditionBattleMemory = { ironhideUsed: false, whetstoneUsed: false, adrenalineUsed: false,
    maxHp: Object.fromEntries([hero, ...enemies].map(player => [player.id, player.id === hero.id ? run.maxHp : player.hp])),
    passives: Object.fromEntries(stage.enemies.map(enemy => [`exp_${stage.id}_${enemy.id}`, enemy.passive])),
  };
  return { run, memory, players: turnStart([hero, ...enemies], run, memory, true), logs };
}

/** Production and balance simulations share settlement, gear effects and costs. */
export function settleExpeditionRound(previous: ExpeditionRun, previousMemory: ExpeditionBattleMemory,
  revealed: Player[], turn: number, lang: Lang, random = Math.random) {
  const run = cloneRun(previous), memory = { ...previousMemory }, heroId = EXPEDITION_HERO_ID;
  const has = (id: string) => run.relics.includes(id);
  const before = revealed.find(player => player.id === heroId);
  if (!before) throw new Error('Expedition player missing');
  const protection = has('tbs') && !run.ironShirtUsed ? 'tbs' : run.equipment.includes('doll') && !run.dollUsed ? 'doll' : null;
  // The settlement boundary also normalizes old/restored snapshots before the
  // first hit. Energy, costs and non-damaging moves still use ordinary combat.
  const prepared = revealed.map(player => ({ ...player, dmgBonus: attackDamageBonus(player, run, memory) }));
  const result = calculateTurnOutcome(prepared, turn, run.stageIdx + 1, lang, { mode: 'expedition',
    damageReduction: Object.fromEntries(revealed.map(player => [player.id, player.id === heroId
      ? has('ypj') && !memory.ironhideUsed ? .5 : 0 : memory.passives[player.id]?.armorPerTurn ?? 0])),
    lethalProtection: protection ? { [heroId]: .5 } : undefined,
  });
  let players = result.players;
  const logs = [...result.logs];
  const note = (zh: string, en: string) => logs.push({ turn, type: 'info', text: lang === 'zh' ? zh : en });
  const changeHero = (fn: (player: Player) => Player) => { players = players.map(player => player.id === heroId ? fn(player) : player); };
  if (result.damageBlocked[heroId] > 0) {
    memory.ironhideUsed = true;
    note(`硬皮甲减伤 ${result.damageBlocked[heroId]}。`, `Ironhide blocked ${result.damageBlocked[heroId]} damage.`);
  }
  for (const enemy of revealed.filter(player => player.id !== heroId)) if (result.damageBlocked[enemy.id] > 0) {
    note(`${enemy.name}护甲减伤 ${result.damageBlocked[enemy.id]}。`, `${enemy.name}'s armor blocked ${result.damageBlocked[enemy.id]} damage.`);
  }
  if (result.protectionUsed[heroId] && protection) {
    if (protection === 'tbs') run.ironShirtUsed = true;
    else {
      run.dollUsed = true;
      run.equipment = run.equipment.filter(id => id !== 'doll');
    }
    note(`${protection === 'tbs' ? '铁布衫' : '替身人偶'}保命：剩 0.5 血。`, `${protection === 'tbs' ? 'Iron Shirt' : 'Doll'} saved you at 0.5 HP.`);
  }
  const after = players.find(player => player.id === heroId)!;
  if (!after.isDead) {
    const kills = Math.max(0, (after.kills ?? 0) - (before.kills ?? 0));
    if (run.equipment.includes('bloodsword') && kills > 0) {
      changeHero(player => ({ ...player, hp: Math.min(run.maxHp, player.hp + kills * .5) }));
      note('嗜血剑：击杀回血。', 'Blood Sword: heal on a kill.');
    }
    if (has('fjqt') && result.defendedHits[heroId] > 0) {
      changeHero(player => ({ ...player, energy: player.energy + 1 }));
      note('反击拳套：挡住攻击，能量 +1。', 'Counter Gloves: blocked an attack, +1 Energy.');
    }
    if (has('zjling') && revealed.some(player => player.id !== heroId && !player.isDead && players.find(p => p.id === player.id)?.isDead)) {
      changeHero(player => ({ ...player, energy: player.energy + 2 }));
      note('处决令：淘汰回合，能量 +2。', 'Execution Order: elimination, +2 Energy.');
    }
    if (has('mds') && !memory.whetstoneUsed && SKILL_DB.find(card => card.id === before.selectedCardId)?.type === 'ULTIMATE') {
      memory.whetstoneUsed = true;
      changeHero(player => ({ ...player, energy: player.energy + 2 }));
      note('磨刀石：首次终极返还 2 能量。', 'Whetstone: first Ultimate refunds 2 Energy.');
    }
    if (has('jsn') && !memory.adrenalineUsed && result.damageTaken[heroId] > 0) {
      memory.adrenalineUsed = true;
      changeHero(player => ({ ...player, energy: player.energy + 2 }));
      note('肾上腺素：受伤后能量 +2。', 'Adrenaline: +2 Energy after damage.');
    }
  }
  run.tempCards = consumeExpeditionCard(run.tempCards, before.freeSkills?.includes(before.selectedCardId ?? '') ? null : before.selectedCardId);
  changeHero(player => ({ ...player, tempSkills: run.tempCards.map(card => card.cardId) }));
  const lost = after.isDead, won = !lost && players.every(player => player.id === heroId || player.isDead);
  const freshWin = won && (run.difficulty === 'endless'
    ? run.stageIdx > (run.endlessClearedStageIdx ?? -1) : !run.crownCleared!.includes(run.stageIdx));
  const stage = getExpeditionStage(run.stageIdx, run.difficulty);
  if (!stage) throw new Error('Unknown expedition stage');
  const gold = freshWin ? (goldForWin(run.stageIdx, stage, random)
    + (run.equipment.includes('treasurepot') ? 4 : 0) + (run.route === 'risk' && run.stageIdx >= 3 ? EXPEDITION_CHALLENGE_GOLD : 0))
    * getExpeditionDifficulty(run.difficulty).goldMultiplier : 0;
  if (freshWin) {
    if (run.difficulty !== 'endless') run.crownCleared = [...run.crownCleared!, run.stageIdx].sort((a, b) => a - b);
    if (has('zstai')) changeHero(player => ({ ...player, hp: Math.min(run.maxHp, player.hp + .5) }));
    run.gold += gold;
    note(`过关 · 金币 +${gold}`, `Cleared · +${gold} gold`);
    if (run.difficulty === 'endless') {
      run.endlessClearedStageIdx = run.stageIdx;
      // Read this encounter's actual participants, including opponents defeated
      // on earlier turns. The run's enemy level may already target a future fight.
      const defeatedLevels = revealed.filter(player => player.id !== heroId).map(getPlayerLevel);
      run.endlessLevel = Math.max(run.endlessLevel ?? levelOf(run), ...defeatedLevels.map(level => level + 1));
      run.endlessEnemyLevel = Math.max(run.endlessEnemyLevel ?? 1, run.endlessLevel + 1);
      if (EXPEDITION_SKILL_LEVELS.includes(run.endlessLevel)) Object.assign(run, grantSkillLevel(run, run.endlessLevel));
      changeHero(player => ({ ...player, endlessLevel: run.endlessLevel, inventory: [...run.inventory],
        skillLoadout: [...(run.skillLoadout ?? [])] }));
      note(`战胜最高 Lv.${Math.max(0, ...defeatedLevels)} 的对手，升至 Lv.${run.endlessLevel}。`,
        `Defeated opponents up to Lv.${Math.max(0, ...defeatedLevels)}; advanced to Lv.${run.endlessLevel}.`);
    }
  }
  run.hp = Math.max(0, Math.min(run.maxHp, players.find(player => player.id === heroId)!.hp));
  if (!won && !lost) players = turnStart(players, run, memory, false);
  return { run, memory, players, logs, won, lost, gold,
    damageTaken: result.damageTaken, defendedHits: result.defendedHits, damageBlocked: result.damageBlocked, protectionUsed: result.protectionUsed };
}

export function takeExpeditionReward(previous: ExpeditionRun, reward: RewardOption): ExpeditionRun {
  const run = cloneRun(previous);
  if (reward.kind === 'heal') run.hp = Math.min(run.maxHp, run.hp + reward.amount);
  if (reward.kind === 'maxhp') {
    const gain = Math.min(EXPEDITION_VIGOR_HP, Math.max(0, EXPEDITION_MAX_HP - run.maxHp));
    run.maxHp += gain; run.hp = Math.min(run.maxHp, run.hp + gain);
  }
  if (reward.kind === 'levelup' && run.difficulty !== 'endless' && reward.level === nextExpeditionLevel(run.inventory)) Object.assign(run, grantSkillLevel(run, reward.level));
  if (reward.kind === 'temp') addCard(run, reward.cardId, reward.uses);
  if (reward.kind === 'relic' && !run.relics.includes(reward.relicId)) run.relics.push(reward.relicId);
  return run;
}

export function buyExpeditionItem(previous: ExpeditionRun, item: ShopItem, random = Math.random): ExpeditionRun {
  const run = cloneRun(previous), price = item.kind === 'equipment' ? item.equipment.price : item.price;
  if (run.gold < price || (item.kind === 'equipment' && run.equipment.includes(item.equipment.id))) return run;
  if (item.kind === 'potion' && run.hp >= run.maxHp) return run;
  if (item.kind === 'equipment' && (
    (item.equipment.id === 'doll' && run.dollUsed)
    || (item.equipment.id === 'lifegem' && run.maxHp >= EXPEDITION_MAX_HP && run.hp >= run.maxHp)
    || (item.equipment.id === 'levelbadge' && (run.difficulty === 'endless' || nextExpeditionLevel(run.inventory) === null))
  )) return run;
  run.gold -= price;
  if (item.kind === 'potion') run.hp = Math.min(run.maxHp, run.hp + POTION_HEAL);
  if (item.kind === 'tempcard') addCard(run, item.cardId, item.uses);
  if (item.kind === 'equipment') {
    const id = item.equipment.id;
    run.equipment.push(id);
    if (id === 'lifegem') {
      const gain = Math.min(1, Math.max(0, EXPEDITION_MAX_HP - run.maxHp));
      run.maxHp += gain; run.hp = Math.min(run.maxHp, run.hp + 1);
    }
    const nextLevel = nextExpeditionLevel(run.inventory);
    if (id === 'levelbadge' && nextLevel !== null) Object.assign(run, grantSkillLevel(run, nextLevel));
    if (id === 'skillcharm') addCard(run, drawGachaCard(levelOf(run), run.stageIdx, random).cardId, EXPEDITION_SKILLCHARM_USES);
  }
  return run;
}

export function takeExpeditionRoute(previous: ExpeditionRun, route: ExpeditionRoute): ExpeditionRun {
  const run = cloneRun(previous);
  if (run.difficulty === 'endless') {
    if ((run.endlessClearedStageIdx ?? -1) < run.stageIdx || (run.endlessRouteStageIdx ?? -1) >= run.stageIdx) return run;
    run.endlessRouteStageIdx = run.stageIdx;
  }
  run.route = run.stageIdx >= 2 ? route : 'rest';
  if (run.route === 'rest') run.hp = Math.min(run.maxHp, run.hp + EXPEDITION_REST_HEAL);
  return run;
}
