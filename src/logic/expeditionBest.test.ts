import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPEDITION_STAGES } from '../data/expedition';
import { EXPEDITION_BEST_KEY, EXPEDITION_BEST_KEYS, loadExpeditionBest, saveExpeditionBest } from './expedition';

function withStorage(check: (data: Map<string, string>) => void) {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const data = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  } });
  try { check(data); }
  finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

test('legacy records belong to beginner; normal records start independently and never overwrite them', () => withStorage(data => {
  data.set(EXPEDITION_BEST_KEY, '12');
  assert.equal(loadExpeditionBest(), 12);
  assert.equal(loadExpeditionBest('beginner'), 12);
  assert.equal(loadExpeditionBest('normal'), 0);
  saveExpeditionBest(5, 'normal');
  assert.equal(loadExpeditionBest('normal'), 5);
  assert.equal(loadExpeditionBest(), 12);
  saveExpeditionBest(15);
  saveExpeditionBest(3, 'normal');
  saveExpeditionBest(2, 'beginner');
  assert.equal(loadExpeditionBest('normal'), 5);
  assert.equal(loadExpeditionBest('beginner'), 15);
  assert.equal(data.size, 2, 'No duplicate migration key or implicit copying');
}));

test('malformed or invalid progress in one difficulty does not damage the other record', () => withStorage(data => {
  data.set(EXPEDITION_BEST_KEY, '9');
  for (const raw of ['NaN', '-1', '1.5', 'Infinity', String(EXPEDITION_STAGES.length + 1)]) {
    data.set(EXPEDITION_BEST_KEYS.normal, raw);
    assert.equal(loadExpeditionBest('normal'), 0);
    assert.equal(loadExpeditionBest(), 9);
  }
  saveExpeditionBest(EXPEDITION_STAGES.length, 'normal');
  for (const value of [-1, .5, Infinity, NaN, EXPEDITION_STAGES.length + 1]) saveExpeditionBest(value, 'normal');
  assert.equal(loadExpeditionBest('normal'), EXPEDITION_STAGES.length);
  assert.equal(loadExpeditionBest('beginner'), 9);
}));

test('disabled browser storage never prevents a run from ending in either difficulty', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage denied'); } });
    for (const difficulty of ['beginner', 'normal'] as const) {
      assert.equal(loadExpeditionBest(difficulty), 0);
      assert.doesNotThrow(() => saveExpeditionBest(3, difficulty));
    }
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem: () => '1', setItem: () => { throw new Error('Storage quota exceeded'); },
    } });
    assert.doesNotThrow(() => saveExpeditionBest(3, 'normal'));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
