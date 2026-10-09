export type GameTheme = {
  id: string;
  name: { zh: string; en: string };
  image?: string;
  palette: { ground: string; felt: string; rim: string; edge: string; line: string; panel: string; accent: string };
};
export const THEME_STORAGE_KEY = 'bobozan-world-theme';
export const GAME_THEMES: readonly GameTheme[] = [
  { id: 'crown-citadel', image: 'story/crown-battles-v1/crown.webp', name: { zh: '王冠大殿', en: 'Crown Citadel' }, palette: { ground: '#101c29', felt: '#263e4b', rim: '#ac8654', edge: '#142534', line: '#bba681', panel: '#192b39', accent: '#edc685' } },
  { id: 'crown-qualification', image: 'story/crown-battles-v1/qualification.webp', name: { zh: '灯尾镇广场', en: 'Emberwick Square' }, palette: { ground: '#101c29', felt: '#2d4848', rim: '#a98254', edge: '#192a30', line: '#b2ad8a', panel: '#1c3039', accent: '#eac38b' } },
  { id: 'crown-ember', image: 'story/crown-battles-v1/ember.webp', name: { zh: '赤铜庭院', en: 'Copper Courtyard' }, palette: { ground: '#201d24', felt: '#4b3d38', rim: '#b77c50', edge: '#29262d', line: '#d1a57b', panel: '#2e2b31', accent: '#f0b07a' } },
  { id: 'crown-tide', image: 'story/crown-battles-v1/tide.webp', name: { zh: '潮汐要塞', en: 'Tide Fortress' }, palette: { ground: '#122834', felt: '#285361', rim: '#8aab9e', edge: '#18333e', line: '#abd0c6', panel: '#1b3642', accent: '#bde1d5' } },
  { id: 'crown-mist', image: 'story/crown-battles-v1/mist.webp', name: { zh: '迷雾回廊', en: 'Mist Cloister' }, palette: { ground: '#191f30', felt: '#3b405d', rim: '#9d94ad', edge: '#24273b', line: '#b7afce', panel: '#282e43', accent: '#d1c4e8' } },
  { id: 'crown-towers', image: 'story/crown-battles-v1/towers.webp', name: { zh: '供能三塔', en: 'The Supply Towers' }, palette: { ground: '#161d30', felt: '#383d54', rim: '#a08774', edge: '#242a3c', line: '#c1a8bc', panel: '#262c42', accent: '#dfb7d8' } },
  { id: 'woodcut-tavern', name: { zh: '暖色木刻酒馆', en: 'Woodcut Tavern' }, palette: { ground: '#211a16', felt: '#304c46', rim: '#b77b48', edge: '#583927', line: '#bca779', panel: '#302921', accent: '#e7b975' } },
  { id: 'moon-jade', name: { zh: '青绿月夜庭院', en: 'Moonlit Courtyard' }, palette: { ground: '#102d30', felt: '#26585a', rim: '#71948a', edge: '#253f40', line: '#b0c4a6', panel: '#183d40', accent: '#b7d6b7' } },
  { id: 'ink-stage', name: { zh: '深蓝印刷舞台', en: 'Midnight Theatre' }, palette: { ground: '#182137', felt: '#324765', rim: '#bc8f59', edge: '#392d38', line: '#bba374', panel: '#242c46', accent: '#ecc17c' } },
  { id: 'paper-board', name: { zh: '浅色纸上棋局', en: 'Paper Conservatory' }, palette: { ground: '#d7cdb7', felt: '#8caa98', rim: '#b48c62', edge: '#665440', line: '#e8dfbe', panel: '#394e48', accent: '#f0d5a3' } },
  { id: 'star-observatory', name: { zh: '星象观测所', en: 'Star Observatory' }, palette: { ground: '#1c233b', felt: '#424462', rim: '#b59967', edge: '#3c344b', line: '#d0b77f', panel: '#2c2c47', accent: '#d0b8ef' } },
  { id: 'copper-workshop', name: { zh: '铜齿轮工坊', en: 'Copper Workshop' }, palette: { ground: '#20302f', felt: '#355553', rim: '#b78350', edge: '#584334', line: '#c4a475', panel: '#2c3b37', accent: '#e3b784' } },
  { id: 'forest-library', name: { zh: '森林书屋', en: 'Forest Library' }, palette: { ground: '#343c2b', felt: '#4c6546', rim: '#aa8a55', edge: '#4e4931', line: '#c5ba88', panel: '#344632', accent: '#d9d098' } },
  { id: 'ice-hall', name: { zh: '冰晶大厅', en: 'Crystal Hall' }, palette: { ground: '#233c50', felt: '#436c7f', rim: '#9ab9bc', edge: '#3b5267', line: '#c9dcdd', panel: '#293f53', accent: '#c5e4ed' } },
  { id: 'sunset-sandstone', name: { zh: '落日砂岩厅', en: 'Sunset Arcade' }, palette: { ground: '#543c2f', felt: '#735348', rim: '#d39b62', edge: '#624536', line: '#dcba8e', panel: '#503b32', accent: '#f2c298' } },
  { id: 'coral-palace', name: { zh: '珊瑚水宫', en: 'Coral Palace' }, palette: { ground: '#183b43', felt: '#336571', rim: '#a99080', edge: '#344651', line: '#b6cec4', panel: '#25424b', accent: '#e6c1b0' } },
];
export const DEFAULT_THEME = GAME_THEMES[0];
export const findTheme = (id: string | null) => GAME_THEMES.find(theme => theme.id === id) ?? DEFAULT_THEME;
export const themeImagePath = (id: string, thumbnail = false) => {
  const theme = findTheme(id);
  const path = theme.image ?? `themes/woodcut-v1/${theme.id}.webp`;
  return thumbnail ? path.replace(/\.webp$/, '-thumb.webp') : path;
};
