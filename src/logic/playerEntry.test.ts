import test from 'node:test';
import assert from 'node:assert/strict';
import { readInvitedRoom, readPlayerName, savePlayerName } from './playerEntry';

test('invite links retain six-digit room IDs including leading zeroes and reject malformed IDs', () => {
  assert.equal(readInvitedRoom('?room=012345&lang=en'), '012345');
  for (const search of ['', '?room=', '?room=12345', '?room=1234567', '?room=ABCDEF', '?room=%3Cimg%3E', '?room=123%2045']) {
    assert.equal(readInvitedRoom(search), null);
  }
});

test('disabled browser storage does not prevent nickname entry or play', () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new Error('Storage blocked'); } });
  try {
    assert.equal(readPlayerName(), '');
    assert.doesNotThrow(() => savePlayerName('新朋友'));
  } finally {
    if (original) Object.defineProperty(globalThis, 'localStorage', original);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
