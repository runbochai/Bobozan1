import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { EXPEDITION_LESSONS, EXPEDITION_TUTORIALS } from '../data/expedition';
import type { Lang } from '../types';

interface Props {
  stageId: string;
  stepIndex: number;
  lang: Lang;
  settling: boolean;
  onLocate: () => void;
  onSkip: () => void;
}

/** Keyed by lesson and step: each new instruction opens once, after combat settles. */
export default function TutorialGuide({ stageId, stepIndex, lang, settling, onLocate, onSkip }: Props) {
  const [dismissed, setDismissed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const step = EXPEDITION_TUTORIALS[stageId]?.[stepIndex];
  const lesson = EXPEDITION_LESSONS[stageId];
  const lessonIndex = Object.keys(EXPEDITION_LESSONS).indexOf(stageId);
  const open = !!step && !!lesson && !dismissed && !settling;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);

  if (!step || !lesson) return null;

  const practise = () => {
    if (settling) return;
    dialogRef.current?.close();
    setDismissed(true);
    onLocate();
  };

  return <>
    {dismissed && <div className="tutorial-reminder">
      <button type="button" className="tutorial-reopen" aria-haspopup="dialog" disabled={settling} onClick={() => setDismissed(false)}>
        {lang === 'zh' ? '查看提示' : 'Show hint'}
      </button>
    </div>}
    {createPortal(<dialog ref={dialogRef} className="tutorial-dialog" aria-labelledby="tutorial-heading" aria-describedby="tutorial-instruction"
      data-step={stepIndex} onCancel={event => { event.preventDefault(); practise(); }}>
      <p className="tutorial-dialog-progress">{lang === 'zh' ? '新手教程' : 'Training'} {lessonIndex + 1} / 3</p>
      <h2 id="tutorial-heading">{lesson.title[lang]}</h2>
      <p id="tutorial-instruction">{step.text[lang]}</p>
      <div className="tutorial-dialog-actions">
        <button type="button" className="btn-gold" disabled={settling} onClick={practise}>
          {lang === 'zh' ? '开始操作' : 'Try it'}
        </button>
        <button type="button" className="tutorial-skip" disabled={settling} onClick={() => {
          dialogRef.current?.close();
          onSkip();
          requestAnimationFrame(() => document.querySelector<HTMLElement>('.pixel-hand-area [role="button"]')?.focus());
        }}>{lang === 'zh' ? '跳过教程' : 'Skip tutorial'}</button>
      </div>
    </dialog>, document.body)}
  </>;
}
