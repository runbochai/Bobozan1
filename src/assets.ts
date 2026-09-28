// Public assets must respect GitHub Pages' project subdirectory.
export function assetUrl(path: string) {
  return `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`;
}

export function avatarUrl(path: string) {
  // Rooms created before this fix can still contain root-relative avatar paths.
  return path.startsWith('/avatars/') ? assetUrl(path) : path;
}
