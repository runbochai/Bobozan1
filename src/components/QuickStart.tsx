import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Lang, Player } from '../types';
import { QUICK_START_STEPS } from '../data/quickStart';
import { SKILL_DB } from '../data/skills';
import { getPracticePlayers, resolvePracticeRound, PRACTICE_HERO_ID, PRACTICE_ENEMY_ID } from '../logic/academy';
import BattleSprite from './BattleSprite';
import PixelCardArt from './PixelCardArt';
import { CheckCircle, Heart, Play, Scroll, Swords, Users, X, Zap } from './PixelIcons';
import './QuickStart.css';

interface Props {
  lang: Lang;
  avatar?: string;
  onClose: () => void;
  onPlayFriends: () => void;
  onPractice: () => void;
  onOpenAcademy: () => void;
}

type PracticeResult = ReturnType<typeof resolvePracticeRound>;
const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

function Actor({ before, after, avatar, lang, hero }: {
  before: Player; after: Player; avatar: string; lang: Lang; hero: boolean;
}) {
  const name = hero ? (lang === 'zh' ? '你' : 'You') : (lang === 'zh' ? '练习机器人' : 'Practice bot');
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
    <small>{hero ? (lang === 'zh' ? '你出了' : 'You played') : (lang === 'zh' ? '机器人出了' : 'Bot played')}</small>
    <div className="quick-start-art" aria-hidden="true"><PixelCardArt id={move} /></div>
    <strong>{card.name[lang]}</strong><span><Zap size={15} />{card.cost}</span>
  </div>;
}

/** A short, optional route from a first card to a multiplayer room. */
export default function QuickStart({ lang, avatar, onClose, onPlayFriends, onPractice, onOpenAcademy }: Props) {
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
      <div><span className="quick-start-eyebrow">{zh ? '约 3 分钟 · 随时可以去联机' : 'About 3 minutes · Join friends anytime'}</span>
        <h2 ref={titleRef} id={`${id}-title`} tabIndex={-1}>{zh ? '快速上手' : 'Quick start'}</h2></div>
      <button type="button" className="quick-start-close" onClick={onClose} aria-label={zh ? '关闭快速上手' : 'Close quick start'}><X size={22} /></button>
    </header>
    <div className="quick-start-content">
      {!finished ? <>
        <div className="quick-start-intro"><p>{zh ? '所有人同时选牌。试试攒、攻击和防守之间的猜招。' : 'Everyone chooses together. Try the mind game between Charge, attacks, and defense.'}</p>
          <button type="button" className="quick-start-link" onClick={onPlayFriends}><Users size={18} />{zh ? '直接和朋友玩' : 'Play with friends now'}</button></div>
        <ol className="quick-start-progress" aria-label={zh ? '四个小练习' : 'Four short exercises'}>
          {QUICK_START_STEPS.map((item, index) => <li key={item.id} aria-current={index === stepIndex ? 'step' : undefined} data-past={index < stepIndex}>
            <span aria-hidden="true">{index + 1}</span><span>{item.title[lang]}</span></li>)}
        </ol>
        <section className="quick-start-exercise" aria-labelledby={`${id}-step`}>
          <div className="quick-start-step-heading"><h3 id={`${id}-step`} ref={stepRef} tabIndex={-1}>{step.title[lang]}</h3>
            <span>{stepIndex + 1} / {QUICK_START_STEPS.length}</span></div>
          <p className="quick-start-prompt">{round?.prompt[lang]}</p>
          <p className="quick-start-preset">{zh ? '每次从图示状态开始，选错也可以重试。' : 'Each exercise starts from the state shown. Try again anytime.'}</p>
          {heroBefore && heroAfter && botBefore && botAfter && <div className="quick-start-arena" aria-label={zh ? '双方的实际生命与能量' : 'Actual HP and energy for both players'}>
            <Actor before={heroBefore} after={heroAfter} avatar={avatar || 'avatars/bdrag.png'} lang={lang} hero />
            <span className="quick-start-vs" aria-hidden="true">VS</span>
            <Actor before={botBefore} after={botAfter} avatar="avatars/robot.webp" lang={lang} hero={false} />
          </div>}
          {!result && <>
            <p className="quick-start-hint">{zh ? '练习预告：机器人这次会出' : 'Practice preview: the bot will play'} <strong>{botCard?.name[lang]}</strong>{zh ? '。' : '.'}<br />
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
            <h4 ref={resultRef} tabIndex={-1}>{result.passed ? (zh ? '就是这样！' : 'That’s it!') : (zh ? '看看发生了什么' : 'See what happened')}</h4>
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
                {lastStep ? (zh ? '去玩一局' : 'Ready to play') : (zh ? '下一招' : 'Next move')}<Play size={16} /></button>}
            </div>
          </div>}
          <button type="button" className="quick-start-link quick-start-skip" onClick={nextStep}>{lastStep ? (zh ? '先去玩，边玩边学' : 'Start playing and learn as you go') : (zh ? '先看下一招' : 'Skip to the next move')}</button>
        </section>
      </> : <section className="quick-start-finish" aria-labelledby={`${id}-ready`}>
        <CheckCircle size={44} /><h3 id={`${id}-ready`} ref={stepRef} tabIndex={-1}>{zh ? '和朋友猜一招吧' : 'Make your first read'}</h3>
        <p>{zh ? '不必背完规则。观察对手的能量，猜他会攒、进攻还是防守，玩一局就会更熟悉。' : 'You do not need to memorize every rule. Watch their energy, read their next move, and learn by playing.'}</p>
        <button type="button" className="quick-start-button quick-start-primary quick-start-friends" onClick={onPlayFriends}><Users size={22} />{zh ? '和朋友玩' : 'Play with friends'}</button>
        <button type="button" className="quick-start-button" onClick={onPractice}><Swords size={19} />{zh ? '先和机器人练一局' : 'Practice against bots first'}</button>
        <button type="button" className="quick-start-link" onClick={onOpenAcademy}><Scroll size={17} />{zh ? '进阶练习与规则 · 随用随查' : 'Optional exercises & rulebook'}</button>
      </section>}
    </div>
  </dialog>, document.body);
}
