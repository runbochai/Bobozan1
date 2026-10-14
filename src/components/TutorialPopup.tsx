import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './TutorialPopup.css';

interface Props {
  title?: string;
  children: ReactNode;
  onDismiss: () => void;
}

/** One short explanation above the game. Dismissing it never forwards an input. */
export default function TutorialPopup({ title, children, onDismiss }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dismissed = useRef(false);
  const id = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    let previousFocus: HTMLElement | null = null;
    let previousDialog: HTMLDialogElement | null = null;
    let previousOverflow = '';
    let ownsScrollLock = false;
    // The parent may be another native dialog mounting in the same render.
    // Open after its effect so this explanation is the uppermost modal.
    const frame = requestAnimationFrame(() => {
      if (!dialog.isConnected) return;
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (previousFocus === document.body || previousFocus === document.documentElement) previousFocus = null;
      const openDialogs = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].filter(item => item !== dialog);
      previousDialog = previousFocus?.closest('dialog') ?? openDialogs.at(-1) ?? null;
      previousOverflow = document.body.style.overflow;
      ownsScrollLock = previousOverflow !== 'hidden';
      if (ownsScrollLock) document.body.style.overflow = 'hidden';
      dialog.showModal();
      dialog.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      dialog.close();
      if (ownsScrollLock) document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected && !previousFocus.matches(':disabled')) {
        previousFocus.focus({ preventScroll: true });
      } else if (previousDialog?.isConnected && previousDialog.open) {
        previousDialog.querySelector<HTMLElement>('[tabindex="-1"], button:not(:disabled)')?.focus({ preventScroll: true });
      }
    };
  }, []);

  const dismiss = () => {
    if (dismissed.current) return;
    dismissed.current = true;
    onDismiss();
  };

  return createPortal(<dialog ref={dialogRef} className="tutorial-popup" tabIndex={-1}
    aria-labelledby={title ? `${id}-title` : undefined} aria-label={title ? undefined : '提示 / Tip'}
    aria-describedby={`${id}-body`}
    onPointerDown={event => event.stopPropagation()}
    onClick={event => { event.preventDefault(); event.stopPropagation(); dismiss(); }}
    onCancel={event => { event.preventDefault(); event.stopPropagation(); dismiss(); }}
    onKeyDown={event => {
      if (!['Escape', 'Enter', ' ', 'Spacebar'].includes(event.key)) return;
      event.preventDefault();
      event.stopPropagation();
      dismiss();
    }}>
    <div className="tutorial-popup-panel">
      {title && <h2 id={`${id}-title`}>{title}</h2>}
      <div id={`${id}-body`} className="tutorial-popup-copy">{children}</div>
      <span className="tutorial-popup-hint">点击任意处继续 · Tap anywhere</span>
    </div>
  </dialog>, document.body);
}
