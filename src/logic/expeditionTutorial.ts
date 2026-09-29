import { EXPEDITION_TUTORIALS } from '../data/expedition';

/** Keep the practice opponent consistent with the instruction and its energy budget. */
export function tutorialEnemyMove(stageId: string, stepIndex: number, energy: number): string | undefined {
  if (!EXPEDITION_TUTORIALS[stageId]?.[stepIndex]) return undefined;
  if (stageId === 's2') return 'defend';
  if (stageId === 's1' && EXPEDITION_TUTORIALS[stageId][stepIndex].highlight === 'defend' && energy >= 1) return 'hong';
  return 'charge';
}
