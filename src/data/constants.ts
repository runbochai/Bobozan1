// --- GAME CONSTANTS ---
import { SKILL_DB } from './skills';

export const FINAL_LEVEL = 23;

export const APP_ID = 'bobozan-v1';

export const MAX_HP = 2;
export const MAX_PLAYERS = 8;
export const MIN_PLAYERS = 2;

export const BACKGROUND_CARDS = (() => {
  const items: any[] = [];
  const MAX_CARDS = 20;   
  const MIN_DIST = 15;
  
  // 1. Define the effects list
  const EFFECTS = ['spin-slow', 'flip-slow', 'shine-slow', 'glow-pulse'];

  // Safe check
  const db = typeof SKILL_DB !== 'undefined' ? SKILL_DB : [];
  if (db.length === 0) return [];

  let attempts = 0;
  
  while (items.length < MAX_CARDS && attempts < 100) {
    attempts++;
    
    const top = 10 + Math.random() * 80;
    const left = 10 + Math.random() * 80;

    const tooClose = items.some(item => {
      const a = item.top - top;
      const b = item.left - left;
      const dist = Math.sqrt(a * a + b * b);
      return dist < MIN_DIST;
    });

    if (!tooClose) {
      const card = db[Math.floor(Math.random() * db.length)];
      
      // 2. Randomly assign effect (40% chance)
      const hasEffect = Math.random() < 0.4;
      const assignedEffect = hasEffect 
        ? EFFECTS[Math.floor(Math.random() * EFFECTS.length)] 
        : null;

      items.push({
        id: items.length,
        card,
        top,
        left,
        rX: (Math.random() - 0.5) * 100, 
        rY: (Math.random() - 0.5) * 100, 
        rZ: Math.random() * 360, 
        z: Math.random() * 500,
        scale: 0.5 + Math.random() * 0.5,
        duration: 15 + Math.random() * 20,
        delay: Math.random() * -20,
        effect: assignedEffect // <--- Store the effect here
      });
    }
  }
  
  return items;
})();
