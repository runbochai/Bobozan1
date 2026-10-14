import test from 'node:test';
import assert from 'node:assert/strict';
import { GAME_PREFERENCES_KEY, readGamePreferences, saveGamePreferences } from './gamePreferences';

test('player settings persist including silence, zero music, language and portrait', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  const prefs = { lang: 'en' as const, muted: true, musicVolume: 0, avatar: 'avatars/alternates/pegasus-swordsman.webp' };
  saveGamePreferences(prefs, storage);
  assert.deepEqual(readGamePreferences(storage), prefs);
  assert.deepEqual(readGamePreferences({ ...storage, getItem: () => '{broken' }), readGamePreferences(null));
  values.set(GAME_PREFERENCES_KEY, JSON.stringify({ lang: 'xx', muted: 'false', musicVolume: 9, avatar: 'https://example.com/track.png' }));
  assert.deepEqual(readGamePreferences(storage), { lang: 'zh', muted: false, musicVolume: 1, avatar: 'avatars/bdrag.png' });
});
test('private or full storage does not prevent starting the game', () => {
  const blocked = { getItem: () => { throw new Error('Denied'); }, setItem: () => { throw new Error('Full'); } };
  assert.deepEqual(readGamePreferences(blocked), readGamePreferences(null));
  assert.doesNotThrow(() => saveGamePreferences(readGamePreferences(null), blocked));
});
