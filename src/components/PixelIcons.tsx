import type { SVGProps } from 'react';

type Props = SVGProps<SVGSVGElement> & { size?: number | string };
// Native 16-unit, integer-grid icons: no external sprites or font glyphs.
function icon(path: string) {
  return function PixelIcon({ size = 24, children, ...props }: Props) {
    return <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true" focusable="false" {...props} className={`pixel-icon ${props.className ?? ''}`} shapeRendering="crispEdges"><path d={path} fill="currentColor" stroke="none" />{children}</svg>;
  };
}
export const Zap = icon('M8 1h5L9 6h4L5 15l2-6H3z');
export const Shield = icon('M2 2h12v7h-2v3h-2v2H6v-2H4V9H2z M5 4v5h2v3h2V9h2V4z');
export const Swords = icon('M1 1h3v2h2v2h2v2h2V5h2V3h2V1h1v4h-2v2h-2v2h2v2h2v2h-2v2h-2v-2H9v-2H7v2H5v2H3v-2H1v-2h2V9h2V7H3V5H1z');
export const Sword = icon('M11 1h4v4h-2v2h-2v2H9v2H7v2H5v2H2v-3h2v-2H2V8h2v2h2V8h2V6h2V4h1z');
export const Skull = icon('M4 1h8v2h2v8h-3v4H5v-4H2V3h2z M4 5v3h3V5z M9 5v3h3V5z M7 9v2h2V9z M6 12v2h1v-2z M9 12v2h1v-2z');
export const Heart = icon('M2 2h4v2h4V2h4v2h2v5h-2v2h-2v2h-2v2H6v-2H4v-2H2V9H0V4h2z');
export const Star = icon('M6 0h4v4h5v4h-3v3h2v4h-4v-2H6v2H2v-4h2V8H1V4h5z');
export const Crown = icon('M1 3h2v3h3V2h4v4h3V3h2v10H1z M3 14h10v2H3z');
export const Flame = icon('M7 0h3v3h2v3h2v6h-2v2H4v-2H2V7h2V4h2v4h2V4H7z');
export const Ghost = icon('M5 1h6v2h2v2h1v10h-2v-2h-2v2H6v-2H4v2H2V5h1V3h2z M4 5v3h2V5z M9 5v3h2V5z');
export const User = icon('M5 1h6v6H5z M3 9h10v2h2v4H1v-4h2z');
export const Users = icon('M2 2h4v5H2z M10 2h4v5h-4z M1 9h6v6H0v-4h1z M9 9h6v2h1v4H9z');
export const House = icon('M7 1h2v2h2v2h2v2h2v2h-2v6H9v-5H7v5H3V9H1V7h2V5h2V3h2z');
export const ArrowUp = icon('M7 1h2v2h2v2h2v2h2v2h-5v6H6V9H1V7h2V5h2V3h2z');
export const ArrowDown = icon('M6 1h4v6h5v2h-2v2h-2v2H9v2H7v-2H5v-2H3V9H1V7h5z');
export const ArrowLeft = icon('M1 7h2V5h2V3h2V1h2v5h6v4H9v5H7v-2H5v-2H3V9H1z');
export const Play = icon('M3 1h2v2h3v2h3v2h3v2h-3v2H8v2H5v2H3z');
export const X = icon('M2 1h2v2h2v2h4V3h2V1h2v3h-2v2h-2v4h2v2h2v3h-2v-2h-2v-2H6v2H4v2H2v-3h2v-2h2V6H4V4H2z');
export const CheckCircle = icon('M1 7h3v3h3V7h2V5h2V3h3v3h-2v2h-2v2H9v2H7v2H4v-2H2v-2H1z');
export const Target = icon('M5 0h6v2h3v3h2v6h-2v3h-3v2H5v-2H2v-3H0V5h2V2h3z M5 3H3v10h10V3z M6 6h4v4H6z');
export const Copy = icon('M1 1h10v2H3v8H1z M5 5h10v10H5z M7 7v6h6V7z');
export const LogOut = icon('M1 1h7v2H3v10h5v2H1z M10 4h2v2h2v1h2v2h-2v1h-2v2h-2V9H5V7h5z');
export const Edit = icon('M11 1h3v2h2v2h-2v2h-2v2h-2v2H8v2H6v2H1v-5h2V8h2V6h2V4h2V2h2z');
export const Music = icon('M6 2h8v10h-2v2H8v-4h4V5H8v7H6v2H2v-4h4z');
export const Volume2 = icon('M1 6h3V4h2V2h2v12H6v-2H4v-2H1z M10 5h2v6h-2z M13 2h2v3h1v6h-1v3h-2v-3h1V5h-1z');
export const VolumeX = icon('M1 6h3V4h2V2h2v12H6v-2H4v-2H1z M10 5h2v2h2V5h2v2h-2v2h2v2h-2V9h-2v2h-2V9h2V7h-2z');
export const Layers = icon('M6 1h4v2h4v2h2v2h-4v2H4V7H0V5h2V3h4z M0 9h4v2h8V9h4v3h-4v2H4v-2H0z');
export const Globe = icon('M4 0h8v2h2v2h2v8h-2v2h-2v2H4v-2H2v-2H0V4h2V2h2z M4 3H3v3h3V3z M9 3v3h4V3z M3 9v3h3V9z M9 9v3h4V9z');
export const Loader = icon('M6 0h4v4H6z M12 2h3v3h-3z M12 6h4v4h-4z M11 12h3v3h-3z M6 12h4v4H6z M1 11h3v3H1z M0 6h4v4H0z');
export const AlertTriangle = icon('M6 1h4v3h2v3h2v3h2v5H0v-5h2V7h2V4h2z M7 5v5h2V5z M7 12v2h2v-2z');
export const Smile = icon('M3 1h10v2h2v10h-2v2H3v-2H1V3h2z M4 5v2h2V5z M10 5v2h2V5z M4 9v2h2v2h4v-2h2V9h-2v2H6V9z');
export const Film = icon('M0 2h16v12H0z M2 4v2h2V4z M12 4v2h2V4z M6 4v8h4V4z M2 10v2h2v-2z M12 10v2h2v-2z');
export const Coins = icon('M4 1h8v2h2v10h-2v2H4v-2H2V3h2z M6 4v8h2V4z M9 4v8h1V4z');
export const Chest = icon('M3 2h10v2h2v10H1V4h2z M3 5v3h4V6h2v2h4V5z M3 10v2h10v-2H9v1H7v-1z');
export const Scroll = icon('M2 1h11v2h2v3h-2v8h-2v1H2v-2H0v-3h3V3H2z M5 4v1h6V4z M5 7v1h6V7z');
export const HandHeart = Heart;
export const Share2 = Users;
export const Undo2 = ArrowLeft;
