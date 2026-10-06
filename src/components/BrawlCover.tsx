import { Zap, Shield, Sword, Star } from './PixelIcons';
import { assetUrl } from '../assets';
import './BrawlCover.css';

// Reuse the game's fighters as independently layered, responsive cover art.
const fighters = ['hangman', 'meteor', 'gungod', 'superwave', 'triplekill', 'iceult', 'fireclaw', 'boiler', 'threestar', 'triplekick', 'pointdiff', 'fiveslap'];
export default function BrawlCover() {
  return <div className="brawl-cover" aria-hidden="true">
    <svg className="brawl-impact" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" shapeRendering="crispEdges">
      <path fill="#df4b45" d="M0 150 770 0 550 140 1000 80 870 390 1000 500 260 600 370 440 0 550 180 330Z" />
      <path fill="#111b30" d="m0 430 410-250-150 220 740-280-190 230 190-50-140 250L0 600Z" />
      <path fill="#3cafbc" d="m590 305 410-135-135 95 135-5-305 155 185-130Z" />
      <path fill="#f7cf75" d="m445 335-20-130 60 77 53-142 10 143 166-93-99 141 204-7-190 65 136 86-183-26-30 123-40-100-137 86 70-137-151 10Z" />
      <path fill="#fff0c4" d="m502 335 9-59 29 62 91-17-65 47 29 62-65-28-50 46 11-61-81-2Z" />
      <g fill="#fff0c4"><path d="m24 135 210-45-4 9-200 55Z M768 35l177-22-9 8-169 30Z M56 490l182-89-14 18-143 86Z M798 498l162 25-26 7-146-19Z" /></g>
      <g fill="#f6b76f">{Array.from({length:18},(_,i)=><rect key={i} x={(i*137+19)%970} y={(i*79+35)%540} width={i%3===0?9:4} height={i%3===0?9:4} transform={`rotate(${i%2?18:-24} ${(i*137+19)%970} ${(i*79+35)%540})`} />)}</g>
    </svg>
    {fighters.map((id,i)=><div key={id} className={`brawl-fighter brawl-fighter-${i}`}><img src={assetUrl(`ultcutins/${id}.webp`)} alt="" draggable={false}/></div>)}
    <div className="brawl-flying-cards">{[Zap, Shield, Sword, Star].map((Icon,i)=><span key={i} className={`brawl-flying-card brawl-flying-card-${i}`}><small>{i===0 ? '+2' : i===3 ? 'ULT' : '01'}</small><Icon size={30}/></span>)}</div>
    <span className="brawl-sticker brawl-sticker-vs">VS</span>
    <span className="brawl-sticker brawl-sticker-combo">COMBO ×3</span>
    <span className="brawl-callout brawl-callout-hit">BOOM!!</span>
    <span className="brawl-callout brawl-callout-charge">+2 ⚡</span>
    <span className="brawl-speed brawl-speed-a" /><span className="brawl-speed brawl-speed-b" />
  </div>;
}
