import test from 'node:test';
import assert from 'node:assert/strict';
import { AVATAR_OPTIONS } from '../data/avatars';
import { DEFAULT_CHARACTER, playerCharacterOption, readPlayerCharacter, savePlayerCharacter } from './playerCharacter';

test('every chosen character retains its identity across deployment prefixes', () => {
  for (const option of AVATAR_OPTIONS) {
    assert.equal(playerCharacterOption(option.path).path, option.path);
    assert.equal(playerCharacterOption(`/Bobozan1/${option.path}?v=2`).path, option.path);
  }
  assert.equal(playerCharacterOption('unavailable').path, DEFAULT_CHARACTER);
  assert.equal(playerCharacterOption().path, DEFAULT_CHARACTER);
});

test('confirmed character preference survives a reload without overwriting other preferences', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>([['bobozan-player-name', '朋友']]);
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try {
    assert.equal(readPlayerCharacter(), DEFAULT_CHARACTER);
    savePlayerCharacter(`/Bobozan1/${AVATAR_OPTIONS[7].path}`);
    assert.equal(readPlayerCharacter(), AVATAR_OPTIONS[7].path);
    assert.equal(values.get('bobozan-player-name'), '朋友');
    values.set('bobozan-player-character', 'missing');
    assert.equal(readPlayerCharacter(), DEFAULT_CHARACTER);
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('disabled storage never blocks character selection', () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  try {
    assert.equal(readPlayerCharacter(), DEFAULT_CHARACTER);
    assert.doesNotThrow(() => savePlayerCharacter(AVATAR_OPTIONS[2].path));
  } finally {
    if (previous) Object.defineProperty(globalThis, 'localStorage', previous);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
