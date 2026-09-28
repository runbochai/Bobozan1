import test from 'node:test';
import assert from 'node:assert/strict';
import { readFirebaseConfig, firebaseErrorMessage } from './firebaseConfig';
import { publicAssetUrl, resolveAvatarUrl } from './assetPaths';

test('missing or placeholder configuration never counts as a configured project', () => {
  for (const env of [{}, { VITE_API_KEY: '你的API_KEY', VITE_PROJECT_ID: '你的PROJECT_ID' }, { VITE_API_KEY: 'your-firebase-web-api-key', VITE_PROJECT_ID: 'your-project' }]) {
    assert.deepEqual(readFirebaseConfig(env).missing, ['VITE_FIREBASE_API_KEY', 'VITE_FIREBASE_PROJECT_ID']);
  }
});

test('both naming conventions work and authDomain can be derived', () => {
  const legacy = readFirebaseConfig({ VITE_API_KEY: ' test-key ', VITE_PROJECT_ID: 'bobozan-test' });
  const canonical = readFirebaseConfig({ VITE_FIREBASE_API_KEY: 'test-key', VITE_FIREBASE_PROJECT_ID: 'bobozan-test' });
  assert.deepEqual(legacy, canonical);
  assert.deepEqual(legacy.missing, []);
  assert.equal(legacy.options.authDomain, 'bobozan-test.firebaseapp.com');
});

test('explicit custom authDomain is preserved and valid canonical settings take precedence', () => {
  const result = readFirebaseConfig({ VITE_FIREBASE_API_KEY: 'new-key', VITE_API_KEY: 'old-key', VITE_PROJECT_ID: 'bobozan-test', VITE_AUTH_DOMAIN: 'auth.example.com' });
  assert.equal(result.options.apiKey, 'new-key');
  assert.equal(result.options.authDomain, 'auth.example.com');
});

test('network and rules errors are not reported as configuration errors', () => {
  assert.match(firebaseErrorMessage({ code: 'auth/network-request-failed' }, 'zh'), /网络/);
  assert.match(firebaseErrorMessage({ code: 'permission-denied' }, 'zh'), /访问规则/);
  assert.match(firebaseErrorMessage({ code: 'auth/operation-not-allowed' }, 'zh'), /匿名登录/);
  assert.match(firebaseErrorMessage({ code: 'auth/invalid-api-key' }, 'en'), /API key is invalid/);
});

test('public assets and saved avatars work at root and project subpaths', () => {
  for (const base of ['/', '/Bobozan1/', '/preview/']) {
    assert.equal(publicAssetUrl('/music/bgm.mp3', base), `${base}music/bgm.mp3`);
    for (const avatar of ['/avatars/bdrag.png', 'avatars/bdrag.png', '/Bobozan1/avatars/bdrag.png']) {
      assert.equal(resolveAvatarUrl(avatar, base), `${base}avatars/bdrag.png`);
    }
  }
  assert.equal(resolveAvatarUrl('https://example.com/avatar.png', '/Bobozan1/'), 'https://example.com/avatar.png');
});
