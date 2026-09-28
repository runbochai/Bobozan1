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
  Heart,
  Volume2,
  VolumeX,
  Star,
  Layers,
  Undo2,
  HandHeart
} from 'lucide-react';
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
import { TUTORIAL_STEPS } from './data/tutorial';
import {
  FINAL_LEVEL,
  APP_ID,
  MAX_HP,
  MAX_PLAYERS,
  MIN_PLAYERS,
  BACKGROUND_CARDS,
} from './data/constants';
import {
  getCardIcon,
  getShowdownWinner,
  getPlayerCards,
} from './logic/combat';
import { initAudio, playSound } from './audio/sound';
import { auth, db, firebaseConfigured, firebaseInitError } from './firebase';
import { firebaseErrorMessage } from './config/firebaseConfig';
import { useBackgroundMusic } from './audio/useBackgroundMusic';
import { assetUrl, avatarUrl } from './assets';
import { mutateRoom, createUniqueRoom } from './services/rooms';
import { advanceRoom, joinPlayer, leavePlayer, patchPlayer, settleRoom, startRoom, submitPlayerMove } from './logic/room';
import type { User as FirebaseUser } from 'firebase/auth';






// Avatar Paths
const AVATAR_OPTIONS = [
  assetUrl('avatars/bdrag.png'),
  assetUrl('avatars/boy.png'),
  assetUrl('avatars/girl.png'),
  assetUrl('avatars/ntr.png'),
  assetUrl('avatars/pega.png'),
  assetUrl('avatars/rsn.png'),
];




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
}) => {
  // Local state for the slider toggle
  const [isVolumeOpen, setIsVolumeOpen] = useState(false);

  return (
    <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
      
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

      {/* Lang Button */}
      <button
        onClick={toggleLang}
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
  glareColor = "#ffffff" // 👈 New Prop with default white
}: React.HTMLAttributes<HTMLDivElement> & { disabled?: boolean; glareColor?: string }) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const rotateY = ((mouseX / width) - 0.5) * 20; 
    const rotateX = ((mouseY / height) - 0.5) * -20;

    setRotate({ x: rotateX, y: rotateY });
    setGlare({ x: (mouseX / width) * 100, y: (mouseY / height) * 100, opacity: 1 });
    
    if (onMouseEnter) onMouseEnter(e);
  };

  const handleLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    setRotate({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50, opacity: 0 });
    if (onMouseLeave) onMouseLeave(e);
  };

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onMouseEnter={onMouseEnter}
      className={`${className} transition-transform duration-100 ease-out will-change-transform`}
      style={{
        ...style,
        transform: `${style?.transform || ''} perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1.02, 1.02, 1.02)`,
      }}
    >
      {children}
      
      {!disabled && (
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
        className="rounded-full object-cover shadow-md bg-slate-900 border border-white/10 select-none"
        style={{ 
          width: `${size}px`, 
          height: `${size}px`,
          minWidth: `${size}px` 
        }} 
      />
    );
  };

  // --- Drag State ---
  const [dragPosition, setDragPosition] = useState({ x: 25, y: 50 }); // Initial starting position (Top/Left in px)
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 }); // Offset of mouse click within the element
  const leaderboardRef = useRef<HTMLDivElement>(null);

  // --- TUTORIAL LOGIC ---
  const [isTutorial, setIsTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialMsg, setTutorialMsg] = useState<{ title: { zh: string; en: string }; sub: { zh: string; en: string } }>({
    title: { zh: "", en: "" }, 
    sub: { zh: "", en: "" } 
  });

  const startTutorial = () => {
    playSound('confirm', muted);
    setIsTutorial(true);
    setTutorialStep(0);
    setTutorialMsg(TUTORIAL_STEPS[0]);
    
    setView('GAME');
    setHandViewMode('CATEGORIES');
    setHandCategory('CHARGE');

    const myId = user?.uid || 'me';

    setGameState({
      status: 'PLAYING',
      turn: 1,
      matchCount: 1, 
      hostId: myId,
      logs: [{ turn: 1, text: lang === 'zh' ? "教程开始" : "Tutorial Started", type: 'info' }],
      players: [
        {
          id: myId, // <--- This must match user.uid
          name: playerName || 'Player',
          avatar: playerAvatar,
          isBot: false,
          hp: 2,
          energy: 0,
          isDead: false,
          inventory: [0], 
          layer: 0,
          tempLayerMod: 0,
          selectedCardId: null,
          lastCardId: null,
          lastAction: null,
          freeSkills: [],
          disabledSkills: [],
          kills: 0,
          tempSkills: []
        },
        {
          id: 'dummy_bot',
          name: lang === 'zh' ? '训练假人' : 'Training Dummy',
          isBot: true,
          hp: 2,
          energy: 0,
          isDead: false,
          inventory: [0],
          layer: 0,
          tempLayerMod: 0,
          selectedCardId: 'charge', 
          lastCardId: null,
          lastAction: null,
          freeSkills: [],
          kills: 0
        }
      ]
    });
  };

  const handleTutorialAction = (cardId: string) => {
    // 1. Cleanup Tooltips
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredCard(null);
    setTooltipPos(null);

    const currentLesson = TUTORIAL_STEPS[tutorialStep];
    
    // 2. Validation with Localized Toasts
    if (!currentLesson.allowed.includes(cardId)) {
      playSound('click', muted);
      setToastMsg(lang === 'zh' ? "请按提示操作！打出正确的卡牌。" : "Follow the instructions! Play the correct card.");
      return;
    }

    const card = SKILL_DB.find(c => c.id === cardId)!;
    const me = gameState.players[0];
    
    if (me.energy < card.cost) {
      setToastMsg(lang === 'zh' ? "能量不足！" : "Not enough energy!");
      return;
    }

    // 3. TRIGGER SHOWDOWN
    playSound('confirm', muted); 
    setGameState(prev => ({
      ...prev,
      status: 'SHOWDOWN',
      players: [
         { ...prev.players[0], selectedCardId: cardId },
         { ...prev.players[1] } 
      ]
    }));

    // 4. WAIT FOR SLAM
    setTimeout(() => {
        const nextStep = tutorialStep + 1;

        // 🟢 LOCALIZED COMPLETION MESSAGE
        const nextMsg = nextStep < TUTORIAL_STEPS.length
          ? TUTORIAL_STEPS[nextStep] 
          : { 
              title: { zh: "教程完成！", en: "Tutorial Complete!" }, 
              sub: { zh: "你已准备好面对真正的战斗！", en: "You are ready for the real battle!" } 
            };

        const newPlayers = JSON.parse(JSON.stringify(gameState.players));
        const myPlayer = newPlayers[0];
        const bot = newPlayers[1];

        const botActionId = currentLesson.setup.botAction;
        const botCard = SKILL_DB.find(c => c.id === botActionId);

        myPlayer.lastCardId = cardId;
        if (card.type === 'CHARGE') myPlayer.energy += 2;
        else myPlayer.energy -= card.cost;

        if (botCard) {
            if (botCard.type === 'CHARGE') {
                bot.energy += 2;
            } 
            else {
                bot.energy = Math.max(0, bot.energy - botCard.cost);
            }
        }

        // --- Determine Winner Visuals for Tutorial ---
        if ([1, 3, 4, 6, 9].includes(currentLesson.id)) {
           bot.hp = 0; 
           bot.isDead = true; 
           playSound('win', muted); 
        } else if (currentLesson.id === 2 || currentLesson.id === 8) {
           playSound('combat', muted); 
        } else {
           playSound('draw', muted); 
        }

        setGameState(prev => ({
          ...prev,
          status: 'PLAYING', 
          players: newPlayers,
          logs: [{ turn: prev.turn, text: lang === 'zh' ? `教程: 你使用了 ${card.name.zh}` : `Tutorial: You used ${card.name.en}`, type: 'combat' }]
        }));

        setTimeout(() => {
          if (nextStep >= TUTORIAL_STEPS.length) {
            playSound('win', muted);
            setIsTutorial(false);
            setView('NAME_INPUT');
          } else {
            const nextLevelData = TUTORIAL_STEPS[nextStep]; 
            
            setTutorialStep(nextStep);
            setTutorialMsg(nextMsg);
            
            // 🟢 UPDATED: ALWAYS RESET TO FOLDER VIEW
            // We no longer auto-open the cards. We let the player choose the folder.
            setHandViewMode('CATEGORIES');
            // Reset category selection so nothing is "open"
            setHandCategory('CHARGE'); 

            // --- INVENTORY SETUP FOR NEXT LEVEL ---
            let newInventory = [0];
            
            if (nextStep === 4) newInventory = [0, 3];
            if (nextStep === 5) newInventory = [0];
            if (nextStep === 6) newInventory = [0, 3];
            if (nextStep === 7) newInventory = [0];
            if (nextStep === 8) newInventory = [0, 2];
            if (nextStep === 9) newInventory = [0];
            if (nextStep === 10) newInventory = [0, 2, 5];

            setGameState(prev => ({
              ...prev,
              players: [
                { 
                    ...prev.players[0], 
                    hp: 2, 
                    energy: nextLevelData.setup.energy, 
                    selectedCardId: null, 
                    lastCardId: null, 
                    inventory: newInventory 
                },
                { 
                    ...prev.players[1], 
                    hp: 2, 
                    isDead: false, 
                    energy: nextLevelData.setup.botEnergy, 
                    selectedCardId: nextLevelData.setup.botAction, 
                    lastCardId: null 
                }
              ]
            }));
          }
        }, 2500);

    }, 3000); 
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
    // Set initial position based on Bottom-Left if not already set (only runs once)
    if (leaderboardRef.current) {
       
       // Calculate Y: Window Height - Hand Deck Height (approx 260px) - Padding (20px) - Leaderboard Height
       const elementHeight = leaderboardRef.current.offsetHeight;
       const targetY = window.innerHeight - 280 - elementHeight;

       setDragPosition(current => current.x === 25 && current.y === 50
         ? { x: 20, y: Math.max(20, targetY) } : current);
    }

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

  const [activeAnimations, setActiveAnimations] = useState<{[key: string]: string}>({});
  const [damageNumbers, setDamageNumbers] = useState<{[key: string]: number}>({});
  const prevPlayersRef = useRef<Player[]>([]);
  
  const [showdownAnim, setShowdownAnim] = useState(false);
  const [slamAnim, setSlamAnim] = useState(false);

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

  const t = TEXT[lang]; 
  const [emojiMenuOpen, setEmojiMenuOpen] = useState(false);

  const myPlayer = gameState.players.find((p: Player) => p.id === (user?.uid || 'me'));
  const knownCards = myPlayer ? getPlayerCards(myPlayer, gameState.players) : [];

  const [revengeCardId, setRevengeCardId] = useState<string | null>(null);
  const prevMatchCountRef = useRef(gameState.matchCount);

  // 2. Watch for New Match & Temp Skills
  useEffect(() => {
    // Detect if match count increased (New Game Started)
    if (gameState.matchCount > prevMatchCountRef.current) {
       const me = gameState.players.find(p => p.id === user?.uid);
       // If I have a temp skill at the start of the round, it's a Revenge Card
       if (me && me.tempSkills && me.tempSkills.length > 0) {
          setRevengeCardId(me.tempSkills[0]); // Show the first one
          playSound('win', muted); // Play a sound!
       }
    }
    // Update ref
    prevMatchCountRef.current = gameState.matchCount;
  }, [gameState.matchCount, gameState.players, user?.uid, muted]);

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

  useEffect(() => {
    if (gameState.status === 'SHOWDOWN') {
      // 先重置
      setShowdownAnim(false);
      setSlamAnim(false);

      // 先让牌从玩家飞到小桌子
      setTimeout(() => {
        setShowdownAnim(true);

        // 0.5s 后再让最强那张牌 slam 到中心
        setTimeout(() => {
          setSlamAnim(true);
        }, 500);
      }, 50);
    } else {
      setShowdownAnim(false);
      setSlamAnim(false);
    }
  }, [gameState.status]);

  useEffect(() => {
    if (gameState.players.length > 0 && prevPlayersRef.current.length > 0) {
      const newAnims: {[key: string]: string} = {};
      const newDamages: {[key: string]: number} = {};
      let hasFx = false;

      gameState.players.forEach(p => {
        const oldP = prevPlayersRef.current.find(op => op.id === p.id);
        if (oldP) {
          if (p.hp < oldP.hp) {
            const diff = oldP.hp - p.hp; // 变成正数 1 / 2
            if (diff > 0) {
              newAnims[p.id] = 'shake';
              newDamages[p.id] = diff;
              hasFx = true;
            }
          }
          if (p.lastCardId && p.lastCardId !== oldP.lastCardId) {
             const card = SKILL_DB.find(c => c.id === p.lastCardId);
             if (card) {
               if (card.type === 'ATTACK') newAnims[p.id] = 'slash';
               else if (card.type === 'DEFEND') newAnims[p.id] = 'shield';
               else if (card.type === 'ULTIMATE') newAnims[p.id] = 'ultimate';
               else if (card.type === 'CHARGE') newAnims[p.id] = 'charge';
               hasFx = true;
             }
          }
        }
      });

      if (hasFx) {
        setActiveAnimations(newAnims);
        setDamageNumbers(newDamages);
        setTimeout(() => {
          setActiveAnimations({});
          setDamageNumbers({});
        }, 1000);
      }
    }
    prevPlayersRef.current = gameState.players;
  }, [gameState.players]);

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
    const rect = e.currentTarget.getBoundingClientRect();
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
    setIsOnline(false);
    setIsTutorial(false);
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
    if (isTutorial || !isOnline || gameState.status !== 'SHOWDOWN' || gameState.hostId !== user?.uid) return;
    const round = { turn: gameState.turn, matchCount: gameState.matchCount };
    const timer = setTimeout(() => {
      void mutateRoom(roomCode, room => settleRoom(room, user.uid, round, lang)).catch(error => {
        console.error('Unable to settle round', error);
        setToastMsg(firebaseErrorMessage(error, lang));
      });
    }, 2000);
    return () => clearTimeout(timer);
  }, [gameState.status, gameState.hostId, gameState.turn, gameState.matchCount, user, roomCode, lang, isTutorial, isOnline]);

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
    const botCount = gameState.players.filter((p: Player) => p.isBot).length;
    const newBot: Player = {
      id: `bot_${Date.now()}_${botCount}`,
      name: `Bot ${botCount + 1}`,
      isBot: true,
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
    if (!user) return;
    try {
      await mutateRoom(roomCode, room => {
        if (room.hostId !== user.uid || room.status !== 'LOBBY') return null;
        return joinPlayer(room, newBot);
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

  // --- LAYOUT HELPERS ---
  const getPlayerPosition = (index: number, total: number, myIndex: number) => {
    if (total === 0) return { x: 50, y: 50 };
    const step = 360 / total;
    const angleDeg = 90 + (index - myIndex) * step;
    const angleRad = (angleDeg * Math.PI) / 180;
    const rx = 42; 
    const ry = 35;
    return { 
      x: 50 + rx * Math.cos(angleRad), 
      y: 50 + ry * Math.sin(angleRad) 
    };
  };

  const getMiniTablePosition = (index: number, total: number, myIndex: number) => {
    if (total === 0) return { x: 50, y: 45 };
    const step = 360 / total;
    const angleDeg = 90 + (index - myIndex) * step;
    const angleRad = (angleDeg * Math.PI) / 180;
    const rx = 12; 
    const ry = 12; 
    return { 
      x: 50 + rx * Math.cos(angleRad), 
      y: 50 + ry * Math.sin(angleRad) 
    };
  };
  
  const renderShowdownCard = (cardId: string | null) => {
    const card = SKILL_DB.find((c) => c.id === cardId);
    if (!card) return null;

    let borderColor = 'border-slate-500';
    if (card.type === 'ATTACK') borderColor = 'border-red-500';
    if (card.type === 'DEFEND') borderColor = 'border-blue-500';
    if (card.type === 'ULTIMATE') borderColor = 'border-purple-500';
    if (card.type === 'CHARGE') borderColor = 'border-yellow-500';
    const isCombo = card.tags?.includes('combo');
    if (isCombo) {
      borderColor = 'border-yellow-300';
    }

    return (
      <div className={`
        w-24 h-36 md:w-32 md:h-48
        bg-slate-900/95 rounded-xl border-2 ${borderColor}
        flex flex-col items-center justify-center p-2 text-center shadow-2xl
        ring-2 ring-white/10 relative overflow-hidden transform
        ${card.tags?.includes('combo') ? 'shadow-[0_0_30px_rgba(250,204,21,0.9)]' : ''}
      `} onMouseEnter={(e) => handleMouseEnter(e, card.id)} onMouseLeave={handleMouseLeave}>
         <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
         
         {/* STATS BADGES (Level Only) - TOP LEFT */}
         <div className="absolute top-2 left-2 flex flex-col items-start gap-1 pointer-events-none z-20">
            {/* Level Badge */}
            {card.levelRequired > 0 && card.levelRequired < 100 && (
              <div className="text-xs font-mono font-bold text-yellow-400 bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-md border border-yellow-500/30 shadow-sm">
                Lv.{card.levelRequired}
              </div>
            )}
         </div>

         {/* COST - TOP RIGHT */}
         <div className="absolute top-1 right-2 text-lg font-mono font-black text-white/90 drop-shadow-md z-20">
           {card.cost}
         </div>

         <div className="mb-2 transform scale-125 relative z-10">{getCardIcon(card.id)}</div>
         <div className={`text-xs md:text-sm font-bold line-clamp-2 text-white relative z-10`}>{card.name[lang]}</div>
      </div>
    );
  };

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
    <div className="min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      
      {/* ================= BACKGROUND LAYERS ================= */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#020617] z-0" />

      {/* Retro Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(rgba(234, 88, 12, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(234, 88, 12, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 100%)'
        }}
      />

      {/* 🃏 3D EXPLODING CARDS BACKGROUND 🃏 */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ perspective: '1200px' }}>
      {BACKGROUND_CARDS.map((item) => {
        if (!item) return null;

        let borderColor = 'border-slate-600';
        let bgGradient = 'bg-slate-800';
        if (item.card.type === 'ATTACK') { borderColor = 'border-red-500'; bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900'; }
        else if (item.card.type === 'DEFEND') { borderColor = 'border-blue-500'; bgGradient = 'bg-gradient-to-b from-blue-900 to-slate-900'; }
        else if (item.card.type === 'ULTIMATE') { borderColor = 'border-purple-500'; bgGradient = 'bg-gradient-to-b from-purple-900 to-slate-900'; }
        else if (item.card.type === 'CHARGE') { borderColor = 'border-yellow-500'; bgGradient = 'bg-gradient-to-b from-yellow-900 to-slate-900'; }
        else { borderColor = 'border-emerald-500'; bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900'; }

        return (
          <div 
            key={item.id}
            className="absolute w-24 h-36 md:w-32 md:h-48 flex flex-col items-center justify-center"
            style={{
              top: `${item.top}%`,
              left: `${item.left}%`,
              
              // Use 'item.z' instead of 'Math.random() * 500'
              transform: `translate3d(-50%, -50%, -${item.z}px) rotateX(${item.rX}deg) rotateY(${item.rY}deg) rotateZ(${item.rZ}deg) scale(${item.scale})`,
              
              animation: `zero-gravity ${item.duration}s ease-in-out infinite alternate`,
              animationDelay: `${item.delay}s`
            }}
          >
              {/* Inner Card Wrapper with Effect */}
              <div className={`
                w-full h-full rounded-xl border-2 ${borderColor} shadow-2xl relative
                flex flex-col items-center justify-center
                opacity-50 blur-[1px]
                ${item.effect || ''}
            `}>
                <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                <div className="relative z-10 transform scale-75 opacity-80 grayscale contrast-125">
                    {getCardIcon(item.card.id)}
                </div>
            </div>
          </div>
        );
      })}
      </div>

      {/* 🔥 FIRE SPARKS (EMBERS) 🔥 */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 5;
          const duration = 3 + Math.random() * 4;
          const size = 2 + Math.random() * 4;
          return (
            <div
              key={i}
              className="absolute rounded-full bg-orange-400 opacity-0"
              style={{
                left: `${left}%`,
                top: '100%',
                width: `${size}px`,
                height: `${size}px`,
                boxShadow: `0 0 ${size * 2}px rgba(234, 88, 12, 0.8)`,
                animation: `ember-rise ${duration}s linear infinite`,
                animationDelay: `-${delay}s`,
              }}
            />
          );
        })}
      </div>

      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[120px] rounded-full animate-pulse delay-1000 z-0" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full z-0" />
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)] z-0 pointer-events-none" />

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
      />

      {/* ================= STYLES ================= */}
      <style>{`
        @keyframes liquid-flow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes float-bob { 0%, 100% { transform: perspective(500px) rotateX(5deg) translateY(0); } 50% { transform: perspective(500px) rotateX(5deg) translateY(-15px); } }
        @keyframes neon-pulse-fire { 0%, 100% { filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.4)); } 50% { filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 5px rgba(253, 224, 71, 0.4)); } }
        @keyframes dragon-fire { 0%, 100% { filter: drop-shadow(0 0 10px rgba(220, 38, 38, 0.5)) brightness(1); } 50% { filter: drop-shadow(0 0 30px rgba(234, 179, 8, 0.8)) brightness(1.15); } }
        @keyframes ember-rise { 0% { transform: translateY(0) scale(1); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(-100vh) scale(0); opacity: 0; } }
        
        @keyframes zero-gravity {
          0% { margin-top: 0px; margin-left: 0px; }
          100% { margin-top: 20px; margin-left: 10px; }
        }

        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .spin-slow { animation: spin-slow 10s linear infinite; }

        @keyframes flip-slow {
          0% { transform: perspective(600px) rotateY(0deg); }
          50% { transform: perspective(600px) rotateY(180deg); }
          100% { transform: perspective(600px) rotateY(360deg); }
        }
        .flip-slow { animation: flip-slow 6s ease-in-out infinite; transform-style: preserve-3d; }

        .shine-slow { position: relative; overflow: hidden; }
        .shine-slow::after {
          content: ''; position: absolute; top: 0; left: -150%; width: 100%; height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-20deg);
          animation: shine-move 4s infinite;
        }
        @keyframes shine-move {
          0% { left: -150%; }
          20% { left: 150%; }
          100% { left: 150%; }
        }
        
        @keyframes glow-pulse {
          0%, 100% { 
            box-shadow: 0 0 5px rgba(255, 255, 255, 0.1); 
            filter: brightness(1);
          }
          50% { 
            box-shadow: 0 0 30px rgba(255, 255, 255, 0.6); 
            filter: brightness(1.3);
            border-color: rgba(255, 255, 255, 0.8);
          }
        }
        .glow-pulse {
          animation: glow-pulse 3s ease-in-out infinite;
        }

        .super-title {
          font-family: 'Arial Black', 'Impact', sans-serif;
          font-weight: 900;
          background: linear-gradient(90deg, #7f1d1d 0%, #ea580c 25%, #facc15 45%, #ffffff 50%, #facc15 55%, #ea580c 75%, #7f1d1d 100%);
          background-size: 200% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          -webkit-text-stroke: 6px #0f172a; 
          paint-order: stroke fill;
          animation: liquid-flow 3s linear infinite, float-bob 6s ease-in-out infinite, neon-pulse-fire 3s ease-in-out infinite;
        }
      `}</style>


      {/* ================= CONTENT ================= */}
      <div className="relative z-10 flex flex-col items-center gap-16 -mt-10 w-full max-w-lg px-4 animate-in fade-in zoom-in duration-700">
        
        {/* --- TITLE AREA --- */}
        <div className="flex flex-col items-center relative group">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/10 blur-[60px] rounded-full pointer-events-none animate-pulse" />
          <img 
            src={assetUrl('babydragtitle.png')}
            alt="Baby Dragon"
            className="w-[500px] h-[500px] md:w-[900px] md:h-[900px] object-contain relative z-20 mb-[-350px] pointer-events-none"
            style={{ 
              animation: 'float-bob 6s ease-in-out infinite, dragon-fire 3s ease-in-out infinite',
              animationDelay: '-1s' 
            }} 
          />
          <h1 className="text-7xl md:text-9xl font-black tracking-wider super-title select-none scale-110 md:scale-125 relative z-10">
            {t.title}
          </h1>
        </div>

        {/* --- INPUT AREA --- */}
        <div className="w-full flex flex-col items-center gap-10 mt-2">
            <div className="flex flex-col items-center gap-8 w-full">
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
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-slate-900/95 border border-slate-700 p-4 rounded-2xl shadow-2xl grid grid-cols-4 gap-3 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 z-[100]">
                {AVATAR_OPTIONS.map((path) => (
                  <button
                    key={path}
                    onClick={() => {
                      playSound('confirm', muted);
                      setPlayerAvatar(path);
                      setIsAvatarMenuOpen(false);
                    }}
                    className={`
                      aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-110
                      ${playerAvatar === path ? 'border-orange-500 ring-2 ring-orange-500/50' : 'border-slate-600 hover:border-white'}
                    `}
                  >
                    <img src={path} className="w-full h-full object-cover" alt="choice" />
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
            <button 
              onClick={handleEnterName} 
              disabled={!playerName.trim()} 
              className="group relative w-full max-w-xs overflow-hidden rounded-xl bg-gradient-to-r from-orange-600 to-red-600 p-4 transition-all hover:scale-105 active:scale-95 hover:shadow-[0_0_40px_rgba(220,38,38,0.6)] disabled:opacity-0 disabled:pointer-events-none duration-300"
            >
              <div className="relative w-full flex items-center justify-center gap-2">
                <span className="text-2xl font-black text-white uppercase tracking-wider drop-shadow-md">{t.enterLobby}</span>
                <div className="bg-white/20 p-1 rounded-full flex-shrink-0"><ArrowUp className="rotate-90 text-white" size={20} strokeWidth={3} /></div>
              </div>
              <div className="absolute inset-0 bg-white/30 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500 skew-x-12" />
            </button>

            <button 
              onClick={startTutorial} 
              className="mt-6 group relative px-6 py-2 overflow-hidden rounded-full bg-slate-800/50 border border-slate-600 hover:border-green-400 transition-all duration-300"
            >
              <div className="flex items-center gap-2 relative z-10">
                <div className="bg-green-500/20 p-1.5 rounded-full group-hover:bg-green-500 group-hover:text-black transition-colors">
                  <HandHeart size={16} className="text-green-400 group-hover:text-black" />
                </div>
                <span className="text-sm font-bold text-slate-300 group-hover:text-white tracking-widest uppercase">
                  {lang === 'zh' ? '新手教程' : 'Tutorial'}
                </span>
              </div>
            </button>

        </div>
      </div>
    </div>
  );

  if (view === 'HOME') return (
    <div className="min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      
      {/* ================= BACKGROUND EFFECTS ================= */}
      <style>{`
        @keyframes liquid-flow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes float-bob { 0%, 100% { transform: perspective(500px) rotateX(5deg) translateY(0); } 50% { transform: perspective(500px) rotateX(5deg) translateY(-15px); } }
        @keyframes neon-pulse-fire { 0%, 100% { filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.4)); } 50% { filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 5px rgba(253, 224, 71, 0.4)); } }
        @keyframes zero-gravity { 0% { margin-top: 0px; margin-left: 0px; } 100% { margin-top: 20px; margin-left: 10px; } }
        
        /* Card Effects */
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-slow { animation: spin-slow 10s linear infinite; }
        @keyframes flip-slow { 0% { transform: perspective(600px) rotateY(0deg); } 50% { transform: perspective(600px) rotateY(180deg); } 100% { transform: perspective(600px) rotateY(360deg); } }
        .flip-slow { animation: flip-slow 6s ease-in-out infinite; transform-style: preserve-3d; }
        .shine-slow { position: relative; overflow: hidden; }
        .shine-slow::after { content: ''; position: absolute; top: 0; left: -150%; width: 100%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%); transform: skewX(-20deg); animation: shine-move 4s infinite; }
        @keyframes shine-move { 0% { left: -150%; } 20% { left: 150%; } 100% { left: 150%; } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.1); filter: brightness(1); } 50% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.6); filter: brightness(1.3); border-color: rgba(255, 255, 255, 0.8); } }
        .glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
      `}</style>

      {/* Dark Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#020617] z-0" />

      {/* Retro Grid (Orange) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(234, 88, 12, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 88, 12, 0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 100%)'
        }}
      />

      {/* 3D Exploding Cards (Floating in background) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ perspective: '1200px' }}>
        {BACKGROUND_CARDS.map((item) => {
          if (!item) return null;
          // Note: We keep original card colors (Red/Blue/Purple) to represent game mechanics
          let borderColor = 'border-slate-600';
          let bgGradient = 'bg-slate-800';
          if (item.card.type === 'ATTACK') { borderColor = 'border-red-500'; bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900'; }
          else if (item.card.type === 'DEFEND') { borderColor = 'border-blue-500'; bgGradient = 'bg-gradient-to-b from-blue-900 to-slate-900'; }
          else if (item.card.type === 'ULTIMATE') { borderColor = 'border-purple-500'; bgGradient = 'bg-gradient-to-b from-purple-900 to-slate-900'; }
          else if (item.card.type === 'CHARGE') { borderColor = 'border-yellow-500'; bgGradient = 'bg-gradient-to-b from-yellow-900 to-slate-900'; }
          else { borderColor = 'border-emerald-500'; bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900'; }

          return (
            <div key={item.id} className="absolute w-24 h-36 md:w-32 md:h-48 flex flex-col items-center justify-center"
              style={{
                top: `${item.top}%`,
                left: `${item.left}%`,
                transform: `translate3d(-50%, -50%, -${item.z}px) rotateX(${item.rX}deg) rotateY(${item.rY}deg) rotateZ(${item.rZ}deg) scale(${item.scale})`,
                animation: `zero-gravity ${item.duration}s ease-in-out infinite alternate`,
                animationDelay: `${item.delay}s`
              }}
            >
              <div className={`w-full h-full rounded-xl border-2 ${borderColor} shadow-2xl relative flex flex-col items-center justify-center opacity-50 blur-[1px] ${item.effect || ''}`}>
                  <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                  <div className="relative z-10 transform scale-75 opacity-80 grayscale contrast-125">{getCardIcon(item.card.id)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ambient Glows (Orange/Red) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[120px] rounded-full animate-pulse delay-1000 z-0" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)] z-0 pointer-events-none" />

      {/* ================= MAIN CONTENT ================= */}
      
      <TopControls muted={muted} toggleMute={toggleMute} lang={lang} toggleLang={toggleLang} logOpen={logOpen} toggleLog={() => setLogOpen(o => !o)} musicVolume={musicVolume} setMusicVolume={setMusicVolume}/>
      
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 font-bold tracking-wide animate-in slide-in-from-top-4">
          <CheckCircle size={20} /> {toastMsg}
        </div>
      )}

      {/* UI Container */}
      <div className="w-full max-w-md relative z-10">
        
        {/* 🎨 CHANGED: Glow Behind Box (Orange) */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/20 blur-[100px] rounded-full pointer-events-none" />

        <div className="relative backdrop-blur-xl rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden p-8 md:p-10 flex flex-col gap-8 animate-in fade-in zoom-in duration-300">
            
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
    <div className="min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex flex-col items-center justify-center font-sans selection:bg-orange-500/30">
      
      {/* ================= BACKGROUND EFFECTS ================= */}
      <style>{`
        @keyframes liquid-flow { 0% { background-position: 0% 50%; } 100% { background-position: 200% 50%; } }
        @keyframes float-bob { 0%, 100% { transform: perspective(500px) rotateX(5deg) translateY(0); } 50% { transform: perspective(500px) rotateX(5deg) translateY(-15px); } }
        @keyframes neon-pulse-fire { 0%, 100% { filter: drop-shadow(0 0 5px rgba(234, 88, 12, 0.4)); } 50% { filter: drop-shadow(0 0 20px rgba(220, 38, 38, 0.6)) drop-shadow(0 0 5px rgba(253, 224, 71, 0.4)); } }
        @keyframes zero-gravity { 0% { margin-top: 0px; margin-left: 0px; } 100% { margin-top: 20px; margin-left: 10px; } }
        
        /* Card Effects */
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-slow { animation: spin-slow 10s linear infinite; }
        @keyframes flip-slow { 0% { transform: perspective(600px) rotateY(0deg); } 50% { transform: perspective(600px) rotateY(180deg); } 100% { transform: perspective(600px) rotateY(360deg); } }
        .flip-slow { animation: flip-slow 6s ease-in-out infinite; transform-style: preserve-3d; }
        .shine-slow { position: relative; overflow: hidden; }
        .shine-slow::after { content: ''; position: absolute; top: 0; left: -150%; width: 100%; height: 100%; background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0) 100%); transform: skewX(-20deg); animation: shine-move 4s infinite; }
        @keyframes shine-move { 0% { left: -150%; } 20% { left: 150%; } 100% { left: 150%; } }
        @keyframes glow-pulse { 0%, 100% { box-shadow: 0 0 5px rgba(255, 255, 255, 0.1); filter: brightness(1); } 50% { box-shadow: 0 0 30px rgba(255, 255, 255, 0.6); filter: brightness(1.3); border-color: rgba(255, 255, 255, 0.8); } }
        .glow-pulse { animation: glow-pulse 3s ease-in-out infinite; }
      `}</style>

      {/* Dark Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#020617] z-0" />

      {/* Retro Grid (Orange) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(234, 88, 12, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 88, 12, 0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 100%)'
        }}
      />

      {/* 3D Exploding Cards */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ perspective: '1200px' }}>
        {BACKGROUND_CARDS.map((item) => {
          if (!item) return null;
          let borderColor = 'border-slate-600';
          let bgGradient = 'bg-slate-800';
          if (item.card.type === 'ATTACK') { borderColor = 'border-red-500'; bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900'; }
          else if (item.card.type === 'DEFEND') { borderColor = 'border-blue-500'; bgGradient = 'bg-gradient-to-b from-blue-900 to-slate-900'; }
          else if (item.card.type === 'ULTIMATE') { borderColor = 'border-purple-500'; bgGradient = 'bg-gradient-to-b from-purple-900 to-slate-900'; }
          else if (item.card.type === 'CHARGE') { borderColor = 'border-yellow-500'; bgGradient = 'bg-gradient-to-b from-yellow-900 to-slate-900'; }
          else { borderColor = 'border-emerald-500'; bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900'; }

          return (
            <div key={item.id} className="absolute w-24 h-36 md:w-32 md:h-48 flex flex-col items-center justify-center"
              style={{
                top: `${item.top}%`,
                left: `${item.left}%`,
                transform: `translate3d(-50%, -50%, -${item.z}px) rotateX(${item.rX}deg) rotateY(${item.rY}deg) rotateZ(${item.rZ}deg) scale(${item.scale})`,
                animation: `zero-gravity ${item.duration}s ease-in-out infinite alternate`,
                animationDelay: `${item.delay}s`
              }}
            >
              <div className={`w-full h-full rounded-xl border-2 ${borderColor} shadow-2xl relative flex flex-col items-center justify-center opacity-50 blur-[1px] ${item.effect || ''}`}>
                  <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                  <div className="relative z-10 transform scale-75 opacity-80 grayscale contrast-125">{getCardIcon(item.card.id)}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[120px] rounded-full animate-pulse delay-1000 z-0" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)] z-0 pointer-events-none" />


      {/* ================= LOBBY CONTENT ================= */}
      
      <TopControls muted={muted} toggleMute={toggleMute} lang={lang} toggleLang={toggleLang} logOpen={logOpen} toggleLog={() => setLogOpen(o => !o)} showLogToggle={false} musicVolume={musicVolume} setMusicVolume={setMusicVolume}/>
      
      {toastMsg && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl z-[100] flex items-center gap-2 animate-in slide-in-from-top-4 font-bold tracking-wide">
          <CheckCircle size={20} /> {toastMsg}
        </div>
      )}

      {/* Main Lobby Container */}
      <div className="w-full max-w-5xl backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-orange-500/20 relative flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300 z-10">
        
        {/* Header Section */}
        <div className="px-8 pt-8 pb-2 md:px-10 md:pt-10 md:pb-2 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Active Players */}
                {gameState.players.map((p, i) => (
                  <div key={i} className="relative group">
                      {/* 🎨 CHANGED: Hover Glow to Orange */}
                      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="relative bg-slate-800 border border-slate-700 p-4 rounded-2xl flex items-center gap-4 shadow-sm group-hover:border-orange-500/50 transition-colors">
                          <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center relative shadow-md">
                            {/* Avatar Helper */}
                            {renderProfileAvatar(p.avatar, 48)}
                            
                            {p.id === gameState.hostId && (
                              <div className="absolute -top-2 -right-2 bg-slate-900 rounded-full p-1 border border-slate-700 z-10">
                                  <Crown size={14} className="text-yellow-400 fill-yellow-400" />
                              </div>
                            )}
                          </div>
                          <div className="overflow-hidden">
                            <div className="font-bold text-slate-200 truncate">{p.name}</div>
                            <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{p.isBot ? 'BOT' : 'PLAYER'}</div>
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
  const myIndex = gameState.players.findIndex(p => p.id === user?.uid);
  const totalPlayers = gameState.players.length;
  
  // --- UPDATED ANIMATION STYLE (With Random Tilt) ---
  const smashStyle = `
    @keyframes smash-drop {
      /* 1. 起始状态 */
      0% {
        transform: translate(-50%, -50%) scale(0.5) rotateX(0deg) rotate(0deg);
        opacity: 0;
      }
      
      /* 2. 蓄力抬起 (LIFT): 
         持续到 60%，时间很长，营造“举起来”的沉重感。
         rotateX(-60deg): 上宽下窄（梯形）。
         timing-function: cubic-bezier... 让它在最高点有明显的“滞空”感。
      */
      60% {
        transform: translate(-50%, -180%) scale(1.6) perspective(1000px) rotateX(-60deg) rotate(var(--slam-tilt));
        opacity: 1;
        animation-timing-function: cubic-bezier(0.25, 1, 0.5, 1); /* 慢慢停在最高点 */
      }

      /* 3. 瞬间砸下 (IMPACT): 
         从 60% 到 70% 瞬间完成，极快！
         rotateX(0deg): 拍平。
      */
      70% {
        transform: translate(-50%, -50%) scale(1.8) perspective(1000px) rotateX(0deg) rotate(var(--slam-tilt));
      }

      /* 4. 回弹 (Recoil): 稍微压扁一点 */
      85% {
        transform: translate(-50%, -50%) scale(1.75) perspective(1000px) rotateX(0deg) rotate(var(--slam-tilt));
      }

      /* 5. 定格 */
      100% {
        transform: translate(-50%, -50%) scale(1.8) perspective(1000px) rotateX(0deg) rotate(var(--slam-tilt));
      }
    }
    
    .animate-smash {
      /* 总时长设为 0.75秒，给前面的抬起动作足够的时间展示 */
      animation: smash-drop 0.75s forwards;
    }
  `;

  // 计算当前局获胜者 & 获得的技能
  const livingPlayers = gameState.players.filter((p) => !p.isDead);
  const winnerPlayer =
    gameState.status === 'GAMEOVER' && livingPlayers.length === 1
      ? livingPlayers[0]
      : null;

  
  // 🔥 找出本次 SHOWDOWN 里“最强卡”，用来做 slam 动画
  const slamOwnerIds = gameState.status === 'SHOWDOWN' 
    ? getShowdownWinner(gameState.players) 
    : [];
  

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
    <div className="min-h-screen w-screen bg-[#0f172a] overflow-hidden relative flex justify-center items-start font-sans selection:bg-orange-500/30">

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
        ${smashStyle}
        ${emojiStyle}
        /* REVENGE CARD SPIN ANIMATION */
        @keyframes spin-reveal { 0% { transform: scale(0) rotateY(0deg); opacity: 0; } 20% { transform: scale(0.8) rotateY(0deg); opacity: 1; } 50% { transform: scale(1.1) rotateY(720deg); } 100% { transform: scale(1) rotateY(1080deg); } }
        .animate-card-reveal { animation: spin-reveal 2.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        
        @keyframes text-shine { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
        .animate-text-shine { background-size: 200% auto; animation: text-shine 3s linear infinite; }

        @keyframes tutorial-glow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(250, 204, 21, 0.3);
            border-color: rgba(250, 204, 21, 0.5);
            transform: scale(1.15) translateY(-25px);
          }
          50% {
            box-shadow: 0 0 35px rgba(250, 204, 21, 0.8);
            border-color: rgba(250, 204, 21, 1);
            transform: scale(1.17) translateY(-25px);
          }
        }
        .animate-tutorial-glow {
          animation: tutorial-glow 2s infinite ease-in-out;
        }
          
      `}</style>

      {/* Dark Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0f172a] to-[#020617] z-0" />

      {/* Retro Grid (Orange) */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(rgba(234, 88, 12, 0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(234, 88, 12, 0.3) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
          transform: 'perspective(500px) rotateX(60deg) translateY(100px) scale(2)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 40%, black 100%)'
        }}
      />

      {/* 3D Exploding Cards (Background) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" style={{ perspective: '1200px' }}>
        {BACKGROUND_CARDS.slice(0, 6).map((item) => {
          if (!item) return null;
          let borderColor = 'border-slate-600';
          let bgGradient = 'bg-slate-800';
          if (item.card.type === 'ATTACK') { borderColor = 'border-red-500'; bgGradient = 'bg-gradient-to-b from-red-900 to-slate-900'; }
          else if (item.card.type === 'DEFEND') { borderColor = 'border-blue-500'; bgGradient = 'bg-gradient-to-b from-blue-900 to-slate-900'; }
          else if (item.card.type === 'ULTIMATE') { borderColor = 'border-purple-500'; bgGradient = 'bg-gradient-to-b from-purple-900 to-slate-900'; }
          else if (item.card.type === 'CHARGE') { borderColor = 'border-yellow-500'; bgGradient = 'bg-gradient-to-b from-yellow-900 to-slate-900'; }
          else { borderColor = 'border-emerald-500'; bgGradient = 'bg-gradient-to-b from-emerald-900 to-slate-900'; }

          return (
            <div key={item.id} className="absolute w-24 h-36 md:w-32 md:h-48 flex flex-col items-center justify-center"
              style={{
                top: `${item.top}%`,
                left: `${item.left}%`,
                transform: `translate3d(-50%, -50%, -${item.z}px) rotateX(${item.rX}deg) rotateY(${item.rY}deg) rotateZ(${item.rZ}deg) scale(${item.scale})`,
                animation: `zero-gravity ${item.duration}s ease-in-out infinite alternate`,
                animationDelay: `${item.delay}s`
              }}
            >
               <div className={`w-full h-full rounded-xl border-2 ${borderColor} shadow-2xl relative flex flex-col items-center justify-center opacity-20 blur-[1px] ${item.effect || ''}`}>
                   <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                   <div className="relative z-10 transform scale-75 opacity-80 grayscale contrast-125">{getCardIcon(item.card.id)}</div>
               </div>
            </div>
          );
        })}
      </div>

      {/* Ambient Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-red-600/20 blur-[120px] rounded-full animate-pulse delay-1000 z-0" />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[60%] h-[60%] bg-amber-600/10 blur-[100px] rounded-full z-0" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,#000000_120%)] z-0 pointer-events-none" />

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
        </div>

      </div>

      {toastMsg && <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 font-medium animate-in slide-in-from-top-4"><CheckCircle size={18} /> {toastMsg}</div>}

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
      <div className="flex-1 flex flex-col relative h-screen z-10">

        {/* --- TUTORIAL INSTRUCTION OVERLAY --- */}
        {isTutorial && (
          <div className="absolute top-1/2 -translate-y-1/2 left-1/4 -translate-x-1/2 z-[60] w-full max-w-md px-4 animate-in slide-in-from-left-10 fade-in duration-500 pointer-events-none">
              
              <div className="bg-slate-900/95 border-2 border-yellow-400/50 backdrop-blur-xl rounded-3xl p-8 shadow-[0_0_60px_rgba(250,204,21,0.3)] text-left relative overflow-hidden pointer-events-auto">
                  
                  <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent animate-pulse" />
                  
                  <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-4 drop-shadow-md">
                    {tutorialMsg.title[lang]}
                  </h2>
                  
                  <p className="text-lg text-yellow-100 font-medium leading-relaxed">
                    {tutorialMsg.sub[lang]}
                  </p>

                  <div className="mt-6 flex items-center gap-4 border-t border-white/10 pt-5">
                    <span className="text-sm text-slate-400 uppercase tracking-widest font-bold">
                      {lang === 'zh' ? '敌方意图:' : 'Enemy Intent:'}
                    </span>
                    <div className="scale-90 origin-left">
                        {TUTORIAL_STEPS[tutorialStep]?.setup?.botAction 
                          ? getCardIcon(TUTORIAL_STEPS[tutorialStep].setup.botAction) 
                          : <div className="w-8 h-8 bg-slate-800 rounded animate-pulse" />} 
                    </div>
                  </div>
              </div>
          </div>
        )}

        {/* Mobile Header */}
        <div className="md:hidden p-3 flex justify-between items-center bg-slate-900 border-b border-slate-800 z-50">
          <button onClick={() => leaveRoom()} className="flex items-center gap-1 text-slate-400"><LogOut size={18} /></button>
          <span className="font-mono font-bold text-yellow-500">{roomCode}</span>
          <span className="text-xs bg-indigo-500 px-2 py-1 rounded">M{gameState.matchCount}</span>
        </div>

        {/* ROUND TABLE LAYER */}
        <div className="relative flex-1 w-full overflow-hidden bg-transparent">
           
           {/* Background Table Outline */}
           <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[60%] border-2 border-solid border-slate-600 rounded-[50%] pointer-events-none opacity-30" />
           
           {/* Players */}
           {(() => {
             // 1. Calculate highest level for the "Crown" logic
             const highestLevelInGame = Math.max(0, ...gameState.players.map(p => Math.max(0, ...p.inventory)));
             
             // 2. Shine Animation for Leader
             const shineStyle = `
               @keyframes text-shine {
                 0% { background-position: 200% center; }
                 100% { background-position: -200% center; }
               }
               .animate-text-shine {
                 background-size: 200% auto;
                 animation: text-shine 3s linear infinite;
               }
             `;

             return gameState.players.map((p, i) => {
               const pos = getPlayerPosition(i, totalPlayers, myIndex);
               const isMe = p.id === user?.uid;
               const animClass = activeAnimations[p.id] === 'shake' ? 'animate-[shake_0.5s_ease-in-out]' : '';
               const damageVal = damageNumbers[p.id];

               const pMaxLvl = Math.max(0, ...p.inventory);
               const pDisplayCard = SKILL_DB.find(c => c.levelRequired === pMaxLvl); 
               const isLeader = pMaxLvl > 0 && pMaxLvl === highestLevelInGame;

               return (
                  <div 
                    key={p.id}
                    className={`absolute transition-all duration-700 ease-out z-20 flex flex-col items-center justify-center ${animClass}`}
                    style={{ 
                      left: `${pos.x}%`, 
                      top: `${pos.y}%`, 
                      transform: 'translate(-50%, -50%)'
                    }}
                  >
                    {/* Inject Style Once */}
                    {i === 0 && <style>{shineStyle}</style>}

                    {/* --- A. LEVEL & CROWN STATUS (Floating Top) --- */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center justify-center pointer-events-none whitespace-nowrap">
                       {!isMe && (
                           isLeader ? (
                             <div className="flex flex-row items-center gap-2">
                                <Crown size={20} className="text-yellow-400 fill-yellow-200 animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                                <span className="
                                  text-base md:text-lg font-black tracking-widest uppercase font-mono
                                  bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300
                                  bg-clip-text text-transparent
                                  animate-text-shine
                                  drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
                                ">
                                   LVL {pMaxLvl} {pDisplayCard?.name[lang] || ''}
                                </span>
                             </div>
                           ) : (
                             pMaxLvl > 0 && (
                               <span className="text-sm md:text-base font-bold tracking-wider uppercase font-mono text-slate-400 drop-shadow-md bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/5">
                                  LVL {pMaxLvl} {pDisplayCard?.name[lang] || ''}
                               </span>
                             )
                           )
                       )}
                    </div>

                    {/* --- B. EMOJI BUBBLE --- */}
                    {p.emoji && p.emojiAt && Date.now() - p.emojiAt < 2000 && (
                      <>
                        <style>{emojiStyle}</style>
                        <div 
                          key={p.emojiAt}
                          className="absolute -top-24 left-1/2 -translate-x-1/2 z-[60] pointer-events-none select-none animate-emoji-lifecycle"
                        >
                          <div className="relative">
                            <div className="bg-white text-black px-4 py-3 rounded-2xl shadow-[0_10px_30px_-5px_rgba(0,0,0,0.6)] border-2 border-slate-100 flex items-center justify-center min-w-[4rem]">
                               <span className="text-4xl md:text-5xl leading-none pb-1">{p.emoji}</span>
                            </div>
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-slate-100 rotate-45" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* --- C. AVATAR CIRCLE CONTAINER --- */}
                    <div className="relative">
                      
                        {/* 1. Main Circle Frame */}
                        <div className={`
                          relative w-24 h-24 md:w-32 md:h-32 rounded-full
                          border-[4px] shadow-2xl transition-transform duration-300
                          ${isMe 
                             ? 'border-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.4)] scale-105' 
                             : 'border-slate-700 bg-slate-800 shadow-black/60'}
                          ${p.isDead ? 'grayscale brightness-50 border-red-900' : ''}
                        `}>
                            
                            {/* 2. Image (Full Fill) */}
                            <div className="w-full h-full rounded-full overflow-hidden bg-slate-900 relative z-0">
                                {p.isDead ? (
                                    <div className="w-full h-full flex items-center justify-center bg-red-950/80">
                                      <Skull size={40} className="text-red-500 animate-pulse" />
                                    </div>
                                ) : p.avatar ? (
                                    <img 
                                      src={avatarUrl(p.avatar)}
                                      alt={p.name} 
                                      className="w-full h-full object-cover transform hover:scale-110 transition-transform duration-500" 
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-slate-800">
                                      <User size={40} className="text-slate-500" />
                                    </div>
                                )}
                            </div>

                            {/* 3. Damage Overlay (Red Flash) */}
                            {damageVal && (
                              <>
                                <div className="absolute inset-0 rounded-full bg-red-600/60 animate-pulse z-20 pointer-events-none" />
                                <div className="absolute inset-0 rounded-full border-4 border-red-500/80 animate-[ping_0.4s_ease-out] z-20 pointer-events-none" />
                              </>
                            )}

                            {/* 4. Ready Status (Top Right) */}
                            {!p.isDead && gameState.status !== 'SHOWDOWN' && (
                               <div className="absolute -top-1 -right-1 z-30">
                                  {p.selectedCardId ? (
                                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-green-500 text-white flex items-center justify-center shadow-[0_0_10px_rgba(34,197,94,0.8)] border-[3px] border-slate-900 animate-[bounce_0.8s_infinite]">
                                        <CheckCircle size={16} strokeWidth={3} />
                                     </div>
                                  ) : (
                                     <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center border-[2px] border-slate-600 shadow-lg animate-pulse">
                                        <Loader size={14} className="animate-spin" />
                                     </div>
                                  )}
                               </div>
                            )}

                            {/* 5. Name Badge (Bottom Overlap) */}
                            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-20 w-[140%] flex justify-center">
                                <div className={`
                                  px-3 py-1 rounded-lg text-xs md:text-sm font-bold font-mono tracking-tight
                                  truncate text-center shadow-lg border border-white/10
                                  max-w-[90%]
                                  ${p.isDead 
                                    ? 'bg-red-950 text-red-400 line-through decoration-red-500/50' 
                                    : isMe 
                                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-orange-900/40' 
                                      : 'bg-slate-900/95 text-slate-200'}
                                `}>
                                  {p.name}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* --- D. FLOATING DAMAGE NUMBER --- */}
                    {damageVal && (
                        <div 
                          className="absolute left-1/2 top-1/2 z-50 pointer-events-none whitespace-nowrap"
                          style={{ animation: 'damage-pop-up 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards' }}
                        >
                          <span 
                            className="block text-5xl md:text-6xl font-black text-red-500 italic tracking-tighter"
                            style={{
                              textShadow: '2px 2px 0px #7f1d1d, -1px -1px 0 #fff',
                              WebkitTextStroke: '1.5px white',
                              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                            }}
                          >
                            -{damageVal}
                          </span>
                        </div>
                    )}

                    {/* --- E. STATS BAR (Below Name) --- */ }
                    <div className="mt-6 flex flex-col items-center gap-2 z-10 transition-opacity duration-300">
                        
                        {/* 3a. STATS (Always visible here for everyone) */}
                        <div className="flex gap-2">
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/70 border border-yellow-500/30 backdrop-blur-sm shadow-sm">
                            <Zap size={16} className="text-yellow-400" fill="currentColor" />
                            <span className="text-base font-black text-yellow-300 font-mono leading-none pt-0.5">{p.energy}</span>
                          </div>
                          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/70 border border-sky-500/30 backdrop-blur-sm shadow-sm">
                            <ArrowUp size={16} className="text-sky-400" />
                            <span className="text-base font-black text-sky-300 font-mono leading-none pt-0.5">{p.layer}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/5 shadow-sm">
                          <Heart size={16} className="text-red-500" fill="currentColor" />
                          <div className="w-24 h-3 rounded-full bg-slate-800/80 overflow-hidden border border-white/10 relative">
                             <div className="absolute inset-0 bg-red-900/30" />
                             <div className="h-full bg-gradient-to-r from-red-600 to-red-400" style={{ width: `${Math.max(0, Math.min(100, ((p.hp ?? 0) / (MAX_HP || 1)) * 100))}%`, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }} />
                          </div>
                          <span className="text-sm font-bold text-red-200 min-w-[1ch] pt-0.5">{p.hp}</span>
                        </div>

                        {/* 3b. LEVEL (Shown here ONLY if it is ME) */}
                        {isMe && (
                           <div className="mt-0">
                             {isLeader ? (
                               <div className="flex flex-row items-center gap-2">
                                  <Crown size={20} className="text-yellow-400 fill-yellow-200 animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" />
                                  <span className="
                                    text-base md:text-lg font-black tracking-widest uppercase font-mono
                                    bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-300
                                    bg-clip-text text-transparent
                                    animate-text-shine
                                    drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]
                                  ">
                                     LVL {pMaxLvl} {pDisplayCard?.name[lang] || ''}
                                  </span>
                               </div>
                             ) : (
                               pMaxLvl > 0 && (
                                 <span className="text-sm md:text-base font-bold tracking-wider uppercase font-mono text-slate-400 drop-shadow-md bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/5">
                                    LVL {pMaxLvl} {pDisplayCard?.name[lang] || ''}
                                 </span>
                               )
                             )}
                           </div>
                        )}
                    </div>
                  </div>
               )
             })
           })()}

           {/* Showdown / Card Fly Animation Layer */}
           {gameState.status === 'SHOWDOWN' && (
              <div className="absolute inset-0 pointer-events-none z-30">
                {/* Inject the Animation Keyframes */}
                <style>{smashStyle}</style>

                {gameState.players.map((p, i) => {
                  if (!p.selectedCardId || p.isDead) return null;

                  // Check if this player is in the winners array
                  const isSlamWinner = slamOwnerIds.includes(p.id);
                  const isSlammingActive = isSlamWinner && slamAnim;

                  const startPos = getPlayerPosition(i, totalPlayers, myIndex);
                  const miniPos = getMiniTablePosition(i, totalPlayers, myIndex);

                  // POSITION LOGIC
                  let finalX = showdownAnim ? miniPos.x : startPos.x;
                  let finalY = showdownAnim ? miniPos.y : startPos.y;
                  
                  if (isSlammingActive) {
                    finalX = 50;
                    finalY = 45;
                  }
                  
                  // Calculate tilt individually inside the loop
                  // This ensures each slamming card has a unique random angle
                  let localSlamTilt = 0;
                  if (isSlamWinner) {
                     const seed = p.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + gameState.turn;
                     localSlamTilt = (seed % 80) - 40; // Random between -40 and 40
                  }

                  // ANIMATION CONTROL
                  const transitionClass = isSlammingActive
                    ? 'transition-left transition-top duration-300' 
                    : 'transition-all [transition-duration:1200ms] cubic-bezier(0.34,1.56,0.64,1)';

                  const transformStyle = isSlammingActive
                     ? 'translate(-50%, -50%)' // Let CSS animation handle scale/rotate
                     : `translate(-50%, -50%) scale(${showdownAnim ? 1.0 : 0.0}) rotate(0deg)`;

                  return (
                    <div
                      key={`card-${p.id}`}
                      className={`
                        absolute ${transitionClass}
                        ${isSlammingActive ? 'z-[100] animate-smash' : 'z-30'}
                      `}
                      style={{
                        left: `${finalX}%`,
                        top: `${finalY}%`,
                        transform: transformStyle,
                        opacity: showdownAnim ? 1 : 0,
                        
                        // 🔥 Inject the local tilt variable
                        '--slam-tilt': `${localSlamTilt}deg`, 
                      } as React.CSSProperties} 
                    >
                      <div className="relative group">
                        
                        {/* 💥 IMPACT FX (Flash & Shockwave) */}
                        {isSlammingActive && (
                           <>
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-yellow-100/40 rounded-full blur-2xl animate-[ping_0.4s_linear_1]" />
                             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[105%] h-[105%] bg-black/30 blur-md rounded-full -z-10" />
                           </>
                        )}

                        {/* THE CARD */}
                        <div className={`
                          relative
                          ${isSlammingActive ? 'shadow-[0_20px_60px_rgba(0,0,0,0.9)]' : ''}
                        `}>
                           {renderShowdownCard(p.selectedCardId)}
                        </div>

                        {/* Name Tag */}
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] bg-black/60 px-2 rounded-full text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                          {p.name}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}

           {/* Center "VS" Text when animating */}
           {gameState.status === 'SHOWDOWN' && !showdownAnim && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-8xl font-black text-white/5 animate-pulse">VS</div>
           )}

           {(music.status === 'blocked' || music.status === 'error') && (
             <button type="button" onClick={music.retry}
               className="fixed top-20 right-4 z-[100] rounded-xl bg-slate-900/95 border border-amber-500/60 px-4 py-2 text-sm text-amber-200">
               {music.status === 'blocked'
                 ? (lang === 'zh' ? '点击播放背景音乐' : 'Play background music')
                 : (lang === 'zh' ? '音乐加载失败，点击重试' : 'Music failed to load. Retry')}
             </button>
           )}

           {/* GAME OVER OVERLAY */}
           {gameState.status === 'GAMEOVER' && winnerPlayer && (
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
                                      {displayWinner.avatar ? (
                                          <img 
                                            src={avatarUrl(displayWinner.avatar)}
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

          {/* 🟢 UPDATED: KILL LEADERBOARD (Draggable + Minimizable) */}
           <div
               ref={leaderboardRef}
               className="fixed z-50 animate-in slide-in-from-left-10 duration-500 pointer-events-none" 
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
                                   const isMe = p.id === user?.uid;
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
          </div>

        {/* 3. 手牌区 */}
        <div className="h-64 bg-gradient-to-t from-black/30 via-slate-950/10 to-transparent relative z-40 flex flex-col">

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
                    <div className="relative h-[250px] w-full max-w-4xl flex justify-center items-end px-10">
                        
                        {/* MODE 1: CATEGORY SELECTION (FOLDERS) */}
                        {handViewMode === 'CATEGORIES' && (
                          categories.map((cat, index) => {
                            const total = categories.length;
                            const middle = (total - 1) / 2;
                            const offset = index - middle;
                            const rotateDeg = offset * 4;
                            const translateY = Math.abs(offset) * 6;
                            const translateX = offset * 120;

                            // --- TUTORIAL SUGGESTION LOGIC ---
                            let isSuggested = false;
                            if (isTutorial) {
                                const allowedIds = TUTORIAL_STEPS[tutorialStep].allowed;
                                if (cat === 'CHARGE' && allowedIds.includes('charge')) isSuggested = true;
                                if (cat === 'DEFEND' && (allowedIds.includes('defend') || allowedIds.includes('smallfly'))) isSuggested = true;
                                if (cat === 'ATTACK' && allowedIds.some(id => ['hong','hong2','dragonclaw','madian','liuke'].includes(id))) isSuggested = true;
                                if (cat === 'ULTIMATE' && allowedIds.some(id => ['ka','ji','fireclaw','kajifen'].includes(id))) isSuggested = true;
                                if (cat === 'SPECIAL' && allowedIds.includes('doublewing')) isSuggested = true;
                            }
                            // ---------------------------------

                            const isChargeDisabled = 
                              cat === 'CHARGE' && (myPlayer?.disabledSkills || []).includes('charge');

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
                            const standardClasses = `transition-all duration-300 ease-out hover:z-50 hover:scale-110 hover:-translate-y-16 hover:rotate-0 ${hoverGlowClass}`;
                            const suggestedClasses = `z-50 shadow-[0_0_50px_rgba(255,255,255,0.6)] ring-4 ring-white animate-pulse`;
                            const entranceAnim = isSuggested ? '' : 'animate-in slide-in-from-bottom-10 fade-in duration-500';

                            return (
                              <div
                                key={cat}
                                onClick={() => {
                                  if (cat === 'CHARGE') {
                                    if (isChargeDisabled) return;
                                    if (!myPlayer || submittingMove) return; 

                                    const chargeCard = knownCards.find(c => c.id === 'charge');
                                    const canAfford = chargeCard && myPlayer.energy >= chargeCard.cost;

                                    if (canAfford) {
                                      if (isTutorial) {
                                          handleTutorialAction('charge');
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
                                  ${entranceAnim} 
                                  
                                  ${isChargeDisabled
                                      ? 'border-slate-700 grayscale opacity-70 cursor-not-allowed'
                                      : `${borderClass} ${isSuggested ? suggestedClasses : standardClasses}`
                                  }
                                `}
                                style={{
                                  // 🟢 FIX: Transform is stable. If suggested, we force the scale here.
                                  // We removed the 'transition-all' class when isSuggested is true, so this won't jitter.
                                  transform: `
                                    translateX(${translateX}px) 
                                    translateY(${translateY}px) 
                                    rotate(${rotateDeg}deg) 
                                    ${isSuggested ? 'scale(1.15) translateY(-25px)' : ''}
                                  `,
                                  zIndex: isSuggested ? 100 : index,
                                  bottom: '30px',
                                  backgroundColor: '#1a1a1a',
                                }}
                              >
                                <div className={`absolute inset-0 ${bgGradient} opacity-90`} />
                                <div className="absolute inset-0 border border-white/10 rounded-xl pointer-events-none" />
                                
                                {/* Only show shine effect if NOT suggested (to reduce visual noise) */}
                                {!isSuggested && (
                                   <div className="absolute inset-0 bg-white/10 group-hover:translate-x-full transition-transform duration-700 ease-in-out -skew-x-12 origin-left z-10 pointer-events-none" />
                                )}

                                {/* Tutorial Arrow */}
                                {isSuggested && (
                                    <div className="absolute -top-14 left-1/2 -translate-x-1/2 z-[60] animate-bounce">
                                        <ArrowDown size={36} className="text-white drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]" strokeWidth={4} />
                                    </div>
                                )}

                                {isChargeDisabled && (
                                  <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                                    <X className="text-red-500/80 w-24 h-24 drop-shadow-lg" strokeWidth={3} />
                                    <span className="absolute mt-16 text-red-200 font-black text-sm bg-red-900/80 px-2 py-1 rounded">
                                      {lang === 'zh' ? '已禁用' : 'DISABLED'}
                                    </span>
                                  </div>
                                )}

                                <div className="w-full h-32 flex items-center justify-center relative z-10 mt-2">
                                  <div className={`transition-transform duration-300 drop-shadow-[0_8px_8px_rgba(0,0,0,0.5)] ${isSuggested ? 'scale-110' : 'group-hover:scale-110'}`}>
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
                                 className="absolute left-4 top-1/2 -translate-y-1/2 z-[60] bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-full border border-slate-600 shadow-xl transition-all hover:scale-110"
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
                                    const translateX = offset * 120; 
                                    
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

                                    return (
                                       <TiltCard
                                          key={`${c.id}-${index}`}
                                          glareColor={glareColor}
                                          onClick={() => {
                                            const disabled = (myPlayer?.disabledSkills || []).includes(c.id);
                                            if (canAfford && !disabled && !submittingMove) {
                                              if (isTutorial) {
                                                  handleTutorialAction(c.id); // <--- Intercept for Tutorial
                                              } else {
                                                  submitMove(c.id);           // <--- Normal Game
                                              }
                                            }
                                          }}
                                          onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => handleMouseEnter(e, c.id)}
                                          onMouseLeave={handleMouseLeave}
                                          disabled={isDisabled || !canAfford}
                                          className={`
                                            absolute w-36 h-56 rounded-2xl border-4 ${borderClass}
                                            shadow-2xl
                                            ${c.tags?.includes('combo') ? 'shadow-[0_0_28px_rgba(250,204,21,0.9)]' : ''}
                                            origin-bottom
                                            cursor-pointer group flex flex-col items-center overflow-hidden hand-card
                                            animate-in slide-in-from-bottom-10 fade-in duration-500
                                            ${isDisabled 
                                              ? 'border-slate-700 grayscale opacity-70 cursor-not-allowed' 
                                              : `${borderClass} ${c.tags?.includes('combo') ? 'shadow-[0_0_28px_rgba(250,204,21,0.9)]' : ''} ${!canAfford ? 'grayscale opacity-60' : ''}`
                                            }
                                          `}
                                          style={{
                                            zIndex: hoveredCard === c.id ? 999 : index,
                                            bottom: '30px',
                                            backgroundColor: '#1a1a1a',
                                            // We keep the fan layout (translateX/Y and rotate), but TiltCard adds the 3D rotation on top
                                            transform:
                                              hoveredCard === c.id
                                                ? `translateX(${translateX}px) translateY(${translateY - 60}px) scale(1.1)` // Pop up higher on hover
                                                : `translateX(${translateX}px) translateY(${translateY}px) rotate(${rotateDeg}deg)`,
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
      {revengeCardId && (
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