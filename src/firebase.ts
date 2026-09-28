import { initializeApp } from 'firebase/app';
import type { FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import type { Auth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { readFirebaseConfig } from './config/firebaseConfig';

const { options, missing } = readFirebaseConfig(import.meta.env);
export const missingFirebaseConfig = missing;
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let firebaseInitError: unknown = missing.length ? { code: 'config/missing' } : null;

if (!missing.length) {
  try {
    app = initializeApp(options);
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    // Keep the tutorial usable; online actions report the actual initialization error.
    firebaseInitError = error;
    console.error('Firebase initialization failed', error);
  }
}

export const firebaseConfigured = !!auth && !!db && !firebaseInitError;
export { app, auth, db, firebaseInitError };

export function requireDatabase(): Firestore {
  if (!db || firebaseInitError) throw firebaseInitError ?? { code: 'config/missing' };
  return db;
}
