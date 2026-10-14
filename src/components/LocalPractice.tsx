import { acquireBodyScrollLock } from '../logic/bodyScrollLock';
import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Card, Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { MAX_HP } from '../data/constants';
import { assetUrl } from '../assets';
import { initAudio, playSound } from '../audio/sound';
import BattleSprite from './BattleSprite';
import PixelCardArt from './PixelCardArt';
import { Volume2, VolumeX } from './PixelIcons';
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
  onSolo?: () => void;
  onComplete?: () => void;
  muted?: boolean;
  onToggleMute?: () => void;
  reduceMotion?: boolean;
}

type Phase = 'choose' | 'reveal' | 'result';
const STARTER_CARDS = ['charge', 'hong', 'defend'];

export default function LocalPractice({
  lang, avatar, onClose, onPlayFriends, onOpenRules, onSolo, onComplete,
  muted = false, onToggleMute, reduceMotion = false,
}: LocalPracticeProps) {
  const [duel, setDuel] = useState(() => createLocalPractice(lang, avatar));
  const [phase, setPhase] = useState<Phase>('choose');
  const [tipsEnabled, setTipsEnabled] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const phaseRef = useRef<Phase>('choose');
  const completedRef = useRef(false);
  const interactedRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tipsToggleRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const handRef = useRef<HTMLHeadingElement>(null);
  const systemReducedMotion = useSystemReducedMotion();
  const reducedMotion = reduceMotion || systemReducedMotion;
  const say = (zh: string, en: string) => lang === 'zh' ? zh : en;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const releaseScrollLock = acquireBodyScrollLock();
    if (dialog && !dialog.open) dialog.showModal();
    titleRef.current?.focus();
    return () => {
      dialog?.close();
      releaseScrollLock();
      if (previousFocus?.isConnected && previousFocus !== document.body && previousFocus !== document.documentElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'reveal') return;
    const timer = window.setTimeout(() => {
      phaseRef.current = 'result';
      setPhase('result');
      playSound(duel.isGameOver ? duel.winnerId === LOCAL_HERO_ID ? 'win' : 'card_clash' : 'card_slam', muted);
    }, reducedMotion || document.documentElement.classList.contains('reduce-motion') ? 0 : 700);
    return () => window.clearTimeout(timer);
  }, [phase, reducedMotion, duel.isGameOver, duel.winnerId, muted]);

  useEffect(() => {
    if (phase === 'result') resultRef.current?.focus();
    else if (phase === 'choose' && interactedRef.current) handRef.current?.focus();
  }, [phase, duel.lastRound]);

  useEffect(() => {
    if (phase === 'result' && duel.isGameOver && !completedRef.current) {
      completedRef.current = true;
      onComplete?.();
    }
  }, [phase, duel.isGameOver, duel.lastRound, onComplete]);

  const sound = (type: 'click' | 'card_flip' | 'confirm' = 'click') => {
    if (!muted) initAudio();
    playSound(type, muted);
  };
  const play = (card: Card) => {
    if (phaseRef.current !== 'choose' || !getLocalPracticeLegalCards(duel.players).some(legal => legal.id === card.id)) return;
    // Lock before React renders: a double tap or held shortcut cannot play twice.
    phaseRef.current = 'reveal';
    interactedRef.current = true;
    sound('card_flip');
    setDuel(current => resolveLocalPracticeTurn(current, card.id, lang));
    setPhase('reveal');
  };
  const continueDuel = () => {
    if (phaseRef.current !== 'result' || duel.isGameOver) return;
    phaseRef.current = 'choose';
    sound('click');
    setPhase('choose');
  };
  const retry = () => {
    if (phaseRef.current !== 'result' || !duel.isGameOver) return;
    phaseRef.current = 'choose';
    completedRef.current = false;
    sound('confirm');
    setDuel(createLocalPractice(lang, avatar));
    setMoreOpen(false);
    setPhase('choose');
  };
  const leave = (action: () => void) => {
    sound();
    action();
  };

  const round = duel.lastRound;
  const displayedPlayers = phase === 'reveal' && round ? round.before : duel.players;
  const hero = displayedPlayers.find(player => player.id === LOCAL_HERO_ID)!;
  const opponent = displayedPlayers.find(player => player.id === LOCAL_BOT_ID)!;
  const cards = getLocalPracticeCards(duel.players);
  const legalIds = new Set(getLocalPracticeLegalCards(duel.players).map(card => card.id));
  const basicCards = STARTER_CARDS.flatMap(id => cards.filter(card => card.id === id));
  const moreCards = cards.filter(card => !STARTER_CARDS.includes(card.id));
  const newlyAvailable = phase === 'choose' && round
    ? moreCards.filter(card => legalIds.has(card.id) && !getLocalPracticeLegalCards(round.before).some(previous => previous.id === card.id)).length : 0;
  const heroWon = duel.winnerId === LOCAL_HERO_ID;
  const finalTitle = heroWon ? say('漂亮，拿下！', 'Well played!')
    : duel.winnerId === LOCAL_BOT_ID ? say('这局输了', 'Defeat') : say('同归于尽！', 'A double knockout!');
  const turnTitle = !round ? '' : hero.hp < round.before.find(player => player.id === LOCAL_HERO_ID)!.hp
    ? say('被抓住破绽了', 'Caught off guard')
    : opponent.hp < round.before.find(player => player.id === LOCAL_BOT_ID)!.hp
      ? say('命中！', 'A clean hit!')
      : hero.energy > round.before.find(player => player.id === LOCAL_HERO_ID)!.energy
        ? say('能量到手', 'Energy gained')
        : say('双方都还在场', 'Still in the fight');
  const hint = hero.energy === 0
    ? opponent.energy === 0
      ? say('先攒点能量？双方选好后会同时亮牌。', 'Build some energy? Both cards reveal together.')
      : say('对手有能量了。攒可能挨打，防可以挡住普通攻击。', 'They have energy. Charge is risky; Defend blocks basic attacks.')
    : hero.layer !== opponent.layer
      ? say('你们不在同一层，留意招式的攻击范围。', 'You are on different layers. Check your attack’s reach.')
      : hero.energy >= 3
        ? say('咔能破普通防。其他招式也在手牌里，随时可以用。', 'Ka breaks basic Defend. Open your other moves to try it.')
        : opponent.energy === 0
          ? say('对手没能量。你觉得这回会攒，还是防？', 'They have no energy. Will they Charge or Defend?')
          : say('盯住对手的能量，猜猜这次会出什么。', 'Watch their energy. What do you think they will play?');
  const cardSummary = (card: Card) => card.id === 'charge' ? say('安全时 +2 能量', '+2 energy if not hit')
    : card.id === 'hong' ? say('抓住对手攒的时机', 'Catch them charging')
      : card.id === 'defend' ? say('挡住普通攻击', 'Block basic attacks') : card.description[lang];

  const renderCard = (card: Card, index?: number) => {
    const unavailable = !legalIds.has(card.id);
    return <button key={card.id} type="button"
      className={`local-practice-card local-practice-card-${card.type.toLowerCase()}`}
      disabled={unavailable || phase !== 'choose'} onClick={() => play(card)}
      aria-label={`${card.name[lang]} · ${card.cost} ${say('能量', 'energy')} · ${cardSummary(card)}${unavailable ? ` · ${say(`还需 ${Math.max(0, card.cost - hero.energy)} 能量`, `Need ${Math.max(0, card.cost - hero.energy)} more energy`)}` : ''}`}>
      <span className="local-practice-card-top"><span className="local-practice-cost">{card.cost}<span className="local-practice-sr-only"> {say('能量', 'energy')}</span></span>
        {index !== undefined && <kbd aria-hidden="true">{index + 1}</kbd>}</span>
      <span className="local-practice-card-art" aria-hidden="true"><PixelCardArt id={card.id} /></span>
      <strong className="local-practice-card-name">{card.name[lang]}</strong>
      <span className="local-practice-card-description">{cardSummary(card)}</span>
      {unavailable && <span className="local-practice-card-locked">{say(`还需 ${Math.max(0, card.cost - hero.energy)} 能量`, `${Math.max(0, card.cost - hero.energy)} more energy`)}</span>}
    </button>;
  };

  return <dialog ref={dialogRef} className="local-practice-dialog" aria-labelledby="local-practice-title"
    onCancel={event => { event.preventDefault(); leave(onClose); }}
    onKeyDown={event => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || phaseRef.current !== 'choose') return;
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
      const index = ['1', '2', '3'].indexOf(event.key);
      if (index >= 0 && basicCards[index]) { event.preventDefault(); play(basicCards[index]); }
    }}>
    <div className="local-practice" lang={lang === 'zh' ? 'zh-CN' : 'en'} data-phase={phase} data-reduced-motion={reducedMotion}
      style={{ '--local-arena-image': `url("${assetUrl('themes/woodcut-v1/woodcut-tavern.webp')}")` } as CSSProperties}>
      <div className="local-practice-shell">
        <header className="local-practice-header">
          <div><span className="local-practice-eyebrow">{say('随时开打 · 无需联网', 'Jump in · Play offline')}</span>
            <h1 ref={titleRef} tabIndex={-1} id="local-practice-title">{say('酒馆切磋', 'Tavern duel')}</h1></div>
          <div className="local-practice-header-actions">
            <button ref={tipsToggleRef} type="button" className="local-practice-text-button" onClick={() => { sound(); setTipsEnabled(enabled => !enabled); }} aria-pressed={tipsEnabled}>
              {tipsEnabled ? say('提示：开', 'Hints: on') : say('提示：关', 'Hints: off')}</button>
            {onToggleMute && <button type="button" className="local-practice-sound" aria-label={muted ? say('打开声音', 'Enable sound') : say('关闭声音', 'Mute')}
              title={muted ? say('打开声音', 'Enable sound') : say('关闭声音', 'Mute')}
              onClick={() => { if (muted) initAudio(); onToggleMute(); }}>
              {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
            </button>}
            <button type="button" className="local-practice-close" onClick={() => leave(onClose)} aria-label={say('返回', 'Back')}>×</button>
          </div>
        </header>

        <section className={`local-practice-arena${phase === 'result' && duel.isGameOver ? ' is-finished' : ''}`} aria-label={say('对战场地', 'Duel arena')}>
          <div className="local-practice-matchbar">
            {[hero, opponent].map(player => <div key={player.id} className={`local-practice-fighter-stats${player.isBot ? ' is-opponent' : ''}`}>
              <div className="local-practice-fighter-name"><strong>{player.isBot ? say('酒馆机器人', 'Tavern bot') : say('你', 'You')}</strong>
                <span className={`local-practice-life${player.hp <= 0 ? ' is-empty' : ''}`} aria-label={`${say('生命', 'HP')} ${player.hp}/${MAX_HP}`}>♥</span></div>
              <div className="local-practice-energy"><span>{say('能量', 'Energy')}</span><strong>{player.energy}</strong>
                <span className="local-practice-energy-pips" aria-hidden="true">{Array.from({ length: 5 }, (_, index) => <i key={index} className={index < player.energy ? 'is-filled' : ''} />)}</span></div>
              <div className="local-practice-public-state"><span className="local-practice-layer">{player.layer === 0 ? say('地面', 'Ground') : player.layer > 0 ? say(`空中 ${player.layer} 层`, `Layer +${player.layer}`) : say(`地下 ${Math.abs(player.layer)} 层`, `Layer ${player.layer}`)}</span>
                {player.lastCardId && <span>{say('上手', 'Last')}: {SKILL_DB.find(card => card.id === player.lastCardId)?.name[lang]}</span>}</div>
            </div>)}
            <span className="local-practice-turn">{say('回合', 'TURN')}<strong>{phase === 'choose' ? duel.turn : round?.turn}</strong></span>
          </div>

          <div className="local-practice-stage" aria-hidden="true">
            {[hero, opponent].map(player => <div key={player.id} className={`local-practice-figure${player.isBot ? ' is-opponent' : ' is-hero'}${player.isDead ? ' is-out' : ''}${phase === 'reveal' ? ' is-acting' : ''}`}>
              <span className="local-practice-figure-shadow" />
              <BattleSprite avatar={player.isBot ? 'avatars/robot.webp' : avatar || 'avatars/bdrag.png'} name={player.name}
                direction={player.isBot ? 'sw' : 'ne'} reduced={reducedMotion}
                actionKey={phase === 'reveal' ? `local-${round?.turn}-${player.id}` : undefined} />
            </div>)}
            {phase === 'choose' ? <div className="local-practice-versus"><span>VS</span><small>{say('出牌见分晓', 'Make it count')}</small></div>
              : <div className={`local-practice-revealed${phase === 'reveal' ? ' is-revealing' : ''}`}>
                {[LOCAL_HERO_ID, LOCAL_BOT_ID].map(id => {
                  const card = SKILL_DB.find(candidate => candidate.id === round?.moves[id])!;
                  return <div key={id} className={`local-practice-reveal-card local-practice-reveal-${card.type.toLowerCase()}`}>
                    <span className="local-practice-reveal-label">{id === LOCAL_HERO_ID ? say('你', 'YOU') : say('对手', 'BOT')}</span>
                    <span className="local-practice-reveal-art"><PixelCardArt id={card.id} /></span><strong>{card.name[lang]}</strong>
                  </div>;
                })}
              </div>}
          </div>
          <div className="local-practice-arena-caption" role="status" aria-live="polite">
            {phase === 'choose' ? say('同时出牌 · 命中即可淘汰', 'Simultaneous moves · One hit wins')
              : phase === 'reveal' ? say('亮牌！', 'Reveal!') : duel.isGameOver ? finalTitle : turnTitle}
            {phase !== 'choose' && round && <span className="local-practice-sr-only">{say('你出了', 'You played')} {SKILL_DB.find(card => card.id === round.moves[LOCAL_HERO_ID])?.name[lang]} · {say('对手出了', 'Opponent played')} {SKILL_DB.find(card => card.id === round.moves[LOCAL_BOT_ID])?.name[lang]}</span>}
          </div>
        </section>

        {phase === 'choose' ? <section className="local-practice-hand" aria-labelledby="local-practice-hand-title">
          <div className="local-practice-hand-heading"><h2 ref={handRef} tabIndex={-1} id="local-practice-hand-title">{say('轮到你了', 'Make your move')}</h2>
            <button type="button" className={`local-practice-text-button local-practice-more-toggle${newlyAvailable ? ' has-new-moves' : ''}`}
              onClick={() => { sound(); setMoreOpen(open => !open); }} aria-expanded={moreOpen} aria-controls={moreOpen ? 'local-practice-more-cards' : undefined}>
              {moreOpen ? say('收起其他招式', 'Hide other moves') : say('其他招式', 'Other moves')}
              {!moreOpen && newlyAvailable > 0 && <span className="local-practice-new-count">+{newlyAvailable}</span>}
              <span aria-hidden="true">{moreOpen ? ' −' : ' +'}</span>
            </button></div>
          {tipsEnabled && <div className="local-practice-hint"><span aria-hidden="true">✦</span><p>{hint}</p>
            <button type="button" onClick={() => { sound(); setTipsEnabled(false); tipsToggleRef.current?.focus(); }} aria-label={say('关闭提示', 'Dismiss hints')}>×</button></div>}
          <div className="local-practice-cards">{basicCards.map((card, index) => renderCard(card, index))}</div>
          {moreOpen && <div id="local-practice-more-cards" className="local-practice-extra-cards">{moreCards.map(card => renderCard(card))}</div>}
        </section> : phase === 'reveal' ? <p className="local-practice-resolving" role="status">{say('双方已锁定出牌…', 'Both moves are locked…')}</p>
          : round && <section ref={resultRef} tabIndex={-1} className={`local-practice-result${duel.isGameOver ? ` is-final${heroWon ? ' is-victory' : ''}` : ''}`} aria-labelledby="local-practice-result-title">
            <div className="local-practice-result-copy">
              {duel.isGameOver && <span className="local-practice-result-eyebrow">{heroWon ? say('切磋获胜', 'DUEL WON') : duel.winnerId ? say('本局结束', 'DUEL COMPLETE') : say('平局', 'DRAW')}</span>}
              <h2 id="local-practice-result-title">{duel.isGameOver ? finalTitle : turnTitle}</h2>
              <p>{round.explanation}</p>
            </div>
            <div className="local-practice-actions">
              {duel.isGameOver ? <>
                <button type="button" className="local-practice-primary" onClick={() => leave(onPlayFriends)}>{say('和朋友开一局', 'Play with friends')} <span aria-hidden="true">↗</span></button>
                <button type="button" onClick={retry}>{say('再来一局', 'Play again')}</button>
                {onSolo && <button type="button" className="local-practice-text-button" onClick={() => leave(onSolo)}>{say('独自出发', 'Go solo')} <span aria-hidden="true">→</span></button>}
              </> : <button type="button" className="local-practice-primary" onClick={continueDuel}>{say('下一回合', 'Next turn')} <span aria-hidden="true">→</span></button>}
            </div>
            {round.logs.length > 0 && <details className="local-practice-log"><summary>{say('看看刚才发生了什么', 'See what happened')}</summary><ul>{round.logs.map((log, index) => <li key={`${log.type}-${index}`}>{log.text}</li>)}</ul></details>}
          </section>}

        <footer className="local-practice-footer">
          <button type="button" className="local-practice-text-button" onClick={() => leave(onOpenRules)}>{say('翻翻牌谱', 'Card guide')}</button>
          {!(phase === 'result' && duel.isGameOver) && <button type="button" className="local-practice-text-button" onClick={() => leave(onPlayFriends)}>{say('直接和朋友玩', 'Play with friends')} <span aria-hidden="true">↗</span></button>}
        </footer>
      </div>
    </div>
  </dialog>;
}
