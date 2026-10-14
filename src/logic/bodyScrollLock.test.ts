import test from 'node:test';
import assert from 'node:assert/strict';
import { acquireBodyScrollLock } from './bodyScrollLock';

test('nested dialog locks survive out-of-order cleanup and repeated release', () => {
  const body = { style: { overflow: 'clip' } };
  const closePractice = acquireBodyScrollLock(body);
  const closeCodex = acquireBodyScrollLock(body);
  closePractice();
  closePractice();
  assert.equal(body.style.overflow, 'hidden');
  const closeExercises = acquireBodyScrollLock(body);
  closeCodex();
  assert.equal(body.style.overflow, 'hidden');
  closeExercises();
  assert.equal(body.style.overflow, 'clip');
  const closeNewDialog = acquireBodyScrollLock(body);
  closeNewDialog();
  assert.equal(body.style.overflow, 'clip');
});

test('dialog cleanup preserves an existing external lock or later external style change', () => {
  const body = { style: { overflow: 'hidden' } };
  const closeFirst = acquireBodyScrollLock(body);
  const closeSecond = acquireBodyScrollLock(body);
  closeSecond();
  closeFirst();
  assert.equal(body.style.overflow, 'hidden');

  body.style.overflow = '';
  const close = acquireBodyScrollLock(body);
  body.style.overflow = 'auto';
  close();
  assert.equal(body.style.overflow, 'auto');
});
