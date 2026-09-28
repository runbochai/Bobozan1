import { doc, runTransaction } from 'firebase/firestore';
import { db } from '../firebase';
import { APP_ID } from '../data/constants';
import type { GameState } from '../types';
import type { RoomPatch } from '../logic/room';

export const roomRef = (code: string) => doc(db, 'rooms', `${APP_ID}_${code.trim().toUpperCase()}`);

// Recompute every change from the latest snapshot on transaction retries.
// Callbacks must not mutate inputs or perform UI/network side effects.
export async function mutateRoom(code: string, update: (room: GameState) => RoomPatch) {
  const ref = roomRef(code);
  return runTransaction(db, async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists()) throw new Error('roomNotFound');
    const room = snapshot.data() as GameState;
    const patch = update(room);
    if (patch) transaction.update(ref, patch);
    return patch ? { ...room, ...patch } : room;
  });
}

export async function createUniqueRoom(room: GameState) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(100000 + crypto.getRandomValues(new Uint32Array(1))[0] % 900000);
    const ref = roomRef(code);
    const created = await runTransaction(db, async transaction => {
      if ((await transaction.get(ref)).exists()) return false;
      transaction.set(ref, room);
      return true;
    });
    if (created) return code;
  }
  throw new Error('Could not allocate a room code. Please try again.');
}
