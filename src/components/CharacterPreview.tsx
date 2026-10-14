import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { assetUrl, avatarUrl } from '../assets';
import { battleCharacterAtlas } from '../data/battleCharacters';
import { battleActionAtlas } from '../data/battleActions';
import { characterShowcase, SHOWCASE_ACTION_STEPS, SHOWCASE_EYE_CATCHLIGHTS, SHOWCASE_IDLE_STEPS } from '../data/characterShowcase';
import type { Lang } from '../types';
import { User } from './PixelIcons';
import { useSystemReducedMotion } from './useSystemReducedMotion';
import './CharacterPreview.css';

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
const readVisibility = () => !document.hidden;
const readServerVisibility = () => false;

/** A separate, cancellable preview clock; it never touches battle timing. */
function ShowcaseFrames({ source, running, actionToken, onError }: { source: string; running: boolean; actionToken: number; onError: () => void }) {
  const [pose, setPose] = useState<number | null>(3);
  const [performing, setPerforming] = useState(false);
  const consumedToken = useRef(0);

  useEffect(() => {
    const requested = actionToken !== consumedToken.current;
    consumedToken.current = actionToken;
    if (!running) return;
    let timer: number;
    let action = requested;
    let index = 0;
    const advance = () => {
      const steps = action ? SHOWCASE_ACTION_STEPS : SHOWCASE_IDLE_STEPS;
      const step = steps[index];
      setPose(step.pose);
      setPerforming(action);
      timer = window.setTimeout(() => {
        index += 1;
        if (index === steps.length) { index = 0; action = false; }
        advance();
      }, step.duration);
    };
    timer = window.setTimeout(advance, 0);
    return () => window.clearTimeout(timer);
  }, [running, actionToken]);

  if (!running) return null;
  return <span className="character-preview-animation" data-performing={performing} aria-hidden="true">
    {pose !== null && <span className="character-preview-action-cell" data-preview-pose={pose}>
      <img src={assetUrl(source)} alt="" draggable={false} onError={onError}
        style={{ top: `${-pose * 100}%` }} />
      {SHOWCASE_EYE_CATCHLIGHTS[source]?.[pose] && <svg className="character-preview-catchlights" viewBox="0 0 192 256" preserveAspectRatio="none" shapeRendering="crispEdges">
        {SHOWCASE_EYE_CATCHLIGHTS[source][pose].map(([x, y], index) => <rect key={index} x={x} y={y} width="3" height="4" fill="#fffdf4" />)}
      </svg>}
    </span>}
    {performing && <span className="character-preview-action-effects" key={actionToken}>
      <i /><i /><i /><i /><i /><i />
      <span className="character-preview-impact" />
    </span>}
  </span>;
}

export default function CharacterPreview({ avatar, name, lang, reduced = false, active = false, actionToken = 0 }: {
  avatar?: string; name: string; lang: Lang; reduced?: boolean; active?: boolean; actionToken?: number;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [readySources, setReadySources] = useState<string[]>([]);
  const visible = useSyncExternalStore(subscribeVisibility, readVisibility, readServerVisibility);
  const systemReduced = useSystemReducedMotion();
  const motion = active && visible && !reduced && !systemReduced;
  const atlas = battleCharacterAtlas(avatar);
  const actions = battleActionAtlas(avatar);
  const theme = characterShowcase(avatar);
  const fail = (source: string) => setFailedSources(previous => previous.includes(source) ? previous : [...previous, source]);
  const ready = (source: string) => setReadySources(previous => previous.includes(source) ? previous : [...previous, source]);
  const hasAtlas = atlas && !failedSources.includes(atlas);

  return <span className="character-preview" role="img" aria-label={lang === 'zh' ? `${name}，人物展示` : `${name}, character preview`}
    data-effect={theme.effect} data-active={active} data-motion={motion}
    style={{ '--showcase-accent': theme.accent, '--showcase-glow': theme.glow } as CSSProperties}>
    <span className="character-preview-aura" aria-hidden="true" />
    <span className="character-preview-shadow" aria-hidden="true" />
    <span className="character-preview-float">
      {hasAtlas ? <span className="character-preview-idle-cell" aria-hidden="true">
        <img src={assetUrl(atlas)} alt="" draggable={false} onError={() => fail(atlas)} />
      </span> : avatar && !failedSources.includes(avatar) ? <img className="character-preview-portrait" src={avatarUrl(avatar)} alt="" draggable={false} onError={() => fail(avatar)} /> : <User size={96} aria-hidden="true" />}
      {hasAtlas && actions && !failedSources.includes(actions) && active && <>
        {motion && <img className="character-preview-preload" src={assetUrl(actions)} alt="" aria-hidden="true" draggable={false}
          onLoad={event => {
            const img = event.currentTarget;
            const decoded = typeof img.decode === 'function' ? img.decode() : Promise.resolve();
            void decoded.then(() => ready(actions), () => fail(actions));
          }} onError={() => fail(actions)} />}
        {readySources.includes(actions) && <ShowcaseFrames key={actions} source={actions} running={motion} actionToken={actionToken} onError={() => fail(actions)} />}
      </>}
    </span>
    {active && <span className="character-preview-motes" aria-hidden="true"><i /><i /><i /><i /></span>}
  </span>;
}
