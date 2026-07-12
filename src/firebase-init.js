/**
 * Firebase initialization for ricehub
 * Provides Firebase app, auth, firestore, and storage instances
 * Falls back to localStorage mode if not configured
 */

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app = null;
let auth = null;
let db = null;
let storage = null;
let initialized = false;

export function isFirebaseConfigured() {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.storageBucket &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
}

export async function initFirebase(useEmulator = false) {
  if (initialized) return { app, auth, db, storage };
  
  if (!isFirebaseConfigured()) {
    console.warn('[ricehub] Firebase not configured - running in localStorage mode');
    return { app: null, auth: null, db: null, storage: null };
  }

  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    
    if (useEmulator) {
      connectFirestoreEmulator(db, '127.0.0.1', 8080);
      connectStorageEmulator(storage, '127.0.0.1', 9199);
    }
    
    initialized = true;
    console.log('[ricehub] Firebase initialized');
    return { app, auth, db, storage };
  } catch (error) {
    console.error('[ricehub] Firebase init failed:', error);
    return { app: null, auth: null, db: null, storage: null };
  }
}

export function getAuthInstance() {
  return auth;
}

export function getFirestoreInstance() {
  return db;
}

export function getStorageInstance() {
  return storage;
}

export function onAuthChange(callback) {
  if (!auth) {
    // localStorage mode - call with null user
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export { firebaseConfig };