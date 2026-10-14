import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { BattleSpeed, Card, Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { MAX_HP } from '../data/constants';
import { CARD_COMPARE_END_MS, CARD_COMPARE_IMPACT_MS, CARD_COMPARE_START_MS, CARD_LAND_MS,
  SOLO_MOTION_SCALE, SOLO_REDUCED_SHOWDOWN_MS, SOLO_SHOWDOWN_MS, remainingBattleTime } from '../data/battleTiming';
import { getShowdownWinner } from '../logic/combat';
import { battleTimeMs, normalizeBattleSpeed } from '../logic/battleSpeed';
import { assetUrl } from '../assets';
import { initAudio, playSound } from '../audio/sound';
import BattleSprite from './BattleSprite';
import WoodcutCardFace from './WoodcutCardFace';
import { Settings, Volume2, VolumeX } from './PixelIcons';
import { useEdgeScroll } from './useEdgeScroll';
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
  onOpenSettings?: () => void;
  reduceMotion?: boolean;
  speed?: BattleSpeed;
}

type Phase = 'choose' | 'reveal' | 'result';
const STARTER_CARDS = ['charge', 'hong', 'defend'];

export default function LocalPractice({
  lang, avatar, onClose, onPlayFriends, onOpenRules, onSolo, onComplete,
  muted = false, onToggleMute, onOpenSettings, reduceMotion = false, speed = 1,
}: LocalPracticeProps) {
  const [duel, setDuel] = useState(() => createLocalPractice(lang, avatar));
  const [phase, setPhase] = useState<Phase>('choose');
  // Settings apply to the next accepted play. An in-flight round, including its
  // final result, retains one animation and settlement clock.
  const [roundSpeed, setRoundSpeed] = useState<BattleSpeed>(1);
  const [tipsEnabled, setTipsEnabled] = useState(false);
  const phaseRef = useRef<Phase>('choose');
  const completedRef = useRef(false);
  const interactedRef = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const tipsToggleRef = useRef<HTMLButtonElement>(null);
  const resultRef = useRef<HTMLElement>(null);
  const handRef = useRef<HTMLHeadingElement>(null);
  const handScrollRef = useRef<HTMLDivElement>(null);
  const roundStartedRef = useRef(0);
  const impactPlayedRef = useRef(false);
  const systemReducedMotion = useSystemReducedMotion();
  const reducedMotion = reduceMotion || systemReducedMotion;
  const round = duel.lastRound;
  // The engine clears selectedCardId after settlement. Reconstruct the original
  // committed plays from the immutable reveal snapshot, including lethal hits.
  const slamWinners = new Set(round ? getShowdownWinner(round.before.map(player => ({
    ...player, selectedCardId: round.moves[player.id],
  }))) : []);
  const hasSlam = slamWinners.size > 0;
  useEdgeScroll(handScrollRef, phase === 'choose');
  const say = (zh: string, en: string) => lang === 'zh' ? zh : en;

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    if (dialog && !dialog.open) dialog.showModal();
    titleRef.current?.focus();
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && previousFocus !== document.body && previousFocus !== document.documentElement) previousFocus.focus();
    };
  }, []);

  useEffect(() => {
    if (phase !== 'reveal') return;
    if (!roundStartedRef.current) roundStartedRef.current = Date.now();
    const still = reducedMotion || document.documentElement.classList.contains('reduce-motion');
    const impactTimer = hasSlam && !still && !impactPlayedRef.current ? window.setTimeout(() => {
      impactPlayedRef.current = true;
      playSound('card_slam', muted);
    }, remainingBattleTime(roundStartedRef.current, battleTimeMs(CARD_COMPARE_IMPACT_MS * SOLO_MOTION_SCALE, roundSpeed), Date.now())) : undefined;
    const timer = window.setTimeout(() => {
      // The engine has already resolved this turn and committed the next bot
      // move. Only a finished duel needs a result screen between plays.
      const nextPhase = duel.isGameOver ? 'result' : 'choose';
      phaseRef.current = nextPhase;
      setPhase(nextPhase);
      if (duel.isGameOver) playSound(duel.winnerId === LOCAL_HERO_ID ? 'win' : 'card_clash', muted);
    }, remainingBattleTime(roundStartedRef.current,
      battleTimeMs(still ? SOLO_REDUCED_SHOWDOWN_MS : SOLO_SHOWDOWN_MS, roundSpeed), Date.now()));
    return () => { window.clearTimeout(timer); window.clearTimeout(impactTimer); };
  }, [phase, reducedMotion, duel.isGameOver, duel.winnerId, hasSlam, muted, roundSpeed]);

  useEffect(() => {
    if (phase === 'result') resultRef.current?.focus();
    else if (phase === 'choose' && interactedRef.current) handRef.current?.focus({ preventScroll: true });
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
    setRoundSpeed(normalizeBattleSpeed(speed));
    roundStartedRef.current = 0;
    impactPlayedRef.current = false;
    interactedRef.current = true;
    sound('card_flip');
    setDuel(current => resolveLocalPracticeTurn(current, card.id, lang));
    setPhase('reveal');
  };
  const retry = () => {
    if (phaseRef.current !== 'result' || !duel.isGameOver) return;
    phaseRef.current = 'choose';
    completedRef.current = false;
    sound('confirm');
    setDuel(createLocalPractice(lang, avatar));
    setPhase('choose');
  };
  const leave = (action: () => void) => {
    sound();
    action();
  };

  const displayedPlayers = phase === 'reveal' && round ? round.before : duel.players;
  const hero = displayedPlayers.find(player => player.id === LOCAL_HERO_ID)!;
  const opponent = displayedPlayers.find(player => player.id === LOCAL_BOT_ID)!;
  const cards = getLocalPracticeCards(displayedPlayers);
  const legalIds = new Set(getLocalPracticeLegalCards(displayedPlayers).map(card => card.id));
  const basicCards = STARTER_CARDS.flatMap(id => cards.filter(card => card.id === id));
  const handCards = [...basicCards, ...cards.filter(card => !STARTER_CARDS.includes(card.id))];
  const heroWon = duel.winnerId === LOCAL_HERO_ID;
  const finalTitle = heroWon ? say('漂亮，拿下！', 'Well played!')
    : duel.winnerId === LOCAL_BOT_ID ? say('这局输了', 'Defeat') : say('同归于尽！', 'A double knockout!');
  const hint = hero.energy === 0
    ? opponent.energy === 0
      ? say('先攒点能量？双方选好后会同时亮牌。', 'Build some energy? Both cards reveal together.')
      : say('对手有能量了。攒可能挨打，防可以挡住普通攻击。', 'They have energy. Charge is risky; Defend blocks basic attacks.')
    : hero.layer !== opponent.layer
      ? say('你们不在同一层，留意招式的攻击范围。', 'You are on different layers. Check your attack’s reach.')
      : hero.energy >= 3
        ? say('咔能破普通防。左右滑动手牌，看看还有什么招式。', 'Ka breaks basic Defend. Scroll your hand to see every move.')
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
      disabled={unavailable || phase !== 'choose'} onClick={event => { if (event.detail <= 1) play(card); }}
      title={`${card.name[lang]} · ${card.cost} ${say('能量', 'energy')} · ${cardSummary(card)}`}
      aria-label={`${card.name[lang]} · ${card.cost} ${say('能量', 'energy')} · ${cardSummary(card)}${unavailable ? ` · ${say(`还需 ${Math.max(0, card.cost - hero.energy)} 能量`, `Need ${Math.max(0, card.cost - hero.energy)} more energy`)}` : ''}`}>
      <span className="local-practice-card-face" aria-hidden="true"><WoodcutCardFace card={card} lang={lang} /></span>
      <span className="local-practice-card-description">{index !== undefined && <kbd aria-hidden="true">{index + 1}</kbd>}{cardSummary(card)}</span>
      <span className={`local-practice-card-locked${unavailable ? '' : ' is-available'}`} aria-hidden={!unavailable}>
        {unavailable ? say(`还需 ${Math.max(0, card.cost - hero.energy)} 能量`, `${Math.max(0, card.cost - hero.energy)} more energy`) : '\u00a0'}
      </span>
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
      data-battle-speed={roundSpeed} style={{
        '--local-arena-image': `url("${assetUrl('themes/woodcut-v1/woodcut-tavern.webp')}")`,
        '--local-lunge-duration': `${battleTimeMs(650, roundSpeed)}ms`,
        '--local-second-reveal-delay': `${battleTimeMs(40, roundSpeed)}ms`,
        '--local-mark-duration': `${battleTimeMs(1, roundSpeed)}ms`,
      } as CSSProperties}>
      <div className="local-practice-shell">
        <header className="local-practice-header">
          <div><span className="local-practice-eyebrow">{say('一对一对练', 'One-on-one sparring')}</span>
            <h1 ref={titleRef} tabIndex={-1} id="local-practice-title">{say('自由对练', 'Free sparring')}</h1></div>
          <div className="local-practice-header-actions">
            <button ref={tipsToggleRef} type="button" className="local-practice-text-button" onClick={() => { sound(); setTipsEnabled(enabled => !enabled); }} aria-pressed={tipsEnabled}>
              {tipsEnabled ? say('提示：开', 'Hints: on') : say('提示：关', 'Hints: off')}</button>
            {onOpenSettings ? <button type="button" className="local-practice-sound" aria-label={say('设置', 'Settings')}
              title={say('设置', 'Settings')} onClick={onOpenSettings}>
              <Settings size={18} aria-hidden="true" />
            </button> : onToggleMute && <button type="button" className="local-practice-sound" aria-label={muted ? say('打开声音', 'Enable sound') : say('关闭声音', 'Mute')}
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
              <div className="local-practice-fighter-name"><strong>{player.isBot ? say('陪练', 'Sparring bot') : say('你', 'You')}</strong>
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
                direction={player.isBot ? 'sw' : 'ne'} reduced={reducedMotion} quick speed={roundSpeed}
                actionKey={phase === 'reveal' ? `local-${round?.turn}-${player.id}` : undefined} />
            </div>)}
            {phase !== 'choose' && round && <div key={round.turn} className={`local-practice-revealed${phase === 'reveal' ? ' is-revealing' : ''}`}
              data-reveal-turn={round.turn} style={{
                '--local-reveal-duration': `${battleTimeMs(CARD_LAND_MS * SOLO_MOTION_SCALE, roundSpeed)}ms`,
                '--local-slam-delay': `${battleTimeMs(CARD_COMPARE_START_MS * SOLO_MOTION_SCALE, roundSpeed)}ms`,
                '--local-slam-duration': `${battleTimeMs((CARD_COMPARE_END_MS - CARD_COMPARE_START_MS) * SOLO_MOTION_SCALE, roundSpeed)}ms`,
                '--local-impact-delay': `${battleTimeMs(CARD_COMPARE_IMPACT_MS * SOLO_MOTION_SCALE, roundSpeed)}ms`,
                '--local-impact-duration': `${battleTimeMs((CARD_COMPARE_END_MS - CARD_COMPARE_IMPACT_MS) * SOLO_MOTION_SCALE, roundSpeed)}ms`,
              } as CSSProperties}>
                {[LOCAL_HERO_ID, LOCAL_BOT_ID].map((id, index) => {
                  const card = SKILL_DB.find(candidate => candidate.id === round?.moves[id])!;
                  const winner = slamWinners.has(id);
                  return <div key={id} data-player-id={id} data-slam-winner={winner}
                    className={`local-practice-reveal-card local-practice-reveal-${card.type.toLowerCase()}${winner ? ' is-slam-winner' : ''}`}
                    style={{ '--local-slam-side': index === 0 ? 1 : -1, '--local-slam-tilt': `${index === 0 ? -8 : 8}deg` } as CSSProperties}>
                    <div className="local-practice-card-slam">
                      {winner && <span className="local-practice-slam-flash" />}
                      <span className="local-practice-reveal-art"><WoodcutCardFace card={card} lang={lang} />
                        {winner && <span className="local-practice-slam-edge" />}</span>
                      <span className="local-practice-reveal-label">{id === LOCAL_HERO_ID ? say('你', 'YOU') : say('对手', 'BOT')}
                        {winner && <b className="local-practice-slam-mark"> · {card.name[lang]} · {say('占优', 'EDGE')}</b>}</span>
                    </div>
                  </div>;
                })}
              </div>}
          </div>
          <div className="local-practice-sr-only" role="status" aria-live="polite">
            {phase === 'choose' ? say(`第 ${duel.turn} 回合，选择招式`, `Turn ${duel.turn}. Choose a move.`)
              : phase === 'reveal' ? say('亮牌！', 'Reveal!') : finalTitle}
            {phase !== 'choose' && round && <span className="local-practice-sr-only">{say('你出了', 'You played')} {SKILL_DB.find(card => card.id === round.moves[LOCAL_HERO_ID])?.name[lang]} · {say('对手出了', 'Opponent played')} {SKILL_DB.find(card => card.id === round.moves[LOCAL_BOT_ID])?.name[lang]}</span>}
          </div>
        </section>

        {phase !== 'result' ? <section className="local-practice-hand" aria-labelledby="local-practice-hand-title" aria-busy={phase === 'reveal'}>
          <div className="local-practice-hand-heading"><h2 ref={handRef} tabIndex={-1} id="local-practice-hand-title">{say('选一招', 'Make your move')}</h2>
            <span className="local-practice-hand-guide">{say('左右滑动查看招式', 'Scroll to see every move')}</span></div>
          {tipsEnabled && <div className="local-practice-hint"><span aria-hidden="true">✦</span><p>{hint}</p>
            <button type="button" onClick={() => { sound(); setTipsEnabled(false); tipsToggleRef.current?.focus(); }} aria-label={say('关闭提示', 'Dismiss hints')}>×</button></div>}
          <div ref={handScrollRef} className="local-practice-cards" aria-label={say('全部招式', 'All moves')}>{handCards.map((card, index) => renderCard(card, index < basicCards.length ? index : undefined))}</div>
        </section> : round && <section ref={resultRef} tabIndex={-1} className={`local-practice-result is-final${heroWon ? ' is-victory' : ''}`} aria-labelledby="local-practice-result-title">
            <div className="local-practice-result-copy">
              <span className="local-practice-result-eyebrow">{heroWon ? say('对练获胜', 'DUEL WON') : duel.winnerId ? say('本局结束', 'DUEL COMPLETE') : say('平局', 'DRAW')}</span>
              <h2 id="local-practice-result-title">{finalTitle}</h2>
              {tipsEnabled && <p>{round.explanation}</p>}
            </div>
            <div className="local-practice-actions">
              <button type="button" className="local-practice-primary" onClick={() => leave(onPlayFriends)}>{say('和朋友开一局', 'Play with friends')} <span aria-hidden="true">↗</span></button>
              <button type="button" onClick={retry}>{say('再来一局', 'Play again')}</button>
              {onSolo && <button type="button" className="local-practice-text-button" onClick={() => leave(onSolo)}>{say('独自出发', 'Go solo')} <span aria-hidden="true">→</span></button>}
            </div>
            {round.logs.length > 0 && <details className="local-practice-log"><summary>{say('看看刚才发生了什么', 'See what happened')}</summary><ul>{round.logs.map((log, index) => <li key={`${log.type}-${index}`}>{log.text}</li>)}</ul></details>}
          </section>}

        <footer className="local-practice-footer">
          <button type="button" className="local-practice-text-button" onClick={() => leave(onOpenRules)}>{say('招式手册', 'Move manual')}</button>
          {!(phase === 'result' && duel.isGameOver) && <button type="button" className="local-practice-text-button" onClick={() => leave(onPlayFriends)}>{say('直接和朋友玩', 'Play with friends')} <span aria-hidden="true">↗</span></button>}
        </footer>
      </div>
    </div>
  </dialog>;
}
