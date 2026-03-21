import React, { useState, useEffect, useRef } from 'react';
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
  Eye,
  ArrowLeft,
  User,
  Edit,
  CheckCircle,
  AlertTriangle,
  Globe,
  Snowflake,
  Coffee,
  Magnet,
  Crosshair,
  HardHat,
  Axe,
  Hand,
  Footprints,
  Hammer,
  Mountain,
  Heart,
  Cloud,
  Sparkles,
  Wind,
  Bomb,
  Feather,
  Biohazard,
  Volume2,
  VolumeX,
  Star,
  Layers,
  Undo2,
  HandHeart
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  updateDoc,
  onSnapshot,
  getDoc,
  setDoc,
} from 'firebase/firestore';

// --- 1. TYPE DEFINITIONS ---
type Lang = 'zh' | 'en';
type CardType = 'CHARGE' | 'ATTACK' | 'DEFEND' | 'ULTIMATE' | 'ABSORB' | 'SPECIAL';
type HandCategory = 'CHARGE' | 'ATTACK' | 'DEFEND' | 'ULTIMATE' | 'SPECIAL';
type HandViewMode = 'CATEGORIES' | 'CARDS';

interface LocalizedText {
  zh: string;
  en: string;
}

interface Card {
  id: string;
  name: LocalizedText;
  cost: number;
  type: CardType;
  levelRequired: number; 
  tier: number; 
  description: LocalizedText;
  tags?: string[];
}

const FINAL_LEVEL = 23;

interface Player {
  id: string;
  name: string;
  avatar?: string;
  isBot: boolean;
  hp: number;
  energy: number;
  isDead: boolean;
  inventory: number[];
  layer: number;
  tempLayerMod: number;
  selectedCardId: string | null;
  lastCardId: string | null;
  lastAction: string | null;
  disabledSkills?: string[];
  emoji?: string | null;     // 当前表情
  emojiAt?: number | null;
  freeSkills?: string[];   // 💚 absorbed skills that can be used at 0 cost
  pendingLevel?: number | null;
  isShared?: boolean;
  loseStreak?: number;      // 连败场次
  tempSkills?: string[];    // 临时技能 (复仇/赏金)，需花费能量，不占手牌上限，本局有效
  revengeObtainedAt?: number | null;
  kills?: number;
}


interface LogEntry {
  turn: number;
  text: string;
  type: 'info' | 'combat' | 'death' | 'win' | 'move';
}

interface GameState {
  status: 'LOBBY' | 'PLAYING' | 'SHOWDOWN' | 'GAMEOVER';
  turn: number;
  matchCount: number;
  players: Player[];
  logs: LogEntry[];
  hostId: string;
  revengeMode?: boolean;
}

// --- FIREBASE SETUP ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || '你的API_KEY',
  authDomain: import.meta.env.VITE_AUTH_DOMAIN || '你的PROJECT_ID.firebaseapp.com',
  projectId: import.meta.env.VITE_PROJECT_ID || '你的PROJECT_ID',
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

let app: any, auth: any, db: any;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error('Firebase 初始化失败，请检查 .env 配置', e);
}

const APP_ID = 'bobozan-v1';

const MAX_HP = 2;
const MAX_PLAYERS = 8;
const MIN_PLAYERS = 2;

// --- SOUND SYSTEM ---
const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
let audioCtx: AudioContext | null = null;
const soundThrottle: Record<string, number> = {};

const initAudio = () => {
  if (!audioCtx && AudioContextClass) {
    audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

const playSound = (type: 'click' | 'confirm' | 'combat' | 'death' | 'win' | 'card_flip' | 'draw', muted: boolean) => {
  if (muted || !audioCtx) return;
  
  const nowTs = Date.now();
  if (soundThrottle[type] && nowTs - soundThrottle[type] < 50) return;
  soundThrottle[type] = nowTs;

  const now = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'click') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.05);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.start(now);
    osc.stop(now + 0.05);
  } else if (type === 'card_flip') {
    // Soft swish
    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.1, audioCtx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < output.length; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = audioCtx.createBufferSource();
    noise.buffer = noiseBuffer;
    const noiseFilter = audioCtx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 1000;
    noise.connect(noiseFilter);
    noiseFilter.connect(gain);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.1);
    noise.start(now);
  } else if (type === 'confirm') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.linearRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'combat') {
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'death') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'win') {
    [523.25, 659.25, 783.99, 1046.50].forEach((freq, i) => {
      const o = audioCtx!.createOscillator();
      const g = audioCtx!.createGain();
      o.connect(g);
      g.connect(audioCtx!.destination);
      o.type = 'triangle';
      o.frequency.value = freq;
      g.gain.setValueAtTime(0.05, now + i * 0.1);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.5);
      o.start(now + i * 0.1);
      o.stop(now + i * 0.1 + 0.5);
    });
  }
};

// --- TRANSLATION ---
const TEXT = {
  zh: {
    loading: "加载中...",
    firebaseError: "Firebase 配置错误",
    checkEnv: "请检查您的 API 密钥配置。",
    title: "BOBOZAN",
    subtitle: "在线对战",
    enterName: "输入你的昵称...",
    enterLobby: "开始游戏",
    createRoom: "创建房间",
    join: "加入",
    roomPlaceholder: "房间号",
    roomCode: "房间号",
    online: "在线",
    invite: "复制邀请",
    inviteCopied: "邀请信息已复制！",
    codeCopied: "房间号已复制",
    waitingHost: "等待房主开始...",
    waitingJoin: "等待加入...",
    addBot: "+ 添加电脑",
    removeBot: "− 移除电脑",
    startGame: "开始游戏",
    backGame: "回到游戏",
    exit: "退出",
    match: "第",
    matchSuffix: "局",
    yourHand: "你的手牌",
    chooseCard: "选择一张卡牌打出",
    moveLocked: "已出牌，等待对手...",
    showdown: "摊 牌 !",
    roundOver: "本局结束",
    checkLogs: "查看左侧战报",
    nextMatch: "下一局",
    dead: "已阵亡，正在观战...",
    ready: "已准备",
    thinking: "思考中",
    roomFull: "房间已满",
    gameStarted: "游戏已开始",
    roomNotFound: "房间不存在",
    needPlayers: "人数不足",
    copyFail: "复制失败",
    survivorReset: "有人淘汰! 幸存者状态重置!",
    back: "返回",
    skillType: {
      CHARGE: "基础技能 (攒)",
      ATTACK: "攻击技能",
      DEFEND: "防守技能",
      ULTIMATE: "终极技能",
      ABSORB: "汲取技能",
      SPECIAL: "特殊技能",
      COMBO: "联合技能"
    },
    categories: {
      CHARGE: "攒",
      ATTACK: "攻击",
      DEFEND: "防守",
      ULTIMATE: "终极",
      SPECIAL: "特殊"
    },
    level: "Lvl",
  },
  en: {
    loading: "Loading...",
    firebaseError: "Firebase Config Error",
    checkEnv: "Please check your API key configuration.",
    title: "BOBOZAN",
    subtitle: "ONLINE BATTLE",
    enterName: "Enter nickname...",
    enterLobby: "Start Game",
    createRoom: "Create Room",
    join: "Join",
    roomPlaceholder: "ROOM CODE",
    roomCode: "Room Code",
    online: "Online",
    invite: "Invite",
    inviteCopied: "Invite copied!",
    codeCopied: "Room code copied",
    waitingHost: "Waiting for host...",
    waitingJoin: "Waiting...",
    addBot: "+ Add Bot",
    removeBot: "− Remove Bot",
    startGame: "Start Game",
    backGame: "Back to Game",
    exit: "Exit",
    match: "Match",
    matchSuffix: "",
    yourHand: "Your Hand",
    chooseCard: "Choose a card to play",
    moveLocked: "Move Locked. Waiting...",
    showdown: "SHOWDOWN",
    roundOver: "ROUND OVER",
    checkLogs: "Check logs for details",
    nextMatch: "Next Match",
    dead: "You died. Spectating...",
    ready: "READY",
    thinking: "Thinking",
    roomFull: "Room Full",
    gameStarted: "Game Already Started",
    roomNotFound: "Room Not Found",
    needPlayers: "Not enough players",
    copyFail: "Copy Failed",
    survivorReset: "Elimination! Survivors reset!",
    back: "Back",
    skillType: {
      CHARGE: "Basic (Charge)",
      ATTACK: "Attack Skill",
      DEFEND: "Defend Skill",
      ULTIMATE: "Ultimate Skill",
      ABSORB: "Absorb Skill",
      SPECIAL: "Special Skill",
      COMBO: "Combo Skill"
    },
    categories: {
      CHARGE: "Charge",
      ATTACK: "Attack",
      DEFEND: "Defend",
      ULTIMATE: "Ultimate",
      SPECIAL: "Special"
    },
    level: "Lvl",
  }
};

// --- SKILL DATABASE ---
const SKILL_DB: Card[] = [
  // Lvl 0
  { id: 'charge', name: { zh: '攒', en: 'Charge' }, cost: 0, type: 'CHARGE', levelRequired: 0, tier: 0, description: { zh: '获得 2 费', en: 'Gain 2 Energy' } },
  { id: 'defend', name: { zh: '防', en: 'Defend' }, cost: 0, type: 'DEFEND', levelRequired: 0, tier: 0, description: { zh: '抵挡大部分攻击', en: 'Block basic attacks' } },
  { id: 'hong', name: { zh: '轰', en: 'Blast' }, cost: 1, type: 'ATTACK', levelRequired: 0, tier: 1, description: { zh: '基础攻击', en: 'Basic Attack' } },
  { id: 'hong2', name: { zh: '轰轰', en: 'Double Blast' }, cost: 2, type: 'ATTACK', levelRequired: 0, tier: 2, description: { zh: '强力攻击', en: 'Strong Attack' } },
  { id: 'liuke', name: { zh: '六克', en: '6g Strike' }, cost: 2, type: 'ATTACK', levelRequired: 0, tier: 2, description: { zh: '强力攻击', en: 'Strong Attack' } },
  { id: 'ka', name: { zh: '咔', en: 'Ka' }, cost: 3, type: 'ULTIMATE', levelRequired: 0, tier: 3, description: { zh: '终极技能 (范围3)', en: 'Ult: Range 3' } },
  { id: 'ji', name: { zh: '叽', en: 'Ji' }, cost: 4, type: 'ULTIMATE', levelRequired: 0, tier: 4, description: { zh: '终极技能 (范围3)', en: 'Ult: Range 3' } },
  { id: 'kajifen', name: { zh: '咔叽粉', en: 'KaJi' }, cost: 5, type: 'ULTIMATE', levelRequired: 0, tier: 5, description: { zh: '必杀技', en: 'SUPER' } },
  { id: 'kajisuper', name: { zh: '咔叽超粉', en: 'Super KaJi' }, cost: 10, type: 'ULTIMATE', levelRequired: 0, tier: 6, description: { zh: '必杀技', en: 'SUPER' } },
  
  // Special
  { id: 'ascend', name: { zh: '升天', en: 'Ascend' }, cost: 0, type: 'SPECIAL', levelRequired: 0, tier: 0, description: { zh: '上升一层', en: 'Go UP 1 Layer' }, tags: ['layer_up'] },
  { id: 'descend', name: { zh: '遁地', en: 'Descend' }, cost: 0, type: 'SPECIAL', levelRequired: 0, tier: 0, description: { zh: '下降一层', en: 'Go DOWN 1 Layer' }, tags: ['layer_down'] },

  // Lvl 1
  { id: 'pegasus', name: { zh: '天马', en: 'Pegasus' }, cost: 1, type: 'ATTACK', levelRequired: 1, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'meteor', name: { zh: '流星坠', en: 'Meteor' }, cost: 3, type: 'ULTIMATE', levelRequired: 1, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 2
  { id: 'icesword', name: { zh: '冰剑', en: 'Ice Sword' }, cost: 1, type: 'ATTACK', levelRequired: 2, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'iceult', name: { zh: '玄天冰剑', en: 'Mystic Ice' }, cost: 3, type: 'ULTIMATE', levelRequired: 2, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'smallfly', name: { zh: '小飞', en: 'Small Fly' }, cost: 0, type: 'DEFEND', levelRequired: 2, tier: 0, description: { zh: '本回合暂时上升一层', en: 'Temp UP 1 Layer' }, tags: ['layer_up_temp'] },

  // Lvl 3
  { id: 'dragonclaw', name: { zh: '龙爪', en: 'Dragon Claw' }, cost: 1, type: 'ATTACK', levelRequired: 3, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'fireclaw', name: { zh: '火焰龙爪', en: 'Fire Claw' }, cost: 3, type: 'ULTIMATE', levelRequired: 3, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'dragondef', name: { zh: '龙爪防', en: 'Claw Def' }, cost: 0, type: 'DEFEND', levelRequired: 3, tier: 0, description: { zh: '龙爪防御', en: 'Dragon Defense' } },

  // Lvl 4
  { id: 'hotmilk', name: { zh: '热奶', en: 'Hot Milk' }, cost: 1, type: 'ATTACK', levelRequired: 4, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'boiler', name: { zh: '热锅炉', en: 'Boiler' }, cost: 3, type: 'ULTIMATE', levelRequired: 4, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 5
  { id: 'madian', name: { zh: '马甸', en: 'Madian' }, cost: 1, type: 'ATTACK', levelRequired: 5, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'hangman', name: { zh: '吊死鬼', en: 'Hangman' }, cost: 3, type: 'ULTIMATE', levelRequired: 5, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'bigfly', name: { zh: '大飞', en: 'Big Fly' }, cost: 0, type: 'DEFEND', levelRequired: 5, tier: 0, description: { zh: '本回合暂时上升两层 (克小飞)', en: 'Temp UP 2 Layers' }, tags: ['layer_up_2_temp'] },

  // Lvl 6
  { id: 'absorb', name: { zh: '锐吸', en: 'Sharp Absorb' }, cost: 1, type: 'ABSORB', levelRequired: 6, tier: 0, description: { zh: '吸收1倍其他玩家打出的技能 (若被轰击中则被淘汰)', en: 'Absorb 1x (Countered by Blast)' }, tags: ['sharp_absorb'] },

  // Lvl 7
  { id: 'gun', name: { zh: '定枪', en: 'Pistol' }, cost: 1, type: 'ATTACK', levelRequired: 7, tier: 2, description: { zh: '穿透一半基础防御', en: 'Pierce Basic Def' }, tags: ['pierce_basic'] },
  { id: 'gungod', name: { zh: '穿梭定枪', en: 'Warp Gun' }, cost: 3, type: 'ULTIMATE', levelRequired: 7, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 8
  { id: 'helmetatk', name: { zh: '头盔攻', en: 'Helm Atk' }, cost: 1, type: 'ATTACK', levelRequired: 8, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'helmetdef', name: { zh: '头盔防', en: 'Helm Def' }, cost: 0, type: 'DEFEND', levelRequired: 8, tier: 0, description: { zh: '头盔防御', en: 'Helmet Defense' } },

  // Lvl 9
  { id: 'machete', name: { zh: '砍刀', en: 'Machete' }, cost: 1, type: 'ATTACK', levelRequired: 9, tier: 2, description: { zh: '击碎基础防御', en: 'Break Basic Def (Instant Kill)' }, tags: ['break_basic'] },
  { id: 'triplekill', name: { zh: '三连斩', en: 'Triple Slash' }, cost: 3, type: 'ULTIMATE', levelRequired: 9, tier: 4, description: { zh: '一砍刀二砍刀三必杀', en: 'Triple Kill Ultimate' } },

  // Lvl 10
  { id: 'handatk', name: { zh: '手盔攻', en: 'Hand Atk' }, cost: 1, type: 'ATTACK', levelRequired: 10, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'shatter', name: { zh: '破碎', en: 'Shatter' }, cost: 2, type: 'SPECIAL', levelRequired: 10, tier: 3, description: { zh: '抵消并封印 T4 及以下技能', en: 'Block & Disable Skills (Max T4)' }, tags: ['counter_ult', 'disable_skill'] },
  { id: 'handdef', name: { zh: '手盔防', en: 'Hand Def' }, cost: 0, type: 'DEFEND', levelRequired: 10, tier: 0, description: { zh: '手盔防御', en: 'Hand Defense' } },

  // Lvl 11
  { id: 'footatk', name: { zh: '脚盔攻', en: 'Foot Atk' }, cost: 1, type: 'ATTACK', levelRequired: 11, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'triplekick', name: { zh: '三连踹', en: 'Triple Kick' }, cost: 3, type: 'ULTIMATE', levelRequired: 11, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'footdef', name: { zh: '脚盔防', en: 'Foot Def' }, cost: 0, type: 'DEFEND', levelRequired: 11, tier: 0, description: { zh: '脚盔防御', en: 'Foot Defense' } },

  // Lvl 12
  { id: 'aoxi', name: { zh: '奥吸', en: 'Ultra Absorb' }, cost: 1, type: 'ABSORB', levelRequired: 12, tier: 0, description: { zh: '吸收2倍其他玩家打出的技能 (若被六克击中则被淘汰)', en: 'Absorb 2x (Countered by 6g)' }, tags: ['ao_absorb'] },

  // Lvl 13
  { id: 'oneg', name: { zh: '一克', en: '1g' }, cost: 1, type: 'ATTACK', levelRequired: 13, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'pointdiff', name: { zh: '点差', en: 'Point Diff' }, cost: 3, type: 'ULTIMATE', levelRequired: 13, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 14
  { id: 'threeg', name: { zh: '三克', en: '3g' }, cost: 1, type: 'ATTACK', levelRequired: 14, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'threestar', name: { zh: '三星龙', en: '3-Star' }, cost: 3, type: 'ULTIMATE', levelRequired: 14, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 15
  { id: 'fiveg', name: { zh: '五克', en: '5g' }, cost: 1, type: 'ATTACK', levelRequired: 15, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'fiveslap', name: { zh: '五连拍', en: '5 Slaps' }, cost: 3, type: 'ULTIMATE', levelRequired: 15, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },
  { id: 'fivedef', name: { zh: '五克防', en: '5g Def' }, cost: 0, type: 'DEFEND', levelRequired: 15, tier: 0, description: { zh: '五克防御', en: '5g Defense' } },

  // Lvl 16
  { id: 'seveng', name: { zh: '七克', en: '7g' }, cost: 1, type: 'ATTACK', levelRequired: 16, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },

  // Lvl 17
  { id: 'bang', name: { zh: '崩!', en: 'Bang!' }, cost: 1, type: 'ATTACK', levelRequired: 17, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'eightdef', name: { zh: '八克防', en: '8g Def' }, cost: 0, type: 'DEFEND', levelRequired: 17, tier: 0, description: { zh: '八克防御', en: '8g Defense' } },

  // Lvl 18
  { id: 'stab', name: { zh: '捅', en: 'Stab' }, cost: 1, type: 'ATTACK', levelRequired: 18, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },
  { id: 'ninedef', name: { zh: '九克防', en: '9g Def' }, cost: 0, type: 'DEFEND', levelRequired: 18, tier: 0, description: { zh: '九克防御', en: '9g Defense' } },

  // Lvl 19
  { id: 'wave', name: { zh: '天下第一波', en: 'World Wave' }, cost: 1, type: 'ATTACK', levelRequired: 19, tier: 2, description: { zh: '击败任意<九克', en: 'Break Def < 9g (Exc. Fly)' }, tags: ['break_mid_def'] },
  { id: 'superwave', name: { zh: '超级第一波', en: 'Super Wave' }, cost: 3, type: 'ULTIMATE', levelRequired: 19, tier: 4, description: { zh: '终极技能', en: 'Ultimate Skill' } },

  // Lvl 20
  { id: 'hongtian', name: { zh: '轰天', en: 'Sky Bomb' }, cost: 1, type: 'ATTACK', levelRequired: 20, tier: 2, description: { zh: '攻击上层玩家', en: 'Attack Player Above' }, tags: ['hit_up'] },

  // Lvl 21
  { id: 'hongdi', name: { zh: '轰地', en: 'Land Bomb' }, cost: 1, type: 'ATTACK', levelRequired: 21, tier: 2, description: { zh: '攻击下层玩家', en: 'Attack Player Below' }, tags: ['hit_down'] },

  // Lvl 22
  { id: 'hearteye', name: { zh: '诛心诛眼', en: 'Heart & Eye' }, cost: 1, type: 'ATTACK', levelRequired: 22, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },

  // Lvl 23
  { id: 'poison', name: { zh: '散发毒气', en: 'Poison' }, cost: 1, type: 'ATTACK', levelRequired: 23, tier: 2, description: { zh: '攻击技能', en: 'Attack Skill' } },

  // Combos
  { id: 'skydragon', name: { zh: '天龙剑', en: 'Sky Dragon' }, cost: 3, type: 'ULTIMATE', levelRequired: 100, tier: 5, description: { zh: '联合: 与更高等级3费终极技能以及咔叽粉相抵', en: 'Combo: Can Tie with Higher Tier Ult and Super Kaji' }, tags: ['combo'] },
  { id: 'doublewing', name: { zh: '双翼齐飞', en: '2 Wings' }, cost: 1, type: 'SPECIAL', levelRequired: 100, tier: 3, description: { zh: '联合: 躲避3费终极，本回合升3层', en: 'Combo: Dodge Ult, Up 3 Layers' }, tags: ['combo', 'dodge_ult', 'layer_up_3_temp'] },
  { id: 'vajra', name: { zh: '三大金刚', en: '3 Vajras' }, cost: 3, type: 'ULTIMATE', levelRequired: 100, tier: 5, description: { zh: '联合: 与更高等级3费终极技能以及咔叽粉相抵', en: 'Can Tie with Higher Tier Ult and Super Kaji' }, tags: ['combo'] },
  { id: 'allbomb', name: { zh: '轰天轰地轰', en: 'Omni-Bomb' }, cost: 1, type: 'ATTACK', levelRequired: 100, tier: 3, description: { zh: '联合: 攻击任意层玩家', en: 'Combo: Hit All Layers' }, tags: ['combo', 'hit_all'] },
  { id: 'heartpoison', name: { zh: '诛心毒气', en: 'Heart Poison' }, cost: 3, type: 'ULTIMATE', levelRequired: 100, tier: 5, description: { zh: '联合: 与更高等级3费终极技能以及咔叽粉相抵', en: 'Can Tie with Higher Tier Ult and Super Kaji' }, tags: ['combo'] },
];

// Avatar Paths
const AVATAR_OPTIONS = [
  '/avatars/bdrag.png',
  '/avatars/boy.png',
  '/avatars/girl.png',
  '/avatars/ntr.png',
  '/avatars/pega.png',
  '/avatars/rsn.png',
];

// --- ICON HELPER ---
const getCardIcon = (id: string) => {
  switch (id) {
    case 'charge': return <Zap className="text-yellow-400 fill-yellow-400/20" size={48} />;
    case 'defend': return <Shield className="text-blue-400 fill-blue-400/20" size={48} />;
    case 'hong':
    case 'hong2': return <Bomb className="text-red-400 fill-red-400/20" size={48} />;
    case 'liuke': return <Hammer className="text-red-400 fill-red-400/20" size={48} />;
    case 'ka': return <div className="text-5xl">✂️</div>;
    case 'ji': return <div className="text-5xl">🐥</div>;
    case 'kajifen': return <Sparkles className="text-purple-400 fill-purple-400/20" size={48} />;
    case 'kajisuper': return <div className="text-5xl">🌟</div>;
    case 'ascend': return <ArrowUp className="text-green-400" size={48} />;
    case 'descend': return <ArrowDown className="text-green-400" size={48} />;
    case 'pegasus': return <div className="text-5xl">🦄</div>;
    case 'meteor': return <div className="text-5xl">☄️</div>;
    case 'icesword':
    case 'iceult': return <Snowflake className="text-cyan-300" size={48} />;
    case 'smallfly': return <Feather className="text-white" size={48} />;
    case 'dragonclaw':
    case 'fireclaw':
    case 'dragondef': return <div className="text-5xl">🐉</div>;
    case 'hotmilk':
    case 'boiler': return <Coffee className="text-orange-300" size={48} />;
    case 'madian': return <div className="text-5xl">🐎</div>;
    case 'hangman': return <Ghost className="text-gray-400" size={48} />;
    case 'bigfly': return <Wind className="text-white" size={48} />;
    case 'absorb': return <Magnet className="text-purple-400" size={48} />;
    case 'gun':
    case 'gungod': return <Crosshair className="text-red-500" size={48} />;
    case 'helmetatk':
    case 'helmetdef': return <HardHat className="text-yellow-500" size={48} />;
    case 'machete': return <Axe className="text-red-600" size={48} />;
    case 'triplekill': return <div className="text-5xl">☠️</div>;
    case 'handatk':
    case 'handdef':
    case 'shatter': return <Hand className="text-amber-700" size={48} />;
    case 'footatk':
    case 'footdef':
    case 'triplekick': return <Footprints className="text-amber-800" size={48} />;
    case 'aoxi': return <div className="text-5xl">🌪️</div>;
    case 'oneg':
    case 'threeg':
    case 'fiveg':
    case 'seveng':
    case 'bang':
    case 'stab': return <Hammer className="text-gray-400" size={48} />;
    case 'wave':
    case 'superwave': return <div className="text-5xl">🌊</div>; 
    case 'hongtian': return <Cloud className="text-sky-400" size={48} />;
    case 'hongdi': return <Mountain className="text-stone-500" size={48} />;
    case 'hearteye': return <div className="flex"><Heart className="text-red-500"/><Eye className="text-white"/></div>;
    case 'poison': return <Biohazard className="text-green-500" size={48} />;
    case 'skydragon': return <div className="text-5xl">🐲</div>;
    case 'doublewing': return <div className="text-5xl">🪽</div>;
    case 'vajra': return <div className="text-5xl">🛡️</div>;
    case 'allbomb': return <div className="text-5xl">💣</div>;
    case 'heartpoison': return <div className="text-5xl">🖤</div>;
    default:
      if (id.includes('def')) return <Shield className="text-blue-400" size={48} />;
      return <Swords className="text-red-400" size={48} />;
  }
};

// --- TUTORIAL STEPS ---
const TUTORIAL_STEPS = [
    // --- BASIC MECHANICS ---
    {
      id: 0,
      title: { zh: "教程 1: 能量", en: "Lesson 1: Energy" },
      sub: { zh: "战斗需要能量。点击 [攒] 获得 +2 能量。", en: "Combat costs Energy. Click [Charge] to gain +2 Energy." },
      allowed: ['charge'],
      setup: { energy: 0, botEnergy: 0, botAction: 'charge' } 
    },
    {
      id: 1,
      title: { zh: "教程 2: 攻击", en: "Lesson 2: Attacking" },
      sub: { zh: "敌人没有能量了，他可能要攒气! 使用任意攻击技能进行攻击！", en: "The enemy is Charging (Vulnerable!). Use [Blast] (Red) to attack!" },
      allowed: ['hong', 'hong2'],
      setup: { energy: 2, botEnergy: 0, botAction: 'charge' } 
    },
    {
      id: 2,
      title: { zh: "教程 3: 防守", en: "Lesson 3: Defending" },
      sub: { zh: "敌人要攻击了！使用 [防] 抵挡伤害。", en: "The enemy is Attacking! Use [Defend] (Blue) to block damage." },
      allowed: ['defend'],
      setup: { energy: 1, botEnergy: 2, botAction: 'hong' } 
    },
    {
      id: 3,
      title: { zh: "教程 4: 终极技能", en: "Lesson 4: Ultimate" },
      sub: { zh: "防御是可以被击破的！当你有3费或更多时，使用 [终极技能] (紫色) 击溃他们。", en: "Defenses can be broken! Use an [Ultimate] (Purple) to crush them." },
      allowed: ['ka', 'ji'],
      setup: { energy: 4, botEnergy: 2, botAction: 'defend' } 
    },

    // --- GROUP: CLASH STATE (等压状态) ---
    {
      id: 4,
      title: { zh: "等级压制 1: 攻击压制", en: "Clash 1: Atk Pressure" },
      sub: { zh: "同类技能对拼时，高等级攻击卡会击败低等级。", en: "High Level (Lv3) beats Low Level (Lv1) in a clash." },
      allowed: ['dragonclaw'], // Lv 3 Attack
      setup: { energy: 1, botEnergy: 1, botAction: 'pegasus' } // Bot uses Lv 1 Attack
    },
    {
      id: 5,
      title: { zh: "等级压制 2: 攻击抵消", en: "Clash 2: Atk Cancellation" },
      sub: { zh: "在对方等级压制下，用 2费攻击(轰轰/六克) 可以和对方的高级攻击打成平手！", en: "Basic Strong Atk (Double Blast) TIES with higher level attacks!" },
      allowed: ['hong2', 'liuke'], // Double Blast (Cost 2)
      setup: { energy: 2, botEnergy: 1, botAction: 'madian' } // Bot uses Lv 5 Madian
    },
    {
      id: 6,
      title: { zh: "等级压制 3: 终极压制", en: "Clash 3: Ult Pressure" },
      sub: { zh: "当双方都使用终极技能时，等级高的一方获胜 (Lv3 > Lv1)。", en: "When Ults clash, the HIGHER LEVEL wins (Lv3 > Lv1)." },
      allowed: ['fireclaw'], // Lv 3 Ult
      setup: { energy: 3, botEnergy: 3, botAction: 'meteor' } // Bot uses Lv 1 Ult
    },
    {
      id: 7,
      title: { zh: "等级压制 4: 终极抵消", en: "Clash 4: Ult Cancellation" },
      sub: { zh: "在对方等级压制下，你可以使出 [叽] (4费) 和对方的高级终极技能打成平手。", en: "Use [Ji] (Cost 4) to TIE against a higher level Ultimate!" },
      allowed: ['ji'], // Base Ult (Cost 4)
      setup: { energy: 4, botEnergy: 3, botAction: 'fireclaw' } // Bot uses Lv 3 Ult
    },

    // --- GROUP: Special Skills (进阶教程) ---
    {
      id: 8,
      title: { zh: "进阶: 特殊防御", en: "Adv: Special Def" },
      sub: { zh: "普通[防]挡不住[天下第一波]，但[小飞] (Lv2) 可以！", en: "Normal [Defend] fails vs [Wave], but [Small Fly] (Lv2) works!" },
      allowed: ['smallfly'], // Lv 2 Defend
      setup: { energy: 1, botEnergy: 1, botAction: 'wave' } // Bot uses Wave
    },
    {
      id: 9,
      title: { zh: "进阶: 必杀技 (Tier)", en: "Adv: Super Ult (Tier)" },
      sub: { zh: "咔叽粉 (T5) 是必杀技，可以压制常规终极技能 (如 叽 T4)。", en: "KaJiFen (Tier 5) is a SUPER. It beats normal Ults like Ji (Tier 4)." },
      allowed: ['kajifen'], 
      setup: { energy: 5, botEnergy: 4, botAction: 'ji' } 
    },
    {
      id: 10,
      title: { zh: "进阶: 联合技能", en: "Adv: Combo Skills" },
      sub: { zh: "当你集齐特定等级(如 Lv2+5)时，会自动解锁特殊的【联合技能】！", en: "Collecting specific levels (e.g. Lv2+5) unlocks secret COMBOS!" },
      allowed: ['doublewing'], 
      setup: { energy: 1, botEnergy: 3, botAction: 'meteor' } 
    }
];

// --- LOGIC ---
// “会打人”的卡：只有 ATTACK / ULTIMATE；防守类 combo（比如双翼齐飞）不算
const isOffensiveCard = (card: Card) =>
  card.type === 'ATTACK' || card.type === 'ULTIMATE';

// combo 的“有效等级” = 组成它的技能里最高的那个等级
const getEffectiveLevel = (card: Card): number => {
  if (card.tags?.includes('combo')) {
    switch (card.id) {
      case 'skydragon':   // 由 1,2,3 组成 -> 3
        return 3;
      case 'doublewing':  // 2,5 -> 5（虽然主要是防御，但算个最高等级）
        return 5;
      case 'vajra':       // 8,10,11 -> 11
        return 11;
      case 'allbomb':     // 20,21 -> 21
      case 'heartpoison':
        return 21;
      default:
        return card.levelRequired;
    }
  }
  return card.levelRequired;
};

const isBasicTier2Level0 = (c: Card) =>
  c.type === 'ATTACK' &&
  c.tier === 2 &&
  c.levelRequired === 0 &&
  (c.id === 'hong2' || c.id === 'liuke');

/**
 * card1 是否“压制” card2：
 * - 只考虑双方都是 ATTACK/ULTIMATE 的情况
 * - 先看 tier：高 tier 赢
 * - tier 相同：
 *   - 普通 vs 普通：有效等级高的赢
 *   - combo vs 普通：
 *       有效等级高 -> combo 赢
 *       有效等级 ≤ 普通 -> 平手（即 combo 会和更高级终极打平）
 *   - 普通 vs combo：普通不能压制 combo（无论高低，保持平手或被 combo 打）
 *   - combo vs combo：有效等级高的 combo 赢
 */
const doesCard1Overpower = (card1: Card, card2: Card): boolean => {
  if (!isOffensiveCard(card1) || !isOffensiveCard(card2)) return false;

  // 🔸 EXCEPTION:
  // Lvl 0 基础 T2 攻击（轰轰 / 六克）和任何 T2 攻击技能打架时 => 一律平手
  // -> 无论谁是 card1 / card2，都不“压制”对方
  const card1IsBasic0 = isBasicTier2Level0(card1);
  const card2IsBasic0 = isBasicTier2Level0(card2);
  const card1IsT2Atk = card1.type === 'ATTACK' && card1.tier === 2;
  const card2IsT2Atk = card2.type === 'ATTACK' && card2.tier === 2;

  if (
    (card1IsBasic0 && card2IsT2Atk) ||
    (card2IsBasic0 && card1IsT2Atk)
  ) {
    // tie => nobody overpowers
    return false;
  }

  // 2. Exception: Ji (Tier 4) Ties
  // Ji is Level 0, but it should tie with other Tier 4 Ultimates (like Meteor Lv1)
  const isJiTie = (c1: Card, c2: Card) =>
    c1.id === 'ji' && 
    c2.type === 'ULTIMATE' && 
    c2.tier === 4 && 
    !c2.tags?.includes('combo');

  if (isJiTie(card1, card2) || isJiTie(card2, card1)) {
    return false; // Force Tie
  }

  const isKajifen = (c: Card) => c.id === 'kajifen';
  const isT5Combo = (c: Card) => c.tier === 5 && c.tags?.includes('combo');

  if ((isKajifen(card1) && isT5Combo(card2)) || (isKajifen(card2) && isT5Combo(card1))) {
    return false; // Force Tie
  }

  // 1) 先比 tier
  if (card1.tier !== card2.tier) {
    return card1.tier > card2.tier;
  }

  const combo1 = !!card1.tags?.includes('combo');
  const combo2 = !!card2.tags?.includes('combo');
  const lvl1 = getEffectiveLevel(card1);
  const lvl2 = getEffectiveLevel(card2);

  // combo vs combo：有效等级高的赢
  if (combo1 && combo2) {
    return lvl1 > lvl2;
  }

  // combo vs 普通：只在有效等级更高时赢，否则平手
  if (combo1 && !combo2) {
    return lvl1 > lvl2;
  }

  // 普通 vs combo：普通不能压制 combo
  if (!combo1 && combo2) {
    return false;
  }

  // 普通 vs 普通：等级高的赢
  return lvl1 > lvl2;
};

// 🔥 Helper: Get current Showdown winners (Returns Array of IDs)
const getShowdownWinner = (players: Player[]): string[] => {
  const candidates: { id: string; score: number }[] = [];
  
  // 1. Pre-calculate simulated layers (Movement logic)
  const simLayers: Record<string, number> = {};
  players.forEach(p => {
      let l = p.layer;
      const c = SKILL_DB.find(card => card.id === p.selectedCardId);
      if (c) {
        if (c.tags?.includes('layer_up')) l += 1;
        if (c.tags?.includes('layer_down')) l -= 1;
        if (c.tags?.includes('layer_up_temp')) l += 1;
        if (c.tags?.includes('layer_up_2_temp')) l += 2;
        if (c.tags?.includes('layer_up_3_temp')) l += 3;
      }
      simLayers[p.id] = l;
  });

  // 2. Simulate Combat to find valid hits
  players.forEach((p) => {
    if (!p.selectedCardId || p.isDead) return;
    const card = SKILL_DB.find((c) => c.id === p.selectedCardId);
    if (!card || !isOffensiveCard(card)) return; 

    let landedHit = false;
    players.forEach((target) => {
      if (target.id === p.id || target.isDead || !target.selectedCardId) return;
      
      const pLayer = simLayers[p.id];
      const tLayer = simLayers[target.id];
      const dist = Math.abs(pLayer - tLayer);
      let inRange = false;
      
      if (card.id === 'kajifen' || card.id === 'kajisuper' || card.tags?.includes('hit_all')) inRange = true;
      else if (card.id === 'ka' || card.id === 'ji') { if (dist <= 1) inRange = true; }
      else if (card.tags?.includes('combo') && card.type === 'ULTIMATE') { if (dist <= 3) inRange = true; }
      else if (card.type === 'ULTIMATE') { if (dist <= 2) inRange = true; }
      else if (card.tags?.includes('hit_up')) { if (tLayer > pLayer) inRange = true; }
      else if (card.tags?.includes('hit_down')) { if (tLayer < pLayer) inRange = true; }
      else { if (pLayer === tLayer) inRange = true; }

      if (!inRange) return; 

      const targetCard = SKILL_DB.find(c => c.id === target.selectedCardId)!;
      let hitSuccess = false;

      // Check interactions
      if (targetCard.type === 'CHARGE') hitSuccess = true;
      else if (targetCard.type === 'DEFEND') {
          if (card.id === 'machete') hitSuccess = true;
          else if (card.id === 'gun') hitSuccess = true;
          else if (card.id === 'wave') {
             const strongDefs = ['ninedef', 'bigfly', 'smallfly', 'fivedef', 'eightdef', 'handdef', 'footdef'];
             if (!strongDefs.includes(targetCard.id)) hitSuccess = true;
          }
          else if (card.type === 'ULTIMATE' && !targetCard.tags?.includes('dodge_ult')) hitSuccess = true;
      }
      else if (targetCard.type === 'SPECIAL') {
          if (targetCard.id === 'shatter') {
             if (card.type === 'ULTIMATE' && card.tier >= 5) hitSuccess = true;
          }
          else if (targetCard.id === 'doublewing') hitSuccess = true; 
          else hitSuccess = true;
      }
      else if (isOffensiveCard(targetCard)) {
          const isRemote = targetCard.tags?.includes('hit_up') || targetCard.tags?.includes('hit_down');
          if (pLayer === tLayer && isRemote) hitSuccess = true;
          else if (doesCard1Overpower(card, targetCard)) hitSuccess = true;
      }
      else if (targetCard.type === 'ABSORB') {
          if (targetCard.id === 'aoxi' && card.id === 'liuke') hitSuccess = true;
          else if (targetCard.tags?.includes('sharp_absorb') && ['hong','hong2','hongtian','hongdi','wave'].includes(card.id)) hitSuccess = true;
          else if (card.type === 'ULTIMATE') hitSuccess = true;
      }

      if (hitSuccess) landedHit = true;
    });

    if (!landedHit) return;

    const lvl = getEffectiveLevel(card);
    const isCombo = card.tags?.includes('combo') ? 1 : 0;
    const score = card.tier * 100 + lvl + isCombo * 10;
    candidates.push({ id: p.id, score });
  });

  // 3. Determine Winners (Multi-Slam Logic)
  if (candidates.length > 0) {
    const maxScore = Math.max(...candidates.map(c => c.score));
    const winners = candidates.filter(c => c.score === maxScore);
    
    // Rule: If everyone tied (winners count == total candidates count), NO SLAM.
    if (winners.length > 1 && winners.length === candidates.length) {
       return [];
    }
    
    // Otherwise (Single winner OR Multiple winners who beat someone), SLAM ALL WINNERS.
    return winners.map(w => w.id);
  }

  return [];
};

const calculateTurnOutcome = (
  currentPlayers: Player[],
  turn: number,
  matchCount: number,
  lang: Lang
): { players: Player[]; logs: LogEntry[]; isGameOver: boolean; winner?: Player } => {
  let logs: LogEntry[] = [];

  const survivors = currentPlayers
    .map((p) => ({
      ...p,
      disabledSkills: p.disabledSkills || [],
      freeSkills: p.freeSkills || [],
      kills: p.kills || 0, // Ensure kills exist
    }))
    .filter((p) => !p.isDead);

  const deadPlayers = currentPlayers
    .map((p) => ({ ...p }))
    .filter((p) => p.isDead);

  // 1. APPLY COSTS / LAYER TAGS
  survivors.forEach((p) => {
    const card = SKILL_DB.find((c) => c.id === p.selectedCardId)!;
    p.lastAction = card.name.en;
    p.lastCardId = card.id;

    let isFreeUse = false;
    if (p.freeSkills && p.freeSkills.includes(card.id)) {
      const index = p.freeSkills.indexOf(card.id);
      if (index > -1) {
        p.freeSkills.splice(index, 1); 
        isFreeUse = true;
      }
    } else if (p.tempSkills && p.tempSkills.includes(card.id)) {
       const index = p.tempSkills.indexOf(card.id);
       if (index > -1) p.tempSkills.splice(index, 1);
    }

    if (card.type !== 'CHARGE' && !isFreeUse) {
      p.energy -= card.cost;
    }

    if (card.tags?.includes('layer_up')) {
      p.layer += 1;
      logs.push({ turn, text: lang === 'zh' ? `${p.name} 升到了 ${p.layer}层` : `${p.name} ascends to ${p.layer}F`, type: 'move' });
    }
    if (card.tags?.includes('layer_down')) {
      p.layer -= 1;
      logs.push({ turn, text: lang === 'zh' ? `${p.name} 降到了 ${p.layer}层` : `${p.name} descends to ${p.layer}F`, type: 'move' });
    }
    if (card.tags?.includes('layer_up_temp')) p.tempLayerMod = 1;
    if (card.tags?.includes('layer_up_2_temp')) p.tempLayerMod = 2;
    if (card.tags?.includes('layer_up_3_temp')) p.tempLayerMod = 3;
  });

  const damageMap: { [id: string]: number } = {};
  const disableMap: { [id: string]: string[] } = {};
  const absorbGainEnergy: { [id: string]: number } = {};
  const absorbGainSkills: { [id: string]: string[] } = {};
  
  // 🟢 NEW: Track who killed whom this turn
  const killContributors: { [victimId: string]: Set<string> } = {}; 
  const recordKill = (attackerId: string, victimId: string) => {
      if (!killContributors[victimId]) killContributors[victimId] = new Set();
      killContributors[victimId].add(attackerId);
  };

  survivors.forEach((p) => {
    damageMap[p.id] = 0;
    disableMap[p.id] = [];
    absorbGainEnergy[p.id] = 0;
    absorbGainSkills[p.id] = [];
  });

  const getLayer = (p: Player) => p.layer + p.tempLayerMod;

  // 2. COMBAT
  for (let i = 0; i < survivors.length; i++) {
    for (let j = 0; j < survivors.length; j++) {
      if (i === j) continue;

      const p1 = survivors[i];
      const p2 = survivors[j];
      const card1 = SKILL_DB.find((c) => c.id === p1.selectedCardId)!;
      const card2 = SKILL_DB.find((c) => c.id === p2.selectedCardId)!;

      // EXCEPTION: Big Fly vs Small Fly
      if (card1.id === 'bigfly' && card2.id === 'smallfly') {
         if (getLayer(p1) > getLayer(p2)) {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 大飞高空截杀 ${p2.name} (小飞)!` : `${p1.name} Big Fly intercepts ${p2.name} from above!`, type: 'combat' });
         }
         continue; 
      }

      let inRange = false;
      const dist = Math.abs(getLayer(p1) - getLayer(p2));

      if (card1.id === 'kajifen' || card1.id === 'kajisuper' || card1.tags?.includes('hit_all')) inRange = true;
      else if (card1.id === 'ka' || card1.id === 'ji') { if (dist <= 1) inRange = true; }
      else if (card1.tags?.includes('combo') && card1.type === 'ULTIMATE') { if (dist <= 3) inRange = true; }
      else if (card1.type === 'ULTIMATE') { if (dist <= 2) inRange = true; }
      else if (card1.tags?.includes('hit_up')) { if (getLayer(p2) > getLayer(p1)) inRange = true; }
      else if (card1.tags?.includes('hit_down')) { if (getLayer(p2) < getLayer(p1)) inRange = true; }
      else { if (getLayer(p1) === getLayer(p2)) inRange = true; }

      if (!inRange) continue;

      const sameLayer = getLayer(p1) === getLayer(p2);

      if (card1.type === 'ABSORB') continue;

      // REACTION CHECKS (p2 Absorbing/Shatter)
      if (card2.type === 'ABSORB') {
        const mult = card2.id === 'aoxi' ? 2 : 1;
        if (card2.tags?.includes('sharp_absorb')) {
          const dangerousMoves = ['hong', 'hong2', 'hongtian', 'hongdi', 'wave'];
          if (card1.type === 'ATTACK' && dangerousMoves.includes(card1.id)) {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击杀 ${p2.name} (吸取失败)!` : `${p1.name} kills ${p2.name} (Absorb failed)!`, type: 'combat' });
            continue;
          }
        }
        if (card2.id === 'aoxi' && card1.id === 'liuke') {
           damageMap[p2.id] += MAX_HP;
           recordKill(p1.id, p2.id); // 🟢 Kill Credit
           logs.push({ turn, text: lang === 'zh' ? `${p1.name} 六克击杀 ${p2.name} (奥吸失败)!` : `${p1.name} 6g Strike kills ${p2.name} (Ultra Absorb failed)!`, type: 'combat' });
           continue;
        }
        if (card1.type === 'CHARGE') {
          const gain = mult * 2; 
          absorbGainEnergy[p2.id] += gain;
          logs.push({ turn, text: lang === 'zh' ? `${p2.name} 吸收 ${p1.name} 的攒 (+${gain} 费)!` : `${p2.name} absorbs ${p1.name}'s Charge (+${gain} energy)!`, type: 'info' });
          continue;
        }
        if (card1.type === 'ULTIMATE') {
          damageMap[p2.id] += MAX_HP;
          recordKill(p1.id, p2.id); // 🟢 Kill Credit
          logs.push({ turn, text: lang === 'zh' ? `${p2.name} 被终极击杀 (吸收失败)!` : `${p2.name} is killed by an Ultimate (Absorb failed)!`, type: 'combat' });
          continue;
        }
        if (card1.type === 'DEFEND') {
          if (card1.id === 'defend') { /* no effect */ } 
          else { for (let k = 0; k < mult; k++) absorbGainSkills[p2.id].push(card1.id); }
          continue;
        }
        if (card1.type === 'ATTACK' || card1.type === 'SPECIAL') {
          for (let k = 0; k < mult; k++) absorbGainSkills[p2.id].push(card1.id);
          continue;
        }
        continue;
      }

      if (card1.id === 'shatter' && sameLayer) {
        if (card2.type === 'ULTIMATE' && card2.tier >= 5) {
          damageMap[p1.id] += MAX_HP; 
          recordKill(p2.id, p1.id); // 🟢 Kill Credit (Reversed: p2 killed p1)
          logs.push({ turn, text: lang === 'zh' ? `${p2.name} 的 ${card2.name.zh} (T${card2.tier}) 击碎了破碎!` : `${p2.name}'s ${card2.name.en} (T${card2.tier}) broke through Shatter!`, type: 'combat' });
          continue; 
        }
        if (['CHARGE','ATTACK', 'DEFEND', 'SPECIAL', 'ULTIMATE'].includes(card2.type)) {
          if (!disableMap[p2.id].includes(card2.id)) disableMap[p2.id].push(card2.id);
          continue; 
        }
      }

      // OFFENSIVE ACTIONS
      if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE' || card1.type === 'SPECIAL') {
        if (card2.type === 'CHARGE') {
          if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE') {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击杀 ${p2.name} (攒)!` : `${p1.name} kills ${p2.name} (Charging)!`, type: 'combat' });
          }
        } 
        else if (card2.type === 'DEFEND') {
          if (card2.tags?.includes('dodge_ult') && (card1.type === 'ULTIMATE' || card1.id === 'ka' || card1.id === 'ji')) {
             /* Dodged */
          } 
          else if (card1.id === 'machete' && card2.id === 'defend') {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 砍刀击碎 ${p2.name}!` : `${p1.name} Machete shatters ${p2.name}!`, type: 'combat' });
          } 
          else if (card1.id === 'gun' && card2.id === 'defend') {
            damageMap[p2.id] += 1;
            // Gun deals 1 dmg. Check if fatal. MaxHP is 2. If already dmg=1, this is fatal.
            // Simplified: We assume gun might kill if HP is low. We'll handle kill credit in "Apply Results" by checking damageMap? 
            // Actually, best to credit here provisionally. Gun usually isn't 1-hit kill unless injured.
            // Let's just mark it. If they die, they get credit.
            recordKill(p1.id, p2.id); 
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 定枪穿透 ${p2.name}!` : `${p1.name} Sniper pierces ${p2.name}!`, type: 'combat' });
          } 
          else if (card1.id === 'wave') {
            const strongDefs = ['ninedef', 'bigfly', 'smallfly', 'fivedef', 'eightdef', 'handdef', 'footdef'];
            if (!strongDefs.includes(card2.id)) {
              damageMap[p2.id] += MAX_HP;
              recordKill(p1.id, p2.id); // 🟢 Kill Credit
              logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击溃 ${p2.name} 防御!` : `${p1.name} washes away ${p2.name}!`, type: 'combat' });
            }
          } 
          else if (card1.type === 'ULTIMATE') {
            damageMap[p2.id] += MAX_HP;
            recordKill(p1.id, p2.id); // 🟢 Kill Credit
            logs.push({ turn, text: lang === 'zh' ? `${p1.name} 终极破防 ${p2.name}!` : `${p1.name} Ult breaks ${p2.name}!`, type: 'combat' });
          }
        } 
        else if (card2.type === 'SPECIAL') {
          if (card2.id === 'shatter') {
            if (card1.type === 'ULTIMATE' && card1.tier >= 5) {
              damageMap[p2.id] += MAX_HP;
              recordKill(p1.id, p2.id); // 🟢 Kill Credit
              logs.push({ turn, text: lang === 'zh' ? `${p1.name} 击碎了 ${p2.name} 的破碎!` : `${p1.name} shattered ${p2.name}'s Shatter!`, type: 'combat' });
            }
          }
          else if (card2.id === 'doublewing') {
            if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE') {
               damageMap[p2.id] += MAX_HP;
               recordKill(p1.id, p2.id); // 🟢 Kill Credit
               logs.push({ turn, text: lang === 'zh' ? `${p1.name} 的 ${card1.name.zh} 击落了 ${p2.name} (双翼)!` : `${p1.name}'s ${card1.name.en} shoots down ${p2.name} (Double Wing)!`, type: 'combat' });
            }
          }
          else if (card2.id === 'ascend' || card2.id === 'descend') {
            if (card1.type === 'ATTACK' || card1.type === 'ULTIMATE') {
              damageMap[p2.id] += MAX_HP;
              recordKill(p1.id, p2.id); // 🟢 Kill Credit
              logs.push({ turn, text: lang === 'zh' ? `${p1.name} 预判了移动，击杀 ${p2.name}!` : `${p1.name} predicted the move and killed ${p2.name}!`, type: 'combat' });
            }
          }
        }
        else if (card2.type === 'ATTACK' || card2.type === 'ULTIMATE') {
          const isRemoteOnly = card2.tags?.includes('hit_up') || card2.tags?.includes('hit_down');
          if (isRemoteOnly && sameLayer) {
             damageMap[p2.id] += MAX_HP;
             recordKill(p1.id, p2.id); // 🟢 Kill Credit
             logs.push({ turn, text: lang === 'zh' ? `${p1.name} 趁虚而入，在同层击杀了无法回防的 ${p2.name}!` : `${p1.name} catches ${p2.name} off guard!`, type: 'combat' });
          }
          if (doesCard1Overpower(card1, card2)) {
             damageMap[p2.id] += MAX_HP;
             recordKill(p1.id, p2.id); // 🟢 Kill Credit
             logs.push({ turn, text: lang === 'zh' ? `${p1.name} [${card1.name.zh}] 压制了 ${p2.name}!` : `${p1.name} [${card1.name.en}] overpowers ${p2.name}!`, type: 'combat' });
          }
        }
      }
    }
  }

  // 3. APPLY RESULTS
  survivors.forEach((p) => {
    const card = SKILL_DB.find((c) => c.id === p.selectedCardId)!;

    if (card.type === 'ABSORB' && damageMap[p.id] < MAX_HP) {
      if (absorbGainEnergy[p.id] > 0) {
        p.energy += absorbGainEnergy[p.id];
        logs.push({ turn, text: lang === 'zh' ? `${p.name} 吸取 +${absorbGainEnergy[p.id]} 费` : `${p.name} absorbed +${absorbGainEnergy[p.id]} energy`, type: 'info' });
      }
      if (absorbGainSkills[p.id]?.length > 0) {
        p.freeSkills = [...(p.freeSkills || []), ...absorbGainSkills[p.id]];
      }
    }
    if (card.type === 'CHARGE' && damageMap[p.id] < MAX_HP) p.energy += 2;
    if (disableMap[p.id]?.length > 0) p.disabledSkills = Array.from(new Set([...(p.disabledSkills || []), ...disableMap[p.id]]));

    if (damageMap[p.id] > 0) {
      p.hp -= damageMap[p.id];
      if (p.hp <= 0) {
        p.isDead = true;
        p.hp = 0;
        
        // 🟢 NEW: Process Kills
        const killers = killContributors[p.id];
        if (killers) {
           killers.forEach(kId => {
              const killer = survivors.find(s => s.id === kId);
              if (killer) killer.kills += 1;
           });
        }

        logs.push({ turn, text: lang === 'zh' ? `${p.name} 阵亡!` : `${p.name} died!`, type: 'death' });
      }
    }
    p.tempLayerMod = 0;
    p.selectedCardId = null;
  });

  // Survivor Reset logic...
  const newlyDeadCount = survivors.filter((p) => p.isDead).length;
  const activeSurvivors = survivors.filter((p) => !p.isDead);
  if (newlyDeadCount > 0 && activeSurvivors.length > 1) {
    activeSurvivors.forEach((p) => {
      p.hp = MAX_HP;
      p.energy = 0;
      p.layer = 0;
      p.tempLayerMod = 0;
      p.disabledSkills = [];
      p.freeSkills = []; 
    });
    logs.push({ turn, text: TEXT[lang].survivorReset, type: 'info' });
  }

  const finalPlayers = [...survivors, ...deadPlayers].sort((a, b) => a.id.localeCompare(b.id));
  const living = finalPlayers.filter((p) => !p.isDead);

  let isGameOver = false;
  let winner: Player | undefined = undefined;

  if (living.length <= 1) {
    isGameOver = true;
    if (living.length === 1) {
      winner = living[0];
      
      // 🟢 NEW: If Final Level reached, log the Kill Leader
      if (matchCount >= FINAL_LEVEL) {
          const killLeader = finalPlayers.reduce((prev, curr) => 
            ((curr.kills || 0) > (prev.kills || 0) ? curr : prev), 
          finalPlayers[0]);

          logs.push({ 
            turn, 
            text: lang === 'zh' 
              ? `🏆 最终决战结束! 击杀王: ${killLeader.name} (${killLeader.kills}杀)` 
              : `🏆 FINAL BATTLE OVER! Kill Leader: ${killLeader.name} (${killLeader.kills} Kills)`, 
            type: 'win' 
          });
      } else {
          // Standard Win Logic (Give Skill)
          const newLvl = matchCount;
          const newCards = SKILL_DB.filter(c => c.levelRequired === newLvl);
          // ... (Existing skill unlock logic) ...
          let typeToCheck: CardType | null = null;
          if (newCards.some(c => c.type === 'ULTIMATE')) typeToCheck = 'ULTIMATE';
          else if (newCards.some(c => c.type === 'ATTACK')) typeToCheck = 'ATTACK';
          else if (newCards.some(c => c.type === 'DEFEND')) typeToCheck = 'DEFEND';
          const isSpecial = !typeToCheck || newCards.some(c => c.type === 'SPECIAL');
          let count = 0;
          if (typeToCheck && !isSpecial) {
            winner.inventory.forEach(lvl => {
               if (lvl === 0) return;
               const cardsAtLvl = SKILL_DB.filter(c => c.levelRequired === lvl);
               if (cardsAtLvl.some(c => c.type === typeToCheck)) count++;
            });
          }
          if (typeToCheck && count >= 4 && !winner.inventory.includes(newLvl)) {
             winner.pendingLevel = newLvl;
             logs.push({ turn, text: lang === 'zh' ? `🏆 ${winner.name} 获胜! (需弃牌)` : `🏆 ${winner.name} WINS! (Full slots)`, type: 'win' });
          } else {
            if (!winner.inventory.includes(newLvl)) winner.inventory.push(newLvl);
            logs.push({ turn, text: lang === 'zh' ? `🏆 ${winner.name} 获胜! (获得 Lv${matchCount})` : `🏆 ${winner.name} WINS! (Got Lv${matchCount})`, type: 'win' });
          }
      }
    } else {
      logs.push({ turn, text: lang === 'zh' ? `平局!` : `Draw!`, type: 'death' });
    }
  }

  return { players: finalPlayers, logs, isGameOver, winner };
};


const getBotMove = (bot: Player, allPlayers: Player[]) => {
  const allKnownCards = getPlayerCards(bot, allPlayers);
  const affordable = allKnownCards.filter(c => 
    bot.energy >= c.cost && 
    !bot.disabledSkills?.includes(c.id) // 👈 机器人不能出被封印的牌
  );
  if (affordable.length === 0) return 'charge';
  let choice = affordable[0];
  const r = Math.random();
  if (bot.energy < 1) {
    choice = r > 0.3
      ? affordable.find((c) => c.type === 'CHARGE') || choice
      : affordable.find((c) => c.type === 'DEFEND') || choice;
  } else if (bot.energy >= 3 && r > 0.4) {
    const ults = affordable.filter((c) => c.type === 'ULTIMATE');
    if (ults.length > 0) choice = ults[Math.floor(Math.random() * ults.length)];
  } else {
    choice = affordable[Math.floor(Math.random() * affordable.length)];
  }
  return choice ? choice.id : 'charge';
};

const getPlayerCards = (p: Player, allPlayers?: Player[]) => {
  const hongTianUnlocked = allPlayers
    ? allPlayers.some((pl) => pl.inventory.includes(20))
    : false;

  const knownCards = SKILL_DB.filter((c) => {
    // 🔥 关键修复：检查这张卡是否是临时卡
    const isTempSkill = p.tempSkills?.includes(c.id) ?? false;

    // 如果是 Lv100 且不是临时卡，才隐藏
    if (c.levelRequired === 100 && !isTempSkill) return false;

    const hasFreeSkill = p.freeSkills?.includes(c.id) ?? false;
    
    // 只要 仓库有 OR 是基础 OR 有免费 OR 有临时，都算拥有
    const hasSkill =
      p.inventory.includes(c.levelRequired) ||
      c.levelRequired === 0 ||
      hasFreeSkill ||
      isTempSkill;

    const specialCond =
      ['ascend', 'descend'].includes(c.id) ? hongTianUnlocked : true;

    return hasSkill && specialCond;
  });

  const inv = p.inventory;
  const has = (lvl: number) => inv.includes(lvl);
  const tryAddCombo = (id: string) => {
    const c = SKILL_DB.find((x) => x.id === id);
    if (c) knownCards.push(c);
  };

  if (has(1) && has(2) && has(3)) tryAddCombo('skydragon');
  if (has(2) && has(5)) tryAddCombo('doublewing');
  if (has(8) && has(10) && has(11)) tryAddCombo('vajra');
  if (has(20) && has(21)) {
    tryAddCombo('allbomb');
    tryAddCombo('heartpoison');
  }

  // SHARED SKILL LOGIC
  if (allPlayers) {
    // Check if anyone (including self) enabled sharing and has the required level
    const anyoneSharingDragon = allPlayers.some(pl => pl.isShared && pl.inventory.includes(3)); // Lv3 = Dragon
    const anyoneSharing9g = allPlayers.some(pl => pl.isShared && pl.inventory.includes(18));   // Lv18 = 9g

    if (anyoneSharingDragon) {
       const c = SKILL_DB.find(x => x.id === 'dragondef');
       // Only add if I don't already have it
       if (c && !knownCards.some(k => k.id === c.id)) knownCards.push(c);
    }
    if (anyoneSharing9g) {
       const c = SKILL_DB.find(x => x.id === 'ninedef');
       if (c && !knownCards.some(k => k.id === c.id)) knownCards.push(c);
    }
  }
  // END ADDITION

  return knownCards;
};

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
}: any) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50, opacity: 0 });

  const handleMove = (e: React.MouseEvent) => {
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

  const handleLeave = (e: any) => {
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
const BACKGROUND_CARDS = (() => {
  const items: any[] = [];
  const MAX_CARDS = 20;   
  const MIN_DIST = 15;
  
  // 1. Define the effects list
  const EFFECTS = ['spin-slow', 'flip-slow', 'shine-slow', 'glow-pulse'];

  // Safe check
  const db = typeof SKILL_DB !== 'undefined' ? SKILL_DB : [];
  if (db.length === 0) return [];

  let attempts = 0;
  
  while (items.length < MAX_CARDS && attempts < 100) {
    attempts++;
    
    const top = 10 + Math.random() * 80;
    const left = 10 + Math.random() * 80;

    const tooClose = items.some(item => {
      const a = item.top - top;
      const b = item.left - left;
      const dist = Math.sqrt(a * a + b * b);
      return dist < MIN_DIST;
    });

    if (!tooClose) {
      const card = db[Math.floor(Math.random() * db.length)];
      
      // 2. Randomly assign effect (40% chance)
      const hasEffect = Math.random() < 0.4;
      const assignedEffect = hasEffect 
        ? EFFECTS[Math.floor(Math.random() * EFFECTS.length)] 
        : null;

      items.push({
        id: items.length,
        card,
        top,
        left,
        rX: (Math.random() - 0.5) * 100, 
        rY: (Math.random() - 0.5) * 100, 
        rZ: Math.random() * 360, 
        z: Math.random() * 500,
        scale: 0.5 + Math.random() * 0.5,
        duration: 15 + Math.random() * 20,
        delay: Math.random() * -20,
        effect: assignedEffect // <--- Store the effect here
      });
    }
  }
  
  return items;
})();


// --- MAIN COMPONENT ---

export default function BobozanOnline() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'NAME_INPUT' | 'HOME' | 'LOBBY' | 'GAME'>('NAME_INPUT');
  const [playerName, setPlayerName] = useState('');
  const [lang, setLang] = useState<Lang>('zh'); 
  const [muted, setMuted] = useState(false);
  const [submittingMove, setSubmittingMove] = useState(false);

  const [leaderboardMode, setLeaderboardMode] = useState<'MINIMIZED' | 'TOP3' | 'EXPANDED'>('MINIMIZED');

  // Avatar State
  const [playerAvatar, setPlayerAvatar] = useState('/avatars/bdrag.png'); // Default to first image
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);
  
  const renderProfileAvatar = (avatar: string | undefined, size: number = 32) => {
    // Fallback if avatar is missing or empty
    if (!avatar) {
      return <User size={size} className="text-slate-400 drop-shadow-md" />;
    }

    return (
      <img 
        src={avatar} 
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
  const [tutorialMsg, setTutorialMsg] = useState<any>({ 
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
        let nextStep = tutorialStep + 1;

        // 🟢 LOCALIZED COMPLETION MESSAGE
        let nextMsg = nextStep < TUTORIAL_STEPS.length 
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

  // Import audio ref
  const bgmRef = useRef<HTMLAudioElement | null>(null);

  // Initialize and Control BGM
  useEffect(() => {
    // 1. Initialize Audio Object
    if (!bgmRef.current) {
      console.log(" initializing BGM..."); 
      bgmRef.current = new Audio('/music/bgm.wav');
      bgmRef.current.loop = true;
    }

    const bgm = bgmRef.current;

    // 2. Sync Volume & Mute immediately
    // Note: HTML Audio volume is 0.0 to 1.0. 
    // If your slider sends 0-100, divide by 100 here. If 0-1, keep as is.
    bgm.volume = musicVolume; 
    bgm.muted = muted;

    // 3. Play Logic
    if (view === 'GAME') {
      console.log("Attempting to play BGM...");
      
      const playPromise = bgm.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("BGM playing successfully!");
          })
          .catch((error) => {
            // 🔴 THIS IS USUALLY WHERE IT FAILS
            console.error("BGM Autoplay prevented:", error);
            if (error.name === 'NotAllowedError') {
                // Browser blocked it. We need a click interaction.
                // We can set a flag to try playing on the next click.
            }
          });
      }
    } else {
      bgm.pause();
      if (view === 'HOME' || view === 'LOBBY') {
          bgm.currentTime = 0; // Reset song
      }
    }

    // Cleanup not strictly necessary for ref, but good practice
    return () => {
      // Don't pause on unmount immediately if we want continuous play, 
      // but since we depend on [view], this effect re-runs. 
      // We rely on the logic above to decide play/pause.
    };
  }, [view, muted, musicVolume]);

  useEffect(() => {
    // Set initial position based on Bottom-Left if not already set (only runs once)
    if (leaderboardRef.current && dragPosition.x === 25 && dragPosition.y === 50) {
       
       // Calculate Y: Window Height - Hand Deck Height (approx 260px) - Padding (20px) - Leaderboard Height
       const elementHeight = leaderboardRef.current.offsetHeight;
       const targetY = window.innerHeight - 280 - elementHeight;

       setDragPosition({
           x: 20, // 20px from left edge
           y: Math.max(20, targetY) // Ensure it doesn't go off the top of the screen
       });
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
  const [configError] = useState(false);

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
    if (!auth) return;
    const initAuth = async () => {
      try {
        // @ts-ignore
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          // @ts-ignore
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth failed', err);
        setErrorMsg(t.firebaseError);
      }
    };
    initAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom && urlRoom.length === 6) setRoomCode(urlRoom);
      if (u && !playerName) setView('NAME_INPUT');
    });
    return () => unsub();
  }, [lang]);

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

  const [poppingTemp, setPoppingTemp] = useState<Record<string, boolean>>({});
  const prevTempCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!myPlayer) return;
    
    const next: Record<string, number> = {};
    (myPlayer.tempSkills ?? []).forEach((id) => {
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
  }, [myPlayer?.tempSkills]);

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

  const leaveRoom = async (forced = false) => {
    if (!user) return;
    
    // 1. 尝试从 Firebase 移除自己 (如果是强制退出或在线状态)
    if (!forced && db && roomCode) {
      try {
        const safeRoomCode = roomCode.trim().toUpperCase();
        const roomRef = doc(db, 'rooms', `${APP_ID}_${safeRoomCode}`);
        const snap = await getDoc(roomRef);
        if (snap.exists()) {
          const data = snap.data() as GameState;
          const newPlayers = data.players.filter((p: Player) => p.id !== user.uid);
          await updateDoc(roomRef, { players: newPlayers });
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 2. 本地状态彻底重置 (Fix: 防止残留的 status 导致下一次建房时自动跳过 Lobby)
    setIsOnline(false);
    setRoomCode('');
    
    //重置游戏数据为初始状态
    setGameState({
      status: 'LOBBY',
      turn: 1,
      matchCount: 1,
      players: [],
      logs: [],
      hostId: '',
    });

    setView('HOME');
  };

  useEffect(() => {
    if (!isOnline || !roomCode || !user || !db) return;
    const safeRoomCode = roomCode.trim().toUpperCase();

    const unsub = onSnapshot(
      doc(db, 'rooms', `${APP_ID}_${safeRoomCode}`),
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as GameState;
          setGameState(data);
          const me = data.players.find((p: Player) => p.id === user.uid);
          if (!me?.selectedCardId) {
             setSubmittingMove(false);
          }

          if (data.hostId === user.uid) {
            if (data.status === 'PLAYING') {
              const activePlayers = data.players.filter((p: Player) => !p.isDead);
              const allHumansMoved = activePlayers.filter((p: Player) => !p.isBot).every((p: Player) => p.selectedCardId);

              if (allHumansMoved && activePlayers.some((p: Player) => !p.selectedCardId)) {
                const updatedPlayers = [...data.players];
                updatedPlayers.forEach((p: Player) => {
                  if (p.isBot && !p.isDead && !p.selectedCardId) {
                    p.selectedCardId = getBotMove(p, updatedPlayers);
                  }
                });
                updateDoc(doc(db, 'rooms', `${APP_ID}_${safeRoomCode}`), {
                  players: updatedPlayers,
                });
              } else if (
                allHumansMoved &&
                activePlayers.every((p: Player) => p.selectedCardId)
              ) {
                updateDoc(doc(db, 'rooms', `${APP_ID}_${safeRoomCode}`), {
                  status: 'SHOWDOWN',
                });
              }
            }
          }
        } else {
          if (isOnline) {
            leaveRoom(true);
            alert(t.roomNotFound);
          }
        }
      },
    );
    return () => unsub();
  }, [isOnline, roomCode, user, lang]);

  useEffect(() => {
    if (isTutorial) return;
    if (gameState.status === 'SHOWDOWN' && gameState.hostId === user?.uid) {
      // 3000ms animation + 1000ms pause
      const timer = setTimeout(() => {
        const result = calculateTurnOutcome(
          gameState.players,
          gameState.turn,
          gameState.matchCount,
          lang 
        );
        updateDoc(doc(db, 'rooms', `${APP_ID}_${roomCode.trim().toUpperCase()}`), {
          players: result.players,
          logs: [...result.logs, ...gameState.logs],
          // This changes status to GAMEOVER after the delay
          status: result.isGameOver ? 'GAMEOVER' : 'PLAYING', 
          turn: result.isGameOver ? gameState.turn : gameState.turn + 1,
        });
      }, 2000); // 4 seconds total delay

      return () => clearTimeout(timer);
    }
  }, [gameState.status, gameState.hostId, lang, isTutorial]);

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
      const code = Math.floor(100000 + Math.random() * 900000).toString();
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
            name: playerName || `Player ${code.slice(-2)}`,
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
      await setDoc(doc(db, 'rooms', `${APP_ID}_${code}`), newRoom);
      setRoomCode(code);
      setIsOnline(true);
      setView('LOBBY');
    } catch (err) {
      console.error(err);
      setErrorMsg(t.firebaseError);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    const safeCode = roomCode.trim().toUpperCase();
    if (!user || safeCode.length !== 6) {
      setErrorMsg(t.roomPlaceholder);
      return;
    }
    initAudio();
    playSound('click', muted);
    setLoading(true);
    try {
      const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`);
      const snap = await getDoc(roomRef);
      if (snap.exists()) {
        const data = snap.data() as GameState;
        if (data.status !== 'LOBBY') {
          setErrorMsg(t.gameStarted);
          setLoading(false);
          return;
        }
        const existingPlayer = data.players.find((p: Player) => p.id === user.uid);
        if (!existingPlayer) {
          if (data.players.length >= MAX_PLAYERS) {
            setErrorMsg(t.roomFull);
            setLoading(false);
            return;
          }
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
          await updateDoc(roomRef, { players: [...data.players, newPlayer] });
        }
        setIsOnline(true);
        setView('LOBBY');
      } else {
        setErrorMsg(t.roomNotFound);
      }
    } catch (err) {
      setErrorMsg('Network error');
    } finally {
      setLoading(false);
    }
  };

  const copyGameInvite = () => { playSound('click', muted); const currentUrl = window.location.href.split('?')[0]; const inviteUrl = `${currentUrl}?room=${roomCode}`; const text = `Bobozan ${t.roomCode}: ${roomCode}\n${inviteUrl}`; copyToClipboard(text, t.inviteCopied); };
  const startGameHost = async () => { if (!isOnline) return; playSound('confirm', muted); if (gameState.players.length < MIN_PLAYERS) { setToastMsg(`${t.needPlayers} (${MIN_PLAYERS}+)`); return; } const safeCode = roomCode.trim().toUpperCase(); const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`); await updateDoc(roomRef, { status: 'PLAYING', logs: [{ turn: 1, text: lang === 'zh' ? '游戏开始!' : 'Game Started!', type: 'info' }, ...gameState.logs], }); setView('GAME'); };
  
  const addBot = async () => {
    if (!isOnline || gameState.status !== 'LOBBY') return;
    playSound('click', muted);
    if (gameState.players.length >= MAX_PLAYERS) {
      setToastMsg(t.roomFull);
      return;
    }
    const safeCode = roomCode.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`);
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
    await updateDoc(roomRef, { players: [...gameState.players, newBot] });
  };

  const removeBot = async () => { if (!isOnline || gameState.status !== 'LOBBY') return; playSound('click', muted); const bots = gameState.players.filter((p: Player) => p.isBot); if (bots.length === 0) return; const lastBotId = bots[bots.length - 1].id; const safeCode = roomCode.trim().toUpperCase(); const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`); const newPlayers = gameState.players.filter((p: Player) => p.id !== lastBotId); await updateDoc(roomRef, { players: newPlayers }); };
  const handleDiscardSkill = async (discardLvl: number) => {
    if (!isOnline || !user || !db || !myPlayer?.pendingLevel) return;

    const safeCode = roomCode.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`);
    const newPending = myPlayer.pendingLevel; // 刚赢回来的那个

    // 复制玩家列表
    const updatedPlayers = gameState.players.map((p) => {
      if (p.id === user.uid) {
        let newInv = [...p.inventory];
        
        // 如果玩家选择丢弃的是“刚才赢回来的新技能” (discardLvl === newPending)
        // 那就什么都不做，直接把 pendingLevel 清空即可 (相当于放弃奖励)
        
        // 如果玩家选择丢弃的是“旧技能”
        if (discardLvl !== newPending) {
          // 1. 删掉旧的
          newInv = newInv.filter(l => l !== discardLvl);
          // 2. 加上新的
          if (!newInv.includes(newPending)) {
            newInv.push(newPending);
          }
        }

        // 排序一下好看点
        newInv.sort((a, b) => a - b);

        return {
          ...p,
          inventory: newInv,
          pendingLevel: null, // 清空暂存状态
        };
      }
      return p;
    });

    await updateDoc(roomRef, { players: updatedPlayers });
    playSound('click', muted);
  };

  // Toggle "Share" Mode
  const toggleShare = async () => {
    if (!isOnline || !user || !db || !roomCode) return;
    // Check if player actually has the skills to share (Lv3 or Lv18)
    if (!myPlayer || (!myPlayer.inventory.includes(3) && !myPlayer.inventory.includes(18))) return;

    const safeCode = roomCode.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`);
    
    playSound('click', muted);

    const updatedPlayers = gameState.players.map((p) => 
      p.id === user.uid ? { ...p, isShared: !p.isShared } : p
    );

    try {
      await updateDoc(roomRef, { players: updatedPlayers });
    } catch (e) {
      console.error(e);
    }
  };

  const submitMove = async (cardId: string) => {
    if (!isOnline || submittingMove) return;

    // 1. 清理 Tooltip 和 Hover 状态
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    setHoveredCard(null);
    setTooltipPos(null);

    setSubmittingMove(true);
    initAudio();
    playSound('draw', muted);

    // 不等服务器返回，先在本地立即把状态改成“已出牌”，防止界面回弹/卡顿
    setGameState(prev => ({
      ...prev,
      players: prev.players.map(p => 
        p.id === user.uid ? { ...p, selectedCardId: cardId } : p
      )
    }));

    // 2. 发送请求给 Firebase
    const roomRef = doc(db, 'rooms', `${APP_ID}_${roomCode.trim().toUpperCase()}`);
    
    // 这里的 updatedPlayers 基于当前的 gameState 计算
    const updatedPlayers = gameState.players.map((p: Player) =>
      p.id === user.uid ? { ...p, selectedCardId: cardId } : p,
    );

    try {
      await updateDoc(roomRef, { players: updatedPlayers });
    } catch (error) {
      console.error("Failed to submit move:", error);
      setSubmittingMove(false); // 如果真的失败了，解开锁让玩家重试
      setToastMsg(lang === 'zh' ? '出牌失败，请重试' : 'Move failed, try again');
    }
  };
  const sendEmoji = async (emoji: string) => {
    if (!isOnline || !user || !db || !roomCode) return;

    const safeCode = roomCode.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`);

    // 把当前 players 映射一遍，只改自己那一位
    const updatedPlayers = gameState.players.map((p: Player) =>
      p.id === user.uid
        ? { ...p, emoji, emojiAt: Date.now() }
        : p
    );

    try {
      await updateDoc(roomRef, { players: updatedPlayers });
    } catch (e) {
      console.error('sendEmoji failed', e);
    }
  };

  const toggleRevengeMode = async () => {
    if (!isOnline || !db || !roomCode || gameState.hostId !== user?.uid) return;
    const safeCode = roomCode.trim().toUpperCase();
    const roomRef = doc(db, 'rooms', `${APP_ID}_${safeCode}`);
    
    // 切换状态 (如果 undefined 默认为 true，取反即为 false)
    const currentMode = gameState.revengeMode ?? true;
    await updateDoc(roomRef, { revengeMode: !currentMode });
    playSound('click', muted);
  };

  const nextMatchHost = async () => {
    // 1. Play Sound
    playSound('confirm', muted);

    // 2. Define Helper for Bonus Card
    const getRandomBonusCard = () => {
      // Ensure we filter correctly. SKILL_DB must be accessible.
      const pool = SKILL_DB.filter(c => c.cost === 1 && (c.type === 'ATTACK' || c.type === 'SPECIAL'));
      if (pool.length === 0) return null;
      return pool[Math.floor(Math.random() * pool.length)];
    };

    // 3. Reset Players Logic (with UNDEFINED protection)
    const resetPlayers = gameState.players.map((p) => {
      const isSurvivor = !p.isDead;
      const newLoseStreak = isSurvivor ? 0 : (p.loseStreak || 0) + 1;

      let newTempSkills: string[] = [];
      
      let newRevengeTime = null; // 准备时间戳变量

      const isRevengeOn = gameState.revengeMode ?? true; // 默认为开

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
    try {
      const logText = lang === 'zh'
        ? `--- 第 ${gameState.matchCount + 1} 局 ---`
        : `--- MATCH ${gameState.matchCount + 1} ---`;

      await updateDoc(doc(db, 'rooms', `${APP_ID}_${roomCode.trim().toUpperCase()}`), {
        status: 'PLAYING',
        matchCount: gameState.matchCount + 1,
        turn: 1,
        players: resetPlayers,
        logs: [
          { turn: 1, text: logText, type: 'info' },
          ...gameState.logs,
        ],
      });
    } catch (err) {
      console.error("Error starting next match:", err);
      // Optional: Show error toast to user
      // setToastMsg("Error starting next match. Check console.");
    }
  };

  // Find player who just got revenge card (within last 5 seconds)
  const recentRevengePlayer = gameState.players.find(p =>
    p.revengeObtainedAt && Date.now() - p.revengeObtainedAt < 5000
  );

  const toggleLang = () => { playSound('click', muted); setLang(prev => prev === 'zh' ? 'en' : 'zh'); }
  const toggleMute = () => { setMuted(!muted); }

  useEffect(() => {
    if (!myPlayer) return;

    // build current counts of free skills
    const next: Record<string, number> = {};
    (myPlayer.freeSkills ?? []).forEach((id) => {
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
  }, [myPlayer?.freeSkills]);

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
  if (configError) return ( <div className="min-h-screen w-screen bg-black text-red-500 flex items-center justify-center p-4 text-center"><div><AlertTriangle size={48} className="mx-auto mb-4" /><h1 className="text-2xl font-bold mb-2">{t.firebaseError}</h1><p>{t.checkEnv}</p></div></div> );

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
      {BACKGROUND_CARDS.map((item: any) => {
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
            src="/babydragtitle.png" 
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
        {BACKGROUND_CARDS.map((item: any) => {
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
                      <img src={playerAvatar} className="w-full h-full object-cover" alt="Me" />
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
              <button onClick={createRoom} disabled={loading} className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-orange-600 to-red-600 p-[1px] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl hover:shadow-orange-500/25 disabled:opacity-50 disabled:pointer-events-none">
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
                  <button onClick={joinRoom} disabled={loading || roomCode.length < 6} className="aspect-square h-auto bg-slate-700 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-bold transition-all shadow-lg flex items-center justify-center group">
                    {loading ? <Loader className="animate-spin" size={24} /> : <ArrowUp className="rotate-90 group-hover:translate-x-1 transition-transform" size={28} />}
                  </button>
              </div>
              
              {errorMsg && (
                <div className="flex items-center gap-3 text-red-300 text-xs font-bold bg-red-950/40 p-3 rounded-xl border border-red-900/50 animate-in slide-in-from-top-2">
                    <AlertTriangle size={16} className="text-red-500 shrink-0" />
                    {errorMsg}
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
        {BACKGROUND_CARDS.map((item: any) => {
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

  let winnerSkillZh: string | null = null;
  let winnerSkillEn: string | null = null;

  if (winnerPlayer) {
    // 根据 matchCount 找这一局解锁的技能（取该等级的第一张）
    const unlockedSkill = SKILL_DB.find(
      (c) => c.levelRequired === gameState.matchCount,
    );
    if (unlockedSkill) {
      winnerSkillZh = unlockedSkill.name.zh;
      winnerSkillEn = unlockedSkill.name.en;
    }
  }
  
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
        {BACKGROUND_CARDS.slice(0, 6).map((item: any) => {
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
                    {tutorialMsg?.title && typeof tutorialMsg.title === 'object' 
                        ? (tutorialMsg.title as any)[lang] 
                        : (tutorialMsg?.title || "")}
                  </h2>
                  
                  <p className="text-lg text-yellow-100 font-medium leading-relaxed">
                    {tutorialMsg?.sub && typeof tutorialMsg.sub === 'object' 
                        ? (tutorialMsg.sub as any)[lang] 
                        : (tutorialMsg?.sub || "")}
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
                                      src={p.avatar} 
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
                    : 'transition-all duration-[1200ms] cubic-bezier(0.34,1.56,0.64,1)';

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
                                            src={displayWinner.avatar} 
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
                                          onMouseEnter={(e: any) => handleMouseEnter(e, c.id)}
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