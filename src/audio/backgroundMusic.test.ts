import test from 'node:test';
import assert from 'node:assert/strict';
import { createMusicPlayer } from './backgroundMusic';
import type { MusicStatus, MusicAudio } from './backgroundMusic';

class FakeAudio extends EventTarget {
  loop = false; preload = ''; volume = 1; muted = false; currentTime = 12; paused = true;
  playCount = 0; loadCount = 0; failure: Error | null = null;
  load() { this.loadCount++; }
  pause() { this.paused = true; }
  async play() {
    this.playCount++;
    if (this.failure) throw this.failure;
    this.paused = false;
  }
}
const flush = () => new Promise(resolve => setImmediate(resolve));
const setup = () => {
  const audio = new FakeAudio();
  const statuses: MusicStatus[] = [];
  const player = createMusicPlayer(audio as MusicAudio, status => statuses.push(status));
  return { audio, statuses, player };
};

test('autoplay rejection offers a gesture retry and then starts playback', async () => {
  const { audio, statuses, player } = setup();
  audio.failure = Object.assign(new Error('Gesture required'), { name: 'NotAllowedError' });
  player.configure(true, false, 0.15);
  await flush();
  assert.equal(statuses.at(-1), 'blocked');
  audio.failure = null;
  player.retry();
  await flush();
  assert.equal(statuses.at(-1), 'playing');
  assert.equal(audio.playCount, 2);
  player.dispose();
});

test('mute and leaving the game stop playback; leaving resets playback position', async () => {
  const { audio, player } = setup();
  player.configure(true, false, 0.15);
  await flush();
  player.configure(true, true, 0.15);
  assert.equal(audio.paused, true);
  assert.equal(audio.currentTime, 12);
  player.configure(false, false, 0.15);
  assert.equal(audio.currentTime, 0);
  player.retry();
  assert.equal(audio.playCount, 1);
  player.dispose();
});

test('media failure is reported and a retry reloads the resource', async () => {
  const { audio, statuses, player } = setup();
  audio.failure = Object.assign(new Error('Missing media'), { name: 'NotSupportedError' });
  player.configure(true, false, 0.15);
  await flush();
  assert.equal(statuses.at(-1), 'error');
  audio.failure = null;
  player.retry();
  await flush();
  assert.equal(audio.loadCount, 1);
  assert.equal(statuses.at(-1), 'playing');
  player.dispose();
});

test('disposed players ignore late promise resolution and remove media listeners', async () => {
  const { audio, statuses, player } = setup();
  player.configure(true, false, 0.15);
  player.dispose();
  audio.dispatchEvent(new Event('error'));
  await flush();
  assert.deepEqual(statuses, []);
  assert.equal(audio.paused, true);
});
