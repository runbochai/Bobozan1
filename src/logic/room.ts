import type { GameState, Lang, Player } from '../types';
import { MAX_PLAYERS, MIN_PLAYERS } from '../data/constants';
import { calculateTurnOutcome, getPlayerCards } from './combat';
import { getBotMove } from './botAI';

export type RoomPatch = Partial<GameState> | null;
export type RoundId = Pick<GameState, 'turn' | 'matchCount'>;
export const sameRound = (room: GameState, round: RoundId) =>
  room.turn === round.turn && room.matchCount === round.matchCount;

export function joinPlayer(room: GameState, player: Player): RoomPatch {
  // Existing members can reconnect during a match, even when the room is full.
  if (room.players.some(p => p.id === player.id)) return null;
  if (room.status !== 'LOBBY') throw new Error('gameStarted');
  if (room.players.length >= MAX_PLAYERS) throw new Error('roomFull');
  return { players: [...room.players, player] };
}

export function leavePlayer(room: GameState, uid: string): RoomPatch {
  if (!room.players.some(p => p.id === uid)) return null;
  const players = room.players.filter(p => p.id !== uid);
  const hostId = room.hostId === uid
    ? players.find(p => !p.isBot)?.id ?? ''
    : room.hostId;
  return { players, hostId, ...(!hostId ? { status: 'GAMEOVER' as const } : {}) };
}

export function patchPlayer(room: GameState, uid: string, update: (p: Player) => Player): RoomPatch {
  if (!room.players.some(p => p.id === uid)) throw new Error('Player is no longer in the room');
  return { players: room.players.map(p => p.id === uid ? update(p) : p) };
}

export function submitPlayerMove(room: GameState, uid: string, cardId: string, round: RoundId): RoomPatch {
  if (room.status !== 'PLAYING' || !sameRound(room, round)) throw new Error('Round has changed');
  const player = room.players.find(p => p.id === uid);
  if (!player || player.isDead || player.selectedCardId) throw new Error('Move is already locked or player is inactive');
  const card = getPlayerCards(player, room.players).find(c => c.id === cardId);
  if (!card || player.disabledSkills?.includes(cardId)) throw new Error('Unavailable card');
  if (!player.freeSkills?.includes(cardId) && player.energy < card.cost) throw new Error('Insufficient energy');
  return patchPlayer(room, uid, p => ({ ...p, selectedCardId: cardId }));
}

export function startRoom(room: GameState, uid: string, lang: Lang): RoomPatch {
  if (room.hostId !== uid || room.status !== 'LOBBY') return null;
  if (room.players.length < MIN_PLAYERS) throw new Error('needPlayers');
  return { status: 'PLAYING', logs: [{ turn: 1, text: lang === 'zh' ? '游戏开始!' : 'Game Started!', type: 'info' }, ...room.logs] };
}

export function advanceRoom(room: GameState, uid: string): RoomPatch {
  if (room.hostId !== uid || room.status !== 'PLAYING') return null;
  const active = room.players.filter(p => !p.isDead);
  // A departure can leave one survivor. Resolve it without waiting for another move.
  if (active.length > 1 && active.some(p => !p.isBot && !p.selectedCardId)) return null;
  const players = room.players.map(p => !p.isDead && !p.selectedCardId
    ? { ...p, selectedCardId: active.length <= 1 ? 'charge' : getBotMove(p, room.players, room) }
    : p);
  return { players, status: 'SHOWDOWN' };
}

export function settleRoom(room: GameState, uid: string, round: RoundId, lang: Lang): RoomPatch {
  if (room.hostId !== uid || room.status !== 'SHOWDOWN' || !sameRound(room, round)) return null;
  const result = calculateTurnOutcome(room.players, room.turn, room.matchCount, lang);
  return {
    players: result.players,
    logs: [...result.logs, ...room.logs].slice(0, 300),
    status: result.isGameOver ? 'GAMEOVER' : 'PLAYING',
    turn: result.isGameOver ? room.turn : room.turn + 1,
    // 有人被淘汰且游戏继续：幸存者重置计数 +1，客户端据此播放“阶段重置”过场
    ...(result.survivorReset ? { resetSeq: (room.resetSeq ?? 0) + 1 } : {}),
  };
}
