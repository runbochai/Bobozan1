import { AVATAR_OPTIONS } from './avatars';

/** Every selectable portrait owns an eight-direction atlas; filenames mirror the portrait. */
export const BATTLE_CHARACTERS: Record<string, string> = Object.fromEntries(
  AVATAR_OPTIONS.map(({ path }) => [path, `characters/${path.split('/').pop()!.replace(/\.(png|webp)$/, '')}.webp`]),
);
BATTLE_CHARACTERS['avatars/enemies/dummy.webp'] = 'characters/dummy.webp';
BATTLE_CHARACTERS['avatars/robot.webp'] = 'characters/robot.webp';

const expeditionCharacters = [
  'coward', 'turtle', 'slime', 'slime_a', 'slime_b', 'ironwall', 'wolf',
  'head_a', 'head_b', 'dragon_elder', 'frost', 'shadow_a', 'shadow_b', 'shadow_c',
  'hangman', 'knight', 'guard_a', 'guard_b', 'guard_c', 'bluffer', 'lord_bozan', 'tower_soul',
];
for (const id of expeditionCharacters) BATTLE_CHARACTERS[`avatars/enemies/${id}.webp`] = `characters/enemies/${id}.webp`;

/** Some generated quarter views face the opposite way; mirror only the clipped cell. */
export const MIRRORED_BATTLE_VIEWS: Record<string, string[]> = {
  'characters/young-tower-lord.webp': ['nw'],
  'characters/enemies/lord_bozan.webp': ['nw'],
  'characters/enemies/knight.webp': ['nw'],
  'characters/enemies/shadow_a.webp': ['sw', 'nw', 'ne'],
  ...Object.fromEntries(['slime_a', 'ironwall', 'wolf', 'head_a', 'head_b', 'dragon_elder', 'shadow_c', 'hangman', 'guard_a', 'guard_c']
    .map(id => [`characters/enemies/${id}.webp`, ['sw']])),
};

export function battleCharacterAtlas(avatar: string | undefined): string | undefined {
  if (!avatar || /^(https?:|data:|blob:)/i.test(avatar)) return undefined;
  const path = avatar.match(/(?:^|\/)(avatars\/[^?#]+\.(?:png|webp))(?:[?#].*)?$/)?.[1];
  return path ? BATTLE_CHARACTERS[path] : undefined;
}
