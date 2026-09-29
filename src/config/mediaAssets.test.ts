import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { EXPEDITION_STAGES } from '../data/expedition';
import { AVATAR_OPTIONS } from '../data/avatars';
import { ULT_CUTINS } from '../data/ultCutins';

test('all expedition portraits and ultimate character paths resolve to WebP assets', () => {
  const paths = new Set([
    ...EXPEDITION_STAGES.flatMap(stage => stage.enemies.map(enemy => `avatars/enemies/${enemy.id}.webp`)),
    ...Object.values(ULT_CUTINS).map(def => def.image),
    ...AVATAR_OPTIONS.map(avatar => avatar.path).filter(path => path.endsWith('.webp')),
  ]);
  for (const path of paths) {
    const bytes = readFileSync(new URL(`../../public/${path}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', path);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', path);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${path} must not be truncated`);
  }
});
