export type Appearance = 'current' | 'retro';
const preferenceKey = 'bobozan-appearance';

/** A visual preference is local to this player, never part of the shared room. */
export function readAppearance(): Appearance {
  try { return localStorage.getItem(preferenceKey) === 'retro' ? 'retro' : 'current'; }
  catch { return 'current'; }
}

export function saveAppearance(appearance: Appearance): void {
  try { localStorage.setItem(preferenceKey, appearance); }
  catch { /* Storage restrictions must not block switching editions. */ }
}
