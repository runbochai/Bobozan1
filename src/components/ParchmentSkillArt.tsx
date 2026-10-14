import { useId, useState } from 'react';
import { assetUrl } from '../assets';
import { WOODCUT_CARDS } from '../data/woodcutCards';
import { Shield, Sword, Star, Flame, Ghost, ArrowUp, ArrowDown, Target, Skull, Heart, Layers, Scroll } from './PixelIcons';

const symbols: Record<string, typeof Star> = {
  defend: Shield, hong: Flame, hong2: Flame, ka: Sword,
  ji: Star, kajifen: Star, kajisuper: Star, ascend: ArrowUp, descend: ArrowDown,
  smallfly: ArrowUp, bigfly: ArrowUp, absorb: Ghost, aoxi: Ghost,
  helmetatk: Shield, helmetdef: Shield, handatk: Sword, handdef: Shield,
  shatter: Skull, stab: Sword,
  bang: Flame, hongtian: Flame, hongdi: Flame, skydragon: Star,
  doublewing: Layers, vajra: Shield, allbomb: Flame, heartpoison: Heart, hearteye: Target, poison: Skull,
};

/** The same cropped, inked illustration serves printed cards and small move icons. */
export default function ParchmentSkillArt({ id }: { id: string }) {
  const filterId = `parchment-ink-${useId().replace(/:/g, '')}`;
  const [failedId, setFailedId] = useState<string | null>(null);
  const art = WOODCUT_CARDS[id];
  if (id === 'charge') return <svg className="parchment-skill-art parchment-lantern" viewBox="0 0 160 200" aria-hidden="true" focusable="false">
    <g fill="#553516">
      <path fillRule="evenodd" d="M80 8a17 17 0 1 1 0 34 17 17 0 0 1 0-34m0 10a7 7 0 1 0 0 14 7 7 0 0 0 0-14" />
      <path d="M51 54q4-16 29-20 25 4 29 20l12 9H39z" />
      <path d="M33 64h94v12H33z M40 76h11v83H40z M109 76h11v83h-11z M35 159h90v13H35z M47 173h66l-10 12H57z" />
    </g>
    <path d="M52 77h56v81H52z" fill="#ca8a32" />
    <path d="M59 80h8v75h-8z M94 80h8v75h-8z" fill="#f0c46d" />
    <path d="m80 87 16 34-16 26-16-26z" fill="#ffdc80" />
    <path d="m80 104 8 18-8 15-8-15z" fill="#fff0bb" />
    <path d="M48 77h5v81h-5z M107 77h5v81h-5z M73 77h5v13l-5 10z" fill="#553516" />
    <path d="M42 69h77v3H42z M43 163h72v3H43z" fill="#a1692d" opacity=".8" />
  </svg>;

  if (art?.startsWith('cards/woodcut-') && failedId !== id) return <svg className="parchment-skill-art" viewBox="42 168 428 476" aria-hidden="true" focusable="false" data-engraved-skill={id}>
    <defs>
      <filter id={filterId} colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse" x="0" y="0" width="512" height="768">
        {/* The original dark field becomes transparent; every skill keeps its own woodcut lines. */}
        <feColorMatrix type="matrix" values="0 0 0 0 .333333  0 0 0 0 .207843  0 0 0 0 .086275  .29764 1.00128 .10108 0 -.15" />
      </filter>
    </defs>
    <image href={assetUrl(art)} x="0" y="0" width="512" height="768" filter={`url(#${filterId})`} onError={() => setFailedId(id)} />
  </svg>;

  const Symbol = symbols[id] ?? Scroll;
  return <span className="parchment-skill-art parchment-skill-fallback" aria-hidden="true" data-engraved-skill={id} data-art-fallback="true"><Symbol size="100%" /></span>;
}
