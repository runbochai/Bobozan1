import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import { getCrownSupplyBonus } from '../logic/expeditionRuntime';
import { themeImagePath } from '../data/gameThemes';
import {
  chapterForStage, crownProgress, crownStageBeat, CROWN_CHAPTERS,
  CROWN_PROLOGUE, CROWN_PROLOGUE_PAGE_SIZE, CROWN_PROLOGUE_PAGE_TITLES, CROWN_SEALS, CROWN_STAGE_BEATS, CROWN_TOWERS,
} from '../data/crownCampaign';
import './CrownCampaign.css';
import './CrownPrologue.css';

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

function CrownDialog({ className, titleId, onClose, children, onKeyDown, onClick }: {
  className: string; titleId: string; onClose: () => void; children: ReactNode;
  onKeyDown?: (event: React.KeyboardEvent<HTMLDialogElement>) => void;
  onClick?: (event: React.MouseEvent<HTMLDialogElement>) => void;
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
    onKeyDown={onKeyDown} onClick={onClick} onCancel={event => { event.preventDefault(); onClose(); }}>{children}</dialog>, document.body);
}

export function CrownPrologue({ lang, onComplete, onClose, reduceMotion = false, onToggleLang }: {
  lang: Lang; onComplete: () => void; onClose: () => void; reduceMotion?: boolean; onToggleLang?: () => void;
}) {
  const zh = lang === 'zh';
  const titleId = useId();
  const nextButton = useRef<HTMLButtonElement>(null);
  const [page, setPage] = useState(0);
  const [requested, setRequested] = useState(1);
  const [narrated, setNarrated] = useState(0);
  const [images, setImages] = useState<('loading' | 'ready' | 'error')[]>(() => CROWN_PROLOGUE.map(() => 'loading'));
  const [systemReducedMotion, setSystemReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const still = reduceMotion || systemReducedMotion;
  let revealed = 0;
  while (revealed < requested && images[revealed] !== 'loading') revealed += 1;
  const pageStart = page * CROWN_PROLOGUE_PAGE_SIZE;
  const pageEnd = Math.min(pageStart + CROWN_PROLOGUE_PAGE_SIZE, CROWN_PROLOGUE.length);
  const pageRevealed = Math.min(revealed, pageEnd);
  const currentIndex = Math.max(pageStart, pageRevealed - 1);
  const current = CROWN_PROLOGUE[currentIndex];
  const waiting = pageRevealed < Math.min(requested, pageEnd);
  const pageComplete = pageRevealed === pageEnd;
  const finished = pageComplete && pageEnd === CROWN_PROLOGUE.length;

  useEffect(() => {
    // A page's panel may have owned focus before being hidden; keep keyboard navigation in view.
    nextButton.current?.focus({ preventScroll: true });
  }, [page]);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setSystemReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    // A stalled download must not trap the reader. Its description carries the story instead.
    if (revealed >= requested) return;
    const timer = window.setTimeout(() => setImages(values => values.map((value, index) =>
      index === revealed && value === 'loading' ? 'error' : value)), 12000);
    return () => window.clearTimeout(timer);
  }, [revealed, requested]);

  useEffect(() => {
    // Let the image establish the scene before its voice arrives. Failed images still tell the story.
    if (!revealed) return;
    const timer = window.setTimeout(() => setNarrated(value => Math.max(value, revealed)), still ? 0 : 850);
    return () => window.clearTimeout(timer);
  }, [revealed, still]);

  const settleImage = (index: number, status: 'ready' | 'error') => {
    setImages(values => values[index] === status ? values : values.map((value, i) => i === index ? status : value));
  };
  const advance = () => {
    if (waiting) {
      // The reader can continue with the narration immediately on a slow connection.
      settleImage(pageRevealed, 'error');
    } else if (finished) {
      onComplete();
    } else if (pageComplete) {
      setPage(value => value + 1);
      setRequested(value => Math.max(value, pageEnd + 1));
    } else {
      // A click requests exactly one new panel, including while the current speech fades in.
      setNarrated(value => Math.max(value, pageRevealed));
      setRequested(value => Math.max(value, pageRevealed + 1));
    }
  };
  const previousPage = () => {
    setPage(value => Math.max(0, value - 1));
  };

  return <CrownDialog className={`crown-prologue crown-opening${still ? ' crown-opening--still' : ''}`} titleId={titleId} onClose={onClose} onClick={event => {
    const control = (event.target as Element).closest('button, a, input, select, textarea, [role="button"]');
    // The whole page is a next-panel target; dedicated controls keep their own actions.
    if (!control || control.classList.contains('crown-opening-panel')) advance();
  }} onKeyDown={event => {
    // Holding a navigation key must not race through the story.
    if (event.repeat && ['ArrowRight', 'ArrowLeft', 'Enter', ' '].includes(event.key)) { event.preventDefault(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); advance(); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); previousPage(); }
  }}>
    <header className="crown-opening-header">
      <div className="crown-wordmark"><CrownMark /><div><span>啵啵仔</span><h1 id={titleId}>{zh ? '王冠战争' : 'Crown War'}</h1></div></div>
      <div className="crown-opening-header-actions">{onToggleLang && <button type="button" className="crown-text-button crown-opening-lang" onClick={onToggleLang} aria-label={zh ? 'Switch language to English' : '切换为中文'} lang={zh ? 'en' : 'zh'}>{zh ? 'EN' : '中文'}</button>}<button type="button" className="crown-text-button" onClick={onComplete}>{zh ? '跳过' : 'Skip'} <span aria-hidden="true">↗</span></button><button type="button" className="crown-text-button crown-prologue-exit" onClick={onClose} aria-label={zh ? '关闭漫画，进入主页面' : 'Close the comic and open the menu'}>×</button></div>
    </header>
    <div className="crown-opening-book" aria-label={zh ? '开场漫画' : 'Opening comic'}>
      {CROWN_PROLOGUE_PAGE_TITLES.map((pageTitle, pageIndex) => <section key={pageIndex} hidden={pageIndex !== page}
        className={`crown-opening-page crown-opening-page-${pageIndex + 1}`} data-page={pageIndex + 1}
        aria-label={`${pageIndex + 1} / ${CROWN_PROLOGUE_PAGE_TITLES.length} · ${pageTitle[lang]}`}>
        {CROWN_PROLOGUE.slice(pageIndex * CROWN_PROLOGUE_PAGE_SIZE, (pageIndex + 1) * CROWN_PROLOGUE_PAGE_SIZE).map((item, localIndex) => {
          const index = pageIndex * CROWN_PROLOGUE_PAGE_SIZE + localIndex;
          return <button type="button" key={item.image}
            className={`crown-opening-panel crown-opening-panel-${localIndex + 1}`} data-panel={index + 1}
            data-revealed={index < revealed} data-failed={images[index] === 'error'}
            data-current={index === currentIndex} data-narrated={index < narrated || index < revealed - 1}
            tabIndex={index < revealed ? 0 : -1} aria-hidden={index >= revealed}
            aria-label={`${item.caption[lang]} ${item.speech[lang]}`}>
            <span className="crown-opening-panel-art"><img src={asset(item.image)} alt="" fetchPriority={index === 0 ? 'high' : 'auto'}
              onLoad={() => settleImage(index, 'ready')} onError={() => settleImage(index, 'error')} />
              {images[index] === 'error' && <span className="crown-opening-fallback">{item.alt[lang]}</span>}</span>
            <span className="crown-opening-speech"><span className="crown-opening-speaker">{item.speaker[lang]}</span>{item.speech[lang]}</span>
          </button>;
        })}
      </section>)}
      {waiting && <span className="crown-opening-loading" role="status">{zh ? '画面载入中，仍可继续阅读。' : 'Loading the scene. You can keep reading.'}</span>}
    </div>
    <footer className="crown-opening-footer">
      <div className="crown-opening-caption" aria-live="polite" aria-atomic="true"><span>{CROWN_PROLOGUE_PAGE_TITLES[page][lang]} <b>{String(Math.max(pageStart, pageRevealed)).padStart(2, '0')} / {CROWN_PROLOGUE.length}</b></span><p key={currentIndex} data-ready={narrated >= pageRevealed && pageRevealed > pageStart}>{pageRevealed > pageStart && narrated >= pageRevealed ? current.caption[lang] : '\u00a0'}</p></div>
      <div className="crown-opening-controls">
        <button type="button" className="crown-text-button crown-opening-back" onClick={previousPage} disabled={page === 0} aria-label={zh ? '上一页' : 'Previous page'}>←</button>
        <div className="crown-opening-page-count"><span aria-label={zh ? `第 ${page + 1} 页，共 ${CROWN_PROLOGUE_PAGE_TITLES.length} 页` : `Page ${page + 1} of ${CROWN_PROLOGUE_PAGE_TITLES.length}`}>{String(page + 1).padStart(2, '0')} <b>/ {String(CROWN_PROLOGUE_PAGE_TITLES.length).padStart(2, '0')}</b></span><span className="crown-opening-progress" aria-hidden="true">{Array.from({ length: CROWN_PROLOGUE_PAGE_SIZE }, (_, index) => <i key={index} data-revealed={pageStart + index < revealed} />)}</span></div>
        <button type="button" ref={nextButton} data-crown-initial-focus className="crown-primary-button" onClick={advance}>{finished ? (zh ? '走吧' : 'Let’s go') : pageComplete ? (zh ? '下一页' : 'Turn the page') : waiting ? (zh ? '继续阅读' : 'Keep reading') : (zh ? '下一格' : 'Next panel')} <span aria-hidden="true">→</span></button>
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
    <div className="crown-journey-background" aria-hidden="true" style={{ backgroundImage: `url("${asset(themeImagePath(chapter.theme))}")` }} />
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
    <div className="crown-ending-background" style={{ backgroundImage: `url("${asset(themeImagePath('crown-citadel'))}")` }} aria-hidden="true" />
    <div className="crown-ending-content">
      <span className="crown-ending-eyebrow">{zh ? '王冠战争 · 终章' : 'CROWN WAR · EPILOGUE'}</span>
      <CrownMark className="crown-ending-crown" />
      <h1 id={titleId}>{zh ? '你接过王冠，先点亮回家的路。' : 'You take the crown—and light the road home.'}</h1>
      <p className="crown-ending-story">{zh ? '老国王输了。依他不肯改变的祖法，你成为新王。你的第一道命令，是废除苛税，归还被征走的灯芯。灯尾镇的炉子重新暖了起来，父母在门口留了一盏灯，等你回家。' : 'The old king has lost. By the law he refused to change, you become the new ruler. Your first decree ends the punishing levies and returns the seized light cores. In Emberwick, the stove is warm again. Your parents leave a lantern by the door, waiting for you.'}</p>
      <blockquote>{zh ? '“往后，想上桌的人，不必先有个贵族姓氏。”' : '“From now on, you don’t need a noble name to take a seat.”'}</blockquote>
      <div className="crown-ending-record"><CrownSeals lang={lang} cleared={cleared} /><div className="crown-ending-tower-record"><CrownMark variant="tower" /><span>{zh ? `供能塔切断 ${progress.towers.length} / 3` : `Supply towers cut: ${progress.towers.length} / 3`}</span></div></div>
      <p className="crown-ending-next">{zh ? '你将挑战资格向所有人开放。洛牙坐到了新竞技场的第一张桌前；阿栓替下一个来客拉开了椅子。王冠换了主人，新的对局才刚开始。' : 'You open the right of challenge to everyone. Rook takes the first seat in the new arena; Axle pulls out a chair for the next arrival. The crown has changed hands. The next game is only beginning.'}</p>
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
