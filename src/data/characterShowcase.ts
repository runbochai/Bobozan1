import { battleCharacterAtlas } from './battleCharacters';

export type ShowcaseEffect = 'ember' | 'wind' | 'arcane' | 'star' | 'spark';
export interface CharacterShowcase {
  effect: ShowcaseEffect;
  accent: string;
  glow: string;
}

const SHOWCASE_THEMES: Record<string, CharacterShowcase> = {
  bdrag: { effect: 'ember', accent: '#ffc36d', glow: '255 145 58' },
  boy: { effect: 'wind', accent: '#9cdecd', glow: '86 205 176' },
  girl: { effect: 'arcane', accent: '#e7b5ef', glow: '201 128 221' },
  ntr: { effect: 'spark', accent: '#ffd892', glow: '246 177 77' },
  pega: { effect: 'wind', accent: '#bcdef5', glow: '139 201 237' },
  rsn: { effect: 'arcane', accent: '#b6b9f3', glow: '145 149 224' },
  'pegasus-swordsman': { effect: 'spark', accent: '#c9e4ed', glow: '159 210 226' },
  'pegasus-martial-artist': { effect: 'wind', accent: '#a5dac1', glow: '101 191 145' },
  'pegasus-strategist': { effect: 'arcane', accent: '#adc9f1', glow: '119 165 232' },
  'pegasus-boxer': { effect: 'ember', accent: '#ffb6a0', glow: '241 131 94' },
  'pegasus-stargazer': { effect: 'star', accent: '#d5c2ff', glow: '172 146 240' },
  'young-tower-lord': { effect: 'arcane', accent: '#e9cb88', glow: '220 181 97' },
  'little-tower-spirit': { effect: 'star', accent: '#a3e5df', glow: '102 211 201' },
};

const DEFAULT_SHOWCASE: CharacterShowcase = { effect: 'star', accent: '#f1d59c', glow: '222 188 120' };

/** Presentation only: a character never changes a player's cards or combat rules. */
export function characterShowcase(avatar?: string): CharacterShowcase {
  const id = battleCharacterAtlas(avatar)?.split('/').pop()?.replace(/\.webp$/, '');
  return (id && SHOWCASE_THEMES[id]) || DEFAULT_SHOWCASE;
}

export interface ShowcaseStep { pose: number | null; duration: number }

/** Eye-local catchlights follow the four front-facing poses in the 192 × 256 action cells.
 * Keeping them in the preview preserves the original sprites and their battle animation. */
export const SHOWCASE_EYE_CATCHLIGHTS: Readonly<Record<string, readonly (readonly (readonly [number, number])[])[]>> = {
  'characters/actions/boy.webp': [
    [[82, 88], [119, 88]],
    [[83, 91], [120, 91]],
    [[82, 92], [120, 92]],
    [[84, 100], [121, 100]],
  ],
  'characters/actions/pegasus-swordsman.webp': [
    [[79, 112], [111, 112]],
    [[80, 107], [112, 108]],
    [[81, 111], [113, 111]],
    [[79, 107], [112, 107]],
  ],
  'characters/actions/pega.webp': [
    [[82, 109], [119, 110]],
    [[81, 103], [118, 103]],
    [[81, 101], [118, 102]],
    [[85, 103], [122, 103]],
  ],
};

/** Four drawn poses held across ten beats, at a fixed front-facing angle. */
export const SHOWCASE_ACTION_STEPS: readonly ShowcaseStep[] = [
  { pose: 0, duration: 120 }, { pose: 0, duration: 100 },
  { pose: 1, duration: 110 }, { pose: 1, duration: 150 },
  { pose: 1, duration: 120 }, { pose: 2, duration: 130 },
  { pose: 2, duration: 100 }, { pose: 3, duration: 120 },
  { pose: 3, duration: 150 }, { pose: 3, duration: 140 },
];

/** An occasional card greeting leaves most of the time for the quiet idle pose. */
export const SHOWCASE_IDLE_STEPS: readonly ShowcaseStep[] = [
  { pose: 3, duration: 3400 }, { pose: 0, duration: 170 },
  { pose: 1, duration: 300 }, { pose: 0, duration: 190 },
  { pose: 3, duration: 2500 },
];
