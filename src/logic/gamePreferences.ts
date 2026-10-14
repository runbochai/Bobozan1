import type { Lang } from '../types';

export const GAME_PREFERENCES_KEY = 'bobozan-game-preferences-v1';
export interface GamePreferences { lang: Lang; muted: boolean; musicVolume: number; avatar: string }
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
const defaults: GamePreferences = { lang: 'zh', muted: false, musicVolume: .15, avatar: 'avatars/bdrag.png' };
function storage(): StorageLike | null { try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; } }
export function readGamePreferences(target: StorageLike | null = storage()): GamePreferences {
  try {
    const value: unknown = JSON.parse(target?.getItem(GAME_PREFERENCES_KEY) ?? 'null');
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...defaults };
    const input = value as Partial<GamePreferences>;
    return {
      lang: input.lang === 'en' ? 'en' : 'zh',
      muted: typeof input.muted === 'boolean' ? input.muted : defaults.muted,
      musicVolume: typeof input.musicVolume === 'number' && Number.isFinite(input.musicVolume)
        ? Math.max(0, Math.min(1, input.musicVolume)) : defaults.musicVolume,
      avatar: typeof input.avatar === 'string' && input.avatar.length <= 300
        && (input.avatar === '' || /^(?:\/Bobozan1\/)?avatars\/[\w/.-]+\.(?:png|webp)$/.test(input.avatar))
        ? input.avatar : defaults.avatar,
    };
  } catch { return { ...defaults }; }
}
export function saveGamePreferences(value: GamePreferences, target: StorageLike | null = storage()): void {
  try { target?.setItem(GAME_PREFERENCES_KEY, JSON.stringify(value)); } catch { /* Storage is optional. */ }
}
