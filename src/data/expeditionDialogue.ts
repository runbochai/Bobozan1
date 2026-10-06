import type { Lang, LocalizedText } from '../types';
import { SKILL_DB } from './skills';

export interface ExpeditionDialoguePlayer {
  id: string;
  hp: number;
  energy: number;
  isDead?: boolean;
}

/** A deliberately small public view: committed cards never belong here. */
export interface ExpeditionDialogueContext {
  enemyId: string;
  turn: number;
  /** This speaker's emission number when a small screen rotates the speakers. */
  speechTurn?: number;
  stageIdx: number;
  enemy: ExpeditionDialoguePlayer;
  hero?: ExpeditionDialoguePlayer;
  history?: Record<string, string[]>;
  lastRound?: { damageTaken?: Record<string, number>; defendedHits?: Record<string, number> };
  aliveCount?: number;
  seed?: string | number;
}

export type ExpeditionDialogueCue = 'opening' | 'hurt' | 'blocked' | 'pattern' | 'empty' | 'ready' | 'crowd' | 'idle';
type LinePair = readonly [LocalizedText, LocalizedText];
export interface ExpeditionVoice {
  /** Internal art/audio hook, never a personality label to show to the player. */
  voice: string;
  lines: Record<ExpeditionDialogueCue, LinePair>;
}
const pair = (zh: string, en: string, otherZh: string, otherEn: string): LinePair => [
  { zh, en }, { zh: otherZh, en: otherEn },
];

/** Every opponent has their own wording, including both members of a pair. */
export const EXPEDITION_DIALOGUE: Record<string, ExpeditionVoice> = {
  dummy: { voice: 'clockwork', lines: {
    opening: pair('练习开始。请别拆零件。', 'Practice starts. Mind the parts.', '检测到新人。你好，别紧张。', 'Newcomer detected. Easy now.'),
    hurt: pair('外壳凹了。记录为进步。', 'Dent detected. Yours is progress.', '疼痛模块……谁装的？', 'Who installed the pain module?'),
    blocked: pair('咚。这个声音挺清脆。', 'Clang. A rather nice sound.', '碰撞测试，通过。', 'Impact test: passed.'),
    pattern: pair('这段程序，刚运行过。', 'We just ran this routine.', '重复输入。你确定吗？', 'Repeated input. Are you sure?'),
    empty: pair('指示灯暗了。别盯着看。', 'Light went out. Stop staring.', '备用电池……也是空的。', 'Spare battery... also empty.'),
    ready: pair('散热风扇，有点吵了。', 'The cooling fan is getting loud.', '检测到你眨了一下眼。', 'Blink detected.'),
    crowd: pair('请排队。禁止拆抢。', 'Queue up. No spare-part looting.', '这么多人，保修算谁的？', 'Who covers this warranty?'),
    idle: pair('正在思考。不是死机。', 'Thinking. Not frozen.', '你盯着我，我也会盯你。', 'I can stare right back.'),
  } },
  coward: { voice: 'timid-post', lines: {
    opening: pair('先说好，不许笑我发抖。', 'No laughing at the shaking.', '我只是木头。下手轻点？', 'Only wood here. Go easy?'),
    hurt: pair('没、没哭！是树脂！', 'Not crying! That is sap!', '裂了一点。还、还能撑。', 'Just a crack. Still standing.'),
    blocked: pair('欸？挡住了？我是故意的！', 'Blocked it? I meant to do that!', '你看，我也没那么好欺负。', 'See? I am no pushover.'),
    pattern: pair('这招我见过……应该吧。', 'I know this one... I think.', '你老这样，我都快敢猜了。', 'Keep that up and I might guess.'),
    empty: pair('腿没软，是地在抖。', 'My legs are fine. Ground shakes.', '我喘口气。你别过来啊。', 'Just a breath. Stay over there.'),
    ready: pair('我、我可不是一直怕你。', 'I am not always scared of you.', '你退一步，我就信你怕了。', 'Step back. I dare you.'),
    crowd: pair('能不能先找旁边那个？', 'Could you try the other one?', '我站这儿，应该不显眼吧。', 'Nobody noticed me, right?'),
    idle: pair('别看我，看我我更慌。', 'Staring makes it worse.', '我才没偷偷看出口。', 'I was not eyeing the exit.'),
  } },
  turtle: { voice: 'dry-turtle', lines: {
    opening: pair('坐稳。老夫不赶时间。', 'Settle in. I have all day.', '年轻人，先把气喘匀。', 'Catch your breath, youngster.'),
    hurt: pair('壳没坏。是我哼了一声。', 'Shell is fine. That was a grunt.', '这一下，够我念叨半天。', 'I shall complain about that.'),
    blocked: pair('敲门呢？里面没人在家。', 'Knocking? Nobody is home.', '这壳，比你脾气硬。', 'This shell outlasts your temper.'),
    pattern: pair('又来？老夫都背下来了。', 'Again? I know it by heart.', '你这路数，比我爬得直。', 'Your routine takes no detours.'),
    empty: pair('慢点喘，不丢龟的脸。', 'A slow breath suits a turtle.', '老夫歇口气，你急什么。', 'I am resting. Why the hurry?'),
    ready: pair('脖子伸出来，不等于好欺负。', 'A long neck is no invitation.', '别以为老夫只会缩着。', 'I do more than tuck my head.'),
    crowd: pair('都让让，别踩着我的尾巴。', 'Make room. Mind the tail.', '人多吵。老夫耳朵还好着。', 'A noisy crowd. I can still hear.'),
    idle: pair('嗯。你先急。', 'Mm. You get impatient first.', '盯着壳，可看不出心思。', 'The shell gives nothing away.'),
  } },
  slime: { voice: 'bouncy-slime', lines: {
    opening: pair('啵！这张桌子弹不弹？', 'Pop! Does this table bounce?', '别戳。戳了要负责。', 'No poking. It has consequences.'),
    hurt: pair('扁了！等我鼓回来！', 'Flattened! Let me puff back up!', '啵……刚那一下不算痒。', 'Pop... that was no tickle.'),
    blocked: pair('滑开啦，嘻。', 'Slipped right off. Hee.', '弹回去了，别怪我。', 'Bounced off. Not my fault.'),
    pattern: pair('啵、啵、啵。你也会循环？', 'Pop, pop, pop. You loop too?', '这节拍，我都跟上了。', 'Even I caught that rhythm.'),
    empty: pair('小了一圈。你没看见。', 'A bit smaller. You saw nothing.', '别数我的泡泡啦。', 'Stop counting my bubbles.'),
    ready: pair('啵啵啵……有点憋不住。', 'Pop-pop-pop... getting full.', '我鼓起来了，你呢？', 'I puffed up. Your turn?'),
    crowd: pair('挤挤挤！别把我挤成饼！', 'Squeeze! Do not make me a pancake!', '这么多脚，真难躲。', 'So many feet to slip past.'),
    idle: pair('啵？你猜那个泡里有什么。', 'Pop? Guess what is in that bubble.', '我没笑。我脸就长这样。', 'Not grinning. That is my face.'),
  } },
  slime_a: { voice: 'slime-older', lines: {
    opening: pair('弟，跟紧。看哥的。', 'Stay close. Watch your big bro.', '别怕，哥在。你也别躲太远。', 'Bro is here. Do not hide too far.'),
    hurt: pair('哥没事！先别往这边看！', 'Bro is fine! Look elsewhere!', '弟，你刚才看见啥了？', 'Little bro, what did you see?'),
    blocked: pair('看见没？这叫经验。', 'See that? Experience.', '哥这身板，可不是白长的。', 'This bulk is not for show.'),
    pattern: pair('同样的花样，骗哥两遍？', 'The same trick on me twice?', '弟都看懂了，你还来？', 'Even my brother sees the pattern.'),
    empty: pair('弟，帮哥撑个场面。', 'Bro, make me look good.', '哥只是停一下，不是虚。', 'Just a pause. I am not spent.'),
    ready: pair('弟，看好了，别眨眼。', 'Eyes open, little bro.', '你先看看我，再看他。', 'Look at me. Then look at him.'),
    crowd: pair('弟别抢话，哥在谈判。', 'Let big bro do the talking.', '我们人多……别靠那么近！', 'We have numbers... not that close!'),
    idle: pair('哥不说，你就慢慢猜。', 'Big bro will let you wonder.', '弟，你别把心事写脸上。', 'Bro, fix that obvious face.'),
  } },
  slime_b: { voice: 'slime-younger', lines: {
    opening: pair('哥说他很强。反正他说的。', 'Bro says he is tough. His words.', '我跟着来，没说我听他的。', 'I came along. I am not his pet.'),
    hurt: pair('哥！刚不是说你顶着吗？', 'Bro! You said you had this!', '疼……这事回去我要告状。', 'Ow... I am telling on someone.'),
    blocked: pair('嘿，哥也没这么稳吧？', 'Ha. Bro never looked this cool.', '这回别抢我的功劳啊。', 'Do not steal credit for this.'),
    pattern: pair('又这个？哥都没你啰嗦。', 'Again? Even bro is less repetitive.', '我记得你下一步的表情。', 'I remember that look.'),
    empty: pair('哥，我那份气呢？', 'Bro, where is my share?', '小点声，别让哥听见我喘。', 'Quiet. Bro might hear me pant.'),
    ready: pair('哥，往后站点，挡我视线。', 'Bro, you are blocking my view.', '现在知道谁有底气了吧？', 'Guess who has some nerve now?'),
    crowd: pair('哥，你挤到我了！', 'Bro, quit squishing me!', '人这么多，怎么都找我？', 'All these people, yet you pick me?'),
    idle: pair('我可没答应按哥说的来。', 'I never agreed to his plan.', '你看他干嘛？我也会变脸。', 'Why watch him? I make faces too.'),
  } },
  ironwall: { voice: 'stubborn-wall', lines: {
    opening: pair('阿强在这儿，门就没开。', 'Qiang is here. Door stays shut.', '来，试试我这肩膀。', 'Come on. Test this shoulder.'),
    hurt: pair('嘶……是桌角硌的。', 'Hiss... must be the table edge.', '这点淤青，明天就散。', 'That bruise will fade tomorrow.'),
    blocked: pair('响不响？结不结实？', 'Hear that? Solid enough?', '你敲的是墙，不是门。', 'That is a wall, not a door.'),
    pattern: pair('只会敲同一块砖啊？', 'Always knocking the same brick?', '你的路数，我肩膀都记住了。', 'My shoulder knows that routine.'),
    empty: pair('我不动，你就以为我累了？', 'Stillness means tired to you?', '喘口气。墙也得通通风。', 'A breath. Walls need air too.'),
    ready: pair('这回，谁给谁让路？', 'Who steps aside this time?', '墙要是动了，你站稳点。', 'Brace yourself if the wall moves.'),
    crowd: pair('挤什么？阿强一个人也够宽。', 'No crowding. I am wide enough.', '别躲他们后头，咱俩聊。', 'Out from behind them. We can talk.'),
    idle: pair('我这表情，你能看懂？', 'Think you can read this face?', '阿强说话，有时也不算数。', 'Qiang does not always mean it.'),
  } },
  wolf: { voice: 'restless-wolf', lines: {
    opening: pair('别磨蹭，我闻见风停了。', 'Move along. Even the wind stopped.', '你手一抖，我就看见了。', 'I see every twitch.'),
    hurt: pair('牙还在。你别笑早了。', 'Still got teeth. Do not grin yet.', '这道口子，我认下了。', 'I will remember that cut.'),
    blocked: pair('扑空的滋味，尝到了？', 'Got a taste of empty air?', '慢半拍，就只有风。', 'Half a beat late. Only wind.'),
    pattern: pair('这股味道，又是老套路。', 'Same scent. Same old routine.', '脚步这么齐，怕我听不见？', 'Such steady steps. I can hear you.'),
    empty: pair('喘气不耽误我露牙。', 'I can pant and bare my teeth.', '别追太紧，会咬人的。', 'Follow too close and I bite.'),
    ready: pair('风又起了。你听见没？', 'Wind is picking up. Hear it?', '眼睛跟得上，手呢？', 'Your eyes follow. Can your hands?'),
    crowd: pair('人再多，也掩不住脚步声。', 'A crowd cannot hide your steps.', '都站开，别挡风。', 'Spread out. Let the wind through.'),
    idle: pair('我停一下，你反倒怕了？', 'I pause, and that scares you?', '别猜牙，猜眼睛。', 'Read the eyes, not the teeth.'),
  } },
  head_a: { voice: 'loud-left-head', lines: {
    opening: pair('左边说了算！右边闭嘴！', 'Left calls it! Right, hush!', '先看我。他说的不算。', 'Watch me. His words do not count.'),
    hurt: pair('谁叫右边刚才吵我的！', 'Right was distracting me!', '我没喊疼！我在骂右边！', 'Not yelling in pain! At Right!'),
    blocked: pair('右边，看见什么叫本事没？', 'Right, that is how it is done!', '这一下，我的功劳！', 'That one was all me!'),
    pattern: pair('又来？右边都猜得出！', 'Again? Even Right can guess!', '你比右边还不会变通！', 'Less flexible than Right!'),
    empty: pair('右边！你也说两句啊！', 'Right! Say something useful!', '我歇嘴，不代表我怂了。', 'Quiet mouth. Not a quiet nerve.'),
    ready: pair('右边别抢，我还没说完！', 'Do not butt in, Right!', '这回睁大眼，先看左边！', 'Eyes wide. Look left first!'),
    crowd: pair('人多也归我指挥！', 'I command the crowd too!', '谁在后面挤？右边，是你？', 'Who is pushing? Right, is it you?'),
    idle: pair('你信右边？那你可完了。', 'Trust Right? Bad idea.', '我声音大，不等于没想过。', 'Loud does not mean thoughtless.'),
  } },
  head_b: { voice: 'muttering-right-head', lines: {
    opening: pair('左边又在喊。我听着呢。', 'Left is shouting. I am listening.', '他说他的，咱们看手上。', 'Let him talk. Watch the hands.'),
    hurt: pair('左边出的主意。你找他。', 'Left had the idea. Ask him.', '嘶。别告诉左边我疼。', 'Ow. Do not tell Left.'),
    blocked: pair('左边喊完了？我挡完了。', 'Done shouting? Done blocking.', '不用吵，也能办事。', 'Quiet gets things done.'),
    pattern: pair('你和左边，都爱重复。', 'You and Left repeat yourselves.', '我听过了。换句台词？', 'Heard it. Got another line?'),
    empty: pair('你听他吵，我缓一缓。', 'Listen to him while I catch up.', '左边，轮到你逞能了。', 'Left, your turn to show off.'),
    ready: pair('这回，左边最好别插嘴。', 'Left had better stay quiet now.', '我没出声，你就忘了我？', 'Quiet, and you forget about me?'),
    crowd: pair('又挤又吵。真会挑地方。', 'Crowded and loud. Lovely choice.', '左边嘴多，这儿人也多。', 'Too many people. Too much Left.'),
    idle: pair('左边很确定。我可没答应。', 'Left is certain. I never agreed.', '你继续听他，我继续看你。', 'You hear him. I watch you.'),
  } },
  dragon_elder: { voice: 'critical-elder', lines: {
    opening: pair('手别抖。老夫看得见。', 'Steady hands. I can see them.', '礼数免了，让老夫看看本事。', 'Skip the bow. Show your skill.'),
    hurt: pair('嗯，这下有点长进。', 'Hm. Some improvement there.', '老夫记这一笔，不记仇。', 'Noted. Not a grudge, a note.'),
    blocked: pair('力气有了，眼力还差点。', 'Strength, yes. Judgment, not yet.', '门道在这儿，不在嗓门里。', 'Skill speaks without shouting.'),
    pattern: pair('背招式，不等于会交手。', 'Knowing moves is not reading foes.', '同一道题，你写了三遍。', 'Same answer, three times.'),
    empty: pair('老夫歇气，你别替我着急。', 'A breath. No need to worry for me.', '年纪大了，嘴可没认输。', 'Older. Still not conceding.'),
    ready: pair('站稳点。别只顾看爪子。', 'Stand steady. Watch more than claws.', '老夫不催，你自己掂量。', 'No rush. Weigh your choice.'),
    crowd: pair('人再多，也得一眼看全。', 'A crowd still needs a careful eye.', '别让旁人的声势借了胆。', 'Do not borrow courage from a crowd.'),
    idle: pair('看人，比看招难。', 'People are harder to read than moves.', '老夫笑了，你就放心？', 'My smile puts you at ease?'),
  } },
  frost: { voice: 'cool-mage', lines: {
    opening: pair('屋里不冷。是你心急。', 'Not cold here. You are restless.', '把声音放轻，冰会听见。', 'Quiet. The ice can hear you.'),
    hurt: pair('裂纹而已，别急着庆祝。', 'Just a crack. Save the celebration.', '有点疼。还不至于失态。', 'A sting. Hardly worth a scene.'),
    blocked: pair('你碰到的，只有冷气。', 'All you touched was cold air.', '热情够了，准头不够。', 'Warm effort. Poor aim.'),
    pattern: pair('同一滴水，结同一块冰。', 'Same drop. Same patch of ice.', '你的节奏，已经冻住了。', 'Your rhythm has frozen solid.'),
    empty: pair('冰薄了。你敢踩吗？', 'Thin ice. Dare to step?', '冷静和没力气，是两回事。', 'Calm and spent are different things.'),
    ready: pair('你呼出的雾，乱了。', 'Your breath is uneven.', '先别动。或者，你偏要动？', 'Hold still. Or would you rather not?'),
    crowd: pair('人多，空气反倒更冷。', 'A crowd, yet colder air.', '谁先吵，我就先记住谁。', 'The loudest earns my attention.'),
    idle: pair('我不皱眉，你就猜不出了？', 'No frown. No clue?', '这点安静，让你不舒服？', 'Does the quiet bother you?'),
  } },
  shadow_a: { voice: 'shadow-leader', lines: {
    opening: pair('路到这里，得问过我们。', 'This road passes through us.', '别找亮处。我们也看得见。', 'We can see the bright spots too.'),
    hurt: pair('影子散了一点，人还在。', 'Shadow scattered. I am still here.', '这一刀，我记得方向。', 'I remember where that came from.'),
    blocked: pair('打到影子，手感如何？', 'How did hitting a shadow feel?', '你看见的，未必站得住。', 'What you see need not stay put.'),
    pattern: pair('走过的路，别踩得太响。', 'Do not stomp the same path.', '你那套脚步，我记熟了。', 'I know those footsteps now.'),
    empty: pair('影子淡了，不代表散了。', 'Faded is not gone.', '先别追，路未必是直的。', 'Do not chase a crooked road.'),
    ready: pair('抬头看看，光少了一块。', 'Look up. A little light is missing.', '这回，该你找出口了。', 'Your turn to look for an exit.'),
    crowd: pair('老二老三，别抢我的影子。', 'You two, stop treading on my shadow.', '看我们，也别忘了自己身后。', 'Watch us. Mind your back too.'),
    idle: pair('你猜对了，我也不会点头。', 'Guess right. I still will not nod.', '我站得稳，心思不一定。', 'Still feet. Restless thoughts.'),
  } },
  shadow_b: { voice: 'shadow-counter', lines: {
    opening: pair('三个影子。你数清楚没？', 'Three shadows. Counted them?', '别慌，我先算算你能撑多久。', 'Easy. Let me count your chances.'),
    hurt: pair('不对，这一下没算进去。', 'Wait. That was not in the count.', '先别动，我重算一遍。', 'Hold on. Recalculating.'),
    blocked: pair('正好，和我算的一样。', 'Exactly as counted.', '这一笔，你亏了吧？', 'That cost you, did it not?'),
    pattern: pair('一、二……又回原点了。', 'One, two... back to the start.', '这么整齐，我都懒得算了。', 'So regular. No need to count.'),
    empty: pair('账没算完，先别催我。', 'Not finished counting. Wait.', '少了一点，局还没散。', 'A little short. Game is still on.'),
    ready: pair('我这边的数，好看些了。', 'My numbers look better now.', '你心里那笔账，算稳了吗？', 'Sure about your arithmetic?'),
    crowd: pair('别乱站，我刚数好人数！', 'Stay put. I just counted everyone!', '人多是好事，账难算了点。', 'More people. Messier arithmetic.'),
    idle: pair('我在算你。你在算谁？', 'I am counting you. Counting whom?', '手指没动，账已经在心里了。', 'Still fingers. Busy arithmetic.'),
  } },
  shadow_c: { voice: 'shadow-youngest', lines: {
    opening: pair('我最小，但不是来凑数的。', 'Youngest, not a spare seat.', '哥，别挡着我逞威风。', 'Bro, let me look fierce.'),
    hurt: pair('不疼！哥你别过来扶！', 'Fine! Bro, do not help me up!', '这下我自己记，别替我记。', 'I can hold my own grudge.'),
    blocked: pair('哥！你看见我刚那下没？', 'Bro! Did you see that?', '不是碰巧，真不是！', 'Not luck. Really!'),
    pattern: pair('这套连我都会背了。', 'Even I know that routine.', '哥说你会变。怎么还没变？', 'Bro said you would change it up.'),
    empty: pair('我在憋狠话，不是在喘。', 'Thinking of a taunt. Not panting.', '哥别看我，我有分寸。', 'Stop watching, bro. I know limits.'),
    ready: pair('这回可别只盯着我哥。', 'Do not just watch my brothers.', '轮到我长长脸了吧？', 'My turn to look impressive?'),
    crowd: pair('别都挤前面，给我个位置！', 'Leave me some room up front!', '我也算一个，别漏数！', 'I count too. Do not skip me!'),
    idle: pair('哥没教我的，我也会一点。', 'I know things bro never taught me.', '我笑得够吓人了吗？', 'Is this grin scary enough?'),
  } },
  hangman: { voice: 'drowsy-ghost', lines: {
    opening: pair('唔……又有人把我吵醒。', 'Mm... another noisy visitor.', '你打你的，我醒醒神。', 'Go on. I will wake myself up.'),
    hurt: pair('嘶，醒了。这回真醒了。', 'Ow. Awake now. Truly.', '打鬼也这么认真啊。', 'You take ghost-poking seriously.'),
    blocked: pair('穿过去了？别怪我太轻。', 'Passed through? I am rather light.', '扑个空，也值得你瞪眼？', 'Missed. Must you stare?'),
    pattern: pair('这段梦，我好像做过。', 'I have dreamed this bit before.', '你再重复，我又要睡了。', 'Repeat that and I will doze off.'),
    empty: pair('飘不高，不等于飘不动。', 'Low floating is still floating.', '哈欠而已，别多想。', 'Just a yawn. Read nothing into it.'),
    ready: pair('现在睡，好像可惜了。', 'A shame to sleep through this.', '眼皮睁开了，你小心点。', 'Eyes open now. Careful.'),
    crowd: pair('这么热闹，鬼也睡不着。', 'Even ghosts cannot sleep in this.', '挤得我都快落地了。', 'So crowded I might touch ground.'),
    idle: pair('你猜我醒着，还是梦游？', 'Awake, or sleepwalking?', '我叹口气，你别自己吓自己。', 'Just a sigh. Do not spook yourself.'),
  } },
  knight: { voice: 'formal-knight', lines: {
    opening: pair('请。礼数尽了，再谈胜负。', 'After you. Courtesy before contest.', '此地由我守。报不报名随你。', 'I guard this place. Names optional.'),
    hurt: pair('好手段。这一下，我认。', 'Well done. That one was yours.', '铠甲有痕，礼数不能丢。', 'Dented armor. Manners intact.'),
    blocked: pair('承让。再来时请认真些。', 'My thanks. Try with more care.', '你的力道，我领教了。', 'I have felt your strength.'),
    pattern: pair('旧招重来，也该换个心思。', 'Old moves deserve a new thought.', '同一套礼数，用得太勤了。', 'You repeat that courtesy often.'),
    empty: pair('容我换口气，仪态还在。', 'A breath, if you please.', '盔甲重些，脚步还稳。', 'Heavy armor. Steady feet.'),
    ready: pair('阁下，可准备好接着聊了？', 'Shall we continue, then?', '礼让到此。还请站稳。', 'Courtesy served. Stand ready.'),
    crowd: pair('各位，让出交手的地方。', 'Everyone, room for the contest.', '人多也不能乱了规矩。', 'A crowd is no excuse for disorder.'),
    idle: pair('微笑只是礼貌，不是让步。', 'A smile is courtesy, not surrender.', '我等你的选择，未必赞同。', 'I await your choice, not approve it.'),
  } },
  guard_a: { voice: 'clipped-left-guard', lines: {
    opening: pair('停。往前一步，也算。', 'Halt. One step counts.', '左边归我。别试着绕。', 'Left is mine. No detours.'),
    hurt: pair('小伤。岗还在。', 'Small wound. Post still held.', '擦破点皮。站回去。', 'A scrape. Back in line.'),
    blocked: pair('不通过。再想。', 'Denied. Think again.', '到此为止。听清了吗？', 'This far. No farther.'),
    pattern: pair('同一路线。已记住。', 'Same route. Noted.', '绕第二遍，还是这儿。', 'Around again. Still here.'),
    empty: pair('换口气。不换岗。', 'Changing breaths. Not posts.', '站着。别催。', 'Stand. No rushing.'),
    ready: pair('看清边界。别越。', 'See the boundary. Stay back.', '手放稳。眼看这边。', 'Steady hands. Eyes here.'),
    crowd: pair('列队。别挤。', 'Form ranks. No shoving.', '左边留给我。让开。', 'Left is mine. Move aside.'),
    idle: pair('少说。多看。', 'Less talk. More watching.', '我没动，不代表没想。', 'Still. Not thoughtless.'),
  } },
  guard_b: { voice: 'stern-middle-guard', lines: {
    opening: pair('名单上没你。解释一下？', 'Not on the list. Explain?', '规矩摆着，别装看不见。', 'Rules are posted. Do not pretend.'),
    hurt: pair('这一笔，我写进值勤簿。', 'That goes in the duty log.', '弄坏制服，可得另算。', 'Uniform damage is a separate charge.'),
    blocked: pair('手续不全，驳回。', 'Incomplete paperwork. Rejected.', '照章办事，就该这样。', 'By the book. As it should be.'),
    pattern: pair('相同申请，已经退回过了。', 'We rejected that application.', '又是这套说辞？我记着呢。', 'That excuse again? I kept a record.'),
    empty: pair('暂停盘问，不等于放行。', 'Pause in questions. No entry yet.', '容我翻一页，你别趁机走。', 'Turning a page. Stay put.'),
    ready: pair('该问的问完了。你说呢？', 'Questions finished. Your thoughts?', '现在，规矩由你自己掂量。', 'Consider the rules carefully.'),
    crowd: pair('一个一个来，别乱报名字。', 'One at a time. Names in order.', '左右两位，注意执勤形象。', 'You two. Remember the uniform.'),
    idle: pair('你那个表情，我也记下了。', 'That look goes on the record too.', '沉默，我可有好几种解释。', 'I can interpret silence many ways.'),
  } },
  guard_c: { voice: 'weary-right-guard', lines: {
    opening: pair('小声点，塔主刚安静下来。', 'Quiet. The Lord just settled down.', '别闹太久，我还等着换班。', 'Keep it short. My shift is ending.'),
    hurt: pair('嘶……这伤能算工伤吧？', 'Ow... this counts as a work injury?', '下班之前，还来这一出。', 'This, right before clocking out.'),
    blocked: pair('省点事不好吗？非得撞。', 'Could we avoid the paperwork?', '好，少写一份受伤报告。', 'One less injury report.'),
    pattern: pair('又这套？我值班都没你规律。', 'More regular than my shifts.', '背都背下来了，累不累啊？', 'Know it by heart. Tired yet?'),
    empty: pair('让我喘口气，加班够久了。', 'A breath. Enough overtime already.', '我累归累，可没说放人。', 'Tired, yes. Letting you pass, no.'),
    ready: pair('要不，咱们快点聊完？', 'Shall we wrap this chat up?', '精神回来点了。你呢？', 'Feeling awake again. You?'),
    crowd: pair('别全站右边，换班都出不去。', 'Leave room for the shift change.', '人一多，事就不可能少。', 'More people. Always more trouble.'),
    idle: pair('叹气不算认输，别误会。', 'A sigh is not a surrender.', '我看起来好说话，是吧？', 'I look easy to talk past, right?'),
  } },
  bluffer: { voice: 'silver-tongue', lines: {
    opening: pair('我今天句句实话。你先信着。', 'All truth today. Trust me for now.', '我一笑，你是不是就不敢信？', 'A smile, and you doubt me already?'),
    hurt: pair('哎呀。演得像不像真的？', 'Ow. Did that look convincing?', '这一下，算我送你的信心。', 'A little confidence. My gift.'),
    blocked: pair('说了你打不着。碰巧说对了。', 'Told you. Happened to be right.', '你看，偶尔我也很诚实。', 'See? I am honest sometimes.'),
    pattern: pair('你这出戏，台词都没换。', 'Same scene. Same lines.', '套路露出来，可就不好骗了。', 'An obvious script fools nobody.'),
    empty: pair('我可留了一手。信不信由你。', 'I saved a trick. Believe it or not.', '看着没底气？那就对了。', 'Looking spent? Exactly.'),
    ready: pair('放心，我很温柔。大概吧。', 'Relax. I am gentle. Probably.', '我准备好了。也可能没有。', 'Ready. Or perhaps not.'),
    crowd: pair('这么多证人，更得说实话了。', 'Witnesses! Best be truthful, then.', '信谁不好，非信最响的？', 'Must you trust the loudest one?'),
    idle: pair('这回不骗你。下回再说。', 'Truth this time. Next time? Well.', '你猜我在骗你，我猜到了。', 'I guessed you would doubt me.'),
  } },
  lord_bozan: { voice: 'measured-lord', lines: {
    opening: pair('坐到这里，已经值得一杯茶。', 'You have earned a cup of tea.', '同一张桌子。看谁先露怯。', 'One table. Who blinks first?'),
    hurt: pair('不错。茶可以再续一杯。', 'Good. You may have another cup.', '这一手，比你的神情诚实。', 'That move was honest. Your face less so.'),
    blocked: pair('你急了。茶倒还没凉。', 'In a hurry? The tea is still warm.', '先别赶着赢，看看桌上。', 'Before rushing to win, look around.'),
    pattern: pair('旧故事，至少换个结尾。', 'An old tale needs a new ending.', '我听懂了。你还打算照念？', 'I know the script. Still reading it?'),
    empty: pair('空杯，也能让人等一等。', 'An empty cup can make you wait.', '我也得喘气。很意外？', 'I need a breath too. Surprised?'),
    ready: pair('茶续好了。你还从容吗？', 'Tea refilled. Still at ease?', '不妨再想一瞬。随你。', 'Take another moment. Your choice.'),
    crowd: pair('桌上热闹，心里别跟着乱。', 'A busy table need not cloud the mind.', '人再多，眼神总会说话。', 'Many faces. Their eyes still speak.'),
    idle: pair('你猜中了，我也会笑。', 'I smile even when you guess right.', '输赢之外，我想看看你会不会变。', 'I would like to see you adapt.'),
  } },
  tower_soul: { voice: 'tower-chorus', lines: {
    opening: pair('门已关。塔在听。', 'Doors closed. The tower listens.', '走到这里，你也有了回声。', 'You have an echo now.'),
    hurt: pair('石头会裂。回声不会散。', 'Stone cracks. Echoes remain.', '我们听见了，这一道裂响。', 'We heard that crack.'),
    blocked: pair('声音回来，手空着。', 'The sound returns. The hand is empty.', '墙记住了，你没有穿过去。', 'The wall remembers. You did not pass.'),
    pattern: pair('又是这个回声。我们记得。', 'That echo again. We remember.', '旧脚步，在塔里走不远。', 'Old footsteps do not travel far.'),
    empty: pair('寂静，也是一种回声。', 'Silence has an echo too.', '灯暗了。塔还站着。', 'Lights fade. The tower stands.'),
    ready: pair('楼上传来的，是谁的脚步？', 'Whose footsteps sound above?', '石缝里的风，朝你来了。', 'Wind through stone. Toward you.'),
    crowd: pair('几道影子，同一座塔。', 'Many shadows. One tower.', '你们的呼吸，我们都听见。', 'We hear all your breaths.'),
    idle: pair('猜我们，还是猜自己？', 'Reading us, or reading yourself?', '塔没说话。是你心里在响。', 'The tower is quiet. You are not.'),
  } },
};

const fallback: ExpeditionVoice = { voice: 'challenger', lines: {
  opening: pair('坐稳。咱们慢慢看。', 'Settle in. Let us see.', '你先看人，还是先看牌？', 'The player, or the cards first?'),
  hurt: pair('这一下，我记着了。', 'I will remember that.', '疼归疼，还没完呢。', 'It stings. We are not done.'),
  blocked: pair('差了一点，看到没有？', 'Just short. Did you see?', '别急，再想想。', 'No rush. Think again.'),
  pattern: pair('老套路了，不换换？', 'Same routine. Any changes?', '这段，我刚见过。', 'I just saw this bit.'),
  empty: pair('歇口气，你别笑早了。', 'A breath. Do not grin yet.', '没动静，不代表没主意。', 'Quiet does not mean clueless.'),
  ready: pair('这回，你还敢照旧来？', 'Same plan again? Dare you?', '你那点犹豫，我看见了。', 'I saw that hesitation.'),
  crowd: pair('别只看我，旁边也有人。', 'Do not watch only me.', '人一多，心思也多。', 'More people. More schemes.'),
  idle: pair('猜中了，我也不告诉你。', 'Guess right. I will not tell.', '你看我的脸，能看出什么？', 'What do you see in my face?'),
} };

const cardTypes = new Map(SKILL_DB.map(card => [card.id, card.type]));
function repeatsPattern(history: readonly string[]): boolean {
  const recent = history.slice(-3);
  if (recent.length < 3 || recent.some(id => !cardTypes.has(id))) return false;
  return recent.every(id => cardTypes.get(id) === cardTypes.get(recent[0]))
    || (recent[0] === recent[2] && recent[0] !== recent[1]);
}

function cueFor(context: ExpeditionDialogueContext, turn: number): ExpeditionDialogueCue {
  if (turn <= 1) return 'opening';
  if ((context.lastRound?.damageTaken?.[context.enemy.id] ?? 0) > 0 || context.enemy.hp <= .5) return 'hurt';
  if ((context.lastRound?.defendedHits?.[context.enemy.id] ?? 0) > 0) return 'blocked';
  if (context.hero && repeatsPattern(context.history?.[context.hero.id] ?? [])) return 'pattern';
  if (context.enemy.energy <= 0) return 'empty';
  if ((context.aliveCount ?? 2) > 2 && turn % 3 === 0) return 'crowd';
  if (context.enemy.energy >= 3 || (context.hero && !context.hero.isDead && context.hero.energy <= 0)) return 'ready';
  return 'idle';
}

function hash(value: string): number {
  let result = 2166136261;
  for (const char of value) result = Math.imul(result ^ char.charCodeAt(0), 16777619) >>> 0;
  return result;
}

export interface ExpeditionLine { id: string; text: string; voice: string }

/**
 * Speech is flavor, never a hint derived from the current committed action.
 * Stable turn rotation needs no RNG or UI state; translating cannot reroll it.
 */
export function getExpeditionLine(context: ExpeditionDialogueContext, lang: Lang): ExpeditionLine {
  const enemyId = context.enemyId.replace(/^exp_s\d+_/, '');
  const profile = Object.hasOwn(EXPEDITION_DIALOGUE, enemyId) ? EXPEDITION_DIALOGUE[enemyId] : fallback;
  const turn = Number.isFinite(context.turn) ? Math.max(1, Math.floor(context.turn)) : 1;
  const speechTurn = context.speechTurn !== undefined && Number.isFinite(context.speechTurn)
    ? Math.max(1, Math.floor(context.speechTurn)) : turn;
  const cue = cueFor(context, turn);
  const lines = profile.lines[cue];
  const variant = (hash(`${context.seed ?? 0}|${context.stageIdx}|${enemyId}|${cue}`) + speechTurn - 1) % lines.length;
  return { id: `${enemyId}:${cue}:${variant}`, text: lines[variant][lang], voice: profile.voice };
}
