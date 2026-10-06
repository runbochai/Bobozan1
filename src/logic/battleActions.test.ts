import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { BATTLE_CHARACTERS } from '../data/battleCharacters';
import { battleActionAtlas, battleReleaseHand } from '../data/battleActions';

test('every selectable, robot, training and expedition character has a complete action atlas', () => {
  for (const [avatar, idle] of Object.entries(BATTLE_CHARACTERS)) {
    const action = battleActionAtlas(avatar);
    assert.equal(action, idle.replace('characters/', 'characters/actions/'));
    const bytes = readFileSync(new URL(`../../public/${action}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', avatar);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', avatar);
    const format = bytes.toString('ascii', 12, 16);
    let width: number, height: number, alpha: boolean;
    if (format === 'VP8L') {
      // Lossless WebP packs 14-bit width, 14-bit height and alpha after 0x2f.
      // https://developers.google.com/speed/webp/docs/webp_lossless_bitstream_specification#riff-header
      assert.equal(bytes[20], 0x2f, avatar);
      const header = bytes.readUInt32LE(21);
      width = (header & 0x3fff) + 1;
      height = ((header >>> 14) & 0x3fff) + 1;
      alpha = !!(header & 0x10000000);
    } else {
      assert.equal(format, 'VP8X', avatar);
      width = bytes.readUIntLE(24, 3) + 1;
      height = bytes.readUIntLE(27, 3) + 1;
      alpha = !!(bytes[20] & 0x10);
    }
    assert.ok(alpha, `${avatar}: alpha required`);
    assert.equal(width, 1536, `${avatar}: eight 192px columns`);
    assert.equal(height, 1024, `${avatar}: four 256px frames`);
  }
});

test('avatar paths resolve with deployment prefixes; custom and missing portraits keep their fallback', () => {
  assert.equal(battleActionAtlas('/Bobozan1/avatars/bdrag.png?v=2'), 'characters/actions/bdrag.webp');
  for (const avatar of [undefined, 'avatars/missing.png', 'https://example.org/avatars/bdrag.png', 'data:image/png;base64,x']) {
    assert.equal(battleActionAtlas(avatar), undefined);
  }
  assert.ok(battleReleaseHand('avatars/enemies/shadow_a.webp', 'n').x < .5);
  assert.ok(battleReleaseHand('avatars/robot.webp', 'n').x > .5);
});
