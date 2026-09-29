import { assetUrl } from '../assets';
import './BattleTable.css';

/** The room, tabletop and cast share one seated camera; all scenery ignores input. */
export default function BattleArena({ turn, showdown, lang }: { turn: number; showdown: boolean; lang: 'zh' | 'en' }) {
  return <>
    <div className="tavern-room" aria-hidden="true"><img src={assetUrl('scenes/tavern/room.webp')} alt="" /><div className="tavern-lamplight" /></div>
    <div className={`battle-scenery ${showdown ? 'battle-scenery-clash' : ''}`} aria-hidden="true">
      <img className="tavern-table" src={assetUrl('scenes/tavern/table.webp')} alt="" draggable={false} />
      <div className="table-light-pool" />
      <div className="arena-round"><span>{lang === 'zh' ? '第' : 'ROUND'} {String(turn).padStart(2, '0')}{lang === 'zh' ? ' 回合' : ''}</span><strong>{showdown ? (lang === 'zh' ? '揭牌' : 'REVEAL') : 'BOBOZAN'}</strong></div>
    </div>
  </>;
}
