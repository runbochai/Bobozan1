import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { themeForStage, CROWN_CHAPTERS } from '../data/crownCampaign';
import { DEFAULT_THEME, GAME_THEMES, findTheme, themeImagePath } from '../data/gameThemes';
import { EXPEDITION_STAGES } from '../data/expedition';
import { getExpeditionStage } from '../logic/endlessExpedition';

test('each chapter enters and leaves the correct dedicated battle scene', () => {
  const ranges = [[0, 2, 'qualification'], [3, 6, 'ember'], [7, 9, 'tide'], [10, 12, 'mist'], [13, 15, 'towers'], [16, 17, 'citadel']] as const;
  for (const [first, last, name] of ranges) for (let stage = first; stage <= last; stage++) {
    assert.equal(themeForStage(stage), `crown-${name}`);
  }
  assert.equal(new Set(CROWN_CHAPTERS.map(chapter => chapter.theme)).size, 6);
});

test('finite story stops at the citadel; endless backgrounds follow its real opponent templates', () => {
  assert.equal(themeForStage(18), 'crown-citadel');
  for (const stage of [...Array.from({ length: 45 }, (_, i) => i), 999, 1_000_000]) {
    const encounter = getExpeditionStage(stage, 'endless')!;
    const template = EXPEDITION_STAGES.findIndex(item => item.id === encounter.id);
    assert(template >= 3, 'Endless skips tutorial opponents');
    assert.equal(themeForStage(stage, true), themeForStage(template), `Endless battle ${stage + 1}`);
  }
  for (const stage of [-1, NaN, Infinity]) assert.equal(themeForStage(stage, true), 'crown-ember');
});

test('all story and selectable scenes have full-size art and real thumbnails', () => {
  assert.equal(DEFAULT_THEME.id, 'crown-citadel');
  assert.equal(new Set(GAME_THEMES.map(theme => theme.id)).size, GAME_THEMES.length);
  for (const theme of GAME_THEMES) for (const thumbnail of [false, true]) {
    assert(existsSync(`public/${themeImagePath(theme.id, thumbnail)}`), theme.id);
  }
  assert.equal(findTheme('woodcut-tavern').id, 'woodcut-tavern', 'Existing saved themes remain available');
  assert.equal(themeImagePath('unknown-scene'), themeImagePath(DEFAULT_THEME.id));
});
