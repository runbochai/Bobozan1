/** Keep the wheel continuous when it passes the first or last character. */
export function wrapCharacterIndex(index: number, count: number): number {
  return ((index % count) + count) % count;
}

/** Turn toward a clicked character by the shorter route around the wheel. */
export function characterTurnTo(index: number, rotation: number, count: number): number {
  let distance = wrapCharacterIndex(index, count) - wrapCharacterIndex(rotation, count);
  if (distance > count / 2) distance -= count;
  if (distance < -count / 2) distance += count;
  return rotation + distance;
}
