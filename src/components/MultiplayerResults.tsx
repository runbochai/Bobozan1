import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GameState, Lang } from '../types';
import { SKILL_DB } from '../data/skills';
import { getMultiplayerMatchSummary } from '../logic/multiplayerMatch';
import { getRetainedSkillIds } from '../logic/skillLoadout';
import { Crown, Skull, Star } from './PixelIcons';
import PixelCardArt from './PixelCardArt';
import MultiplayerHelp from './MultiplayerHelp';
import './MultiplayerResults.css';

interface Props {
  lang: Lang;
  game: GameState;
  playerId?: string;
  onNextMatch: () => void;
  onExit: () => void;
  onOpenRules: () => void;
  nextDisabled?: boolean;
  pendingSkills?: boolean;
}

/** Both modes reach the crown battle; their final victory conditions differ. */
export default function MultiplayerResults({ lang, game, playerId, onNextMatch, onExit, onOpenRules, nextDisabled = false, pendingSkills = false }: Props) {
  const zh = lang === 'zh';
  const summary = getMultiplayerMatchSummary(game);
  const { mode, matchNumber, totalMatches, remainingMatches, isFinalBattle, isSeriesOver, roundWinner, champions, leaders, standings } = summary;
  const survival = mode === 'survival';
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const isHost = Boolean(playerId && game.hostId === playerId);
  const retained = roundWinner ? new Set(getRetainedSkillIds(roundWinner)) : new Set<string>();
  // Show every awarded skill still retained after the winner's skill choice.
  const rewardCards = !isSeriesOver && roundWinner
    ? SKILL_DB.filter(card => card.levelRequired === matchNumber && retained.has(card.id))
    : [];
  const names = (players: typeof champions) => players.map(player => player.name).join(zh ? '、' : ', ');
  const killCount = (kills?: number) => zh ? `${kills ?? 0} 次击杀` : `${kills ?? 0} kills`;
  const remaining = `${remainingMatches} ${remainingMatches === 1 ? 'match remains' : 'matches remain'}`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || pendingSkills) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    dialog.scrollTop = 0;
    return () => {
      dialog.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, [pendingSkills]);

  return createPortal(<dialog ref={dialogRef} className="multiplayer-results" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={event => event.preventDefault()}>
    <div className="multiplayer-results-body">
      <header className="multiplayer-results-header">
        <p className="multiplayer-results-eyebrow">{survival ? (zh ? '生存模式' : 'Survival') : (zh ? '杀敌模式' : 'Kills')}{zh ? ` · 第 ${matchNumber} / ${totalMatches} 局` : ` · Match ${matchNumber} / ${totalMatches}`}</p>
        <h2 ref={headingRef} tabIndex={-1} id={`${id}-title`}><Crown size={27} />{isFinalBattle
          ? (zh ? '王冠争夺 · 最后一战' : 'Crown Battle · Final Match')
          : (zh ? '本局结束' : 'Match finished')}</h2>
        <p id={`${id}-description`}>{survival && isSeriesOver
          ? (roundWinner ? (zh ? '最后一战的幸存者戴上王冠。' : 'The final survivor claims the crown.') : (zh ? '最后一战所有人同时倒下，以平局结束。' : 'Nobody survived the final battle. The competition ends in a draw.')) : isSeriesOver
          ? (zh ? '全部打完了。按累计击杀数决出总冠军。' : 'All matches are complete. Total kills decide the overall champion.')
          : survival ? (zh ? `还剩 ${remainingMatches} 局。完成升级后，王冠争夺最后一战的幸存者获胜。` : `${remaining}. After leveling up, the survivor of the final Crown Battle wins.`)
          : (zh ? `还剩 ${remainingMatches} 局。打完 ${totalMatches} 局后，累计击杀最多的人获得总冠军。` : `${remaining}. Most total kills after ${totalMatches} matches wins the competition.`)}</p>
        <progress max={totalMatches} value={matchNumber} aria-label={zh ? `已完成 ${matchNumber} 局，共 ${totalMatches} 局` : `${matchNumber} of ${totalMatches} matches completed`} />
      </header>

      {survival && isSeriesOver ? <section className="multiplayer-results-winner" aria-labelledby={`${id}-winner`}>
        <span className="multiplayer-results-winner-label" id={`${id}-winner`}>{roundWinner ? (zh ? '胜者' : 'Winner') : (zh ? '平局' : 'Draw')}</span>
        <strong>{roundWinner ? roundWinner.name : (zh ? '没有人活到最后' : 'No survivors')}</strong>
        <p>{zh ? '击杀数仅记录战绩，不决定生存模式的胜负。' : 'Kills are recorded as stats; survival decides the winner.'}</p>
      </section> : isSeriesOver ? <section className="multiplayer-results-winner" aria-labelledby={`${id}-champion`}>
        <span className="multiplayer-results-winner-label" id={`${id}-champion`}>{champions.length > 1 ? (zh ? '并列总冠军' : 'Joint champions') : (zh ? '总冠军' : 'Overall champion')}</span>
        <strong>{champions.length ? names(champions) : (zh ? '没有可结算的玩家' : 'No players to rank')}</strong>
        {champions.length > 0 && <span className="multiplayer-results-kills"><Skull size={16} />{killCount(champions[0].kills)}</span>}
        {champions.length > 1 && <p>{zh ? '累计击杀相同，共享这次胜利。' : 'Equal total kills: the championship is shared.'}</p>}
        <p className="multiplayer-results-round-note">{roundWinner
          ? (zh ? `第 ${matchNumber} 局胜者：${roundWinner.name}。本局生还与总冠军分别结算。` : `Match ${matchNumber} survivor: ${roundWinner.name}. The overall champion is decided separately.`)
          : (zh ? `第 ${matchNumber} 局无人存活，判为平局；累计击杀照常结算。` : `Match ${matchNumber} is a draw with no survivors. Total kills still count.`)}</p>
      </section> : <section className="multiplayer-results-winner" aria-labelledby={`${id}-winner`}>
        <span className="multiplayer-results-winner-label" id={`${id}-winner`}>{roundWinner ? (zh ? '本局胜者' : 'Match winner') : (zh ? '本局平局' : 'Match drawn')}</span>
        <strong>{roundWinner ? roundWinner.name : (zh ? '没有人活到最后' : 'No survivors')}</strong>
        <p>{roundWinner
          ? (zh ? '最后存活者赢下这一局，获得对应等级的新技能。' : 'The last survivor wins this match and earns its level’s skills.')
          : (zh ? '本局不发放胜者技能，继续下一局。' : 'No winner skill is awarded. Continue to the next match.')}</p>
        {rewardCards.length > 0 && <div className="multiplayer-results-reward">
          <h3><Star size={15} />{zh ? `本局保留的奖励 · Lv.${matchNumber}` : `Retained reward · Lv.${matchNumber}`}</h3>
          <ul className="multiplayer-results-reward-cards">{rewardCards.map(card => <li key={card.id}>
            <PixelCardArt id={card.id} />
            <strong>{card.name[lang]}</strong>
            <span>{zh ? `${card.cost} 能量` : `${card.cost} energy`}</span>
          </li>)}</ul>
        </div>}
      </section>}

      <section className="multiplayer-results-standings" aria-labelledby={`${id}-standings`}>
        <div className="multiplayer-results-section-title"><h3 id={`${id}-standings`}>{survival ? (zh ? '玩家战绩' : 'Player stats') : isSeriesOver ? (zh ? '最终战绩' : 'Final standings') : (zh ? '累计击杀排行' : 'Total kill standings')}</h3>
          {!survival && !isSeriesOver && leaders.length > 0 && <span>{zh ? `当前领先：${names(leaders)}` : `Leading: ${names(leaders)}`}</span>}
        </div>
        <table>
          <caption className="multiplayer-results-sr-only">{survival ? (zh ? '生存结果和累计击杀记录，击杀不参与胜负判定' : 'Survival result and total kills. Kills do not decide the winner.') : (zh ? '所有玩家按累计击杀排序，相同击杀数名次相同' : 'Players ranked by total kills. Equal kill counts share a rank.')}</caption>
          <thead><tr><th scope="col">{survival ? (zh ? '结果' : 'Result') : (zh ? '名次' : 'Rank')}</th><th scope="col">{zh ? '玩家' : 'Player'}</th><th scope="col">{zh ? '累计击杀' : 'Total kills'}</th></tr></thead>
          <tbody>{standings.map(player => {
            const rank = standings.findIndex(other => (other.kills ?? 0) === (player.kills ?? 0)) + 1;
            const winner = survival ? player.id === roundWinner?.id : rank === 1;
            return <tr key={player.id} data-self={player.id === playerId} data-leader={winner}>
              <td>{survival ? (winner ? (isSeriesOver ? (zh ? '胜利' : 'Won') : (zh ? '生还' : 'Alive')) : (zh ? '淘汰' : 'Out')) : rank === 1 ? <><Crown size={17} /><span className="multiplayer-results-sr-only">1</span></> : rank}</td>
              <th scope="row">{player.name}{player.id === playerId && <small>{zh ? '你' : 'You'}</small>}</th>
              <td>{player.kills ?? 0}</td>
            </tr>;
          })}</tbody>
        </table>
      </section>

      <MultiplayerHelp compact lang={lang} game={game} playerId={playerId} onOpenRules={onOpenRules} />
    </div>

    <footer className="multiplayer-results-footer">
      {!isSeriesOver && (isHost ? <button type="button" className="multiplayer-results-primary" onClick={onNextMatch} disabled={nextDisabled || pendingSkills}>
        {nextDisabled || pendingSkills ? (zh ? '等待玩家选好保留技能…' : 'Waiting for skill choices…') : remainingMatches === 1 ? (zh ? '开始王冠争夺最后一战' : 'Start the final Crown Battle') : (zh ? `开始第 ${matchNumber + 1} 局` : `Start match ${matchNumber + 1}`)}
      </button> : <p className="multiplayer-results-wait" role="status">{nextDisabled || pendingSkills
        ? (zh ? '等待玩家选好保留技能，房主随后开始下一局。' : 'Waiting for skill choices. The host will then start the next match.')
        : (zh ? '本局已结束，等待房主开始下一局。' : 'This match is over. Waiting for the host to start the next one.')}</p>)}
      <button type="button" className={isSeriesOver ? 'multiplayer-results-primary' : 'multiplayer-results-exit'} onClick={onExit}>{isSeriesOver
        ? (zh ? '结束比赛，返回主页' : 'Finish & return home')
        : (zh ? '离开房间' : 'Leave room')}</button>
    </footer>
  </dialog>, document.body);
}
