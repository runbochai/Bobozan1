import { assetUrl } from '../assets';
import './BrawlCover.css';
import './CrownTitleScene.css';

/** Fixed scenery and independent cast layers keep the menu from shifting the artwork. */
export default function CrownTitleScene() {
  return <div className="crown-title-scene" aria-hidden="true">
    <img className="crown-title-castle" src={assetUrl('story/crown-title-v1/castle-gate.webp')} alt="" fetchPriority="high" draggable={false} />
    <div className="crown-title-distance" />
    <img className="crown-title-cast crown-title-rook" src={assetUrl('story/crown-title-v1/rook.webp')} alt="" draggable={false} />
    <img className="crown-title-cast crown-title-axle" src={assetUrl('story/crown-title-v1/axle.webp')} alt="" draggable={false} />
    <img className="crown-title-cast crown-title-dragon" src={assetUrl('story/crown-title-v1/dragon.webp')} alt="" fetchPriority="high" draggable={false} />
    <div className="crown-title-foreground" />
  </div>;
}
