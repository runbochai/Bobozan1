import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Lang, LogEntry } from '../types';
import PixelCardArt from './PixelCardArt';
import { SKILL_DB } from '../data/skills';
import { EXPEDITION_STAGES } from '../data/expedition';
import { EXPEDITION_DIFFICULTIES, getExpeditionDifficulty, type ExpeditionDifficulty } from '../data/expeditionDifficulty';
import { MAX_HP } from '../data/constants';
import { getEffectiveLevel, isOffensiveCard } from '../logic/combat';
import { Coins, Heart, Shield, Swords } from './PixelIcons';
import './ExpeditionBriefing.css';

export interface ExpeditionRecap {
  turn: number;
  hpBefore: number;
  hpAfter: number;
  energyBefore: number;
  energyAfter: number;
  cards: { name: string; id: string; level?: number }[];
  logs: LogEntry[];
}

export default function ExpeditionBriefing({ lang, recap, onClose, onPractice, onStart, difficulty = 'beginner', onDifficultyChange, best = 0 }: {
  lang: Lang; recap?: ExpeditionRecap; onClose: () => void; onPractice: () => void; onStart?: () => void;
  difficulty?: ExpeditionDifficulty; onDifficultyChange?: (difficulty: ExpeditionDifficulty) => void; best?: number;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const zh = lang === 'zh';
  const mode = getExpeditionDifficulty(difficulty);
  const endless = mode.id === 'endless';
  const choosingDifficulty = !!onStart && !recap;
  const restartNote = endless
    ? (zh ? '倒下可保留成长继续；退出或刷新仍不保存本轮。' : 'Continue after defeat with your growth intact. Leaving or refreshing still does not save this run.')
    : (zh ? '重开清空本轮成长，保留各难度最佳与练习记录；退出或刷新不保存本轮。' : 'Restart clears run growth, keeping each difficulty’s best and practice records. Leaving or refreshing does not save this run.');
  const quickRules = <div className="exp-briefing-rules">
    <article><PixelCardArt id="charge" /><p>{zh ? '攒能量，抓对手攒时出手。' : 'Build energy; attack when the opponent Charges.'}</p></article>
    <article><PixelCardArt id="defend" /><p>{zh ? '听台词，看出招，自己判断。' : 'Listen, watch their moves, and make your own read.'}</p></article>
    <article><PixelCardArt id="pegasus" /><p>{zh ? '过关选强化，再决定休整或挑战。' : 'Choose a reward, then rest or take a risk.'}</p></article>
  </div>;
  const result = recap && (recap.hpAfter <= 0
    ? endless
      ? (zh ? '倒下也不失去成长。恢复生命继续挑战，这次敌人会再升 1 级。' : 'Defeat keeps your growth. Recover HP and continue; the enemy gains one more level.')
      : (zh ? '这次倒下了。重开会清空本轮成长，历史最佳与练习记录保留。' : 'This run ended. Restart resets run growth; your best and practice records remain.')
    : recap.hpAfter < recap.hpBefore
      ? (zh ? `生命减少 ${recap.hpBefore - recap.hpAfter}，看看哪张牌突破了你。` : `Lost ${recap.hpBefore - recap.hpAfter} HP. Check which move got through.`)
      : recap.hpAfter > recap.hpBefore
        ? (zh ? `生命恢复了 ${recap.hpAfter - recap.hpBefore}。` : `Recovered ${recap.hpAfter - recap.hpBefore} HP.`)
        : recap.energyAfter > recap.energyBefore
          ? (zh ? `生命保住了，能量增加 ${recap.energyAfter - recap.energyBefore}。` : `HP held steady; energy rose by ${recap.energyAfter - recap.energyBefore}.`)
          : (zh ? '生命没有减少；具体攻防结果可以展开查看。' : 'HP did not decrease. Open the details for the actual move interactions.'));
  const recapCards = (cards: ExpeditionRecap['cards']) => <div className="exp-recap-cards">{cards.map((card, index) => {
    const skill = SKILL_DB.find(item => item.id === card.id);
    return <figure key={`${card.name}-${index}`}><PixelCardArt id={card.id} /><figcaption>{card.name}<strong>{skill?.name[lang]}</strong>
      {skill && <small className="exp-recap-skill-level">Lv.{card.level ?? getEffectiveLevel(skill)}{isOffensiveCard(skill) ? ` · ${zh ? `${skill.tier}档` : `Tier ${skill.tier}`}` : ''}</small>}
    </figcaption></figure>;
  })}</div>;
  useEffect(() => {
    const element = dialog.current!;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => { element.close(); document.body.style.overflow = overflow; if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  return createPortal(<dialog ref={dialog} className={`exp-briefing${choosingDifficulty ? ' exp-difficulty-dialog' : ''}`} aria-labelledby={titleId} onCancel={event => { event.preventDefault(); onClose(); }}>
    <header><h2 id={titleId}>{recap ? (zh ? `第 ${recap.turn} 回合` : `Turn ${recap.turn}`) : choosingDifficulty ? (zh ? '选择远征难度' : 'Choose expedition difficulty') : (zh ? '远征速览' : 'Expedition at a glance')}</h2>
      <button type="button" onClick={onClose} aria-label={zh ? '关闭' : 'Close'}>×</button></header>
    {recap ? <>
      <p className="exp-recap-stats">♥ {recap.hpBefore} → {recap.hpAfter} <span>⚡ {recap.energyBefore} → {recap.energyAfter}</span></p>
      {recapCards(recap.cards.slice(0, 3))}
      <p className="exp-recap-result">{result}</p>
      <details className="exp-briefing-details"><summary>{zh ? '展开出牌与结算详情' : 'Show moves and resolution details'}</summary>
        {recap.cards.length > 3 && recapCards(recap.cards.slice(3))}
        <ul className="exp-recap-log">{recap.logs.map((log, index) => <li key={index}>{log.text}</li>)}</ul>
        <p className="exp-briefing-note">{zh ? '平手也扣能量；多人混战中，其他人的攻击仍会分别结算。' : 'Ties still cost energy; each other opponent can also hit you.'}</p>
      </details>
    </> : <>
      {choosingDifficulty ? <>
        <fieldset className="exp-difficulty-options" aria-label={zh ? '远征难度' : 'Expedition difficulty'}>
          {Object.values(EXPEDITION_DIFFICULTIES).map(option => <label key={option.id} className="exp-difficulty-option" data-difficulty={option.id} data-selected={option.id === mode.id}>
            <span className="exp-difficulty-heading"><strong>{option.label[lang]}</strong><input type="radio" name={`${titleId}-difficulty`} value={option.id} checked={option.id === mode.id} onChange={() => onDifficultyChange?.(option.id)} /></span>
            <span className="exp-difficulty-health"><Heart size={25} /><b>{option.startHp}</b><span>{zh ? '初始生命' : 'Starting HP'}</span></span>
            <span className="exp-difficulty-stat">{option.enemyDamageBonus ? <Swords size={17} /> : <Shield size={17} />}<span>{option.id === 'endless' ? (zh ? '战败保留成长' : 'Keep growth on defeat') : option.enemyDamageBonus ? (zh ? `敌人伤害 +${option.enemyDamageBonus}` : `Enemy damage +${option.enemyDamageBonus}`) : (zh ? '原版规则' : 'Original rules')}</span></span>
            <span className="exp-difficulty-stat exp-difficulty-gold">{option.id === 'endless' ? <Swords size={17} /> : <Coins size={17} />}<span>{option.id === 'endless' ? (zh ? '战败：敌方 +1 级' : 'Loss: enemy Lv.+1') : (zh ? `胜利金币 ×${option.goldMultiplier}` : `Victory gold ×${option.goldMultiplier}`)}</span></span>
          </label>)}
        </fieldset>
        {best > 0 && <p className="exp-difficulty-best" aria-live="polite">{zh ? `${mode.label.zh}最佳：第 ${best} 关` : `${mode.label.en} best: Stage ${best}`}</p>}
      </> : <>{quickRules}<p className="exp-briefing-note">{restartNote}</p></>}
      <details className="exp-briefing-details"><summary>{zh ? '更多规则' : 'More rules'}</summary>
        {choosingDifficulty && <>{quickRules}<p className="exp-briefing-note">{restartNote}</p></>}
        <p>{endless ? (zh ? '无尽没有终点。击败本关最高 Lv.N 的敌人，直接升至 Lv.N+1，获得这一阶的新技能；保留旧技能，不补发跳过的等级。胜利进入下一关；倒下则保留成长、恢复生命重试，敌方再升 1 级。' : 'Endless has no final stage. Beat the strongest Lv.N opponent to reach Lv.N+1 and learn that tier’s skills. Keep old skills; skipped tiers are not awarded. A win advances; defeat keeps growth and restores HP for a retry, while enemies gain one level.') : (zh ? `打过全部 ${EXPEDITION_STAGES.length} 关即通关。每关击败所有对手才能领奖；对手之间也会互打。` : `Clear all ${EXPEDITION_STAGES.length} stages to win. Defeat every opponent for a reward; they can hit each other too.`)}</p>
        <p>{zh ? '双方同时出牌，台词不是出牌预告。攒通常获得 2 能量，受到 1 点伤害会被打断。' : 'Moves resolve together. Dialogue is not a move preview. Charge normally gains 2 energy; taking 1 damage interrupts it.'}</p>
        <p>{endless ? (zh ? '敌方至少比你高 1 级，每次失败再加 1 级。无尽中已学的等级攻击按当前等级比较同档强弱；基础牌与特殊克制仍按原规则。没有额外伤害或金币倍率。' : 'Enemies are at least one level above you; each defeat adds another level. Learned leveled attacks use your current level in same-tier clashes. Basic cards and special counters retain their rules. No extra damage or gold multiplier.') : (zh ? '升级沿完整技能表解锁新招，不再限制到 Lv.5；旧牌不会变强。重开时等级、金币、遗物、装备和秘技清空。' : 'Leveling follows the full skill list without the old Lv.5 restriction; old moves stay unchanged. Restart clears levels, gold, relics, gear and limited skills.')}</p>
        <p>{zh ? `新手从 ${EXPEDITION_DIFFICULTIES.beginner.startHp} 血开始；普通从 ${EXPEDITION_DIFFICULTIES.normal.startHp} 血开始，敌人伤害 +${EXPEDITION_DIFFICULTIES.normal.enemyDamageBonus}，胜利金币 ×${EXPEDITION_DIFFICULTIES.normal.goldMultiplier}。装备只在本轮有效。` : `Beginner starts at ${EXPEDITION_DIFFICULTIES.beginner.startHp} HP. Normal starts at ${EXPEDITION_DIFFICULTIES.normal.startHp} HP, with +${EXPEDITION_DIFFICULTIES.normal.enemyDamageBonus} enemy damage and ×${EXPEDITION_DIFFICULTIES.normal.goldMultiplier} victory gold. Gear lasts for this run.`}</p>
        <p>{zh ? `多人从 ${MAX_HP} 血开始：淘汰后若至少两人存活，幸存者回到 ${MAX_HP} 血，能量和层数归零；远征没有这次重置。基础攻防规则相同。` : `Multiplayer starts at ${MAX_HP} HP: after an elimination with at least two survivors, their HP resets to ${MAX_HP}, energy and layer to 0. Expedition has no such reset. Basic combat rules are shared.`}</p>
      </details>
    </>}
    <footer><button type="button" onClick={onPractice}>{zh ? '练习 / 查规则' : 'Practice / rules'}</button><button type="button" className="exp-briefing-primary" onClick={onStart ?? onClose}>{onStart ? (zh ? '开始远征' : 'Start expedition') : (zh ? '明白了' : 'Got it')}</button></footer>
  </dialog>, document.body);
}
