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

export const firebaseConfigured = Boolean(import.meta.env.VITE_API_KEY && import.meta.env.VITE_PROJECT_ID && import.meta.env.VITE_AUTH_DOMAIN);
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
