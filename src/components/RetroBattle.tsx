import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { ArrowLeft, ArrowUp, CheckCircle, Crown, Ghost, Heart, Loader, LogOut, Scroll, Share2, Shield, Skull, Smile, User, X, Zap } from 'lucide-react';
import type { BattleSpeed, Card, GameState, HandCategory, HandViewMode, Lang, Player } from '../types';
import { avatarUrl } from '../assets';
import { MAX_HP } from '../data/constants';
import { TEXT } from '../data/translations';
import { getShowdownWinner } from '../logic/combat';
import { getEffectiveLevel, getPlayerCard, getPlayerLevel } from '../logic/cardLevels';
import { getMultiplayerMatchSummary } from '../logic/multiplayerMatch';
import { retroRoundTiming, retroSeat, retroSlamTargets, retroSlamTilt } from '../logic/retroBattle';
import { normalizeBattleSpeed } from '../logic/battleSpeed';
import RetroBackdrop from './RetroBackdrop';
import RetroCard from './RetroCard';
import RetroHitEffect from './RetroHitEffect';
import CategoryCardFace from './CategoryCardFace';
import { useCardTooltip } from './useCardTooltip';
import './RetroBattle.css';
import './RetroOriginalEffects.css';

interface DamageEvent { amount: number; eventKey: number; speed: BattleSpeed }

export interface RetroBattleProps {
  lang: Lang;
  game: GameState;
  playerId?: string;
  roomCode: string;
  knownCards: Card[];
  cards: Card[];
  category: HandCategory;
  viewMode: HandViewMode;
  submitting: boolean;
  reduceMotion: boolean;
  roundKey: string;
  roundStartedAt?: number;
  revealPlayers: Player[];
  speed?: BattleSpeed;
  damageEvents?: Record<string, DamageEvent>;
  controls?: ReactNode;
  overlays?: ReactNode;
  results?: ReactNode;
  toast?: string;
  onPlay: (id: string) => void;
  onCategory: (category: HandCategory) => void;
  onBack: () => void;
  onExit: () => void;
  onOpenRules: () => void;
  onEmoji: (emoji: string) => void;
  onShare: () => void;
  canShare: boolean;
}

const categories: HandCategory[] = ['CHARGE', 'ATTACK', 'DEFEND', 'ULTIMATE'];
const emojis = ['😎', '😂', '😱', '🔥', '💀', '👑', '🤔', '👍'];

function PlayerEmoji({ emoji, timestamp, name }: { emoji: string; timestamp: number; name: string }) {
  const [remaining] = useState(() => Math.max(0, Math.min(2000, timestamp + 2000 - Date.now())));
  const [visible, setVisible] = useState(remaining > 0);
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), remaining);
    return () => clearTimeout(timer);
  }, [remaining]);
  if (!visible) return null;
  return <span className="retro-player-emoji" style={{ animationDelay: `${remaining - 2000}ms` }} aria-label={`${name}: ${emoji}`}>{emoji}</span>;
}

function AvatarPlayer({ player, index, total, viewer, self, highest, lang, status, damage, reduced }: {
  player: Player; index: number; total: number; viewer: number; self: boolean; highest: number; lang: Lang; status: GameState['status'];
  damage?: DamageEvent; reduced: boolean;
}) {
  const seat = retroSeat(index, total, viewer);
  const level = getPlayerLevel(player);
  const leading = level > 0 && level === highest;
  return <div className={`retro-fighter ${self ? 'retro-fighter-self' : ''} ${player.isDead ? 'retro-fighter-dead' : ''}`} data-player-id={player.id} data-leading={leading}
    style={{ left: `${seat.x}%`, top: `${seat.y}%` }}>
    <div className="retro-fighter-level">{leading && <Crown size={14} />}<span>Lv.{level}</span></div>
    {player.emoji && player.emojiAt && <PlayerEmoji key={player.emojiAt} emoji={player.emoji} timestamp={player.emojiAt} name={player.name} />}
    <div className="retro-avatar-ring">
      {player.isDead ? <Skull className="retro-dead-skull" size={36} /> : player.avatar ? <img src={avatarUrl(player.avatar)} alt="" draggable={false} /> : <User size={36} />}
      {!player.isDead && status !== 'SHOWDOWN' && status !== 'GAMEOVER' && <span className={`retro-ready ${player.selectedCardId ? 'retro-ready-yes' : ''}`} aria-label={player.selectedCardId ? (lang === 'zh' ? '已出牌' : 'Ready') : (lang === 'zh' ? '选牌中' : 'Choosing')}>
        {player.selectedCardId ? <CheckCircle size={13} /> : <Loader size={12} />}
      </span>}
      <RetroHitEffect amount={damage?.amount} eventKey={damage?.eventKey} speed={damage?.speed} reduced={reduced} />
    </div>
    <strong className="retro-fighter-name" title={player.name}>{player.name}</strong>
    <div className="retro-fighter-stats">
      <span title={lang === 'zh' ? '能量' : 'Energy'}><Zap size={12} />{player.energy}</span>
      <span title={lang === 'zh' ? '层数' : 'Layer'}><ArrowUp size={12} />{player.layer + (player.tempLayerMod ?? 0)}</span>
    </div>
    <div className="retro-fighter-hp" aria-label={`${player.name} ${lang === 'zh' ? '血量' : 'HP'} ${player.hp}`}>
      <Heart size={10} fill="currentColor" /><span className="retro-hp-track"><i style={{ width: `${Math.max(0, Math.min(100, player.hp / MAX_HP * 100))}%` }} /></span><b>{player.hp}</b>
    </div>
  </div>;
}

/** The parent freezes these revealed selections and supplies the original round clock. */
function RevealedRound({ players, playerId, turn, lang, startedAt, reduced, speed = 1 }: {
  players: Player[]; playerId?: string; turn: number; lang: Lang; startedAt?: number; reduced: boolean; speed?: BattleSpeed;
}) {
  const [clock] = useState(() => {
    const now = Date.now();
    const roundSpeed = normalizeBattleSpeed(speed);
    return { startedAt: startedAt ?? now, speed: roundSpeed, timing: retroRoundTiming(startedAt ?? now, now, roundSpeed) };
  });
  const [stopped, setStopped] = useState(() => reduced || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (reduced && !stopped) setStopped(true);
  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const stop = (event: MediaQueryListEvent) => { if (event.matches) setStopped(true); };
    preference.addEventListener('change', stop);
    return () => preference.removeEventListener('change', stop);
  }, []);
  const winners = new Set(getShowdownWinner(players));
  const layer = useRef<HTMLDivElement>(null);
  const measure = () => {
    const board = document.querySelector('.retro-battle-board')?.getBoundingClientRect();
    const phone = window.innerWidth <= 700, small = window.innerWidth <= 380;
    return { width: board?.width || window.innerWidth, height: board?.height || 340,
      card: { width: small ? 46 : phone ? 54 : 78, height: small ? 75 : phone ? 84 : 118 } };
  };
  const [bounds, setBounds] = useState(measure);
  useEffect(() => {
    const element = layer.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setBounds(measure()));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const targets = retroSlamTargets(winners.size, bounds, bounds.card);
  const winnerOrder = players.filter(player => winners.has(player.id)).map(player => player.id);
  const viewer = players.findIndex(player => player.id === playerId);
  return <div ref={layer} className={`retro-revealed-layer ${reduced || stopped ? 'retro-reveal-still' : ''}`}
    data-multi-slam={winners.size > 1} data-battle-speed={clock.speed} aria-label={lang === 'zh' ? '本回合出牌' : 'Played cards'}>
    {players.map((player, index) => {
      const card = getPlayerCard(player, player.selectedCardId);
      if (!card || player.isDead) return null;
      const seat = retroSeat(index, players.length, viewer);
      const mini = retroSeat(index, players.length, viewer, true);
      const winner = winners.has(player.id);
      const target = targets[winnerOrder.indexOf(player.id)] ?? { x: 50, y: 45, scale: 1.8 };
      return <div key={player.id} className={`retro-revealed-position ${winner ? 'retro-slam-winner' : ''}`} data-player-id={player.id} data-slam-winner={winner}
        role="img" aria-label={`${player.name}: ${card.name[lang]}`} style={{
          left: `${mini.x}%`, top: `${mini.y}%`,
          '--retro-flight-x': `${seat.x - mini.x}cqw`, '--retro-flight-y': `${seat.y - mini.y}cqh`,
          '--retro-slam-x': `${target.x - mini.x}cqw`, '--retro-slam-y': `${target.y - mini.y}cqh`,
          '--retro-slam-lift': `${Math.max(0, Math.min(bounds.card.height * 1.3, target.y * bounds.height / 100 - bounds.card.height * target.scale * .5 - 8))}px`,
          '--retro-slam-scale': target.scale, '--retro-slam-tilt': `${winners.size > 1 ? 0 : retroSlamTilt(player.id, turn)}deg`,
          '--retro-flight-delay': `${clock.timing.flightDelay}ms`, '--retro-flight-duration': `${clock.timing.flightDuration}ms`,
          '--retro-slam-delay': `${clock.timing.slamDelay}ms`, '--retro-slam-duration': `${clock.timing.slamDuration}ms`,
          '--retro-impact-delay': `${clock.timing.impactDelay}ms`, '--retro-impact-duration': `${clock.timing.impactDuration}ms`,
        } as CSSProperties}>
        <div className="retro-card-flight"><div className="retro-card-slam">
          {winner && <span className="retro-slam-flash" aria-hidden="true" />}
          <RetroCard card={card} lang={lang} freeCount={player.freeSkills?.filter(id => id === card.id).length}
            tempCount={player.tempSkills?.filter(id => id === card.id).length} compact />
          <span className="retro-revealed-owner">{player.name}</span>
        </div></div>
      </div>;
    })}
  </div>;
}

function RetroHand({ player, knownCards, cards, lang, category, viewMode, status, submitting, onPlay, onCategory, onBack }: {
  player?: Player; knownCards: Card[]; cards: Card[]; lang: Lang; category: HandCategory; viewMode: HandViewMode;
  status: GameState['status']; submitting: boolean; onPlay: (id: string) => void; onCategory: (category: HandCategory) => void; onBack: () => void;
}) {
  const locked = player && getPlayerCard(player, player.selectedCardId);
  const canChoose = !!player && !player.isDead && !player.selectedCardId && !submitting && status === 'PLAYING';
  const { bind, tooltip } = useCardTooltip({ cards: knownCards, player, lang, appearance: 'retro',
    enabled: canChoose, scope: `retro:${player?.id ?? ''}:${category}:${viewMode}` });
  const blocked = (card: Card) => !canChoose || !!player?.disabledSkills?.includes(card.id) || (!player?.freeSkills?.includes(card.id) && (player?.energy ?? 0) < card.cost);
  return <section className="retro-hand" aria-label={lang === 'zh' ? '手牌' : 'Your hand'}>
    {player && !player.isDead && !player.selectedCardId && viewMode === 'CARDS' ? <nav className="retro-hand-nav" aria-label={lang === 'zh' ? '招式分类' : 'Skill categories'}>
      <button type="button" onClick={onBack} aria-label={lang === 'zh' ? '返回全部分类' : 'Back to categories'}><ArrowLeft size={17} /></button>
      {categories.map(cat => <button type="button" key={cat} onClick={() => onCategory(cat)} aria-current={category === cat ? 'true' : undefined}>{TEXT[lang].categories[cat]}</button>)}
    </nav> : <div className="retro-hand-nav" aria-hidden="true" />}
    {!player || player.isDead ? <div className="retro-hand-rest"><Ghost size={32} /><p>{TEXT[lang].dead}</p></div> : player.selectedCardId ? <div className="retro-locked-hand">
      {locked && <div className="retro-locked-face"><RetroCard card={locked} lang={lang}
        freeCount={player.freeSkills?.filter(id => id === locked.id).length} tempCount={player.tempSkills?.filter(id => id === locked.id).length} compact /></div>}
      <span><CheckCircle size={26} /><strong>{status === 'SHOWDOWN' ? (lang === 'zh' ? '招式释放中' : 'Casting') : (lang === 'zh' ? '已出牌，等待对手' : 'Locked in. Waiting…')}</strong></span>
    </div> : <>
      <div className={`retro-hand-cards ${viewMode === 'CATEGORIES' ? 'retro-category-cards' : 'retro-skill-cards'}`}>
        {viewMode === 'CATEGORIES' ? categories.map(cat => {
          const charge = knownCards.find(card => card.id === 'charge');
          const disabled = cat === 'CHARGE' && (!charge || blocked(charge));
          return <button {...(cat === 'CHARGE' && charge ? bind(charge) : {})} type="button" key={cat} className="retro-category-card" data-category={cat} aria-disabled={disabled}
            onClick={() => { if (cat === 'CHARGE') { if (charge && !blocked(charge)) onPlay(charge.id); } else onCategory(cat); }}>
            <CategoryCardFace category={cat} lang={lang} />
          </button>;
        }) : cards.length === 0 ? <div className="retro-hand-rest"><Shield size={28} /><p>{lang === 'zh' ? '还没有这一类招式' : 'No skills in this category yet'}</p></div> : cards.map(card => {
          const freeCount = player.freeSkills?.filter(id => id === card.id).length ?? 0;
          const tempCount = player.tempSkills?.filter(id => id === card.id).length ?? 0;
          const disabled = player.disabledSkills?.includes(card.id);
          const shortage = freeCount ? 0 : Math.max(0, card.cost - player.energy);
          const hint = disabled ? (lang === 'zh' ? '已禁用' : 'Disabled') : shortage ? (lang === 'zh' ? `还需 ${shortage} 能量` : `Need ${shortage} energy`) : '';
          return <div key={card.id} className="retro-hand-slot">
            <button {...bind(card)} type="button" className="retro-play-card" aria-disabled={blocked(card)} data-card-id={card.id}
              aria-label={`${card.name[lang]} · ${lang === 'zh' ? '费用' : 'Cost'} ${freeCount ? 0 : card.cost} · Lv.${getEffectiveLevel(card)}${hint ? ` · ${hint}` : ''}`}
              onClick={() => { if (!blocked(card)) onPlay(card.id); }}>
              <RetroCard card={card} lang={lang} freeCount={freeCount} tempCount={tempCount} />
              {hint && <span className="retro-card-blocked">{hint}</span>}
            </button>
          </div>;
        })}
      </div>
    </>}
    {tooltip}
  </section>;
}

export default function RetroBattle({ lang, game, playerId, roomCode, knownCards, cards, category, viewMode, submitting, reduceMotion, roundKey, roundStartedAt, revealPlayers, speed = 1, damageEvents, controls, overlays, results, toast, onPlay, onCategory, onBack, onExit, onOpenRules, onEmoji, onShare, canShare }: RetroBattleProps) {
  const [logsOpen, setLogsOpen] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const player = game.players.find(item => item.id === playerId);
  const viewer = game.players.findIndex(item => item.id === playerId);
  const highest = Math.max(0, ...game.players.map(getPlayerLevel));
  const summary = getMultiplayerMatchSummary(game);
  return <main className={`retro-app retro-battle ${reduceMotion ? 'retro-motion-reduced' : ''}`} data-player-count={game.players.length}>
    <RetroBackdrop battle reduced={reduceMotion} />
    {controls}
    <header className="retro-battle-header">
      <button type="button" onClick={onExit} aria-label={lang === 'zh' ? '退出房间' : 'Leave room'}><LogOut size={18} /></button>
      <div><span className="retro-room-code">{roomCode}</span><strong>{summary.isFinalBattle ? (lang === 'zh' ? '王冠争夺 · 最后一战' : 'Crown final battle') : `${lang === 'zh' ? '第' : 'MATCH'} ${game.matchCount} ${lang === 'zh' ? '局' : ''}`}</strong><small>{lang === 'zh' ? '回合' : 'TURN'} {game.turn}</small></div>
    </header>
    <div className="retro-battle-utilities">
      <button type="button" onClick={onOpenRules}><Scroll size={15} /><span>{lang === 'zh' ? '规则' : 'Rules'}</span></button>
      <button type="button" onClick={() => setLogsOpen(open => !open)} aria-expanded={logsOpen} aria-controls="retro-battle-logs">{lang === 'zh' ? '战斗记录' : 'Battle log'}</button>
      <button type="button" onClick={() => setEmojiOpen(open => !open)} aria-label={lang === 'zh' ? '发送表情' : 'Send emoji'} aria-expanded={emojiOpen}><Smile size={17} /></button>
      {canShare && <button type="button" onClick={onShare} aria-pressed={!!player?.isShared} aria-label={lang === 'zh' ? '共享龙爪防' : 'Share Claw Def'}><Share2 size={16} /></button>}
      {emojiOpen && <div className="retro-emoji-menu">{emojis.map(emoji => <button type="button" key={emoji} onClick={() => { onEmoji(emoji); setEmojiOpen(false); }} aria-label={emoji}>{emoji}</button>)}</div>}
    </div>
    {logsOpen && <aside className="retro-battle-logs" id="retro-battle-logs" aria-label={lang === 'zh' ? '战斗记录' : 'Battle log'}><button type="button" onClick={() => setLogsOpen(false)} aria-label={lang === 'zh' ? '关闭记录' : 'Close log'}><X size={18} /></button>
      {game.logs.map((log, index) => <p key={`${index}-${log.turn}`} data-type={log.type}><small>T{log.turn}</small>{log.text}</p>)}
    </aside>}
    <div className="retro-battle-board">
      <div className="retro-ellipse-table" aria-hidden="true" />
      {game.players.map((fighter, index) => <AvatarPlayer key={fighter.id} player={fighter} index={index} total={game.players.length} viewer={viewer}
        self={fighter.id === playerId} highest={highest} lang={lang} status={game.status} damage={damageEvents?.[fighter.id]} reduced={reduceMotion} />)}
      {game.status === 'SHOWDOWN' && <RevealedRound key={roundKey} players={revealPlayers} playerId={playerId} turn={game.turn} lang={lang} startedAt={roundStartedAt} reduced={reduceMotion} speed={speed} />}
    </div>
    <RetroHand player={player} knownCards={knownCards} cards={cards} lang={lang} category={category} viewMode={viewMode} status={game.status} submitting={submitting}
      onPlay={onPlay} onCategory={onCategory} onBack={onBack} />
    {toast && <div className="retro-toast" role="status">{toast}</div>}
    {overlays}
    {results}
  </main>;
}
