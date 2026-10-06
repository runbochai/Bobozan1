import type { LocalizedText } from '../types';
import { EXPEDITION_STAGES, EXPEDITION_START_HP } from './expedition';
import { EXPEDITION_DIFFICULTIES } from './expeditionDifficulty';

export type AcademyGoal = 'gain-energy' | 'block' | 'hit' | 'tie' | 'survive';

export interface AcademyFighter {
  hp: number;
  energy: number;
  inventory: number[];
  layer?: number;
}

export interface AcademyRound {
  hero: AcademyFighter;
  enemy: AcademyFighter;
  enemyMove: string;
  choices: string[];
  goal: AcademyGoal;
  prompt: LocalizedText;
  explanation: LocalizedText;
  opponentHint?: LocalizedText;
}

export interface AcademyLesson {
  id: string;
  title: LocalizedText;
  intro: LocalizedText;
  opponentHint: LocalizedText;
  concealed?: boolean;
  rounds: AcademyRound[];
}

export interface RuleTopic {
  id: string;
  title: LocalizedText;
  items: LocalizedText[];
}

const text = (zh: string, en: string): LocalizedText => ({ zh, en });
const fighter = (energy: number, inventory = [0], layer = 0): AcademyFighter => ({ hp: 1, energy, inventory, layer });

/** These are small preset exercises, not a live run; each round restores its shown state. */
export const ACADEMY_LESSONS: AcademyLesson[] = [
  {
    id: 'charge',
    title: text('先攒能量', 'Build energy'),
    intro: text('每道练习会重置到画面上的状态。先试着获得 2 点能量。', 'Each exercise restores the state shown on screen. Start by gaining 2 energy.'),
    opponentHint: text('对手现在没有能量，这次会攒。', 'The opponent has no energy and will Charge this time.'),
    rounds: [{
      hero: fighter(0), enemy: fighter(0), enemyMove: 'charge', choices: ['charge', 'defend'], goal: 'gain-energy',
      prompt: text('让自己的能量增加 2 点。', 'Gain 2 energy.'),
      explanation: text('攒不花能量；本回合受到的伤害不足 1 点时，结算获得 2 点能量。空防不会加能量。', 'Charge costs nothing and grants 2 energy if incoming damage stays below 1 this turn. Defending alone gives no energy.'),
    }],
  },
  {
    id: 'catch-charge',
    title: text('抓住攒的时机', 'Catch a Charge'),
    intro: text('双方同时出招。对手攒时，是攻击的好机会。', 'Both sides act together. Charging leaves an opening for an attack.'),
    opponentHint: text('这次对手会攒。', 'The opponent will Charge this time.'),
    rounds: [{
      hero: fighter(1), enemy: fighter(0), enemyMove: 'charge', choices: ['charge', 'hong', 'defend'], goal: 'hit',
      prompt: text('命中正在攒的对手。', 'Hit the charging opponent.'),
      explanation: text('轰花 1 能量，命中造成基础 1 点伤害，也会打断攒。本题按多人模式的 1 生命练习；新手远征开局有 3 生命。', 'Blast costs 1 energy and deals 1 base damage on a hit, interrupting Charge. This exercise uses multiplayer’s 1 HP; Beginner expedition starts with 3 HP.'),
    }],
  },
  {
    id: 'free-defense',
    title: text('免费防守', 'Defend for free'),
    intro: text('不用每回合都抢攻。挡下攻击，可以把能量留给下一招。', 'You do not need to attack every turn. Block to save energy for your next move.'),
    opponentHint: text('对手有 2 能量，这次出轰。', 'The opponent has 2 energy and will use Blast.'),
    rounds: [{
      hero: fighter(1), enemy: fighter(2), enemyMove: 'hong', choices: ['charge', 'hong', 'defend'], goal: 'block',
      prompt: text('挡住攻击，保留自己的 1 能量。', 'Block the attack and keep your 1 energy.'),
      explanation: text('防花 0 能量，能挡住轰。轰对轰虽然打平，但双方仍要花费能量；攒会被命中。', 'Defend costs 0 and stops Blast. Blast versus Blast ties but spends energy on both sides; Charge gets hit.'),
    }],
  },
  {
    id: 'attack-tier',
    title: text('攻击也有强弱', 'Attack strength'),
    intro: text('攻击相撞时先比较强度档位，不是互相扣血。', 'Clashing attacks compare their tiers rather than automatically damaging both players.'),
    opponentHint: text('这次对手出轰。', 'The opponent will use Blast.'),
    rounds: [{
      hero: fighter(2), enemy: fighter(1), enemyMove: 'hong', choices: ['hong', 'hong2', 'defend'], goal: 'hit',
      prompt: text('压过轰，并命中对手。', 'Overpower Blast and hit the opponent.'),
      explanation: text('轰轰的档位高于轰，因此能压制轰。它花 2 能量，基础命中伤害仍是 1，不是 2。', 'Double Blast has a higher tier than Blast. It costs 2 energy but still deals 1 base damage, not 2.'),
    }],
  },
  {
    id: 'upgrade-reset',
    title: text('升级与重新开始', 'Upgrade and restart'),
    intro: text('两种独立预设：先试升级后得到的新牌，再看看远征重新开始时会留下什么。', 'Two independent presets: try a newly unlocked card, then see what a fresh expedition keeps.'),
    opponentHint: text('练习中已领取 Lv.1 奖励，获得天马。对手这次出轰。', 'This practice preset has received a Lv.1 reward, unlocking Pegasus. The opponent will use Blast.'),
    rounds: [
      {
        hero: fighter(1, [0, 1]), enemy: fighter(1), enemyMove: 'hong', choices: ['hong', 'pegasus', 'defend'], goal: 'hit',
        prompt: text('用升级获得的新牌压过轰。', 'Use the newly unlocked card to overpower Blast.'),
        explanation: text('Lv.1 奖励解锁天马等新牌，不会把旧轰的伤害加高。天马能压过轰；旧轰仍与轰打平。', 'The Lv.1 reward unlocks cards such as Pegasus; it does not increase your old Blast’s damage. Pegasus beats Blast, while the old Blast still ties it.'),
      },
      {
        hero: { ...fighter(0), hp: EXPEDITION_START_HP }, enemy: fighter(0), enemyMove: 'charge', choices: ['charge', 'defend'], goal: 'gain-energy',
        opponentHint: text(`独立预设：新手远征阵亡后开启了全新一轮。现在回到基础技能、${EXPEDITION_START_HP} 生命、0 能量。`, `Independent preset: a new Beginner expedition has started after defeat. You are back to basic skills, ${EXPEDITION_START_HP} HP, and 0 energy.`),
        prompt: text('在新一轮远征的起点，重新攒出 2 能量。', 'At the start of a fresh expedition, build 2 energy again.'),
        explanation: text('远征重开会清空上一轮金币、物品、遗物与技能；课程完成记录与远征最高进度保留。联机阵亡不是远征重开：联机已获得的技能不会因阵亡而清空。', 'A new expedition clears the previous run’s gold, items, relics, and skills; completed lessons and your best expedition progress stay recorded. Multiplayer death is different: earned multiplayer skills are retained.'),
      },
    ],
  },
  {
    id: 'cost-is-not-power',
    title: text('费用不等于威力', 'Cost is not strength'),
    intro: text('1 费技能也能和 2 费基础攻击打平。看技能规则，不只看费用。', 'A 1-energy skill can tie a 2-energy basic attack. Check the skill rules, not just its cost.'),
    opponentHint: text('这次对手出 2 费的轰轰。', 'The opponent will use the 2-energy Double Blast.'),
    rounds: [{
      hero: fighter(1, [0, 1]), enemy: fighter(2), enemyMove: 'hong2', choices: ['hong', 'pegasus', 'defend'], goal: 'tie',
      prompt: text('用攻击和轰轰打平。', 'Tie Double Blast with an attack.'),
      explanation: text('天马花 1 能量，与 2 费轰轰打平。双方都扣费用、都不掉血，继续下一回合；平局不会结束战斗。', 'Pegasus costs 1 and ties the 2-energy Double Blast. Both pay their costs, neither loses HP, and the battle continues.'),
    }],
  },
  {
    id: 'skill-level',
    title: text('同档看技能等级', 'Compare skill levels'),
    intro: text('同一档的普通技能，等级更高的一方会压制另一方。', 'Within the same tier, the higher-level ordinary skill overpowers the lower one.'),
    opponentHint: text('这次对手出 Lv.1 天马。', 'The opponent will use Lv.1 Pegasus.'),
    rounds: [{
      hero: fighter(1, [0, 1, 3]), enemy: fighter(1, [0, 1]), enemyMove: 'pegasus', choices: ['pegasus', 'dragonclaw', 'defend'], goal: 'hit',
      prompt: text('选出能压过天马的攻击。', 'Choose an attack that overpowers Pegasus.'),
      explanation: text('龙爪与天马同属二档、都花 1 能量，但 Lv.3 龙爪压过 Lv.1 天马。这不是额外伤害。', 'Dragon Claw and Pegasus are both tier 2 and cost 1, but Lv.3 Dragon Claw overpowers Lv.1 Pegasus. The level advantage does not add damage.'),
    }],
  },
  {
    id: 'basic-counter',
    title: text('基础牌也能翻盘', 'Basic cards can turn it around'),
    intro: text('轰轰有例外规则。先换掉对手的能量，再抓下一次攒。两轮都从标注状态开始。', 'Double Blast has a special tie rule. Spend the opponent’s energy, then catch their next Charge. Each round starts from the shown state.'),
    opponentHint: text('对手只剩 1 能量，这次出龙爪。', 'The opponent has only 1 energy left and will use Dragon Claw.'),
    rounds: [
      {
        hero: fighter(3), enemy: fighter(1, [0, 3]), enemyMove: 'dragonclaw', choices: ['hong', 'hong2', 'defend'], goal: 'tie',
        prompt: text('用基础攻击顶住龙爪，打成平局。', 'Tie Dragon Claw with a basic attack.'),
        explanation: text('轰轰、六克与所有二档攻击技能打平，不吃普通技能的等级压制。轰轰后你剩 1 能量，对手剩 0。', 'Double Blast and 6g Strike tie all tier-2 attack skills, regardless of their level. After Double Blast, you have 1 energy and the opponent has 0.'),
      },
      {
        hero: fighter(1), enemy: fighter(0, [0, 3]), enemyMove: 'charge', choices: ['charge', 'hong', 'defend'], goal: 'hit',
        opponentHint: text('承接上一轮的能量：这次对手选择攒。0 能量也可能防守，并不保证会攒。', 'Using the last round’s energy totals, the opponent chooses Charge this time. At 0 energy they could still Defend; Charge is not guaranteed.'),
        prompt: text('用保留下来的能量完成反击。', 'Counterattack with your saved energy.'),
        explanation: text('对手这次攒，1 费的轰就能命中。观察能量能缩小猜招范围，但不能知道对手一定出什么。', 'The opponent Charges this time, so a 1-energy Blast can hit. Energy narrows their options; it never tells you their choice for certain.'),
      },
    ],
  },
  {
    id: 'break-defense',
    title: text('终极可以破防', 'Break basic defense'),
    intro: text('普通防不是万能的。终极技能命中范围内可以破防。', 'Basic defense is not universal. An in-range Ultimate can break it.'),
    opponentHint: text('同层的对手这次会防。', 'The opponent on your layer will Defend.'),
    rounds: [{
      hero: fighter(3), enemy: fighter(0), enemyMove: 'defend', choices: ['hong', 'hong2', 'ka'], goal: 'hit',
      prompt: text('击穿普通防。', 'Break through basic Defend.'),
      explanation: text('咔花 3 能量，能破普通防；轰和轰轰会被挡住。咔的射程是自己所在层，以及上下各 1 层。', 'Ka costs 3 and breaks basic Defend; Blast and Double Blast are blocked. Ka reaches your layer and one layer above or below.'),
    }],
  },
  {
    id: 'evade-range',
    title: text('离开攻击范围', 'Step outside the range'),
    intro: text('走位先结算，之后才判定射程。挪开一点不一定够远。', 'Movement resolves before attack range. Moving a little may not be enough.'),
    opponentHint: text('对手在 0 层，这次出咔。', 'The opponent is on layer 0 and will use Ka.'),
    rounds: [{
      hero: fighter(0, [0, 2, 5]), enemy: fighter(3), enemyMove: 'ka', choices: ['defend', 'smallfly', 'bigfly'], goal: 'survive',
      prompt: text('躲过咔，保持存活。', 'Avoid Ka and survive.'),
      explanation: text('小飞暂升 1 层，仍在咔的射程内；大飞暂升 2 层，能躲开。这些临时高度会在回合结束后恢复。', 'Small Fly rises 1 layer and stays within Ka’s range. Big Fly rises 2 and escapes it. Temporary height resets after the turn.'),
    }],
  },
  {
    id: 'read-habits',
    title: text('看习惯，不偷看', 'Read habits, not hidden cards'),
    intro: text('这次不会预告出牌。结合能量与历史做判断；习惯只是倾向，真实对手可能变招。', 'Cards are hidden this time. Use energy and history to judge; habits are tendencies, and a real opponent may change plans.'),
    opponentHint: text('“喘口气而已，谁说我怕了？”刚才：攒 → 轰 → 攒 → 轰。现在有 1 能量。', '“Just catching my breath. Who said I was scared?” Earlier: Charge → Blast → Charge → Blast. Now at 1 energy.'),
    concealed: true,
    rounds: [
      {
        hero: fighter(1), enemy: fighter(1), enemyMove: 'charge', choices: ['hong', 'defend', 'charge'], goal: 'hit',
        prompt: text('他这句话可信吗？试着读中一次。', 'Do you believe him? Try making a read.'),
        explanation: text('揭晓：本次对手选择攒，攻击可以命中。但 1 能量也足够出轰，真实对局中这只是判断，不是保证。', 'Reveal: the opponent chose Charge, so an attack can hit. They also had enough energy for Blast; in a real match this is a read, not a guarantee.'),
      },
      {
        hero: fighter(1), enemy: fighter(2), enemyMove: 'hong', choices: ['hong', 'defend', 'charge'], goal: 'block',
        opponentHint: text('“刚才那下，你是不是没看清？”新的局面，刚才：攒 → 轰 → 攒。现在有 2 能量。', '“Did you even see that last one?” New setup. Earlier: Charge → Blast → Charge. Now at 2 energy.'),
        prompt: text('他会照旧出招吗？这次怎样应对？', 'Will he repeat himself? How will you respond?'),
        explanation: text('揭晓：本次对手选择轰，免费防能挡下。看见攒过不代表下一招必定攻击，仍要同时看能量和其他人的动作。', 'Reveal: the opponent chose Blast, which free Defend blocks. A previous Charge does not guarantee an attack next; watch energy and other players too.'),
      },
    ],
  },
  {
    id: 'comeback',
    title: text('守住，再反击', 'Hold, then counter'),
    intro: text('接着「免费防守」的局面：你已挡住一次轰。再守一轮，保留反击的能量。', 'Continue the Free Defense setup: you have already blocked one Blast. Hold for one more turn and save your counterattack.'),
    opponentHint: text('此前：你防、对手轰。现在对手还剩 1 能量，这次继续出轰。', 'Previously: you used Defend; the opponent used Blast. They have 1 energy left and will use Blast again.'),
    rounds: [
      {
        hero: fighter(1), enemy: fighter(1), enemyMove: 'hong', choices: ['charge', 'hong', 'defend'], goal: 'block',
        prompt: text('再挡一次，留住自己的能量。', 'Block once more and keep your energy.'),
        explanation: text('连续免费防守不会消耗能量。这次挡下后，对手用完最后 1 能量，你仍有 1 能量。', 'Repeated free Defend does not consume energy. Blocking this Blast leaves the opponent at 0 while you keep 1.'),
      },
      {
        hero: fighter(1), enemy: fighter(0), enemyMove: 'charge', choices: ['charge', 'hong', 'defend'], goal: 'hit',
        opponentHint: text('对手已经 0 能量，这次会攒；真实对手也可以选择免费防。', 'The opponent is at 0 energy and will Charge this time; a real opponent could also use free Defend.'),
        prompt: text('用保留的 1 能量，命中对手完成反击。', 'Use your saved 1 energy to land the counterattack.'),
        explanation: text('对手补能量时，轰就能命中。翻盘来自前面保住生命和能量，而不是伤害叠加；真实对手若防守，这一击也会被挡住。', 'Blast can hit while the opponent refills. The turnaround comes from saving HP and energy, not stacking damage; if a real opponent Defends, this hit is blocked.'),
      },
    ],
  },
];

export const RULE_TOPICS: RuleTopic[] = [
  {
    id: 'basics', title: text('一回合怎么结算', 'How a turn works'),
    items: [
      text('所有人同时选牌；先扣费用、移动，再判定范围与对抗，最后结算伤害和攒。', 'Everyone chooses together: pay costs and move, check ranges and interactions, then resolve damage and Charge.'),
      text('基础生命是 1。攒通常加 2 能量；本回合受到至少 1 点伤害会打断攒。远征可能有额外生命、护甲和伤害。', 'Base HP is 1. Charge normally grants 2 energy, but taking at least 1 damage interrupts it. Expedition can add HP, armor, and damage.'),
      text('费用不是伤害。多数成功命中的基础伤害为 1；定枪对普通防仅造成 0.5。', 'Cost is not damage. Most successful hits deal 1 base damage; Pistol deals only 0.5 through basic Defend.'),
      text('攻击打平也会花能量；双方存活就继续下一回合。', 'Tied attacks still spend energy. If both survive, play continues next turn.'),
    ],
  },
  {
    id: 'clashes', title: text('攻击强弱与例外', 'Clashes and exceptions'),
    items: [
      text('先比强度档位；同档普通技能再比等级。轰轰压过轰，龙爪压过天马。', 'Compare tier first, then level for ordinary skills in the same tier. Double Blast beats Blast; Dragon Claw beats Pegasus.'),
      text('基础轰轰、六克与任意二档攻击技能打平，包括天马、龙爪。', 'Basic Double Blast and 6g Strike tie any tier-2 attack skill, including Pegasus and Dragon Claw.'),
      text('叽与四档非联合终极技能打平；咔叽粉与五档联合技能打平。', 'Ji ties tier-4 non-combo Ultimates; KaJi ties tier-5 combos.'),
      text('攻击压制只保护这两人的对抗；多人场上，第三个人仍可能命中你。', 'An attack clash concerns that pair only. In multiplayer, a third player can still hit you.'),
    ],
  },
  {
    id: 'defense', title: text('防御不是什么都挡', 'Defense has limits'),
    items: [
      text('普通防免费挡住多数普通攻击；终极技能、砍刀会打穿普通防，定枪会穿透半点伤害。', 'Basic Defend is free and blocks most regular attacks. Ultimates and Machete break it; Pistol pierces for half a point.'),
      text('天下第一波会击破许多防御；小飞、大飞、五克防、八克防、九克防、手盔防、脚盔防能挡。', 'World Wave breaks many defenses. Small Fly, Big Fly, 5g/8g/9g Def, Hand Def, and Foot Def can stop it.'),
      text('小飞、大飞会临时改变高度。是否躲过终极，要看结算后的距离；大飞还能从高处截下小飞。', 'Small Fly and Big Fly temporarily change height. Dodging an Ultimate depends on the resulting distance; Big Fly can also intercept Small Fly from above.'),
    ],
  },
  {
    id: 'range', title: text('层数与多人范围', 'Layers and multiplayer range'),
    items: [
      text('普通攻击默认只打同层。咔、叽打自身及上下各 1 层；其他普通终极通常上下各 2 层；联合终极上下各 3 层。', 'Regular attacks normally hit the same layer. Ka/Ji reach ±1 layer; other ordinary Ultimates normally reach ±2; combo Ultimates reach ±3.'),
      text('咔叽粉、咔叽超粉和轰天轰地轰可打任意层。轰天只打更高层，轰地只打更低层，同层无法回防。', 'KaJi, Super KaJi, and Omni-Bomb hit any layer. Sky Bomb hits only higher layers, Land Bomb only lower ones, leaving them exposed on their own layer.'),
      text('攻击会分别对每个范围内的其他存活玩家判定，不是只锁定一个目标；桌上的左右位置不等于层数。', 'Attacks resolve against every other living player in range, not a single selected target. Left/right seats are not layers.'),
      text('场上有人持有 Lv.20 技能时，升天、遁地才开放；永久层数变化与小飞等临时高度不同。', 'Ascend and Descend unlock when someone holds Lv.20. Their lasting layer changes differ from temporary flight height.'),
    ],
  },
  {
    id: 'combos', title: text('联合技能', 'Combo skills'),
    items: [
      text('持有 Lv.1+2+3 解锁天龙剑；2+5 解锁双翼齐飞；8+10+11 解锁三大金刚；20+21 解锁轰天轰地轰和诛心毒气。', 'Hold Lv.1+2+3 for Sky Dragon; 2+5 for 2 Wings; 8+10+11 for 3 Vajras; 20+21 for Omni-Bomb and Heart Poison.'),
      text('联合技有效等级取组成技能最高等级。先比档位；同档普通攻击不能压制联合攻击，联合只有有效等级更高时才压制普通技能。', 'A combo uses its highest component level. Tier comes first; at the same tier an ordinary attack cannot overpower a combo, while a combo beats an ordinary skill only with a higher effective level.'),
      text('同档联合互撞比有效等级；咔叽粉与五档联合强制打平。更高档位仍可压制较低档位。', 'Same-tier combos compare effective levels. KaJi always ties tier-5 combos. A higher tier can still overpower a lower tier.'),
      text('轰天轰地轰是三档攻击，有效 Lv.21，并非终极；双翼齐飞是身法，不参与攻击压制比较。', 'Omni-Bomb is a tier-3 Attack with effective Lv.21, not an Ultimate. 2 Wings is a movement skill, not an offensive clash.'),
      text('双翼齐飞暂升 3 层，靠离开范围躲攻击，并非无敌；范围仍够远的攻击可以命中。', '2 Wings rises 3 layers and avoids attacks by leaving their range. It is not invulnerability; attacks that still reach can hit.'),
    ],
  },
  {
    id: 'special', title: text('吸取与封印', 'Absorb and disable'),
    items: [
      text('锐吸可吸收技能，但被轰、轰轰、轰天、轰地、天下第一波克制；奥吸被六克克制。终极能打穿吸取。', 'Sharp Absorb copies skills but loses to Blast, Double Blast, Sky Bomb, Land Bomb, and World Wave. Ultra Absorb loses to 6g Strike. Ultimates beat absorption.'),
      text('吸取攒得到能量；吸取技能得到可免费使用的技能，不额外送能量。锐吸为一份，奥吸为两份。', 'Absorbing Charge grants energy; absorbing skills grants free uses rather than bonus energy. Sharp Absorb grants one copy, Ultra Absorb two.'),
      text('同层破碎可封印多数四档及以下招式；五档以上终极能打穿破碎。', 'On the same layer, Shatter disables most moves through tier 4. Tier-5 or higher Ultimates break through it.'),
    ],
  },
  {
    id: 'multiplayer', title: text('联机成长与重置', 'Multiplayer progression'),
    items: [
      text('技能表最高 Lv.23。联机胜者按局数领新技能；第 23 局起转为最终击杀榜，不再发升级奖励。最终成绩看累计击杀，不只看最后存活。', 'The skill list reaches Lv.23. Multiplayer winners earn skills by match number; from match 23, the final kill leaderboard replaces upgrade rewards. Overall results use total kills, not just the last survivor.'),
      text('攻击、防守、终极各最多保留 3 个新技能，超出后分别选择。基础牌始终保留；临时、吸收、共享和联合技不占名额。', 'Keep up to 3 acquired skills each in Attack, Defense, and Ultimate; choose separately when full. Basic cards stay. Temporary, absorbed, shared, and combo skills do not use slots.'),
      text('特殊技能已归入对应分类：吸取、封印和身法在防守里。新获得的技能排在左边；换下一个技能不影响同等级的其他技能。', 'Special tools are grouped by role: absorption, disabling, and movement are in Defense. New acquisitions appear first. Replacing one skill does not remove other skills of the same level.'),
      text('联机阵亡不会抹去已获得的技能。下一局恢复生命、能量归零，保留技能库。', 'Dying in multiplayer does not erase earned skills. The next match restores HP and resets energy while keeping the inventory.'),
      text('有人淘汰且还有至少两人存活时，幸存者生命恢复到 1、能量和层数归零，并清除封印及吸取的免费技能；技能库保留。', 'When someone is eliminated with at least two players still alive, survivors reset to 1 HP, 0 energy, and layer 0; disables and absorbed free skills clear, but the inventory stays.'),
    ],
  },
  {
    id: 'expedition', title: text('远征与练习', 'Expedition and practice'),
    items: [
      text(`远征共有 ${EXPEDITION_STAGES.length} 关，两种难度均从 Lv.0 起步。新手以 ${EXPEDITION_DIFFICULTIES.beginner.startHp} 生命开局，敌人无难度伤害加成，战斗金币保持原倍率。`, `Expedition has ${EXPEDITION_STAGES.length} stages. Both difficulties start at Lv.0. Beginner starts with ${EXPEDITION_DIFFICULTIES.beginner.startHp} HP, no difficulty damage bonus for enemies, and the usual battle gold.`),
      text(`普通以 ${EXPEDITION_DIFFICULTIES.normal.startHp} 生命及上限开局，敌人每次命中伤害 +${EXPEDITION_DIFFICULTIES.normal.enemyDamageBonus}，整笔胜利金币 ×${EXPEDITION_DIFFICULTIES.normal.goldMultiplier}。防住、打平或躲开不会凭空掉血；摇钱树等非战斗收入不翻倍。`, `Normal starts with ${EXPEDITION_DIFFICULTIES.normal.startHp} HP and max HP. Enemy hits deal +${EXPEDITION_DIFFICULTIES.normal.enemyDamageBonus} damage; the complete victory gold award is ×${EXPEDITION_DIFFICULTIES.normal.goldMultiplier}. Blocks, ties and dodges do not cause automatic damage. Non-battle income such as Money Tree is not doubled.`),
      text('两种难度的最高进度分别记录，旧版本成绩保留在新手。升级可继续解锁全部常规等级，每类仍最多保留 3 个新技能；等级高不代表旧牌自动增强。', 'Best progress is saved separately for each difficulty; earlier records stay in Beginner. Upgrades still unlock all regular levels, with up to 3 acquired skills per category. Higher level does not automatically strengthen old cards.'),
      text('远征中的金币、物品、遗物与技能属于这一轮；通关或阵亡后重新开始，会清空本轮收集。', 'Expedition gold, items, relics, and skills belong to the current run. Starting again after victory or death clears that collection.'),
      text('途中退出或刷新不会保存本轮进度；仅历史最佳与已完成课程会保留在本机。', 'Leaving or refreshing does not save the current run. Only your best record and completed lessons are kept on this device.'),
      text('铁布衫、替身人偶触发时保留至多 0.5 生命；保命不等于防住或减伤，保命前的命中伤害达到 1 时，攒仍会被打断。', 'Iron Shirt and Stand-in Doll preserve up to 0.5 HP when triggered. Surviving is not a block or damage reduction: if damage before this protection reaches 1, Charge remains interrupted.'),
      text('练习只保存已完成课程，不改联机战绩、远征物品或技能。每题使用标明的预设状态，可反复尝试。', 'Practice saves completed lessons only. It does not change multiplayer scores or expedition items and skills. Each exercise uses the stated preset and can be retried.'),
      text('能量和出牌历史提供线索，不会保证下一招。0 能量也能防守；看不见意图时，要接受判断可能失误。', 'Energy and move history are clues, not guarantees. At 0 energy a player can still Defend; hidden intent always leaves room for a wrong read.'),
    ],
  },
];
