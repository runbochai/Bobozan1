import type { CSSProperties } from 'react';
import { SKILL_DB } from '../data/skills';
import { RetroSkillIcon } from './RetroCard';
import './RetroBackdrop.css';

/** The original floating-card setting, using only the shared live catalogue. */
export default function RetroBackdrop({ battle = false, reduced = false }: { battle?: boolean; reduced?: boolean }) {
  return <div className={`retro-backdrop ${battle ? 'retro-backdrop-battle' : ''}`} data-reduced={reduced} aria-hidden="true">
    <div className="retro-backdrop-grid" />
    <div className="retro-backdrop-glow retro-backdrop-glow-one" />
    <div className="retro-backdrop-glow retro-backdrop-glow-two" />
    <div className="retro-backdrop-cards">
      {Array.from({ length: battle ? 10 : 18 }, (_, index) => {
        const card = SKILL_DB[(index * 7 + 3) % SKILL_DB.length];
        if (!card) return null;
        return <div key={index} className="retro-backdrop-card" data-retro-type={card.type} style={{
          left: `${(index * 29 + 4) % 100}%`, top: `${(index * 23 + 3) % 100}%`,
          '--retro-float-tilt': `${(index * 31) % 90 - 45}deg`,
          '--retro-float-pitch': `${(index * 17) % 75 - 35}deg`,
          '--retro-float-delay': `${-(index * 1.7)}s`,
          '--retro-float-duration': `${17 + index % 8}s`,
          '--retro-float-scale': .5 + index % 5 * .12,
        } as CSSProperties}><RetroSkillIcon id={card.id} size={50} /></div>;
      })}
    </div>
    <div className="retro-backdrop-vignette" />
  </div>;
}
