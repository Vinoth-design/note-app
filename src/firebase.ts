import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import defaultAppletConfig from '../firebase-applet-config.json';

// Build environment-driven config with fallback to default applet config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || defaultAppletConfig.apiKey || "AIzaSy_demo_fallback_key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || defaultAppletConfig.authDomain || "demo-app.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || defaultAppletConfig.projectId || "demo-app-project",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || defaultAppletConfig.storageBucket || "demo-app.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultAppletConfig.messagingSenderId || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || defaultAppletConfig.appId || "1:123456789:web:abcdef",
};

const customDatabaseId = import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (defaultAppletConfig as Record<string, string>).firestoreDatabaseId;

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Safe Firestore initialization
let db: Firestore;
try {
  db = customDatabaseId ? getFirestore(app, customDatabaseId) : getFirestore(app);
} catch (err) {
  console.warn('Firestore initialization fallback:', err);
  db = getFirestore(app);
}

// Initialize Auth
const auth: Auth = getAuth(app);

// Enable offline persistence for Firestore if supported
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('Firestore persistence notice: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      console.warn('Firestore persistence unsupported in this browser environment');
    }
  });
} catch (e) {
  console.warn('Persistence setup notice:', e);
}

export { app, db, auth, firebaseConfig };
