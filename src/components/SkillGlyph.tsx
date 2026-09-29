import type { SkillEffect } from '../data/skillEffects';

const glyphs: Record<SkillEffect['family'], string> = {
  charge: 'M44 8h20L50 36h20L32 88l8-34H22z',
  shield: 'M20 16h56v36H68v16H56v12H40V68H28V52h-8z M32 28v20h8v16h16V48h8V28z',
  orb: 'M36 20h24v8h12v12h8v20h-8v12H60v8H36v-8H24V60h-8V40h8V28h12z',
  slash: 'M72 8h16v16L36 76H20v12H8V76h12V60z',
  claw: 'M28 12h8L20 80H8z M52 8h8L44 84H32z M76 12h8L68 80H56z',
  star: 'M44 8h8v24h12v8h24v12H64v8H52v28h-8V60H32v-8H8V40h24v-8h12z',
  ice: 'M44 4h8v28l16-16 8 8-20 20h36v8H56l20 20-8 8-16-16v28h-8V64L24 84l-8-8 20-24H4v-8h32L16 24l8-8 20 16z',
  steam: 'M20 64h16v12H20z M44 52h16v16H44z M68 60h12v12H68z M24 16h8v16h-8v16h-8V28h8z M52 8h8v20h-8v16h-8V20h8z M76 20h8v20h-8v12h-8V32h8z',
  shadow: 'M32 12h32v8h12v12h8v48H72V68H60v12H48V68H36v12H24V68H12V32h8V20h12z M28 32v16h12V32z M56 32v16h12V32z',
  bolt: 'M8 42h56V28h12v12h12v16H76v12H64V54H8z',
  fist: 'M28 16h12v24h4V12h12v28h4V20h12v24h4V32h12v28H76v20H32V68H16V44H8V28h12v20h8z',
  wave: 'M8 36h12V24h20V12h24v12H48v12H32v12H20v16h20V52h16V40h16V28h16v16H76v16H64v16H44v12H20V76H8z',
  poison: 'M20 24h20v12h12V20h24v16h12v28H76v16H52V68H40v16H16V68H8V40h12z M28 44v12h12V44z M60 40v12h12V40z',
  wing: 'M44 76H32V64H20V48H8V12h12v12h12v12h12v16h8V36h12V24h12V12h12v36H76v16H64v12H52v8h-8z',
  portal: 'M24 20h48v8h12v12h8v16h-8v12H72v8H24v-8H12V56H4V40h8V28h12z M28 32H20v12h-8v8h8v12h8v4h40v-4h8V52h8v-8h-8V32z',
  absorb: 'M28 12h40v8h12v16H68V24H32v12H20v28h12v12h32V64h12V48H48v8h12v8H40V44h-8V32h28v8h24v28H72v16H24V72H12V28h16z',
  shatter: 'M16 12h20L28 40H12z M52 8h20L64 32H44z M72 40h20L80 64H64z M40 44h16v16H40z M12 60h20l-8 24H4z M48 72h24L60 92H44z',
};

export default function SkillGlyph({ effect }: { effect: SkillEffect }) {
  return <svg viewBox="0 0 96 96" className={`skill-glyph glyph-${effect.family}`} aria-hidden="true" shapeRendering="crispEdges">
    <path d={glyphs[effect.family]} fill={effect.color} fillRule="evenodd" />
    <path d="M42 36h12v6h6v12h-6v6H42v-6h-6V42h6z" fill={effect.light} opacity=".82" />
    {Array.from({ length: effect.count }, (_, i) => { const angle = i * Math.PI * 2 / effect.count; return <rect key={i} x={46 + Math.round(Math.cos(angle) * 40)} y={46 + Math.round(Math.sin(angle) * 40)} width="4" height="4" fill={effect.light} />; })}
  </svg>;
}
