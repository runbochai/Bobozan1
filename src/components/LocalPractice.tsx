import { useEffect, useRef, useState } from 'react';
import type { Card, Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { MAX_HP } from '../data/constants';
import PixelCardArt from './PixelCardArt';
import { useSystemReducedMotion } from './useSystemReducedMotion';
import {
  createLocalPractice, getLocalPracticeCards, getLocalPracticeLegalCards,
  LOCAL_BOT_ID, LOCAL_HERO_ID, resolveLocalPracticeTurn,
} from '../logic/localPractice';
import './LocalPractice.css';

interface LocalPracticeProps {
  lang: Lang;
  avatar?: string;
  onClose: () => void;
  onPlayFriends: () => void;
  onOpenRules: () => void;
}

type Phase = 'choose' | 'reveal' | 'result';
const STARTER_CARDS = ['charge', 'hong', 'defend', 'ka'];

export default function LocalPractice({ lang, avatar, onClose, onPlayFriends, onOpenRules }: LocalPracticeProps) {
  const [duel, setDuel] = useState(() => createLocalPractice(lang, avatar));
  const [phase, setPhase] = useState<Phase>('choose');
  const phaseRef = useRef<Phase>('choose');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const handRef = useRef<HTMLElement>(null);
  const reducedMotion = useSystemReducedMotion();
  const say = (zh: string, en: string) => lang === 'zh' ? zh : en;

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
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'reveal') return;
    const timer = window.setTimeout(() => {
      phaseRef.current = 'result';
      setPhase('result');
    }, reducedMotion || document.documentElement.classList.contains('reduce-motion') ? 0 : 650);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion]);

  useEffect(() => {
    if (phase === 'result') resultRef.current?.focus();
  }, [phase]);

  const play = (card: Card) => {
    if (phaseRef.current !== 'choose') return;
    // A synchronous lock also guards two clicks delivered before React renders.
    phaseRef.current = 'reveal';
    setDuel(current => resolveLocalPracticeTurn(current, card.id, lang));
    setPhase('reveal');
  };
  const continueDuel = () => {
    if (phaseRef.current !== 'result') return;
    phaseRef.current = 'choose';
    setPhase('choose');
    window.requestAnimationFrame(() => handRef.current?.focus());
  };
  const retry = () => {
    phaseRef.current = 'choose';
    setDuel(createLocalPractice(lang, avatar));
    setPhase('choose');
    window.requestAnimationFrame(() => handRef.current?.focus());
  };

  const round = duel.lastRound;
  const displayedPlayers = phase === 'reveal' && round ? round.before : duel.players;
  const hero = displayedPlayers.find(player => player.id === LOCAL_HERO_ID)!;
  const cards = getLocalPracticeCards(duel.players);
  const legalIds = new Set(getLocalPracticeLegalCards(duel.players).map(card => card.id));
  const basicCards = STARTER_CARDS.flatMap(id => cards.filter(card => card.id === id));
  const moreCards = cards.filter(card => !STARTER_CARDS.includes(card.id));
  const resultTitle = duel.isGameOver
    ? duel.winnerId === LOCAL_HERO_ID ? say('你赢了！', 'You won!')
      : duel.winnerId === LOCAL_BOT_ID ? say('这局对手赢了', 'The bot won this duel') : say('这局平手', 'This duel is a draw')
    : say('看懂这一回合', 'Read this turn');

  const renderCard = (card: Card) => {
    const unavailable = !legalIds.has(card.id);
    return <button key={card.id} type="button" className={`local-practice-card local-practice-card-${card.type.toLowerCase()}`}
      disabled={unavailable || phase !== 'choose'} onClick={() => play(card)}>
      <span className="local-practice-card-art" aria-hidden="true"><PixelCardArt id={card.id} /></span>
      <span className="local-practice-card-copy">
        <span className="local-practice-card-heading"><strong>{card.name[lang]}</strong><span>{card.cost} {say('能量', 'energy')}</span></span>
        <span className="local-practice-card-description">{card.description[lang]}</span>
        {unavailable && <span className="local-practice-card-locked">{say(`还需 ${Math.max(0, card.cost - hero.energy)} 能量`, `Need ${Math.max(0, card.cost - hero.energy)} more energy`)}</span>}
      </span>
    </button>;
  };

  return <dialog ref={dialogRef} className="local-practice-dialog" aria-labelledby="local-practice-title" aria-describedby="local-practice-intro"
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <div className="local-practice">
      <header className="local-practice-header">
        <div><span className="local-practice-eyebrow">{say('单局机器人练习 · 无需联网', 'One duel vs a bot · Offline')}</span>
          <h1 id="local-practice-title">{say('先试一局，再和朋友玩', 'Try a duel, then play with friends')}</h1></div>
        <button ref={closeRef} type="button" className="local-practice-close" onClick={onClose} aria-label={say('关闭练习', 'Close practice')}>×</button>
      </header>
      <p id="local-practice-intro" className="local-practice-intro">{say('使用多人对战的出牌和结算规则：1 生命、零能量开局。双方同时出牌；机器人在你选择前已锁定，不会偷看。', 'Use multiplayer card and combat rules: start with 1 HP and zero energy. Moves resolve together; the bot locks its card before you choose.')}</p>
      <div className="local-practice-toolbar"><strong>{say('回合', 'Turn')} {phase === 'choose' ? duel.turn : round?.turn}</strong>
        <button type="button" onClick={onOpenRules}>{say('查规则 / 进阶练习', 'Rules / More exercises')}</button></div>
      <section className="local-practice-fighters" aria-label={say('双方当前状态', 'Current player stats')}>
        {displayedPlayers.slice().sort((a, b) => Number(a.isBot) - Number(b.isBot)).map(player => {
          const previousCard = SKILL_DB.find(card => card.id === player.lastCardId);
          return <article key={player.id} className={`local-practice-fighter${player.isDead ? ' is-out' : ''}`}>
            <h2>{player.isBot ? '◈ ' : '● '}{player.name}</h2>
            <div className="local-practice-stats"><span>{say('生命', 'HP')} <strong>{player.hp} / {MAX_HP}</strong></span><span>{say('能量', 'Energy')} <strong>{player.energy}</strong></span></div>
            <p>{player.isDead ? say('已淘汰', 'Eliminated') : previousCard ? say(`上回合：${previousCard.name.zh}`, `Previous: ${previousCard.name.en}`) : say('基础手牌 · 同时出牌', 'Base cards · Simultaneous moves')}</p>
          </article>;
        })}
      </section>

      {phase === 'choose' ? <section ref={handRef} tabIndex={-1} className="local-practice-hand" aria-labelledby="local-practice-hand-title">
        <h2 id="local-practice-hand-title">{say('选一张牌，双方一起揭晓', 'Choose a card, reveal both together')}</h2>
        <p className="local-practice-hint">{hero.energy === 0
          ? say('没有能量也能攒或防。攒可获得 2 能量，但被命中会中断。', 'With zero energy, you can Charge or Defend. Charge gains 2 energy unless a hit interrupts it.')
          : say('留意对手的能量：攻击抓攒，普通防挡轰，咔可破普通防。', 'Watch the opponent’s energy: attacks punish Charge, Defend blocks Blast, and Ka breaks Defend.')}</p>
        <div className="local-practice-cards">{basicCards.map(renderCard)}</div>
        {moreCards.length > 0 && <details className="local-practice-more"><summary>{say(`更多基础牌（${moreCards.length}）`, `More base cards (${moreCards.length})`)}</summary><div className="local-practice-cards">{moreCards.map(renderCard)}</div></details>}
      </section> : round && <section className="local-practice-resolution" aria-labelledby="local-practice-reveal-title">
        <h2 id="local-practice-reveal-title">{say('同时揭牌', 'Cards revealed together')}</h2>
        <div className={`local-practice-revealed${phase === 'reveal' ? ' is-revealing' : ''}`}>
          {[LOCAL_HERO_ID, LOCAL_BOT_ID].map(id => {
            const card = SKILL_DB.find(candidate => candidate.id === round.moves[id])!;
            return <div key={id} className="local-practice-reveal-card"><span>{id === LOCAL_HERO_ID ? say('你出了', 'Your card') : say('对手出了', 'Bot’s card')}</span><span className="local-practice-reveal-art" aria-hidden="true"><PixelCardArt id={card.id} /></span><strong>{card.name[lang]}</strong><span>{card.cost} {say('能量', 'energy')}</span></div>;
          })}
        </div>
        {phase === 'reveal' ? <p className="local-practice-hint" role="status">{say('双方出牌已锁定，正在结算…', 'Both cards are locked. Resolving…')}</p> : <div ref={resultRef} tabIndex={-1} className="local-practice-result" aria-live="polite">
          <h2>{resultTitle}</h2><p>{round.explanation}</p>
          {round.logs.length > 0 && <details className="local-practice-log"><summary>{say('本回合结算记录', 'This turn’s combat log')}</summary><ul>{round.logs.map((log, index) => <li key={`${log.type}-${index}`}>{log.text}</li>)}</ul></details>}
          {duel.isGameOver ? <p className="local-practice-progress-note">{say('这是一场本地练习，不保存联机战绩。多人房间会继续下一局，胜者获得新技能。', 'This local practice does not save multiplayer progress. In a multiplayer room, the series continues and the winner gains a new skill.')}</p> : null}
          <div className="local-practice-actions">
            <button type="button" className="local-practice-primary" onClick={duel.isGameOver ? onPlayFriends : continueDuel}>{duel.isGameOver ? say('和朋友玩', 'Play with friends') : say('下一回合', 'Next turn')}</button>
            {duel.isGameOver && <button type="button" onClick={retry}>{say('再练一局', 'Practice again')}</button>}
          </div>
        </div>}
      </section>}
      <footer className="local-practice-footer"><span>{say('随时可以去联机，不需要通关练习。', 'You can join multiplayer any time; practice is optional.')}</span><button type="button" onClick={onPlayFriends}>{say('去和朋友玩 →', 'Play with friends →')}</button></footer>
    </div>
  </dialog>;
}
