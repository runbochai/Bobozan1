import test from 'node:test';
import assert from 'node:assert/strict';
import { readAppearance, saveAppearance } from './appearance';

test('edition selection persists separately from shared room and player preferences', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>([['bobozan-player-name', '好友']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    assert.equal(readAppearance(), 'current');
    saveAppearance('retro');
    assert.equal(readAppearance(), 'retro');
    saveAppearance('current');
    assert.equal(readAppearance(), 'current');
    assert.equal(values.get('bobozan-player-name'), '好友');
    values.set('bobozan-appearance', 'unknown');
    assert.equal(readAppearance(), 'current');
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('disabled storage still allows a player to use and switch editions', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  try {
    assert.equal(readAppearance(), 'current');
    assert.doesNotThrow(() => saveAppearance('retro'));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
