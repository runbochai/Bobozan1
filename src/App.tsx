import BattleArena from './components/BattleArena';
import BattleSkillFlights from './components/BattleSkillFlights';
import { CARD_REVEAL_MS, ULT_CUTIN_MS } from './data/battleTiming';
import BattleFighter from './components/BattleFighter';
import BattleStats from './components/BattleStats';
import TutorialGuide from './components/TutorialGuide';
import { ExpeditionRewards, ExpeditionShop } from './components/ExpeditionChoices';
import { createBot, getBotStyle, playerAvatar as getPlayerAvatar } from './logic/bots';
import { getBattleSeat } from './logic/battleLayout';
import BrawlCover from './components/BrawlCover';
import PixelBackdrop from './components/PixelBackdrop';
import { AVATAR_OPTIONS } from './data/avatars';
import { tutorialEnemyMove } from './logic/expeditionTutorial';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Music,
  Zap,
  Swords,
  Skull,
  Smile,
  X,
  Flame,
  Ghost,
  ArrowUp,
  ArrowDown,
  Target,
  Crown,
  Users,
  Play,
  Copy,
  LogOut,
  Share2,
  Loader,
  ArrowLeft,
  User,
  Edit,
  CheckCircle,
  AlertTriangle,
  Globe,
  Volume2,
  VolumeX,
  Star,
  Layers,
  Undo2,
  HandHeart,
  House,
  Film
} from './components/PixelIcons';
import {
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from 'firebase/auth';
import {
  doc,
  onSnapshot,
} from 'firebase/firestore';
import type { Lang, HandCategory, HandViewMode, Player, GameState } from './types';
import { TEXT } from './data/translations';
import { SKILL_DB } from './data/skills';
import { pickUltCutins, isLevelUltimate, ULT_CUTINS, type UltCutinPick } from './data/ultCutins';
import UltCutin from './components/UltCutin';
import InventoryBar from './components/InventoryBar';
import type { ExpeditionEnemyDef } from './data/expedition';
import { EXPEDITION_STAGES, EXPEDITION_TUTORIALS, EXPEDITION_LESSONS } from './data/expedition';
import { drawGachaCard } from './data/expedition';
import {
  applyIronhide,
  expeditionBotMove,
  genRewardOptions,
  EXPEDITION_MAX_LEVEL,
  genShopItems,
  goldForWin,
  POTION_HEAL,
  loadExpeditionBest,
  saveExpeditionBest,
  type RewardOption,
  type ShopItem,
  intentRevealed,
  intentTaunt,
  passiveBadges,
} from './logic/expedition';
import {
  FINAL_LEVEL,
  APP_ID,
  MAX_HP,
  MAX_PLAYERS,
  MIN_PLAYERS,
} from './data/constants';
import {
  calculateTurnOutcome,
  getCardIcon,
  getPlayerCards,
  isOffensiveCard,
} from './logic/combat';
import { initAudio, playSound } from './audio/sound';
import { auth, db, firebaseConfigured, firebaseInitError } from './firebase';
import { firebaseErrorMessage } from './config/firebaseConfig';
import { useBackgroundMusic } from './audio/useBackgroundMusic';
import { assetUrl, avatarUrl } from './assets';
import { mutateRoom, createUniqueRoom } from './services/rooms';
import { advanceRoom, joinPlayer, leavePlayer, patchPlayer, settleRoom, startRoom, submitPlayerMove } from './logic/room';
import type { User as FirebaseUser } from 'firebase/auth';






// 🔥 Helper: Get current Showdown winners (Returns Array of IDs)




const TopControls = ({
  muted,
  toggleMute,
  lang,
  toggleLang,
  logOpen,
  toggleLog,
  showLogToggle = false,
  musicVolume,
  setMusicVolume,
  onHome,
  onBack,
  reduceMotion,
  toggleReduceMotion,
}: {
  muted: boolean;
  toggleMute: () => void;
  lang: Lang;
  toggleLang: () => void;
  logOpen: boolean;
  toggleLog: () => void;
  showLogToggle?: boolean;
  musicVolume: number;
  setMusicVolume: (v: number) => void;
  onHome?: () => void;
  onBack?: () => void;
  reduceMotion: boolean;
  toggleReduceMotion: () => void;
}) => {
  // Local state for the slider toggle
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  return (
    <div className="pixel-controls absolute top-4 right-4 z-50 flex items-center gap-3">

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          title={lang === 'zh' ? '返回' : 'Back'}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/20"
        >
          <Undo2 size={20} />
        </button>
      )}

      {/* Home Button */}
      {onHome && (
        <button
          onClick={onHome}
          title={lang === 'zh' ? '主页' : 'Home'}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/20"
        >
          <House size={20} />
        </button>
      )}
      
      {/* Music Volume Toggle (Round Button + Pop-out Slider) */}
      <div className="relative flex items-center">
          {/* The Slider Panel (Slides out to the left) */}
          <div className={`
              absolute right-full mr-3 
              bg-slate-900/90 backdrop-blur-xl border border-slate-600 rounded-full 
              flex items-center gap-3 shadow-xl transition-all duration-300 origin-right overflow-hidden
              ${isVolumeOpen ? 'w-48 px-4 py-2 opacity-100' : 'w-0 p-0 opacity-0 pointer-events-none'}
          `}>
              <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">BGM</span>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={musicVolume}
                onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-orange-500 focus:outline-none"
              />
          </div>

          {/* The Round Music Button */}
          <button
            onClick={() => setIsVolumeOpen(!isVolumeOpen)}
            className={`
              p-3 rounded-full text-white transition-all shadow-lg border relative z-10
              ${isVolumeOpen 
                ? 'bg-orange-500 border-orange-400 rotate-12 scale-110' 
                : 'bg-white/10 hover:bg-white/20 border-white/20 backdrop-blur-md'}
            `}
          >
            <Music size={20} />
          </button>
      </div>

      {/* Log Toggle */}
      {showLogToggle && (
        <button
          onClick={toggleLog}
          className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/20"
        >
          {logOpen ? <ArrowLeft size={20} /> : <ArrowLeft size={20} className="rotate-180" />}
        </button>
      )}

      {/* Mute Button */}
      <button
        onClick={toggleMute}
        className={`p-3 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/20 ${muted ? 'bg-red-500/80 hover:bg-red-500' : 'bg-white/10 hover:bg-white/20'}`}
      >
        {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
      </button>

      {/* Reduce Motion Button */}
      <button
        onClick={toggleReduceMotion}
        title={lang === 'zh' ? '减弱动效' : 'Reduce motion'}
        className={`p-3 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/20 ${reduceMotion ? 'bg-cyan-500/80 hover:bg-cyan-500' : 'bg-white/10 hover:bg-white/20'}`}
      >
        <Film size={20} />
      </button>

      {/* Lang Button */}
      <button
        onClick={toggleLang}
        aria-label={lang === 'zh' ? '切换语言' : 'Switch language'}
        className="p-3 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/20 group"
      >
        <div className="flex items-center gap-2">
          <Globe size={20} />
          <span className="font-bold text-sm hidden group-hover:inline-block animate-in slide-in-from-right-2">
            {lang === 'zh' ? 'EN' : '中文'}
          </span>
        </div>
      </button>
    </div>
  );
};

// --- TILT CARD EFFECT ---
const TiltCard = ({ 
  children, 
  onClick, 
  onMouseEnter, 
  onMouseLeave, 
  className,
  style,
  disabled,
  'data-card-type': cardType,
  disableMotion = false,
  glareColor = "#ffffff",
  ...attributes
}: React.HTMLAttributes<HTMLDivElement> & { disabled?: boolean; glareColor?: string; disableMotion?: boolean; 'data-card-type'?: string; 'data-tutorial-target'?: boolean }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || disableMotion || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotateY = ((mouseX / width) - 0.5) * 20; 
    const rotateX = ((mouseY / height) - 0.5) * -20;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: (mouseX / width) * 100, y: (mouseY / height) * 100, opacity: 1 });
  };

  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setRotate({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
    if (onMouseLeave) onMouseLeave(e);
  };

  return (
    <div
      {...attributes}
      ref={cardRef}
      data-card-type={cardType}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.currentTarget.click(); } }}
      onClick={disabled ? undefined : onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onMouseEnter={onMouseEnter}
      className={`${className} transition-transform duration-100 ease-out will-change-transform`}
      style={{
        ...style,
        transform: disableMotion ? style?.transform : `${style?.transform || ''} perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02, 1.02, 1.02)`,
      }}
    >
      {children}
      
      {!disabled && !disableMotion && (
        <div 
          className="absolute inset-0 pointer-events-none z-40 rounded-2xl"
          style={{
            // 🌟 Use the passed color, fading to transparent
            background: `radial-gradient(circle at ${glare.x}% ${glare.y}%, ${glareColor} 0%, transparent 60%)`,
            opacity: glare.opacity,
            mixBlendMode: 'hard-light', // 🌟 hard-light makes colors vibrant on dark backgrounds
            transition: 'opacity 0.2s ease',
          }}
        />
      )}
    </div>
  );
};

// 🃏 GENERATE RANDOM BACKGROUND CARDS (Optimized Visibility)


// --- MAIN COMPONENT ---

export default function BobozanOnline() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [view, setView] = useState<'NAME_INPUT' | 'HOME' | 'LOBBY' | 'GAME'>('NAME_INPUT');
  const [playerName, setPlayerName] = useState('');
  const [lang, setLang] = useState<Lang>('zh'); 
  const [muted, setMuted] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(() => {
    try { return localStorage.getItem('bobozan-reduce-motion') === '1'; } catch { return false; }
  });
  useEffect(() => {
    try { localStorage.setItem('bobozan-reduce-motion', reduceMotion ? '1' : '0'); } catch { /* ignore */ }
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);
  const [submittingMove, setSubmittingMove] = useState(false);

  const [leaderboardMode, setLeaderboardMode] = useState<'MINIMIZED' | 'TOP3' | 'EXPANDED'>('MINIMIZED');

  // Avatar State
  const [playerAvatar, setPlayerAvatar] = useState(assetUrl('avatars/bdrag.png')); // Default to first image
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  
  const renderProfileAvatar = (avatar: string | undefined, size: number = 32) => {
    // Fallback if avatar is missing or empty
    if (!avatar) {
      return <User size={size} className="text-slate-400 drop-shadow-md" />;
    }

    return (
      <img 
        src={avatarUrl(avatar)}
        alt="Avatar" 
        className="rounded-full object-cover [image-rendering:pixelated] shadow-md bg-slate-900 border border-white/10 select-none"
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          minWidth: `${size}px` 
        }} 
      />
    );
  };

  // --- Drag State ---
  const [dragPosition, setDragPosition] = useState({ x: 25, y: 98 }); // Below the controls; the lower-left area belongs to the player HUD.
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Offset of mouse click within the element
  const leaderboardRef = useRef<HTMLDivElement>(null);

  // --- EXPEDITION （单机远征：一命爬塔 + 章节剧情） ---
  const [isExpedition, setIsExpedition] = useState(false);
  const [expStageIdx, setExpStageIdx] = useState(0);
  const [expRelics, setExpRelics] = useState<string[]>([]);
  const [expPhase, setExpPhase] = useState<'battle' | 'reward' | 'shop' | 'runover' | 'clear'>('battle');
  const [expRewards, setExpRewards] = useState<RewardOption[]>([]);
  const [expShop, setExpShop] = useState<ShopItem[]>([]);
  const [expGold, setExpGold] = useState(0);
  const [expTutIdx, setExpTutIdx] = useState(0);
  const expTutIdxRef = useRef(0);
  const expTutorialSkippedRef = useRef(false);
  const [expIntents, setExpIntents] = useState<Record<string, string>>({}); // 敌人ID -> 本回合预定的出牌
  const [goldFly, setGoldFly] = useState<{ amount: number; key: number } | null>(null); // 金币飞入动画
  const [intentDismissed, setIntentDismissed] = useState<Set<string>>(new Set()); // 本回合手动点掉的意图
  const [passiveTip, setPassiveTip] = useState<string | null>(null); // 敌人被动说明：`${enemyId}|${badgeKey}`
  const [expEquipment, setExpEquipment] = useState<string[]>([]);
  const [expGachaCardId, setExpGachaCardId] = useState<string | null>(null);
  const [expBest, setExpBest] = useState<number>(() => loadExpeditionBest());
  // 移动端手牌缩放
  const [isSmallScreen, setIsSmallScreen] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  useEffect(() => {
    const onResize = () => setIsSmallScreen(window.innerWidth < 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  // 远征 run 真值：timeout 回调里读 ref，避免闭包拿到旧 state
  const expRunRef = useRef({ stageIdx: 0, relics: [] as string[], inventory: [0], hp: MAX_HP, maxHp: MAX_HP, tempCards: [] as { cardId: string; usesLeft: number }[], gold: 0, equipment: [] as string[] });
  const expeditionBusyRef = useRef(false);
  const expeditionTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const expPassivesRef = useRef<Record<string, ExpeditionEnemyDef['passive']>>({});
  const expBossEnragedRef = useRef(false);
  const expMaxHpRef = useRef<Record<string, number>>({});
  const expIronShirtUsedRef = useRef(false);
  const expWhetstoneUsedRef = useRef(false);
  const expAdrenalineUsedRef = useRef(false);
const expYpjUsedRef = useRef(false);
  const clearExpeditionTimers = () => {
    expeditionTimersRef.current.forEach(t => clearTimeout(t));
    expeditionTimersRef.current = [];
    expeditionBusyRef.current = false;
  };

  // Local expedition identity must survive delayed Firebase sign-in.
  const expMyId = () => 'exp_me';

  // 回合开始能量：热身腰带（首回合）/ Boss 光环（敌人）
  const applyExpTurnStartEnergy = (players: Player[], firstTurn: boolean): Player[] => {
    const relics = expRunRef.current.relics;
    const myId = expMyId();
    return players.map(p => {
      if (p.isDead) return p;
      let e = p.energy;
      if (p.id === myId) {
        if (firstTurn && relics.includes('rxyd')) e += 2;
      }
      const passive = expPassivesRef.current[p.id];
      let dmgBonus = p.dmgBonus ?? 0;
      if (passive?.energyPerTurn) e += passive.energyPerTurn;
      // Boss 狂暴：hp <= 一半时能量与伤害提升
      if (passive?.enrageEnergy && !p.isDead) {
        const maxHp = expMaxHpRef.current[p.id] ?? p.hp;
        if (p.hp <= maxHp / 2) {
          e += passive.enrageEnergy - (passive.energyPerTurn ?? 0);
          dmgBonus = passive.enrageDmg ?? 0;
          if (!expBossEnragedRef.current) {
            expBossEnragedRef.current = true;
          }
        }
      }
      return { ...p, energy: e, dmgBonus };
    });
  };

  // 敌人意图：回合开始时预计算敌方出牌，展示用；提交时直接沿用，保证所见即所得
  const computeExpIntents = (players: Player[], stageIdx: number) => {
    const stage = EXPEDITION_STAGES[stageIdx];
    const myId = expMyId();
    const intents: Record<string, string> = {};
    for (const pl of players) {
      if (pl.id === myId || pl.isDead) continue;
      const def = stage.enemies.find(en => `exp_${stage.id}_${en.id}` === pl.id);
      const practiceMove = expTutorialSkippedRef.current ? undefined : tutorialEnemyMove(stage.id, expTutIdxRef.current, pl.energy);
      if (practiceMove) {
        intents[pl.id] = practiceMove;
        continue;
      }
      intents[pl.id] = def ? expeditionBotMove(pl, players, def.personality, myId) : 'charge';
    }
    return intents;
  };
  // 意图是否显示：前三关全显示；Boss 完全隐藏，精英 20%，普通怪 45%
  const shouldRevealIntent = (enemyId: string) => {
    const stage = EXPEDITION_STAGES[expRunRef.current.stageIdx];
    const def = stage.enemies.find(en => `exp_${stage.id}_${en.id}` === enemyId);
    const conceal = def?.boss ? 'boss' : def?.elite ? 'elite' : 'normal';
    return intentRevealed(enemyId, gameState.turn, expRunRef.current.stageIdx, conceal);
  };

  const setupExpeditionBattle = (stageIdx: number) => {
    const myId = expMyId();
    const stage = EXPEDITION_STAGES[stageIdx];
    const run = expRunRef.current;
    run.stageIdx = stageIdx;
    expWhetstoneUsedRef.current = false;
    expAdrenalineUsedRef.current = false;
    expYpjUsedRef.current = false;
    expPassivesRef.current = {};
    const enemies: Player[] = stage.enemies.map(en => {
      const id = `exp_${stage.id}_${en.id}`;
      if (en.passive) expPassivesRef.current[id] = en.passive;
      return {
        id,
        name: en.name[lang],
        avatar: `avatars/enemies/${en.id}.webp`,
        isBot: true,
        hp: en.hp,
        energy: en.passive?.startEnergy ?? 0,
        isDead: false,
        inventory: [...en.inventory],
        layer: 0,
        tempLayerMod: 0,
        selectedCardId: null,
        lastCardId: null,
        lastAction: null,
        disabledSkills: [],
        freeSkills: [],
        kills: 0,
        tempSkills: [],
        dmgBonus: en.passive?.attackBonus ?? 0,
        energyDrain: en.passive?.energyDrain ?? 0,
        pierce: en.passive?.pierce ?? false,
      };
    });
    // 装备：幸运骰 —— 每场战斗开局随机抽一张限次卡
    if (run.equipment.includes('luckydice')) {
      const g = drawGachaCard();
      const ex = run.tempCards.find(t => t.cardId === g.cardId);
      if (ex) ex.usesLeft += 1;
      else run.tempCards.push({ cardId: g.cardId, usesLeft: 1 });
    }
    // 装备：摇钱树 —— 每场战斗开始时获得当前金币 10%（至少 1）
    let moneyTreeBonus = 0;
    if (run.equipment.includes('moneytree')) {
      moneyTreeBonus = Math.max(1, Math.floor(run.gold / 10));
      run.gold += moneyTreeBonus;
      setExpGold(run.gold);
    }
    let players: Player[] = [
      {
        id: myId,
        name: playerName || (lang === 'zh' ? '我' : 'Me'),
        avatar: playerAvatar,
        isBot: false,
        hp: run.hp,
        energy: 0,
        isDead: false,
        inventory: [...run.inventory],
        layer: 0,
        tempLayerMod: 0,
        selectedCardId: null,
        lastCardId: null,
        lastAction: null,
        disabledSkills: [],
        freeSkills: [],
        kills: 0,
        // 装备：狂战斧 —— 所有伤害 +1
        dmgBonus: run.equipment.includes('waraxe') ? 0.5 : 0,
        tempSkills: run.tempCards.map(t => t.cardId),
      },
      ...enemies,
    ];
    players = applyExpTurnStartEnergy(players, true);
    expMaxHpRef.current = Object.fromEntries(players.map(pl => [pl.id, pl.id === myId ? run.maxHp : pl.hp]));
    expBossEnragedRef.current = false;
    expTutIdxRef.current = expTutorialSkippedRef.current ? 999 : 0;
    setExpTutIdx(expTutIdxRef.current);
    setExpStageIdx(stageIdx);
    setExpPhase('battle');
    setHandViewMode('CATEGORIES');
    setHandCategory('CHARGE');
    setGameState({
      status: 'PLAYING',
      turn: 1,
      matchCount: stageIdx + 1,
      hostId: myId,
      players,
      logs: [
        { turn: 1, text: `${stage.chapter[lang]} · ${stage.name[lang]}`, type: 'info' },
        ...stage.enemies.map(en => ({ turn: 1, text: en.intro[lang], type: 'info' as const })),
        ...(moneyTreeBonus > 0 ? [{ turn: 1, text: lang === 'zh' ? `🌱 摇钱树摇下 ${moneyTreeBonus} 金币！` : `🌱 Money Tree shook down ${moneyTreeBonus} gold!`, type: 'info' as const }] : []),
      ],
    });
    if (stage.tip && !EXPEDITION_TUTORIALS[stage.id]?.[expTutIdxRef.current]) setToastMsg(stage.tip[lang]);
    setExpIntents(computeExpIntents(players, stageIdx));
    setIntentDismissed(new Set());
  };

  const startExpedition = () => {
    playSound('confirm', muted);
    clearExpeditionTimers();
    expRunRef.current = { stageIdx: 0, relics: [], inventory: [0], hp: MAX_HP, maxHp: MAX_HP, tempCards: [], gold: 0, equipment: [] };
    expIronShirtUsedRef.current = false;
    setExpRelics([]);
    setExpGold(0);
    setExpEquipment([]);
    setExpShop([]);
    expTutorialSkippedRef.current = false;
    setIsExpedition(true);
    setupExpeditionBattle(0);
    setView('GAME');
  };

  const handleExpeditionMove = (cardId: string) => {
    if (!isExpedition || expeditionBusyRef.current || expPhase !== 'battle') return;
    if (gameState.status !== 'PLAYING') return;
    const myId = expMyId();
    const me = gameState.players.find(p => p.id === myId);
    if (!me || me.isDead) return;
    const card = SKILL_DB.find(c => c.id === cardId);
    if (!card) return;
    if (me.energy < card.cost && !me.freeSkills?.includes(cardId)) return;
    if (me.disabledSkills?.includes(cardId)) return;

    const tutSteps = EXPEDITION_TUTORIALS[EXPEDITION_STAGES[expRunRef.current.stageIdx]?.id ?? ''];
    const tutorialStep = tutSteps?.[expTutIdxRef.current];
    if (tutorialStep && tutorialStep.highlight !== cardId) {
      setToastMsg(tutorialStep.text[lang]);
      return;
    }

    expeditionBusyRef.current = true;
    setSubmittingMove(true);
    initAudio();
    playSound('draw', muted);
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredCard(null);
    setTooltipPos(null);

    const stage = EXPEDITION_STAGES[expRunRef.current.stageIdx];
    const myPreInventory = [...me.inventory];
    const playersWithMoves = gameState.players.map(p => {
      if (p.id === myId) return { ...p, selectedCardId: cardId };
      if (p.isDead) return p;
      const move = expIntents[p.id] ?? (() => {
        const def = stage.enemies.find(en => `exp_${stage.id}_${en.id}` === p.id);
        return def ? expeditionBotMove(p, gameState.players, def.personality, myId) : 'charge';
      })();
      return { ...p, selectedCardId: move };
    });
    const preHp = new Map(playersWithMoves.map(p => [p.id, p.hp]));
    const preDead = new Set(playersWithMoves.filter(p => p.isDead).map(p => p.id));
    setGameState(prev => ({ ...prev, players: playersWithMoves, status: 'SHOWDOWN' }));

    // 有人放必杀（等级终极技）→ 延长 SHOWDOWN，给 cut-in 演出留出时间
    const ultPlayed = playersWithMoves.some(p => {
      if (p.isDead || !p.selectedCardId) return false;
      const c = SKILL_DB.find(x => x.id === p.selectedCardId);
      return !!c && isLevelUltimate(c);
    });
    const showdownMs = CARD_REVEAL_MS + (ultPlayed && !reduceMotion ? 4300 : 1600);

    const timer = setTimeout(() => {
      const run = expRunRef.current;
      const relics = run.relics;
      const has = (id: string) => relics.includes(id);
      const result = calculateTurnOutcome(playersWithMoves, gameState.turn, run.stageIdx + 1, lang);
      // 联机胜利会自动发技能（pendingLevel/加 inventory）：远征走自己的奖励系统，这里清掉
      let players: Player[] = result.players.map(p =>
        p.id === myId
          ? { ...p, inventory: p.inventory.filter(l => myPreInventory.includes(l)), pendingLevel: null }
          : p
      );
      let logs = result.logs.filter(l => !(l.type === 'win' && (l.text.includes('获胜') || l.text.includes('WINS'))));
      const meAfter = players.find(p => p.id === myId)!;
      const myPreHp = preHp.get(myId) ?? meAfter.hp;

      // 遗物：铁布衫（每轮远征一次致命免死）
      if (meAfter.isDead && has('tbs') && !expIronShirtUsedRef.current) {
        const enemiesAlive = players.some(p => p.id !== myId && !p.isDead);
        if (enemiesAlive) {
          expIronShirtUsedRef.current = true;
          players = players.map(p => (p.id === myId ? { ...p, isDead: false, hp: 0.5 } : p));
          logs = [...logs, { turn: gameState.turn, text: lang === 'zh' ? '🛡️ 铁布衫救了你一命！' : '🛡️ Iron Shirt saved you!', type: 'info' as const }];
        }
      }
      // 装备：替身人偶 —— 致命伤害保留 1 点血（每轮限一次，用后消失）
      let meAfterDoll = players.find(p => p.id === myId)!;
      if (meAfterDoll.isDead && run.equipment.includes('doll')) {
        const enemiesAlive = players.some(pp => pp.id !== myId && !pp.isDead);
        if (enemiesAlive) {
          run.equipment = run.equipment.filter(id => id !== 'doll');
          setExpEquipment([...run.equipment]);
          players = players.map(pl => (pl.id === myId ? { ...pl, isDead: false, hp: 0.5 } : pl));
          logs = [...logs, { turn: gameState.turn, text: lang === 'zh' ? '🛡️ 替身人偶替你挡下了致命一击！' : '🛡️ Stand-in Doll took the lethal hit!', type: 'info' as const }];
          meAfterDoll = players.find(pp => pp.id === myId)!;
        }
      }
      const meFinal = meAfterDoll;
      // 装备：嗜血剑 —— 每次击杀回复 1 点血量
      if (run.equipment.includes('bloodsword') && !meFinal.isDead) {
        const preKills = playersWithMoves.find(pp => pp.id === myId)?.kills ?? 0;
        const newKills = Math.max(0, (meFinal.kills ?? 0) - preKills);
        if (newKills > 0) {
          const healed = Math.min(newKills * 0.5, run.maxHp - Math.min(run.maxHp, meFinal.hp));
          if (healed > 0) {
            players = players.map(pl => (pl.id === myId ? { ...pl, hp: pl.hp + healed } : pl));
            logs = [...logs, { turn: gameState.turn, text: lang === 'zh' ? `🩸 嗜血剑汲取了 ${healed} 点血量！` : `🩸 Blood Sword drained ${healed} HP!`, type: 'info' as const }];
          }
        }
      }
      const myCard = SKILL_DB.find(c => c.id === meFinal.lastCardId);

      // 遗物：反击拳套 —— 只有真正挡下敌人的攻击才 +1 能量（没人打你时空防不给）
      const enemyAttacked = playersWithMoves.some(pp => pp.id !== myId && !pp.isDead && pp.selectedCardId && isOffensiveCard(SKILL_DB.find(c => c.id === pp.selectedCardId)!));
      if (has('fjqt') && !meFinal.isDead && myCard?.type === 'DEFEND' && enemyAttacked && meFinal.hp >= myPreHp) {
        players = players.map(p => (p.id === myId ? { ...p, energy: p.energy + 1 } : p));
      }
      // 遗物：处决令（有敌人被淘汰的回合 +2 能量）
      if (has('zjling') && !meFinal.isDead) {
        const freshKills = players.filter(p => p.id !== myId && p.isDead && !preDead.has(p.id)).length;
        if (freshKills > 0) players = players.map(p => (p.id === myId ? { ...p, energy: p.energy + 2 } : p));
      }
      // 遗物：磨刀石（每场战斗第一次终极技能 +2 能量）
      if (has('mds') && !expWhetstoneUsedRef.current && !meFinal.isDead && myCard?.type === 'ULTIMATE') {
        expWhetstoneUsedRef.current = true;
        players = players.map(p => (p.id === myId ? { ...p, energy: p.energy + 2 } : p));
      }
      // 遗物：肾上腺素（受伤 +2 能量，每场战斗一次）
      if (has('jsn') && !expAdrenalineUsedRef.current && !meFinal.isDead && meFinal.hp < myPreHp) {
        expAdrenalineUsedRef.current = true;
        players = players.map(p => (p.id === myId ? { ...p, energy: p.energy + 2 } : p));
      }
      // 遗物：硬皮甲（每场战斗第一次受伤 -1）
      if (has('ypj') && !meFinal.isDead) {
        const res = applyIronhide(myPreHp, meFinal.hp, run.maxHp, expYpjUsedRef.current);
        if (res.triggered && !expYpjUsedRef.current) {
          expYpjUsedRef.current = true;
          players = players.map(pl => (pl.id === myId ? { ...pl, hp: res.hp } : pl));
          logs = [...logs, { turn: gameState.turn, text: lang === 'zh' ? '🛡️ 硬皮甲挡下了一点伤害！' : '🛡️ Ironhide blocked some damage!', type: 'info' as const }];
        }
      }
      // Boss 护甲：每回合第一次受到的伤害 -armorPerTurn
      players = players.map(pl => {
        const passive = expPassivesRef.current[pl.id];
        const before = preHp.get(pl.id) ?? pl.hp;
        if (passive?.armorPerTurn && !pl.isDead && pl.hp < before) {
          const blocked = Math.min(passive.armorPerTurn, before - pl.hp);
          const newHp = Math.min(expMaxHpRef.current[pl.id] ?? pl.hp, pl.hp + blocked);
          logs = [...logs, { turn: gameState.turn, text: lang === 'zh' ? `🛡️ ${pl.name}的护甲抵挡了 ${blocked} 点伤害！` : `🛡️ ${pl.name}'s armor blocked ${blocked} damage!`, type: 'info' as const }];
          return { ...pl, hp: newHp };
        }
        return pl;
      });
      // 限次秘技：用一次少一次，用完从手牌移除
      const mePost = players.find(pl => pl.id === myId)!;
      const playedId = mePost.lastCardId ?? cardId;
      const tIdx = run.tempCards.findIndex(t => t.cardId === playedId);
      if (tIdx >= 0) {
        run.tempCards[tIdx].usesLeft -= 1;
        if (run.tempCards[tIdx].usesLeft <= 0) {
          run.tempCards.splice(tIdx, 1);
          players = players.map(pl => (pl.id === myId ? { ...pl, tempSkills: (pl.tempSkills ?? []).filter(id => id !== playedId) } : pl));
        }
      }

      // 下回合开始能量（Boss 光环）
      players = applyExpTurnStartEnergy(players, false);

      const enemiesAlive = players.some(p => p.id !== myId && !p.isDead);
      const meAlive = players.some(p => p.id === myId && !p.isDead);
      const meHp = players.find(p => p.id === myId)?.hp ?? 0;

      let delayedReward = false;
      if (!meAlive) {
        saveExpeditionBest(run.stageIdx);
        setExpBest(loadExpeditionBest());
        setExpPhase('runover');
      } else if (!enemiesAlive) {
        run.hp = Math.min(run.maxHp, meHp + (has('zstai') ? 0.5 : 0));
        let gold = goldForWin(run.stageIdx, EXPEDITION_STAGES[run.stageIdx]);
        if (run.equipment.includes('treasurepot')) gold += 4;
        run.gold += gold;
        setExpGold(run.gold);
        setGoldFly({ amount: gold, key: Date.now() });
        expeditionTimersRef.current.push(setTimeout(() => setGoldFly(null), 1500));
        logs = [...logs, { turn: gameState.turn, text: lang === 'zh' ? `🪙 获得 ${gold} 金币！` : `🪙 Earned ${gold} gold!`, type: 'info' as const }];
        const opts = genRewardOptions(run.hp, run.maxHp, relics, has('cbt') ? 4 : 3, run.inventory);
        logs = [...logs, { turn: gameState.turn, text: lang === 'zh' ? `🎉 通过${EXPEDITION_STAGES[run.stageIdx].name[lang]}！` : `🎉 Cleared ${EXPEDITION_STAGES[run.stageIdx].name[lang]}!`, type: 'win' as const }];
        setExpRewards(opts);
        // 延迟进奖励：先播金币飞入动画，busy 保持锁定防连点
        delayedReward = true;
        expeditionTimersRef.current.push(setTimeout(() => {
          setExpPhase('reward');
          playSound('win', muted);
          setSubmittingMove(false);
          expeditionBusyRef.current = false;
        }, 900));
      } else {
        run.hp = meHp;
      }

      // Advance only after a legal move has resolved; the next intent uses the new step.
      if (tutorialStep?.highlight === cardId) {
        expTutIdxRef.current += 1;
        setExpTutIdx(expTutIdxRef.current);
      }

      setGameState(prev => ({
        ...prev,
        players,
        logs: [...logs, ...prev.logs].slice(0, 300),
        status: 'PLAYING',
        turn: prev.turn + 1,
        resetSeq: result.survivorReset ? (prev.resetSeq ?? 0) + 1 : prev.resetSeq,
      }));
      if (!meAlive || !enemiesAlive) {
        setExpIntents({});
      } else {
        setExpIntents(computeExpIntents(players, run.stageIdx));
      }
      setIntentDismissed(new Set());
      if (!delayedReward) {
        setSubmittingMove(false);
        expeditionBusyRef.current = false;
      }
    }, showdownMs);
    expeditionTimersRef.current.push(timer);
  };

  const claimExpeditionReward = (opt: RewardOption) => {
    playSound('confirm', muted);
    const run = expRunRef.current;
    if (opt.kind === 'heal') {
      run.hp = Math.min(run.maxHp, run.hp + opt.amount);
    } else if (opt.kind === 'maxhp') {
      run.maxHp += 0.5;
      run.hp = Math.min(run.maxHp, run.hp + 0.5);
    } else if (opt.kind === 'temp') {
      const ex = run.tempCards.find(t => t.cardId === opt.cardId);
      if (ex) ex.usesLeft += opt.uses;
      else run.tempCards.push({ cardId: opt.cardId, usesLeft: opt.uses });
      // 抽卡 reveal（仿复仇模式），点关闭后进商城
      setExpGachaCardId(opt.cardId);
      playSound('win', muted);
    } else if (opt.kind === 'relic' && !run.relics.includes(opt.relicId)) {
      run.relics.push(opt.relicId);
      setExpRelics([...run.relics]);
    } else if (opt.kind === 'levelup') {
      if (!run.inventory.includes(opt.level)) run.inventory = [...run.inventory, opt.level];
    }
    enterExpShop();
  };

  /** 进入商城（或通关结算） */
  const enterExpShop = () => {
    const run = expRunRef.current;
    const next = run.stageIdx + 1;
    if (next >= EXPEDITION_STAGES.length) {
      saveExpeditionBest(EXPEDITION_STAGES.length);
      setExpBest(loadExpeditionBest());
      setExpPhase('clear');
    } else {
      setExpShop(genShopItems(run.equipment, Math.max(0, ...run.inventory)));
      setExpPhase('shop');
    }
  };

  /** 商城购买 */
  const buyShopItem = (item: ShopItem, idx: number) => {
    const run = expRunRef.current;
    const price = item.kind === 'tempcard' ? item.price : item.kind === 'equipment' ? item.equipment.price : item.price;
    if (run.gold < price) return;
    run.gold -= price;
    setExpGold(run.gold);
    if (item.kind === 'tempcard') {
      const ex = run.tempCards.find(t => t.cardId === item.cardId);
      if (ex) ex.usesLeft += item.uses;
      else run.tempCards.push({ cardId: item.cardId, usesLeft: item.uses });
      playSound('draw', muted);
    } else if (item.kind === 'potion') {
      run.hp = Math.min(run.maxHp, run.hp + POTION_HEAL);
      playSound('confirm', muted);
    } else {
      if (!run.equipment.includes(item.equipment.id)) {
        run.equipment.push(item.equipment.id);
        setExpEquipment([...run.equipment]);
        // 生命宝石：立即生效
        if (item.equipment.id === 'lifegem') {
          run.maxHp += 1;
          run.hp = Math.min(run.maxHp, run.hp + 1);
        }
        // 升级徽章：永久升 1 级（上限 5 级）
        if (item.equipment.id === 'levelbadge') {
          const curMax = Math.max(0, ...run.inventory);
          if (curMax < EXPEDITION_MAX_LEVEL && !run.inventory.includes(curMax + 1)) {
            run.inventory = [...run.inventory, curMax + 1];
          }
        }
        // 技能护符：随机一张卡变为本轮永久可用
        if (item.equipment.id === 'skillcharm') {
          const g = drawGachaCard();
          const ex = run.tempCards.find(t => t.cardId === g.cardId);
          if (ex) ex.usesLeft = 99;
          else run.tempCards.push({ cardId: g.cardId, usesLeft: 99 });
        }
      }
      playSound('confirm', muted);
    }
    setExpShop(prev => prev.filter((_, i) => i !== idx));
  };

  /** 离开商城，进入下一关 */
  const leaveExpShop = () => {
    playSound('confirm', muted);
    setExpGachaCardId(null);
    setupExpeditionBattle(expRunRef.current.stageIdx + 1);
  };


  // --- Drag Logic ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (!leaderboardRef.current) return;
    
    // Check if the click originated from the expand button, which should be clickable, not draggable
    if ((e.target as HTMLElement).tagName === 'BUTTON') return;
    
    e.preventDefault(); // Prevents image dragging issues
    setIsDragging(true);
    
    const rect = leaderboardRef.current.getBoundingClientRect();
    setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    });
  };

  // --- Global Event Listeners ---
  const [musicVolume, setMusicVolume] = useState(0.15); // Default 15%

  const music = useBackgroundMusic(assetUrl('music/bgm.mp3'), view === 'GAME', muted, musicVolume);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        setDragPosition({
            x: e.clientX - dragOffset.x,
            y: e.clientY - dragOffset.y,
        });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // New State for Hand Categories & View Mode
  const [handCategory, setHandCategory] = useState<HandCategory>('CHARGE');
  const [handViewMode, setHandViewMode] = useState<HandViewMode>('CATEGORIES');
  const [logOpen, setLogOpen] = useState(false); // 战报面板是否展开
  useEffect(() => {
    if (view === 'GAME') {
      setLogOpen(false);
    }
  }, [view]);

  const [damageNumbers, setDamageNumbers] = useState<{[key: string]: number}>({});
  const [showBattleResult, setShowBattleResult] = useState(false);
  const prevPlayersRef = useRef<Player[]>([]);
  const prevShowdownRef = useRef(false);
  

  // 必杀技演出 overlay（SHOWDOWN 时有人放等级终极技则播）
  const [ultCutins, setUltCutins] = useState<(UltCutinPick & { key: number })[]>([]);

  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{x: number, y: number} | null>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  

  const [poppingFree, setPoppingFree] = useState<Record<string, boolean>>({});
  const prevFreeCountsRef = useRef<Record<string, number>>({});

  const prevLogRef = useRef<string | null>(null);

  const [isOnline, setIsOnline] = useState(false);
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [toastMsg, setToastMsg] = useState('');

  // --- 阶段重置过场：有人被淘汰 → 幸存者状态重置时闪一下提示 ---
  const [resetFlash, setResetFlash] = useState(false);
  const lastResetSeqRef = useRef<number | null>(null);
  const resetFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [authError, setAuthError] = useState<unknown>(firebaseInitError);
  const [authLoading, setAuthLoading] = useState(firebaseConfigured);
  const connectionMessage = authError ? firebaseErrorMessage(authError, lang) : authLoading
    ? (lang === 'zh' ? '正在连接联机服务…' : 'Connecting to online play…') : '';

  const [gameState, setGameState] = useState<GameState>({
    status: 'LOBBY',
    turn: 1,
    matchCount: 1,
    players: [],
    logs: [],
    hostId: '',
  });

  // 阶段重置过场：gameState.resetSeq 增加（有人被淘汰、幸存者状态重置）时闪一下提示
  useEffect(() => {
    const seq = gameState.resetSeq ?? 0;
    // 第一次见到该房间的状态只记下计数，不闪（避免中途加入房间时误触发）
    if (lastResetSeqRef.current === null) { lastResetSeqRef.current = seq; return; }
    if (seq > lastResetSeqRef.current) {
      lastResetSeqRef.current = seq;
      if (view === 'GAME') {
        playSound('death', muted);
        setResetFlash(true);
        if (resetFlashTimer.current) clearTimeout(resetFlashTimer.current);
        resetFlashTimer.current = setTimeout(() => setResetFlash(false), 1250);
      }
    }
  }, [gameState.resetSeq, view, muted]);

  const t = TEXT[lang]; 
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);

  const myPlayerId = isExpedition ? expMyId() : user?.uid || 'me';
  const myPlayer = gameState.players.find((p: Player) => p.id === myPlayerId);
  const knownCards = myPlayer ? getPlayerCards(myPlayer, gameState.players) : [];
  const tutorialStageId = isExpedition ? EXPEDITION_STAGES[expStageIdx]?.id ?? '' : '';
  const tutorialSteps = EXPEDITION_TUTORIALS[tutorialStageId];
  const activeTutorialStep = expPhase === 'battle' ? tutorialSteps?.[expTutIdx] : undefined;
  const tutorialCard = SKILL_DB.find(c => c.id === activeTutorialStep?.highlight);
  const tutorialCategory = tutorialCard?.type === 'ABSORB' ? 'SPECIAL' : tutorialCard?.type;
  const completedTutorialLesson = tutorialSteps && expTutIdx === tutorialSteps.length
    ? EXPEDITION_LESSONS[tutorialStageId] : undefined;

  const preloadedCutinsRef = useRef(new Set<string>());
  useEffect(() => {
    if (view !== 'GAME' || reduceMotion) return;
    for (const player of gameState.players) {
      if (player.isDead) continue;
      for (const card of getPlayerCards(player, gameState.players)) {
        const def = ULT_CUTINS[card.id];
        if (!def || preloadedCutinsRef.current.has(def.image)) continue;
        preloadedCutinsRef.current.add(def.image);
        const img = new Image();
        img.onerror = () => preloadedCutinsRef.current.delete(def.image);
        img.src = assetUrl(def.image);
      }
    }
  }, [gameState.players, view, reduceMotion]);

  const [revengeCardId, setRevengeCardId] = useState<string | null>(null);
  const prevMatchCountRef = useRef(gameState.matchCount);

  // 2. Watch for New Match & Temp Skills
  useEffect(() => {
    // Detect if match count increased (New Game Started)
    if (!isExpedition && gameState.matchCount > prevMatchCountRef.current) {
       const me = gameState.players.find(p => p.id === myPlayerId);
       // If I have a temp skill at the start of the round, it's a Revenge Card
       if (me && me.tempSkills && me.tempSkills.length > 0) {
          setRevengeCardId(me.tempSkills[0]); // Show the first one
          playSound('win', muted); // Play a sound!
       }
    }
    // Update ref
    prevMatchCountRef.current = gameState.matchCount;
  }, [gameState.matchCount, gameState.players, myPlayerId, muted, isExpedition]);

  // 3. Animation Style (Spin & Flip)
  const revengeStyle = `
    @keyframes spin-reveal {
      0% { transform: scale(0) rotateY(0deg); opacity: 0; }
      20% { transform: scale(0.8) rotateY(0deg); opacity: 1; }
      /* Spin fast */
      50% { transform: scale(1.1) rotateY(720deg); } 
      /* Slow down and flip to front (ending at 900deg or similar that maps to back face hidden) */
      /* Let's say Back is 0deg, Front is 180deg. We want to end at 180 + 720 = 900 */
      100% { transform: scale(1) rotateY(1080deg); }
    }
    .animate-card-reveal {
      animation: spin-reveal 2.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
      transform-style: preserve-3d;
    }
    .backface-hidden {
      backface-visibility: hidden;
    }
    .rotate-y-180 {
      transform: rotateY(180deg);
    }
  `;

  // Auto-redirect players to GAME view when the game starts
  useEffect(() => {
  // If the game is no longer in LOBBY (meaning it is PLAYING or SHOWDOWN)
  // AND the user is currently looking at the LOBBY screen...
    if (gameState.status !== 'LOBBY' && view === 'LOBBY') {
      setView('GAME');
      
      // Play a sound to alert them the game started
      playSound('confirm', muted); 
    }
  }, [gameState.status, view, muted]);

  useEffect(() => {
    const firebaseAuth = auth;
    if (!firebaseAuth) return;
    let cancelled = false;
    const initAuth = async () => {
      try {
        const token = (globalThis as typeof globalThis & { __initial_auth_token?: string }).__initial_auth_token;
        if (token) {
          await signInWithCustomToken(firebaseAuth, token);
        } else {
          await signInAnonymously(firebaseAuth);
        }
      } catch (err) {
        console.error('Auth failed', err);
        if (!cancelled) setAuthError(err);
      } finally { if (!cancelled) setAuthLoading(false); }
    };
    void initAuth();
    const unsub = onAuthStateChanged(firebaseAuth, (u) => {
      setUser(u);
      if (u) { setAuthError(null); setAuthLoading(false); }
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom && urlRoom.length === 6) setRoomCode(urlRoom);
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  useEffect(() => {
    if (toastMsg) {
      const timer = setTimeout(() => setToastMsg(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMsg]);

  // 必杀技演出：进入 SHOWDOWN 且有人放等级终极技时播 cut-in（可多个同屏一起出现，2.85s 后自动收）
  useEffect(() => {
    if (gameState.status === 'SHOWDOWN' && !reduceMotion) {
      const picks = pickUltCutins(gameState.players, SKILL_DB, lang);
      if (picks.length > 0) {
        setUltCutins([]);
        const reveal = setTimeout(() => setUltCutins(picks.map(pick => ({ ...pick, key: gameState.turn }))), CARD_REVEAL_MS);
        const finish = setTimeout(() => setUltCutins([]), CARD_REVEAL_MS + ULT_CUTIN_MS);
        return () => { clearTimeout(reveal); clearTimeout(finish); };
      }
    }
    setUltCutins([]);
  }, [gameState.status, gameState.turn, gameState.players, lang, reduceMotion]);

  useEffect(() => {
    const settled = prevShowdownRef.current && gameState.status !== 'SHOWDOWN';
    const previous = prevPlayersRef.current;
    prevPlayersRef.current = gameState.players;
    prevShowdownRef.current = gameState.status === 'SHOWDOWN';
    if (!settled) {
      if (gameState.status === 'SHOWDOWN') setDamageNumbers({});
      return;
    }
    const damages: Record<string, number> = {};
    for (const player of gameState.players) {
      const before = previous.find(p => p.id === player.id);
      if (before && player.hp < before.hp) damages[player.id] = before.hp - player.hp;
    }
    setDamageNumbers(damages);
  }, [gameState.players, gameState.status]);

  useEffect(() => {
    if (!Object.keys(damageNumbers).length) return;
    const timer = setTimeout(() => setDamageNumbers({}), 900);
    return () => clearTimeout(timer);
  }, [damageNumbers]);

  useEffect(() => {
    setShowBattleResult(false);
    if (gameState.status !== 'GAMEOVER') return;
    // Let the final impact finish before covering the battlefield.
    const timer = setTimeout(() => setShowBattleResult(true), reduceMotion ? 0 : 700);
    return () => clearTimeout(timer);
  }, [gameState.status, reduceMotion]);

  const [, setPoppingTemp] = useState<Record<string, boolean>>({});
  const prevTempCountsRef = useRef<Record<string, number>>({});
  const myTempSkills = myPlayer?.tempSkills;

  useEffect(() => {
    
    const next: Record<string, number> = {};
    (myTempSkills ?? []).forEach((id) => {
      next[id] = (next[id] ?? 0) + 1;
    });

    const prev = prevTempCountsRef.current;
    const newlyPopping: Record<string, boolean> = {};

    Object.keys(prev).forEach((id) => {
      if ((prev[id] ?? 0) > (next[id] ?? 0)) {
        newlyPopping[id] = true;
      }
    });

    prevTempCountsRef.current = next;

    if (Object.keys(newlyPopping).length > 0) {
      setPoppingTemp((old) => ({ ...old, ...newlyPopping }));
      setTimeout(() => {
        setPoppingTemp((old) => {
          const copy = { ...old };
          Object.keys(newlyPopping).forEach((id) => delete copy[id]);
          return copy;
        });
      }, 180); 
    }
  }, [myTempSkills]);

  const handleMouseEnter = (e: React.MouseEvent, cardId: string) => {
    // 手牌外层包了一层静止的 hover 容器（防闪烁），提示框按内层卡牌定位；摊牌卡没有包装，直接量自身
    const innerCard = e.currentTarget.classList.contains('hand-card')
      ? e.currentTarget
      : e.currentTarget.querySelector('.hand-card');
    const rect = (innerCard ?? e.currentTarget).getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top - 70;

    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => {
      setHoveredCard(cardId);
      setTooltipPos({ x, y });
    }, 600); // 想更快就再调小一点
  };

  const handleMouseLeave = () => {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredCard(null);
    setTooltipPos(null);
  };

  
  const Tooltip = () => {
    if (!hoveredCard || !tooltipPos) return null;
    const card = SKILL_DB.find(c => c.id === hoveredCard);
    if (!card) return null;

    // Check if disabled
    const isDisabled = myPlayer?.disabledSkills?.includes(card.id);

    const typeStr = t.skillType[card.type] || card.type;
    const lvlStr =
      card.levelRequired === 100
        ? t.skillType.COMBO
        : `Lv ${card.levelRequired}`;

    return (
      <div
        className={`
          fixed z-[100] w-64
          rounded-2xl px-4 py-3
          shadow-2xl backdrop-blur
          pointer-events-none
          animate-in fade-in zoom-in duration-200
          border
          ${isDisabled 
            ? 'bg-slate-800/95 border-red-500/50 grayscale'  // Disabled 样式
            : 'bg-slate-900/95 border-slate-700 text-white' // Normal 样式
          }
        `}
        style={{
          left: tooltipPos.x,
          top: tooltipPos.y,
          transform: 'translate(-50%, -110%)',
        }}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isDisabled ? 'bg-slate-700' : 'bg-slate-800'}`}>
            <div className="scale-75">{getCardIcon(card.id)}</div>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
               <div className={`font-bold text-base leading-tight ${isDisabled ? 'text-slate-400 line-through' : ''}`}>
                 {card.name[lang]}
               </div>
               {isDisabled && (
                 <span className="text-red-400 text-xs font-black bg-red-950/50 px-1.5 py-0.5 rounded uppercase">
                   {lang === 'zh' ? '已禁用' : 'DISABLED'}
                 </span>
               )}
            </div>
            <div className={`text-[11px] font-mono mt-0.5 ${isDisabled ? 'text-slate-500' : 'text-yellow-300'}`}>
              {lvlStr} · {typeStr}
            </div>
          </div>
        </div>

        {/* 分割线 */}
        <div className="mt-2 h-px bg-white/10" />

        {/* 描述文案 */}
        <div className={`mt-2 text-xs leading-relaxed ${isDisabled ? 'text-slate-500' : 'text-slate-200'}`}>
          {card.description[lang]}
        </div>

        {/* 小三角 */}
        <div className={`
          absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full
          w-0 h-0
          border-l-[8px] border-l-transparent
          border-r-[8px] border-r-transparent
          border-t-[8px]
          ${isDisabled ? 'border-t-slate-800/95' : 'border-t-slate-900/95'}
        `} />
      </div>
    );
  };

  const copyToClipboard = (text: string, successMessage: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => setToastMsg(successMessage)).catch(() => setToastMsg(t.copyFail));
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setToastMsg(successMessage);
    }
  };

  const resetRoom = useCallback(() => {
    clearExpeditionTimers();
    setIsOnline(false);
    setIsExpedition(false);
    setExpPhase('battle');
    setRoomCode('');
    setSubmittingMove(false);
    setGameState({ status: 'LOBBY', turn: 1, matchCount: 1, players: [], logs: [], hostId: '' });
    setView('HOME');
  }, []);

  const leaveRoom = async () => {
    if (user && isOnline && roomCode) {
      try {
        await mutateRoom(roomCode, room => leavePlayer(room, user.uid));
      } catch (error) {
        console.error('Unable to leave room', error);
        setToastMsg(firebaseErrorMessage(error, lang));
        return;
      }
    }
    resetRoom();
  };

  // 回到最初的名字输入页（先安静离开当前房间）
  const goNameInput = async () => {
    playSound('click', muted);
    if (user && isOnline && roomCode) {
      try {
        await mutateRoom(roomCode, room => leavePlayer(room, user.uid));
      } catch (error) {
        console.error('Unable to leave room', error);
      }
    }
    resetRoom();
    setView('NAME_INPUT');
  };

  // 返回上一页：GAME/LOBBY 先离开房间回 HOME，HOME 回名字页
  const goBackPage = () => {
    playSound('click', muted);
    if (view === 'GAME' || view === 'LOBBY') {
      void leaveRoom();
    } else if (view === 'HOME') {
      setView('NAME_INPUT');
    }
  };

  useEffect(() => {
    if (!isOnline || !roomCode || !user || !db) return;
    return onSnapshot(doc(db, 'rooms', `${APP_ID}_${roomCode.trim().toUpperCase()}`), snapshot => {
      if (!snapshot.exists()) {
        resetRoom();
        setErrorMsg(t.roomNotFound);
        return;
      }
      const data = snapshot.data() as GameState;
      if (!data.players.some(p => p.id === user.uid)) {
        resetRoom();
        return;
      }
      setGameState(data);
      setSubmittingMove(!!data.players.find(p => p.id === user.uid)?.selectedCardId);
      if (data.hostId === user.uid && data.status === 'PLAYING') {
        const active = data.players.filter(p => !p.isDead);
        if (active.length <= 1 || active.every(p => p.isBot || p.selectedCardId)) {
          void mutateRoom(roomCode, room => advanceRoom(room, user.uid)).catch(error => {
            console.error('Unable to advance round', error);
            setToastMsg(firebaseErrorMessage(error, lang));
          });
        }
      }
    }, error => {
      console.error('Room subscription failed', error);
      setToastMsg(firebaseErrorMessage(error, lang));
    });
  }, [isOnline, roomCode, user, resetRoom, t.roomNotFound, lang]);

  useEffect(() => {
    if (!isOnline || gameState.status !== 'SHOWDOWN' || gameState.hostId !== user?.uid) return;
    const round = { turn: gameState.turn, matchCount: gameState.matchCount };
    // 有人放必杀（等级终极技）→ 结算延迟，给 cut-in 演出留出时间（与远征一致）
    const ultPlayed = gameState.players.some(p => {
      if (p.isDead || !p.selectedCardId) return false;
      const c = SKILL_DB.find(x => x.id === p.selectedCardId);
      return !!c && isLevelUltimate(c);
    });
    // Every client gets time to finish; the host's motion preference cannot shorten other clients' casts.
    const settleMs = CARD_REVEAL_MS + (ultPlayed ? 4700 : 2000);
    const timer = setTimeout(() => {
      void mutateRoom(roomCode, room => settleRoom(room, user.uid, round, lang)).catch(error => {
        console.error('Unable to settle round', error);
        setToastMsg(firebaseErrorMessage(error, lang));
      });
    }, settleMs);
    return () => clearTimeout(timer);
  }, [gameState.status, gameState.hostId, gameState.turn, gameState.matchCount, gameState.players, user, roomCode, lang, isOnline]);

  useEffect(() => {
  if (muted || gameState.logs.length === 0) return;

  const lastLog = gameState.logs[0];
  if (!lastLog) return;

  // build a stable key for this log
  const key = `${lastLog.turn}|${lastLog.type}|${lastLog.text}`;

  // only react if this key is different from last time
  if (key === prevLogRef.current) return;
  prevLogRef.current = key;

  if (lastLog.type === 'combat') playSound('combat', muted);
  else if (lastLog.type === 'death') playSound('death', muted);
  else if (lastLog.type === 'win') playSound('win', muted);
}, [gameState.logs, muted]);

  useEffect(() => {
  // 每次进入新回合，把手牌视图重置回“分类”
  setHandViewMode('CATEGORIES');
  setHandCategory('CHARGE'); // 可选：顺便把当前分类重置成攒
}, [gameState.turn]);


  const handleEnterName = () => { if (!playerName.trim()) return; initAudio(); playSound('confirm', muted); setView('HOME'); };

  const createRoom = async () => {
    if (!user || !db) return;
    initAudio();
    playSound('click', muted);
    setLoading(true);
    try {
      const newRoom: GameState = {
        status: 'LOBBY',
        turn: 1,
        matchCount: 1,
        hostId: user.uid,
        logs: [],
        revengeMode: false,
        players: [
          {
            id: user.uid,
            name: playerName || `Player ${user.uid.slice(-4)}`,
            avatar: playerAvatar,
            isBot: false,
            hp: MAX_HP,
            energy: 0,
            isDead: false,
            inventory: [0],
            layer: 0,
            tempLayerMod: 0,
            selectedCardId: null,
            lastCardId: null,
            lastAction: null,
            emoji: null,
            emojiAt: null,
            freeSkills: [],
            pendingLevel: null,
            disabledSkills: [], 
            revengeObtainedAt: null,
            kills: 0,
          },
        ],
      };
      const code = await createUniqueRoom(newRoom);
      setRoomCode(code);
      setIsOnline(true);
      setView('LOBBY');
    } catch (err) {
      console.error(err);
      setErrorMsg(firebaseErrorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    const safeCode = roomCode.trim().toUpperCase();
    if (!user || !/^\d{6}$/.test(safeCode)) { setErrorMsg(t.roomPlaceholder); return; }
    initAudio();
    playSound('click', muted);
    setLoading(true);
    try {
          const newPlayer: Player = {
            id: user.uid,
            name: playerName || `Player ${user.uid.slice(-4)}`,
            avatar: playerAvatar,
            isBot: false,
            hp: MAX_HP,
            energy: 0,
            isDead: false,
            inventory: [0],
            layer: 0,
            tempLayerMod: 0,
            selectedCardId: null,
            lastCardId: null,
            lastAction: null,
            emoji: null,
            emojiAt: null,
            freeSkills: [],
            pendingLevel: null, 
            disabledSkills: [],
            revengeObtainedAt: null,
            kills: 0,
          };
      await mutateRoom(safeCode, room => joinPlayer(room, newPlayer));
      setErrorMsg('');
      setIsOnline(true);
      setView('LOBBY');
    } catch (error) {
      const key = error instanceof Error ? error.message : '';
      setErrorMsg(key === 'roomFull' ? t.roomFull : key === 'gameStarted' ? t.gameStarted : key === 'roomNotFound' ? t.roomNotFound : firebaseErrorMessage(error, lang));
    } finally { setLoading(false); }
  };

  const copyGameInvite = () => { playSound('click', muted); const currentUrl = window.location.href.split('?')[0]; const inviteUrl = `${currentUrl}?room=${roomCode}`; const text = `Bobozan ${t.roomCode}: ${roomCode}\n${inviteUrl}`; copyToClipboard(text, t.inviteCopied); };
  const startGameHost = async () => {
    if (!isOnline || !user) return;
    try {
      await mutateRoom(roomCode, room => startRoom(room, user.uid, lang));
      playSound('confirm', muted);
    } catch (error) {
      setToastMsg(error instanceof Error && error.message === 'needPlayers' ? `${t.needPlayers} (${MIN_PLAYERS}+)` : firebaseErrorMessage(error, lang));
    }
  };

  const addBot = async () => {
    if (!isOnline || gameState.status !== 'LOBBY') return;
    playSound('click', muted);
    if (gameState.players.length >= MAX_PLAYERS) {
      setToastMsg(t.roomFull);
      return;
    }
    const botId = `bot_${crypto.randomUUID()}`;
    if (!user) return;
    try {
      await mutateRoom(roomCode, room => {
        if (room.hostId !== user.uid || room.status !== 'LOBBY') return null;
        return joinPlayer(room, createBot(botId, room.players));
      });
    } catch (error) { setToastMsg(firebaseErrorMessage(error, lang)); }
  };

  const removeBot = async () => {
    if (!isOnline || !user) return;
    try {
      await mutateRoom(roomCode, room => {
        if (room.hostId !== user.uid || room.status !== 'LOBBY') return null;
        const bot = room.players.filter(p => p.isBot).at(-1);
        return bot ? { players: room.players.filter(p => p.id !== bot.id) } : null;
      });
    } catch (error) { setToastMsg(firebaseErrorMessage(error, lang)); }
  };

  const handleDiscardSkill = async (discardLvl: number) => {
    if (!isOnline || !user) return;
    try {
      await mutateRoom(roomCode, room => {
        if (room.status !== 'GAMEOVER') return null;
        return patchPlayer(room, user.uid, p => {
          if (!p.pendingLevel || (discardLvl !== p.pendingLevel && !p.inventory.includes(discardLvl))) return p;
          const inventory = discardLvl === p.pendingLevel ? [...p.inventory]
            : [...new Set([...p.inventory.filter(l => l !== discardLvl), p.pendingLevel])].sort((a, b) => a - b);
          return { ...p, inventory, pendingLevel: null };
        });
      });
      playSound('click', muted);
    } catch (error) { setToastMsg(firebaseErrorMessage(error, lang)); }
  };

  const toggleShare = async () => {
    if (!isOnline || !user) return;
    try {
      await mutateRoom(roomCode, room => patchPlayer(room, user.uid, p =>
        p.inventory.includes(3) || p.inventory.includes(18) ? { ...p, isShared: !p.isShared } : p));
      playSound('click', muted);
    } catch (error) { setToastMsg(firebaseErrorMessage(error, lang)); }
  };

  const movePendingRef = useRef(false);
  const submitMove = async (cardId: string) => {
    if (!isOnline || !user || submittingMove || movePendingRef.current) return;
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredCard(null);
    setTooltipPos(null);
    movePendingRef.current = true;
    setSubmittingMove(true);
    initAudio();
    playSound('draw', muted);
    try {
      await mutateRoom(roomCode, room => submitPlayerMove(room, user.uid, cardId, gameState));
    } catch (error) {
      console.error('Failed to submit move', error);
      setSubmittingMove(false);
      setToastMsg(lang === 'zh' ? '出牌失败，请重试' : 'Move failed, try again');
    } finally { movePendingRef.current = false; }
  };

  const sendEmoji = async (emoji: string) => {
    if (!isOnline || !user) return;
    const emojiAt = Date.now();
    try {
      await mutateRoom(roomCode, room => patchPlayer(room, user.uid, p => ({ ...p, emoji, emojiAt })));
    } catch (error) { setToastMsg(firebaseErrorMessage(error, lang)); }
  };

  const toggleRevengeMode = async () => {
    if (!isOnline || !user) return;
    try {
      await mutateRoom(roomCode, room => room.hostId === user.uid && room.status === 'LOBBY'
        ? { revengeMode: !(room.revengeMode ?? true) } : null);
    } catch (error) { setToastMsg(firebaseErrorMessage(error, lang)); }
  };

  const nextMatchHost = async () => {
    if (!isOnline || !user) return;
    // 1. Play Sound
    playSound('confirm', muted);

    // 2. Define Helper for Bonus Card
    const getRandomBonusCard = () => {
      // Ensure we filter correctly. SKILL_DB must be accessible.
      const pool = SKILL_DB.filter(c => c.cost === 1 && (c.type === 'ATTACK' || c.type === 'SPECIAL'));
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    try {
      const expectedMatch = gameState.matchCount;
      await mutateRoom(roomCode, room => {
        if (room.hostId !== user.uid || room.status !== 'GAMEOVER' || room.matchCount !== expectedMatch) return null;
        if (room.players.some(p => p.pendingLevel)) throw new Error('Please finish choosing reward skills first');
    // 3. Reset Players Logic (with UNDEFINED protection)
    const resetPlayers = room.players.map((p) => {
      const isSurvivor = !p.isDead;
      const newLoseStreak = isSurvivor ? 0 : (p.loseStreak || 0) + 1;

      const newTempSkills: string[] = [];
      
      const newRevengeTime = null; // 准备时间戳变量

      const isRevengeOn = room.revengeMode ?? true; // 默认为开

      if (isRevengeOn && newLoseStreak >= 5) {
         const bonus = getRandomBonusCard();
         if (bonus) newTempSkills.push(bonus.id);
      }

      return {
        ...p,
        hp: MAX_HP,
        energy: 0,
        isDead: false,
        layer: 0,
        tempLayerMod: 0,
        selectedCardId: null,
        lastCardId: null,
        lastAction: null,
        emoji: null,
        emojiAt: null,
        
        // ✅ PREVENT UNDEFINED: Always provide a default value
        freeSkills: [],      
        disabledSkills: [],  
        isShared: p.isShared ?? false, // If undefined, set to false
        
        loseStreak: newLoseStreak,
        tempSkills: newTempSkills, // Always an array (empty or populated)
        pendingLevel: null,
        revengeObtainedAt: newRevengeTime,
      };
    });

    // 4. Update Firestore
      const logText = lang === 'zh'
        ? `--- 第 ${room.matchCount + 1} 局 ---`
        : `--- MATCH ${room.matchCount + 1} ---`;

      return {
        status: 'PLAYING',
        matchCount: room.matchCount + 1,
        turn: 1,
        players: resetPlayers,
        logs: [
          { turn: 1, text: logText, type: 'info' },
          ...room.logs,
        ].slice(0, 300) as GameState['logs'],
      };
      });
    } catch (err) {
      console.error("Error starting next match:", err);
      setToastMsg(lang === 'zh' ? '请先完成奖励技能选择；如仍失败，请检查网络后重试' : 'Finish choosing reward skills, then retry. Check your connection if the problem persists.');
    }
  };

  // Find player who just got revenge card (within last 5 seconds)
  const recentRevengePlayer = gameState.players.find(p =>
    p.revengeObtainedAt && Date.now() - p.revengeObtainedAt < 5000
  );

  const toggleLang = () => { playSound('click', muted); setLang(prev => prev === 'zh' ? 'en' : 'zh'); }
  const toggleMute = () => { setMuted(!muted); }
  const toggleReduceMotion = () => { playSound('click', muted); setReduceMotion(v => !v); }

  const myFreeSkills = myPlayer?.freeSkills;
  useEffect(() => {
    // build current counts of free skills
    const next: Record<string, number> = {};
    (myFreeSkills ?? []).forEach((id) => {
      next[id] = (next[id] ?? 0) + 1;
    });

    const prev = prevFreeCountsRef.current;
    const newlyPopping: Record<string, boolean> = {};

    // if count decreased -> trigger pop
    Object.keys(prev).forEach((id) => {
      const prevCount = prev[id] ?? 0;
      const nextCount = next[id] ?? 0;
      if (prevCount > nextCount) {
        newlyPopping[id] = true;
      }
    });

    // update ref for next round
    prevFreeCountsRef.current = next;

    if (Object.keys(newlyPopping).length > 0) {
      // turn on pop for these ids
      setPoppingFree((old) => ({ ...old, ...newlyPopping }));

      // turn back off after a short time
      setTimeout(() => {
        setPoppingFree((old) => {
          const copy = { ...old };
          Object.keys(newlyPopping).forEach((id) => {
            delete copy[id];
          });
          return copy;
        });
      }, 180); // 0.18s-ish “spring” pop
    }
  }, [myFreeSkills]);

  const selectCategory = (cat: HandCategory) => {
    playSound('card_flip', muted);
    setHandCategory(cat);
    setHandViewMode('CARDS');
  };

  const goBackToCategories = () => {
    playSound('click', muted);
    setHandViewMode('CATEGORIES');
  };

  // Navigation only: players still choose the actual card to commit their move.
  const locateTutorialCard = () => {
    if (!tutorialCategory || submittingMove) return;
    if (tutorialCategory === 'CHARGE') goBackToCategories();
    else selectCategory(tutorialCategory);
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>('[data-tutorial-target="true"]');
      target?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'instant' });
      target?.focus({ preventScroll: true });
    });
  };

  // --- LAYOUT HELPERS ---
  const getPlayerPosition = (index: number, total: number, viewer: number) => getBattleSeat(index, total, viewer, isSmallScreen);

  // --- HAND RENDER HELPERS ---
  const filteredHand = knownCards.filter(c => {
    if (handCategory === 'SPECIAL') return c.type === 'SPECIAL' || c.type === 'ABSORB';
    return c.type === handCategory;
  });

  const baseUltIds = new Set(['ka', 'ji', 'kajifen', 'kajisuper']);

  const orderedHand =
    handCategory === 'ATTACK'
      ? [...filteredHand].sort((a, b) => {
          const aAdv = a.levelRequired > 0;
          const bAdv = b.levelRequired > 0;

          // advanced (lvl>0) first
          if (aAdv !== bAdv) return aAdv ? -1 : 1;

          // force hong (basic Blast) more to the right
          if (a.id === 'hong' && b.id !== 'hong') return 1;
          if (b.id === 'hong' && a.id !== 'hong') return -1;

          // fallback ordering
          if (a.levelRequired !== b.levelRequired)
            return a.levelRequired - b.levelRequired;
          return a.cost - b.cost;
        })
      : handCategory === 'ULTIMATE'
      ? [...filteredHand].sort((a, b) => {
          const aAdv = a.levelRequired > 0;
          const bAdv = b.levelRequired > 0;

          // advanced (lvl>0) ultimates first
          if (aAdv !== bAdv) return aAdv ? -1 : 1;

          const aBase = baseUltIds.has(a.id);
          const bBase = baseUltIds.has(b.id);

          // push base ults (Ka / Ji / 咔叽粉 / 超粉) to the right
          if (aBase !== bBase) return aBase ? 1 : -1;

          // fallback ordering
          if (a.levelRequired !== b.levelRequired)
            return a.levelRequired - b.levelRequired;
          return a.cost - b.cost;
        })
      : filteredHand;

  // 兜底：手牌重渲染把悬停卡片的 DOM 换掉时，可能收不到 mouseleave，
  // 悬停的卡若已不在手牌里，直接清除提示状态，避免提示框永久卡住
  useEffect(() => {
    if (hoveredCard && !orderedHand.some(c => c.id === hoveredCard)) {
      if (hoverTimer.current) clearTimeout(hoverTimer.current);
      setHoveredCard(null);
      setTooltipPos(null);
    }
  }, [orderedHand, hoveredCard]);

  const getCategoryIcon = (cat: HandCategory) => {
    switch (cat) {
      case 'CHARGE':
        // same style as charge skill card
        return (
          <Zap
            size={48}
            className="text-yellow-400 fill-yellow-400/20"
          />
        );

      case 'ATTACK':
        // default attack style (like swords / bombs)
        return (
          <Swords
            size={48}
            className="text-red-400"
          />
        );

      case 'DEFEND':
        return (
          <Shield
            size={48}
            className="text-blue-400 fill-blue-400/20"
          />
        );

      case 'ULTIMATE':
        return (
          <Skull
            size={48}
            className="text-purple-400"
          />
        );

      case 'SPECIAL':
        return (
          <Star
            size={48}
            className="text-emerald-400"
          />
        );
    }
  };



  const categories: HandCategory[] = ['CHARGE', 'ATTACK', 'DEFEND', 'ULTIMATE', 'SPECIAL'];

  // --- RENDER LOGIC ---

  if (view === 'NAME_INPUT') return (
    <div className="pixel-app pixel-screen-title brawl-title-screen min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      
      <PixelBackdrop scene="title" />

      <TopControls 
        muted={muted} 
        toggleMute={toggleMute} 
        lang={lang} 
        toggleLang={toggleLang} 
        logOpen={logOpen} 
        toggleLog={() => setLogOpen(o => !o)} 
        showLogToggle={false} 
        musicVolume={musicVolume}
        setMusicVolume={setMusicVolume}
        reduceMotion={reduceMotion}
        toggleReduceMotion={toggleReduceMotion}
      />

      {/* ================= CONTENT ================= */}
      <div className="pixel-title-content relative z-10 flex flex-col items-center w-full max-w-2xl px-4">
        
        <header className="pixel-title-header brawl-title-header">
          <BrawlCover />
          <div className="brawl-logo">
            <div className="pixel-kicker">{lang === 'zh' ? '全员就位 · 随时开打' : 'EVERYONE IN. ANYTHING GOES.'}</div>
            <h1 className="pixel-wordmark">{t.title}</h1>
            <p className="pixel-tagline">{lang === 'zh' ? '攒出绝招，打个痛快！' : 'CHARGE IT UP. LET IT RIP!'}</p>
          </div>
          <span className="brawl-edition">PIXEL<br/>BRAWL!</span>
        </header>

        {/* --- INPUT AREA --- */}
        <div className="pixel-panel pixel-start-panel brawl-start-panel w-full flex flex-col items-center gap-5">
            <div className="pixel-player-setup flex items-center gap-5 w-full">
               <div className="relative z-50 flex flex-col items-center gap-2">
            <button
              onClick={() => { playSound('click', muted); setIsAvatarMenuOpen(!isAvatarMenuOpen); }}
              className={`
                w-28 h-28 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(234,88,12,0.3)] 
                transition-all duration-300 relative border-4 border-white/10 overflow-hidden group
                ${playerName.trim() ? 'bg-gradient-to-br from-orange-500 to-red-600 scale-110 ring-4 ring-orange-400/50' : 'bg-slate-800/80 ring-2 ring-slate-700'}
                hover:scale-110 hover:shadow-[0_0_40px_rgba(234,88,12,0.6)]
              `}
            >
              {/* 1. Show Selected Avatar using the helper */}
              {renderProfileAvatar(playerAvatar, 112)} 

              {/* 2. Edit Pencil Badge */}
              <div className="absolute bottom-2 right-2 bg-slate-900 rounded-full p-2 border border-slate-600 text-white shadow-lg z-20">
                <Edit size={14} />
              </div>
            </button>

            {/* 3. Text Hint */}
            <span className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase animate-pulse">
              {lang === 'zh' ? '点击更换' : 'TAP TO CHANGE'}
            </span>

            {/* --- POPUP MENU --- */}
            {isAvatarMenuOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 max-w-[calc(100vw-24px)] max-h-[50vh] overflow-y-auto bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl grid grid-cols-4 gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 z-[100]">
                {AVATAR_OPTIONS.map(({ path, name }) => (
                  <button
                    key={path}
                    onClick={() => {
                      playSound('confirm', muted);
                      setPlayerAvatar(path);
                      setIsAvatarMenuOpen(false);
                    }}
                    className={`
                      aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-110
                      ${avatarUrl(playerAvatar) === assetUrl(path) ? 'border-orange-500 ring-2 ring-orange-500/50' : 'border-slate-600 hover:border-white'}
                    `}
                  >
                    <img src={assetUrl(path)} className="w-full h-full object-cover [image-rendering:pixelated]" alt={name[lang]} title={name[lang]} />
                  </button>
                ))}
                
                {/* Option to Reset to Default */}
                <button
                  onClick={() => {
                      playSound('confirm', muted);
                      setPlayerAvatar(''); // Empty string = Default User Icon
                      setIsAvatarMenuOpen(false);
                  }}
                  className="aspect-square rounded-xl bg-slate-800 border-2 border-slate-600 hover:border-white flex items-center justify-center"
                >
                  <User size={24} className="text-slate-400" />
                </button>
              </div>
            )}
          </div>
               <div className="relative w-full max-w-xs group">
                  <input 
                    type="text" 
                    placeholder={t.enterName} 
                    className="w-full bg-transparent border-b-4 border-slate-700 py-3 text-center text-3xl font-black text-white placeholder:text-slate-700 placeholder:font-bold focus:border-orange-500 focus:outline-none transition-colors duration-300 uppercase tracking-wider"
                    value={playerName} 
                    onChange={(e) => setPlayerName(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleEnterName()} 
                    maxLength={10}
                    autoFocus
                  />
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_20px_rgba(249,115,22,0.8)] scale-x-0 group-focus-within:scale-x-100 transition-transform duration-500 origin-center" />
               </div>
            </div>
            <div className="flex gap-4 w-full max-w-md justify-center">
              <button
                onClick={startExpedition}
                className="btn-expedition group relative flex-1 overflow-hidden p-4"
              >
                <div className="relative w-full flex items-center justify-center gap-2">
                  <Swords size={24} />
                  <span className="text-2xl font-black text-white uppercase tracking-wider drop-shadow-md">{lang === 'zh' ? '远征模式' : 'Expedition'}</span>
                </div>
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
              </button>
              <button
                onClick={handleEnterName}
                disabled={!playerName.trim()}
                className="btn-primary group relative flex-1 overflow-hidden p-4"
              >
                <div className="relative w-full flex items-center justify-center gap-2">
                  <Users size={24} />
                  <span className="text-2xl font-black text-white uppercase tracking-wider drop-shadow-md">{lang === 'zh' ? '多人游戏' : 'Multiplayer'}</span>
                </div>
                <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
              </button>
            </div>
            {expBest > 0 && (
              <div className="mt-2 text-xs text-amber-300/80 font-bold tracking-widest">
                {lang === 'zh' ? `🏆 历史最佳：第 ${expBest} 关` : `🏆 Best: Stage ${expBest}`}
              </div>
            )}


        </div>
      </div>
    </div>
  );

  if (view === 'HOME') return (
    <div className="pixel-app pixel-screen-home min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      
      <PixelBackdrop scene="home" />

      {/* ================= MAIN CONTENT ================= */}
      
      <TopControls muted={muted} toggleMute={toggleMute} lang={lang} toggleLang={toggleLang} logOpen={logOpen} toggleLog={() => setLogOpen(o => !o)} musicVolume={musicVolume} setMusicVolume={setMusicVolume} reduceMotion={reduceMotion} toggleReduceMotion={toggleReduceMotion} onHome={goNameInput} onBack={goBackPage}/>
      
      {toastMsg && (
        <div className="pixel-toast fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 font-bold tracking-wide animate-in slide-in-from-top-4">
          <CheckCircle size={20} /> {toastMsg}
        </div>
      )}

      {/* UI Container */}
      <div className="pixel-home-content w-full max-w-lg relative z-10">
        
        {/* 🎨 CHANGED: Glow Behind Box (Orange) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="pixel-panel relative backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-8 md:p-10 flex flex-col gap-8 animate-in fade-in zoom-in duration-300">
            
            <header className="pixel-section-heading"><span className="pixel-kicker">MULTIPLAYER</span><h1>{lang === 'zh' ? '冒险者公会' : 'Adventurers Guild'}</h1><p>{lang === 'zh' ? '创建房间，或输入伙伴的房间码。' : 'Create a room or join your party.'}</p></header>
            {/* User Profile */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative group">
                  {/* 🎨 CHANGED: Profile Circle Gradient (Orange -> Red) */}
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-xl shadow-orange-500/30 overflow-hidden">
                    {playerAvatar ? (
                      <img src={avatarUrl(playerAvatar)} className="w-full h-full object-cover" alt="Me" />
                    ) : (
                      <User size={48} className="text-white drop-shadow-md" />
                    )}
                  </div>
                  <button onClick={() => setView('NAME_INPUT')} className="absolute bottom-0 right-0 bg-slate-800 text-slate-300 p-2 rounded-full border border-slate-600 hover:bg-white hover:text-slate-900 transition-all shadow-lg hover:scale-110" title="Edit Name">
                    <Edit size={14} />
                  </button>
              </div>
              <div className="text-center">
                  <div className="text-3xl font-black text-white tracking-tight mb-1">{playerName}</div>
              </div>
            </div>

            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Actions */}
            <div className="space-y-6">
              {/* 🎨 CHANGED: Create Button (Orange/Red Theme) */}
              <button onClick={createRoom} disabled={loading || !user || !firebaseConfigured} className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-orange-500/25 disabled:opacity-50 disabled:pointer-events-none">
                  <div className="absolute inset-0 bg-white/20 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12 origin-left" />
                  <div className="relative bg-slate-900/60 h-full rounded-2xl p-5 flex items-center justify-center gap-4 backdrop-blur-sm group-hover:bg-transparent transition-colors">
                    {loading ? <Loader className="animate-spin text-white" /> : <div className="p-3 bg-white/10 rounded-xl group-hover:bg-white/20 transition-colors"><Users size={28} className="text-orange-100" /></div>}
                    <div className="flex flex-col items-start">
                        <span className="text-xl font-black text-white tracking-wide">{t.createRoom}</span>
                        <span className="text-[10px] text-orange-200 group-hover:text-white/80 font-medium uppercase tracking-wider">Create a Lobby</span>
                    </div>
                  </div>
              </button>

              <div className="flex gap-3">
                  <div className="relative flex-1 group">
                    {/* 🎨 CHANGED: Input Focus Color (Orange) */}
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Target className="text-slate-500 group-focus-within:text-orange-400 transition-colors" size={20} /></div>
                    <input type="text" placeholder="Join a Lobby" maxLength={6} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-800/50 border border-slate-600 focus:border-orange-500 focus:bg-slate-800/80 text-center font-mono text-xl font-bold tracking-[0.3em] uppercase outline-none transition-all placeholder:text-slate-600 placeholder:tracking-normal text-white"
                      value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                    />
                  </div>
                  {/* 🎨 CHANGED: Join Button Hover (Orange) */}
                  <button onClick={joinRoom} disabled={loading || !user || !firebaseConfigured || roomCode.length < 6} className="aspect-square h-auto bg-slate-700 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center group">
                    {loading ? <Loader className="animate-spin" size={24} /> : <ArrowUp className="rotate-90 group-hover:translate-x-1 transition-transform" size={28} />}
                  </button>
              </div>
              
              {(connectionMessage || errorMsg) && (
                <div className="flex items-center gap-3 text-red-300 text-xs font-bold bg-red-950/40 p-3 rounded-xl border border-red-900/50 animate-in slide-in-from-top-2">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    {connectionMessage || errorMsg}
                </div>
              )}
            </div>
        </div>
      </div>
    </div>
  );


  if (view === 'LOBBY') return (
    <div className="pixel-app pixel-screen-lobby min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      
      <PixelBackdrop scene="lobby" />

      {/* ================= LOBBY CONTENT ================= */}
      
      <TopControls muted={muted} toggleMute={toggleMute} lang={lang} toggleLang={toggleLang} logOpen={logOpen} toggleLog={() => setLogOpen(o => !o)} showLogToggle={false} musicVolume={musicVolume} setMusicVolume={setMusicVolume} reduceMotion={reduceMotion} toggleReduceMotion={toggleReduceMotion} onHome={goNameInput} onBack={goBackPage}/>
      
      {toastMsg && (
        <div className="pixel-toast fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-in slide-in-from-top-4 font-bold tracking-wide">
          <CheckCircle size={20} /> {toastMsg}
        </div>
      )}

      {/* Main Lobby Container */}
      <div className="pixel-panel pixel-lobby-panel w-full max-w-5xl backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-orange-500/20 relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 z-10">
        
        {/* Header Section */}
        <div className="px-8 pt-8 pb-2 md:px-10 md:pt-10 md:pb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
            <div className="pixel-lobby-sign"><span className="pixel-kicker">PARTY CAMP</span><h1>{lang === 'zh' ? '出发前的营地' : 'Gather your party'}</h1></div>
            {/* Left: Back & Room Info */}
            <div className="flex flex-col gap-6 md:gap-6 w-full md:w-auto">
              
                <button 
                  onClick={() => leaveRoom()} 
                  className="group flex items-center gap-2 text-slate-500 hover:text-orange-400 transition-colors text-xs font-black uppercase tracking-widest w-fit"
                >
                  <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                  {t.exit}
                </button>

                <div>
                    <div className="text-orange-500/60 text-xs font-black uppercase tracking-[0.2em] mb-1 ml-1">{t.roomCode}</div>
                    <div onClick={() => copyToClipboard(roomCode, t.codeCopied)} className="text-5xl md:text-7xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-br from-white to-orange-200 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-4">
                      {roomCode} <Copy size={28} className="text-orange-500/50" />
                    </div>
                </div>
            </div>

            {/* Right: Room Actions */}
            <div className="flex flex-col items-end gap-3">
                
                {/* 🎨 CHANGED: Invite Button to Orange */}
                <button onClick={copyGameInvite} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg hover:shadow-orange-500/25 active:scale-95">
                    <Share2 size={18} /> {t.invite}
                </button>
            </div>
        </div>

        {/* Body Section */}
        <div className="p-8 md:p-10 space-y-8">
            
            {/* Settings Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-800/50 rounded-2xl border border-white/5">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${gameState.revengeMode ? 'bg-red-500/20 text-red-400' : 'bg-slate-700/50 text-slate-500'}`}>
                      <Flame size={24} fill={gameState.revengeMode ? "currentColor" : "none"} />
                  </div>
                  <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {lang === 'zh' ? '复仇模式' : 'REVENGE MODE'}
                        {gameState.revengeMode && <span className="text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded">ON</span>}
                      </div>
                      <div className="text-xs text-slate-500">{lang === 'zh' ? '连败者获得随机强力卡牌' : 'Losers get bonus cards'}</div>
                  </div>
                </div>

                {gameState.hostId === user?.uid && (
                  <button onClick={toggleRevengeMode} className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${gameState.revengeMode ? 'bg-red-500 text-white border-red-400' : 'bg-slate-700 text-slate-400 border-slate-600 hover:bg-slate-600'}`}>
                      {gameState.revengeMode ? 'ENABLED' : 'DISABLED'}
                  </button>
                )}
            </div>

            {/* Player Grid */}
            <div className="pixel-lobby-players grid grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Players */}
                {gameState.players.map((p, i) => (
                  <div key={i} className="relative group">
                      {/* 🎨 CHANGED: Hover Glow to Orange */}
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center gap-4 shadow-sm group-hover:border-orange-500/50 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center relative shadow-md">
                            {/* Avatar Helper */}
                            {renderProfileAvatar(getPlayerAvatar(p), 48)}
                            
                            {p.id === gameState.hostId && (
                              <div className="absolute -top-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-700 z-10">
                                  <Crown size={14} className="text-yellow-400 fill-yellow-400" />
                              </div>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-bold text-slate-200 truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">{p.isBot ? `BOT · ${getBotStyle(p.id).name[lang]}` : 'PLAYER'}</div>
                          </div>
                      </div>
                  </div>
                ))}
                
                {/* Empty Slots */}
                {Array.from({ length: Math.max(0, MAX_PLAYERS - gameState.players.length) }).map((_, i) => (
                  <div 
                    key={`empty_${i}`} 
                    // 👇 Added 'h-20' here to match the 80px height of player cards
                    className="h-20 border-2 border-dashed border-slate-700/50 p-4 rounded-2xl flex items-center justify-center gap-2 text-slate-600"
                  >
                      <div className="w-2 h-2 rounded-full bg-slate-700 animate-pulse" />
                      <span className="text-sm font-medium">{t.waitingJoin}</span>
                  </div>
                ))}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4 border-t border-white/5">
                
                {/* Host Controls */}
                {gameState.hostId === user?.uid && (
                  <div className="flex items-center gap-3">
                    <button onClick={removeBot} className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 hover:bg-red-900/30 hover:border-red-500/50 hover:text-red-400 flex items-center justify-center transition-all">
                        <Users size={18} className="mr-[-4px]" /><span className="text-xs font-black ml-1">-</span>
                    </button>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">BOTS</div>
                    <button onClick={addBot} className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 hover:bg-emerald-900/30 hover:border-emerald-500/50 hover:text-emerald-400 flex items-center justify-center transition-all">
                        <Users size={18} className="mr-[-4px]" /><span className="text-xs font-black ml-1">+</span>
                    </button>
                  </div>
                )}

                {/* Start / Status */}
                <div className="flex-1 flex justify-end">
                  {gameState.players.length > 0 && gameState.hostId === user?.uid ? (
                      /* 🎨 CHANGED: Start Button to Red/Orange Gradient */
                      <button onClick={startGameHost} className="w-full md:w-auto bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white px-12 py-4 rounded-2xl font-black text-xl shadow-xl shadow-orange-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-3">
                        <Play fill="currentColor" /> {t.startGame}
                      </button>
                  ) : (
                      <div className="flex items-center gap-3 text-slate-500 bg-slate-800/50 px-6 py-3 rounded-xl border border-white/5">
                        <Loader className="animate-spin" size={20} />
                        <span className="font-bold tracking-wide">{t.waitingHost}</span>
                      </div>
                  )}
                </div>

            </div>

        </div>
        
        {/* Rejoin Button */}
        {gameState.status !== 'LOBBY' && (
          <button onClick={() => setView('GAME')} className="absolute bottom-6 right-6 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg z-50 flex items-center gap-2">
            <Play size={16} fill="currentColor" /> {t.backGame}
          </button>
        )}
      </div>
    </div>
  );

  // GAME VIEW - MAIN RENDER
  const myIndex = gameState.players.findIndex(p => p.id === myPlayerId);
  const totalPlayers = gameState.players.length;
  
  // 计算当前局获胜者 & 获得的技能
  const livingPlayers = gameState.players.filter((p) => !p.isDead);
  const winnerPlayer =
    gameState.status === 'GAMEOVER' && livingPlayers.length === 1
      ? livingPlayers[0]
      : null;

  
  const castDelay = CARD_REVEAL_MS + (!reduceMotion && gameState.players.some(p => {
    const card = SKILL_DB.find(c => c.id === p.selectedCardId);
    return !p.isDead && !!card && isLevelUltimate(card);
  }) ? ULT_CUTIN_MS : 0);

  // --- EMOJI ANIMATION STYLE ---
  // 包含：弹出(Pop In) -> 悬浮(Float) -> 消失(Pop Out)
  const emojiStyle = `
    @keyframes emoji-lifecycle {
      0% {
        opacity: 0;
        transform: scale(0) translateY(20px); /* 从下方缩放弹出 */
      }
      10% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      /* 中间悬浮阶段 */
      30% { transform: scale(1) translateY(-5px); }
      50% { transform: scale(1) translateY(0); }
      70% { transform: scale(1) translateY(-5px); }
      90% {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
      /* 退出阶段 */
      100% {
        opacity: 0;
        transform: scale(0.5) translateY(-20px); /* 向上飘走消失 */
      }
    }
    
    .animate-emoji-lifecycle {
      /* 2秒播完，forwards让它停在最后的状态(透明)，等待React移除 */
      animation: emoji-lifecycle 2s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
  `;

  return (
    <div className={`pixel-app pixel-screen-battle ${!isExpedition ? 'pixel-screen-multiplayer' : ''} min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex justify-center items-start font-sans selection:bg-orange-500/30`}>

      {/* 1. BACKGROUND LAYERS & STYLES */}
      <style>{`
        @keyframes liquid-flow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes zero-gravity { 0% { margin-top: 0px; margin-left: 0px; } 100% { margin-top: 20px; margin-left: 10px; } }
        
        /* Card Effects */
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spin-slow { animation: spin-slow 10s linear infinite; }
        @keyframes flip-slow { 0% { transform: perspective(600px) rotateY(0deg); } 50% { transform: perspective(600px) rotateY(180deg); } 100% { transform: perspective(600px) rotateY(360deg); } } .flip-slow { animation: flip-slow 6s ease-in-out infinite; transform-style: preserve-3d; }
        .shine-slow { position: relative; overflow: hidden; } .shine-slow::after { content: ''; position: absolute; top: 0; left: -150%; width: 100%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%); transform: skewX(-20deg); animation: shine-move 4s infinite; }
        @keyframes shine-move { 0% { left: -150%; } 20% { left: 150%; } 100% { left: 150%; } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.1); filter: brightness(1); } 50% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.6); filter: brightness(1.3); border-color: rgba(255, 255, 255, 0.8); } } .glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
        
        /* Game Specific Animations */
        ${emojiStyle}
        /* REVENGE CARD SPIN ANIMATION */
        @keyframes spin-reveal { 0% { transform: scale(0) rotateY(0deg); opacity: 0; } 20% { transform: scale(0.8) rotateY(0deg); opacity: 1; } 50% { transform: scale(1.1) rotateY(720deg); } 100% { transform: scale(1) rotateY(1080deg); } }
        .animate-card-reveal { animation: spin-reveal 2.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        
        @keyframes text-shine { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        .animate-text-shine { background-size: 200% auto; animation: text-shine 3s linear infinite; }

        /* Static highlight: never animate the card's transform or opacity. */
        .tutorial-highlight {
          outline: 3px solid #fde047;
          outline-offset: 3px;
          border-color: #fde047;
          box-shadow: 0 0 18px rgba(250, 204, 21, 0.45);
        }
          
      `}</style>

      <PixelBackdrop scene="battle" />

      <TopControls 
       muted={muted} 
       toggleMute={toggleMute} 
       lang={lang} 
       toggleLang={toggleLang} 
       logOpen={logOpen} 
       toggleLog={() => setLogOpen(o => !o)}
       showLogToggle={true}
       musicVolume={musicVolume}
      setMusicVolume={setMusicVolume}
      reduceMotion={reduceMotion}
      toggleReduceMotion={toggleReduceMotion}
      onHome={goNameInput}
      onBack={goBackPage}
    />

      <Tooltip />

      {/* 🔹 Side Buttons (Emoji & Share) */}
      <div className="hidden md:flex fixed bottom-80 right-20 z-50 flex-col gap-3 items-center">
        
        {/* 1. SHARE BUTTON (Only visible if you have Lv3 or Lv18) */}
        {myPlayer && (myPlayer.inventory.includes(3) || myPlayer.inventory.includes(18)) && (
          <div className="relative group">
             <button
               onClick={toggleShare}
               className={`
                 w-16 h-16 rounded-full flex items-center justify-center border-2 shadow-xl transition-all duration-300 ease-out
                 ${myPlayer.isShared 
                   ? 'bg-emerald-600 border-emerald-400 text-white shadow-[0_0_25px_rgba(16,185,129,0.6)] scale-110' 
                   : 'bg-slate-800/80 border-slate-600 text-slate-400 hover:border-emerald-500 hover:text-emerald-400'
                 }
               `}
             >
               <HandHeart size={28} className={myPlayer.isShared ? 'animate-pulse' : ''} />
               
               {/* Status Indicator Dot */}
               <div className={`absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-slate-900 transition-colors ${myPlayer.isShared ? 'bg-green-500' : 'bg-slate-600'}`} />
             </button>

             {/* Label / Tooltip */}
             <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-black/80 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/10">
               {myPlayer.isShared 
                 ? (lang === 'zh' ? '正在借出防御' : 'Sharing Defense') 
                 : (lang === 'zh' ? '借出防御技能' : 'Share Defense')}
             </div>
          </div>
        )}

        {/* 2. EMOJI BUTTON (Existing Logic) */}
        <div className="relative">
          {emojiMenuOpen && (
            <div className="
              absolute bottom-4 right-20 w-80
              bg-slate-900/90 border border-slate-700/50
              rounded-2xl p-5 shadow-2xl shadow-black/80
              backdrop-blur-xl
              animate-in fade-in slide-in-from-right-2 zoom-in-95 duration-200
              origin-bottom-right
            ">
              {/* Arrow */}
              <div className="absolute bottom-8 -right-1.5 w-3 h-3 bg-slate-900 border-t border-r border-slate-700/50 rotate-45" />
              
              {/* Header */}
              <div className="flex justify-between items-center mb-4 px-1">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reactions</span>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-4 gap-3">
                {['👍','👎','😂','😢','😡','🤔','😎','👻','❤️','🔥','😱','👋'].map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => {
                      playSound('click', muted);
                      sendEmoji(emoji);
                      setEmojiMenuOpen(false);
                    }}
                    className="aspect-square rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-blue-500/30 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] flex items-center justify-center text-3xl transition-all duration-200 hover:scale-110 active:scale-95"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isExpedition && (
          <button
            onClick={() => {
               playSound('click', muted);
               setEmojiMenuOpen(o => !o);
            }}
            className={`
              group relative w-16 h-16 rounded-full flex items-center justify-center border transition-all duration-300 ease-out backdrop-blur-md shadow-lg
              ${emojiMenuOpen 
                ? 'bg-blue-600 border-blue-400 text-white rotate-90 shadow-[0_0_25px_rgba(37,99,235,0.6)]' 
                : 'bg-slate-900/60 border-slate-500/50 text-slate-300 hover:bg-slate-800 hover:text-blue-400 hover:border-blue-500/50 hover:scale-105'
              }
            `}
          >
            <div className="absolute inset-0 flex items-center justify-center transition-transform duration-300">
              {emojiMenuOpen ? <X size={28} /> : <Smile size={28} />}
            </div>
          </button>
          )}
        </div>

      </div>

      {toastMsg && <div className="pixel-toast fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 font-medium animate-in slide-in-from-top-4"><CheckCircle size={18} /> {toastMsg}</div>}

      {/* LEFT LOGS (PC) */}
      <div
        className={`
          hidden md:flex
          fixed top-0 left-0
          h-screen w-72
          bg-slate-900 border-r border-slate-800
          flex-col max-h-screen z-40
          transform transition-transform duration-300
          ${logOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
          <div
            className="flex items-center gap-2 cursor-pointer hover:text-red-400 transition-colors"
            onClick={() => leaveRoom()}
          >
            <LogOut size={18} /> <span className="font-bold">{t.exit}</span>
          </div>
          <span className="text-xs bg-indigo-500 px-2 py-1 rounded-full font-bold">
            {t.match} {gameState.matchCount}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-slate-900/50">
          {gameState.logs.map((log, i) => (
            <div
              key={i}
              className={`
                text-xs p-2 rounded border-l-2
                ${
                  log.type === 'combat'
                    ? 'border-red-500 bg-red-900/10 text-red-200'
                    : log.type === 'win'
                    ? 'border-yellow-500 bg-yellow-900/10 text-yellow-200 font-bold'
                    : 'border-blue-500 text-slate-300'
                }
              `}
            >
              <span className="opacity-40 mr-2">T{log.turn}</span>
              {log.text}
            </div>
          ))}
        </div>
      </div>

      {/* CENTER ARENA */}
      <div className="pixel-battle-layout flex-1 flex flex-col relative h-screen z-10">

        {/* --- EXPEDITION HUD（左上：章节关卡 + 遗物） --- */}
        {isExpedition && expPhase === 'battle' && (
          <div className="pixel-exp-hud absolute top-3 left-3 z-50 pointer-events-none">
            <div className="bg-slate-900/70 backdrop-blur-xl border border-white/15 rounded-xl px-3 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="text-sm font-bold text-amber-300">
                {EXPEDITION_STAGES[expStageIdx].chapter[lang]} · {EXPEDITION_STAGES[expStageIdx].name[lang]}
              </div>
              <div className="text-xs font-bold text-slate-400 tracking-widest">
                {lang === 'zh' ? `第 ${gameState.turn} 回合` : `TURN ${gameState.turn}`}
              </div>
            </div>
          </div>
        )}

        {/* Visual rewards and supplies; native dialogs keep focus in the active step. */}
        {isExpedition && expPhase === 'reward' && (
          <ExpeditionRewards rewards={expRewards} lang={lang}
            lesson={completedTutorialLesson ? expStageIdx + 1 : undefined} onChoose={claimExpeditionReward} />
        )}
        {isExpedition && expPhase === 'shop' && !expGachaCardId && (
          <ExpeditionShop items={expShop} gold={expGold} lang={lang} onBuy={buyShopItem} onContinue={leaveExpShop} />
        )}

        {/* --- EXPEDITION GACHA REVEAL（抽卡展示，仿复仇模式） --- */}
        {isExpedition && expGachaCardId && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => { playSound('click', muted); setExpGachaCardId(null); }}
          >
            <style>{revengeStyle}</style>
            <div className="relative w-full max-w-md md:max-w-lg mx-4 flex flex-col items-center gap-8 animate-in fade-in duration-500">
              <div className="text-center space-y-2 z-10 animate-pulse">
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 italic tracking-widest uppercase drop-shadow-lg">
                  {lang === 'zh' ? '抽卡时刻' : 'GACHA TIME'}
                </h2>
                <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">
                  {lang === 'zh' ? '获得限次秘技' : 'Limited Skill Acquired'}
                </p>
              </div>
              <div className="relative w-64 h-96 animate-card-reveal">
                <div className="absolute inset-0 w-full h-full rounded-2xl bg-slate-800 border-4 border-slate-600 shadow-2xl flex items-center justify-center backface-hidden">
                  <div className="absolute inset-2 border-2 border-dashed border-slate-600/50 rounded-xl" />
                  <div className="text-8xl font-black text-slate-700 select-none">?</div>
                </div>
                {(() => {
                  const card = SKILL_DB.find(c => c.id === expGachaCardId);
                  if (!card) return null;
                  let bgGradient = 'bg-slate-800';
                  let borderClass = 'border-slate-600';
                  if (card.type === 'ATTACK') { bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900'; borderClass = 'border-red-500'; }
                  if (card.type === 'DEFEND') { bgGradient = 'bg-gradient-to-b from-blue-900 to-slate-900'; borderClass = 'border-blue-500'; }
                  if (card.type === 'ULTIMATE') { bgGradient = 'bg-gradient-to-b from-purple-900 to-slate-900'; borderClass = 'border-purple-500'; }
                  if (card.type === 'SPECIAL') { bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900'; borderClass = 'border-emerald-500'; }
                  return (
                    <div className={`absolute inset-0 w-full h-full rounded-2xl border-4 ${borderClass} shadow-[0_0_50px_rgba(34,211,238,0.5)] flex flex-col items-center justify-center bg-[#1a1a1a] overflow-hidden`}>
                      <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-cyan-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg animate-bounce z-20 whitespace-nowrap">
                        {lang === 'zh' ? '限次可用' : 'LIMITED USE'}
                      </div>
                      <div className="relative z-10 flex flex-col items-center gap-4">
                        <div className="text-lg font-mono text-yellow-500">Lv.{card.levelRequired}</div>
                        <div className="scale-[2.0] drop-shadow-xl">{getCardIcon(card.id)}</div>
                      </div>
                      <div className="absolute bottom-0 w-full bg-black/80 p-4 text-center border-t border-white/10 z-10">
                        <div className="text-xl font-bold text-white mb-1">{card.name[lang]}</div>
                        <div className="text-xs text-slate-400 leading-tight">{card.description[lang]}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="text-slate-500 text-xs animate-pulse mt-8">
                {lang === 'zh' ? '点击任意处继续' : 'Click anywhere to continue'}
              </div>
            </div>
          </div>
        )}

        {/* --- EXPEDITION RUN OVER（远征结束） --- */}
        {isExpedition && expPhase === 'runover' && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="pixel-dialog bg-slate-900/80 backdrop-blur-xl border border-white/15 rounded-2xl p-8 w-full max-w-md text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="text-5xl mb-3">💀</div>
              <h2 className="text-2xl font-black text-white mb-2">{lang === 'zh' ? '远征结束' : 'Expedition Over'}</h2>
              <p className="text-slate-400 text-sm mb-1">
                {lang === 'zh' ? `倒在${EXPEDITION_STAGES[expStageIdx].name[lang]}` : `Fell at ${EXPEDITION_STAGES[expStageIdx].name[lang]}`}
              </p>
              <p className="text-amber-300/90 text-sm mb-6">
                {lang === 'zh' ? `历史最佳：第 ${expBest} 关` : `Best: Stage ${expBest}`}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={startExpedition} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-bold text-white hover:scale-105 active:scale-95 transition-all">
                  {lang === 'zh' ? '再来一轮' : 'Retry'}
                </button>
                <button onClick={() => leaveRoom()} className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-600 font-bold text-slate-300 hover:text-white hover:scale-105 active:scale-95 transition-all">
                  {lang === 'zh' ? '返回主页' : 'Home'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- EXPEDITION CLEAR（通关） --- */}
        {isExpedition && expPhase === 'clear' && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-slate-900/80 backdrop-blur-xl border border-amber-400/30 rounded-2xl p-8 w-full max-w-md text-center shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
              <div className="text-5xl mb-3">🏆</div>
              <h2 className="text-2xl font-black text-amber-300 mb-2">{lang === 'zh' ? '登顶成功！' : 'Tower Conquered!'}</h2>
              <p className="text-slate-400 text-sm mb-6">
                {lang === 'zh' ? '你击败了塔主波赞，成为了新的传说。' : 'You defeated Lord Bozan and became a legend.'}
              </p>
              <div className="flex gap-3 justify-center">
                <button onClick={startExpedition} className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-red-600 font-bold text-white hover:scale-105 active:scale-95 transition-all">
                  {lang === 'zh' ? '再来一轮' : 'Retry'}
                </button>
                <button onClick={() => leaveRoom()} className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-600 font-bold text-slate-300 hover:text-white hover:scale-105 active:scale-95 transition-all">
                  {lang === 'zh' ? '返回主页' : 'Home'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="pixel-mobile-header md:hidden p-3 flex justify-between items-center bg-slate-900 border-b border-slate-800 z-50">
          <button onClick={() => leaveRoom()} className="flex items-center gap-1 text-slate-400"><LogOut size={18} /></button>
          <span className="font-mono font-bold text-yellow-500">{isExpedition ? `${lang === 'zh' ? '远征' : 'Expedition'} ${expStageIdx + 1}/${EXPEDITION_STAGES.length}` : roomCode}</span>
          <span className="text-xs bg-indigo-500 px-2 py-1 rounded">M{gameState.matchCount}</span>
        </div>

        {/* ROUND TABLE LAYER */}
        <div data-player-count={totalPlayers} className={`pixel-battle-board ${totalPlayers > 4 ? 'battle-board-crowded' : ''} relative flex-1 w-full overflow-hidden bg-transparent`}>
           
           {/* Background Table Outline */}
           <BattleArena turn={gameState.turn} showdown={gameState.status === 'SHOWDOWN'} lang={lang} />

           {/* Player positions also drive card origins and facing directions. */}
           {gameState.players.map((p, i) => {
             const pos = getPlayerPosition(i, totalPlayers, myIndex);
             const isMe = p.id === myPlayerId;
             const pMaxLvl = Math.max(0, ...p.inventory);
             const highestLevel = Math.max(0, ...gameState.players.flatMap(player => player.inventory));
             const intent = <>
                    {isExpedition && !isMe && !p.isDead && expPhase === 'battle' && gameState.status === 'PLAYING' && expIntents[p.id] && (() => {
                      const revealed = shouldRevealIntent(p.id);
                      const card = SKILL_DB.find(c => c.id === expIntents[p.id]);
                      const taunt = intentTaunt(card?.type, revealed, p.id, gameState.turn, expRunRef.current.stageIdx, lang, !!expPassivesRef.current[p.id]?.deceiver);
                      const badges = passiveBadges(expPassivesRef.current[p.id], lang);
                      const dismissed = intentDismissed.has(p.id);
                      const toRight = pos.x < 50; // 气泡朝场地中央，避开角色
                      return (
                        <div className={`pixel-intent absolute top-1/2 -translate-y-1/2 z-40 w-max ${toRight ? 'left-full ml-3' : 'right-full mr-3'} ${dismissed ? 'opacity-25' : ''}`}>
                          <div className="flex flex-col gap-1 items-start">
                            <button
                              onClick={() => { playSound('click', muted); setIntentDismissed(prev => new Set(prev).add(p.id)); }}
                              className="relative bg-amber-50 text-slate-900 text-2xl font-bold rounded-2xl px-4 py-2.5 w-max max-w-[16rem] text-left shadow-lg hover:scale-105 active:scale-95 transition-transform leading-snug"
                            >
                              {taunt}
                              {expStageIdx < 3 && revealed && card && <span className="block text-xs mt-1 text-amber-800">{lang === 'zh' ? '本回合：' : 'This turn: '}{card.name[lang]}</span>}
                              <span className={`battle-intent-tail absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-amber-50 rotate-45 ${toRight ? '-left-2' : '-right-2'}`} />
                            </button>
                            {badges.length > 0 && (
                              <div className="relative flex gap-1">
                                {badges.map(b => {
                                  const tipKey = `${p.id}|${b.key}`;
                                  return (
                                    <span
                                      key={b.key}
                                      onMouseEnter={() => setPassiveTip(tipKey)}
                                      onMouseLeave={() => setPassiveTip(null)}
                                      onClick={(e) => { e.stopPropagation(); playSound('click', muted); setPassiveTip(cur => cur === tipKey ? null : tipKey); }}
                                      className="text-sm leading-none cursor-help hover:scale-125 transition-transform"
                                    >
                                      {b.icon}
                                    </span>
                                  );
                                })}
                                {badges.filter(b => `${p.id}|${b.key}` === passiveTip).map(b => (
                                  <div key={`tip-${b.key}`} className="absolute top-full mt-1 left-0 z-50 w-44 bg-slate-900/95 border border-white/20 rounded-xl p-2.5 text-left shadow-2xl pointer-events-none">
                                    <div className="text-xs font-black text-white mb-0.5">{b.icon} {b.title}</div>
                                    <div className="text-[11px] text-slate-300 leading-snug">{b.desc}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })()}
             </>;
             return <BattleFighter key={p.id} player={p} seat={pos} self={isMe}
               maxHp={isExpedition ? (expMaxHpRef.current[p.id] ?? MAX_HP) : MAX_HP}
               level={pMaxLvl} levelName={SKILL_DB.find(card => card.levelRequired === pMaxLvl)?.name[lang] ?? ''}
               leader={pMaxLvl > 0 && pMaxLvl === highestLevel} turn={gameState.turn}
               showdown={gameState.status === 'SHOWDOWN'} lang={lang} castDelay={castDelay}
               damage={damageNumbers[p.id]} hit={!!damageNumbers[p.id]} reduceMotion={reduceMotion} intent={intent} />;
           })}

           {gameState.status === 'SHOWDOWN' && !reduceMotion && <BattleSkillFlights key={'skills-' + gameState.matchCount + '-' + gameState.turn} players={gameState.players} delay={castDelay} />}

           {/* 必杀技演出 overlay：左侧闪入巨型立绘 + 压暗 + 喊话 + 像素特效 */}
           {ultCutins.map((u, i) => (
             <UltCutin
               key={`ultcutin-${u.key}-${i}`}
               def={u.def}
               playerName={u.playerName}
               skillName={u.skillName}
               level={u.level}
               lang={lang}
               muted={muted}
               index={i}
               total={ultCutins.length}
             />
           ))}

           {(music.status === 'blocked' || music.status === 'error') && (
             <button type="button" onClick={music.retry}
               className="fixed top-20 right-4 z-[100] rounded-xl bg-slate-900/95 border border-amber-500/60 px-4 py-2 text-sm text-amber-200">
               {music.status === 'blocked'
                 ? (lang === 'zh' ? '点击播放背景音乐' : 'Play background music')
                 : (lang === 'zh' ? '音乐加载失败，点击重试' : 'Music failed to load. Retry')}
             </button>
           )}

           {/* GAME OVER OVERLAY */}
           {gameState.status === 'GAMEOVER' && winnerPlayer && showBattleResult && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500 overflow-hidden">
               <div className="relative w-full max-w-md md:max-w-lg mx-4 animate-in zoom-in-95 duration-300 z-10">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-b from-yellow-500/20 via-purple-500/10 to-transparent blur-3xl rounded-full pointer-events-none" />
                  <div className="relative bg-slate-900/95 border border-slate-700/50 p-6 md:p-10 rounded-[2rem] shadow-2xl flex flex-col items-center gap-6 overflow-hidden">
                     <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-50" />

                     {/* 1. TITLE & WINNER CALCULATION */}
                     {(() => {
                        // Check if this is the Grand Finale
                        const isFinal = gameState.matchCount >= FINAL_LEVEL;
                        
                        // If final, winner is player with most kills. Else, it's the round survivor.
                        const displayWinner = isFinal 
                          ? gameState.players.reduce((prev, curr) => 
                              ((curr.kills || 0) > (prev.kills || 0) ? curr : prev), 
                            gameState.players[0]) 
                          : winnerPlayer;

                        return (
                          <>
                             <div className="text-center space-y-1 z-10">
                                 <h2 className="text-4xl md:text-6xl font-black italic tracking-wider text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-sm">
                                   {isFinal 
                                      ? (lang === 'zh' ? '最终冠军!' : 'GRAND CHAMPION!') 
                                      : (lang === 'zh' ? '本局获胜!' : 'VICTORY!')}
                                 </h2>
                                 <div className="flex items-center justify-center gap-2 text-yellow-500/80 font-bold text-base tracking-[0.2em] uppercase">
                                   <Crown size={18} />
                                   <span>{isFinal ? (lang === 'zh' ? '击杀王' : 'KILL LEADER') : (lang === 'zh' ? '胜者' : 'WINNER')}</span>
                                   <Crown size={18} />
                                 </div>
                             </div>

                             <div className="flex flex-col items-center gap-5 w-full">
                                
                                {/* 🟢 UPDATED: Bigger Avatar (w-32) + Full Circle Fill */}
                                <div className="relative group">
                                   <div className="absolute inset-0 bg-yellow-400 blur-xl opacity-40 animate-pulse rounded-full" />
                                   
                                   <div className="relative w-32 h-32 bg-slate-800 rounded-full border-4 border-yellow-400 flex items-center justify-center shadow-lg z-10 overflow-hidden">
                                      {getPlayerAvatar(displayWinner) ? (
                                          <img 
                                            src={avatarUrl(getPlayerAvatar(displayWinner)!)}
                                            alt={displayWinner.name} 
                                            className="w-full h-full object-cover" 
                                          />
                                      ) : (
                                          <User size={64} className="text-yellow-100" />
                                      )}
                                   </div>
                                   
                                   <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-500 text-black text-xs font-black px-4 py-1 rounded-full whitespace-nowrap z-20 shadow-md transform scale-100">
                                      {displayWinner.name}
                                   </div>
                                </div>
                                
                                {/* Reward Section (Kill Count or Card) */}
                                {isFinal ? (
                                   // Final Level: Show Kills
                                   <div className="text-2xl font-black text-white flex items-center gap-2">
                                      <Skull size={24} className="text-red-500" />
                                      {displayWinner.kills || 0} {lang === 'zh' ? '击杀' : 'KILLS'}
                                   </div>
                                ) : (
                                   // Normal Level: Show Unlocked Card
                                   <div className="mt-2 flex flex-col items-center gap-3 w-full animate-in slide-in-from-bottom-4 duration-700">
                                      <div className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
                                         {lang === 'zh' ? '获得奖励' : 'REWARD'}
                                      </div>

                                      {(() => {
                                         const unlockedSkill = SKILL_DB.find(c => c.levelRequired === gameState.matchCount);
                                         if (!unlockedSkill) return <div className="text-slate-500 text-sm italic bg-black/20 px-6 py-3 rounded-xl border border-white/5">{lang === 'zh' ? '无新技能解锁' : 'No Skill Unlocked'}</div>;
                                         return (
                                            <div className="relative group perspective-500">
                                               <div className="absolute inset-0 bg-yellow-400/30 blur-2xl rounded-2xl scale-95 group-hover:scale-110 transition-transform duration-500" />
                                               <div className="
                                                  relative w-40 h-60 bg-slate-900 rounded-xl border-[3px] border-yellow-400/60
                                                  flex flex-col items-center p-3 shadow-2xl
                                                  transform transition-transform duration-300 hover:scale-105 hover:rotate-1
                                               ">
                                                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-[10px] font-black px-2 py-0.5 rounded shadow-lg animate-bounce z-30">NEW!</div>
                                                  <div className="absolute inset-0 bg-gradient-to-b from-slate-800 to-black rounded-lg opacity-80" />
                                                  <div className="relative z-10 flex flex-col items-center h-full gap-1">
                                                     <div className="text-xs font-mono text-yellow-500 mb-1">Lv.{unlockedSkill.levelRequired}</div>
                                                     <div className="flex-1 flex items-center justify-center"><div className="scale-[1.5] drop-shadow-xl">{getCardIcon(unlockedSkill.id)}</div></div>
                                                     <div className="font-bold text-white text-base text-center leading-tight mb-1">{unlockedSkill.name[lang]}</div>
                                                     <div className="text-[10px] text-slate-400 text-center leading-tight line-clamp-3 px-1">{unlockedSkill.description[lang]}</div>
                                                  </div>
                                                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent rounded-lg pointer-events-none" />
                                               </div>
                                            </div>
                                         );
                                      })()}
                                   </div>
                                )}
                             </div>

                             {/* CONTROLS */}
                             <div className="w-full pt-4 border-t border-slate-800 flex flex-col gap-3 z-10">
                                {isFinal ? (
                                   <button onClick={() => leaveRoom()} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-black text-lg rounded-xl shadow-lg transition-all active:scale-95">
                                      {lang === 'zh' ? '结束游戏' : 'FINISH GAME'}
                                   </button>
                                ) : (
                                   /* Normal Next Match Logic */
                                   gameState.hostId === user?.uid ? (
                                     <button
                                        onClick={nextMatchHost}
                                        // Wait if anyone is pending a swap
                                        disabled={gameState.players.some(p => p.pendingLevel != null)}
                                        className={`w-full py-3 rounded-xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all ${gameState.players.some(p => p.pendingLevel != null) ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-yellow-500 hover:bg-yellow-400 text-slate-900 active:scale-95'}`}
                                     >
                                        {gameState.players.some(p => p.pendingLevel != null) ? (
                                           <>
                                             <Loader size={20} className="animate-spin text-slate-500" />
                                             <span className="text-sm">{lang === 'zh' ? '等待胜者弃牌...' : 'Waiting for discard...'}</span>
                                           </>
                                        ) : (
                                           <>
                                             <Play size={20} className="fill-slate-900 group-hover:scale-110 transition-transform" /> 
                                             {t.nextMatch}
                                           </>
                                        )}
                                     </button>
                                   ) : (
                                     <div className="text-center text-slate-500 text-xs animate-pulse flex items-center justify-center gap-2">
                                        <Loader size={16} className="animate-spin" />
                                        {gameState.players.some(p => p.pendingLevel != null) 
                                          ? (lang === 'zh' ? '等待弃牌...' : 'Waiting for discard...') 
                                          : (lang === 'zh' ? '等待下一局...' : 'Waiting for host...')}
                                     </div>
                                   )
                                )}
                             </div>
                          </>
                        );
                     })()}
                  </div>
               </div>
            </div>
           )}

          {/* 🟢 UPDATED: KILL LEADERBOARD（远征模式隐藏） (Draggable + Minimizable) */}
          {!isExpedition && (
           <div
               ref={leaderboardRef}
               className="battle-leaderboard fixed z-50 animate-in slide-in-from-left-10 duration-500 pointer-events-none"
               style={{ 
                  top: `${dragPosition.y}px`, 
                  left: `${dragPosition.x}px`,
                  cursor: isDragging ? 'grabbing' : 'default', // Cursor logic
               }}
           >
               {/* Glow Effect */}
               <div className={`absolute inset-0 bg-red-600 blur-2xl rounded-3xl transition-opacity duration-300 ${leaderboardMode === 'MINIMIZED' ? 'opacity-0' : 'opacity-20'}`} />

               <div 
                   // ✨ DOUBLE CLICK INTERACTION
                   onDoubleClick={(e) => {
                       e.stopPropagation();
                       setLeaderboardMode(prev => prev === 'MINIMIZED' ? 'TOP3' : 'MINIMIZED');
                       playSound('click', muted);
                   }}
                   className={`
                       relative bg-slate-900/95 border-2 border-red-500/50 rounded-2xl p-5 min-w-[260px] flex flex-col gap-4 
                       shadow-[0_0_40px_rgba(0,0,0,0.6)] backdrop-blur-xl pointer-events-auto select-none transition-all duration-300
                       ${leaderboardMode === 'MINIMIZED' ? 'h-auto gap-0' : ''}
                   `}
               >

                   {/* Header Section (Drag Handle) */}
                   <div 
                      onMouseDown={handleMouseDown} 
                      className={`flex items-center gap-4 cursor-grab active:cursor-grabbing transition-all ${leaderboardMode !== 'MINIMIZED' ? 'border-b border-red-500/30 pb-4' : ''}`}
                   >
                       <div className="bg-gradient-to-br from-red-500 to-red-700 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border border-red-400/30 shrink-0">
                            <Skull size={24} className="text-white drop-shadow-md animate-[pulse_3s_infinite]" />
                       </div>
                       <div className="flex flex-col">
                           <span className="text-[10px] font-black text-red-500 tracking-[0.2em] uppercase">
                               {lang === 'zh' ? '当前战况' : 'KILLS'}
                           </span>
                           <span className="text-xl font-black text-white tracking-widest uppercase drop-shadow-sm">
                               {lang === 'zh' ? '击杀榜' : 'LEADERBOARD'}
                           </span>
                       </div>
                   </div>

                   {/* Content Section (Hidden when MINIMIZED) */}
                   {leaderboardMode !== 'MINIMIZED' && (
                       <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-300 origin-top">
                           {/* List Rendering */}
                           {gameState.players
                               .slice()
                               .sort((a, b) => (b.kills || 0) - (a.kills || 0))
                               .slice(0, leaderboardMode === 'EXPANDED' ? gameState.players.length : 3) 
                               .map((p, i) => {
                                   const isMe = p.id === myPlayerId;
                                   const hasKills = (p.kills || 0) > 0;
                                   const isLeader = i === 0 && hasKills;

                                   return (
                                       <div key={p.id} className={`
                                           flex items-center justify-between p-2.5 rounded-xl transition-all duration-300
                                           ${isMe 
                                               ? 'bg-gradient-to-r from-red-950/80 to-slate-900 border border-red-500/50 shadow-lg scale-[1.02]' 
                                               : 'hover:bg-white/5 border border-transparent'}
                                       `}>
                                           <div className="flex items-center gap-3">
                                               <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-sm font-black shadow-inner ${isLeader ? 'bg-yellow-500 text-black shadow-yellow-500/20' : 'bg-slate-800 text-slate-500'}`}>
                                                   {i + 1}
                                               </div>
                                               <span className={`text-base font-bold truncate max-w-[120px] ${isMe ? 'text-white' : 'text-slate-400'}`}>
                                                   {p.name}
                                               </span>
                                           </div>

                                           <div className="flex items-center gap-1.5">
                                               <span className={`text-xl font-black font-mono ${hasKills ? 'text-red-400 drop-shadow-md' : 'text-slate-700'}`}>
                                                   {p.kills || 0}
                                               </span>
                                               {hasKills && <Skull size={14} className="text-red-500 opacity-80" />}
                                           </div>
                                       </div>
                                   )
                               })
                           }
                       
                           {/* Expand/Collapse Button (Only if > 3 players) */}
                           {gameState.players.length > 3 && (
                               <button
                                   onClick={(e) => {
                                       e.stopPropagation(); // Prevent double click trigger
                                       setLeaderboardMode(prev => prev === 'EXPANDED' ? 'TOP3' : 'EXPANDED');
                                       playSound('click', muted);
                                   }}
                                   className="w-full mt-3 py-2 bg-slate-800/80 text-slate-400 text-sm font-bold rounded-xl border border-slate-700/50 hover:bg-slate-700/70 transition-colors flex items-center justify-center gap-2"
                               >
                                   {leaderboardMode === 'EXPANDED' ? (
                                       <>
                                           <ArrowUp size={16} /> {lang === 'zh' ? '收起' : 'Show Less'}
                                       </>
                                   ) : (
                                       <>
                                           <ArrowDown size={16} /> {lang === 'zh' ? '展开' : 'Show All'} ({gameState.players.length})
                                       </>
                                   )}
                               </button>
                           )}
                       </div>
                   )}
               </div>
           </div>
          )}
          </div>

        {/* The selected portrait and controls remain still above the left of the hand. */}
        {myPlayer && <div className="battle-player-hud" aria-label={lang === 'zh' ? '我的状态' : 'My status'}>
          <div className={`battle-hud-portrait ${myPlayer.isDead ? 'battle-hud-dead' : ''}`}>
            {myPlayer.avatar ? <img src={avatarUrl(myPlayer.avatar)} alt={myPlayer.name} draggable={false} /> : <User size={52} />}
          </div>
          <div className="battle-hud-details">
            <div className="battle-hud-name"><strong title={myPlayer.name}>{myPlayer.name}</strong><span>LVL {Math.max(0, ...myPlayer.inventory)}</span></div>
            <BattleStats player={myPlayer} maxHp={isExpedition ? (expMaxHpRef.current[myPlayer.id] ?? MAX_HP) : MAX_HP} />
          </div>
          {isExpedition && expPhase === 'battle' && <div className="battle-hud-inventory">
            <InventoryBar gold={expGold} relics={expRelics} equipment={expEquipment} tempCards={expRunRef.current.tempCards} lang={lang} playClick={() => playSound('click', muted)} />
            {goldFly && <span key={goldFly.key} className="battle-gold-gain">+{goldFly.amount} 🪙</span>}
          </div>}
        </div>}

        {activeTutorialStep && myPlayer && <TutorialGuide
          key={`${tutorialStageId}-${expTutIdx}`}
          stageId={tutorialStageId}
          stepIndex={expTutIdx}
          lang={lang}
          settling={submittingMove || gameState.status !== 'PLAYING'}
          onLocate={locateTutorialCard}
          onSkip={() => {
            if (submittingMove) return;
            expTutorialSkippedRef.current = true;
            expTutIdxRef.current = 999;
            setExpTutIdx(999);
            setExpIntents(computeExpIntents(gameState.players, expStageIdx));
            setIntentDismissed(new Set());
            setToastMsg(lang === 'zh' ? '已跳过本轮教学，可以自由选择招式。' : 'Training skipped for this run. Choose any available move.');
          }}
        />}

        {/* 3. 手牌区 */}
        <div className="pixel-hand-area h-64 bg-gradient-to-t from-black/30 via-slate-950/10 to-transparent relative z-40 flex flex-col">

            <div className="battle-hand-heading"><span>{gameState.status === 'SHOWDOWN' ? (lang === 'zh' ? '招式交锋 · 回合结算' : 'CLASH · RESOLVING') : myPlayer?.selectedCardId ? (lang === 'zh' ? '已出牌 · 等待对手' : 'MOVE LOCKED · WAITING') : (lang === 'zh' ? '你的回合 · 选择招式' : 'YOUR MOVE · CHOOSE A SKILL')}</span><small>{lang === 'zh' ? '观察意图，见招拆招' : 'READ • REACT • STRIKE'}</small></div>
            {/* HAND AREA */}
            <div className="flex-1 w-full relative flex justify-center items-end pb-8">
                {!myPlayer || myPlayer.isDead ? (
                    <div className="text-slate-500 flex flex-col items-center gap-2 mb-10">
                        <Ghost size={48} className="opacity-30" />
                        <p>{t.dead}</p>
                    </div>
                ) : myPlayer.selectedCardId ? (
                     <div className="text-green-500 flex flex-col items-center gap-2 mb-10 animate-pulse">
                        <CheckCircle size={48} />
                        <p className="font-bold text-xl">{t.moveLocked}</p>
                    </div>
                ) : (
                    <div className={`pixel-hand-tray ${handViewMode === 'CATEGORIES' ? 'pixel-categories' : 'pixel-cards'} relative h-[250px] w-full max-w-4xl flex justify-center items-end px-10`}>
                        
                        {/* MODE 1: CATEGORY SELECTION (FOLDERS) */}
                        {handViewMode === 'CATEGORIES' && (
                          categories.map((cat, index) => {
                            const total = categories.length;
                            const middle = (total - 1) / 2;
                            const offset = index - middle;
                            const rotateDeg = offset * 4;
                            const translateY = Math.abs(offset) * 6;
                            const translateX = offset * 120;


                            const isChargeDisabled =
                              cat === 'CHARGE' && ((myPlayer?.disabledSkills || []).includes('charge') ||
                                !!activeTutorialStep && activeTutorialStep.highlight !== 'charge');

                            // STYLES
                            let bgGradient = 'bg-slate-800';
                            let borderClass = 'border-slate-600';
                            let hoverGlowClass = 'hover:shadow-[0_0_30px_rgba(255,255,255,0.3)]'; 

                            if (cat === 'ATTACK') {
                              bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900';
                              borderClass = 'border-red-500';
                              hoverGlowClass = 'hover:shadow-[0_0_40px_rgba(239,68,68,0.7)]'; 
                            }
                            if (cat === 'DEFEND') {
                              bgGradient = 'bg-gradient-to-b from-blue-900 to-slate-900';
                              borderClass = 'border-blue-500';
                              hoverGlowClass = 'hover:shadow-[0_0_40px_rgba(59,130,246,0.7)]'; 
                            }
                            if (cat === 'ULTIMATE') {
                              bgGradient = 'bg-gradient-to-b from-purple-900 to-slate-900';
                              borderClass = 'border-purple-500';
                              hoverGlowClass = 'hover:shadow-[0_0_40px_rgba(168,85,247,0.7)]'; 
                            }
                            if (cat === 'CHARGE') {
                              bgGradient = 'bg-gradient-to-b from-yellow-900 to-slate-900';
                              borderClass = 'border-yellow-500';
                              hoverGlowClass = 'hover:shadow-[0_0_40px_rgba(234,179,8,0.7)]'; 
                            }
                            if (cat === 'SPECIAL') {
                              bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900';
                              borderClass = 'border-emerald-500';
                              hoverGlowClass = 'hover:shadow-[0_0_40px_rgba(16,185,129,0.7)]'; 
                            }

                            // 🟢 FIX: Dynamic Classes based on State
                            // If suggested, we DISABLE standard transitions and hover transforms to prevent glitching.
                            const standardClasses = `transition-colors duration-150 hover:z-50 ${hoverGlowClass}`;
                            const entranceAnim = '';

                            // 教程：高亮牌所在的文件夹也发光（牌藏在文件夹里，不提示根本找不到）
                            const tutCatGlow = tutorialCategory === cat;

                            return (
                              <div
                                key={cat}
                                data-card-type={cat}
                                data-tutorial-target={tutCatGlow}
                                aria-describedby={activeTutorialStep ? 'tutorial-instruction' : undefined}
                                role="button"
                                tabIndex={isChargeDisabled ? -1 : 0}
                                aria-label={t.categories[cat]}
                                aria-disabled={isChargeDisabled}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }}
                                onClick={() => {
                                  if (cat === 'CHARGE') {
                                    if (isChargeDisabled) return;
                                    if (!myPlayer || submittingMove) return; 

                                    const chargeCard = knownCards.find(c => c.id === 'charge');
                                    const canAfford = chargeCard && myPlayer.energy >= chargeCard.cost;

                                    if (canAfford) {
                                      if (isExpedition) {
                                          handleExpeditionMove('charge');
                                      } else {
                                          submitMove('charge');
                                      }
                                    }     
                                  } else {
                                    selectCategory(cat);
                                  }
                                }}
                                className={`
                                  absolute w-36 h-56 rounded-2xl border-4 shadow-2xl
                                  overflow-hidden
                                  origin-bottom
                                  cursor-pointer group flex flex-col items-center justify-center hand-card
                                  ${tutCatGlow ? '' : entranceAnim}
                                  
                                  ${isChargeDisabled
                                      ? 'border-slate-700 grayscale opacity-70 cursor-not-allowed'
                                      : `${borderClass} ${tutCatGlow ? 'transition-colors duration-150' : standardClasses}`
                                  }
                                  ${tutCatGlow ? 'tutorial-highlight' : ''}
                                `}
                                style={{
                                  // 🟢 FIX: Transform is stable. If suggested, we force the scale here.
                                  // We removed the 'transition-all' class when isSuggested is true, so this won't jitter.
                                  transform: `
                                    translateX(${translateX}px) 
                                    translateY(${translateY}px) 
                                    rotate(${rotateDeg}deg) 
                                  `,
                                  zIndex: tutCatGlow ? 60 : index,
                                  bottom: '30px',
                                  backgroundColor: '#1a1a1a',
                                }}
                              >
                                <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                                <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
                                
                                <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12 origin-left z-10 pointer-events-none" />

                                {isChargeDisabled && !activeTutorialStep && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                    <X className="text-red-500/80 w-24 h-24 drop-shadow-lg" strokeWidth={3} />
                                    <span className="absolute mt-16 text-red-200 font-black text-sm bg-red-900/80 px-2 py-1 rounded">
                                      {lang === 'zh' ? '已禁用' : 'DISABLED'}
                                    </span>
                                  </div>
                                )}

                                <div className="w-full h-32 flex items-center justify-center relative z-10 mt-2">
                                  <div className="transition-transform duration-300 drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)] group-hover:scale-110">
                                    {getCategoryIcon(cat)}
                                  </div>
                                </div>

                                <div className="mt-0 mb-2 text-white font-bold text-lg tracking-wide relative z-10 text-center drop-shadow-md">
                                  {t.categories[cat]}
                                </div>

                                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/0 pointer-events-none transition-colors" />
                              </div>
                            );
                          })
                        )}
                        
                        {/* MODE 2: CARDS IN SELECTED CATEGORY */}
                        {handViewMode === 'CARDS' && (
                           <>
                              {/* Back Button */}
                              <button 
                                 onClick={goBackToCategories}
                                 className="pixel-hand-back absolute left-4 top-1/2 -translate-y-1/2 z-[60] bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full border border-slate-600 shadow-xl transition-all hover:scale-110"
                              >
                                 <Undo2 size={24} />
                              </button>

                              {orderedHand.length === 0 ? (
                                 <div className="text-slate-500 flex flex-col items-center animate-in fade-in zoom-in duration-300">
                                    <Layers size={48} className="opacity-30 mb-2"/>
                                    <span>No cards</span>
                                 </div>
                              ) : (
                                 orderedHand.map((c, index) => {
                                    const total = orderedHand.length;
                                    const middle = (total - 1) / 2;
                                    const offset = index - middle;
                                    const rotateDeg = offset * 4; 
                                    const translateY = Math.abs(offset) * 6;
                                    const translateX = offset * (isSmallScreen ? 92 : 120); 
                                    
                                    // Check if Player has Free Uses
                                    const hasFree = myPlayer.freeSkills?.includes(c.id) ?? false;

                                    // Check Affordability
                                    const canAfford = hasFree || myPlayer.energy >= c.cost;

                                    // Check Disabled State
                                    const isDisabled = myPlayer.disabledSkills?.includes(c.id);

                                    // Count of Free Uses Absorbed
                                    const freeCount =
                                      myPlayer.freeSkills?.filter((id) => id === c.id).length ?? 0;

                                    // Check if this card is currently popping (used with free)
                                    const isPopping = !!poppingFree[c.id];

                                    // 检查是否是临时卡
                                    const isTemp = (myPlayer.tempSkills || []).includes(c.id);

                                    const tempCount = myPlayer.tempSkills?.filter((id) => id === c.id).length ?? 0;

                                    // Card Styles (Same as before)
                                    let bgGradient = 'bg-slate-800';
                                    let borderClass = 'border-slate-600';

                                    if (c.type === 'ATTACK') { bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900'; borderClass = 'border-red-500'; }
                                    if (c.type === 'DEFEND') { bgGradient = 'bg-gradient-to-b from-blue-900 to-slate-900'; borderClass = 'border-blue-500'; }
                                    if (c.type === 'ULTIMATE') { bgGradient = 'bg-gradient-to-b from-purple-900 to-slate-900'; borderClass = 'border-purple-500'; }
                                    if (c.type === 'CHARGE') { bgGradient = 'bg-gradient-to-b from-yellow-900 to-slate-900'; borderClass = 'border-yellow-500'; }
                                    if (c.type === 'SPECIAL' || c.type === 'ABSORB') { bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900'; borderClass = 'border-emerald-500'; }

                                    const isCombo = c.tags?.includes('combo');
                                    if (isCombo) {
                                      bgGradient =
                                        'bg-gradient-to-b from-yellow-500 via-amber-500 to-orange-500';
                                      borderClass = 'border-yellow-300';
                                    }

                                    let glareColor = '#ffffff'; // default
                                    if (c.type === 'ATTACK') glareColor = '#f87171'; // Red-400 
                                    if (c.type === 'DEFEND') glareColor = '#60a5fa'; // Blue-400 
                                    if (c.type === 'ULTIMATE') glareColor = '#c084fc'; // Purple-400 
                                    if (c.type === 'CHARGE') glareColor = '#facc15'; // Yellow-400 
                                    if (c.type === 'SPECIAL' || c.type === 'ABSORB') glareColor = '#34d399'; // Emerald-400 
                                    if (c.tags?.includes('combo')) glareColor = '#fbbf24'; // Amber-400 

                                    const isHovered = hoveredCard === c.id;
                                    // 远征前三关教学：高亮当前步骤的牌
                                    const tutGlow = activeTutorialStep?.highlight === c.id;
                                    const tutorialBlocked = !!activeTutorialStep && !tutGlow;
                                    return (
                                      <div
                                          key={`${c.id}-${index}`}
                                          className={`pixel-card-slot absolute ${isSmallScreen ? 'w-28' : 'w-36'}`}
                                          style={{
                                            zIndex: tutGlow ? 1000 : isHovered ? 999 : index,
                                            bottom: '30px',
                                            transform: `translateX(${translateX}px) translateY(${translateY}px)`,
                                            // 隐形 hover 保护区：卡片上浮时光标仍停留在容器内，
                                            // 不会误触发 mouseleave，提示框就不会反复闪烁
                                            paddingTop: 0,
                                            marginTop: 0,
                                          }}
                                          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => handleMouseEnter(e, c.id)}
                                          onMouseLeave={handleMouseLeave}
                                      >
                                       <TiltCard
                                          disableMotion={true}
                                          glareColor={glareColor}
                                          data-card-type={c.type}
                                          data-tutorial-target={tutGlow}
                                          aria-describedby={activeTutorialStep ? 'tutorial-instruction' : undefined}
                                          onClick={() => {
                                            const disabled = (myPlayer?.disabledSkills || []).includes(c.id);
                                            if (canAfford && !disabled && !submittingMove && !tutorialBlocked) {
                                              if (isExpedition) {
                                                  handleExpeditionMove(c.id); // <--- Expedition mode
                                              } else {
                                                  submitMove(c.id);           // <--- Normal Game
                                              }
                                            }
                                          }}
                                          disabled={isDisabled || !canAfford || tutorialBlocked}
                                          className={`
                                            relative ${isSmallScreen ? 'w-28 h-44' : 'w-36 h-56'} rounded-2xl border-4 ${borderClass}
                                            shadow-2xl
                                            ${c.tags?.includes('combo') ? 'shadow-[0_0_28px_rgba(250,204,21,0.9)]' : ''}
                                            ${tutGlow ? 'tutorial-highlight' : ''}
                                            ${tutorialBlocked ? 'tutorial-other-card' : ''}
                                            origin-bottom
                                            cursor-pointer group flex flex-col items-center overflow-hidden hand-card

                                            ${isDisabled 
                                              ? 'border-slate-700 grayscale opacity-70 cursor-not-allowed' 
                                              : `${borderClass} ${c.tags?.includes('combo') ? 'shadow-[0_0_28px_rgba(250,204,21,0.9)]' : ''} ${!canAfford ? 'grayscale opacity-60' : ''}`
                                            }
                                          `}
                                          style={{
                                            backgroundColor: '#1a1a1a',
                                            // 悬停只做视觉上浮（容器不动），hover 判定区保持稳定
                                            transform: tutGlow ? 'rotate(0deg)' : `rotate(${rotateDeg}deg)`,
                                          }}
                                        >
                                          {/* 1. Background Gradient */}
                                          <div className={`absolute inset-0 ${bgGradient} opacity-90`}/>

                                          {/* 🔥 2. SHINE EFFECT (New Animation) */}
                                          <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12 origin-left z-10 pointer-events-none" />
                                          
                                          {/* 3. Labels & Badges */}
                                          {hasFree && (
                                            <div className="absolute bottom-1 left-2 text-[10px] font-bold text-emerald-300 bg-black/60 px-1 rounded z-20">
                                              FREE
                                            </div>
                                          )}

                                          {/* Temp Label */}
                                          {isTemp && !hasFree && (
                                            <div className="absolute bottom-1 left-2 text-[10px] font-bold text-orange-400 bg-black/60 px-1 rounded border border-orange-500/30 z-20">
                                              TEMP
                                            </div>
                                          )}

                                          {/* Cost Gem */}
                                          <div className="absolute top-0 left-0 z-20">
                                                <div className="w-10 h-10 bg-blue-500 rounded-br-2xl flex items-center justify-center shadow-lg border-r border-b border-blue-300">
                                                   <span className="font-black text-white text-lg drop-shadow-md">{c.cost}</span>
                                                </div>
                                          </div>

                                          {/* RED X OVERLAY (Disabled) */}
                                          {isDisabled && (
                                            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                              <X className="text-red-500/80 w-24 h-24 drop-shadow-lg" strokeWidth={3} />
                                              <span className="absolute mt-16 text-red-200 font-black text-sm bg-red-900/80 px-2 py-1 rounded">
                                                {lang === 'zh' ? '已禁用' : 'DISABLED'}
                                              </span>
                                            </div>
                                          )}

                                          {/* Free Count (xN) */}
                                          {freeCount > 0 && (
                                            <div className="absolute top-0 right-1 z-30 pointer-events-none select-none">
                                              <span className={`block text-[50px] font-black text-red-400 tracking-tight transition-transform duration-150 ease-out ${isPopping ? 'scale-110' : 'scale-100'}`}
                                                style={{ WebkitTextStroke: '8px #991b1b', paintOrder: 'stroke fill' }}>
                                                ×{freeCount}
                                              </span>
                                            </div>
                                          )}

                                          {/* Temp Count (xN) */}
                                          {tempCount > 0 && (
                                            <div className={`absolute ${freeCount > 0 ? 'top-10' : 'top-0'} right-1 z-30 pointer-events-none select-none`}>
                                              <span
                                                className="block text-[50px] font-black text-orange-400 tracking-tight"
                                                style={{
                                                  WebkitTextStroke: '8px #7c2d12',
                                                  paintOrder: 'stroke fill',
                                                }}
                                              >
                                                ×{tempCount}
                                              </span>
                                            </div>
                                          )}

                                          {/* Level Badge */}
                                          <div className="absolute top-1.5 right-1.5 z-20 flex flex-col items-end gap-1 pointer-events-none">
                                            {c.levelRequired > 0 && c.levelRequired < 100 && (
                                              <div className="text-xs font-mono font-bold text-yellow-400 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-md border border-yellow-500/30 shadow-sm">
                                                Lv.{c.levelRequired}
                                              </div>
                                            )}
                                          </div>

                                          {/* Icon */}
                                          <div className="w-full h-32 flex items-center justify-center relative z-10 mt-2">
                                                <div className="transform group-hover:scale-110 transition-transform duration-300 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                                                   {getCardIcon(c.id)}
                                                </div>
                                          </div>

                                          {/* Name */}      
                                          <div className="mt-1 mb-1 text-white font-bold text-sm tracking-wide relative z-10 text-center">
                                            {c.name[lang]}
                                          </div>

                                          {/* Description */}
                                          <div className="flex-1 w-full bg-[#111] bg-opacity-90 p-2 text-center flex items-center justify-center border-t border-white/10 relative z-10">
                                                <p className="text-[10px] text-slate-300 leading-tight">{c.description[lang]}</p>
                                          </div>

                                          {/* Subtle Hover Highlight */}
                                          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/5 pointer-events-none z-30 transition-colors"/>
                                          
                                       </TiltCard>
                                      </div>
                                    );
                                 })
                              )}
                           </>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>

      {/* --- REVENGE / BOUNTY CARD REVEAL ANIMATION --- */}
      {!isExpedition && revengeCardId && (
        <div 
           className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer"
           onClick={() => {
             playSound('click', muted);
             setRevengeCardId(null); // Click to close
           }}
        >
           <style>{revengeStyle}</style>

           <div className="relative w-full max-w-md md:max-w-lg mx-4 flex flex-col items-center gap-8 animate-in fade-in duration-500">
              
              {/* Title */}
              <div className="text-center space-y-2 z-10 animate-pulse">
                 <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 italic tracking-widest uppercase drop-shadow-lg">
                    {lang === 'zh' ? '复仇时刻' : 'REVENGE TIME'}
                 </h2>
                 <p className="text-slate-400 text-sm font-mono uppercase tracking-widest">
                    {lang === 'zh' ? '获得临时强力技能' : 'Temporary Skill Acquired'}
                 </p>
              </div>

              {/* The Spinning Card Container */}
              <div className="relative w-64 h-96 animate-card-reveal">
                 
                 {/* 1. CARD BACK (The Mystery Side) - Visible at 0deg, 360deg... */}
                 <div className="absolute inset-0 w-full h-full rounded-2xl bg-slate-800 border-4 border-slate-600 shadow-2xl flex items-center justify-center backface-hidden">
                    <div className="absolute inset-2 border-2 border-dashed border-slate-600/50 rounded-xl" />
                    <div className="text-8xl font-black text-slate-700 select-none">?</div>
                 </div>

                 {/* 2. CARD FRONT (The Reveal Side) - Visible at 180deg, 540deg... 
                    The container rotates 1080. 
                    Render the CARD directly and let it spin! 
                 */}
                 
                 {(() => {
                    const card = SKILL_DB.find(c => c.id === revengeCardId);
                    if (!card) return null;
                    
                    // Using your existing card style logic
                    let bgGradient = 'bg-slate-800';
                    let borderClass = 'border-slate-600';
                    if (card.type === 'ATTACK') { bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900'; borderClass = 'border-red-500'; }
                    if (card.type === 'SPECIAL') { bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900'; borderClass = 'border-emerald-500'; }
                    
                    return (
                       <div className={`
                          absolute inset-0 w-full h-full rounded-2xl border-4 ${borderClass} 
                          shadow-[0_0_50px_rgba(220,38,38,0.5)] 
                          flex flex-col items-center justify-center
                          bg-[#1a1a1a] overflow-hidden
                       `}>
                          <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                          
                          {/* Header Badge */}
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg animate-bounce z-20 whitespace-nowrap">
                             {lang === 'zh' ? '本局可用' : 'ONE USE ONLY'}
                          </div>

                          {/* Level & Icon */}
                          <div className="relative z-10 flex flex-col items-center gap-4">
                             <div className="text-lg font-mono text-yellow-500">Lv.{card.levelRequired}</div>
                             <div className="scale-[2.0] drop-shadow-xl">{getCardIcon(card.id)}</div>
                          </div>

                          {/* Name & Desc */}
                          <div className="absolute bottom-0 w-full bg-black/80 p-4 text-center border-t border-white/10 z-10">
                             <div className="text-xl font-bold text-white mb-1">{card.name[lang]}</div>
                             <div className="text-xs text-slate-400 leading-tight">{card.description[lang]}</div>
                          </div>
                       </div>
                    );
                 })()}

              </div>

              {/* Click to continue hint */}
              <div className="text-slate-500 text-xs animate-pulse mt-8">
                 {lang === 'zh' ? '点击任意处领取' : 'Click anywhere to claim'}
              </div>

           </div>
        </div>
      )}

      {/* 屏幕中心复仇公告 (GLOBAL REVENGE ANNOUNCEMENT) */}
      {recentRevengePlayer && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center pointer-events-none">
           {/* 动画容器 (带背景模糊和边框的横幅) */}
           <div className="animate-in zoom-in slide-in-from-bottom-10 duration-500 flex flex-col items-center gap-3 p-8 bg-gradient-to-b from-red-900/90 to-black/90 backdrop-blur-md rounded-3xl border-y-4 border-red-500/50 shadow-[0_0_80px_rgba(220,38,38,0.6)] transform scale-110">
              
              {/* 恶魔图标动画 */}
              <div className="text-7xl animate-bounce filter drop-shadow-[0_0_20px_red]">
                 👿
              </div>
              
              {/* 玩家名字和标题 */}
              <div className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-red-500 to-orange-500 tracking-wider uppercase text-center drop-shadow-lg">
                 {lang === 'zh'
                    ? `${recentRevengePlayer.name} 获得了复仇卡!`
                    : `${recentRevengePlayer.name} OBTAINED A REVENGE CARD!`}
              </div>

              {/* 副标题提示 */}
              <div className="text-sm md:text-base text-red-300 font-mono uppercase tracking-[0.2em] bg-red-950/50 px-4 py-1 rounded-full">
                 {lang === 'zh' ? '>>> 复仇时刻已到 <<<' : '>>> REVENGE TIME <<<'}
              </div>

           </div>
        </div>
      )}

      {/* --- 阶段重置过场：两条横线从左右闪入 → 中央减速会合 → 快速闪回两边（约1.2秒，不拦截操作） --- */}
      {resetFlash && (
        <div className="fixed inset-0 z-[95] pointer-events-none overflow-hidden">
          <style>{`
            @keyframes reset-hline-left {
              0% { transform: translateX(-102%); animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
              32% { transform: translateX(0); }
              60% { transform: translateX(0); animation-timing-function: cubic-bezier(0.7,0,0.84,0); }
              100% { transform: translateX(-102%); }
            }
            @keyframes reset-hline-right {
              0% { transform: translateX(102%); animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
              32% { transform: translateX(0); }
              60% { transform: translateX(0); animation-timing-function: cubic-bezier(0.7,0,0.84,0); }
              100% { transform: translateX(102%); }
            }
            @keyframes reset-dline-left {
              0% { transform: translateX(-110%); opacity: 0; animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
              12% { opacity: 1; }
              32% { transform: translateX(0); opacity: 1; }
              60% { transform: translateX(0); opacity: 1; animation-timing-function: cubic-bezier(0.7,0,0.84,0); }
              100% { transform: translateX(-110%); opacity: 1; }
            }
            @keyframes reset-dline-right {
              0% { transform: translateX(110%); opacity: 0; animation-timing-function: cubic-bezier(0.16,1,0.3,1); }
              12% { opacity: 1; }
              32% { transform: translateX(0); opacity: 1; }
              60% { transform: translateX(0); opacity: 1; animation-timing-function: cubic-bezier(0.7,0,0.84,0); }
              100% { transform: translateX(110%); opacity: 1; }
            }
            @keyframes reset-text-line {
              0%, 18% { opacity: 0; transform: scale(0.85); }
              34% { opacity: 1; transform: scale(1.05); }
              44% { transform: scale(1); }
              52% { transform: scale(1.03); }
              60% { transform: scale(1); opacity: 1; }
              78%, 100% { opacity: 0; transform: scale(1.04); }
            }
          `}</style>
          {/* 左横线：从左边闪入，中央减速停住 */}
          <div
            className="absolute left-0 w-[52%] h-[3px] bg-gradient-to-r from-transparent via-red-500/70 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
            style={{ top: 'calc(50% - 1.5px)', animation: 'reset-hline-left 1.2s forwards' }}
          />
          {/* 右横线：从右边闪入，中央减速停住 */}
          <div
            className="absolute right-0 w-[52%] h-[3px] bg-gradient-to-l from-transparent via-red-500/70 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
            style={{ top: 'calc(50% - 1.5px)', animation: 'reset-hline-right 1.2s forwards' }}
          />
          {/* 斜对角45°：同一套横线整体旋转45°，左上闪入 + 右下闪入 */}
          <div className="absolute inset-0" style={{ transform: 'rotate(45deg)' }}>
            <div
              className="absolute left-0 w-[52%] h-[3px] bg-gradient-to-r from-transparent via-red-500/70 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
              style={{ top: 'calc(50% - 1.5px)', animation: 'reset-dline-left 1.2s forwards' }}
            />
            <div
              className="absolute right-0 w-[52%] h-[3px] bg-gradient-to-l from-transparent via-red-500/70 to-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]"
              style={{ top: 'calc(50% - 1.5px)', animation: 'reset-dline-right 1.2s forwards' }}
            />
          </div>
          {/* 一行字，压在横线上 */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="text-4xl md:text-6xl font-black text-white tracking-[0.3em] whitespace-nowrap select-none bg-black/50 px-8 py-3 rounded-full"
              style={{
                animation: 'reset-text-line 1.2s ease-out forwards',
                textShadow: '0 0 30px rgba(239,68,68,0.9), 0 0 60px rgba(239,68,68,0.5), 0 2px 10px rgba(0,0,0,0.8)',
              }}
            >
              ⚡ 状态已重置
            </div>
          </div>
        </div>
      )}
      
      {/* --- SKILL REPLACEMENT MODAL --- */}
      {myPlayer && myPlayer.pendingLevel && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
           
           <div className="text-center mb-8">
             <h2 className="text-3xl font-black text-white mb-2">
               {lang === 'zh' ? '技能槽已满!' : 'SKILL SLOTS FULL!'}
             </h2>
             <p className="text-slate-300">
               {lang === 'zh' 
                 ? '除基础技能外，同类技能上限为 4 张。请选择一张【丢弃】。' 
                 : 'Limit 4 skills (excluding basic) per type. Choose one to DISCARD.'}
             </p>
           </div>

           <div className="flex flex-wrap gap-4 justify-center items-center max-w-5xl">
              {(() => {
                 const newLvl = myPlayer.pendingLevel!;
                 const newCardInfo = SKILL_DB.find(c => c.levelRequired === newLvl);
                 const type = newCardInfo?.type || 'ATTACK'; 
                 
                 const existingLvls = myPlayer.inventory.filter(lvl => {
                    if (lvl === 0) return false; 
                    const cards = SKILL_DB.filter(c => c.levelRequired === lvl);
                    return cards.some(c => c.type === type);
                 });

                 const allOptions = [...existingLvls, newLvl].sort((a,b) => a-b);

                 return allOptions.map(lvl => {
                    const card = SKILL_DB.find(c => c.levelRequired === lvl && c.type === type) 
                                 || SKILL_DB.find(c => c.levelRequired === lvl)!; 
                    
                    const isNew = lvl === newLvl;

                    return (
                      <div key={lvl} className="flex flex-col items-center gap-2">
                        {isNew ? (
                          <span className="text-green-400 font-bold text-xs animate-bounce">
                            {lang === 'zh' ? '新技能' : 'NEW'}
                          </span>
                        ) : (
                          <span className="text-slate-500 font-bold text-xs">
                            Lv.{lvl}
                          </span>
                        )}

                        <div 
                          onClick={() => handleDiscardSkill(lvl)}
                          className={`
                            w-28 h-40 rounded-xl border-2 cursor-pointer relative overflow-hidden group transition-all hover:scale-105 hover:shadow-2xl
                            ${isNew ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]' : 'border-slate-600 hover:border-red-500'}
                          `}
                        >
                           <div className="absolute inset-0 bg-slate-900/90" />
                           <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-50 font-black text-white text-lg">
                              {lang === 'zh' ? '丢弃' : 'DISCARD'}
                           </div>

                           <div className="relative z-10 flex flex-col items-center justify-center h-full p-2 text-center pointer-events-none">
                              <div className="text-[10px] font-mono text-yellow-500 mb-1">Lv.{card.levelRequired}</div>
                              <div className="scale-100 mb-1">{getCardIcon(card.id)}</div>
                              <div className="font-bold text-white text-xs leading-tight mb-1">{card.name[lang]}</div>
                              <div className="text-[9px] text-slate-400 leading-tight line-clamp-2">{card.description[lang]}</div>
                           </div>
                        </div>
                      </div>
                    );
                 });
              })()}
           </div>
        </div>
      )}
    </div>
  );
}
