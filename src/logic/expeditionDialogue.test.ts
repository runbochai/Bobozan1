import assert from 'node:assert/strict';
import test from 'node:test';
import { EXPEDITION_STAGES } from '../data/expedition';
import {
  EXPEDITION_DIALOGUE, getExpeditionLine,
  type ExpeditionDialogueContext, type ExpeditionDialogueCue,
} from '../data/expeditionDialogue';

const context = (patch: Partial<ExpeditionDialogueContext> = {}): ExpeditionDialogueContext => ({
  enemyId: 'turtle', turn: 2, stageIdx: 2, seed: 'test-run', aliveCount: 2,
  enemy: { id: 'exp_s2_turtle', hp: 1, energy: 2 },
  hero: { id: 'exp_me', hp: 3, energy: 2 }, history: {}, ...patch,
});
const cue = (value: ExpeditionDialogueContext) => getExpeditionLine(value, 'zh').id.split(':')[1];
const cues: ExpeditionDialogueCue[] = ['opening', 'hurt', 'blocked', 'pattern', 'empty', 'ready', 'crowd', 'idle'];

test('all current enemies have individual voices and complete bilingual situations', () => {
  const enemies = EXPEDITION_STAGES.flatMap(stage => stage.enemies.map(enemy => enemy.id));
  assert.equal(enemies.length, 24);
  assert.deepEqual(Object.keys(EXPEDITION_DIALOGUE).sort(), [...enemies].sort());
  assert.equal(new Set(Object.values(EXPEDITION_DIALOGUE).map(profile => profile.voice)).size, enemies.length);
  for (const enemyId of enemies) {
    const profile = EXPEDITION_DIALOGUE[enemyId];
    assert.deepEqual(Object.keys(profile.lines).sort(), [...cues].sort());
    for (const lang of ['zh', 'en'] as const) {
      const lines = Object.values(profile.lines).flatMap(pair => pair.map(line => line[lang]));
      assert.equal(new Set(lines).size, 16, `${enemyId}/${lang}: repeated line across situations`);
      assert.ok(lines.every(line => line.trim() === line && !line.includes('\n')));
    }
  }
});

test('speech stays short and contains no mechanic labels or promised next-card reveals', () => {
  for (const [enemyId, profile] of Object.entries(EXPEDITION_DIALOGUE)) for (const lines of Object.values(profile.lines)) for (const line of lines) {
    assert.ok([...line.zh].length <= 16 && line.zh.length > 0, `${enemyId}: long Chinese line ${line.zh}`);
    assert.ok(line.en.length <= 40 && line.en.length > 0, `${enemyId}: long English line ${line.en}`);
    assert.doesNotMatch(line.zh, /习惯[：:]|意图[：:]|偏爱防守|下一张|本回合[：:]|成功率|概率|能量\s*[+＋]/);
    assert.doesNotMatch(line.en, /habit:|intent:|next card|this turn:|chance:|energy\s*\+/i);
  }
});

test('opening, wounds, a real block, reserves and a crowded table receive different reactions', () => {
  const base = context();
  assert.equal(cue({ ...base, turn: 1 }), 'opening');
  assert.equal(cue({ ...base, lastRound: { damageTaken: { [base.enemy.id]: .5 } } }), 'hurt');
  assert.equal(cue({ ...base, enemy: { ...base.enemy, hp: .5 } }), 'hurt');
  assert.equal(cue({ ...base, lastRound: { defendedHits: { [base.enemy.id]: 1 } } }), 'blocked');
  assert.equal(cue({ ...base, enemy: { ...base.enemy, energy: 0 } }), 'empty');
  assert.equal(cue({ ...base, enemy: { ...base.enemy, energy: 3 } }), 'ready');
  assert.equal(cue({ ...base, hero: { ...base.hero!, energy: 0 } }), 'ready');
  assert.equal(cue({ ...base, turn: 3, aliveCount: 4 }), 'crowd');
  assert.equal(cue(base), 'idle');
  // Another fighter's wound or block must not become this speaker's boast.
  assert.equal(cue({ ...base, lastRound: { damageTaken: { other: 1 }, defendedHits: { other: 1 } } }), 'idle');
});

test('repeated revealed routines are noticed, without claiming to predict the next card', () => {
  const base = context();
  const repeated = (moves: string[]) => ({ ...base, history: { [base.hero!.id]: moves } });
  assert.equal(cue(repeated(['hong', 'hong', 'hong'])), 'pattern');
  assert.equal(cue(repeated(['hong', 'liuke', 'hong2'])), 'pattern');
  assert.equal(cue(repeated(['charge', 'hong', 'charge'])), 'pattern');
  assert.equal(cue(repeated(['hong', 'hong'])), 'idle');
  assert.equal(cue(repeated(['charge', 'defend', 'hong'])), 'idle');
  assert.equal(cue(repeated(['unknown', 'unknown', 'unknown'])), 'idle');
  assert.equal(cue({ ...base, history: { [base.enemy.id]: ['hong', 'hong', 'hong'] } }), 'idle');
  const tail = ['charge', 'defend', 'hong'];
  assert.deepEqual(getExpeditionLine(repeated(['hong', 'hong', 'hong', ...tail]), 'zh'), getExpeditionLine(repeated(tail), 'zh'));
});

test('a speaker who just took damage does not claim an unhurt successful block', () => {
  const base = context();
  assert.equal(cue({ ...base, lastRound: { damageTaken: { [base.enemy.id]: 1 }, defendedHits: { [base.enemy.id]: 2 } },
    history: { [base.hero!.id]: ['hong', 'hong', 'hong'] } }), 'hurt');
});

test('committed selections and intent getters are never inspected', () => {
  const base = context({ enemyId: 'bluffer' });
  const expected = getExpeditionLine(base, 'zh');
  const forbidden = { get() { throw new Error('Dialogue inspected a hidden move'); }, enumerable: true };
  for (const player of [base.enemy, base.hero!]) {
    Object.defineProperty(player, 'selectedCardId', forbidden);
    Object.defineProperty(player, 'nextMove', forbidden);
  }
  for (const field of ['expIntents', 'intent', 'committedMove', 'personality']) Object.defineProperty(base, field, forbidden);
  assert.deepEqual(getExpeditionLine(base, 'zh'), expected);
  for (const selectedCardId of ['hong', 'ka', 'charge', 'defend']) {
    const changed = context({ enemyId: 'bluffer' });
    Object.assign(changed.enemy, { selectedCardId });
    Object.assign(changed.hero!, { selectedCardId });
    assert.deepEqual(getExpeditionLine(changed, 'zh'), expected);
  }
});

test('rerenders and translation keep the same line identity without consuming random numbers', () => {
  const base = context({ enemyId: 'lord_bozan', turn: 6, enemy: { id: 'lord', hp: 4, energy: 5 } });
  const expected = getExpeditionLine(base, 'zh');
  const original = Math.random;
  Math.random = () => { throw new Error('Render consumed random state'); };
  try {
    for (let render = 0; render < 20; render++) assert.deepEqual(getExpeditionLine(base, 'zh'), expected);
    const translated = getExpeditionLine(base, 'en');
    assert.equal(translated.id, expected.id);
    assert.equal(translated.voice, expected.voice);
    assert.notEqual(translated.text, expected.text);
  } finally { Math.random = original; }
});

test('every situation alternates wording on adjacent turns for every character and seed', () => {
  const patches: Partial<ExpeditionDialogueContext>[] = [
    {}, { enemy: { id: 'enemy', hp: .5, energy: 2 } },
    { lastRound: { defendedHits: { enemy: 1 } } },
    { history: { exp_me: ['hong', 'hong', 'hong'] } },
    { enemy: { id: 'enemy', hp: 2, energy: 0 } },
    { enemy: { id: 'enemy', hp: 2, energy: 5 } }, { aliveCount: 4 },
  ];
  for (const enemyId of Object.keys(EXPEDITION_DIALOGUE)) for (const seed of [0, 1, 'another-run']) for (const patch of patches) {
    let previous = '';
    for (let turn = 1; turn <= 12; turn++) {
      const line = getExpeditionLine(context({ enemyId, seed, turn, enemy: { id: 'enemy', hp: 2, energy: 2 }, ...patch }), 'zh');
      assert.notEqual(line.text, previous, `${enemyId}/${seed}: adjacent repeated speech`);
      previous = line.text;
    }
  }
});

test('fresh run seeds vary the opening, while replaying a seed is reproducible', () => {
  for (const enemyId of Object.keys(EXPEDITION_DIALOGUE)) {
    const ids = new Set(Array.from({ length: 16 }, (_, seed) => getExpeditionLine(context({ enemyId, turn: 1, seed }), 'zh').id));
    assert.equal(ids.size, 2, `${enemyId}: seed cannot vary the opening`);
  }
});

test('two alternating mobile speakers rotate their own wording instead of locking to odd or even turns', () => {
  for (const [enemyId, turns] of [['slime_a', [1, 3, 5, 7]], ['slime_b', [2, 4, 6, 8]]] as const) {
    const lines = turns.map(turn => getExpeditionLine(context({ enemyId, turn, speechTurn: Math.ceil(turn / 2) }), 'zh'));
    for (let index = 1; index < lines.length; index++) assert.notEqual(lines[index].text, lines[index - 1].text);
    const idle = lines.filter(line => line.id.includes(':idle:'));
    assert.equal(new Set(idle.map(line => line.id)).size, 2, `${enemyId}: mobile rotation hides a variant`);
  }
});

test('speaker emission count changes wording only; real battle turns still select the situation', () => {
  const base = context({ turn: 3, speechTurn: 1, aliveCount: 4 });
  assert.equal(cue(base), 'crowd');
  assert.equal(cue({ ...base, speechTurn: 2 }), 'crowd');
  assert.notEqual(getExpeditionLine(base, 'zh').id, getExpeditionLine({ ...base, speechTurn: 2 }, 'zh').id);
  assert.equal(cue({ ...base, turn: 1, speechTurn: 99 }), 'opening');
  assert.deepEqual(getExpeditionLine({ ...base, speechTurn: NaN }, 'zh'), getExpeditionLine({ ...base, speechTurn: undefined }, 'zh'));
});

test('resolved context stays untouched, and runtime enemy IDs resolve to the same voice', () => {
  const base = context({ history: { exp_me: ['charge', 'hong', 'charge'] }, lastRound: { damageTaken: {}, defendedHits: {} } });
  const before = structuredClone(base);
  Object.freeze(base.enemy); Object.freeze(base.hero); Object.freeze(base.history!.exp_me); Object.freeze(base.history);
  Object.freeze(base.lastRound!.damageTaken); Object.freeze(base.lastRound!.defendedHits); Object.freeze(base.lastRound); Object.freeze(base);
  const line = getExpeditionLine(base, 'zh');
  assert.deepEqual(base, before);
  assert.deepEqual(getExpeditionLine({ ...base, enemyId: 'exp_s2_turtle' }, 'zh'), line);
});

test('unknown identities and invalid turns fall back to usable stable speech', () => {
  for (const enemyId of ['future-enemy', '__proto__', 'constructor']) {
    const result = getExpeditionLine(context({ enemyId, turn: NaN }), 'en');
    assert.equal(result.voice, 'challenger');
    assert.ok(result.text.length > 0 && result.text.length <= 40);
    assert.deepEqual(getExpeditionLine(context({ enemyId, turn: -9 }), 'en'), result);
  }
});
