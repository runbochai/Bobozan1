import type { LocalizedText, Player } from '../types';

/** Public, already visible information only. Never pass a committed enemy move here. */
export type ExpeditionPublicFighter = Pick<Player, 'id' | 'hp' | 'energy' | 'isDead'>;
export interface ExpeditionLessonResult {
  damageTaken: number;
  defendedHits: number;
  heroCardId: string;
  opponentCardIds: string[];
}
export interface ExpeditionLessonContext {
  stageIdx: number;
  turn: number;
  hero: ExpeditionPublicFighter;
  opponents: ExpeditionPublicFighter[];
  history: Record<string, string[]>;
  legalCardIds: string[];
  lastResult?: ExpeditionLessonResult;
  recap?: { hpBefore: number; hpAfter: number; energyBefore: number; energyAfter: number };
}
export interface ExpeditionLessonHint {
  id: string;
  text: LocalizedText;
  detail: LocalizedText;
  cardIds: string[];
  relation?: '→' | '>' | '=';
}
const text = (zh: string, en: string): LocalizedText => ({ zh, en });

/** A suggestion, never a required move or a prediction of a committed card. */
export function getExpeditionLesson(context: ExpeditionLessonContext): ExpeditionLessonHint {
  const { stageIdx, hero, opponents, legalCardIds, lastResult, recap } = context;
  const alive = opponents.filter(player => !player.isDead);
  switch (stageIdx) {
    case 0: return {
      id: 'charge-opening',
      text: hero.energy < 1
        ? text('先攒能量，再找机会出手。', 'Build energy, then look for an opening.')
        : text('攻击能抓攒；也要提防对手出招。', 'Attack catches Charge; the opponent can act too.'),
      detail: text('攒通常获得 2 能量；本回合受到 1 点伤害会打断它。双方同时出牌，攻击能命中正在攒的对手，但习惯不保证下一招。', 'Charge normally gains 2 energy; taking 1 damage interrupts it. Moves resolve together: attacks hit a charging opponent, but habits do not guarantee the next move.'),
      cardIds: ['charge', 'hong'], relation: '→',
    };
    case 1: return {
      id: 'defend-counter',
      text: alive.length > 0 && alive.every(player => player.energy === 0) && hero.energy > 0
        ? text('对手能量见底，是寻找反击的机会。', 'An empty energy bar can open a counterattack.')
        : text('免费防普通攻击，留能量找反击。', 'Block basic attacks for free; save energy to counter.'),
      detail: text('防不花能量，可以挡普通攻击。挡下后观察对手剩余能量；没能量也可能防守，反击并不保证命中。终极和穿透攻击是例外。', 'Defend costs no energy and stops basic attacks. Watch the energy left afterward: an empty opponent may still Defend, so a counter is not guaranteed. Ultimates and piercing attacks are exceptions.'),
      cardIds: ['defend', 'hong'], relation: '→',
    };
    case 2: return {
      id: 'break-defense',
      text: text('咔需 3 能量，能破普通防。', 'Ka costs 3 energy and breaks basic Defend.'),
      detail: text('攒够能量后，咔能突破普通防守，射程是自身及上下各 1 层。对手仍可能换招；什么时候出手，由你判断。', 'Ka breaks basic Defend and reaches your layer and one above or below. The opponent can change moves; you decide when to act.'),
      cardIds: ['ka', 'defend'], relation: '>',
    };
    case 3: return legalCardIds.includes('pegasus') ? {
      id: 'one-energy-upgrade',
      text: text('天马 1 费胜轰；与 2 费轰轰打平。', '1-energy Pegasus beats Blast, but ties Double Blast.'),
      detail: text('升级解锁新招，并不让旧牌加伤。天马和轰都是 1 费，天马档位更高；天马与 2 费轰轰打平，双方仍扣能量。', 'Levels unlock new moves rather than adding damage to old ones. Pegasus and Blast each cost 1, but Pegasus has the higher tier. It ties 2-energy Double Blast; both still spend energy.'),
      cardIds: ['pegasus', 'hong2'], relation: '=',
    } : {
      id: 'attack-tiers',
      text: text('轰轰能压过轰；2 费不等于 2 伤害。', 'Double Blast beats Blast; cost is not damage.'),
      detail: text('轰轰比轰强，基础命中伤害仍是 1。升级后的一费天马也能压过轰，并与二费轰轰打平；拿到升级奖励后可在手牌中查看新招。', 'Double Blast is stronger than Blast but still deals 1 base damage. An unlocked 1-energy Pegasus also beats Blast and ties Double Blast. New moves appear in your hand when you take a level reward.'),
      cardIds: ['hong2', 'hong'], relation: '>',
    };
    case 4: return {
      id: 'every-opponent',
      text: text('挡住或打平一人，还要留意另一人。', 'Blocking or tying one foe does not stop the others.'),
      detail: text('每个对手分别结算；你和一人打平，另一人仍可能命中。敌人之间也会互打。清掉所有对手才过关，淘汰不会重置你的血量。', 'Each opponent resolves separately. A third fighter can still hit you during a tie. Enemies can hit each other too. Defeat them all to clear the stage; eliminations do not reset your HP.'),
      cardIds: ['hong', 'hong', 'hong2'],
    };
    case 5: return {
      id: 'read-history',
      text: text('听他说什么，再看他实际怎么出。', 'Hear what they say; watch what they actually play.'),
      detail: text('有人嘴硬，有人虚张声势。对白不是出牌预告；把话音、剩余能量和刚才的出招放在一起，自己判断。需要回顾时可打开回合复盘。', 'Some boast; some bluff. Dialogue is not a move preview. Consider their words, energy and what they just played, then make your own read. Turn review is available when you need it.'),
      cardIds: [],
    };
    case 6: return {
      id: 'same-tier-level',
      text: text('同档看技能等级；轰轰能打平二档。', 'Same tier? Compare skill levels. Double Blast ties tier 2.'),
      detail: text('龙爪（Lv.3）和天马（Lv.1）都是 1 费、二档普通攻击，龙爪等级更高，因此压过天马。Lv.0 的 2 费轰轰是例外，会与二档攻击打平，双方仍扣能量；它不能保证打平更高档的招式。', 'Dragon Claw (Lv.3) and Pegasus (Lv.1) are both 1-energy, tier-2 basic attacks. Dragon Claw wins on skill level. The Lv.0, 2-energy Double Blast is an exception: it ties tier-2 attacks and both sides spend energy. This does not guarantee a tie with higher tiers.'),
      cardIds: ['dragonclaw', 'pegasus'], relation: '>',
    };
  }
  if (lastResult?.damageTaken && lastResult.damageTaken > 0) return {
    id: 'last-hit',
    text: text(`上回合受到 ${lastResult.damageTaken} 伤害；看看谁突破了你。`, `Took ${lastResult.damageTaken} damage; check which move got through.`),
    detail: text('这是实际结算的伤害。点回合复盘查看双方出牌；费用、档位、射程和穿透都可能影响结果。下一回合仍是同时出招。', 'This is the resolved damage. Turn review shows the revealed cards. Cost, tier, reach and piercing can affect the result; the next moves still resolve together.'),
    cardIds: [lastResult.heroCardId, ...lastResult.opponentCardIds].slice(0, 3),
  };
  if (lastResult && lastResult.defendedHits > 0) return {
    id: 'last-block',
    text: text('上回合挡住了攻击；看看对手还剩多少能量。', 'You blocked an attack; check the energy they have left.'),
    detail: text('这是引擎确认的成功防守。保留的能量可以帮助反击，但对手仍可能防、攒或换招；多人时要同时看所有对手。', 'The attack was genuinely blocked. Saved energy can help a counterattack, but the opponent may Defend, Charge or change moves. In a brawl, check every opponent.'),
    cardIds: [lastResult.heroCardId, ...lastResult.opponentCardIds].slice(0, 3),
  };
  if (recap && recap.energyAfter > recap.energyBefore) return {
    id: 'energy-gained',
    text: text(`能量增加了 ${recap.energyAfter - recap.energyBefore}；现在有更多选择。`, `Energy rose by ${recap.energyAfter - recap.energyBefore}; you have more options.`),
    detail: text('这是回合结算后的能量变化，可能包含物品效果。比较手牌费用和对手能量；不必花光，也不一定每回合都攻击。', 'This is the energy change after resolution and may include item effects. Compare card costs with the opponents’ energy; you need not spend it all or attack every turn.'),
    cardIds: lastResult ? [lastResult.heroCardId] : ['charge'],
  };
  return {
    id: 'watch-and-adapt',
    text: text('他说的，和刚才做的一样吗？', 'Do their words match what they just did?'),
    detail: text('对白可能是试探，也可能只是逞强。回想刚才的出招，再结合能量做判断。没有掉血也不一定是打平；回合复盘会保留实际结算。', 'A remark may be a probe or bravado. Recall the last moves and consider energy. No damage does not necessarily mean a tie; Turn review keeps the actual resolution.'),
    cardIds: [],
  };
}
