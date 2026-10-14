import { AVATAR_OPTIONS } from '../data/avatars';

const key = 'bobozan-player-character';
export const DEFAULT_CHARACTER = AVATAR_OPTIONS[0].path;

/** Store the stable character identity, independent of the deployment's URL prefix. */
export function playerCharacterOption(avatar?: string) {
  const path = avatar?.match(/(?:^|\/)(avatars\/[^?#]+\.(?:png|webp))(?:[?#].*)?$/)?.[1];
  return AVATAR_OPTIONS.find(option => option.path === path) ?? AVATAR_OPTIONS[0];
}

export function readPlayerCharacter(): string {
  try { return playerCharacterOption(localStorage.getItem(key) ?? undefined).path; }
  catch { return DEFAULT_CHARACTER; }
}

export function savePlayerCharacter(avatar: string): void {
  try { localStorage.setItem(key, playerCharacterOption(avatar).path); }
  catch { /* Character selection remains usable when browser storage is disabled. */ }
}
