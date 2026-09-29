import './BattleTable.css';
import { getTableGeometry } from '../logic/battleLayout';

/** Decorative battlefield; never participates in hit testing. */
export default function BattleArena({ turn, showdown, lang, compact=false }: { turn: number; showdown: boolean; lang: 'zh' | 'en'; compact?: boolean }) {
  const {frame}=getTableGeometry(compact);
  return <div className={`battle-scenery ${showdown ? 'battle-scenery-clash' : ''}`} aria-hidden="true"
    style={{inset:'auto',left:`${frame.x}%`,top:`${frame.y}%`,width:`${frame.width}%`,height:`${frame.height}%`}}>
    <svg viewBox="0 0 1000 620" preserveAspectRatio="none" shapeRendering="crispEdges">
      <defs><pattern id="arena-stones" width="100" height="52" patternUnits="userSpaceOnUse"><path d="M2 2h94v46H2z" fill="#243947" stroke="#405664" strokeWidth="2"/><path d="M8 8h42M84 37h8" stroke="#6e807c" strokeWidth="2" opacity=".35"/></pattern></defs>
      <path d="M180 75h640l155 470H25z" fill="#101d2c" stroke="#997958" strokeWidth="12"/>
      <path d="M188 85h624l140 443H48z" fill="url(#arena-stones)" stroke="#596e73" strokeWidth="4"/>
      <path d="M80 553h840l-24 22H104z" fill="#09131e"/>
      <g stroke="#71908d" fill="none" opacity=".42"><path d="M240 145h520l88 306H152z" strokeWidth="3"/><path d="M500 115v365M150 300h700" strokeDasharray="9 18"/></g>
      <g className="arena-sigil" fill="none" stroke="#57bbbd"><path d="m500 212 125 72v88l-125 72-125-72v-88z" strokeWidth="3"/><path d="m500 239 98 57v64l-98 57-98-57v-64z" strokeWidth="2"/><path d="m500 255 20 53 63 20-63 20-20 52-20-52-63-20 63-20z" strokeWidth="4"/></g>
      {[80,920].map((x,i)=><g key={x} transform={`translate(${x} 0)`}>
        <path d="M-30 45h60v40h-8v120h-44V85h-8z" fill="#344955" stroke="#152131" strokeWidth="5"/>
        <path d="M-19 87h38v54l-19 23-19-23z" fill={i?'#397d8e':'#a44543'}/>
        <path d="M-4 103h8v25h-8zM-12 111h24v8h-24z" fill="#efcd8e"/>
        <path d="M-16 181h32v18h-32zM-6 195h12v42H-6z" fill="#977354"/>
        <g className={`arena-flame arena-flame-${i}`}><path d="M-15 179v-19h7v-15h8v-20h7v26h8v28z" fill="#eb824c"/><path d="M-6 179v-20h6v-13h6v33z" fill="#ffe39a"/></g>
      </g>)}
      <path d="m275 173 13 22-7 11 19 16m387 176-20 9 6 16-22 14M177 402l23 8-4 15" fill="none" stroke="#101f2c" strokeWidth="5"/>
      <g fill="#213f43"><path d="M90 482h32v7H90zM130 490h19v8h-19zM810 115h35v6h-35zM818 124h14v5h-14z"/></g>
    </svg>
    <div className="arena-round"><span>ROUND {String(turn).padStart(2,'0')}</span><strong>{showdown ? 'CLASH!' : 'VS'}</strong><small>{lang==='zh'?'攒 · 攻 · 防':'CHARGE · STRIKE · GUARD'}</small></div>
    <div className="arena-embers">{Array.from({length:12},(_,i)=><i key={i} style={{left:`${8+i*7.5}%`,animationDelay:`${-i*.7}s`,bottom:`${10+i%3*17}%`}}/>)}</div>
  </div>;
}
