import type { Player } from '../types';
import { ArrowUp, Heart, Zap } from './PixelIcons';

export default function BattleStats({ player, maxHp }: { player: Player; maxHp: number }) {
  const layer = (player.layer ?? 0) + (player.tempLayerMod ?? 0);
  return <div className="battle-stats">
    <div className="battle-energy"><Zap size={16} /><strong>{player.energy}</strong>{layer > 0 && <span className="battle-layer"><ArrowUp size={14} />{layer}</span>}</div>
    <div className="battle-health"><Heart size={14} /><span className="battle-health-track" role="meter" aria-label={`${player.name} HP`} aria-valuemin={0} aria-valuemax={maxHp} aria-valuenow={Math.max(0, Math.min(maxHp, player.hp ?? 0))}>
      <i style={{ width: `${Math.max(0, Math.min(100, (player.hp ?? 0) / Math.max(1, maxHp) * 100))}%` }} />
    </span><b>{player.hp}</b></div>
  </div>;
}
