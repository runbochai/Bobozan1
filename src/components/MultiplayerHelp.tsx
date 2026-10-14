import type { GameState, Lang } from '../types';
import { getMultiplayerRecap } from '../logic/multiplayerHelp';
import { Scroll } from './PixelIcons';
import './MultiplayerHelp.css';

interface Props {
  lang: Lang;
  game: GameState;
  playerId?: string;
  onOpenRules: () => void;
  compact?: boolean;
}

export default function MultiplayerHelp({ lang, game, playerId, onOpenRules, compact = false }: Props) {
  const zh = lang === 'zh';
  const me = game.players.find(player => player.id === playerId);
  // Reading readiness must never reveal which secret card a player selected.
  const waiting = game.players.filter(player => !player.isDead && !player.isBot && !player.selectedCardId);
  const recap = getMultiplayerRecap(game, lang);

  const rules = [
    zh ? '每人秘密选一张牌，全部出齐后同时亮牌。' : 'Choose one card in secret. Everyone reveals together once all moves are locked.',
    zh ? '攒：安全时 +2 能量；本回合受伤达到 1 点就中断。' : 'Charge: gain 2 energy unless you take at least 1 damage this turn.',
    zh ? '防：0 费挡普通攻击；3 费咔在射程内能破防（同层及上下各 1 层）。' : 'Defend: free protection against basic attacks. Ka costs 3 and breaks it within your layer and ±1.',
  ];

  let status: string;
  if (game.status === 'SHOWDOWN') {
    status = zh ? '正在亮牌与结算，马上开始下一回合。' : 'Revealing cards and resolving this turn.';
  } else if (game.status === 'GAMEOVER') {
    status = zh ? '本局结束，可以展开查看最后一回合的记录。' : 'Match finished. Expand to review the final turn.';
  } else if (game.status === 'PLAYING') {
    const prefix = me?.isDead ? (zh ? '已淘汰，正在观战。' : 'Eliminated. You are spectating. ') : '';
    status = prefix + (waiting.length
      ? (zh ? `等待出牌：${waiting.map(player => player.name).join('、')}` : `Waiting for: ${waiting.map(player => player.name).join(', ')}`)
      : (zh ? '所有真人已出牌，等待亮牌。' : 'All human moves are locked. Waiting for the reveal.'));
  } else {
    status = zh ? '先记住这三件事，就可以和朋友开一局。' : 'Three things to know before playing with friends.';
  }

  const rulesButton = <button type="button" className="multiplayer-help-rules" onClick={onOpenRules}>
    <Scroll size={15} />{zh ? '查规则' : 'Rules'}
  </button>;

  if (!compact) return <section className="multiplayer-help" aria-label={zh ? '开局提示' : 'Before you play'}>
    <div className="multiplayer-help-heading"><strong>{zh ? '不用学完教程，先玩一局' : 'You can start before finishing a tutorial'}</strong>{rulesButton}</div>
    <ol className="multiplayer-help-basics">{rules.map(rule => <li key={rule}>{rule}</li>)}</ol>
  </section>;

  return <section className="multiplayer-help multiplayer-help-compact" aria-label={zh ? '对局提示与复盘' : 'Battle help and recap'}>
    <div className="multiplayer-help-heading"><p className="multiplayer-help-status" role="status">{status}</p>{rulesButton}</div>
    <details className="multiplayer-help-details" key={`${game.matchCount}-${game.status === 'LOBBY' ? 'lobby' : 'battle'}`}>
      <summary>{recap ? (zh ? `出牌提示 · 第 ${recap.turn} 回合复盘` : `Tips · Turn ${recap.turn} recap`) : (zh ? '出牌提示' : 'Card tips')}</summary>
      <div className="multiplayer-help-content">
        {game.status === 'PLAYING' && !me?.isDead && game.turn === 1 && <p className="multiplayer-help-tip">{zh
          ? '第一回合从攒或防开始：攒为下回合准备能量，防可以观察对手。根据对手公开的能量猜出牌。'
          : 'Start with Charge or Defend: build energy or observe opponents. Use their visible energy to predict their next move.'}</p>}
        <ol className="multiplayer-help-basics">{rules.map(rule => <li key={rule}>{rule}</li>)}</ol>
        {recap && <div className="multiplayer-help-recap">
          <h3>{zh ? `第 ${recap.turn} 回合 · 复盘` : `Turn ${recap.turn} · Recap`}</h3>
          {recap.revealed.length > 0 && <p className="multiplayer-help-revealed"><strong>{zh ? '各玩家最近亮牌：' : 'Latest revealed cards: '}</strong>
            {recap.revealed.map(card => <span key={card.playerId}>{card.name} · {card.cardName}</span>)}
          </p>}
          {recap.explanation && <p className="multiplayer-help-tip">{recap.explanation}</p>}
          {recap.logs.length > 0 ? <ul className="multiplayer-help-logs">{recap.logs.map((log, index) => <li key={`${index}-${log.type}-${log.text}`} data-log-type={log.type}>{log.text}</li>)}</ul>
            : !recap.explanation && <p className="multiplayer-help-tip">{zh ? '本回合没有额外战报，可对照最近亮牌与当前能量。' : 'No additional combat log this turn. Compare the latest revealed cards and current energy.'}</p>}
        </div>}
      </div>
    </details>
  </section>;
}
