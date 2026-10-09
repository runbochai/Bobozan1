import { EXPEDITION_SKILL_LEVELS, EXPEDITION_STAGES, type ExpeditionStage } from '../data/expedition';
import type { ExpeditionDifficulty } from '../data/expeditionDifficulty';
import { EXPEDITION_PRACTICE_STAGE_COUNT } from '../data/expeditionDifficulty';
import { SKILL_DB } from '../data/skills';
import { autoSelectSkillLoadout, getHandCategory } from './skillLoadout';

// The introductory three practice opponents only belong to finite expeditions.
const encounters = EXPEDITION_STAGES.slice(EXPEDITION_PRACTICE_STAGE_COUNT);

/** One resolver for the board, AI, rewards and dialogue; retries keep the same encounter. */
export function getExpeditionStage(stageIdx: number, difficulty: ExpeditionDifficulty = 'beginner'): ExpeditionStage | undefined {
  if (!Number.isSafeInteger(stageIdx) || stageIdx < 0) return undefined;
  if (difficulty !== 'endless') return EXPEDITION_STAGES[stageIdx];
  const template = encounters[stageIdx % encounters.length];
  return {
    ...template,
    chapter: { zh: '无尽远征', en: 'Endless Expedition' },
    name: {
      zh: `无尽第 ${stageIdx + 1} 战 · ${template.name.zh.replace(/^第\s*\d+\s*关\s*·?\s*/, '')}`,
      en: `Endless Battle ${stageIdx + 1} · ${template.name.en.replace(/^Stage\s+\d+\s*·?\s*/, '')}`,
    },
    tip: { zh: '敌人至少高你一级。战败保留成长，恢复生命后再战；敌人会再升一级。',
      en: 'Enemies stay at least one level ahead. Defeat keeps your progress and restores HP; enemies gain another level.' },
  };
}

/** Existing skills are the vocabulary; rank can keep growing without inventing new card IDs. */
export function getEndlessEnemyLoadout(level: number) {
  const inventory = [0, ...EXPEDITION_SKILL_LEVELS.filter(unlock => unlock <= level)];
  const loadout = autoSelectSkillLoadout({ inventory });
  const ordinaryAttack = SKILL_DB.filter(card => card.type === 'ATTACK' && card.tier === 2
    && card.levelRequired > 0 && card.levelRequired <= level && card.levelRequired < 100
    && !card.tags?.some(tag => ['combo', 'pierce_basic', 'break_basic', 'break_mid_def', 'hit_up', 'hit_down'].includes(tag)))
    .sort((a, b) => b.levelRequired - a.levelRequired)[0];
  // Layer-only attacks at Lv.20/21 must not displace every usable same-layer attack.
  if (ordinaryAttack && !loadout.skillLoadout.includes(ordinaryAttack.id)) {
    const attacks = loadout.skillLoadout.filter(id => getHandCategory(SKILL_DB.find(card => card.id === id)!) === 'ATTACK');
    if (attacks.length >= 3) loadout.skillLoadout = loadout.skillLoadout.filter(id => id !== attacks[0]);
    loadout.skillLoadout.push(ordinaryAttack.id);
  }
  return loadout;
}
