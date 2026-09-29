import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import { AVATAR_OPTIONS } from '../data/avatars';
import { battleCharacterAtlas } from '../data/battleCharacters';

test('every selectable avatar, including alternates and saved deployment paths, has its own atlas', () => {
  const atlases = new Set<string>();
  for (const { path } of AVATAR_OPTIONS) {
    const atlas = battleCharacterAtlas(path);
    assert.ok(atlas, path);
    assert.ok(existsSync(`public/${atlas}`), atlas);
    assert.equal(battleCharacterAtlas(`/Bobozan1/${path}`), atlas);
    assert.equal(battleCharacterAtlas(`/${path}?v=2`), atlas);
    atlases.add(atlas);
  }
  assert.equal(atlases.size, AVATAR_OPTIONS.length);
});

test('unknown, remote and missing portraits keep their identity through the portrait fallback', () => {
  for (const path of [undefined, '', 'avatars/custom.png', 'https://example.com/avatars/boy.png', 'data:image/png;base64,test']) {
    assert.equal(battleCharacterAtlas(path), undefined);
  }
});
