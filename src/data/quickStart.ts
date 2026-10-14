import type { LocalizedText } from '../types';
import { ACADEMY_LESSONS, type AcademyLesson } from './academy';

export interface QuickStartStep {
  id: string;
  title: LocalizedText;
  scene: {
    image: string;
    alt: LocalizedText;
    caption: LocalizedText;
    speech: LocalizedText;
    success: LocalizedText;
    retry: LocalizedText;
  };
  lesson: AcademyLesson;
}

const text = (zh: string, en: string): LocalizedText => ({ zh, en });

/** Reuse the multiplayer practice presets, without the optional expedition material. */
function step(id: string, title: LocalizedText, scene: QuickStartStep['scene'], explanation: LocalizedText): QuickStartStep {
  const source = ACADEMY_LESSONS.find(lesson => lesson.id === id);
  if (!source) throw new Error(`Missing quick-start exercise: ${id}`);
  return {
    id,
    title,
    scene,
    lesson: {
      ...source,
      rounds: [{ ...source.rounds[0], explanation }],
    },
  };
}

export const QUICK_START_STEPS: QuickStartStep[] = [
  step('charge', text('点起微光', 'A little light'), {
    image: 'story/lantern-origin-v1/p20-first-duel.webp',
    alt: text('阿栓坐在酒馆的练习桌对面，灯纹牌放在桌边。', 'Axle sits across the tavern table, with the lantern card beside you.'),
    caption: text('你坐了下来，把老人交给你的灯纹牌放在桌边。', 'You take a seat and set the elder’s lantern card beside you.'),
    speech: text('“先摊开练四招。这回我也攒，你先攒出一点能量。”', '“Four moves, cards face up. I’ll Charge first. Build a little energy with me.”'),
    success: text('“看，手里有光了。下一招就能派上用场。”', '“There. A little light in your hand. Now let’s put it to work.”'),
    retry: text('“挡住空气可攒不出光。别急，再试一次攒。”', '“Blocking thin air won’t build energy. Take your time. Try Charge.”'),
  }, text(
    '攒不花能量；没有被命中，就能获得 2 能量。防守不会增加能量。',
    'Charge costs nothing and gives 2 energy when you are not hit. Defending does not build energy.',
  )),
  step('catch-charge', text('抓住空档', 'An opening'), {
    image: 'story/crown-v1/prologue-3.webp',
    alt: text('阿栓在暖光下俯身看着桌上的牌。', 'Axle leans over the cards in the warm tavern light.'),
    caption: text('阿栓换了个局面，指指你手里剩下的 1 能量。', 'Axle sets up a new hand and points to your 1 energy.'),
    speech: text('“这回我还攒。你有 1 能量，试着用轰抓住这个空档。”', '“I’ll Charge again. You have 1 energy. Try Blast while I’m open.”'),
    success: text('“哎哟，抓到了！真打起来，一次命中就可能结束这一局。”', '“Ouch. You caught me! In multiplayer, one hit can end a life.”'),
    retry: text('“我忙着攒，你也没出手。用轰试试？”', '“I was busy charging, but you let me be. Try Blast?”'),
  }, text(
    '轰花 1 能量，命中造成 1 伤害，也会打断对手的攒。联机基础生命是 1，所以一次命中就能淘汰对手。',
    'Blast costs 1 energy, deals 1 damage on a hit, and interrupts Charge. Multiplayer starts at 1 HP, so one hit can eliminate an opponent.',
  )),
  step('free-defense', text('稳住这一手', 'Hold your ground'), {
    image: 'story/lantern-origin-v1/p20-first-duel.webp',
    alt: text('阿栓坐回练习桌后，等你选择下一张牌。', 'Axle waits across the practice table for your next card.'),
    caption: text('阿栓收起牌，笑着摆好另一手。这回轮到他进攻。', 'Axle gathers the cards and sets up another hand with a grin. His turn to attack.'),
    speech: text('“这回我出轰。挡住它，留住你这 1 能量，别急着拼。”', '“Blast this time. Block it and save your 1 energy. No need to rush.”'),
    success: text('“好，稳住了。防守不花能量，但也不会帮你攒。”', '“Steady. Defending saves energy, but it won’t build any.”'),
    retry: text('“试试防。攒会挨打，和我对轰又会花掉能量。”', '“Try Defend. Charge gets hit; trading Blasts spends your energy.”'),
  }, text(
    '防不花能量，能挡住轰，把能量留给下一回合。轰对轰会打平，但仍要花能量。',
    'Defend costs nothing and blocks Blast, saving your energy for later. Blast against Blast ties, but both players still spend energy.',
  )),
  step('break-defense', text('最后一招', 'One last move'), {
    image: 'story/crown-v1/prologue-3.webp',
    alt: text('灯纹牌照亮阿栓面前的牌桌。', 'The lantern card lights the table in front of Axle.'),
    caption: text('最后一手，阿栓给你摆好 3 能量，自己举起了防。', 'For the last hand, Axle sets your energy to 3 and holds up Defend.'),
    speech: text('“光会防可不行。试试咔，把我这张普通防打穿。”', '“Defense isn’t everything. Try Ka. It breaks my basic Defend.”'),
    success: text('“成了！现在我可不提前报牌了。下一桌，你自己猜。”', '“That’s it! No more announcing my cards. Your next read is yours.”'),
    retry: text('“轰会被防挡住。换成 3 能量的咔，再来。”', '“Defend blocks Blast. Try Ka with those 3 energy.”'),
  }, text(
    '咔花 3 能量，能击穿普通防。攒、攻击、防守互相牵制：观察能量，再猜对方会选什么。',
    'Ka costs 3 energy and breaks basic Defend. Charge, attacks, and defense create a guessing game: watch their energy and read their next move.',
  )),
];
