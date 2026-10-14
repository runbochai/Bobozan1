import test from 'node:test';
import assert from 'node:assert/strict';
import type { BattleSpeed, Lang } from '../types';
import {
  DEFAULT_MUSIC_VOLUME, readBattleSpeed, readLanguage, readMusicVolume, readMuted,
  readReduceMotion, saveBattleSpeed, saveLanguage, saveMusicVolume, saveMuted, saveReduceMotion,
} from './userSettings';

function withStorage(run: (values: Map<string, string>) => void): void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  try { run(values); }
  finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
}

function assertDefaults(): void {
  assert.equal(readLanguage(), 'zh');
  assert.equal(readMuted(), false);
  assert.equal(readReduceMotion(), false);
  assert.equal(readMusicVolume(), 0.075);
  assert.equal(readBattleSpeed(), 1);
}

function savePreferences(): void {
  saveLanguage('en');
  saveMuted(true);
  saveReduceMotion(true);
  saveMusicVolume(0.275);
  saveBattleSpeed(1.5);
}

test('new players keep Chinese, sound, full motion, 7.5% music and the current battle speed', () => {
  withStorage(() => assertDefaults());
});

test('settings survive reload independently of edition, player and campaign preferences', () => {
  withStorage(values => {
    values.set('bobozan-appearance', 'retro');
    values.set('bobozan-player-name', '小龙');
    savePreferences();
    assert.equal(readLanguage(), 'en');
    assert.equal(readMuted(), true);
    assert.equal(readReduceMotion(), true);
    assert.equal(readMusicVolume(), 0.275);
    assert.equal(readBattleSpeed(), 1.5);
    assert.equal(values.get('bobozan-appearance'), 'retro');
    assert.equal(values.get('bobozan-player-name'), '小龙');
    saveLanguage('zh');
    saveMuted(false);
    saveReduceMotion(false);
    saveMusicVolume(0);
    saveBattleSpeed(1);
    assert.equal(readLanguage(), 'zh');
    assert.equal(readMuted(), false);
    assert.equal(readReduceMotion(), false);
    assert.equal(readMusicVolume(), 0);
    assert.equal(readBattleSpeed(), 1);
  });
});

test('the existing reduce-motion preference is retained with its original storage key', () => {
  withStorage(values => {
    values.set('bobozan-reduce-motion', '1');
    assert.equal(readReduceMotion(), true);
    saveReduceMotion(false);
    assert.equal(values.get('bobozan-reduce-motion'), '0');
  });
});

test('all four battle speeds persist while unsupported or corrupt speeds fall back to normal', () => {
  withStorage(values => {
    for (const speed of [0.75, 1, 1.5, 2] as const) {
      saveBattleSpeed(speed);
      assert.equal(readBattleSpeed(), speed);
    }
    for (const value of ['', ' ', 'NaN', 'Infinity', 'null', '0', '-1', '0.5', '1.2', '3', '{}']) {
      values.set('bobozan-battle-speed', value);
      assert.equal(readBattleSpeed(), 1, value);
    }
  });
});

test('corrupt volume, language and boolean values cannot change safe defaults', () => {
  withStorage(values => {
    for (const value of ['', ' ', 'NaN', 'Infinity', '-0.1', '1.1', '{}', 'null']) {
      values.set('bobozan-music-volume', value);
      assert.equal(readMusicVolume(), DEFAULT_MUSIC_VOLUME, value);
    }
    for (const value of ['true', 'false', '{}', 'EN', '2']) {
      values.set('bobozan-language', value);
      values.set('bobozan-muted', value);
      values.set('bobozan-reduce-motion', value);
      assert.equal(readLanguage(), 'zh');
      assert.equal(readMuted(), false);
      assert.equal(readReduceMotion(), false);
    }
    for (const volume of [0, 0.075, 0.5, 1]) {
      saveMusicVolume(volume);
      assert.equal(readMusicVolume(), volume);
    }
  });
});

test('invalid runtime updates cannot overwrite saved preferences', () => {
  withStorage(values => {
    savePreferences();
    const before = new Map(values);
    saveLanguage('de' as Lang);
    saveMuted('true' as unknown as boolean);
    saveReduceMotion(1 as unknown as boolean);
    for (const volume of [NaN, Infinity, -0.1, 1.1]) saveMusicVolume(volume);
    for (const speed of [0, 0.5, 3, NaN, Infinity]) saveBattleSpeed(speed as BattleSpeed);
    assert.deepEqual(values, before);
  });
});

test('missing, blocked and throwing storage does not block settings or gameplay', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  try {
    Reflect.deleteProperty(globalThis, 'localStorage');
    assertDefaults();
    assert.doesNotThrow(savePreferences);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
    assertDefaults();
    assert.doesNotThrow(savePreferences);
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
      getItem() { throw new Error('Storage read denied'); },
      setItem() { throw new Error('Storage full'); },
    } });
    assertDefaults();
    assert.doesNotThrow(savePreferences);
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
