import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Lang, Player } from '../types';
import { ACADEMY_LESSONS, RULE_TOPICS, type AcademyLesson } from '../data/academy';
import { SKILL_DB } from '../data/skills';
import {
  getPracticePlayers, resolvePracticeRound, readCompletedAcademyLessons,
  writeCompletedAcademyLessons, PRACTICE_HERO_ID, PRACTICE_ENEMY_ID,
} from '../logic/academy';
import PixelCardArt from './PixelCardArt';
import BattleSprite from './BattleSprite';
import { ArrowLeft, CheckCircle, Heart, Play, Scroll, Swords, X, Zap } from './PixelIcons';
import './BattleAcademy.css';

interface Props {
  lang: Lang;
  avatar?: string;
  onClose: () => void;
  onStartExpedition: () => void;
  initialTab?: 'lessons' | 'rules';
  startLabel?: string;
}

type PracticeResult = ReturnType<typeof resolvePracticeRound>;
const signed = (value: number) => `${value > 0 ? '+' : ''}${value}`;

function PracticeCard({ id, lang, owner }: { id: string; lang: Lang; owner: string }) {
  const card = SKILL_DB.find(item => item.id === id);
  if (!card) return null;
  return <div className="academy-comparison-card" data-card-id={id}>
    <small>{owner}</small>
    <div className="academy-card-art" aria-hidden="true"><PixelCardArt id={card.id} /></div>
    <strong>{card.name[lang]}</strong>
    <span className="academy-card-cost"><span><Zap size={16} />{card.cost}</span><small className="academy-card-level">Lv.{card.levelRequired}</small></span>
  </div>;
}

function PracticeActor({ player, before, avatar, lang, hero }: {
  player: Player; before: Player; avatar: string; lang: Lang; hero: boolean;
}) {
  const hpDelta = player.hp - before.hp;
  const energyDelta = player.energy - before.energy;
  const name = hero ? (lang === 'zh' ? '你' : 'You') : (lang === 'zh' ? '练习机器人' : 'Training bot');
  return <div className="academy-actor" data-actor={hero ? 'hero' : 'enemy'}>
    <div className="academy-model"><BattleSprite avatar={avatar} name={name} direction={hero ? 'se' : 'sw'} /></div>
    <div className="academy-actor-stats">
      <strong>{name}</strong>
      <span className="academy-hp" aria-label={`${lang === 'zh' ? '血量' : 'HP'} ${player.hp}`}>
        <Heart size={18} />{player.hp}
        {hpDelta !== 0 && <small className="academy-delta">({signed(hpDelta)})</small>}
      </span>
      <span className="academy-energy" aria-label={`${lang === 'zh' ? '能量' : 'Energy'} ${player.energy}`}>
        <Zap size={18} />{player.energy}
        {energyDelta !== 0 && <small className="academy-delta">({signed(energyDelta)})</small>}
      </span>
    </div>
  </div>;
}

/** An isolated practice room: only completed lesson IDs are kept between visits. */
export default function BattleAcademy({ lang, avatar, onClose, onStartExpedition, initialTab = 'lessons', startLabel }: Props) {
  const [tab, setTab] = useState<'lessons' | 'rules'>(initialTab);
  const [completed, setCompleted] = useState<string[]>(readCompletedAcademyLessons);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [roundIndex, setRoundIndex] = useState(0);
  const [chosenMove, setChosenMove] = useState<string | null>(null);
  const [result, setResult] = useState<PracticeResult | null>(null);
  const [ruleId, setRuleId] = useState<string | null>(RULE_TOPICS[0]?.id ?? null);
  const [rulePage, setRulePage] = useState(0);
  const committed = useRef(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const practiceRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const id = useId();
  const zh = lang === 'zh';
  const lesson = ACADEMY_LESSONS.find(item => item.id === lessonId);
  const round = lesson?.rounds[roundIndex];
  const completedCount = ACADEMY_LESSONS.filter(item => completed.includes(item.id)).length;
  const nextLesson = ACADEMY_LESSONS.find(item => !completed.includes(item.id));
  const startText = startLabel ?? (zh ? '进入远征' : 'Start expedition');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    headingRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, []);

  useEffect(() => {
    if (tab === 'lessons' && lessonId) practiceRef.current?.focus({ preventScroll: true });
  }, [lessonId, roundIndex, tab]);

  useEffect(() => {
    if (result) {
      resultRef.current?.focus({ preventScroll: true });
      resultRef.current?.scrollIntoView({ block: 'nearest', behavior: 'instant' });
    }
  }, [result]);

  const resetRound = () => {
    committed.current = false;
    setChosenMove(null);
    setResult(null);
  };

  const openLesson = (item: AcademyLesson) => {
    resetRound();
    setLessonId(item.id);
    setRoundIndex(0);
    setTab('lessons');
    dialogRef.current?.scrollTo({ top: 0, behavior: 'instant' });
  };

  const chooseMove = (move: string) => {
    if (!lesson || !round || result || committed.current) return;
    const before = getPracticePlayers(lesson, roundIndex, undefined, lang);
    const hero = before.find(player => player.id === PRACTICE_HERO_ID);
    const card = SKILL_DB.find(item => item.id === move);
    if (!hero || !card || hero.energy < card.cost || !round.choices.includes(move)) return;
    committed.current = true;
    const resolved = resolvePracticeRound(lesson, roundIndex, move, lang);
    setChosenMove(move);
    setResult(resolved);
    if (resolved.passed && roundIndex === lesson.rounds.length - 1 && !completed.includes(lesson.id)) {
      const updated = [...completed, lesson.id];
      setCompleted(updated);
      writeCompletedAcademyLessons(updated);
    }
  };

  const before = lesson && round ? getPracticePlayers(lesson, roundIndex, undefined, lang) : [];
  const heroBefore = before.find(player => player.id === PRACTICE_HERO_ID);
  const enemyBefore = before.find(player => player.id === PRACTICE_ENEMY_ID);
  const hero = result?.players.find(player => player.id === PRACTICE_HERO_ID) ?? heroBefore;
  const enemy = result?.players.find(player => player.id === PRACTICE_ENEMY_ID) ?? enemyBefore;
  const enemyCard = round ? SKILL_DB.find(card => card.id === round.enemyMove) : undefined;
  const lastRound = !!lesson && roundIndex === lesson.rounds.length - 1;

  return createPortal(<dialog ref={dialogRef} className="battle-academy" aria-labelledby={`${id}-heading`}
    onCancel={event => { event.preventDefault(); onClose(); }}>
    <header className="academy-heading">
      <div><h2 id={`${id}-heading`} ref={headingRef} tabIndex={-1}>{zh ? '新手练习' : 'Battle academy'}</h2>
        <p>{zh ? '试着出牌，看懂每一次交锋。' : 'Play a card. See how the clash works.'}</p></div>
      <button type="button" className="academy-close" aria-label={zh ? '关闭练习与规则' : 'Close practice and rules'} onClick={onClose}><X size={22} /></button>
    </header>
    <div className="academy-tabs" role="tablist" aria-label={zh ? '练习与规则' : 'Practice and rules'}>
      {(['lessons', 'rules'] as const).map(value => <button key={value} type="button" role="tab"
        id={`${id}-tab-${value}`} aria-controls={`${id}-panel-${value}`} aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
        onClick={() => setTab(value)} onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const next = event.key === 'Home' ? 'lessons' : event.key === 'End' ? 'rules' : value === 'lessons' ? 'rules' : 'lessons';
          setTab(next);
          document.getElementById(`${id}-tab-${next}`)?.focus();
        }}>
        {value === 'lessons' ? <Swords size={20} /> : <Scroll size={20} />}
        {value === 'lessons' ? (zh ? '课程练习' : 'Lessons') : (zh ? '规则手册' : 'Rulebook')}
      </button>)}
    </div>

    <section className="academy-content" id={`${id}-panel-lessons`} role="tabpanel" aria-labelledby={`${id}-tab-lessons`} hidden={tab !== 'lessons'}>
      {!lesson || !round ? <>
        <div className="academy-progress-row">
          <strong>{zh ? `已完成 ${completedCount} / ${ACADEMY_LESSONS.length} 课` : `${completedCount} / ${ACADEMY_LESSONS.length} lessons complete`}</strong>
          {nextLesson && <button type="button" className="academy-button academy-button-primary" onClick={() => openLesson(nextLesson)}>
            <Play size={18} />{completedCount > 0 ? (zh ? '继续练习' : 'Continue lessons') : (zh ? '开始练习' : 'Start learning')}
          </button>}
          <div className="academy-progress-track" aria-hidden="true"><span style={{ width: `${ACADEMY_LESSONS.length ? completedCount / ACADEMY_LESSONS.length * 100 : 0}%` }} /></div>
        </div>
        <div className="academy-lessons">{ACADEMY_LESSONS.map((item, index) => {
          const done = completed.includes(item.id);
          return <button type="button" className="academy-lesson" key={item.id} data-lesson-id={item.id} data-completed={done} onClick={() => openLesson(item)}>
            <span className="academy-lesson-number" aria-hidden="true">{done ? <CheckCircle size={22} /> : index + 1}</span>
            <span><strong>{item.title[lang]}</strong><span className="academy-lesson-intro">{item.intro[lang]}</span>
              <small>{done ? (zh ? '已完成 · 再练一次' : 'Complete · Practice again') : (zh ? `${item.rounds.length} 个小练习` : `${item.rounds.length} short challenges`)}</small></span>
          </button>;
        })}</div>
        <footer className="academy-footer"><p>{zh ? '独立练习，不影响远征进度。' : 'Practice is separate from your expedition.'}</p>
          <button type="button" className="academy-button academy-button-primary" onClick={onStartExpedition}><Swords size={18} />{startText}</button></footer>
      </> : <>
        <div className="academy-practice-heading">
          <div><h3 ref={practiceRef} tabIndex={-1}>{lesson.title[lang]}</h3><span className="academy-round-number">{zh ? `练习 ${roundIndex + 1} / ${lesson.rounds.length}` : `Challenge ${roundIndex + 1} / ${lesson.rounds.length}`}</span></div>
          <button type="button" className="academy-button" onClick={() => { resetRound(); setLessonId(null); }}><ArrowLeft size={16} />{zh ? '课程列表' : 'All lessons'}</button>
        </div>
        <p className="academy-prompt">{round.prompt[lang]}</p>
        {hero && heroBefore && enemy && enemyBefore && <div className="academy-arena" aria-label={zh ? '练习战场' : 'Practice battle'}>
          <PracticeActor player={hero} before={heroBefore} avatar={avatar || 'avatars/bdrag.png'} lang={lang} hero />
          <span className="academy-vs" aria-hidden="true">VS</span>
          <PracticeActor player={enemy} before={enemyBefore} avatar="avatars/robot.webp" lang={lang} hero={false} />
        </div>}

        {!result && <>
          <p className="academy-intent">{lesson.concealed
            ? (round.opponentHint ?? lesson.opponentHint)[lang]
            : <>{zh ? '规则演示 · 对手的已知牌：' : 'Rule demonstration · known move: '}<strong>{enemyCard?.name[lang]}</strong>{enemyCard && <> · <Zap size={16} /> {enemyCard.cost}</>}</>}</p>
          <div className="academy-choices" aria-label={zh ? '选择你的招式' : 'Choose your move'}>{round.choices.map(move => {
            const card = SKILL_DB.find(item => item.id === move);
            if (!card) return null;
            const shortage = Math.max(0, card.cost - (heroBefore?.energy ?? 0));
            return <button type="button" className="academy-play" key={move} data-card-id={move} data-card-type={card.type}
              disabled={shortage > 0} onClick={() => chooseMove(move)} aria-label={`${card.name[lang]} · ${card.cost} ${zh ? '能量' : 'Energy'}${shortage ? (zh ? `，还差 ${shortage} 能量` : `, need ${shortage} more Energy`) : ''}`}>
              <span className="academy-card-cost"><span><Zap size={18} />{card.cost}</span><small className="academy-card-level">Lv.{card.levelRequired}</small></span>
              <span className="academy-card-art" aria-hidden="true"><PixelCardArt id={move} /></span><strong>{card.name[lang]}</strong>
              <small>{shortage ? (zh ? `还差 ${shortage} 能量` : `Need ${shortage} Energy`) : (zh ? '出这张' : 'Play this')}</small>
            </button>;
          })}</div>
        </>}

        {result && chosenMove && <div className="academy-result" data-passed={result.passed}>
          <h4 ref={resultRef} tabIndex={-1}>{result.passed ? (lastRound ? (zh ? '本课完成' : 'Lesson complete') : (zh ? '这一招对了' : 'Well played')) : (zh ? '再试一种选择' : 'Try another move')}</h4>
          <p className="academy-explanation" role="status">{result.explanation[lang]}</p>
          <div className="academy-comparison">
            <PracticeCard id={chosenMove} lang={lang} owner={zh ? '你的出牌' : 'Your card'} />
            <span className="academy-vs" aria-hidden="true">VS</span>
            <PracticeCard id={round.enemyMove} lang={lang} owner={zh ? '机器人的出牌' : 'Bot card'} />
          </div>
          <p className="academy-sr-only" aria-live="polite">{zh ? `你的血量变化 ${signed(result.heroHpDelta)}，能量变化 ${signed(result.heroEnergyDelta)}` : `Your HP changed by ${signed(result.heroHpDelta)}, Energy by ${signed(result.heroEnergyDelta)}`}</p>
          <details className="academy-logs"><summary>{zh ? '查看实际战报' : 'Show combat log'}</summary>
            {result.logs.length > 0 ? <ul>{result.logs.map((log, index) => <li key={`${index}-${log.type}`}>{log.text}</li>)}</ul>
              : <p>{zh ? '本轮没有额外战报，数值变化见上方。' : 'No additional combat events. Stat changes are shown above.'}</p>}
          </details>
          <div className="academy-result-actions">
            <button type="button" className={`academy-button ${result.passed ? '' : 'academy-button-primary'}`} onClick={() => {
              resetRound();
              requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('.academy-play:not(:disabled)')?.focus());
            }}>{zh ? '重新试一次' : 'Try again'}</button>
            {result.passed && !lastRound && <button type="button" className="academy-button academy-button-primary" onClick={() => { resetRound(); setRoundIndex(roundIndex + 1); }}>
              {zh ? '下一练习' : 'Next challenge'}<Play size={17} /></button>}
            {result.passed && lastRound && nextLesson && <button type="button" className="academy-button academy-button-primary" onClick={() => openLesson(nextLesson)}>
              {zh ? '下一课' : 'Next lesson'}<Play size={17} /></button>}
            {result.passed && lastRound && <button type="button" className={`academy-button ${nextLesson ? '' : 'academy-button-primary'}`} onClick={onStartExpedition}>
              <Swords size={18} />{startText}</button>}
          </div>
        </div>}
      </>}
    </section>

    <section className="academy-content" id={`${id}-panel-rules`} role="tabpanel" aria-labelledby={`${id}-tab-rules`} hidden={tab !== 'rules'}>
      <p className="academy-rules-intro">{zh ? '点开一个问题，随用随看。' : 'Open a topic when you need it.'}</p>
      {RULE_TOPICS.map(topic => <article className="academy-rule" key={topic.id}>
        <button type="button" id={`${id}-rule-${topic.id}`} aria-expanded={ruleId === topic.id} aria-controls={`${id}-rule-body-${topic.id}`} onClick={() => { setRuleId(ruleId === topic.id ? null : topic.id); setRulePage(0); }}>
          {topic.title[lang]}<span aria-hidden="true">{ruleId === topic.id ? '−' : '+'}</span>
        </button>
        <div className="academy-rule-body" id={`${id}-rule-body-${topic.id}`} role="region" aria-labelledby={`${id}-rule-${topic.id}`} hidden={ruleId !== topic.id}>
          <p aria-live="polite">{topic.items[ruleId === topic.id ? rulePage : 0]?.[lang]}</p>
          {topic.items.length > 1 && <div className="academy-rule-pages">
            <button type="button" className="academy-button" disabled={rulePage === 0} onClick={() => setRulePage(rulePage - 1)}>{zh ? '上一条' : 'Previous'}</button>
            <span>{rulePage + 1} / {topic.items.length}</span>
            <button type="button" className="academy-button" disabled={rulePage >= topic.items.length - 1} onClick={() => setRulePage(rulePage + 1)}>{zh ? '下一条' : 'Next'}</button>
          </div>}
        </div>
      </article>)}
      <footer className="academy-footer"><button type="button" className="academy-button" onClick={onClose}>{zh ? '关闭手册' : 'Close rulebook'}</button></footer>
    </section>
  </dialog>, document.body);
}
