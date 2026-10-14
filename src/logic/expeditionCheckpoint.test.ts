import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPEDITION_STAGES } from '../data/expedition';
import { EXPEDITION_BEST_KEY } from './expedition';
import { createExpeditionRun, setupExpeditionStage } from './expeditionRuntime';
import {
  clearExpeditionCheckpoint, createExpeditionCheckpoint, createExpeditionCheckpointRandom,
  EXPEDITION_CHECKPOINT_KEY, loadExpeditionCheckpoint, saveExpeditionCheckpoint,
} from './expeditionCheckpoint';
import { hasSkillOverflow } from './skillLoadout';

function withStorage(check: (data: Map<string, string>) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  } });
  try { check(data); }
  finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

const identity = { name: '回家吃饭', avatar: 'avatars/bdrag.png', lang: 'zh' as const };
const input = () => ({ run: { ...createExpeditionRun(), stageIdx: 3, gold: 80, hp: 2.5,
  relics: ['ypj', 'tbs'], equipment: ['luckydice', 'moneytree'],
  tempCards: [{ cardId: 'pegasus', usesLeft: 2 }], crownCleared: [0, 1, 2] },
  stageIdx: 4, heroHistory: ['charge', 'hong', 'defend'], name: identity.name, avatar: identity.avatar, setupSeed: 123456 });

test('checkpoint round trip preserves local progression and identity without shared mutable arrays', () => withStorage(() => {
  const before = input();
  const original = structuredClone(before);
  const saved = saveExpeditionCheckpoint(before, 42)!;
  assert.ok(saved);
  assert.deepEqual(before, original);
  assert.deepEqual(loadExpeditionCheckpoint(), saved);
  before.run.tempCards[0].usesLeft = 100;
  before.run.relics.push('rxyd');
  before.heroHistory.push('charge');
  assert.equal(saved.run.tempCards[0].usesLeft, 2);
  assert.deepEqual(saved.run.relics, ['ypj', 'tbs']);
  const loaded = loadExpeditionCheckpoint()!;
  loaded.run.inventory.push(1);
  loaded.run.tempCards.length = 0;
  assert.deepEqual(loadExpeditionCheckpoint(), saved);
}));

test('reload restarts the current battle with the same dice, one money bonus and unchanged pre-battle resources', () => withStorage(() => {
  const saved = saveExpeditionCheckpoint(input())!;
  const start = () => {
    const checkpoint = loadExpeditionCheckpoint()!;
    return setupExpeditionStage(checkpoint.run, checkpoint.stageIdx, identity, createExpeditionCheckpointRandom(checkpoint));
  };
  const first = start();
  assert.equal(first.run.gold, 84);
  assert.equal(first.run.tempCards.reduce((sum, card) => sum + card.usesLeft, 0), 3);
  first.run.hp = .5;
  first.run.gold = 900;
  assert.deepEqual(start(), start());
  assert.equal(start().run.hp, 2.5);
  assert.equal(start().run.gold, 84);
  assert.deepEqual(loadExpeditionCheckpoint(), saved, 'Setup and a partial battle cannot overwrite the restart point');
}));

test('difficulty is preserved, and endless progression above the finite map remains resumable', () => withStorage(() => {
  for (const difficulty of ['beginner', 'normal', 'endless'] as const) {
    const run = createExpeditionRun(difficulty);
    if (difficulty === 'endless') Object.assign(run, { stageIdx: 999, endlessLevel: 202,
      endlessEnemyLevel: 204, endlessDefeats: 7, endlessEnteredStageIdx: 999,
      endlessClearedStageIdx: 998, endlessRouteStageIdx: 998 });
    const saved = saveExpeditionCheckpoint({ run, stageIdx: difficulty === 'endless' ? 999 : 0 })!;
    assert.equal(loadExpeditionCheckpoint()!.run.difficulty, difficulty);
    assert.deepEqual(loadExpeditionCheckpoint(), saved);
  }
}));

test('legacy skill loadouts remain intact so the UI can request a real overflow choice', () => withStorage(() => {
  const run = createExpeditionRun();
  run.inventory = [0, 1, 2, 3, 4];
  delete run.skillLoadout;
  assert.ok(saveExpeditionCheckpoint({ run, stageIdx: 5 }));
  const restored = loadExpeditionCheckpoint()!;
  assert.equal(restored.run.skillLoadout, undefined);
  assert.equal(hasSkillOverflow(restored.run), true);
}));

test('invalid versions, corruption, foreign content, numbers and oversized data never become checkpoints', () => withStorage(data => {
  const valid = createExpeditionCheckpoint(input(), 42)!;
  const malformed = [
    '', 'null', '{', '[]', JSON.stringify({ ...valid, version: 0 }), JSON.stringify({ ...valid, version: 2 }),
    JSON.stringify({ ...valid, stageIdx: EXPEDITION_STAGES.length }),
    JSON.stringify({ ...valid, run: { ...valid.run, difficulty: 'expert' } }),
    JSON.stringify({ ...valid, run: { ...valid.run, inventory: [0, 9000] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, skillLoadout: ['not-a-skill'] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, skillLoadout: ['pegasus'] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, relics: ['not-a-relic'] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, equipment: ['not-equipment'] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, tempCards: [{ cardId: 'missing', usesLeft: 1 }] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, tempCards: [{ cardId: 'hong', usesLeft: 0 }] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, hp: 0 } }),
    JSON.stringify({ ...valid, run: { ...valid.run, maxHp: 6 } }),
    JSON.stringify({ ...valid, run: { ...valid.run, gold: -1 } }),
    JSON.stringify({ ...valid, run: { ...valid.run, gold: Number.MAX_SAFE_INTEGER + 1 } }),
    JSON.stringify({ ...valid, run: { ...valid.run, stageIdx: 1.5 } }),
    JSON.stringify({ ...valid, run: { ...valid.run, crownCleared: [1, 1] } }),
    JSON.stringify({ ...valid, run: { ...valid.run, relics: Array(10000).fill('ypj') } }),
    JSON.stringify({ ...valid, heroHistory: Array(13).fill('charge') }),
    JSON.stringify({ ...valid, heroHistory: ['never-revealed-card'] }),
    JSON.stringify({ ...valid, savedAt: -1 }),
    JSON.stringify({ ...valid, setupSeed: 2 ** 32 }),
    JSON.stringify({ ...valid, name: 'a'.repeat(256 * 1024) }),
  ];
  for (const raw of malformed) {
    data.set(EXPEDITION_CHECKPOINT_KEY, raw);
    assert.equal(loadExpeditionCheckpoint(), null, raw.slice(0, 180));
  }
  for (const bad of [NaN, Infinity, -Infinity]) {
    assert.equal(createExpeditionCheckpoint({ ...input(), run: { ...input().run, hp: bad } }), null);
    assert.equal(createExpeditionCheckpoint(input(), bad), null);
  }
}));

test('only explicit public campaign fields are serialized; clearing leaves records and other storage alone', () => withStorage(data => {
  const source = input();
  Object.defineProperty(source.run, 'selectedCardId', { get() { throw new Error('Hidden move inspected'); } });
  Object.defineProperty(source.run, 'room', { get() { throw new Error('Room inspected'); } });
  assert.ok(saveExpeditionCheckpoint(source));
  const raw = data.get(EXPEDITION_CHECKPOINT_KEY)!;
  assert.equal(raw.includes('selectedCardId'), false);
  assert.equal(raw.includes('room'), false);
  data.set(EXPEDITION_BEST_KEY, '9');
  data.set('account-settings', 'keep');
  clearExpeditionCheckpoint();
  assert.equal(loadExpeditionCheckpoint(), null);
  assert.equal(data.get(EXPEDITION_BEST_KEY), '9');
  assert.equal(data.get('account-settings'), 'keep');
}));

test('blocked storage and quota failure cannot interrupt play, and invalid saves do not replace a valid checkpoint', () => withStorage(data => {
  const saved = saveExpeditionCheckpoint(input())!;
  assert.equal(saveExpeditionCheckpoint({ ...input(), run: { ...input().run, gold: NaN } }), null);
  assert.deepEqual(loadExpeditionCheckpoint(), saved);
  assert.equal(data.size, 1);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
  assert.equal(loadExpeditionCheckpoint(), null);
  assert.equal(saveExpeditionCheckpoint(input()), null);
  assert.doesNotThrow(clearExpeditionCheckpoint);
  assert.ok(createExpeditionCheckpoint(input()), 'A local setup seed still works without storage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: () => { throw new Error('Read denied'); },
    setItem: () => { throw new Error('Quota exceeded'); },
    removeItem: () => { throw new Error('Write denied'); },
  } });
  assert.equal(saveExpeditionCheckpoint(input()), null);
  assert.equal(loadExpeditionCheckpoint(), null);
  assert.doesNotThrow(clearExpeditionCheckpoint);
}));
