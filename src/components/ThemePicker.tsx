import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import { assetUrl } from '../assets';
import { DEFAULT_THEME, GAME_THEMES, themeImagePath } from '../data/gameThemes';
import { useWorldTheme } from './worldThemeContext';

export default function ThemePicker({ lang }: { lang: Lang }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { theme, pending, error, selectTheme } = useWorldTheme();
  const zh = lang === 'zh';
  return <>
    <button className="theme-picker-trigger" type="button" aria-label={zh ? '切换主题' : 'Change theme'} title={zh ? '切换主题' : 'Change theme'} onClick={() => dialog.current?.showModal()}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true" shapeRendering="crispEdges"><path d="M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z" opacity=".8"/><path d="M5 5h4v4H5zM15 15h4v4h-4z" fill="var(--world-accent)"/></svg>
    </button>
    {createPortal(<dialog className="world-theme-dialog" ref={dialog} aria-labelledby="world-theme-heading" onClick={event => {
      if (event.target === event.currentTarget) {
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.current?.close();
      }
    }}>
      <header><div><h2 id="world-theme-heading">{zh ? '选择场景' : 'Choose a scene'}</h2><p>{zh ? '桌边换个风景' : 'A different view at the table'}</p></div>
        <button className="world-theme-close" type="button" aria-label={zh ? '关闭' : 'Close'} onClick={() => dialog.current?.close()}>×</button>
      </header>
      <div className="world-theme-grid">
        {GAME_THEMES.map((item, index) => <button type="button" key={item.id} className="world-theme-option" data-theme-id={item.id}
          aria-pressed={theme.id === item.id} aria-busy={pending === item.id} onClick={() => void selectTheme(item.id)}>
          <img src={assetUrl(themeImagePath(item.id, true))} alt="" width="320" height="200" decoding="async" />
          <span className="world-theme-caption"><span><small>{String(index + 1).padStart(2, '0')}</small> {item.name[lang]}</span>
            <b aria-hidden="true">{pending === item.id ? '…' : theme.id === item.id ? '✓' : ''}</b></span>
          {item.id === DEFAULT_THEME.id && <span className="world-theme-default">{zh ? '默认' : 'Default'}</span>}
        </button>)}
      </div>
      <p className="world-theme-status" role="status">{error ? (zh ? '场景暂未加载成功，点选可重试。' : 'Scene could not load. Select it to retry.') : pending ? (zh ? '正在准备场景…' : 'Loading scene…') : (zh ? `已选：${theme.name.zh} · 自动记住选择` : `Selected: ${theme.name.en} · Saved on this device`)}</p>
    </dialog>, document.body)}
  </>;
}
