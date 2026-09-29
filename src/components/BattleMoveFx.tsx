import type { CSSProperties } from 'react';
import { Shield, Zap } from './PixelIcons';

/** One animation per revealed move. Its parent supplies a turn-specific key. */
export default function BattleMoveFx({ type }: { type: string }) {
  const kind = type === 'CHARGE' ? 'charge' : type === 'DEFEND' ? 'guard' : type === 'ULTIMATE' ? 'ultimate' : type === 'ATTACK' ? 'strike' : 'special';
  return <div className={`battle-move-fx move-${kind}`} aria-hidden="true">
    <div className="move-ring"/><div className="move-ring move-ring-second"/>
    {kind==='guard' ? <Shield className="move-emblem" size={130}/> : kind==='charge' ? <Zap className="move-emblem" size={90}/> : <><div className="move-slash"/><div className="move-slash move-slash-second"/></>}
    {Array.from({length:10},(_,i)=><i key={i} className="move-spark" style={{'--dx':`${Math.cos(i*Math.PI/5)*110}px`,'--dy':`${Math.sin(i*Math.PI/5)*100}px`,'--lag':`${i%3*40}ms`} as CSSProperties}/>)}
    <b>{kind==='charge'?'+2':kind==='guard'?'GUARD':kind==='ultimate'?'ULTIMATE!':kind==='strike'?'STRIKE!':'SKILL!'}</b>
  </div>;
}
