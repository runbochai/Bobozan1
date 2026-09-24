// --- FIREBASE SETUP ---
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY || '你的API_KEY',
  authDomain: import.meta.env.VITE_AUTH_DOMAIN || '你的PROJECT_ID.firebaseapp.com',
  projectId: import.meta.env.VITE_PROJECT_ID || '你的PROJECT_ID',
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
};

let app: any, auth: any, db: any;
try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error('Firebase 初始化失败，请检查 .env 配置', e);
}

export { app, auth, db };
