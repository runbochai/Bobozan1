import { MAX_HP } from '../data/constants';
import type { Player } from '../types';

export interface BotPersonality {
  aggression: number;
  defense: number;
  charge: number;
  smart: number;
}

const STYLES = [
  { name: { zh: '均衡型', en: 'Balanced' }, personality: { aggression: .65, defense: .7, charge: .6, smart: .9 } },
  { name: { zh: '进攻型', en: 'Aggressive' }, personality: { aggression: .95, defense: .45, charge: .45, smart: .85 } },
  { name: { zh: '稳健型', en: 'Careful' }, personality: { aggression: .5, defense: .95, charge: .75, smart: .95 } },
];

export function botSeed(value: string): number {
  let seed = 2166136261;
  for (const char of value) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}

export const getBotStyle = (id: string) => STYLES[botSeed(id) % STYLES.length];

export const BOT_AVATAR = 'avatars/robot.webp';

/** Multiplayer bots have their own robot; expedition enemies retain their identity. */
export function playerAvatar(player: Player): string | undefined {
  if (!player.isBot || player.id.startsWith('exp_') || player.avatar?.includes('avatars/enemies/')) return player.avatar;
  return BOT_AVATAR;
}

export function createBot(id: string, players: Player[]): Player {
  let number = 1;
  while (players.some(p => p.name === `Bot ${number}`)) number++;
  return {
    id, name: `Bot ${number}`, avatar: BOT_AVATAR, isBot: true,
    hp: MAX_HP, energy: 0, isDead: false, inventory: [0], layer: 0, tempLayerMod: 0,
    selectedCardId: null, lastCardId: null, lastAction: null,
    emoji: null, emojiAt: null, freeSkills: [], pendingLevel: null, disabledSkills: [],
    revengeObtainedAt: null, kills: 0,
  };
}
