export function publicAssetUrl(path: string, base: string) {
  return `${base.replace(/\/*$/, '/')}${path.replace(/^\/+/, '')}`;
}

export function resolveAvatarUrl(path: string, base: string) {
  // Normalize saved local avatars, including values from a previous deployment base.
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  const match = path.match(/(?:^|\/)(avatars\/[^?#]+\.(?:png|webp))$/);
  return match ? publicAssetUrl(match[1], base) : publicAssetUrl(path, base);
}
