export type MusicStatus = 'idle' | 'playing' | 'blocked' | 'error';
export type MusicAudio = Pick<HTMLAudioElement, 'loop' | 'preload' | 'volume' | 'muted' | 'currentTime' | 'paused' | 'load' | 'play' | 'pause' | 'addEventListener' | 'removeEventListener'>;

export function createMusicPlayer(audio: MusicAudio, report: (status: MusicStatus) => void) {
  let active = false;
  let disposed = false;
  let generation = 0;
  let pending = false;
  let needsReload = false;
  audio.loop = true;
  audio.preload = 'none';

  const retry = () => {
    if (disposed || !active || audio.muted || !audio.volume || pending) return;
    if (needsReload) { audio.load(); needsReload = false; }
    if (!audio.paused) { report('playing'); return; }
    pending = true;
    const attempt = ++generation;
    void audio.play().then(() => {
      if (!disposed && active && attempt === generation) report('playing');
    }).catch((error: unknown) => {
      if (disposed || !active || attempt !== generation) return;
      const name = error instanceof Error ? error.name : '';
      if (name !== 'AbortError') {
        needsReload = name !== 'NotAllowedError';
        report(name === 'NotAllowedError' ? 'blocked' : 'error');
      }
    }).finally(() => { if (attempt === generation) pending = false; });
  };

  const onError = () => {
    if (!disposed && active) { needsReload = true; report('error'); }
  };
  audio.addEventListener('error', onError);
  return {
    retry,
    configure(enabled: boolean, muted: boolean, volume: number) {
      if (disposed) return;
      active = enabled;
      audio.volume = Math.max(0, Math.min(1, volume));
      audio.muted = muted;
      if (!active || muted || !audio.volume) {
        generation++;
        pending = false;
        audio.pause();
        if (!active) audio.currentTime = 0;
        report('idle');
      } else retry();
    },
    dispose() {
      disposed = true;
      generation++;
      audio.pause();
      audio.removeEventListener('error', onError);
    },
  };
}
