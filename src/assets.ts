import { publicAssetUrl, resolveAvatarUrl } from './config/assetPaths';
export const assetUrl = (path: string) => publicAssetUrl(path, import.meta.env.BASE_URL);
export const avatarUrl = (path: string) => resolveAvatarUrl(path, import.meta.env.BASE_URL);
