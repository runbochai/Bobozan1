import type { BattleSpeed, Lang } from '../types';
import { isBattleSpeed, normalizeBattleSpeed } from './battleSpeed';

export const DEFAULT_MUSIC_VOLUME = 0.075;

const keys = {
  language: 'bobozan-language',
  muted: 'bobozan-muted',
  musicVolume: 'bobozan-music-volume',
  reduceMotion: 'bobozan-reduce-motion',
  battleSpeed: 'bobozan-battle-speed',
} as const;

function read(key: string): string | null {
  try { return localStorage.getItem(key); }
  catch { return null; }
}

function save(key: string, value: string): void {
  try { localStorage.setItem(key, value); }
  catch { /* Preferences still work for this session when storage is unavailable. */ }
}

export function readLanguage(): Lang {
  return read(keys.language) === 'en' ? 'en' : 'zh';
}

export function saveLanguage(value: Lang): void {
  if (value === 'zh' || value === 'en') save(keys.language, value);
}

export function readMuted(): boolean {
  return read(keys.muted) === '1';
}

export function saveMuted(value: boolean): void {
  if (typeof value === 'boolean') save(keys.muted, value ? '1' : '0');
}

export function readReduceMotion(): boolean {
  return read(keys.reduceMotion) === '1';
}

export function saveReduceMotion(value: boolean): void {
  if (typeof value === 'boolean') save(keys.reduceMotion, value ? '1' : '0');
}

function isMusicVolume(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function readMusicVolume(): number {
  const stored = read(keys.musicVolume);
  const value = stored?.trim() ? Number(stored) : NaN;
  return isMusicVolume(value) ? value : DEFAULT_MUSIC_VOLUME;
}

export function saveMusicVolume(value: number): void {
  if (isMusicVolume(value)) save(keys.musicVolume, String(value));
}

export function readBattleSpeed(): BattleSpeed {
  const stored = read(keys.battleSpeed);
  return normalizeBattleSpeed(stored?.trim() ? Number(stored) : undefined);
}

export function saveBattleSpeed(value: BattleSpeed): void {
  if (isBattleSpeed(value)) save(keys.battleSpeed, String(value));
}
