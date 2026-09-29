import { AVATAR_OPTIONS } from './avatars';

/** Every selectable portrait owns an eight-direction atlas; filenames mirror the portrait. */
export const BATTLE_CHARACTERS: Record<string, string> = Object.fromEntries(
  AVATAR_OPTIONS.map(({ path }) => [path, `characters/${path.split('/').pop()!.replace(/\.(png|webp)$/, '')}.webp`]),
);
BATTLE_CHARACTERS['avatars/enemies/dummy.webp'] = 'characters/dummy.webp';

export function battleCharacterAtlas(avatar: string | undefined): string | undefined {
  if (!avatar || /^(https?:|data:|blob:)/i.test(avatar)) return undefined;
  const path = avatar.match(/(?:^|\/)(avatars\/[^?#]+\.(?:png|webp))(?:[?#].*)?$/)?.[1];
  return path ? BATTLE_CHARACTERS[path] : undefined;
}
