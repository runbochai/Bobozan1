import type { CSSProperties } from 'react';
import { SKILL_DB } from '../data/skills';
import { RetroSkillIcon } from './RetroCard';
import './RetroBackdrop.css';

/** The original floating-card setting, using only the shared live catalogue. */
export default function RetroBackdrop({ battle = false, reduced = false }: { battle?: boolean; reduced?: boolean }) {
  const count = battle ? 10 : 18;
  const effects = ['spin', 'flip', 'shine', 'glow'] as const;
  return <div className={`retro-backdrop ${battle ? 'retro-backdrop-battle' : ''}`} data-reduced={reduced} aria-hidden="true">
    <div className="retro-backdrop-grid" />
    <div className="retro-backdrop-glow retro-backdrop-glow-one" />
    <div className="retro-backdrop-glow retro-backdrop-glow-two" />
    <div className="retro-backdrop-cards">
      {Array.from({ length: count }, (_, index) => {
        const card = SKILL_DB[(index * 7 + 3) % SKILL_DB.length];
        if (!card) return null;
        // Keep the original roughly 40% special finishes without rerolling on renders.
        const effect = (index * 7) % count < Math.round(count * .4) ? effects[index % effects.length] : undefined;
        return <div key={index} className="retro-backdrop-card" data-retro-type={card.type} style={{
          left: `${(index * 29 + 4) % 100}%`, top: `${(index * 23 + 3) % 100}%`,
          '--retro-float-tilt': `${(index * 31) % 90 - 45}deg`,
          '--retro-float-pitch': `${(index * 17) % 75 - 35}deg`,
          '--retro-float-delay': `${-(index * 1.7)}s`,
          '--retro-float-duration': `${15 + index * 7 % 20}s`,
          '--retro-float-scale': .5 + index % 5 * .12,
        } as CSSProperties}>
          <div className="retro-backdrop-card-face" data-original-effect={effect}>
            <RetroSkillIcon id={card.id} size={50} />
          </div>
        </div>;
      })}
    </div>
    <div className="retro-backdrop-vignette" />
  </div>;
}
