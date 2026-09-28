import { useCallback, useEffect, useRef, useState } from 'react';
import { createMusicPlayer } from './backgroundMusic';
import type { MusicStatus } from './backgroundMusic';

export function useBackgroundMusic(src: string, active: boolean, muted: boolean, volume: number) {
  const player = useRef<ReturnType<typeof createMusicPlayer> | null>(null);
  const [status, setStatus] = useState<MusicStatus>('idle');
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'none';
    audio.src = src;
    const controller = createMusicPlayer(audio, setStatus);
    player.current = controller;
    return () => { controller.dispose(); player.current = null; };
  }, [src]);
  useEffect(() => { player.current?.configure(active, muted, volume); }, [src, active, muted, volume]);
  const retry = useCallback(() => player.current?.retry(), []);
  useEffect(() => {
    if (status !== 'blocked') return;
    // Playback requested by a remote host's snapshot may lack a user gesture.
    document.addEventListener('pointerdown', retry);
    document.addEventListener('keydown', retry);
    return () => {
      document.removeEventListener('pointerdown', retry);
      document.removeEventListener('keydown', retry);
    };
  }, [status, retry]);
  return { status, retry };
}
