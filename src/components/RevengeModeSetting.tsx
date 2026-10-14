import { useId, useState, type CSSProperties } from 'react';
import { Flame as RetroFlame } from 'lucide-react';
import type { Lang } from '../types';
import { Flame as PixelFlame } from './PixelIcons';
import './RevengeModeSetting.css';

interface Props {
  enabled: boolean;
  lang: Lang;
  appearance?: 'current' | 'retro';
  reduceMotion: boolean;
  disabled: boolean;
  pending?: boolean;
  onToggle: () => void;
}

const EMBERS = [
  { x: -24, y: -33, delay: 0 }, { x: 21, y: -38, delay: 45 },
  { x: -32, y: -12, delay: 80 }, { x: 30, y: -17, delay: 25 },
  { x: -8, y: -44, delay: 100 }, { x: 10, y: -29, delay: 140 },
];

/** The confirmed room setting drives the effect, including on guest clients. */
export default function RevengeModeSetting({ enabled, lang, appearance = 'current', reduceMotion, disabled, pending = false, onToggle }: Props) {
  const id = useId();
  const [activation, setActivation] = useState(() => ({ enabled, serial: 0, igniting: false }));
  if (activation.enabled !== enabled) {
    setActivation({ enabled, serial: activation.serial + (enabled ? 1 : 0), igniting: enabled && !reduceMotion });
  } else if (reduceMotion && activation.igniting) {
    setActivation({ ...activation, igniting: false });
  }
  const zh = lang === 'zh';
  const Flame = appearance === 'retro' ? RetroFlame : PixelFlame;
  return <section className={`revenge-setting${appearance === 'retro' ? ' retro-revenge-setting' : ''}`}
    data-appearance={appearance} data-enabled={enabled} data-reduced-motion={reduceMotion}
    role="group" aria-labelledby={`${id}-title`} aria-busy={pending || undefined}>
    <span className="revenge-setting__glow" aria-hidden="true" />
    <span className="revenge-setting__icon" aria-hidden="true">
      <span className="revenge-setting__aura" />
      <Flame size={26} fill={enabled ? 'currentColor' : 'none'} />
      {enabled && activation.igniting && <span key={activation.serial} className="revenge-setting__ignition"
        onAnimationEnd={event => {
          if (event.target !== event.currentTarget) return;
          setActivation(current => current.serial === activation.serial ? { ...current, igniting: false } : current);
        }}>
        <span className="revenge-setting__ignition-ring" />
        {EMBERS.map((ember, index) => <i key={index} className="revenge-setting__ember"
          style={{ '--ember-x': `${ember.x}px`, '--ember-y': `${ember.y}px`, '--ember-delay': `${ember.delay}ms` } as CSSProperties} />)}
      </span>}
    </span>
    <span className="revenge-setting__copy">
      <strong id={`${id}-title`} className="revenge-setting__title">{zh ? '复仇模式' : 'Revenge mode'}</strong>
      <small id={`${id}-description`} className="revenge-setting__description">{zh ? '连败者获得随机强力卡牌' : 'Losing streaks grant bonus cards'}</small>
    </span>
    <button type="button" className="revenge-setting__toggle" aria-pressed={enabled} aria-busy={pending || undefined}
      aria-describedby={`${id}-description`} disabled={disabled || pending} onClick={onToggle}>
      {enabled ? (zh ? '已开启' : 'Enabled') : (zh ? '已关闭' : 'Disabled')}
    </button>
  </section>;
}
