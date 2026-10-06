import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { Lang } from '../types';
import type { ExpeditionPersonality } from '../data/expedition';
import { expeditionHabitLabel, getExpeditionLesson, type ExpeditionLessonContext } from '../data/expeditionLessons';
import { SKILL_DB } from '../data/skills';
import PixelCardArt from './PixelCardArt';
import './ExpeditionCoach.css';

function HintDialog({ title, lang, onClose, children }: { title: string; lang: Lang; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const element = ref.current!;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal();
    return () => { element.close(); if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={ref} className="exp-hint-dialog" aria-labelledby={titleId}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={titleId}>{title}</h2><button type="button" onClick={onClose} aria-label={lang === 'zh' ? '关闭' : 'Close'}>×</button></header>
    {children}
    <button type="button" className="exp-hint-return" onClick={onClose}>{lang === 'zh' ? '返回战斗' : 'Back to battle'}</button>
  </dialog>, document.body);
}

function SmallCards({ ids, relation }: { ids: string[]; relation?: string }) {
  return <span className="exp-hint-mini-cards" aria-hidden="true">{ids.slice(-3).map((id, index) => <span className="exp-hint-mini-pair" key={`${id}-${index}`}>
    {index > 0 && relation && <span className="exp-hint-relation">{relation}</span>}
    <span className="exp-hint-mini-card"><PixelCardArt id={id} /></span>
  </span>)}</span>;
}

function ExplainedCards({ ids, lang, history = false }: { ids: string[]; lang: Lang; history?: boolean }) {
  return <ol className="exp-hint-card-list">{ids.slice(-3).map((id, index) => {
    const card = SKILL_DB.find(item => item.id === id);
    if (!card) return null;
    return <li key={`${id}-${index}`}><PixelCardArt id={id} /><div>
      <strong>{card.name[lang]} <small>⚡{card.cost}</small></strong>
      {history && <small>{index === ids.slice(-3).length - 1 ? (lang === 'zh' ? '最近一张' : 'Most recent') : (lang === 'zh' ? '较早出牌' : 'Earlier move')}</small>}
      <p>{card.description[lang]}</p>
    </div></li>;
  })}</ol>;
}

export interface ExpeditionCoachProps extends ExpeditionLessonContext { lang: Lang; }

/** Compact and optional; no legal move is disabled or preselected by this hint. */
export default function ExpeditionCoach({ lang, ...context }: ExpeditionCoachProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [details, setDetails] = useState(false);
  const hint = getExpeditionLesson(context);
  const zh = lang === 'zh';
  if (context.hero.isDead) return null;
  return <div className="exp-coach" data-collapsed={collapsed} data-lesson={hint.id}>
    {collapsed ? <button type="button" className="exp-coach-restore" onClick={() => setCollapsed(false)} aria-label={zh ? '展开实战提示' : 'Show battle hint'}>✦ {zh ? '提示' : 'Hint'} +</button> : <>
      <button type="button" className="exp-coach-message" onClick={() => setDetails(true)} title={hint.text[lang]} aria-label={`${hint.text[lang]} ${zh ? '查看图例' : 'View example'}`}>
        <span className="exp-coach-mark" aria-hidden="true">✦</span><span className="exp-coach-text">{hint.text[lang]}</span>
        <SmallCards ids={hint.cardIds} relation={hint.relation} />
      </button>
      <button type="button" className="exp-coach-collapse" onClick={() => { setDetails(false); setCollapsed(true); }} aria-label={zh ? '收起实战提示' : 'Collapse battle hint'} title={zh ? '收起' : 'Collapse'}>−</button>
    </>}
    {details && <HintDialog title={zh ? '实战提示' : 'Battle hint'} lang={lang} onClose={() => setDetails(false)}>
      <p className="exp-hint-lead">{hint.text[lang]}</p><p>{hint.detail[lang]}</p>
      {!!hint.cardIds.length && <><p className="exp-hint-caption">{zh ? '规则图例 · 不是对手下一张牌' : 'Rule example · not the opponent’s next move'}</p><ExplainedCards ids={hint.cardIds} lang={lang} /></>}
    </HintDialog>}
  </div>;
}

export interface ExpeditionTellProps {
  lang: Lang;
  history: string[];
  personality?: ExpeditionPersonality;
  bluff?: boolean;
  name?: string;
}

/** Only previously resolved cards are accepted; future intent is not a prop. */
export function ExpeditionTell({ lang, history, personality, bluff, name }: ExpeditionTellProps) {
  const [open, setOpen] = useState(false);
  const zh = lang === 'zh';
  const label = bluff ? (zh ? '爱诈唬' : 'Bluffer') : expeditionHabitLabel(personality, lang);
  const cards = history.slice(-3);
  return <div className="exp-tell">
    <button type="button" className="exp-tell-trigger" onClick={() => setOpen(true)} aria-label={`${name ?? ''} ${label} · ${zh ? '查看已出牌记录，不是下一招' : 'View past cards, not the next move'}`}>
      <span className="exp-tell-label">{label}</span>
      {cards.length ? <SmallCards ids={cards} /> : <small className="exp-tell-empty">{zh ? '暂无记录' : 'No history'}</small>}
    </button>
    {open && <HintDialog title={name ? `${name} · ${zh ? '已出牌' : 'Past moves'}` : (zh ? '已出牌记录' : 'Past moves')} lang={lang} onClose={() => setOpen(false)}>
      <p className="exp-hint-lead">{label} · {zh ? '倾向不是下一招' : 'A habit is not a promise'}</p>
      <p>{zh ? '这里只显示已经结算的出牌，从较早到最近。结合当前能量猜招，对手也可能改变习惯。' : 'Only resolved cards appear here, from oldest to newest. Read them alongside current energy; the opponent may change habits.'}</p>
      {cards.length ? <ExplainedCards ids={cards} lang={lang} history /> : <p className="exp-hint-caption">{zh ? '第一回合结束后，这里会留下公开记录。' : 'Public history appears after the first turn resolves.'}</p>}
    </HintDialog>}
  </div>;
}
