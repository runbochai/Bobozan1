import type { FirebaseOptions } from 'firebase/app';

export type FirebaseEnvironment = Record<string, string | undefined>;
const fields = {
  apiKey: ['VITE_FIREBASE_API_KEY', 'VITE_API_KEY'],
  authDomain: ['VITE_FIREBASE_AUTH_DOMAIN', 'VITE_AUTH_DOMAIN'],
  projectId: ['VITE_FIREBASE_PROJECT_ID', 'VITE_PROJECT_ID'],
  storageBucket: ['VITE_FIREBASE_STORAGE_BUCKET', 'VITE_STORAGE_BUCKET'],
  messagingSenderId: ['VITE_FIREBASE_MESSAGING_SENDER_ID', 'VITE_MESSAGING_SENDER_ID'],
  appId: ['VITE_FIREBASE_APP_ID', 'VITE_APP_ID'],
} as const;

export function readFirebaseConfig(env: FirebaseEnvironment) {
  const options: FirebaseOptions = {};
  for (const [field, names] of Object.entries(fields)) {
    const value = names.map(name => env[name]?.trim()).find(value =>
      value && !/^(your[-_]|你的|<|undefined$|null$)/i.test(value));
    if (value) options[field as keyof typeof fields] = value;
  }
  if (!options.authDomain && options.projectId) options.authDomain = `${options.projectId}.firebaseapp.com`;
  const missing = (['apiKey', 'projectId'] as const).filter(field => !options[field]).map(field => fields[field][0]);
  return { options, missing };
}

export function firebaseErrorMessage(error: unknown, lang: 'zh' | 'en') {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : '';
  const messages: Record<string, [string, string]> = {
    'config/missing': ['联机服务尚未配置，暂时无法创建或加入房间。你仍可体验教程。', 'Online play is not configured yet. You can still try the tutorial.'],
    'auth/not-ready': ['尚未连接联机服务，请稍后重试。', 'Connecting to online play. Please try again shortly.'],
    'auth/invalid-api-key': ['Firebase API key 无效，请检查网站的构建配置。', 'The Firebase API key is invalid. Check the site build configuration.'],
    'auth/operation-not-allowed': ['此 Firebase 项目未启用匿名登录。', 'Anonymous sign-in is not enabled for this Firebase project.'],
    'auth/admin-restricted-operation': ['此 Firebase 项目不允许匿名登录。', 'Anonymous sign-in is restricted for this Firebase project.'],
    'auth/unauthorized-domain': ['当前网站域名未获 Firebase 授权。', 'This website domain is not authorized in Firebase.'],
    'permission-denied': ['数据库拒绝访问，请检查房间的 Firestore 访问规则。', 'Database access was denied. Check the Firestore room access rules.'],
    'auth/network-request-failed': ['网络连接失败，请检查网络后重试。', 'Network connection failed. Please check your connection and retry.'],
    'unavailable': ['联机服务暂时不可用，请稍后重试。', 'Online service is temporarily unavailable. Please retry.'],
    'auth/too-many-requests': ['尝试次数过多，请稍后重试。', 'Too many attempts. Please retry later.'],
  };
  const key = code.includes('api-key') ? 'auth/invalid-api-key' : code.replace(/^firestore\//, '');
  return (messages[key] ?? ['联机操作失败，请稍后重试。', 'The online action failed. Please retry.'])[lang === 'zh' ? 0 : 1];
}
