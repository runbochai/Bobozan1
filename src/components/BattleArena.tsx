import { useId } from 'react';
import './BattleTable.css';
import { getTableGeometry } from '../logic/battleLayout';

interface ArenaProps {
  turn: number;
  showdown: boolean;
  lang: 'zh' | 'en';
  compact?: boolean;
  playerCount?: number;
}

type Point = { x: number; y: number };
const coordinates = (points: Point[]) => points.map(point => `${point.x},${point.y}`).join(' ');

/** A single pixel table; its edge and the characters' seats share the same polygon. */
export default function BattleArena({ turn, showdown, compact = false, playerCount = 2 }: ArenaProps) {
  const id = useId().replace(/:/g, '');
  const { vertices, center, sides } = getTableGeometry(compact, playerCount);
  const middle = { x: center.x * 10, y: center.y * 10 };
  const outer = vertices.map(point => ({ x: point.x * 10, y: point.y * 10 }));
  const inset = (scale: number) => outer.map(point => ({
    x: middle.x + (point.x - middle.x) * scale,
    y: middle.y + (point.y - middle.y) * scale,
  }));
  const rim = inset(.958);
  const surface = inset(.887);
  const edgePoints = outer.map((point, index) => ({ a: point, b: outer[(index + 1) % sides], index }));
  const seats = edgePoints.filter(({ index }) => playerCount !== 2 || index === 0 || index === 2);
  const frontEdges = edgePoints.filter(({ a, b }) => b.x > a.x + .1);
  return <>
    <div className="battle-scenery-props pixel-table-supports" aria-hidden="true">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" shapeRendering="crispEdges">
        <polygon points={coordinates(outer.map(point => ({ x: middle.x + (point.x - middle.x) * 1.05, y: point.y + 55 })))} fill="#080c10" opacity=".55" />
        {frontEdges.flatMap(({ a, b, index }) => (sides <= 4 ? [.18, .82] : [.5]).map(position => {
          const leg = { x: a.x + (b.x - a.x) * position, y: a.y + (b.y - a.y) * position };
          return <g key={`leg-${index}-${position}`}>
            <path d={`M${leg.x - 14} ${leg.y + 7}h28v64h-8v12h-24v-12h4z`} fill="#251d19" />
            <path d={`M${leg.x - 8} ${leg.y + 15}h10v50h-10z`} fill="#795035" />
            <path d={`M${leg.x + 2} ${leg.y + 15}h7v56H${leg.x + 2}z`} fill="#463022" />
          </g>;
        }))}
        {seats.map(({ a, b, index }) => {
          const seat = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
          const outward = { x: seat.x + (seat.x - middle.x) * .1, y: seat.y + (seat.y - middle.y) * .1 };
          return <g key={`chair-${index}`} className="pixel-table-chair" data-seat-side={index} transform={`translate(${outward.x} ${outward.y}) rotate(${angle})`}>
            <path d="M-47-12h94v34h-8v10h-78V22h-8z" fill="#171918" />
            <path d="M-41-14h82v29h-82z" fill="#65472f" />
            <path d="M-35-12h70v8h-70z" fill="#b0804e" />
            <path d="M-34-2h68v16h-68z" fill="#395152" />
            <path d="M-28 0h56v4h-56z" fill="#58706a" />
            <path d="M-39 16h9v12h-9zM30 16h9v12h-9z" fill="#493325" />
          </g>;
        })}
      </svg>
    </div>
    <div className={`battle-scenery battle-scenery-table pixel-table-scene ${showdown ? 'battle-scenery-clash' : ''}`} data-table-sides={sides} data-round={turn} aria-hidden="true">
      <svg viewBox="0 0 1000 1000" preserveAspectRatio="none" shapeRendering="crispEdges">
        <defs>
          <clipPath id={`${id}-surface`}><polygon points={coordinates(surface)} /></clipPath>
          <pattern id={`${id}-planks`} width="320" height="104" patternUnits="userSpaceOnUse">
            <rect width="320" height="104" fill="#8c5e3c" />
            <rect width="320" height="50" fill="#956640" />
            <path d="M0 50h320v4H0zM0 100h320v4H0z" fill="#69472f" />
            <path d="M0 54h320v3H0zM0 4h320v3H0z" fill="#ad7a4b" />
            <path d="M76 7v43M238 57v43" stroke="#735035" strokeWidth="4" />
            <path d="M12 20h35v3H12zM160 36h57v3h-57zM100 72h48v3h-48zM266 87h40v3h-40z" fill="#b17e50" opacity=".45" />
            <path d="M82 32h37v3H82zM202 75h21v3h-21zM20 88h26v3H20z" fill="#63462f" opacity=".55" />
          </pattern>
        </defs>
        {frontEdges.map(({ a, b, index }) => <g key={`edge-${index}`}>
          <polygon points={`${a.x},${a.y} ${b.x},${b.y} ${b.x},${b.y + 25} ${a.x},${a.y + 25}`} fill="#473022" stroke="#191b18" strokeWidth="7" strokeLinejoin="miter" />
          <path d={`M${a.x} ${a.y + 9}L${b.x} ${b.y + 9}`} stroke="#805333" strokeWidth="6" />
        </g>)}
        <polygon className="pixel-table-outline" points={coordinates(outer)} fill="#4a3224" stroke="#171b19" strokeWidth="10" strokeLinejoin="miter" />
        <polygon points={coordinates(rim)} fill="#b48450" stroke="#d1a568" strokeWidth="3" strokeLinejoin="miter" />
        <polygon points={coordinates(surface)} fill={`url(#${id}-planks)`} stroke="#5a3b28" strokeWidth="9" strokeLinejoin="miter" />
        <g clipPath={`url(#${id}-surface)`}>
          <path d={`M${middle.x - 178} ${middle.y - 135}h49v4h-49zM${middle.x + 118} ${middle.y + 122}h61v4h-61zM${middle.x - 246} ${middle.y + 46}h30v4h-30z`} fill="#5b412e" opacity=".55" />
          <path d={`M${middle.x + 178} ${middle.y - 92}h31v4h-31zM${middle.x - 115} ${middle.y + 174}h38v4h-38z`} fill="#c18c57" opacity=".55" />
          <g className="pixel-table-emblem" transform={`translate(${middle.x} ${middle.y})`} fill="none" stroke="#60442f" strokeWidth="5">
            <path d="M-45-22h14v-14h62v14h14v44H31v14h-62V22h-14z" />
            <path d="M-15-12h8v-8H7v8h8v24H7v8H-7v-8h-8z" fill="#bc8a54" stroke="none" />
            <path d="M-64-6h-10V6h10M64-6h10V6H64" />
          </g>
        </g>
        {rim.map((point, index) => <g key={`pin-${index}`} transform={`translate(${point.x} ${point.y})`}>
          <path d="M-6-6H6V6H-6z" fill="#4e3826" />
          <path d="M-4-4h7v7h-7z" fill="#dfb970" />
          <path d="M-3 2h6v2h-6z" fill="#a67a46" />
        </g>)}
        {seats.map(({ a, b, index }) => {
          const seat = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          const mark = { x: middle.x + (seat.x - middle.x) * .795, y: middle.y + (seat.y - middle.y) * .795 };
          const angle = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
          return <g key={`place-${index}`} transform={`translate(${mark.x} ${mark.y}) rotate(${angle})`} fill="#5e4430" opacity=".6">
            <path d="M-24-6h8v3h-5v6h-3zM16-6h8V3h-3v-6h-5zM-3-3h6v6h-6z" />
          </g>;
        })}
      </svg>
    </div>
  </>;
}
