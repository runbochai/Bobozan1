import './BattleTable.css';
import { getTableGeometry } from '../logic/battleLayout';

/** Only decoration changes with the theme; shared seat/table geometry stays fixed. */
export default function BattleArena({ turn, showdown, lang, compact = false }: { turn: number; showdown: boolean; lang: 'zh' | 'en'; compact?: boolean }) {
  const { frame } = getTableGeometry(compact);
  const style = { inset: 'auto', left: `${frame.x}%`, top: `${frame.y}%`, width: `${frame.width}%`, height: `${frame.height}%` };
  return <div className={`battle-scenery battle-scenery-table ${showdown ? 'battle-scenery-clash' : ''}`} aria-hidden="true" style={style}>
    <svg viewBox="0 0 1000 620" preserveAspectRatio="none" shapeRendering="crispEdges">
      <defs>
        <pattern id="arena-print-grain" width="39" height="31" patternUnits="userSpaceOnUse">
          <path d="M4 8h2v1H4zM25 22h3v1h-3zM33 4h1v2h-1zM13 27h2v1h-2z" fill="var(--world-line)" opacity=".16" />
          <path d="M16 14h3v1h-3zM2 25h1v2H2z" fill="var(--world-edge)" opacity=".28" />
        </pattern>
      </defs>
      <path d="M45 578h910l-18 14H63z" fill="#11191c" opacity=".65" />
      <path d="M25 545h950v17l-20 17H45l-20-17z" fill="var(--world-edge)" stroke="var(--world-rim)" strokeWidth="4" />
      <path d="M180 75h640l155 470H25z" fill="var(--world-rim)" stroke="var(--world-edge)" strokeWidth="6" />
      <path d="M184 82h632l145 454H39z" fill="none" stroke="var(--world-line)" strokeWidth="2" opacity=".6" />
      <path d="M195 94h610l133 426H62z" fill="var(--world-felt)" stroke="var(--world-edge)" strokeWidth="5" />
      <path d="M195 94h610l133 426H62z" fill="url(#arena-print-grain)" />
      <path d="M216 112h568l119 386H97z" fill="none" stroke="var(--world-line)" strokeWidth="2" opacity=".5" />
      <g fill="none" stroke="var(--world-line)" strokeWidth="2" opacity=".55">
        <path d="M224 140v-19h32M744 121h32v19M117 466v20h32M850 486h32v-20" />
        <path d="m500 252 62 56-62 56-62-56zM477 308h46M500 291v34" opacity=".42" />
      </g>
      <path d="M82 554h836M133 563h44M801 563h47M227 84h67M710 84h48" fill="none" stroke="var(--world-line)" opacity=".25" strokeWidth="2" />
    </svg>
    <div className="arena-round"><span>ROUND {String(turn).padStart(2, '0')}</span><strong>{showdown ? 'CLASH!' : 'VS'}</strong><small>{lang === 'zh' ? '攒 · 攻 · 防' : 'CHARGE · STRIKE · GUARD'}</small></div>
  </div>;
}
