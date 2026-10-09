import type { Lang, LocalizedText } from '../types';
import { EXPEDITION_PRACTICE_STAGE_COUNT } from './expeditionDifficulty';

export const CROWN_STORY_VERSION = 'crown-war-v1';
export const CROWN_STAGE_COUNT = 18;

export interface CrownChapter {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  from: number;
  to: number;
  theme: string;
  color: string;
}

export const CROWN_CHAPTERS: readonly CrownChapter[] = [
  { id: 'qualification', title: { zh: '一张入场牌', en: 'A Seat at the Table' }, subtitle: { zh: '灯尾镇 · 资格试炼', en: 'Emberwick · Qualifiers' }, from: 0, to: 2, theme: 'crown-qualification', color: '#edb979' },
  { id: 'ember', title: { zh: '余烬之印', en: 'The Ember Seal' }, subtitle: { zh: '赤铜赛区 · 学会反击', en: 'Copper District · Read the opening' }, from: 3, to: 6, theme: 'crown-ember', color: '#eea277' },
  { id: 'tide', title: { zh: '潮汐之印', en: 'The Tide Seal' }, subtitle: { zh: '潮汐赛区 · 等待破绽', en: 'Tide District · Find the opening' }, from: 7, to: 9, theme: 'crown-tide', color: '#9fcfcc' },
  { id: 'mist', title: { zh: '迷雾之印', en: 'The Mist Seal' }, subtitle: { zh: '迷雾赛区 · 看穿虚张声势', en: 'Mist District · Call the bluff' }, from: 10, to: 12, theme: 'crown-mist', color: '#c3b4eb' },
  { id: 'towers', title: { zh: '王冠的代价', en: 'The Price of a Crown' }, subtitle: { zh: '供能塔 · 被夺走的灯火', en: 'Supply Towers · The stolen light' }, from: 13, to: 15, theme: 'crown-towers', color: '#d7addf' },
  { id: 'crown', title: { zh: '最后一桌', en: 'The Last Table' }, subtitle: { zh: '王冠城 · 把灯火带回家', en: 'Crown City · Bring the light home' }, from: 16, to: 17, theme: 'crown-citadel', color: '#f3ca88' },
];

export const CROWN_SEALS = [
  { id: 'ember', stageIdx: 6, name: { zh: '余烬', en: 'Ember' }, color: '#eea277' },
  { id: 'tide', stageIdx: 9, name: { zh: '潮汐', en: 'Tide' }, color: '#9fcfcc' },
  { id: 'mist', stageIdx: 12, name: { zh: '迷雾', en: 'Mist' }, color: '#c3b4eb' },
] as const;

export const CROWN_TOWERS = [
  { stageIdx: 13, name: { zh: '铜脉塔', en: 'Copper Tower' } },
  { stageIdx: 14, name: { zh: '潮涌塔', en: 'Tide Tower' } },
  { stageIdx: 15, name: { zh: '迷光塔', en: 'Mist Tower' } },
] as const;

export interface CrownStageBeat {
  title: LocalizedText;
  speaker: LocalizedText;
  portrait: string;
  line: LocalizedText;
  objective: LocalizedText;
  enter: LocalizedText;
}

const AXLE = { zh: '阿栓', en: 'Axle' };
const ROOK = { zh: '洛牙', en: 'Rook' };
const TOWN = { zh: '灯尾镇的来信', en: 'A letter from Emberwick' };

export const CROWN_STAGE_BEATS: readonly CrownStageBeat[] = [
  {
    title: { zh: '灯灭以后', en: 'After the Lights Went Out' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '镇上的灯，只够再亮一晚。先坐下，我教你出第一张牌。', en: 'The town has one night of light left. Take a seat. Let’s learn your first move.' },
    objective: { zh: '完成资格练习，带着灯尾镇的名字参赛。', en: 'Pass the qualifiers and enter in Emberwick’s name.' },
    enter: { zh: '坐到练习桌前', en: 'Take a practice seat' },
  },
  {
    title: { zh: '听他说，再看他做', en: 'Words and Tells' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '他说得越响，不一定出得越狠。看他还剩多少能量。', en: 'Loud words do not mean a strong attack. Watch how much energy he has left.' },
    objective: { zh: '观察对手攒能量的空档，找机会出手。', en: 'Find an opening while your opponent builds energy.' },
    enter: { zh: '试着猜下一张', en: 'Make your read' },
  },
  {
    title: { zh: '最后一枚资格章', en: 'The Qualifier’s Stamp' }, speaker: { zh: '守门老龟', en: 'The Old Gatekeeper' }, portrait: 'avatars/enemies/turtle.webp',
    line: { zh: '急着赢的人，常把力气浪费在我的壳上。', en: 'Players in a hurry waste their strength on my shell.' },
    objective: { zh: '通过守门人的考验，拿到正式入场资格。', en: 'Pass the gatekeeper’s test to enter the Crown War.' },
    enter: { zh: '参加资格终试', en: 'Take the final trial' },
  },
  {
    title: { zh: '不肯让座的人', en: 'A Rival Takes a Seat' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '我也有一座等着灯亮的城。别指望我让你。', en: 'My city is waiting for its lights, too. Do not expect me to go easy.' },
    objective: { zh: '进入赤铜赛区，向第一枚城印前进。', en: 'Enter the Copper District and seek the first city seal.' },
    enter: { zh: '与洛牙交手', en: 'Face Rook' },
  },
  {
    title: { zh: '高一阶的对手', en: 'One Step Above' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '他的招式比你高一阶。别跟着他的节奏硬碰。', en: 'His attacks are one level above yours. Do not let him choose the terms.' },
    objective: { zh: '面对等级压制，尝试避开对手擅长的交锋。', en: 'Find a way around a stronger opponent’s preferred clash.' },
    enter: { zh: '挑战老练守卫', en: 'Challenge the veteran' },
  },
  {
    title: { zh: '桌上不止一个对手', en: 'More Than One Rival' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '盯着一双手，你就会漏掉另一双。', en: 'Watch only one pair of hands and you miss the others.' },
    objective: { zh: '应对同桌的多名对手，争取决赛席位。', en: 'Survive a crowded table to reach the district final.' },
    enter: { zh: '加入混战牌桌', en: 'Join the crowded table' },
  },
  {
    title: { zh: '余烬的守印人', en: 'Keeper of the Ember Seal' }, speaker: { zh: '赤铜守印人', en: 'The Copper Keeper' }, portrait: 'avatars/enemies/ironwall.webp',
    line: { zh: '把这枚印带回去之前，先让我看看你的耐心。', en: 'Before you take this seal, show me your patience.' },
    objective: { zh: '赢下赛区决赛，取得余烬之印。', en: 'Win the district final and claim the Ember Seal.' },
    enter: { zh: '争夺余烬之印', en: 'Contest the Ember Seal' },
  },
  {
    title: { zh: '旧对手，新手法', en: 'A Familiar Face, a New Trick' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '上次你怎么赢的，我可记着呢。你还会照旧出牌吗？', en: 'I remember how you won last time. Will you play the same way again?' },
    objective: { zh: '进入潮汐赛区；旧经验有用，也会成为破绽。', en: 'Enter the Tide District. Old habits can help—or give you away.' },
    enter: { zh: '再次迎战洛牙', en: 'Meet Rook again' },
  },
  {
    title: { zh: '岸边的信', en: 'A Letter on the Shore' }, speaker: TOWN, portrait: 'avatars/enemies/coward.webp',
    line: { zh: '我们把剩下的灯挂在广场。你回来的时候，一眼就能看见。', en: 'We hung our last lanterns in the square. You will see them when you come home.' },
    objective: { zh: '击败潮汐赛区的强手，守住回家的希望。', en: 'Beat the district contender and keep the way home open.' },
    enter: { zh: '继续潮汐赛程', en: 'Continue through Tide' },
  },
  {
    title: { zh: '退潮时出手', en: 'Strike at Low Tide' }, speaker: { zh: '潮汐守印人', en: 'The Tide Keeper' }, portrait: 'avatars/enemies/dragon_elder.webp',
    line: { zh: '潮水总会退。你愿意等多久？', en: 'The tide always turns. How long are you willing to wait?' },
    objective: { zh: '赢下潮汐之印，继续寻找王冠的秘密。', en: 'Claim the Tide Seal and follow the Crown’s secret.' },
    enter: { zh: '争夺潮汐之印', en: 'Contest the Tide Seal' },
  },
  {
    title: { zh: '谁在说真话', en: 'Who Is Telling the Truth?' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '这里人人都在讲自己的故事。只有打出的牌不会改口。', en: 'Everyone here has a story. The cards they actually play do not change theirs.' },
    objective: { zh: '踏入迷雾赛区，从出牌记录里找线索。', en: 'Enter the Mist District. Look for clues in the moves already played.' },
    enter: { zh: '走进迷雾牌桌', en: 'Enter the Mist table' },
  },
  {
    title: { zh: '笑脸后的筹码', en: 'Behind the Smile' }, speaker: { zh: '迷雾三影', en: 'The Three Mist Shadows' }, portrait: 'avatars/enemies/shadow_a.webp',
    line: { zh: '三个人，三种说法。你信谁？', en: 'Three players. Three stories. Who do you believe?' },
    objective: { zh: '分清三名对手的节奏，用能量与出牌习惯判断真假。', en: 'Track all three opponents. Read their energy and habits, not just their words.' },
    enter: { zh: '试探他们的底牌', en: 'Test their bluffs' },
  },
  {
    title: { zh: '第三枚城印', en: 'The Third City Seal' }, speaker: { zh: '迷雾守印人', en: 'The Mist Keeper' }, portrait: 'avatars/enemies/hangman.webp',
    line: { zh: '拿齐三枚印，你就能看见王冠。也会看见它的影子。', en: 'Three seals will bring you before the Crown—and into its shadow.' },
    objective: { zh: '取得迷雾之印，打开通往王冠城的路。', en: 'Claim the Mist Seal and open the road to Crown City.' },
    enter: { zh: '争夺迷雾之印', en: 'Contest the Mist Seal' },
  },
  {
    title: { zh: '灯火去了哪里', en: 'Where the Light Went' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '这些管线接着每一座败城。王冠的力量，是从你家偷来的。', en: 'These conduits reach every defeated city. The Crown’s power was stolen from your home.' },
    objective: { zh: '切断三座供能塔，削弱王冠；或冒险直接进入决战。', en: 'Cut the three supply towers to weaken the Crown, or risk the direct route.' },
    enter: { zh: '先切断铜脉塔', en: 'Cut the Copper Tower' },
  },
  {
    title: { zh: '逆流', en: 'Against the Current' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '我以为只要赢，就能救我的城。原来只是让别人的灯先灭。', en: 'I thought winning would save my city. It only meant someone else’s lights went out first.' },
    objective: { zh: '切断第二座塔，让王冠失去更多供能。', en: 'Cut the second tower and deny the Crown more power.' },
    enter: { zh: '切断潮涌塔', en: 'Cut the Tide Tower' },
  },
  {
    title: { zh: '最后一条管线', en: 'The Last Conduit' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '这是最后一座。过了这里，我们就不必照着他的规则回家。', en: 'The last tower. Beyond it, we no longer have to go home on his terms.' },
    objective: { zh: '切断迷光塔，结束三塔对王冠的供能。', en: 'Cut the Mist Tower and end the three towers’ supply.' },
    enter: { zh: '切断迷光塔', en: 'Cut the Mist Tower' },
  },
  {
    title: { zh: '这次，为自己出牌', en: 'This Time, Our Own Hand' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '最后一个席位，我们公平争。赢的人，把两座城的灯都带回来。', en: 'One final seat. Let us earn it fairly. Whoever wins brings the light back to both our cities.' },
    objective: { zh: '与洛牙决出挑战者，走向王冠的牌桌。', en: 'Face Rook for the right to challenge the Crown.' },
    enter: { zh: '赴最后一次约战', en: 'Keep the final appointment' },
  },
  {
    title: { zh: '王冠没有底牌', en: 'The Crown Has No Certainty' }, speaker: { zh: '执冠者', en: 'The Crownkeeper' }, portrait: 'avatars/enemies/lord_bozan.webp',
    line: { zh: '我看过你一路的招式。你真的还能给我一个意外？', en: 'I have watched every move on your journey. Can you still surprise me?' },
    objective: { zh: '击败执冠者，让城市的灯火回到城市。', en: 'Defeat the Crownkeeper. Give the cities back their light.' },
    enter: { zh: '打破王冠的规则', en: 'Break the Crown’s hold' },
  },
];

const boundedStage = (stageIdx: number) => Math.min(CROWN_STAGE_COUNT - 1, Math.max(0, Math.floor(Number.isFinite(stageIdx) ? stageIdx : 0)));

export function chapterForStage(stageIdx: number): CrownChapter {
  const index = boundedStage(stageIdx);
  return CROWN_CHAPTERS.find(chapter => index >= chapter.from && index <= chapter.to)!;
}

export function themeForStage(stageIdx: number, endless = false): string {
  const index = Number.isFinite(stageIdx) ? Math.max(0, Math.floor(stageIdx)) : 0;
  const template = endless ? EXPEDITION_PRACTICE_STAGE_COUNT + index % (CROWN_STAGE_COUNT - EXPEDITION_PRACTICE_STAGE_COUNT) : index;
  return chapterForStage(template).theme;
}

export function crownStageBeat(stageIdx: number): CrownStageBeat {
  return CROWN_STAGE_BEATS[boundedStage(stageIdx)];
}

export function crownObjective(stageIdx: number, lang: Lang): string {
  return crownStageBeat(stageIdx).objective[lang];
}

export function crownProgress(cleared: readonly number[]) {
  const completed = new Set(cleared.filter(index => Number.isInteger(index) && index >= 0 && index < CROWN_STAGE_COUNT));
  const seals = CROWN_SEALS.filter(seal => completed.has(seal.stageIdx));
  const towers = CROWN_TOWERS.filter(tower => completed.has(tower.stageIdx));
  return { completed: completed.size, seals, towers, crowned: completed.has(CROWN_STAGE_COUNT - 1) };
}

export const CROWN_PROLOGUE = [
  {
    title: { zh: '灯尾镇，最后一晚', en: 'Emberwick, One Last Night' },
    caption: { zh: '王冠战争决定哪座城市能留住灯火。这一次，家乡输了。', en: 'The Crown War decides which cities keep their light. This time, home lost.' },
    speech: { zh: '“保护期结束。收回灯火。”', en: '“Protection expired. Reclaim the light.”' },
    alt: { zh: '暮色中，王冠使者来到挂着低垂旗帜的灯尾镇。', en: 'Crown collectors enter Emberwick beneath its lowered banner at dusk.' },
  },
  {
    title: { zh: '胜者的光，败者的夜', en: 'Their Light, Our Darkness' },
    caption: { zh: '王冠带走的不只是奖杯。广场上的灯，一盏接一盏熄灭。', en: 'The Crown takes more than trophies. The square goes dark, lantern by lantern.' },
    speech: { zh: '“那我们……怎么办？”', en: '“What happens to us?”' },
    alt: { zh: '王冠使者收走发光的灯芯，镇上的灯渐渐暗下。', en: 'A royal collector removes a glowing lantern core as the town dims.' },
  },
  {
    title: { zh: '还有一个席位', en: 'One Seat Remains' },
    caption: { zh: '旧酒馆里，阿栓递来一张参赛牌。', en: 'In the old tavern, Axle offers you an entrant’s card.' },
    speech: { zh: '“把灯带回来。先从读懂一双手开始。”', en: '“Bring the light home. Start by learning to read a hand.”' },
    alt: { zh: '暖光下的小机器人阿栓向桌前的你递出参赛牌。', en: 'Axle, a small robot in a warm tavern, offers an entrant’s card across the table.' },
  },
  {
    title: { zh: '你的第一张牌', en: 'Your First Card' },
    caption: { zh: '三枚城印，一座王冠。你的旅途，从家乡的一张牌桌开始。', en: 'Three city seals. One crown. Your journey begins at a table back home.' },
    speech: { zh: '“他们还不知道，你会出什么。”', en: '“They do not know what you will play.”' },
    alt: { zh: '通向王冠城的道路穿过三座赛区，远处的王冠塔发着光。', en: 'A road leads through three districts toward the glowing towers of Crown City.' },
  },
] as const;
