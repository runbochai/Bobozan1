import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SKILL_DB } from '../data/skills';
import { WOODCUT_CARDS } from '../data/woodcutCards';

test('every skill and folder has its own complete engraved illustration', () => {
  const ids = [...SKILL_DB.map(card => card.id), 'folder-attack', 'folder-defend', 'folder-ultimate'];
  assert.deepEqual(Object.keys(WOODCUT_CARDS).sort(), ids.sort());
  assert.equal(new Set(Object.values(WOODCUT_CARDS)).size, ids.length, 'skills must not silently share generic placeholder art');
  const manifest = JSON.parse(readFileSync(new URL('../../public/cards/crown-engraved-v1/manifest.json', import.meta.url), 'utf8')) as { cards: { id: string; file: string }[] };
  assert.deepEqual(manifest.cards.map(card => card.id).sort(), ids);
  for (const id of ids) {
    const file = WOODCUT_CARDS[id];
    assert.equal(file, `cards/crown-engraved-v1/${id}.webp`);
    const bytes = readFileSync(new URL(`../../public/${file}`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF', id);
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP', id);
    assert.equal(bytes.readUInt32LE(4) + 8, bytes.length, `${id} must not be truncated`);
    assert.equal(manifest.cards.find(card => card.id === id)?.file, id + '.webp');
  }
});

