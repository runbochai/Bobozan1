import type { CSSProperties } from 'react';
import type { BattleSpeed, Lang } from '../types';
import { battleTimeMs } from '../logic/battleSpeed';
import { Flame } from './PixelIcons';
import './RevengeAnnouncement.css';

export default function RevengeAnnouncement({ names, lang, reduceMotion, speed }: {
  names: string[]; lang: Lang; reduceMotion: boolean; speed: BattleSpeed;
}) {
  return <div className="revenge-announcement" data-reduced-motion={reduceMotion}
    style={{ '--revenge-notice-time': `${battleTimeMs(2200, speed)}ms` } as CSSProperties}
    role="status" aria-live="polite">
    <div className="revenge-announcement-banner">
      <Flame size={26} aria-hidden="true" />
      <div><strong>{lang === 'zh' ? '复仇时刻' : 'Revenge time'}</strong>
        <p>{names.join(lang === 'zh' ? '、' : ', ')}{lang === 'zh' ? ' 获得复仇卡！' : ' received a revenge card!'}</p>
      </div>
    </div>
  </div>;
}
