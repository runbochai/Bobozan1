import { useEffect, useState } from 'react';
import type { Lang, MultiplayerMode } from '../types';

// Opening a manual or changing a snapshot must not replay the same match's goal.
const announcedGames = new Set<string>();

export default function MultiplayerOpening({ gameKey, mode, lang, atStart, finished, reduceMotion, finalBattle = false }: {
  gameKey: string; mode: MultiplayerMode; lang: Lang; atStart: boolean; finished: boolean; reduceMotion: boolean; finalBattle?: boolean;
}) {
  const [visible, setVisible] = useState(() => atStart && !announcedGames.has(gameKey));
  useEffect(() => {
    if (!visible) return;
    announcedGames.add(gameKey);
    const timer = window.setTimeout(() => setVisible(false), 3200);
    return () => window.clearTimeout(timer);
  }, [gameKey, visible]);
  if (!visible || finished) return null;
  return <div className="multiplayer-opening" data-reduced-motion={reduceMotion} role="status" aria-live="polite">
    <p>{finalBattle
      ? (lang === 'zh' ? '王冠争夺·最后一战！' : 'Final battle for the crown!')
      : mode === 'survival'
      ? (lang === 'zh' ? '活到最后，获得胜利！' : 'Be the last one standing!')
      : (lang === 'zh' ? '尽可能获得最多杀敌！' : 'Get as many kills as possible!')}</p>
  </div>;
}
