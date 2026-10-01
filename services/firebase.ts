

import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";
import { getAuth, Auth } from "firebase/auth";
import { logger } from "./logger";

// Typed access to Vite's import.meta.env
const env = (import.meta as ImportMeta & { env: Record<string, string | undefined> }).env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validate that ALL required fields are present before initialising
const REQUIRED_KEYS: (keyof typeof firebaseConfig)[] = [
  'apiKey', 'authDomain', 'projectId', 'appId',
];
const allPresent = REQUIRED_KEYS.every(k => Boolean(firebaseConfig[k]));

let app = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (allPresent) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    if (typeof window !== 'undefined' && firebaseConfig.measurementId) {
      getAnalytics(app);
    }
  } catch (error) {
    logger.error('Firebase initialization failed.', error);
  }
} else {
  logger.warn('Firebase no configurado. Usando almacenamiento local (LocalStorage).');
}

export const isFirebaseInitialized = !!app;
export { app, db, auth };
