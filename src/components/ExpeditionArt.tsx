import PixelCardArt from './PixelCardArt';

// Colored, integer-grid loot illustrations, matching the existing pixel icon system.
const shapes: Record<string, [string, string][]> = {
  heart: [['#963b59', 'M6 7h7v3h6V7h7v3h3v9h-3v3h-3v3h-4v3h-6v-3H9v-3H6v-3H3v-9h3z'], ['#f48898', 'M7 9h5v3h8V9h5v9h-4v4h-5v3h-2v-3h-4v-4H7z'], ['#ffe4c5', 'M8 10h3v3H8z']],
  potion: [['#af834e', 'M12 3h8v5h-8z'], ['#a9d6da', 'M11 8h10v6h3v3h3v10H5V17h3v-3h3z'], ['#b64d78', 'M8 19h16v6H8z M12 16h8v3h-8z'], ['#fff0cc', 'M9 16h3v5H9z M15 9h3v4h-3z']],
  badge: [['#5e7ec7', 'M9 16h6v13l-3-3-3 3z M17 16h6v13l-3-3-3 3z'], ['#b27539', 'M10 3h12v3h4v13h-4v3H10v-3H6V6h4z'], ['#f8d57e', 'M11 5h10v3h3v9h-3v3H11v-3H8V8h3z'], ['#fff0ba', 'M15 7h3v4h4v3h-4v4h-3v-4h-4v-3h4z']],
  shield: [['#8ab9ca', 'M5 4h22v15h-3v4h-4v4h-8v-4H8v-4H5z'], ['#355779', 'M8 7h16v11h-3v4h-4v3h-2v-3h-4v-4H8z'], ['#f5d48d', 'M14 9h4v4h4v4h-4v5h-4v-5h-4v-4h4z']],
  sword: [['#c1e1e2', 'M23 2h6v7h-3v3h-3v3h-3v3h-3v3h-5v-5h3v-3h3v-3h3V7h2z'], ['#7498ba', 'M26 5h3v4h-3v3h-3v3h-3v3h-3v3h-3v-3h3v-3h3v-3h3V9h3z'], ['#edb861', 'M7 15h4v4h4v4h4v3h-5v-3h-4v-4H7z'], ['#be5d51', 'M7 22h4v4H7v4H3v-4h4z']],
  axe: [['#a17957', 'M14 3h4v27h-4z'], ['#bcdae0', 'M9 4h4v14H9v-3H3V7h6z M19 4h4v3h6v8h-6v3h-4z'], ['#668ca8', 'M3 12h6v3H3z M23 12h6v3h-6z'], ['#edc98a', 'M12 7h8v4h-8z']],
  gem: [['#5882b5', 'M8 5h16l6 9-14 16L2 14z'], ['#b3e7ed', 'M8 5h16l-4 9h-8z'], ['#659bd1', 'M2 14h10l4 16z'], ['#ebf8e3', 'M8 5h6l-3 6H5z'], ['#de819b', 'M12 14h8l-4 16z']],
  dice: [['#b1b9cc', 'M5 5h22v22H5z'], ['#e9eadc', 'M5 5h18v18H5z'], ['#5d527e', 'M8 8h4v4H8z M16 8h4v4h-4z M8 16h4v4H8z M16 16h4v4h-4z M24 12h2v4h-2z M24 20h2v4h-2z']],
  plant: [['#507d5b', 'M14 11h4v15h-4z M5 10h7v3h4v5H9v-3H5z M18 5h9v7h-4v3h-7V9h2z'], ['#b3d986', 'M7 10h5v3h-5z M20 5h7v3h-7z'], ['#a16d4b', 'M9 24h14v5H9z']],
  map: [['#a77350', 'M3 5h9V3h9v3h8v23h-9v-3h-9v2H3z'], ['#e8ca8e', 'M5 7h7V5h7v3h8v18h-7v-3h-9v2H5z'], ['#b55752', 'M19 11h3v3h3v3h-3v3h-3v-3h-3v-3h3z'], ['#6b9983', 'M7 11h4v3H7z M10 17h4v3h-4z']],
  chest: [['#9c613e', 'M6 6h20v3h3v18H3V9h3z'], ['#e2b45f', 'M6 9h20v3H6z M3 17h26v3H3z M6 23h20v3H6z'], ['#fff0ae', 'M13 15h6v8h-6z'], ['#6d453a', 'M15 17h2v3h-2z']],
  glove: [['#984854', 'M7 6h13v3h6v13h-7v6H8v-7H5V9h2z'], ['#e88b7b', 'M9 8h9v4h6v7H8V10h1z'], ['#f9dba0', 'M9 23h8v3H9z M10 9h6v3h-6z']],
  belt: [['#7287b2', 'M2 11h28v11H2z'], ['#d4b56e', 'M10 8h12v17H10z'], ['#fce3a0', 'M12 10h8v13h-8z'], ['#675476', 'M15 12h3v9h-3z']],
  needle: [['#b3d8db', 'M22 3h7v3h-4v4h-3v3h-3v3h-3v3h-3v3h-3v-3H7v-3h3v-3h3v-3h3V7h4V5h2z M7 22h3v3H7v3H4v-3h3z'], ['#e389a0', 'M14 12h4v4h-4v3h-3v-4h3z']],
  stone: [['#697687', 'M8 8h17v4h4v13H3V13h5z'], ['#abb6bd', 'M10 6h13v3h3v7H7v-5h3z'], ['#e7d39b', 'M16 9h5v3h-5z']],
  doll: [['#c69575', 'M12 3h8v8h-8z M4 13h24v5H20v11h-5v-7h-2v7H8V18H4z'], ['#ffe0aa', 'M14 5h4v3h-4z M11 14h8v4h-8z'], ['#ae5f66', 'M10 18h11v3H10z']],
  charm: [['#cd9560', 'M6 5h5v4H6z M3 11h4v5H3z M5 18h5v4H5z M21 5h5v4h-5z M25 11h4v5h-4z M22 18h5v4h-5z'], ['#af96d6', 'M12 20h8v3h3v5H9v-5h3z'], ['#fce7ae', 'M14 22h4v4h-4z']],
};
const loot: Record<string, string> = {
  heal: 'heart', maxhp: 'heart', potion: 'potion', levelup: 'badge', levelbadge: 'badge',
  ypj: 'shield', tbs: 'shield', rxyd: 'belt', fjqt: 'glove', zjling: 'sword', zstai: 'plant', jsn: 'needle', mds: 'stone', cbt: 'map',
  waraxe: 'axe', bloodsword: 'sword', lifegem: 'gem', luckydice: 'dice', treasurepot: 'chest', moneytree: 'plant', doll: 'doll', skillcharm: 'charm',
};

export default function ExpeditionArt({ id, card = false }: { id: string; card?: boolean }) {
  if (card) return <PixelCardArt key={id} id={id} />;
  return <svg className={`expedition-loot-art loot-${id}`} viewBox="0 0 32 32" aria-hidden="true" shapeRendering="crispEdges">
    {(shapes[loot[id]] ?? shapes.chest).map(([fill, d], i) => <path key={i} fill={fill} d={d} />)}
  </svg>;
}
