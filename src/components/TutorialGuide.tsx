import { EXPEDITION_LESSONS, EXPEDITION_TUTORIALS } from '../data/expedition';
import { SKILL_DB } from '../data/skills';
import { TEXT } from '../data/translations';
import type { HandCategory, HandViewMode, Lang } from '../types';

interface Props {
  stageId: string;
  stepIndex: number;
  lang: Lang;
  energy: number;
  enemyMove?: string;
  settling: boolean;
  handCategory: HandCategory;
  handViewMode: HandViewMode;
  onLocate: () => void;
  onAdvance: () => void;
  onSkip: () => void;
}

export default function TutorialGuide(props: Props) {
  const { stageId, stepIndex, lang, energy, enemyMove, settling } = props;
  const steps = EXPEDITION_TUTORIALS[stageId];
  const step = steps?.[stepIndex];
  const lesson = EXPEDITION_LESSONS[stageId];
  if (!step || !lesson) return null;
  const lessons = Object.keys(EXPEDITION_LESSONS);
  const lessonIndex = lessons.indexOf(stageId);
  const card = SKILL_DB.find(c => c.id === step.highlight);
  const category = card?.type === 'ABSORB' ? 'SPECIAL' : card?.type;
  const needFolder = category && category !== 'CHARGE' &&
    (props.handViewMode !== 'CARDS' || props.handCategory !== category);
  const enemy = SKILL_DB.find(c => c.id === enemyMove);
  const feedback = steps[stepIndex - 1]?.success;

  return <section className="tutorial-guide" aria-labelledby="tutorial-heading" data-step={stepIndex}>
    <div className="tutorial-guide-header">
      <h2 id="tutorial-heading" tabIndex={-1}>{lang === 'zh' ? `新手实战 ${lessonIndex + 1} / ${lessons.length}` : `Training ${lessonIndex + 1} / ${lessons.length}`} · {lesson.title[lang]}</h2>
      <span>{lang === 'zh' ? '步骤' : 'Step'} {stepIndex + 1} / {steps.length}</span>
    </div>
    <div className="tutorial-progress" aria-hidden="true">
      {lessons.map((id, i) => <span key={id} data-state={i < lessonIndex ? 'done' : i === lessonIndex ? 'current' : 'next'}>{i < lessonIndex ? '✓' : i + 1} · {EXPEDITION_LESSONS[id].title[lang]}</span>)}
    </div>
    <div className="tutorial-guide-content">
      <div className="tutorial-guide-copy" aria-live="polite" aria-atomic="true">
        <p className="tutorial-feedback">{settling
          ? (lang === 'zh' ? '双方正在出招，结算后继续…' : 'Both sides are playing. Waiting for the result…')
          : feedback ? `✓ ${feedback[lang]}` : (lang === 'zh' ? '跟着提示实战练习，不限时。' : 'Learn by playing. Take your time.')}</p>
        <p id="tutorial-instruction">{step.text[lang]}</p>
        <div className="tutorial-facts">
          <span>{lang === 'zh' ? '我的能量' : 'My Energy'} <b>{energy}</b>{card && <> · {card.id === 'charge' ? (lang === 'zh' ? '攒气 +2' : 'Charge +2') : `${lang === 'zh' ? '消耗' : 'Cost'} ${card.cost}`}</>}</span>
          {enemy && <span>{lang === 'zh' ? '敌人本回合' : 'Enemy move'} <b>{enemy.name[lang]}</b></span>}
        </div>
      </div>
      <div className="tutorial-guide-actions">
        <button type="button" className="btn-gold" disabled={settling} onClick={card ? props.onLocate : props.onAdvance}>
          {card ? needFolder
            ? (lang === 'zh' ? `打开「${TEXT[lang].categories[category]}」` : `Open ${TEXT[lang].categories[category]}`)
            : (lang === 'zh' ? `定位「${card.name[lang]}」` : `Find ${card.name[lang]}`)
            : (lang === 'zh' ? '明白了，开始练习' : 'Got it, let’s practise')}
        </button>
        <small>{card ? (lang === 'zh' ? '点击高亮牌才会出招' : 'Play the highlighted card to act') : (lang === 'zh' ? '阅读提示不会消耗回合' : 'Reading does not use a turn')}</small>
        <button type="button" className="tutorial-skip" disabled={settling} onClick={props.onSkip}>{lang === 'zh' ? '本轮跳过教学' : 'Skip training this run'}</button>
      </div>
    </div>
  </section>;
}
