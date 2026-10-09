import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import { getCrownSupplyBonus } from '../logic/expeditionRuntime';
import {
  chapterForStage, crownProgress, crownStageBeat, CROWN_CHAPTERS,
  CROWN_PROLOGUE, CROWN_SEALS, CROWN_STAGE_BEATS, CROWN_TOWERS,
} from '../data/crownCampaign';
import './CrownCampaign.css';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

function CrownMark({ variant = 'crown', className = '' }: { variant?: string; className?: string }) {
  return <svg className={`crown-mark ${className}`} viewBox="0 0 48 48" fill="none" aria-hidden="true">
    {variant === 'ember' ? <path d="m25 5 4 13 8-4-2 9 5 7-5 12H13L7 31l5-13 6 4 7-17ZM24 26l-7 9 4 5h7l3-6-7-8Z" fill="currentColor" fillRule="evenodd" />
      : variant === 'tide' ? <path d="M6 19c8-14 17-3 22-10 5 5 4 12-2 16 8 3 12-2 17-4v9c-6 7-13 7-19 4-7-4-12-4-18 0V19Zm0 19c6-4 11-3 18 0 6 3 13 3 19-3v7H6v-4Z" fill="currentColor" />
        : variant === 'mist' ? <><path d="m24 5 15 19-15 19L9 24 24 5Z" stroke="currentColor" strokeWidth="4" /><path d="M4 19h40M4 29h40M24 12v25" stroke="currentColor" strokeWidth="3" /></>
          : variant === 'tower' ? <path d="M14 7h6v7h8V7h6v11l-3 4v15h6v5H11v-5h6V22l-3-4V7Zm9 15v8h3v-8h-3Z" fill="currentColor" fillRule="evenodd" />
            : <path d="m5 13 10 7 9-13 9 13 10-7-6 22H11L5 13Zm7 27h24" stroke="currentColor" strokeWidth="4" strokeLinejoin="miter" />}
  </svg>;
}

function CrownDialog({ className, titleId, onClose, children, onKeyDown }: {
  className: string; titleId: string; onClose: () => void; children: ReactNode;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDialogElement>) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (!dialog.open) dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-crown-initial-focus]')?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(<dialog ref={ref} className={`crown-dialog ${className}`} aria-labelledby={titleId}
    onKeyDown={onKeyDown} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>, document.body);
}

export function CrownPrologue({ lang, onComplete, onClose }: {
  lang: Lang; onComplete: () => void; onClose: () => void;
}) {
  const zh = lang === 'zh';
  const titleId = useId();
  const [panel, setPanel] = useState(0);
  const touchStart = useRef<number | null>(null);
  const current = CROWN_PROLOGUE[panel];
  const last = panel === CROWN_PROLOGUE.length - 1;
  const changePanel = (next: number) => setPanel(Math.min(CROWN_PROLOGUE.length - 1, Math.max(0, next)));
  return <CrownDialog className="crown-prologue" titleId={titleId} onClose={onClose} onKeyDown={event => {
    if (event.key === 'ArrowRight') { event.preventDefault(); changePanel(panel + 1); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); changePanel(panel - 1); }
  }}>
    <header className="crown-dialog-header">
      <div className="crown-wordmark"><CrownMark /><div><span>BOBOZAN</span><h1 id={titleId}>{zh ? '王冠战争' : 'Crown War'}</h1></div></div>
      <div className="crown-prologue-header-actions"><button type="button" className="crown-text-button" onClick={onComplete}>{zh ? '跳过引子' : 'Skip prologue'} <span aria-hidden="true">↗</span></button><button type="button" className="crown-text-button crown-prologue-exit" onClick={onClose} aria-label={zh ? '返回主页面' : 'Return to the menu'}>×</button></div>
    </header>
    <div className="crown-comic-page" onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
      onTouchEnd={event => {
        const start = touchStart.current;
        const end = event.changedTouches[0]?.clientX;
        touchStart.current = null;
        if (start !== null && end !== undefined && Math.abs(start - end) > 70) changePanel(panel + (start > end ? 1 : -1));
      }}>
      {CROWN_PROLOGUE.map((item, index) => <button type="button" key={index}
        className={`crown-comic-panel crown-comic-panel-${index + 1}`} data-active={index === panel} data-seen={index <= panel}
        onClick={() => changePanel(index)} aria-current={index === panel ? 'step' : undefined}
        aria-label={zh ? `第 ${index + 1} 格：${item.title.zh}` : `Panel ${index + 1}: ${item.title.en}`}>
        <img src={asset(`story/crown-v1/prologue-${index + 1}.webp`)} alt={item.alt[lang]} fetchPriority={index < 2 ? 'high' : 'auto'} onError={event => { event.currentTarget.dataset.failed = 'true'; }} />
        <span className="crown-comic-number" aria-hidden="true">0{index + 1}</span>
        <span className="crown-comic-title">{item.title[lang]}</span>
        <span className="crown-comic-speech">{item.speech[lang]}</span>
      </button>)}
    </div>
    <footer className="crown-comic-footer">
      <div className="crown-comic-caption" aria-live="polite" aria-atomic="true"><span>{zh ? '序章' : 'Prologue'} <b>0{panel + 1} / 04</b></span><p>{current.caption[lang]}</p></div>
      <div className="crown-comic-controls">
        <button type="button" className="crown-square-button" onClick={() => changePanel(panel - 1)} disabled={panel === 0} aria-label={zh ? '上一格' : 'Previous panel'}>←</button>
        <div className="crown-comic-dots" aria-label={zh ? '漫画进度' : 'Comic progress'}>{CROWN_PROLOGUE.map((item, index) => <button type="button" key={index} onClick={() => changePanel(index)} aria-label={item.title[lang]} aria-current={panel === index ? 'step' : undefined} />)}</div>
        <button type="button" data-crown-initial-focus className="crown-primary-button" onClick={last ? onComplete : () => changePanel(panel + 1)}>{last ? (zh ? '接过参赛牌' : 'Take the entrant’s card') : (zh ? '下一格' : 'Next panel')} <span aria-hidden="true">→</span></button>
      </div>
    </footer>
  </CrownDialog>;
}

function CrownSeals({ lang, cleared, compact = false }: { lang: Lang; cleared: number[]; compact?: boolean }) {
  const zh = lang === 'zh';
  return <div className={`crown-seal-row${compact ? ' crown-seal-row--compact' : ''}`} aria-label={zh ? '已取得的城印' : 'City seals'}>
    {CROWN_SEALS.map(seal => {
      const earned = cleared.includes(seal.stageIdx);
      return <span key={seal.id} className="crown-seal" data-earned={earned} style={{ '--seal-color': seal.color } as CSSProperties}
        title={`${seal.name[lang]} · ${earned ? (zh ? '已取得' : 'Claimed') : (zh ? '未取得' : 'Unclaimed')}`}>
        <CrownMark variant={seal.id} /><span>{seal.name[lang]}</span><span className="crown-sr-only">{earned ? (zh ? '已取得' : 'Claimed') : (zh ? '未取得' : 'Unclaimed')}</span>
      </span>;
    })}
  </div>;
}

export function CrownJourney({ lang, stageIdx, cleared, onEnter, onSkipTowers, onExit }: {
  lang: Lang; stageIdx: number; cleared: number[]; onEnter: () => void; onSkipTowers?: () => void; onExit: () => void;
}) {
  const titleId = useId();
  const zh = lang === 'zh';
  const chapter = chapterForStage(stageIdx);
  const beat = crownStageBeat(stageIdx);
  const progress = crownProgress(cleared);
  const supply = getCrownSupplyBonus({ difficulty: 'beginner', crownCleared: cleared });
  const finalRoute = stageIdx >= 13;
  return <CrownDialog className="crown-journey" titleId={titleId} onClose={() => { /* Ending a run requires its labelled button. */ }}>
    <div className="crown-journey-background" aria-hidden="true" style={{ backgroundImage: `url("${asset(`themes/woodcut-v1/${chapter.theme}.webp`)}")` }} />
    <div className="crown-journey-content" style={{ '--chapter-color': chapter.color } as CSSProperties}>
      <header className="crown-dialog-header">
        <div className="crown-wordmark"><CrownMark /><div><span>{zh ? '王冠战争 · 主线' : 'CROWN WAR · CAMPAIGN'}</span><h1 id={titleId}>{chapter.title[lang]}</h1></div></div>
        <div className="crown-exit-run"><button type="button" className="crown-text-button" onClick={onExit}>{zh ? '结束本轮' : 'End run'} <span aria-hidden="true">↗</span></button><small>{zh ? '成长不保留；最佳记录保留' : 'Run growth resets; your best stays'}</small></div>
      </header>
      <ol className="crown-chapter-route" aria-label={zh ? '主线路线' : 'Campaign route'}>
        {CROWN_CHAPTERS.map((item, index) => {
          const done = Array.from({ length: item.to - item.from + 1 }, (_, offset) => item.from + offset).every(stage => cleared.includes(stage));
          const active = chapter.id === item.id;
          const skipped = stageIdx > item.to && !done;
          return <li key={item.id} data-status={active ? 'current' : done ? 'done' : skipped ? 'skipped' : 'future'} aria-current={active ? 'step' : undefined}>
            <span className="crown-route-node" aria-hidden="true">{done ? '✓' : `0${index + 1}`}</span><span>{item.title[lang]}</span>
            <span className="crown-sr-only">{active ? (zh ? '当前章节' : 'Current chapter') : done ? (zh ? '已完成' : 'Complete') : skipped ? (zh ? '未完成' : 'Unfinished') : (zh ? '未抵达' : 'Ahead')}</span>
          </li>;
        })}
      </ol>
      <main className="crown-journey-main">
        <section className="crown-journey-scene" aria-label={zh ? '旅途故事' : 'The story so far'}>
          <span className="crown-location-label">{chapter.subtitle[lang]}</span>
          <div className="crown-speaker"><div className="crown-portrait-frame"><img src={asset(beat.portrait)} alt="" /><span aria-hidden="true">✦</span></div>
            <blockquote><cite>{beat.speaker[lang]}</cite><p>{beat.line[lang]}</p></blockquote>
          </div>
          <div className="crown-journey-evidence">
            <CrownSeals lang={lang} cleared={cleared} />
            {finalRoute && <div className="crown-tower-status"><span>{zh ? '王冠供能' : 'Crown supply'}</span>
              <div>{CROWN_TOWERS.map(tower => {
                const cut = cleared.includes(tower.stageIdx);
                return <span key={tower.stageIdx} data-cut={cut} title={`${tower.name[lang]} · ${cut ? (zh ? '已切断' : 'Cut') : (zh ? '仍在供能' : 'Still active')}`}><CrownMark variant="tower" /><span className="crown-sr-only">{tower.name[lang]} {cut ? (zh ? '已切断' : 'Cut') : (zh ? '仍在供能' : 'Still active')}</span></span>;
              })}</div>
              <b>{zh ? `${progress.towers.length} / 3 已切断` : `${progress.towers.length} / 3 cut`}</b>
            </div>}
          </div>
        </section>
        <section className="crown-quest-card" aria-label={zh ? '当前任务' : 'Current quest'}>
          <div className="crown-quest-kicker"><span>{zh ? '下一步' : 'NEXT STEP'}</span><b>{String(stageIdx + 1).padStart(2, '0')} <span>/ 18</span></b></div>
          <h2>{beat.title[lang]}</h2>
          <p className="crown-quest-objective">{beat.objective[lang]}</p>
          <div className="crown-local-route" aria-label={zh ? '本章进度' : 'Chapter progress'}>{Array.from({ length: chapter.to - chapter.from + 1 }, (_, offset) => chapter.from + offset).map(index => <span key={index} data-current={stageIdx === index} data-cleared={cleared.includes(index)}
            title={CROWN_STAGE_BEATS[index].title[lang]} aria-label={`${CROWN_STAGE_BEATS[index].title[lang]} · ${cleared.includes(index) ? (zh ? '已完成' : 'Complete') : stageIdx === index ? (zh ? '当前' : 'Current') : (zh ? '待挑战' : 'Ahead')}`}>{cleared.includes(index) ? '✓' : String(index + 1).padStart(2, '0')}</span>)}</div>
          {stageIdx >= 16 && <p className="crown-supply-note">{supply.activeTowers.length === 0
            ? (zh ? '三塔已断。执冠者失去了全部额外供能。' : 'All three towers are cut. The Crownkeeper has lost every supply bonus.')
            : (zh ? `${supply.activeTowers.length} 座塔仍在供能：冠主生命 +${supply.hp} · 开局能量 +${supply.energy}。` : `${supply.activeTowers.length} active towers: Crownkeeper HP +${supply.hp} · starting energy +${supply.energy}.`)}</p>}
          <button type="button" data-crown-initial-focus className="crown-primary-button crown-enter-button" onClick={onEnter}>{beat.enter[lang]} <span aria-hidden="true">→</span></button>
          {onSkipTowers && <div className="crown-route-choice"><button type="button" className="crown-text-button" onClick={onSkipTowers}>{zh ? '直接前往王冠城' : 'Go straight to Crown City'} <span aria-hidden="true">↗</span></button><small>{zh ? `跳过三塔及奖励；冠主生命 +${supply.hp} · 开局能量 +${supply.energy}。` : `Skip the towers and rewards. Crownkeeper HP +${supply.hp} · starting energy +${supply.energy}.`}</small></div>}
          <small className="crown-journey-motto">{zh ? '同一张桌。不同的心思。' : 'One table. Many intentions.'}</small>
        </section>
      </main>
    </div>
  </CrownDialog>;
}

export function CrownEnding({ lang, cleared, onHome, onArena, onEndless }: {
  lang: Lang; cleared: number[]; onHome: () => void; onArena: () => void; onEndless: () => void;
}) {
  const titleId = useId();
  const zh = lang === 'zh';
  const progress = crownProgress(cleared);
  return <CrownDialog className="crown-ending" titleId={titleId} onClose={onHome}>
    <div className="crown-ending-background" style={{ backgroundImage: `url("${asset('themes/woodcut-v1/woodcut-tavern.webp')}")` }} aria-hidden="true" />
    <div className="crown-ending-content">
      <span className="crown-ending-eyebrow">{zh ? '王冠战争 · 终章' : 'CROWN WAR · EPILOGUE'}</span>
      <CrownMark className="crown-ending-crown" />
      <h1 id={titleId}>{zh ? '这一晚，灯为所有人亮起。' : 'Tonight, the light belongs to everyone.'}</h1>
      <p className="crown-ending-story">{zh ? '你放下王冠，让灯火回到每一座城。阿栓在老酒馆摆好了椅子，洛牙带着另一座城的来信，坐到了你的对面。' : 'You set down the crown and return the light to every city. Axle puts out the tavern chairs. Rook sits across from you, carrying a letter from home.'}</p>
      <blockquote>{zh ? '“这次，输的人请喝一杯。”' : '“This time, the loser buys a round.”'}</blockquote>
      <div className="crown-ending-record"><CrownSeals lang={lang} cleared={cleared} /><div className="crown-ending-tower-record"><CrownMark variant="tower" /><span>{zh ? `供能塔切断 ${progress.towers.length} / 3` : `Supply towers cut: ${progress.towers.length} / 3`}</span></div></div>
      <p className="crown-ending-next">{zh ? '故事暂告一段落。牌桌上，总有新的对手。' : 'The story rests here. The table always has another challenger.'}</p>
      <div className="crown-ending-actions"><button type="button" data-crown-initial-focus className="crown-primary-button" onClick={onArena}>{zh ? '王冠竞技场 · 多人' : 'Crown Arena · Multiplayer'} <span aria-hidden="true">→</span></button><button type="button" className="crown-secondary-button" onClick={onEndless}>{zh ? '开启无尽守擂' : 'Start an endless defense'}</button></div>
      <button type="button" className="crown-text-button crown-ending-home" onClick={onHome}>{zh ? '回到主页面' : 'Return home'}</button>
    </div>
  </CrownDialog>;
}

export function CrownQuestStrip({ lang, stageIdx, cleared }: { lang: Lang; stageIdx: number; cleared: number[] }) {
  const chapter = chapterForStage(stageIdx);
  const progress = crownProgress(cleared);
  return <div className="crown-quest-strip" style={{ '--chapter-color': chapter.color } as CSSProperties}>
    <CrownMark /><div><span>{lang === 'zh' ? '主线 · ' : 'QUEST · '}{chapter.title[lang]}</span><strong>{crownStageBeat(stageIdx).title[lang]}</strong></div>
    <CrownSeals lang={lang} cleared={cleared} compact />
    {stageIdx >= 13 && <span className="crown-quest-strip-towers" title={lang === 'zh' ? '已切断供能塔' : 'Supply towers cut'}><CrownMark variant="tower" />{progress.towers.length}/3</span>}
  </div>;
}
