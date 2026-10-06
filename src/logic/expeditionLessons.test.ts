import test from 'node:test';
import assert from 'node:assert/strict';
import { getExpeditionLesson, type ExpeditionLessonContext } from '../data/expeditionLessons';
import { SKILL_DB } from '../data/skills';
import type { Player } from '../types';
import { calculateTurnOutcome, getPlayerCards } from './combat';
import { recordExpeditionHistory } from './expeditionRuntime';

const fighter = (id: string, selectedCardId: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: id !== 'hero', hp: 3, energy: 10, inventory: [0, 1, 2, 3, 4, 5],
  isDead: false, layer: 0, tempLayerMod: 0, selectedCardId, lastCardId: null, lastAction: null,
  ...patch,
});
const context = (stageIdx: number, patch: Partial<ExpeditionLessonContext> = {}): ExpeditionLessonContext => ({
  stageIdx, turn: 2, hero: fighter('hero', 'charge'), opponents: [fighter('enemy', 'charge')],
  history: {}, legalCardIds: ['charge', 'hong', 'hong2', 'defend', 'ka'], ...patch,
});
const card = (id: string) => {
  const found = SKILL_DB.find(item => item.id === id);
  assert.ok(found, `Unknown lesson card: ${id}`);
  return found;
};
const resolve = (players: Player[]) => calculateTurnOutcome(players, 1, 1, 'zh', { mode: 'expedition' });
const after = (result: ReturnType<typeof resolve>, id: string) => result.players.find(player => player.id === id)!;
const duel = (own: string, other: string) => resolve([fighter('hero', own), fighter('enemy', other)]);

// Execute the actual cards selected for the coach's visible comparison, so a
// future text/card change cannot leave a plausible-looking but false diagram.
for (const scenario of [
  { stage: 2, upgraded: false, id: 'break-defense', relation: '>' },
  { stage: 3, upgraded: false, id: 'attack-tiers', relation: '>' },
  { stage: 3, upgraded: true, id: 'one-energy-upgrade', relation: '=' },
  { stage: 6, upgraded: true, id: 'same-tier-level', relation: '>' },
] as const) {
  test(`coach ${scenario.id}: the displayed comparison resolves as advertised`, () => {
    const hint = getExpeditionLesson(context(scenario.stage, {
      legalCardIds: scenario.upgraded ? ['charge', 'hong', 'hong2', 'pegasus', 'dragonclaw'] : ['charge', 'hong', 'hong2'],
    }));
    assert.equal(hint.id, scenario.id);
    assert.equal(hint.relation, scenario.relation);
    assert.equal(hint.cardIds.length, 2);
    const players = hint.cardIds.map((id, index) => fighter(index === 0 ? 'hero' : 'enemy', id));
    for (const player of players) {
      assert.ok(getPlayerCards(player, players).some(item => item.id === player.selectedCardId), 'Examples must be playable cards');
      assert.ok(card(player.selectedCardId!).cost <= player.energy);
    }
    const result = resolve(players);
    assert.equal(result.damageTaken.hero, 0);
    assert.equal(result.damageTaken.enemy, scenario.relation === '>' ? 1 : 0);
    for (const player of players) {
      assert.equal(after(result, player.id).energy, player.energy - card(player.selectedCardId!).cost,
        'Winning or tying still spends the displayed card cost');
    }
  });
}

test('the charge-opening sequence gains two energy, then a one-cost hit interrupts the opposing Charge', () => {
  const [charge, attack] = getExpeditionLesson(context(0)).cardIds;
  const opening = resolve([fighter('hero', charge, { energy: 0 }), fighter('enemy', 'defend', { energy: 0 })]);
  assert.equal(after(opening, 'hero').energy, 2);
  assert.equal(opening.damageTaken.hero, 0);
  const followup = resolve(opening.players.map(player => ({ ...player, selectedCardId: player.id === 'hero' ? attack : charge })));
  assert.equal(after(followup, 'hero').energy, 1);
  assert.equal(followup.damageTaken.enemy, 1);
  assert.equal(after(followup, 'enemy').energy, 0, 'A full hit interrupts Charge instead of giving two energy');
});

test('the defense-counter sequence conserves energy, but an empty opponent can still block the counter', () => {
  const [defend, attack] = getExpeditionLesson(context(1)).cardIds;
  const blocked = resolve([fighter('hero', defend, { energy: 1 }), fighter('enemy', attack, { energy: 1 })]);
  assert.equal(blocked.defendedHits.hero, 1);
  assert.equal(after(blocked, 'hero').energy, 1);
  assert.equal(after(blocked, 'enemy').energy, 0);
  const counter = (response: string) => resolve(blocked.players.map(player => ({
    ...player, selectedCardId: player.id === 'hero' ? attack : response,
  })));
  assert.equal(counter('charge').damageTaken.enemy, 1);
  assert.equal(counter('defend').damageTaken.enemy, 0, 'Zero energy is an opening, not a guaranteed hit');
});

test('the defense-breaking example reaches exactly its own layer and the adjacent layers', () => {
  const [ultimate, defend] = getExpeditionLesson(context(2)).cardIds;
  assert.equal(card(ultimate).cost, 3);
  for (const offset of [-2, -1, 0, 1, 2]) {
    const result = resolve([fighter('hero', ultimate, { layer: 2 }), fighter('enemy', defend, { layer: 2 + offset })]);
    assert.equal(result.damageTaken.enemy, Math.abs(offset) <= 1 ? 1 : 0, `Layer difference ${offset}`);
    assert.equal(result.defendedHits.enemy, 0, 'An out-of-range Ultimate misses; Defend did not block it');
  }
});

test('ordinary same-tier skill levels matter without turning card level into bonus damage', () => {
  const [stronger, weaker] = getExpeditionLesson(context(6)).cardIds;
  assert.equal(card(stronger).levelRequired, 3, 'Dragon Claw is Lv.3, not Lv.2');
  assert.equal(card(weaker).levelRequired, 1);
  assert.equal(card(stronger).tier, card(weaker).tier);
  assert.equal(card(stronger).cost, 1);
  assert.equal(card(weaker).cost, 1);
  assert.equal(duel(stronger, weaker).damageTaken.enemy, 1);
  const reverse = duel(weaker, stronger);
  assert.equal(reverse.damageTaken.hero, 1);
  assert.equal(reverse.damageTaken.enemy, 0);
  assert.equal(duel('icesword', weaker).damageTaken.enemy, 1, 'Lv.2 Ice Sword demonstrates the same rule');
  const oldCard = duel('hong', 'charge');
  assert.equal(oldCard.damageTaken.enemy, 1, 'Owning advanced skills does not increase an old card’s damage');
});

test('the basic two-cost exception ties advanced tier-2 attacks, but is not a universal answer', () => {
  const [advanced] = getExpeditionLesson(context(6)).cardIds;
  for (const [own, other] of [['hong2', advanced], [advanced, 'hong2']]) {
    const result = duel(own, other);
    assert.equal(result.damageTaken.hero, 0);
    assert.equal(result.damageTaken.enemy, 0);
    assert.equal(after(result, 'hero').energy, 10 - card(own).cost);
    assert.equal(after(result, 'enemy').energy, 10 - card(other).cost);
  }
  assert.equal(duel('hong2', 'ka').damageTaken.hero, 1, 'A higher tier still beats the basic tier-2 exception');
});

test('the three-player lesson really ties one opponent while taking a hit from another', () => {
  const hint = getExpeditionLesson(context(4));
  assert.equal(hint.cardIds.length, 3);
  const players = hint.cardIds.map((id, index) => fighter(['hero', 'enemy', 'third'][index], id));
  const tiedPair = resolve(players.slice(0, 2));
  assert.equal(tiedPair.damageTaken.hero, 0);
  assert.equal(tiedPair.damageTaken.enemy, 0);
  const brawl = resolve(players);
  assert.equal(brawl.damageTaken.hero, 1);
  assert.equal(brawl.damageTaken.enemy, 1, 'Enemies fight each other as well as the hero');
  assert.equal(brawl.damageTaken.third, 0);
  assert.equal(after(brawl, 'hero').energy, 9, 'The tied pair still paid for their attacks');
});

test('history coaching only reads revealed moves, in oldest-to-newest order', () => {
  const history = { enemy: ['charge', 'hong', 'defend'] };
  const revealed = [fighter('hero', 'defend'), fighter('enemy', 'hong2')];
  const next = recordExpeditionHistory(history, revealed);
  const settled = resolve(revealed);
  assert.ok(settled.players.every(player => player.selectedCardId === null));
  const publicEnemy = Object.defineProperty({ id: 'enemy', hp: 3, energy: 2, isDead: false }, 'selectedCardId', {
    get() { throw new Error('The coach inspected a hidden committed move'); },
  });
  const hint = getExpeditionLesson(context(5, { history: next, opponents: [publicEnemy] }));
  assert.deepEqual(hint.cardIds, ['hong', 'defend', 'hong2']);
  assert.deepEqual(history.enemy, ['charge', 'hong', 'defend'], 'Recording this turn must not rewrite the previous history');
  assert.equal(hint.cardIds.includes('ka'), false);
});

test('adaptive coaching distinguishes actual defense from a harmless miss or armor preventing damage', () => {
  const cases = [
    { own: 'defend', other: 'hong', layer: 0, reduction: 0, expected: 'last-block' },
    { own: 'defend', other: 'hong', layer: 2, reduction: 0, expected: 'watch-and-adapt' },
    { own: 'defend', other: 'gun', layer: 0, reduction: 1, expected: 'watch-and-adapt' },
    { own: 'charge', other: 'hong', layer: 0, reduction: 0, expected: 'last-hit' },
  ];
  for (const item of cases) {
    const result = calculateTurnOutcome([fighter('hero', item.own), fighter('enemy', item.other, { layer: item.layer })], 1, 1, 'zh', {
      mode: 'expedition', damageReduction: { hero: item.reduction },
    });
    const hint = getExpeditionLesson(context(7, { lastResult: {
      damageTaken: result.damageTaken.hero, defendedHits: result.defendedHits.hero,
      heroCardId: item.own, opponentCardIds: [item.other],
    } }));
    assert.equal(hint.id, item.expected, `${item.own} vs ${item.other}, enemy layer ${item.layer}`);
  }
});

test('adaptive coaching reports an actual hit even when post-combat healing masks the HP loss', () => {
  const result = duel('charge', 'hong');
  const hint = getExpeditionLesson(context(7, {
    lastResult: { damageTaken: result.damageTaken.hero, defendedHits: result.defendedHits.hero,
      heroCardId: 'charge', opponentCardIds: ['hong'] },
    recap: { hpBefore: 3, hpAfter: 3, energyBefore: 0, energyAfter: 2 },
  }));
  assert.equal(hint.id, 'last-hit', 'HP deltas alone must not be misreported as a tie, a block or an energy-only turn');
});
