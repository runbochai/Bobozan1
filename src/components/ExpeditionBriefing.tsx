import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Lang, LogEntry } from '../types';
import PixelCardArt from './PixelCardArt';
import { SKILL_DB } from '../data/skills';
import { EXPEDITION_STAGES } from '../data/expedition';
import './ExpeditionBriefing.css';

export interface ExpeditionRecap {
  turn: number;
  hpBefore: number;
  hpAfter: number;
  energyBefore: number;
  energyAfter: number;
  cards: { name: string; id: string }[];
  logs: LogEntry[];
}

export default function ExpeditionBriefing({ lang, recap, onClose, onPractice, onStart }: {
  lang: Lang; recap?: ExpeditionRecap; onClose: () => void; onPractice: () => void; onStart?: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const zh = lang === 'zh';
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  return createPortal(<dialog ref={dialog} className="exp-briefing" aria-labelledby="exp-briefing-title" onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id="exp-briefing-title">{recap ? (zh ? `第 ${recap.turn} 回合 · 复盘` : `Turn ${recap.turn} · Review`) : (zh ? '远征怎么赢' : 'How to win an expedition')}</h2>
      <button type="button" onClick={onClose} aria-label={zh ? '关闭' : 'Close'}>×</button></header>
    {recap ? <>
      <p className="exp-recap-stats">♥ {recap.hpBefore} → {recap.hpAfter} <span>⚡ {recap.energyBefore} → {recap.energyAfter}</span></p>
      <div className="exp-recap-cards">{recap.cards.map((card, index) => <figure key={index}><PixelCardArt id={card.id} /><figcaption>{card.name}<strong>{SKILL_DB.find(skill => skill.id === card.id)?.name[lang]}</strong></figcaption></figure>)}</div>
      <ul className="exp-recap-log">{recap.logs.map((log, index) => <li key={index}>{log.text}</li>)}</ul>
      <p className="exp-briefing-note">{zh ? '双方同时出牌。平手也扣能量；多人混战中，其他人的攻击仍会分别结算。' : 'Moves resolve together. Ties still cost Energy; each other opponent can also hit you.'}</p>
    </> : <>
      <div className="exp-briefing-rules">
        <article><PixelCardArt id="charge" /><div><h3>{zh ? '先读习惯，再猜下一张' : 'Read habits, predict the move'}</h3><p>{zh ? '看能量和上一张牌。对手先选好牌，再等你出手；习惯提示不是答案。' : 'Watch Energy and the last card. Opponents choose before you play; a habit is not a promise.'}</p></div></article>
        <article><PixelCardArt id="defend" /><div><h3>{zh ? '活下来，清掉这一桌' : 'Survive and clear the table'}</h3><p>{zh ? '击败本关所有对手才能领奖。混战中他们也会互打；有人倒下不会重置你的血量。' : 'Defeat every opponent for a reward. They can hit each other; eliminations do not reset your HP.'}</p></div></article>
        <article><PixelCardArt id="pegasus" /><div><h3>{zh ? '选奖励，再去补给' : 'Choose a reward, then resupply'}</h3><p>{zh ? '升级解锁新招（本轮最高 Lv.5），治疗补血，体魄加上限。金币可买装备和限次秘技。' : 'Levels unlock moves (up to Lv.5 this run). Heal restores HP; Vigor raises the cap. Spend gold on gear and limited skills.'}</p></div></article>
      </div>
      <p className="exp-briefing-note">{zh ? `打过全部 ${EXPEDITION_STAGES.length} 关即通关。死亡或重新开始会清空本轮等级、金币和物品；已学课程与历史最佳保留。本轮途中退出或刷新不会存档。` : `Clear all ${EXPEDITION_STAGES.length} stages to win. Death or restarting resets this run’s levels, gold and items; lessons and your best record remain. Leaving or refreshing does not save the current run.`}</p>
    </>}
    <footer><button type="button" onClick={onPractice}>{zh ? '练习 / 查规则' : 'Practice / rules'}</button><button type="button" className="exp-briefing-primary" onClick={onStart ?? onClose}>{onStart ? (zh ? '开始远征' : 'Start expedition') : (zh ? '明白了' : 'Got it')}</button></footer>
  </dialog>, document.body);
}
