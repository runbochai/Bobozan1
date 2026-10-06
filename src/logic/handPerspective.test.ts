import assert from 'node:assert/strict';
import test from 'node:test';
import { BATTLE_DIRECTIONS } from './battleLayout';
import { BATTLE_CHARACTERS } from '../data/battleCharacters';
import { battleRaisedHand } from '../data/battleRaisedHands';
import { CARD_RAISE_MS, CARD_RELEASE_MS } from '../data/battleTiming';
import { HAND_PERSPECTIVE_PEAK, HAND_RETRACT_MS, handPerspectiveScale, handWarpRegion, handWarpSample } from './handPerspective';

test('hand enlargement follows the existing release clock and retracts within the falling pose', () => {
  assert.equal(handPerspectiveScale(0), 1);
  assert.equal(handPerspectiveScale(CARD_RAISE_MS), 1);
  assert.equal(handPerspectiveScale(CARD_RELEASE_MS), HAND_PERSPECTIVE_PEAK);
  assert.equal(handPerspectiveScale(CARD_RELEASE_MS + HAND_RETRACT_MS), 1);
  assert.equal(handPerspectiveScale(1450), 1);
  let previous = 1;
  for (let t = CARD_RAISE_MS; t <= CARD_RELEASE_MS; t++) {
    const value = handPerspectiveScale(t);
    assert.ok(value >= previous && value <= 1.65);
    previous = value;
  }
  for (let t = CARD_RELEASE_MS; t <= CARD_RELEASE_MS + HAND_RETRACT_MS; t++) {
    const value = handPerspectiveScale(t);
    assert.ok(value <= previous && value >= 1);
    previous = value;
  }
});

test('all character directions leave the head center, torso, feet and pixels outside the hand unchanged', () => {
  for (const avatar of Object.keys(BATTLE_CHARACTERS)) for (const direction of BATTLE_DIRECTIONS) {
    const hand = battleRaisedHand(avatar, direction), region = handWarpRegion(hand);
    for (const point of [{ x: 96, y: 60 }, { x: 96, y: 150 }, { x: 65, y: 231 }, { x: 122, y: 231 }]) {
      assert.deepEqual(handWarpSample(point, region, HAND_PERSPECTIVE_PEAK), point, `${avatar} ${direction}`);
    }
    for (let x = 0; x < 192; x += 3) for (let y = 200; y < 256; y += 3) {
      assert.deepEqual(handWarpSample({ x, y }, region, HAND_PERSPECTIVE_PEAK), { x, y });
    }
    const outside = { x: region.center.x + region.axis.x * (region.along + 1), y: region.center.y + region.axis.y * (region.along + 1) };
    assert.deepEqual(handWarpSample(outside, region, HAND_PERSPECTIVE_PEAK), outside);
    // Pixel samples move continuously toward the palm; they never fold over and duplicate it.
    let previousDistance = -1;
    for (let distance = 0; distance <= region.along + 2; distance += .1) {
      const point = { x: region.center.x + region.axis.x * distance, y: region.center.y + region.axis.y * distance };
      const sample = handWarpSample(point, region, HAND_PERSPECTIVE_PEAK);
      const nextDistance = Math.hypot(sample.x - region.center.x, sample.y - region.center.y);
      assert.ok(Number.isFinite(nextDistance) && nextDistance > previousDistance);
      previousDistance = nextDistance;
    }
  }
});

test('the palm grows locally while scale one preserves the exact source frame', () => {
  const region = handWarpRegion(battleRaisedHand('avatars/robot.webp', 's'));
  const point = { x: region.center.x + region.axis.x * 4, y: region.center.y + region.axis.y * 4 };
  assert.deepEqual(handWarpSample(point, region, 1), point);
  const enlarged = handWarpSample(point, region, HAND_PERSPECTIVE_PEAK);
  assert.ok(Math.abs(Math.hypot(enlarged.x - region.center.x, enlarged.y - region.center.y) - 4 / HAND_PERSPECTIVE_PEAK) < .001);
});

test('the falling pose retracts only the palm rather than pulling nearby wings or the torso', () => {
  const region = handWarpRegion({ palm: { x: .79, y: .68 }, elbow: { x: .71, y: .62 } }, 'release');
  for (let angle = 0; angle < Math.PI * 2; angle += .05) {
    const point = { x: region.center.x + Math.cos(angle) * 17, y: region.center.y + Math.sin(angle) * 17 };
    assert.deepEqual(handWarpSample(point, region, HAND_PERSPECTIVE_PEAK), point);
  }
});
