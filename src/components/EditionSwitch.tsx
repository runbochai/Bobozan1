import type { Appearance } from '../logic/appearance';
import type { Lang } from '../types';
import './EditionSwitch.css';

/** A local presentation switch, available before entering a room or a match. */
export default function EditionSwitch({ appearance, lang, onSwitch }: {
  appearance: Appearance;
  lang: Lang;
  onSwitch: () => void;
}) {
  const target = appearance === 'retro' ? 'current' : 'retro';
  const label = target === 'retro'
    ? (lang === 'zh' ? '切换为怀旧版' : 'Switch to classic edition')
    : (lang === 'zh' ? '切换为当前版' : 'Switch to current edition');

  return <button type="button" className="edition-switch" data-appearance={appearance} data-target-edition={target}
    onClick={onSwitch} title={label} aria-label={label}>
    <svg width="24" height="24" viewBox="0 0 16 16" aria-hidden="true" focusable="false" shapeRendering="crispEdges">
      <path fill="currentColor" d="M11 1h2v2h2v2h-2v2h-2V5H1V3h10z M5 9v2h10v2H5v2H3v-2H1v-2h2V9z" />
    </svg>
  </button>;
}
