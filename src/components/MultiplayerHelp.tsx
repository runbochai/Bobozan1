import type { GameState, Lang } from '../types';
import { useState } from 'react';
import { getMultiplayerRecap } from '../logic/multiplayerHelp';
import { getMultiplayerMatchSummary } from '../logic/multiplayerMatch';
import TutorialPopup from './TutorialPopup';
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
  const [showHelp, setShowHelp] = useState(false);
  const me = game.players.find(player => player.id === playerId);
  // Read only readiness. Never expose another player's secret choice.
  const waitingCount = game.players.filter(player => !player.isDead && !player.isBot && !player.selectedCardId).length;
  const recap = getMultiplayerRecap(game, lang);
  const series = getMultiplayerMatchSummary(game);
  const completedMatches = game.status === 'LOBBY' ? 0 : game.status === 'GAMEOVER' ? series.matchNumber : series.matchNumber - 1;
  const finishedCount = Math.max(0, Math.min(series.totalMatches, completedMatches));
  const remaining = series.totalMatches - finishedCount;
  let status: string;

  if (game.status === 'LOBBY') {
    status = me?.id === game.hostId
      ? (zh ? `房间就绪 · ${game.players.length} 人` : `Room ready · ${game.players.length} players`)
      : (zh ? '等待房主开局' : 'Waiting for the host');
  } else if (game.status === 'SHOWDOWN') {
    status = zh ? '亮牌中' : 'Revealing cards';
  } else if (game.status === 'GAMEOVER') {
    if (series.isSeriesOver) {
      status = series.champions.length === 1
        ? (zh ? `${series.champions[0].name} 夺冠` : `${series.champions[0].name} wins the series`)
        : (zh ? `${series.champions.length} 人并列冠军` : `${series.champions.length} joint champions`);
    } else {
      status = series.roundWinner
        ? (zh ? `${series.roundWinner.name} 赢下本局` : `${series.roundWinner.name} wins this match`)
        : (zh ? '本局平局' : 'Match drawn');
    }
  } else if (!me || me.isDead) {
    status = zh ? '观战中' : 'Spectating';
  } else if (!me.selectedCardId) {
    status = zh ? '选一张牌' : 'Choose a card';
  } else {
    status = waitingCount > 0
      ? (zh ? `已锁定 · 等待 ${waitingCount} 人` : `Locked · Waiting for ${waitingCount}`)
      : (zh ? '已锁定 · 等待亮牌' : 'Locked · Ready to reveal');
  }

  const matchLabel = game.status === 'LOBBY'
    ? (zh ? `${series.totalMatches} 局赛程` : `${series.totalMatches} matches`)
    : (zh ? `${series.matchNumber} / ${series.totalMatches} 局` : `${series.matchNumber} / ${series.totalMatches}`);
  const helpLabel = zh ? '玩法说明' : 'How to play';

  return <>
    <section className={`multiplayer-help${compact ? ' multiplayer-help-compact' : ''}`} aria-label={zh ? '对局状态' : 'Match status'}>
      <div className="multiplayer-help-heading">
        <span className="multiplayer-help-match" title={zh ? '当前局数 / 整场局数' : 'Current match / series length'}>{matchLabel}</span>
        <p className="multiplayer-help-status" role="status" title={status}>{status}</p>
      </div>
      {compact && recap && <details className="multiplayer-help-details" key={game.matchCount}>
        <summary title={zh ? `第 ${recap.turn} 回合战报` : `Turn ${recap.turn} recap`} aria-label={zh ? `查看第 ${recap.turn} 回合战报` : `Review turn ${recap.turn}`}>
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M4 6H1.5V2.5M2 6a8 8 0 1 1-.2 7M10 5.5V10l3 2" /></svg>
        </summary>
        <div className="multiplayer-help-content">
          <h3>{zh ? `第 ${recap.turn} 回合战报` : `Turn ${recap.turn} recap`}</h3>
          {recap.revealed.length > 0 && <p className="multiplayer-help-revealed">
            {recap.revealed.map(card => <span key={card.playerId}>{card.name} · {card.cardName}</span>)}
          </p>}
          {recap.explanation && <p className="multiplayer-help-tip">{recap.explanation}</p>}
          {recap.logs.length > 0 ? <ul className="multiplayer-help-logs">{recap.logs.map((log, index) => <li key={`${index}-${log.type}-${log.text}`} data-log-type={log.type}>{log.text}</li>)}</ul>
            : !recap.explanation && <p className="multiplayer-help-tip">{zh ? '这一回合没有额外战报。' : 'No additional combat events this turn.'}</p>}
        </div>
      </details>}
      <button type="button" className="multiplayer-help-info" aria-label={helpLabel} title={helpLabel} onClick={() => setShowHelp(true)}>
        <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><circle cx="10" cy="10" r="8" /><path d="M10 9v5M10 5.5v.5" /></svg>
      </button>
      <div className="multiplayer-series-progress" title={zh ? `已完成 ${finishedCount} 局 · 剩余 ${remaining} 局` : `${finishedCount} completed · ${remaining} remaining`}>
        <progress max={series.totalMatches} value={finishedCount} aria-label={zh ? `整场进度，剩余 ${remaining} 局` : `Series progress, ${remaining} matches remaining`} />
      </div>
    </section>
    {showHelp && <TutorialPopup title={zh ? '牌桌速览' : 'At the table'} onDismiss={() => setShowHelp(false)}>
      <p>{game.status === 'GAMEOVER'
        ? series.isSeriesOver
          ? (zh ? '整场比赛结束。累计击杀最多的人夺冠，同分并列。' : 'The series is complete. Most total kills wins; equal scores share the title.')
          : (zh ? '房主继续下一局。淘汰者恢复生命，已获技能和累计击杀保留。' : 'The host starts the next match. Eliminated players return with restored HP, keeping skills and total kills.')
        : (zh ? '选一张牌锁定。所有存活玩家出齐后，同时亮牌。' : 'Choose a card to lock it in. All living players reveal together once every move is locked.')}</p>
      {game.status !== 'GAMEOVER' && <p>{zh ? '本回合受伤不足 1 点时，攒获得 2 能量。防挡普通攻击，轰消耗能量进攻。' : 'Charge gains 2 energy if you take less than 1 damage. Defend blocks basic attacks; Blast spends energy to attack.'}</p>}
      <p>{zh ? `每局打到至多一人存活。整场 ${series.totalMatches} 局，累计击杀最多的人夺冠。` : `A match ends with at most one survivor. Most total kills across ${series.totalMatches} matches wins the series.`}</p>
      <button type="button" className="multiplayer-help-rules" onKeyDown={event => {
        // TutorialPopup handles Enter/Space as dismissal everywhere else.
        if (event.key === 'Enter' || event.key === ' ') event.stopPropagation();
      }} onClick={event => {
        event.stopPropagation();
        setShowHelp(false);
        onOpenRules();
      }}>{zh ? '查看招式图鉴' : 'Move compendium'} <span aria-hidden="true">↗</span></button>
    </TutorialPopup>}
  </>;
}
