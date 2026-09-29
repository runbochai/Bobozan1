/** An open pixel clearing, with no central table or raised arena. */
export default function BattleArena({ turn, showdown, lang }: { turn: number; showdown: boolean; lang: 'zh' | 'en' }) {
  return <div className="battle-clearing" aria-hidden="true">
    <svg viewBox="0 0 1000 620" preserveAspectRatio="none" shapeRendering="crispEdges">
      <path d="M0 118h90v12h85v-8h150v12h120v-8h160v14h175v-12h120v-8h100v500H0z" fill="#162c35" opacity=".58" />
      <path d="M0 206h150v12h120v-6h150v12h220v-14h130v10h230v400H0z" fill="#17313a" opacity=".5" />
      <path d="M0 434h210v16h174v-10h228v14h140v-8h248v174H0z" fill="#1c3640" opacity=".55" />
      <g fill="#426057" opacity=".42">{Array.from({ length: 32 }, (_, i) => <path key={i} d={`M${(i * 167 + 35) % 980} ${160 + (i * 73) % 420}h14v3h-14z`} />)}</g>
      <g fill="#47616a" opacity=".32">{Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${(i * 211 + 80) % 960} ${190 + (i * 79) % 380}h22v3h8v5h-34v-5h4z`} />)}</g>
    </svg>
    <div className="battle-round-label"><span>ROUND {String(turn).padStart(2, '0')}</span>{showdown && <small>{lang === 'zh' ? '交锋' : 'CLASH'}</small>}</div>
    <div className="clearing-motes">{Array.from({ length: 8 }, (_, i) => <i key={i} style={{ left: `${9 + i * 12}%`, top: `${28 + i % 3 * 22}%`, animationDelay: `${-i * .7}s` }} />)}</div>
  </div>;
}
