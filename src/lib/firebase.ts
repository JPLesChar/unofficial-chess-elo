import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore (using specific database ID configured for this project)
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Auth
export const auth = getAuth(app);

// Seamless Auth initialization: resolves current auth user if available
let authInitPromise: Promise<User | null> | null = null;

export function ensureAuthenticated(): Promise<User | null> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  if (!authInitPromise) {
    authInitPromise = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
  return authInitPromise;
}

// Error Context
export type SecurityRuleContext = {
  userId?: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  targetCollection: string;
  targetDocId?: string;
};

export interface FirestoreErrorInfo {
  code: string;
  message: string;
  operation: string;
  targetCollection: string;
  targetDocId?: string;
}

export function handleFirestoreError(error: unknown, context: SecurityRuleContext): FirestoreErrorInfo {
  const err = error as { code?: string; message?: string };
  const info: FirestoreErrorInfo = {
    code: err.code || 'unknown',
    message: err.message || 'An unknown error occurred during Firestore operation',
    operation: context.operation,
    targetCollection: context.targetCollection,
    targetDocId: context.targetDocId,
  };
  console.warn('[Firestore sync]', info.operation, info.targetCollection, info.message);
  return info;
}
