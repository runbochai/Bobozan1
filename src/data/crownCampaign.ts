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
    line: { zh: '先坐。手别攥这么紧，牌都弯了。我陪你练一局。', en: 'Sit down. Easy with those cards—you’re bending them. We’ll play a practice round.' },
    objective: { zh: '完成资格练习，带着灯尾镇的名字参赛。', en: 'Pass the qualifiers and enter in Emberwick’s name.' },
    enter: { zh: '坐到练习桌前', en: 'Take a practice seat' },
  },
  {
    title: { zh: '听他说，再看他做', en: 'Words and Tells' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '别光听他吓唬你。瞧一眼他的能量，再想想他刚才出了什么。', en: 'Don’t let him talk you into a panic. Check his energy. What did he play last time?' },
    objective: { zh: '观察对手攒能量的空档，找机会出手。', en: 'Find an opening while your opponent builds energy.' },
    enter: { zh: '试着猜下一张', en: 'Make your read' },
  },
  {
    title: { zh: '最后一枚资格章', en: 'The Qualifier’s Stamp' }, speaker: { zh: '守门老龟', en: 'The Old Gatekeeper' }, portrait: 'avatars/enemies/turtle.webp',
    line: { zh: '你要赶路，我知道。可这枚章，也不能白给你。坐吧。', en: 'I know you have somewhere to be. But I can’t just hand you the stamp. Sit down.' },
    objective: { zh: '通过守门人的考验，拿到正式入场资格。', en: 'Pass the gatekeeper’s test to enter the Crown War.' },
    enter: { zh: '参加资格终试', en: 'Take the final trial' },
  },
  {
    title: { zh: '不肯让座的人', en: 'A Rival Takes a Seat' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '别跟我说你有多急。我家那边，也有人摸着黑等消息。', en: 'Don’t tell me how badly you need this. People back home are waiting in the dark, too.' },
    objective: { zh: '进入赤铜赛区，向第一枚城印前进。', en: 'Enter the Copper District and seek the first city seal.' },
    enter: { zh: '与洛牙交手', en: 'Face Rook' },
  },
  {
    title: { zh: '高一阶的对手', en: 'One Step Above' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '等等，他比你高一级。硬拼不划算，咱们换个办法。', en: 'Hold on. He’s a level above you. Trading blows will hurt. Let’s try something else.' },
    objective: { zh: '面对等级压制，尝试避开对手擅长的交锋。', en: 'Find a way around a stronger opponent’s preferred clash.' },
    enter: { zh: '挑战老练守卫', en: 'Challenge the veteran' },
  },
  {
    title: { zh: '桌上不止一个对手', en: 'More Than One Rival' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '别光盯着哥哥。弟弟那边，你也得留个心眼。', en: 'Don’t get so caught up watching the older brother. His little brother is watching you, too.' },
    objective: { zh: '应对同桌的多名对手，争取决赛席位。', en: 'Survive a crowded table to reach the district final.' },
    enter: { zh: '加入混战牌桌', en: 'Join the crowded table' },
  },
  {
    title: { zh: '余烬的守印人', en: 'Keeper of the Ember Seal' }, speaker: { zh: '赤铜守印人', en: 'The Copper Keeper' }, portrait: 'avatars/enemies/ironwall.webp',
    line: { zh: '印就在这儿。我守了这么多年，总得交给个靠得住的人。', en: 'Here’s the seal. I’ve kept it safe for years. I need to know you can look after it.' },
    objective: { zh: '赢下赛区决赛，取得余烬之印。', en: 'Win the district final and claim the Ember Seal.' },
    enter: { zh: '争夺余烬之印', en: 'Contest the Ember Seal' },
  },
  {
    title: { zh: '旧对手，新手法', en: 'A Familiar Face, a New Trick' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '又见面了。上回那一局，我回去想了很久。来，再打一场。', en: 'You again. I spent a long time thinking about that last game. Come on. Another round.' },
    objective: { zh: '进入潮汐赛区；旧经验有用，也会成为破绽。', en: 'Enter the Tide District. Old habits can help—or give you away.' },
    enter: { zh: '再次迎战洛牙', en: 'Meet Rook again' },
  },
  {
    title: { zh: '岸边的信', en: 'A Letter on the Shore' }, speaker: TOWN, portrait: 'avatars/enemies/coward.webp',
    line: { zh: '镇上入夜就黑了。大家轮流在路口等，怕你回来找不着路。', en: 'It’s dark here after sunset. We take turns waiting by the road, in case you can’t find your way home.' },
    objective: { zh: '击败潮汐赛区的强手，守住回家的希望。', en: 'Beat the district contender and keep the way home open.' },
    enter: { zh: '继续潮汐赛程', en: 'Continue through Tide' },
  },
  {
    title: { zh: '退潮时出手', en: 'Strike at Low Tide' }, speaker: { zh: '潮汐守印人', en: 'The Tide Keeper' }, portrait: 'avatars/enemies/dragon_elder.webp',
    line: { zh: '不着急。你想等，我陪你等。', en: 'No hurry. If you’d like to wait, so will I.' },
    objective: { zh: '赢下潮汐之印，继续寻找王冠的秘密。', en: 'Claim the Tide Seal and follow the Crown’s secret.' },
    enter: { zh: '争夺潮汐之印', en: 'Contest the Tide Seal' },
  },
  {
    title: { zh: '谁在说真话', en: 'Who Is Telling the Truth?' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '听不出真假，就先别信。看看他前几回出了什么。', en: 'Can’t tell if he means it? Don’t take his word for it yet. Look at what he’s been playing.' },
    objective: { zh: '踏入迷雾赛区，从出牌记录里找线索。', en: 'Enter the Mist District. Look for clues in the moves already played.' },
    enter: { zh: '走进迷雾牌桌', en: 'Enter the Mist table' },
  },
  {
    title: { zh: '笑脸后的筹码', en: 'Behind the Smile' }, speaker: { zh: '迷雾三影', en: 'The Three Mist Shadows' }, portrait: 'avatars/enemies/shadow_a.webp',
    line: { zh: '你听他的？他连欠我多少钱都不肯认。', en: 'You’re listening to him? He won’t even admit how much he owes me.' },
    objective: { zh: '分清三名对手的节奏，用能量与出牌习惯判断真假。', en: 'Track all three opponents. Read their energy and habits, not just their words.' },
    enter: { zh: '试探他们的底牌', en: 'Test their bluffs' },
  },
  {
    title: { zh: '第三枚城印', en: 'The Third City Seal' }, speaker: { zh: '迷雾守印人', en: 'The Mist Keeper' }, portrait: 'avatars/enemies/hangman.webp',
    line: { zh: '赢了我，城门就会开。进去以后，别说没人劝过你。', en: 'Beat me, and the gates will open. Once you’re inside, don’t say nobody warned you.' },
    objective: { zh: '取得迷雾之印，打开通往王冠城的路。', en: 'Claim the Mist Seal and open the road to Crown City.' },
    enter: { zh: '争夺迷雾之印', en: 'Contest the Mist Seal' },
  },
  {
    title: { zh: '灯火去了哪里', en: 'Where the Light Went' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '等等，这根管子……接的是灯尾镇。怪不得家里黑了，这里却这么亮。', en: 'Wait. That conduit runs to Emberwick. No wonder it’s so bright here while we’re sitting in the dark.' },
    objective: { zh: '切断三座供能塔，削弱王冠；或冒险直接进入决战。', en: 'Cut the three supply towers to weaken the Crown, or risk the direct route.' },
    enter: { zh: '先切断铜脉塔', en: 'Cut the Copper Tower' },
  },
  {
    title: { zh: '逆流', en: 'Against the Current' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '我一直想着，把灯赢回来就行了。可那些灯……原来也是从别人家拿的。', en: 'I thought I just had to win our lights back. But those lights... they were taking them from someone else.' },
    objective: { zh: '切断第二座塔，让王冠失去更多供能。', en: 'Cut the second tower and deny the Crown more power.' },
    enter: { zh: '切断潮涌塔', en: 'Cut the Tide Tower' },
  },
  {
    title: { zh: '最后一条管线', en: 'The Last Conduit' }, speaker: AXLE, portrait: 'avatars/robot.webp',
    line: { zh: '还剩这一座。别急，我把管线认清楚，咱们再动手。', en: 'Just this tower left. Give me a moment to trace the conduits. Then we can get to work.' },
    objective: { zh: '切断迷光塔，结束三塔对王冠的供能。', en: 'Cut the Mist Tower and end the three towers’ supply.' },
    enter: { zh: '切断迷光塔', en: 'Cut the Mist Tower' },
  },
  {
    title: { zh: '这次，为自己出牌', en: 'This Time, Our Own Hand' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '最后一个位子，还是得打一场。你要赢了，别忘了我家那边也还黑着。', en: 'One seat left. We still have to play for it. If you win, remember it’s dark back at my place, too.' },
    objective: { zh: '与洛牙决出挑战者，走向王冠的牌桌。', en: 'Face Rook for the right to challenge the Crown.' },
    enter: { zh: '赴最后一次约战', en: 'Keep the final appointment' },
  },
  {
    title: { zh: '王冠没有底牌', en: 'The Crown Has No Certainty' }, speaker: { zh: '执冠者', en: 'The Crownkeeper' }, portrait: 'avatars/enemies/lord_bozan.webp',
    line: { zh: '坐。你的每一场，我都看了。让我看看，你还藏着什么。', en: 'Sit. I’ve watched every game you’ve played. Let’s see what you’ve kept for me.' },
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
    title: { zh: '他们来收灯了', en: 'The Collectors Arrive' },
    caption: { zh: '王冠赛上，输掉的不只是名次。这一回，轮到了灯尾镇。', en: 'Win the Crown War, and your town keeps its light. Emberwick didn’t win.' },
    speaker: { zh: '王冠使者', en: 'Crown collector' },
    speech: { zh: '“时辰到了。把灯取下来。”', en: '“Time’s up. Take the lanterns down.”' },
    alt: { zh: '暮色中，王冠使者来到挂着低垂旗帜的灯尾镇。', en: 'Crown collectors enter Emberwick beneath its lowered banner at dusk.' },
  },
  {
    title: { zh: '路口也黑了', en: 'The Road Goes Dark' },
    caption: { zh: '灯芯一枚枚被取走。山上的王冠城，却比往常更亮。', en: 'One by one, the light cores are taken away. Up on the hill, Crown City is brighter than ever.' },
    speaker: { zh: '镇民', en: 'A villager' },
    speech: { zh: '“路口那盏……也不能留下吗？”', en: '“Can’t you leave the one by the road?”' },
    alt: { zh: '王冠使者收走发光的灯芯，镇上的灯渐渐暗下。', en: 'A royal collector removes a glowing lantern core as the town dims.' },
  },
  {
    title: { zh: '阿栓留了一张牌', en: 'Axle Kept a Card' },
    caption: { zh: '旧酒馆里，阿栓掏出一张没写名字的参赛牌，递到你面前。', en: 'At the old tavern, Axle holds out an entry card. The space for a name is still blank.' },
    speaker: AXLE,
    speech: { zh: '“还有个名额。想试试吗？”', en: '“There’s still a place. Want to try?”' },
    alt: { zh: '暖光下的小机器人阿栓向桌前的你递出参赛牌。', en: 'Axle, a small robot in a warm tavern, offers an entrant’s card across the table.' },
  },
  {
    title: { zh: '天快亮了', en: 'Nearly Dawn' },
    caption: { zh: '去王冠城，要先拿到三枚城印。你收好参赛牌，回头看了一眼小镇。', en: 'Three city seals will get you into Crown City. You pocket the card and look back at home.' },
    speaker: AXLE,
    speech: { zh: '“先别想王冠。来，我陪你练第一局。”', en: '“One thing at a time. Come on. I’ll help you practice.”' },
    alt: { zh: '通向王冠城的道路穿过三座赛区，远处的王冠塔发着光。', en: 'A road leads through three districts toward the glowing towers of Crown City.' },
  },
] as const;
