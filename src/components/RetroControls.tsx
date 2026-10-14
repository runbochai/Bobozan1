import { useState } from 'react';
import { ArrowLeft, Home, Languages, Music2, Sparkles, Volume2, VolumeX } from 'lucide-react';
import type { Lang } from '../types';
import './RetroBase.css';

export default function RetroControls({ lang, muted, reduceMotion, volume, onToggleMute, onToggleMotion,
  onToggleLanguage, onVolumeChange, onHome, onBack }: {
  lang: Lang; muted: boolean; reduceMotion: boolean; volume: number;
  onToggleMute: () => void; onToggleMotion: () => void; onToggleLanguage: () => void;
  onVolumeChange: (volume: number) => void; onHome?: () => void; onBack?: () => void;
}) {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const zh = lang === 'zh';
  return <nav className="retro-controls" aria-label={zh ? '游戏设置' : 'Game settings'}>
    {onBack && <button type="button" onClick={onBack} aria-label={zh ? '返回' : 'Back'}><ArrowLeft size={18} /></button>}
    {onHome && <button type="button" onClick={onHome} aria-label={zh ? '主页' : 'Home'}><Home size={18} /></button>}
    <div className="retro-controls-volume">
      <button type="button" onClick={() => setVolumeOpen(open => !open)} aria-expanded={volumeOpen} aria-label={zh ? '音乐音量' : 'Music volume'}><Music2 size={18} /></button>
      {volumeOpen && <div className="retro-volume-slider"><label>{zh ? '音乐音量' : 'Music volume'}
        <input type="range" min={0} max={1} step={0.05} value={volume} onChange={event => onVolumeChange(Number(event.target.value))} /></label></div>}
    </div>
    <button type="button" onClick={onToggleMute} aria-pressed={muted} aria-label={zh ? '静音' : 'Mute'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
    <button type="button" onClick={onToggleMotion} aria-pressed={reduceMotion} aria-label={zh ? '减弱动效' : 'Reduce motion'}><Sparkles size={18} /></button>
    <button type="button" onClick={onToggleLanguage} aria-label={zh ? '切换语言' : 'Switch language'}><Languages size={18} /></button>
  </nav>;
}
