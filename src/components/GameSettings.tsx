import { useEffect, useRef } from 'react';
import type { BattleSpeed, Lang } from '../types';
import { BATTLE_SPEEDS } from '../logic/battleSpeed';
import { X } from './PixelIcons';
import './GameSettings.css';

interface Props {
  lang: Lang;
  onLanguageChange: (lang: Lang) => void;
  muted: boolean;
  onMutedChange: (muted: boolean) => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  reduceMotion: boolean;
  systemReducedMotion: boolean;
  onMotionChange: (reduced: boolean) => void;
  speed: BattleSpeed;
  onSpeedChange: (speed: BattleSpeed) => void;
  speedLocked?: boolean;
  speedPending?: boolean;
  roomSpeed?: boolean;
  error?: string;
  onClose: () => void;
}

export default function GameSettings({ lang, onLanguageChange, muted, onMutedChange, volume, onVolumeChange,
  reduceMotion, systemReducedMotion, onMotionChange, speed, onSpeedChange, speedLocked, speedPending,
  roomSpeed, error, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const backdropPress = useRef(false);
  const zh = lang === 'zh';
  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    closeRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);
  const percent = `${Math.round(volume * 1000) / 10}%`;
  return <dialog ref={dialogRef} className="game-settings-dialog" aria-labelledby="game-settings-title"
    onCancel={event => { event.preventDefault(); onClose(); }}
    onPointerDown={event => {
      const bounds = event.currentTarget.getBoundingClientRect();
      backdropPress.current = event.target === event.currentTarget
        && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom);
    }}
    onPointerCancel={() => { backdropPress.current = false; }}
    onClick={event => {
      const startedOutside = backdropPress.current;
      backdropPress.current = false;
      if (!startedOutside || event.target !== event.currentTarget) return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) onClose();
    }}>
    <header className="settings-heading">
      <h2 id="game-settings-title">{zh ? '设置' : 'Settings'}</h2>
      <button ref={closeRef} className="settings-close" type="button" onClick={onClose} aria-label={zh ? '关闭设置' : 'Close settings'}><X size={18} /></button>
    </header>
    <div className="settings-content">
      <label className="settings-row" htmlFor="settings-language">
        <span>{zh ? '语言' : 'Language'}</span>
        <select id="settings-language" value={lang} onChange={event => onLanguageChange(event.target.value as Lang)}>
          <option value="zh">简体中文</option><option value="en">English</option>
        </select>
      </label>
      <label className="settings-row settings-check">
        <span><strong>{zh ? '防抖模式' : 'Reduce motion'}</strong>
          <small>{systemReducedMotion ? (zh ? '已跟随系统减少动态设置' : 'Enabled by your system motion preference')
            : (zh ? '减少晃动、闪光和动态效果' : 'Reduce shaking, flashes and animation')}</small></span>
        <input type="checkbox" checked={reduceMotion} disabled={systemReducedMotion} onChange={event => onMotionChange(event.target.checked)} />
      </label>
      <section className="settings-section" aria-labelledby="settings-audio-title">
        <h3 id="settings-audio-title">{zh ? '音乐与声音' : 'Music & sound'}</h3>
        <label className="settings-row settings-check"><span>{zh ? '开启声音' : 'Sound enabled'}</span>
          <input type="checkbox" checked={!muted} onChange={event => onMutedChange(!event.target.checked)} />
        </label>
        <div className="settings-range-label"><label htmlFor="settings-music-volume">{zh ? '音乐音量' : 'Music volume'}</label><output htmlFor="settings-music-volume">{percent}</output></div>
        <input id="settings-music-volume" className="settings-volume" type="range" min="0" max="1" step="0.005"
          value={volume} aria-valuetext={percent} onChange={event => onVolumeChange(Number(event.target.value))} />
      </section>
      <fieldset className="settings-section settings-speed" disabled={speedLocked || speedPending} aria-busy={speedPending}>
        <legend>{zh ? '战斗速度' : 'Battle speed'}</legend>
        <div className="settings-speed-options">{BATTLE_SPEEDS.map(value => <button type="button" key={value}
          aria-pressed={speed === value} onClick={() => onSpeedChange(value)}>{value}×</button>)}</div>
      </fieldset>
      <p className="settings-note" role="status">{speedPending ? (zh ? '正在同步房间速度…' : 'Updating room speed…')
        : speedLocked ? (zh ? `由房主设置，当前 ${speed}×` : `Set by the host: ${speed}×`)
        : roomSpeed ? (zh ? '房间内所有人使用相同速度；当前回合结束后生效。' : 'Everyone uses the same room speed. Applies after the current turn.')
        : (zh ? '调整出牌、比牌与必杀动画速度，下一回合生效。' : 'Changes card and ultimate animation speed from the next turn.')}</p>
      {error && <p className="settings-error" role="alert">{error}</p>}
    </div>
    <footer className="settings-footer"><span>{zh ? '设置会自动保存' : 'Changes save automatically'}</span>
      <button type="button" className="settings-done" onClick={onClose}>{zh ? '完成' : 'Done'}</button></footer>
  </dialog>;
}
