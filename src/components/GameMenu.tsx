import { acquireBodyScrollLock } from '../logic/bodyScrollLock';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BookOpen, Film, Home, Languages, Music2, Swords, Volume2, X } from 'lucide-react';
import type { Lang } from '../types';
import './GameMenu.css';

interface Props {
  lang: Lang;
  onClose: () => void;
  muted: boolean;
  onToggleMute: () => void;
  musicVolume: number;
  onMusicVolumeChange: (value: number) => void;
  reduceMotion: boolean;
  onToggleReduceMotion: () => void;
  onToggleLang: () => void;
  onRules?: () => void;
  onPractice?: () => void;
  onReplayStory?: () => void;
  onHome?: () => void;
  inMatch?: boolean;
}

/** Settings stay here; destinations close this menu before opening on the next frame. */
export default function GameMenu({
  lang, onClose, muted, onToggleMute, musicVolume, onMusicVolumeChange,
  reduceMotion, onToggleReduceMotion, onToggleLang, onRules, onPractice,
  onReplayStory, onHome, inMatch = false,
}: Props) {
  const zh = lang === 'zh';
  const titleId = useId();
  const settingsId = useId();
  const volumeId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropPressed = useRef(false);
  const closing = useRef(false);
  const volume = Number.isFinite(musicVolume) ? Math.max(0, Math.min(1, musicVolume)) : 0;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let previousFocus: HTMLElement | null = null;
    let previousDialog: HTMLDialogElement | null = null;
    let releaseScrollLock: (() => void) | undefined;
    const frame = requestAnimationFrame(() => {
      if (!dialog.isConnected) return;
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (previousFocus === document.body || previousFocus === document.documentElement) previousFocus = null;
      previousDialog = previousFocus?.closest('dialog') ??
        [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(item => item !== dialog).at(-1) ?? null;
      releaseScrollLock = acquireBodyScrollLock();
      dialog.showModal();
      dialog.querySelector<HTMLElement>('[data-menu-close]')?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      dialog.close();
      releaseScrollLock?.();
      if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) {
        previousFocus.focus({ preventScroll: true });
      } else if (previousDialog?.isConnected && previousDialog.open) {
        previousDialog.querySelector<HTMLElement>('button:not(:disabled), [tabindex="-1"]')?.focus({ preventScroll: true });
      }
    };
  }, []);

  const close = (destination?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    dialogRef.current?.close();
    onClose();
    // React unmounts this dialog and restores its focus before the next destination opens.
    if (destination) requestAnimationFrame(destination);
  };

  const outside = (x: number, y: number) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    return !!rect && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom);
  };
  const destinations = [
    { label: zh ? '招式图鉴' : 'Move compendium', Icon: BookOpen, action: onRules },
    { label: zh ? '练习场' : 'Practice arena', Icon: Swords, action: onPractice },
    { label: zh ? '开场漫画' : 'Opening comic', Icon: Film, action: onReplayStory },
    { label: zh ? '返回主页' : 'Return home', Icon: Home, action: onHome },
  ].filter(item => item.action);

  return createPortal(<dialog ref={dialogRef} className="game-menu" data-reduce-motion={reduceMotion}
    aria-labelledby={titleId} aria-describedby={inMatch ? `${titleId}-status` : undefined}
    onKeyDown={event => event.stopPropagation()}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); close(); }}
    onPointerDown={event => {
      event.stopPropagation();
      backdropPressed.current = event.target === event.currentTarget && outside(event.clientX, event.clientY);
    }}
    onClick={event => {
      event.stopPropagation();
      if (event.target === event.currentTarget && backdropPressed.current && outside(event.clientX, event.clientY)) close();
      backdropPressed.current = false;
    }}>
    <header className="game-menu-header">
      <div>
        <span className="game-menu-ornament" aria-hidden="true">◆</span>
        <h2 id={titleId}>{zh ? '游戏菜单' : 'Game menu'}</h2>
      </div>
      <button className="game-menu-close" type="button" data-menu-close
        aria-label={zh ? '关闭游戏菜单' : 'Close game menu'} onClick={() => close()}><X size={20} aria-hidden="true" /></button>
    </header>

    {inMatch && <p className="game-menu-live" id={`${titleId}-status`}>
      <span aria-hidden="true" />{zh ? '联机对局仍在进行' : 'Online match is still in progress'}
    </p>}

    <section className="game-menu-settings" aria-labelledby={settingsId}>
      <h3 id={settingsId}>{zh ? '设置' : 'Settings'}</h3>
      <label className="game-menu-setting game-menu-switch-row">
        <span className="game-menu-label"><Volume2 size={17} aria-hidden="true" />{zh ? '声音' : 'Sound'}</span>
        <input type="checkbox" checked={!muted} onChange={onToggleMute} />
        <span className="game-menu-switch" aria-hidden="true" />
      </label>
      <div className="game-menu-setting game-menu-volume">
        <label className="game-menu-label" htmlFor={volumeId}><Music2 size={17} aria-hidden="true" />{zh ? '音乐' : 'Music'}</label>
        <div className="game-menu-volume-control">
          <input id={volumeId} type="range" min="0" max="1" step="0.01" value={volume}
            aria-valuetext={`${Math.round(volume * 100)}%`}
            onChange={event => onMusicVolumeChange(Number(event.currentTarget.value))} />
          <output htmlFor={volumeId}>{Math.round(volume * 100)}%</output>
        </div>
      </div>
      <label className="game-menu-setting game-menu-switch-row">
        <span className="game-menu-label"><span className="game-menu-motion-mark" aria-hidden="true">≋</span>{zh ? '减少动态效果' : 'Reduce motion'}</span>
        <input type="checkbox" checked={reduceMotion} onChange={onToggleReduceMotion} />
        <span className="game-menu-switch" aria-hidden="true" />
      </label>
      <button className="game-menu-setting game-menu-language" type="button" onClick={onToggleLang}
        aria-label={zh ? '语言：中文，切换为 English' : 'Language: English, switch to 中文'}>
        <span className="game-menu-label"><Languages size={17} aria-hidden="true" />{zh ? '语言' : 'Language'}</span>
        <span lang={zh ? 'zh' : 'en'}>{zh ? '中文' : 'English'}<ArrowRight size={14} aria-hidden="true" /></span>
      </button>
    </section>

    {destinations.length > 0 && <nav className="game-menu-destinations" aria-label={zh ? '游戏选项' : 'Game options'}>
      {destinations.map(({ label, Icon, action }) => <button key={label} type="button" className="game-menu-destination" onClick={() => close(action)}>
        <Icon size={18} aria-hidden="true" /><span>{label}</span><ArrowRight size={15} aria-hidden="true" />
      </button>)}
    </nav>}

    <footer className="game-menu-footer">
      <button type="button" className="game-menu-resume" onClick={() => close()}>{zh ? '返回游戏' : 'Back to game'}</button>
    </footer>
  </dialog>, document.body);
}
