import { assetUrl } from '../assets';
import { themeImagePath } from '../data/gameThemes';
import { useWorldTheme } from './worldThemeContext';

export default function PixelBackdrop({ scene, themeId }: { scene: 'title' | 'home' | 'lobby' | 'battle'; themeId?: string }) {
  const { theme } = useWorldTheme();
  return <div className={`pixel-backdrop pixel-scene-${scene}`} aria-hidden="true">
    <img className="world-scene-image" src={assetUrl(themeImagePath(themeId ?? theme.id))} alt="" draggable={false} decoding="async" fetchPriority="high" />
    <div className="pixel-scene-shade" />
  </div>;
}
