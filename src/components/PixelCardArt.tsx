import { useState } from 'react';
import { ULT_CUTINS } from '../data/ultCutins';
import { WOODCUT_CARDS } from '../data/woodcutCards';
import { assetUrl } from '../assets';
import ComboCutinArt from './ComboCutinArt';
import { Lantern, Shield, Sword, Star, Flame, Ghost, ArrowUp, ArrowDown, Target, Skull, Heart, Layers, Scroll } from './PixelIcons';

const relatives: Record<string, string> = {
  pegasus: 'meteor', icesword: 'iceult', dragonclaw: 'fireclaw', dragondef: 'fireclaw',
  hotmilk: 'boiler', madian: 'hangman', gun: 'gungod', machete: 'triplekill',
  footatk: 'triplekick', footdef: 'triplekick', oneg: 'pointdiff', threeg: 'threestar',
  fiveg: 'fiveslap', fivedef: 'fiveslap', wave: 'superwave',
};
const symbols: Record<string, typeof Star> = {
  charge: Lantern, defend: Shield, hong: Flame, hong2: Flame, liuke: Sword, ka: Sword,
  ji: Star, kajifen: Star, kajisuper: Star, ascend: ArrowUp, descend: ArrowDown,
  smallfly: ArrowUp, bigfly: ArrowUp, absorb: Ghost, aoxi: Ghost,
  helmetatk: Shield, helmetdef: Shield, handatk: Sword, handdef: Shield,
  shatter: Skull, stab: Sword, ninedef: Shield, eightdef: Shield, seveng: Target,
  bang: Flame, hongtian: Flame, hongdi: Flame, skydragon: Star,
  doublewing: Layers, vajra: Shield, allbomb: Flame, heartpoison: Heart, hearteye: Target, poison: Skull,
};

export default function PixelCardArt({ id }: { id: string }) {
  const [failedId, setFailedId] = useState<string | null>(null);
  const portrait = ULT_CUTINS[id] ?? ULT_CUTINS[relatives[id]];
  const Symbol = symbols[id] ?? Scroll;
  const engraved = WOODCUT_CARDS[id];
  if (engraved && failedId !== id) return <img className="pixel-card-art crown-skill-thumbnail" src={assetUrl(engraved)} alt="" draggable={false} decoding="async" style={{ imageRendering: 'auto', objectFit: 'cover', objectPosition: 'center' }} onError={() => setFailedId(id)} />;
  if (portrait?.combo) return <ComboCutinArt id={portrait.combo} className="pixel-card-art" />;
  if (portrait && failedId !== id) return <img className="pixel-card-art" src={assetUrl(portrait.image)} alt="" draggable={false} onError={() => setFailedId(id)} />;
  return <span className={`pixel-card-symbol pixel-symbol-${id}`}><Symbol size={44} /></span>;
}
