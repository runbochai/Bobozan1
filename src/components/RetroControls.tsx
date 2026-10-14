import { ArrowLeft, Home, Settings } from 'lucide-react';
import type { Lang } from '../types';
import './RetroBase.css';

export default function RetroControls({ lang, onOpenSettings, onHome, onBack }: {
  lang: Lang; onOpenSettings: () => void; onHome?: () => void; onBack?: () => void;
}) {
  const zh = lang === 'zh';
  return <nav className="retro-controls" aria-label={zh ? '游戏设置' : 'Game settings'}>
    {onBack && <button type="button" onClick={onBack} aria-label={zh ? '返回' : 'Back'}><ArrowLeft size={18} /></button>}
    {onHome && <button type="button" onClick={onHome} aria-label={zh ? '主页' : 'Home'}><Home size={18} /></button>}
    <button type="button" className="settings-opener" onClick={onOpenSettings} aria-haspopup="dialog" aria-label={zh ? '设置' : 'Settings'}><Settings size={18} /></button>
  </nav>;
}
