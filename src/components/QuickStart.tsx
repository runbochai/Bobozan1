import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Lang, Player } from '../types';
import { assetUrl } from '../assets';
import { QUICK_START_STEPS } from '../data/quickStart';
import { SKILL_DB } from '../data/skills';
import { getPracticePlayers, resolvePracticeRound, PRACTICE_HERO_ID, PRACTICE_ENEMY_ID } from '../logic/academy';
import BattleSprite from './BattleSprite';
import PixelCardArt from './PixelCardArt';
import { Crown, Heart, Play, Scroll, Swords, Users, X, Zap } from './PixelIcons';
import './QuickStart.css';

interface Props {
  lang: Lang;
  avatar?: string;
  onClose: () => void;
  onSolo: () => void;
  onPlayFriends: () => void;
  onPractice: () => void;
  onOpenAcademy: () => void;
}

type PracticeResult = ReturnType<typeof resolvePracticeRound>;
const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

function Actor({ before, after, avatar, lang, hero }: {
  before: Player; after: Player; avatar: string; lang: Lang; hero: boolean;
}) {
  const name = hero ? (lang === 'zh' ? '你' : 'You') : (lang === 'zh' ? '阿栓' : 'Axle');
  return <div className="quick-start-actor" data-actor={hero ? 'hero' : 'bot'}>
    <div className="quick-start-sprite" aria-hidden="true"><BattleSprite avatar={avatar} name={name} direction={hero ? 'se' : 'sw'} /></div>
    <div className="quick-start-stats"><strong>{name}</strong>
      <span className="quick-start-hp"><Heart size={17} /><span>{lang === 'zh' ? '生命' : 'HP'} {after.hp}</span>
        {after.hp !== before.hp && <small>({signed(after.hp - before.hp)})</small>}</span>
      <span className="quick-start-energy"><Zap size={17} /><span>{lang === 'zh' ? '能量' : 'Energy'} {after.energy}</span>
        {after.energy !== before.energy && <small>({signed(after.energy - before.energy)})</small>}</span>
    </div>
  </div>;
}

function RevealedCard({ move, lang, hero }: { move: string; lang: Lang; hero: boolean }) {
  const card = SKILL_DB.find(item => item.id === move);
  if (!card) return null;
  return <div className="quick-start-revealed" data-card-id={move}>
    <small>{hero ? (lang === 'zh' ? '你出了' : 'You played') : (lang === 'zh' ? '阿栓出了' : 'Axle played')}</small>
    <div className="quick-start-art" aria-hidden="true"><PixelCardArt id={move} /></div>
    <strong>{card.name[lang]}</strong><span><Zap size={15} />{card.cost}</span>
  </div>;
}

/** Continue the opening comic at Axle's table, then choose the next mode. */
export default function QuickStart({ lang, avatar, onClose, onSolo, onPlayFriends, onPractice, onOpenAcademy }: Props) {
  const [stepIndex, setStepIndex] = useState(0);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [chosenMove, setChosenMove] = useState<string | null>(null);
  const committed = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const stepRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const zh = lang === 'zh';
  const step = QUICK_START_STEPS[stepIndex];
  const round = step?.lesson.rounds[0];
  const finished = !step;
  const lastStep = stepIndex === QUICK_START_STEPS.length - 1;
  const before = step ? getPracticePlayers(step.lesson, 0, undefined, lang) : [];
  const heroBefore = before.find(player => player.id === PRACTICE_HERO_ID);
  const botBefore = before.find(player => player.id === PRACTICE_ENEMY_ID);
  const heroAfter = result?.players.find(player => player.id === PRACTICE_HERO_ID) ?? heroBefore;
  const botAfter = result?.players.find(player => player.id === PRACTICE_ENEMY_ID) ?? botBefore;
  const botCard = SKILL_DB.find(card => card.id === round?.enemyMove);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (stepIndex > 0) {
      stepRef.current?.focus({ preventScroll: true });
      dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    }
  }, [stepIndex]);

  useEffect(() => {
    if (result) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [result]);

  const reset = () => {
    committed.current = false;
    setResult(null);
    setChosenMove(null);
  };

  const nextStep = () => {
    reset();
    setStepIndex(current => current + 1);
  };

  const play = (move: string) => {
    if (!step || !round || result || committed.current) return;
    const card = SKILL_DB.find(item => item.id === move);
    if (!card || !heroBefore || card.cost > heroBefore.energy || !round.choices.includes(move)) return;
    committed.current = true;
    setChosenMove(move);
    setResult(resolvePracticeRound(step.lesson, 0, move, lang));
  };

  return createPortal(<dialog ref={dialogRef} className="quick-start" aria-labelledby={`${id}-title`}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="quick-start-header">
      <div><span className="quick-start-eyebrow">{zh ? '故事里的四次交锋 · 约 3 分钟' : 'Four moves in the story · About 3 minutes'}</span>
        <h2 ref={titleRef} id={`${id}-title`} tabIndex={-1}>{zh ? '阿栓的第一桌' : 'A first hand with Axle'}</h2></div>
      <button type="button" className="quick-start-close" onClick={onClose} aria-label={zh ? '离开练习桌，选择模式' : 'Leave the table and choose a mode'}><X size={22} /></button>
    </header>
    <div className="quick-start-content">
      {!finished ? <>
        <div className="quick-start-intro"><p>{zh ? '阿栓把牌摊开：“先试四招。之后去哪一桌，你来选。”' : 'Axle lays out the cards. “Try four moves. Then choose your next table.”'}</p>
          <button type="button" className="quick-start-link" onClick={() => { reset(); setStepIndex(QUICK_START_STEPS.length); }}>{zh ? '跳过教学，选择模式' : 'Skip teaching, choose a mode'}</button></div>
        <ol className="quick-start-progress" aria-label={zh ? '与阿栓的四次交锋' : 'Four moves with Axle'}>
          {QUICK_START_STEPS.map((item, index) => <li key={item.id} aria-current={index === stepIndex ? 'step' : undefined} data-past={index < stepIndex}>
            <span aria-hidden="true">{index + 1}</span><span>{item.title[lang]}</span></li>)}
        </ol>
        <section className="quick-start-exercise" aria-labelledby={`${id}-step`}>
          <div className="quick-start-step-heading"><h3 id={`${id}-step`} ref={stepRef} tabIndex={-1}>{step.title[lang]}</h3>
            <span>{stepIndex + 1} / {QUICK_START_STEPS.length}</span></div>
          <figure className="quick-start-scene">
            <div className="quick-start-scene-art"><img key={step.scene.image} src={assetUrl(step.scene.image)} alt={step.scene.alt[lang]} /></div>
            <figcaption><p className="quick-start-scene-caption">{step.scene.caption[lang]}</p>
              <p className="quick-start-speech"><strong>{zh ? '阿栓' : 'Axle'}</strong>{step.scene.speech[lang]}</p></figcaption>
          </figure>
          <p className="quick-start-prompt">{round?.prompt[lang]}</p>
          <p className="quick-start-preset">{zh ? '阿栓每次会摆好新的演示局面；从图示状态开始，选错也能重试。' : 'Axle sets up a new demonstration each time. Start from the state shown; retry anytime.'}</p>
          {heroBefore && heroAfter && botBefore && botAfter && <div className="quick-start-arena" aria-label={zh ? '双方的实际生命与能量' : 'Actual HP and energy for both players'}>
            <Actor before={heroBefore} after={heroAfter} avatar={avatar || 'avatars/bdrag.png'} lang={lang} hero />
            <span className="quick-start-vs" aria-hidden="true">VS</span>
            <Actor before={botBefore} after={botAfter} avatar="avatars/robot.webp" lang={lang} hero={false} />
          </div>}
          {!result && <>
            <p className="quick-start-hint">{zh ? '演示明牌：阿栓这次会出' : 'Face-up demonstration: Axle will play'} <strong>{botCard?.name[lang]}</strong>{zh ? '。' : '.'}<br />
              <small>{zh ? '真人对局中，出牌会在结算时一起揭晓。' : 'In a real match, all cards are revealed together after choosing.'}</small></p>
            <div className="quick-start-choices" aria-label={zh ? '选择你的出牌' : 'Choose your card'}>{round?.choices.map(move => {
              const card = SKILL_DB.find(item => item.id === move);
              if (!card) return null;
              const shortage = Math.max(0, card.cost - (heroBefore?.energy ?? 0));
              return <button type="button" className="quick-start-card" key={move} data-card-id={move} data-card-type={card.type} disabled={shortage > 0} onClick={() => play(move)}
                aria-label={`${card.name[lang]} · ${card.cost} ${zh ? '能量' : 'energy'}${shortage ? (zh ? `，还差 ${shortage} 能量` : `, need ${shortage} more energy`) : ''}`}>
                <span className="quick-start-cost"><Zap size={17} />{card.cost}</span>
                <span className="quick-start-art" aria-hidden="true"><PixelCardArt id={move} /></span><strong>{card.name[lang]}</strong>
                <small>{shortage ? (zh ? `还差 ${shortage} 能量` : `Need ${shortage} energy`) : (zh ? '出这张' : 'Play this')}</small>
              </button>;
            })}</div>
          </>}
          {result && chosenMove && round && <div className="quick-start-result" data-passed={result.passed}>
            <h4 ref={resultRef} tabIndex={-1}>{result.passed ? (zh ? '阿栓点了点头' : 'Axle nods') : (zh ? '阿栓翻开了牌' : 'Axle turns over the cards')}</h4>
            <p className="quick-start-response">{(result.passed ? step.scene.success : step.scene.retry)[lang]}</p>
            <div className="quick-start-reveal" aria-label={zh ? '双方出牌揭晓' : 'Both cards revealed'}>
              <RevealedCard move={chosenMove} lang={lang} hero /><span className="quick-start-vs" aria-hidden="true">VS</span><RevealedCard move={round.enemyMove} lang={lang} hero={false} />
            </div>
            <p role="status">{result.explanation[lang]}</p>
            <p className="quick-start-sr-only" aria-live="polite">{zh ? `你的生命变化 ${signed(result.heroHpDelta)}，能量变化 ${signed(result.heroEnergyDelta)}` : `Your HP changed by ${signed(result.heroHpDelta)}, energy by ${signed(result.heroEnergyDelta)}`}</p>
            <div className="quick-start-result-actions">
              <button type="button" className={`quick-start-button ${!result.passed ? 'quick-start-primary' : ''}`} onClick={() => {
                reset();
                requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('.quick-start-card:not(:disabled)')?.focus());
              }}>{zh ? '再试一次' : 'Try again'}</button>
              {result.passed && <button type="button" className="quick-start-button quick-start-primary" onClick={nextStep}>
                {lastStep ? (zh ? '选择下一桌' : 'Choose your next table') : (zh ? '阿栓，接着来' : 'Your next move, Axle')}<Play size={16} /></button>}
            </div>
          </div>}
          <button type="button" className="quick-start-link quick-start-skip" onClick={nextStep}>{lastStep ? (zh ? '先去选择模式，边玩边学' : 'Choose a mode and learn as you go') : (zh ? '这一招先略过' : 'Skip this move')}</button>
        </section>
      </> : <section className="quick-start-finish" aria-labelledby={`${id}-ready`}>
        <span className="quick-start-finish-speaker">{zh ? '阿栓把灯纹牌推回你面前' : 'Axle slides the lantern card back to you'}</span>
        <h3 id={`${id}-ready`} ref={stepRef} tabIndex={-1}>{zh ? '下一桌，你来选' : 'Your next table is yours to choose'}</h3>
        <p>{zh ? '“想继续这段旅途，就去单人模式；想和朋友猜招，就开一桌多人对局。规则不用全背，随时回来找我。”' : '“Continue your journey in Solo, or read your friends across a multiplayer table. No need to memorize every rule. My door’s open.”'}</p>
        <div className="quick-start-mode-choices" role="group" aria-label={zh ? '选择游戏模式' : 'Choose a game mode'}>
          <button type="button" className="quick-start-button quick-start-mode" onClick={onSolo}><Crown size={28} /><strong>{zh ? '单人模式' : 'Solo mode'}</strong><span>{zh ? '继续故事与远征' : 'Continue the story & expedition'}</span></button>
          <button type="button" className="quick-start-button quick-start-mode" onClick={onPlayFriends}><Users size={28} /><strong>{zh ? '多人模式' : 'Multiplayer'}</strong><span>{zh ? '创建房间或加入朋友' : 'Create a room or join friends'}</span></button>
        </div>
        <button type="button" className="quick-start-link" onClick={onPractice}><Swords size={19} />{zh ? '也可以先和机器人练一局' : 'Or practice against bots first'}</button>
        <button type="button" className="quick-start-link" onClick={onOpenAcademy}><Scroll size={17} />{zh ? '进阶练习与规则 · 随用随查' : 'Optional exercises & rulebook'}</button>
      </section>}
    </div>
  </dialog>, document.body);
}
