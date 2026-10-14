type ScrollLockTarget = { style: { overflow: string } };
interface ScrollLock { count: number; previousOverflow: string }
const locks = new WeakMap<ScrollLockTarget, ScrollLock>();

/** Nested dialogs share one lock, including when their cleanup runs out of order. */
export function acquireBodyScrollLock(target: ScrollLockTarget = document.body): () => void {
  let lock = locks.get(target);
  if (lock) lock.count += 1;
  else {
    lock = { count: 1, previousOverflow: target.style.overflow };
    locks.set(target, lock);
    target.style.overflow = 'hidden';
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    lock.count -= 1;
    if (lock.count > 0) return;
    locks.delete(target);
    // Preserve an independent style change made while our dialogs were open.
    if (target.style.overflow === 'hidden') target.style.overflow = lock.previousOverflow;
  };
}
