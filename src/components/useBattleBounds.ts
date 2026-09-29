import { useCallback, useEffect, useRef, useState } from 'react';
import type { BattleBounds } from '../logic/battleLayout';

export function useBattleBounds() {
  const [bounds, setBounds] = useState<BattleBounds>({ width: window.innerWidth, height: 760 });
  const observer = useRef<ResizeObserver | null>(null);
  const ref = useCallback((node: HTMLDivElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (!node) return;
    const update = () => {
      const width = Math.max(1, node.clientWidth), height = Math.max(1, node.clientHeight);
      setBounds(previous => previous.width === width && previous.height === height ? previous : { width, height });
    };
    update();
    observer.current = new ResizeObserver(update);
    observer.current.observe(node);
  }, []);
  useEffect(() => () => observer.current?.disconnect(), []);
  return { bounds, ref };
}
