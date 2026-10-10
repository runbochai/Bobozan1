import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SKILL_DB } from '../data/skills';
import { WOODCUT_CARDS } from '../data/woodcutCards';

test('every skill and cover has its own complete illustration', () => {
  const ids = [...SKILL_DB.map(card => card.id), 'folder-attack', 'folder-defend', 'folder-ultimate'];
  assert.deepEqual(Object.keys(WOODCUT_CARDS).sort(), ids.sort());
  assert.equal(new Set(Object.values(WOODCUT_CARDS)).size, ids.length, 'skills must not silently share generic placeholder art');
  for (const id of ids) {
    const file = WOODCUT_CARDS[id];
    const bytes = readFileSync(new URL(`../../public/${file}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', id);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', id);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${id} must not be truncated`);
  }
});

test('approved skill prints stay separate from the four navy covers', () => {
  for (const card of SKILL_DB.filter(card => card.id !== 'charge')) {
    const version = card.levelRequired === 0 ? 'woodcut-v2' : 'woodcut-v1';
    assert.equal(WOODCUT_CARDS[card.id], `cards/${version}/${card.id}.webp`, card.id);
  }
  assert.equal(WOODCUT_CARDS.charge, 'cards/crown-covers-v2/charge.webp');
  for (const folder of ['attack', 'defend', 'ultimate']) {
    assert.equal(WOODCUT_CARDS[`folder-${folder}`], `cards/crown-engraved-v1/folder-${folder}.webp`);
  }
  const manifest = JSON.parse(readFileSync(new URL('../../public/cards/crown-covers-v2/manifest.json', import.meta.url), 'utf8')) as { cards: { id: string; file: string }[] };
  assert.deepEqual(manifest.cards.map(({ id, file }) => ({ id, file })), [{ id: 'charge', file: 'charge.webp' }]);
});

