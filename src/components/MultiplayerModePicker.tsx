import { useId, useState, type CSSProperties } from 'react';
import { Check as RetroCheck, Crown as RetroCrown, Shield as RetroShield, Swords as RetroSwords } from 'lucide-react';
import { CheckCircle, Crown, Shield, Swords } from './PixelIcons';
import type { Lang, MultiplayerMode } from '../types';
import './MultiplayerModePicker.css';

interface Props {
  mode: MultiplayerMode;
  lang: Lang;
  appearance?: 'current' | 'retro';
  reduceMotion: boolean;
  disabled: boolean;
  pending: boolean;
  onChange: (mode: MultiplayerMode) => void;
}

/** The room's confirmed choice drives both the radio state and its selection effect. */
export default function MultiplayerModePicker({ mode, lang, appearance = 'current', reduceMotion, disabled, pending, onChange }: Props) {
  const id = useId();
  const zh = lang === 'zh';
  const [effect, setEffect] = useState(() => ({ mode, serial: 0, burst: false }));
  if (effect.mode !== mode) setEffect({ mode, serial: effect.serial + 1, burst: !reduceMotion });
  else if (reduceMotion && effect.burst) setEffect({ ...effect, burst: false });
  const Check = appearance === 'retro' ? RetroCheck : CheckCircle;
  const Crest = appearance === 'retro' ? RetroCrown : Crown;

  return <fieldset className={`mode-picker ${appearance === 'retro' ? 'retro-mode-picker' : 'multiplayer-mode-choice'}`}
    data-appearance={appearance} data-reduced-motion={reduceMotion} disabled={disabled || pending} aria-busy={pending}>
    <legend><span>{zh ? '对战模式' : 'Game mode'}</span>
      <span className="mode-picker__pending" role={pending ? 'status' : undefined} aria-hidden={!pending}>
        {pending ? (zh ? '保存中…' : 'Saving…') : '\u00a0'}
      </span>
    </legend>
    <div className="mode-picker__choices">
      {(['kills', 'survival'] as const).map(value => {
        const selected = value === mode;
        const Icon = value === 'kills' ? (appearance === 'retro' ? RetroSwords : Swords)
          : (appearance === 'retro' ? RetroShield : Shield);
        const title = value === 'kills' ? (zh ? '杀敌赛' : 'Kill race') : (zh ? '生存赛' : 'Survival');
        const description = value === 'kills' ? (zh ? '累计击杀，争夺王冠' : 'Claim the crown with the most kills')
          : (zh ? '最后一战，活到最后' : 'Be the last one standing in the final');
        return <label key={value} className="mode-choice" data-mode={value} data-selected={selected}>
          <input type="radio" name={`${id}-mode`} value={value} checked={selected}
            aria-labelledby={`${id}-${value}-title`} aria-describedby={`${id}-${value}-description`}
            onChange={() => { if (!disabled && !pending && !selected) onChange(value); }} />
          <span className="mode-choice__surface" aria-hidden="true" />
          <span className="mode-choice__icon" aria-hidden="true"><Icon size={28} /><Crest className="mode-choice__crown" size={12} /></span>
          <span className="mode-choice__copy"><strong id={`${id}-${value}-title`}>{title}</strong>
            <small id={`${id}-${value}-description`}>{description}</small></span>
          <span className="mode-choice__selected" aria-hidden="true"><Check size={16} /></span>
          {selected && effect.burst && !reduceMotion && <span key={effect.serial} className="mode-choice__burst" aria-hidden="true"
            onAnimationEnd={event => {
              if (event.target === event.currentTarget) setEffect(current => current.serial === effect.serial ? { ...current, burst: false } : current);
            }}>
            <span className="mode-choice__ring" />
            {Array.from({ length: 6 }, (_, index) => <i key={index} style={{
              '--spark-x': `${(index % 2 ? 1 : -1) * (18 + index * 6)}px`,
              '--spark-y': `${-14 - index * 7}px`, '--spark-delay': `${index * 32}ms`,
            } as CSSProperties} />)}
          </span>}
        </label>;
      })}
    </div>
  </fieldset>;
}
