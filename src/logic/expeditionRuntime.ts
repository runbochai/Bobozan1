import type { Lang, LogEntry, Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { EXPEDITION_STAGES, EXPEDITION_VIGOR_HP, EXPEDITION_WARMUP_ENERGY, EXPEDITION_MONEYTREE_CAP,
  EXPEDITION_SKILLCHARM_USES, EXPEDITION_REST_HEAL, EXPEDITION_CHALLENGE_HP, EXPEDITION_CHALLENGE_GOLD,
  drawGachaCard, type ExpeditionEnemyDef } from '../data/expedition';
import { calculateTurnOutcome } from './combat';
import { consumeExpeditionCard, EXPEDITION_START_HP, EXPEDITION_MAX_HP, expeditionLevel, nextExpeditionLevel, goldForWin, POTION_HEAL, type RewardOption, type ShopItem } from './expedition';
import { grantSkillLevel, normalizeSkillLoadout, type SkillLoadoutState } from './skillLoadout';

export type ExpeditionRoute = 'rest' | 'risk';
export type ExpeditionHistory = Record<string, string[]>;
export interface ExpeditionRun extends SkillLoadoutState {
  stageIdx: number; relics: string[]; inventory: number[]; hp: number; maxHp: number;
  tempCards: { cardId: string; usesLeft: number }[]; gold: number; equipment: string[];
  ironShirtUsed: boolean; dollUsed: boolean; route: ExpeditionRoute;
}
export interface ExpeditionBattleMemory {
  maxHp: Record<string, number>;
  passives: Record<string, ExpeditionEnemyDef['passive']>;
  ironhideUsed: boolean; whetstoneUsed: boolean; adrenalineUsed: boolean;
}
export const EXPEDITION_HERO_ID = 'exp_me';
const cloneRun = (run: ExpeditionRun): ExpeditionRun => ({ ...run, relics: [...run.relics], inventory: [...run.inventory],
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

export function createExpeditionRun(): ExpeditionRun {
  return { stageIdx: 0, relics: [], inventory: [0], skillLoadout: [], hp: EXPEDITION_START_HP, maxHp: EXPEDITION_START_HP,
    tempCards: [], gold: 0, equipment: [], ironShirtUsed: false, dollUsed: false, route: 'rest' };
}

/** The same public, resolved history feeds the UI and the enemy's next decision. */
export function recordExpeditionHistory(history: ExpeditionHistory, revealed: readonly Player[]): ExpeditionHistory {
  const next = { ...history };
  for (const player of revealed) if (!player.isDead && player.selectedCardId) {
    next[player.id] = [...(history[player.id] ?? []), player.selectedCardId].slice(-3);
  }
  return next;
}

function turnStart(players: Player[], run: ExpeditionRun, memory: ExpeditionBattleMemory, first: boolean) {
  return players.map(player => {
    if (player.isDead) return player;
    const passive = memory.passives[player.id];
    const enraged = player.hp <= (memory.maxHp[player.id] ?? player.hp) / 2;
    return { ...player,
      energy: player.energy + (first && player.id === EXPEDITION_HERO_ID && run.relics.includes('rxyd') ? EXPEDITION_WARMUP_ENERGY : 0)
        + (enraged ? passive?.enrageEnergy ?? passive?.energyPerTurn ?? 0 : passive?.energyPerTurn ?? 0),
      dmgBonus: (player.id === EXPEDITION_HERO_ID && run.equipment.includes('waraxe') ? .5 : passive?.attackBonus ?? 0)
        + (enraged ? passive?.enrageDmg ?? 0 : 0),
    };
  });
}

export function setupExpeditionStage(previous: ExpeditionRun, stageIdx: number,
  identity: { name: string; avatar: string; lang: Lang }, random = Math.random) {
  const run: ExpeditionRun = normalizeSkillLoadout(cloneRun(previous)), stage = EXPEDITION_STAGES[stageIdx];
  if (!stage) throw new Error('Unknown expedition stage');
  run.stageIdx = stageIdx;
  const logs: LogEntry[] = [{ turn: 1, text: `${stage.chapter[identity.lang]} · ${stage.name[identity.lang]}`, type: 'info' }];
  if (run.equipment.includes('luckydice')) {
    const card = drawGachaCard(levelOf(run), stageIdx, random);
    addCard(run, card.cardId, 1);
  }
  if (run.equipment.includes('moneytree')) run.gold += Math.min(EXPEDITION_MONEYTREE_CAP, Math.max(1, Math.floor(run.gold / 10)));
  const base = { isDead: false, layer: 0, tempLayerMod: 0, selectedCardId: null, lastCardId: null, lastAction: null,
    disabledSkills: [], freeSkills: [], kills: 0, tempSkills: [] };
  const enemies: Player[] = stage.enemies.map(enemy => ({ ...base, id: `exp_${stage.id}_${enemy.id}`,
    name: enemy.name[identity.lang], avatar: `avatars/enemies/${enemy.avatarId ?? enemy.id}.webp`, isBot: true,
    hp: enemy.hp + (run.route === 'risk' && stageIdx >= 3 ? EXPEDITION_CHALLENGE_HP : 0), energy: enemy.passive?.startEnergy ?? 0,
    ...resolveExpeditionEnemyLoadout(enemy, run.inventory), dmgBonus: enemy.passive?.attackBonus ?? 0,
    energyDrain: enemy.passive?.energyDrain ?? 0, pierce: enemy.passive?.pierce ?? false,
  }));
  for (const [index, enemy] of stage.enemies.entries()) {
    if (enemy.levelAdvantage && expeditionLevel(enemies[index].inventory) <= levelOf(run)) {
      logs.push({ turn: 1, type: 'info', text: identity.lang === 'zh'
        ? `${enemy.name.zh}已使用现有最高等级技能，本战不再高于你的等级。`
        : `${enemy.name.en} uses the highest existing skill level; this encounter does not exceed your level.` });
    }
  }
  const hero: Player = { ...base, id: EXPEDITION_HERO_ID, name: identity.name, avatar: identity.avatar, isBot: false,
    hp: run.hp, energy: 0, inventory: [...run.inventory], skillLoadout: [...(run.skillLoadout ?? [])], tempSkills: run.tempCards.map(card => card.cardId),
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
  const result = calculateTurnOutcome(revealed, turn, run.stageIdx + 1, lang, { mode: 'expedition',
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
  const gold = won ? goldForWin(run.stageIdx, EXPEDITION_STAGES[run.stageIdx], random)
    + (run.equipment.includes('treasurepot') ? 4 : 0) + (run.route === 'risk' && run.stageIdx >= 3 ? EXPEDITION_CHALLENGE_GOLD : 0) : 0;
  if (won) {
    if (has('zstai')) changeHero(player => ({ ...player, hp: Math.min(run.maxHp, player.hp + .5) }));
    run.gold += gold;
    note(`过关 · 金币 +${gold}`, `Cleared · +${gold} gold`);
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
  if (reward.kind === 'levelup' && reward.level === nextExpeditionLevel(run.inventory)) Object.assign(run, grantSkillLevel(run, reward.level));
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
    || (item.equipment.id === 'levelbadge' && nextExpeditionLevel(run.inventory) === null)
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
  run.route = run.stageIdx >= 2 ? route : 'rest';
  if (run.route === 'rest') run.hp = Math.min(run.maxHp, run.hp + EXPEDITION_REST_HEAL);
  return run;
}
