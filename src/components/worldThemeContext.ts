import { createContext, useContext } from 'react';
import { DEFAULT_THEME, type GameTheme } from '../data/gameThemes';
export const WorldThemeContext = createContext<{
  theme: GameTheme; pending: string | null; error: boolean;
  selectTheme: (id: string) => Promise<void>;
}>({ theme: DEFAULT_THEME, pending: null, error: false, selectTheme: async () => {} });
export const useWorldTheme = () => useContext(WorldThemeContext);
