import type { LocalizedText } from '../types';
import { ACADEMY_LESSONS, type AcademyLesson } from './academy';

export interface QuickStartStep {
  id: string;
  title: LocalizedText;
  lesson: AcademyLesson;
}

const text = (zh: string, en: string): LocalizedText => ({ zh, en });

/** Reuse the multiplayer practice presets, without the optional expedition material. */
function step(id: string, title: LocalizedText, explanation: LocalizedText): QuickStartStep {
  const source = ACADEMY_LESSONS.find(lesson => lesson.id === id);
  if (!source) throw new Error(`Missing quick-start exercise: ${id}`);
  return {
    id,
    title,
    lesson: {
      ...source,
      rounds: [{ ...source.rounds[0], explanation }],
    },
  };
}

export const QUICK_START_STEPS: QuickStartStep[] = [
  step('charge', text('攒能量', 'Charge'), text(
    '攒不花能量；没有被命中，就能获得 2 能量。防守不会增加能量。',
    'Charge costs nothing and gives 2 energy when you are not hit. Defending does not build energy.',
  )),
  step('catch-charge', text('抓住攒', 'Catch a Charge'), text(
    '轰花 1 能量，命中造成 1 伤害，也会打断对手的攒。联机基础生命是 1，所以一次命中就能淘汰对手。',
    'Blast costs 1 energy, deals 1 damage on a hit, and interrupts Charge. Multiplayer starts at 1 HP, so one hit can eliminate an opponent.',
  )),
  step('free-defense', text('挡住攻击', 'Defend'), text(
    '防不花能量，能挡住轰，把能量留给下一回合。轰对轰会打平，但仍要花能量。',
    'Defend costs nothing and blocks Blast, saving your energy for later. Blast against Blast ties, but both players still spend energy.',
  )),
  step('break-defense', text('突破防守', 'Break defense'), text(
    '咔花 3 能量，能击穿普通防。攒、攻击、防守互相牵制：观察能量，再猜对方会选什么。',
    'Ka costs 3 energy and breaks basic Defend. Charge, attacks, and defense create a guessing game: watch their energy and read their next move.',
  )),
];
