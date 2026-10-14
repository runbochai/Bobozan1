import type { GameState, Lang } from '../types';
import { useState } from 'react';
import { getMultiplayerRecap } from '../logic/multiplayerHelp';
import { getMultiplayerMatchSummary } from '../logic/multiplayerMatch';
import { Scroll } from './PixelIcons';
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
  const [instruction, setInstruction] = useState<'cards' | 'series' | null>(null);
  const me = game.players.find(player => player.id === playerId);
  // Reading readiness must never reveal which secret card a player selected.
  const waiting = game.players.filter(player => !player.isDead && !player.isBot && !player.selectedCardId);
  const recap = getMultiplayerRecap(game, lang);
  const series = getMultiplayerMatchSummary(game);
  const survival = series.mode === 'survival';
  const completedMatches = game.status === 'LOBBY' ? 0 : game.status === 'GAMEOVER' ? series.matchNumber : series.matchNumber - 1;
  const seriesProgress = <div className="multiplayer-series-progress">
    <strong>{game.status === 'LOBBY'
      ? (zh ? `整场共 ${series.totalMatches} 局` : `${series.totalMatches} matches in this competition`)
      : (zh ? `第 ${series.matchNumber} / ${series.totalMatches} 局` : `Match ${series.matchNumber} / ${series.totalMatches}`)}</strong>
    <span>{series.isSeriesOver ? (zh ? '整场结束' : 'Competition complete') : series.isFinalBattle
      ? (zh ? '王冠争夺 · 最后一战' : 'Crown Battle · Final Match')
      : (zh ? `升级阶段 · 最高 Lv.${series.lastSkillLevel}` : `Leveling phase · Up to Lv.${series.lastSkillLevel}`)}</span>
    <progress max={series.totalMatches} value={Math.min(series.totalMatches, completedMatches)} aria-label={zh ? '整场已完成局数' : 'Completed matches in this competition'} />
  </div>;

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
  const instructionButtons = <div className="multiplayer-help-explain-actions">
    <button type="button" onClick={() => setInstruction('cards')}>{zh ? '出牌说明' : 'Card basics'}</button>
    <button type="button" onClick={() => setInstruction('series')}>{zh ? '胜负怎么算' : 'How to win'}</button>
  </div>;
  const instructionPopup = instruction && <TutorialPopup title={instruction === 'cards' ? (zh ? '先记住这三件事' : 'Three things to know') : (zh ? '升级，然后争夺王冠' : 'Level up, then claim the crown')} onDismiss={() => setInstruction(null)}>
    {instruction === 'cards' ? <ol>{rules.map(rule => <li key={rule}>{rule}</li>)}</ol> : <>
      <p>{zh ? `前 ${series.lastSkillLevel} 局为升级阶段，每局最后的幸存者获得对应等级的新技能。学到最后一级后，进入第 ${series.totalMatches} 局「王冠争夺 · 最后一战」。` : `The first ${series.lastSkillLevel} matches are the leveling phase: each match’s last survivor earns that level’s skills. After the final skill level comes match ${series.totalMatches}, the final Crown Battle.`}</p>
      <p>{survival
        ? (zh ? '生存模式由最后一战的幸存者夺冠，前面的击杀数不决定冠军。最后一战若无人存活，以平局结束。' : 'In Survival, the survivor of the final battle wins the crown. Earlier kills do not decide the champion. If nobody survives the final battle, the competition is a draw.')
        : (zh ? '杀敌模式打完最后一战后，累计击杀最多的人夺冠；最高分相同就并列。最后一战即使同归于尽，也会按累计击杀结算。' : 'In Kills mode, the most cumulative kills after the final battle wins, with joint champions for a tie. Even if nobody survives the final battle, total kills decide the result.')}</p>
      <p>{zh ? '升级阶段若所有人同归于尽，无人领取本局技能。房主继续下一局；淘汰者恢复生命、能量归零，已获得的技能和战绩保留。最后一战结束后不再升级或开下一局。' : 'A leveling match with no survivors awards no skill. The host starts the next match; eliminated players return with restored HP and zero energy, keeping skills and stats. After the Crown Battle, there is no further upgrade or match.'}</p>
    </>}
  </TutorialPopup>;

  if (!compact) return <><section className="multiplayer-help" aria-label={zh ? '开局提示' : 'Before you play'}>
    <div className="multiplayer-help-heading"><strong>{zh ? '这一场怎么玩' : 'How to play'}</strong>{rulesButton}</div>
    {seriesProgress}
    {instructionButtons}
  </section>{instructionPopup}</>;

  return <><section className="multiplayer-help multiplayer-help-compact" aria-label={zh ? '对局提示与复盘' : 'Battle help and recap'}>
    <div className="multiplayer-help-heading"><p className="multiplayer-help-status" role="status">{status}</p>{rulesButton}</div>
    <details className="multiplayer-help-details" key={`${game.matchCount}-${game.status === 'LOBBY' ? 'lobby' : 'battle'}`}>
      <summary>{recap ? (zh ? `出牌提示 · 第 ${recap.turn} 回合复盘` : `Tips · Turn ${recap.turn} recap`) : (zh ? '出牌提示' : 'Card tips')}</summary>
      <div className="multiplayer-help-content">
        {seriesProgress}
        {instructionButtons}
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
  </section>{instructionPopup}</>;
}
