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
  { id: 'qualification', title: { zh: '灯纹的继承者', en: 'Bearer of the Lantern' }, subtitle: { zh: '灯尾镇 · 资格试炼', en: 'Emberwick · Qualifiers' }, from: 0, to: 2, theme: 'crown-qualification', color: '#edb979' },
  { id: 'ember', title: { zh: '余烬之印', en: 'The Ember Seal' }, subtitle: { zh: '赤铜赛区 · 学会反击', en: 'Copper District · Read the opening' }, from: 3, to: 6, theme: 'crown-ember', color: '#eea277' },
  { id: 'tide', title: { zh: '潮汐之印', en: 'The Tide Seal' }, subtitle: { zh: '潮汐赛区 · 等待破绽', en: 'Tide District · Find the opening' }, from: 7, to: 9, theme: 'crown-tide', color: '#9fcfcc' },
  { id: 'mist', title: { zh: '迷雾之印', en: 'The Mist Seal' }, subtitle: { zh: '迷雾赛区 · 看穿虚张声势', en: 'Mist District · Call the bluff' }, from: 10, to: 12, theme: 'crown-mist', color: '#c3b4eb' },
  { id: 'towers', title: { zh: '王冠的代价', en: 'The Price of a Crown' }, subtitle: { zh: '供能塔 · 被夺走的灯火', en: 'Supply Towers · The stolen light' }, from: 13, to: 15, theme: 'crown-towers', color: '#d7addf' },
  { id: 'crown', title: { zh: '最后一桌', en: 'The Last Table' }, subtitle: { zh: '王冠城 · 向旧王挑战', en: 'Crown City · Challenge the old king' }, from: 16, to: 17, theme: 'crown-citadel', color: '#f3ca88' },
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
    line: { zh: '先坐。灯纹牌替你开了门，怎么赢还得自己学。别攥那么紧，牌都弯了。', en: 'Sit down. That lantern card opened the door. Winning takes practice. Easy now—you’re bending the cards.' },
    objective: { zh: '从第一局练习开始，学会用好手里的微光。', en: 'Start with a practice hand. Learn to use the little light you have.' },
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
    line: { zh: '守灯派的牌？印记是真的。可光认得牌还不够，让我看看你怎么出。', en: 'A Lamplighter’s card? The seal is genuine. But I need to see more than a card. Show me how you play.' },
    objective: { zh: '通过实战查验，让继承来的挑战权正式登记。', en: 'Pass the practical trial and register your inherited right of challenge.' },
    enter: { zh: '参加资格终试', en: 'Take the final trial' },
  },
  {
    title: { zh: '不肯让座的人', en: 'A Rival Takes a Seat' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '我叫洛牙。王城征走了我家的地，我得拿回来。你有你的理由，我也有。', en: 'Rook. The Crown took my family’s land. I mean to get it back. You have your reasons. So do I.' },
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
    line: { zh: '守印是我的差事。你替谁来、恨谁，都一样。赢了，印就是你的。', en: 'Keeping the seal is my duty. Who sent you, who you hate—it makes no difference. Win, and it’s yours.' },
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
    line: { zh: '父亲把炉子修好了，就差一枚灯芯。母亲说，路上别省那口热饭。我们等你回来。', en: 'Your father fixed the stove. It only needs a core now. Your mother says to eat something warm on the road. We’re waiting for you.' },
    objective: { zh: '击败潮汐赛区的强手，守住回家的希望。', en: 'Beat the district contender and keep the way home open.' },
    enter: { zh: '继续潮汐赛程', en: 'Continue through Tide' },
  },
  {
    title: { zh: '退潮时出手', en: 'Strike at Low Tide' }, speaker: { zh: '潮汐守印人', en: 'The Tide Keeper' }, portrait: 'avatars/enemies/dragon_elder.webp',
    line: { zh: '不着急。你想等，我陪你等。', en: 'No hurry. If you’d like to wait, so will I.' },
    objective: { zh: '赢下潮汐之印，向挑战王座的资格再近一步。', en: 'Claim the Tide Seal and take another step toward a duel for the throne.' },
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
    line: { zh: '税收来的灯芯，全进了这座塔。你父亲修的那盏也在。它们在给国王的牌供能。', en: 'The taxed cores all ended up in this tower. There’s the lantern your father repaired. They’re powering the king’s cards.' },
    objective: { zh: '切断三座供能塔，削弱王冠；或冒险直接进入决战。', en: 'Cut the three supply towers to weaken the Crown, or risk the direct route.' },
    enter: { zh: '先切断铜脉塔', en: 'Cut the Copper Tower' },
  },
  {
    title: { zh: '逆流', en: 'Against the Current' }, speaker: ROOK, portrait: 'avatars/enemies/wolf.webp',
    line: { zh: '我原先只想拿回我家的地。可他再签一道令，别人家又得没了。只换张地契，不够。', en: 'I only wanted my family’s land back. But he can take someone else’s with another decree. One deed won’t fix this.' },
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
    line: { zh: '最后一个位子，我不会让。你要是赢了、坐上那把椅子，别变成我们一路追着骂的人。', en: 'I won’t give up the last seat. If you win and take that throne, don’t turn into the man we’ve cursed all this way.' },
    objective: { zh: '与洛牙决出挑战者，走向王冠的牌桌。', en: 'Face Rook for the right to challenge the Crown.' },
    enter: { zh: '赴最后一次约战', en: 'Keep the final appointment' },
  },
  {
    title: { zh: '让王冠换一个主人', en: 'A New Bearer of the Crown' }, speaker: { zh: '老国王 · 奥瑞恩', en: 'Aurion · The Old King' }, portrait: 'avatars/enemies/lord_bozan.webp',
    line: { zh: '祖法认你的牌，我就让你坐。但别以为，借来一个名分，就配教我做国王。', en: 'The old law recognizes your card, so sit. But a borrowed title does not entitle you to teach me how to rule.' },
    objective: { zh: '击败老国王，依祖法接过王冠，结束苛税与灯火征收。', en: 'Defeat the old king, claim the crown under the old law, and end the punishing levies.' },
    enter: { zh: '挑战老国王', en: 'Challenge the old king' },
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

export const CROWN_PROLOGUE_PAGE_SIZE = 4;
export const CROWN_PROLOGUE_PAGE_TITLES = [
  { zh: '灯火与税册', en: 'The Light and the Ledger' },
  { zh: '熄灯以后', en: 'After the Lamps Go Dark' },
  { zh: '守灯人的旧路', en: 'The Lamplighter’s Road' },
  { zh: '把微光交给你', en: 'A Little Light, Passed On' },
  { zh: '先从这一桌开始', en: 'First, This Table' },
] as const;

export const CROWN_PROLOGUE = [
  {
    image: 'story/lantern-origin-v1/p01-town.webp',
    title: { zh: '总有一盏灯等你', en: 'A Light to Come Home To' },
    caption: { zh: '灯芯能存下光和热。照路、做饭、给病人取暖，灯尾镇的日子都靠它。', en: 'Light cores hold warmth as well as light. Emberwick uses them to cook, light its roads, and keep the sick warm.' },
    speaker: { zh: '街坊', en: 'A neighbor' },
    speech: { zh: '“快回家吧，饭要凉了。”', en: '“Come on home. Supper’s getting cold.”' },
    alt: { zh: '温暖的灯笼照亮小镇的街道，远处是山上的王冠城。', en: 'Warm lanterns light the village street beneath distant Crown City.' },
  },
  {
    image: 'story/lantern-origin-v1/p02-family.webp',
    title: { zh: '他们总说，还撑得住', en: 'They Always Say They’ll Manage' },
    caption: { zh: '父亲修灯，母亲在诊所帮忙。税一年比一年重，两个人却总说，还能撑一阵。', en: 'Your father mends lanterns; your mother helps at the clinic. Taxes rise every year. They always say they’ll manage.' },
    speaker: { zh: '父亲', en: 'Your father' },
    speech: { zh: '“这盏修好了，先给诊所送去。”', en: '“This one’s fixed. Take it to the clinic first.”' },
    alt: { zh: '父亲在旧桌上修理灯笼，母亲在一旁整理诊所需要的布料。', en: 'Your father repairs a lantern at an old workbench while your mother prepares supplies for the clinic.' },
  },
  {
    image: 'story/crown-v1/prologue-1.webp',
    title: { zh: '他们来收灯了', en: 'The Collectors Arrive' },
    caption: { zh: '老国王的税册又厚了一页。王城里的宴席没少，镇上却又要交一笔钱。', en: 'Another levy fills the old king’s ledger. The court still feasts. The town must pay again.' },
    speaker: { zh: '王冠使者', en: 'Crown collector' },
    speech: { zh: '“新税照收。没钱，就用灯芯抵。”', en: '“The levy stands. No coin? We take the cores.”' },
    alt: { zh: '暮色中，王冠使者来到挂着低垂旗帜的灯尾镇。', en: 'Crown collectors enter Emberwick beneath its lowered banner at dusk.' },
  },
  {
    image: 'story/crown-v1/prologue-2.webp',
    title: { zh: '路口也黑了', en: 'The Road Goes Dark' },
    caption: { zh: '使者连路口的灯也拆走了。账册上写的是欠税，人们失去的却是一夜的温饱。', en: 'They take even the lantern by the road. The ledger calls it a debt. To the town, it means a cold, hungry night.' },
    speaker: { zh: '镇民', en: 'A villager' },
    speech: { zh: '“路口那盏……也不能留下吗？”', en: '“Can’t you leave the one by the road?”' },
    alt: { zh: '王冠使者收走发光的灯芯，镇上的灯渐渐暗下。', en: 'A royal collector removes a glowing lantern core as the town dims.' },
  },
  {
    image: 'story/lantern-origin-v1/p05-cold-home.webp',
    title: { zh: '这回，家里也黑了', en: 'Now Home Is Dark, Too' },
    caption: { zh: '家里最后一枚灯芯也没保住。父母守着冷炉，没交清的账单还压在桌角。', en: 'Your family’s last light core is gone. Your parents sit by a cold stove. The unpaid bill still lies on the table.' },
    speaker: { zh: '母亲', en: 'Your mother' },
    speech: { zh: '“外衣别脱了，屋里冷。”', en: '“Keep your coat on. It’s cold in here.”' },
    alt: { zh: '父母坐在昏暗寒冷的家中，空灯笼和税单放在冷炉旁。', en: 'Your parents sit in their dark, cold home beside an empty lantern, a tax bill, and an unlit stove.' },
  },
  {
    image: 'story/lantern-origin-v1/p05-dark-road.webp',
    title: { zh: '熟悉的路，忽然很长', en: 'The Long Way Home' },
    caption: { zh: '你出门找点干柴。沿着墙根走了很远，还在想母亲刚才那句话。', en: 'You go out to look for firewood, feeling your way along the wall. Your mother’s words keep following you.' },
    speaker: { zh: '巷子深处', en: 'From the alley' },
    speech: { zh: '“嘘……这边。”', en: '“Psst. Over here.”' },
    alt: { zh: '熄灯后的街道一片深蓝，小巷深处透出一线暖光。', en: 'The unlit street lies deep blue. A sliver of warm light slips out of an alley.' },
  },
  {
    image: 'story/lantern-origin-v1/p06-elder-call.webp',
    title: { zh: '有人还没走', en: 'Someone Is Still Here' },
    caption: { zh: '一个披斗篷的老人站在窄巷里。他朝你招了招手，又看了一眼使者离开的方向。', en: 'An old figure beckons from the alley, then glances down the street where the collectors went.' },
    speaker: { zh: '神秘老者', en: 'The stranger' },
    speech: { zh: '“年轻人，过来。别站在路中间。”', en: '“Come here, youngster. Off the street.”' },
    alt: { zh: '一位披着旧斗篷的老龟在巷口向你招手。', en: 'An elderly turtle in a worn cloak beckons you into a narrow alley.' },
  },
  {
    image: 'story/lantern-origin-v1/p07-question.webp',
    title: { zh: '他没有安慰你', en: 'He Does Not Offer Comfort' },
    caption: { zh: '你想问他是谁。老人却先开了口，声音不大，每个字都很清楚。', en: 'You open your mouth to ask his name. He speaks first, quietly enough that only you can hear.' },
    speaker: { zh: '神秘老者', en: 'The stranger' },
    speech: { zh: '“年轻人，你想改变这一切吗？”', en: '“Youngster, do you want to change all this?”' },
    alt: { zh: '老者抬起头，灯光照出兜帽下认真而平静的神情。', en: 'The stranger lifts his head. A little light catches his calm, searching expression.' },
  },
  {
    image: 'story/lantern-origin-v1/p09-noble-seal.webp',
    title: { zh: '斗篷下，是一枚旧徽章', en: 'An Old Crest Under the Cloak' },
    caption: { zh: '老人拨开衣襟，露出守灯派的徽章。那是一群想改变旧制的贵族。', en: 'Beneath his cloak is the Lamplighters’ crest: a noble faction that once tried to change the old laws.' },
    speaker: { zh: '神秘老者', en: 'The stranger' },
    speech: { zh: '“只有贵族能授挑战牌。没牌，就不能上桌。”', en: '“Only nobles may grant challenge cards. No card, no seat.”' },
    alt: { zh: '老龟拨开斗篷，露出磨损的灯笼贵族徽章。', en: 'The elderly turtle parts his cloak, revealing a worn noble crest shaped like a lantern.' },
  },
  {
    image: 'story/lantern-origin-v1/p02-result.webp',
    title: { zh: '他们也曾坐上那张桌', en: 'They Tried That Table, Too' },
    caption: { zh: '守灯派试过让国王减税，也试过按旧法用决斗换一个新王。同行的人，越来越少。', en: 'The Lamplighters pleaded for lower taxes, then used the old duel law to seek a new king. Fewer and fewer returned.' },
    speaker: { zh: '老者的回忆', en: 'The stranger remembers' },
    speech: { zh: '“大家都输光了。可我还不肯走。”', en: '“My friends had nothing left. I still wouldn’t leave.”' },
    alt: { zh: '守灯派的同伴败在王室的牌桌前，失望地低下头。', en: 'The stranger’s fellow Lamplighters sit defeated before a royal card table.' },
  },
  {
    image: 'story/lantern-origin-v1/p11-guarded-throne.webp',
    title: { zh: '王座前，还有很多人', en: 'So Many Seats Before the Throne' },
    caption: { zh: '祖法规定，败者让出王冠。国王不肯改祖法，却把亲信一层层挡在挑战者面前。', en: 'The old law says the loser must yield the crown. The king would not change that law. He filled the way to his throne with retainers instead.' },
    speaker: { zh: '神秘老者', en: 'The stranger' },
    speech: { zh: '“每过一道门，他就再加一道。”', en: '“For every door I passed, he put up another.”' },
    alt: { zh: '年轻时的老者站在层层王室侍卫和牌桌前，远处高台上坐着国王。', en: 'The stranger remembers rows of royal retainers and duel tables blocking the distant king’s throne.' },
  },
  {
    image: 'story/lantern-origin-v1/p12-faltering-hand.webp',
    title: { zh: '这只手，已经不稳了', en: 'The Hand Is No Longer Steady' },
    caption: { zh: '说到这里，老人低头看了看自己的手。牌上的灯，只剩一点摇晃的光。', en: 'He looks down at his hand. It trembles. The lantern on his card holds only a wavering light.' },
    speaker: { zh: '神秘老者', en: 'The stranger' },
    speech: { zh: '“我走不动那条路了。可你还年轻。”', en: '“I can’t travel that road anymore. But you’re young.”' },
    alt: { zh: '老者布满皱纹的手微微颤抖，握着一张只有微弱光芒的灯笼牌。', en: 'The elder’s lined hand trembles around a lantern card whose light has grown faint.' },
  },
  {
    image: 'story/lantern-origin-v1/p08-glowing-card.webp',
    title: { zh: '灯，画在一张牌上', en: 'A Lantern on a Card' },
    caption: { zh: '老人依旧法，将自己的挑战资格转给你。牌上的贵族纹章还有效，微光却已经很弱。', en: 'Under the old law, he transfers his right of challenge to you. The noble seal is still valid, though the card’s light is weak.' },
    speaker: { zh: '神秘老者', en: 'The stranger' },
    speech: { zh: '“他们认这枚印。拿好，别丢了。”', en: '“They must honor this seal. Keep it safe.”' },
    alt: { zh: '老者举起一张刻着灯笼的牌，浅金色光芒照亮手掌。', en: 'The stranger holds up a lantern-engraved card. Pale gold light warms his hand.' },
  },
  {
    image: 'story/lantern-origin-v1/p09-accept.webp',
    title: { zh: '它很轻，分量却不小', en: 'Lighter Than It Feels' },
    caption: { zh: '你接过牌。它暖不了一间屋子，却给了你走出镇子的第一步。老人指向旧酒馆。', en: 'You take the card. It cannot warm a whole room, but it gives you a first step out of town. He points toward the old tavern.' },
    speaker: { zh: '神秘老者', en: 'The stranger' },
    speech: { zh: '“去找阿栓。别嫌光小，先学着把它用好。”', en: '“Find Axle. It’s a little light. Learn to use it well.”' },
    alt: { zh: '第一人称视角中，袖口伸出的手接住发光的灯笼牌。', en: 'From your view, a sleeved hand accepts the glowing lantern card.' },
  },
  {
    image: 'story/lantern-origin-v1/p10-door.webp',
    title: { zh: '酒馆还留着一线光', en: 'A Crack of Light' },
    caption: { zh: '你敲了敲酒馆后门。门里一阵叮当，小机器人探出头来。', en: 'You knock at the tavern’s back door. Something clatters inside. A little robot peeks out.' },
    speaker: AXLE,
    speech: { zh: '“这么晚了……先进来。”', en: '“Bit late, isn’t it? Come in.”' },
    alt: { zh: '阿栓打开旧酒馆的木门，屋里的暖光落在石阶上。', en: 'Axle opens the old tavern door. Warm light falls across the stone step.' },
  },
  {
    image: 'story/crown-v1/prologue-3.webp',
    title: { zh: '阿栓认得这张牌', en: 'Axle Knows This Card' },
    caption: { zh: '阿栓认出了牌背的徽记。老人的身份替你开了门，往后的每一局，却得你自己赢。', en: 'Axle recognizes the crest on the back. The old noble has opened the door. Every hand beyond it is yours to win.' },
    speaker: AXLE,
    speech: { zh: '“那老家伙……终于肯把牌交出去了。”', en: '“That old rascal. He finally passed it on.”' },
    alt: { zh: '暖光下，阿栓坐在桌边，查看你带来的灯笼牌。', en: 'In the warm tavern, Axle sits at the table and examines the lantern card you brought.' },
  },
  {
    image: 'story/lantern-origin-v1/p17-challengers.webp',
    title: { zh: '想走到王城的，不止你', en: 'You Are Not the Only Challenger' },
    caption: { zh: '阿栓说，登记厅里什么人都有：赎家人的、讨领地的，还有一心想当国王的。', en: 'Axle describes the registration hall: some want a captive relative freed, some their lands restored. Others want the throne itself.' },
    speaker: AXLE,
    speech: { zh: '“有牌是进门。坐到最后，是另一回事。”', en: '“A card gets you in. Staying at the table is another matter.”' },
    alt: { zh: '王城的登记厅里，各地挑战者持着不同徽记的牌等待登记，各怀心事。', en: 'In the royal registration hall, challengers wait with differently crested cards, each pursuing a purpose of their own.' },
  },
  {
    image: 'story/crown-v1/prologue-4.webp',
    title: { zh: '一路赢到王座前', en: 'Win Your Way to the Throne' },
    caption: { zh: '阿栓摊开地图：赢得三座赛区的城印，才有资格挑战老国王。路上，还有他的亲信。', en: 'Axle opens a map. Three district seals earn a duel with the old king. His retainers still stand along that road.' },
    speaker: AXLE,
    speech: { zh: '“先看眼前这一站。路，得一段段走。”', en: '“Start with the next stop. One stretch of road at a time.”' },
    alt: { zh: '通向王冠城的道路穿过三座赛区，远处的王冠塔发着光。', en: 'A road leads through three districts toward the glowing towers of Crown City.' },
  },
  {
    image: 'story/lantern-origin-v1/p19-rivals.webp',
    title: { zh: '对面的人，也有要回的家', en: 'The Other Player Has a Home, Too' },
    caption: { zh: '酒馆外的营火旁，洛牙举了举牌。隔着窗，你听见他也要赶明早的路。', en: 'By the campfire outside the tavern, Rook raises his card. Through the window, you hear that he is leaving at dawn, too.' },
    speaker: { zh: '洛牙', en: 'Rook' },
    speech: { zh: '“你也要去？那就桌上见。”', en: '“You’re going too? I’ll see you at the table.”' },
    alt: { zh: '灰狼洛牙和几位赶路的挑战者坐在酒馆外的营火旁，手里握着各自的牌。', en: 'Rook, a gray wolf, sits with traveling challengers around a campfire outside the tavern, each holding their own card.' },
  },
  {
    image: 'story/lantern-origin-v1/p20-first-duel.webp',
    title: { zh: '第一局，先学会看人', en: 'Your First Hand Starts Here' },
    caption: { zh: '你想起家里的冷炉，把灯纹牌放在桌边。阿栓拉开椅子，等你坐下。', en: 'You think of the cold stove at home and set the lantern card beside the table. Axle pulls out a chair for you.' },
    speaker: AXLE,
    speech: { zh: '“先别急着赢。猜猜看，我下一张会出什么？”', en: '“Don’t rush to win. What do you think I’ll play next?”' },
    alt: { zh: '阿栓坐在温暖的练习桌对面，灯纹牌放在近处，空椅子等待你入座。', en: 'Axle sits across a warm practice table. The lantern card rests nearby, and an empty chair waits for you.' },
  },
] as const;
