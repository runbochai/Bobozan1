import test from 'node:test';
import assert from 'node:assert/strict';
import { EXPEDITION_TUTORIALS } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import { calculateTurnOutcome } from './combat';
import { tutorialEnemyMove } from './expeditionTutorial';
import type { Player } from '../types';

for (const stageId of ['s0', 's1', 's2']) {
  test(`${stageId}: instructions are affordable, safe and finish the practice battle`, () => {
    const make = (id: string, hp: number): Player => ({ id, name: id, hp, energy: 0, isDead: false,
      isBot: id !== 'me', inventory: [0], layer: 0, tempLayerMod: 0,
      selectedCardId: null, lastCardId: null, lastAction: null });
    let players = [make('me', 1), make('enemy', 1)];
    let turn = 1;
    for (const [index, step] of EXPEDITION_TUTORIALS[stageId].entries()) {
      if (!step.highlight) continue;
      const card = SKILL_DB.find(c => c.id === step.highlight)!;
      assert.ok(card, 'highlight must name a concrete card');
      assert.ok(players[0].energy >= card.cost, `${card.id} must be affordable`);
      const enemyMove = tutorialEnemyMove(stageId, index, players[1].energy)!;
      assert.ok(players[1].energy >= SKILL_DB.find(c => c.id === enemyMove)!.cost);
      players = calculateTurnOutcome(players.map((p, i) => ({ ...p, selectedCardId: i === 0 ? card.id : enemyMove })), turn++, 1, 'zh').players.sort((a, b) => Number(b.id === 'me') - Number(a.id === 'me'));
      assert.equal(players[0].isDead, false);
      assert.equal(players[0].hp, 1, 'correct tutorial actions should not cost HP');
    }
    assert.equal(players[1].isDead, true);
  });
}

test('skipped, completed and non-tutorial stages retain normal AI', () => {
  assert.equal(tutorialEnemyMove('s0', 999, 0), undefined);
  assert.equal(tutorialEnemyMove('s2', EXPEDITION_TUTORIALS.s2.length, 0), undefined);
  assert.equal(tutorialEnemyMove('s3', 0, 0), undefined);
});
