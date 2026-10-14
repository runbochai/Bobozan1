import ParchmentSkillArt from './ParchmentSkillArt';

/** Small move icons share the central woodcut used on the parchment card face. */
export default function PixelCardArt({ id }: { id: string }) {
  return <span className="pixel-card-art parchment-skill-thumbnail"><ParchmentSkillArt id={id} /></span>;
}
