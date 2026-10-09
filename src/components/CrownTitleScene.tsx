import { assetUrl } from '../assets';
import './BrawlCover.css';
import './CrownTypography.css';
import './CrownTitleScene.css';

/** Fixed scenery and independent cast layers keep the menu from shifting the artwork. */
export default function CrownTitleScene() {
  return <div className="crown-title-scene" aria-hidden="true">
    <img className="crown-title-castle" src={assetUrl('story/crown-title-v1/castle-gate.webp')} alt="" fetchPriority="high" draggable={false} />
    <div className="crown-title-distance" />
    <div className="crown-title-gate-light" />
    <div className="crown-title-rook-shadow" />
    <img className="crown-title-cast crown-title-rook" src={assetUrl('story/crown-title-v2/rook.webp')} alt="" draggable={false} />
    <img className="crown-title-cast crown-title-axle" src={assetUrl('story/crown-title-v1/axle.webp')} alt="" draggable={false} />
    <img className="crown-title-cast crown-title-dragon" src={assetUrl('story/crown-title-v1/dragon.webp')} alt="" fetchPriority="high" draggable={false} />
    <div className="crown-title-foreground" />
    <div className="crown-title-motes">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</div>
  </div>;
}

/** The three city seals tie the wordmark to the campaign without another block of copy. */
export function CrownTitleCrest() {
  return <div className="crown-title-crest" aria-hidden="true">
    <span />
    <svg viewBox="0 0 140 42" fill="none">
      <path d="M20 4 36 20 20 36 4 20 20 4ZM70 4 86 20 70 36 54 20 70 4ZM120 4 136 20 120 36 104 20 120 4Z" stroke="currentColor" strokeWidth="1" opacity=".6" />
      <path d="M21 10c1 7 7 8 6 14-1 8-14 8-14 0 0-4 4-7 5-10 1 4 3 4 3-4Z" fill="currentColor" />
      <path d="M61 19c4-5 8 3 12-1 3-3 4-3 7-3M61 25c4-5 8 3 12-1 3-3 4-3 7-3" stroke="currentColor" strokeWidth="2.5" />
      <path d="m120 10 8 10-8 10-8-10 8-10ZM110 17h20m-20 6h20" stroke="currentColor" strokeWidth="1.5" />
      <path d="M39 20h11m39 0h11" stroke="currentColor" opacity=".4" />
    </svg>
    <span />
  </div>;
}
