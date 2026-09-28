import test from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '../types';
import { calculateTurnOutcome } from './combat';
import { intentTaunt, passiveBadges } from './expedition';

const player = (id: string, patch: Partial<Player> = {}): Player => ({
  id, name: id, isBot: false, hp: 2, energy: 4, isDead: false,
  inventory: [0], layer: 0, tempLayerMod: 0, selectedCardId: null,
  lastCardId: null, lastAction: null, ...patch,
});

test('pierce：攻击无视防御直接命中', () => {
  const atk = player('atk', { selectedCardId: 'hong', pierce: true });
  const def = player('def', { selectedCardId: 'defend' });
  const res = calculateTurnOutcome([atk, def], 1, 1, 'zh');
  const victim = res.players.find(p => p.id === 'def')!;
  assert.equal(victim.isDead, true);
  assert.ok(res.logs.some(l => l.text.includes('打穿')));
});

test('no pierce：普通攻击打不动防御', () => {
  const atk = player('atk', { selectedCardId: 'hong' });
  const def = player('def', { selectedCardId: 'defend' });
  const res = calculateTurnOutcome([atk, def], 1, 1, 'zh');
  const victim = res.players.find(p => p.id === 'def')!;
  assert.equal(victim.isDead, false);
  assert.equal(victim.hp, 2);
});

test('energyDrain：命中时吸取目标能量', () => {
  const atk = player('atk', { selectedCardId: 'gun', energyDrain: 1 });
  const def = player('def', { selectedCardId: 'defend', energy: 3 });
  const res = calculateTurnOutcome([atk, def], 1, 1, 'zh');
  const victim = res.players.find(p => p.id === 'def')!;
  assert.equal(victim.hp, 1); // gun 打 1 点，没死
  assert.equal(victim.energy, 2); // 被吸 1 点
  assert.ok(res.logs.some(l => l.text.includes('吸取')));
});

test('attackBonus（dmgBonus)：枪伤害 +1 直接带走', () => {
  const atk = player('atk', { selectedCardId: 'gun', dmgBonus: 1 });
  const def = player('def', { selectedCardId: 'defend' });
  const res = calculateTurnOutcome([atk, def], 1, 1, 'zh');
  const victim = res.players.find(p => p.id === 'def')!;
  assert.equal(victim.isDead, true); // 1+1=2 伤害
});

test('intentTaunt：显示时按类型给台词，隐藏时不泄露', () => {
  const a = intentTaunt('ATTACK', true, 'e1', 3, 5, 'zh');
  assert.ok(['吃我一击！', '我要打你！', '看招！'].includes(a));
  // 确定性：同输入同输出
  assert.equal(a, intentTaunt('ATTACK', true, 'e1', 3, 5, 'zh'));
  const h1 = intentTaunt('ATTACK', false, 'boss1', 3, 14, 'zh');
  const h2 = intentTaunt('DEFEND', false, 'boss1', 3, 14, 'zh');
  assert.equal(h1, h2); // 隐藏时台词与真实意图无关
  assert.ok(['呵呵，猜猜看？', '……', '你猜我要干嘛？'].includes(h1));
});

test('passiveBadges：三种新被动都有徽章和说明', () => {
  const badges = passiveBadges({ pierce: true, energyDrain: 1, attackBonus: 1 }, 'zh');
  assert.equal(badges.length, 3);
  assert.ok(badges.some(b => b.key === 'pierce' && b.desc.includes('无视')));
  assert.ok(badges.some(b => b.key === 'drain' && b.desc.includes('1 点能量')));
  assert.ok(badges.some(b => b.key === 'fury' && b.desc.includes('+1')));
  assert.deepEqual(passiveBadges(undefined, 'zh'), []);
});
