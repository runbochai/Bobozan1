import { useEffect, useRef, useState } from 'react';
import type { BattleSpeed, Player } from '../types';
import { battleTimeMs } from '../logic/battleSpeed';
import { playSound } from '../audio/sound';

interface RewardPresentation { key: string; cardId: string; speed: BattleSpeed }
interface Announcement { key: string; names: string[]; speed: BattleSpeed }

/** Room snapshots own rewards; dismissing an effect never consumes the card. */
export function useRevengePresentation({ roomKey, inBattle, matchCount, players, playerId, enabled, speed, muted }: {
  roomKey: string | null; inBattle: boolean; matchCount: number; players: Player[];
  playerId: string; enabled: boolean; speed: BattleSpeed; muted: boolean;
}) {
  const observed = useRef<{ room: string | null; match: number; enabled: boolean; awards: Set<string> }>(
    { room: null, match: matchCount, enabled, awards: new Set() });
  const [reward, setReward] = useState<RewardPresentation | null>(null);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    // Queue visual cues on a frame; newer snapshots cancel stale, unpainted work.
    const frame = window.requestAnimationFrame(() => {
      const previous = observed.current;
      const sameRoom = roomKey !== null && previous.room === roomKey;
      if (!sameRoom) {
        previous.awards.clear();
        setReward(null);
        setAnnouncement(null);
      }
      if (sameRoom && enabled && !previous.enabled && !inBattle) playSound('confirm', muted);
      const nextMatch = sameRoom && matchCount > previous.match;
      previous.room = roomKey;
      previous.match = matchCount;
      previous.enabled = enabled;
      if (!roomKey || !inBattle) {
        setReward(null);
        setAnnouncement(null);
        return;
      }
      if (nextMatch) setReward(null);

      const now = Date.now();
      const awards = players.filter(player => {
        const at = player.revengeObtainedAt;
        if (!at || !Number.isFinite(at) || !player.tempSkills?.length) return false;
        // A new match is authoritative even when the host clock or transaction is late.
        // Freshness only suppresses old rewards in an initial/reconnected snapshot.
        if (!nextMatch && (now - at >= 5000 || at - now > 5000)) return false;
        const key = `${matchCount}:${player.id}:${at}`;
        if (previous.awards.has(key)) return false;
        previous.awards.add(key);
        return true;
      });
      if (awards.length) {
        setAnnouncement({ key: `${roomKey}:${matchCount}:${awards.map(player => `${player.id}:${player.revengeObtainedAt}`).join('|')}`,
          names: awards.map(player => player.name), speed });
      }
      const me = awards.find(player => player.id === playerId)
        // Older hosts do not write a timestamp; keep their personal reveal working.
        ?? (nextMatch ? players.find(player => player.id === playerId && !player.revengeObtainedAt && player.tempSkills?.length) : undefined);
      if (me?.tempSkills?.[0]) {
        setReward({ key: `${roomKey}:${matchCount}:${me.revengeObtainedAt ?? 'legacy'}`, cardId: me.tempSkills[0], speed });
        playSound('win', muted);
      } else if (awards.length) playSound('confirm', muted);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [roomKey, inBattle, matchCount, players, playerId, enabled, speed, muted]);

  useEffect(() => {
    if (!announcement) return;
    const timer = window.setTimeout(() => setAnnouncement(null), battleTimeMs(2200, announcement.speed));
    return () => window.clearTimeout(timer);
  }, [announcement]);

  const scope = roomKey && inBattle ? `${roomKey}:${matchCount}:` : null;
  return { reward: scope && reward?.key.startsWith(scope) ? reward : null,
    announcement: scope && announcement?.key.startsWith(scope) ? announcement : null,
    dismissReward: () => setReward(null) };
}
