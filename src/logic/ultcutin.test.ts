import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { SKILL_DB } from '../data/skills';
import { pickUltCutins, isLevelUltimate, hasBattleCutin, ULT_CUTINS } from '../data/ultCutins';

const p = (patch: Partial<Player> = {}): Player => ({
  id: 'p1', name: 'p1', isBot: false, hp: 2, energy: 0, isDead: false,
  inventory: [0], layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
} as Player);

test('没人放必杀时返回空数组', () => {
  const players = [p({ selectedCardId: 'charge' }), p({ id: 'e1', selectedCardId: 'defend' })];
  assert.deepEqual(pickUltCutins(players, SKILL_DB, 'zh'), []);
});

test('有人放必杀时返回对应立绘', () => {
  const players = [p({ selectedCardId: 'meteor', name: '润博' }), p({ id: 'e1', selectedCardId: 'charge' })];
  const picks = pickUltCutins(players, SKILL_DB, 'zh');
  assert.equal(picks.length, 1);
  assert.equal(picks[0].def.skillId, 'meteor');
  assert.equal(picks[0].playerName, '润博');
  assert.equal(picks[0].skillName, '流星坠');
});

test('多个必杀同屏：全部返回，按出场顺序（同 tier）', () => {
  const players = [
    p({ id: 'a', selectedCardId: 'meteor' }),
    p({ id: 'b', selectedCardId: 'superwave' }),
  ];
  const picks = pickUltCutins(players, SKILL_DB, 'zh');
  assert.equal(picks.length, 2);
  assert.equal(picks[0].def.skillId, 'meteor');
  assert.equal(picks[1].def.skillId, 'superwave');
});

test('阵亡玩家的必杀不参与', () => {
  const players = [p({ selectedCardId: 'meteor', isDead: true }), p({ id: 'e1', selectedCardId: 'charge' })];
  assert.deepEqual(pickUltCutins(players, SKILL_DB, 'zh'), []);
});

test('every level ultimate and combo has a complete cut-in definition', () => {
  const ults = SKILL_DB.filter(c => isLevelUltimate(c) || c.tags?.includes('combo'));
  assert.ok(ults.length > 0);
  for (const u of ults) {
    assert.ok(ULT_CUTINS[u.id], `missing cutin for ${u.id}`);
    assert.equal(hasBattleCutin(u), true);
    assert.ok(ULT_CUTINS[u.id].shouts.zh.length && ULT_CUTINS[u.id].shouts.en.length);
  }
});

test('basic KaJi moves retain their short field-only presentation', () => {
  for (const id of ['ka', 'ji', 'kajifen', 'kajisuper']) {
    const card = SKILL_DB.find(c => c.id === id);
    assert.ok(card, `missing card ${id}`);
    assert.equal(isLevelUltimate(card), false);
    assert.equal(hasBattleCutin(card), false);
    assert.deepEqual(pickUltCutins([p({ selectedCardId: id })], SKILL_DB, 'zh'), []);
  }
});

test('all five combos trigger cut-ins, including defensive and attack combinations', () => {
  const combos = SKILL_DB.filter(c => c.tags?.includes('combo'));
  assert.equal(combos.length, 5);
  const types = combos.map(c => c.type);
  assert.ok(types.includes('SPECIAL') && types.includes('ATTACK'));
  for (const card of combos) {
    assert.equal(isLevelUltimate(card), false, 'presentation must not reclassify combat rules');
    for (const lang of ['zh', 'en'] as const) {
      const picks = pickUltCutins([p({ selectedCardId: card.id })], SKILL_DB, lang);
      assert.equal(picks.length, 1);
      assert.equal(picks[0].def.combo, card.id);
      assert.equal(picks[0].skillName, card.name[lang]);
    }
  }
});

test('mixed cut-ins keep tier priority, stable ties and exclude dead or unknown moves', () => {
  const ids = ['allbomb', 'meteor', 'skydragon', 'heartpoison', 'doublewing', 'vajra', 'unknown'];
  const players = ids.map((id, i) => p({ id: String(i), selectedCardId: id, isDead: id === 'vajra' }));
  const snapshot = JSON.stringify(players);
  assert.deepEqual(pickUltCutins(players, SKILL_DB, 'zh').map(pick => pick.def.skillId), ['skydragon', 'heartpoison', 'meteor', 'allbomb', 'doublewing']);
  assert.equal(JSON.stringify(players), snapshot);
  assert.equal(hasBattleCutin({ ...SKILL_DB.find(c => c.id === 'skydragon')!, id: 'unknown-combo' }), false);
});
