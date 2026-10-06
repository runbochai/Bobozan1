import { useSyncExternalStore } from 'react';

const query = '(prefers-reduced-motion: reduce)';
const read = () => window.matchMedia(query).matches;
const subscribe = (onChange: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', onChange);
  return () => media.removeEventListener('change', onChange);
};

/** JS cut-ins and frame sequences must honor the same setting as CSS. */
export function useSystemReducedMotion() {
  return useSyncExternalStore(subscribe, read, () => false);
}
