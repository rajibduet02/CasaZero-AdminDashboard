/**
 * Firebase app bootstrap — singleton-safe for Vite HMR.
 * Firestore chat uses `db`; security rules use `auth` custom claims.
 */
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCmAld_x541uob-rnsJqkWRv_74HpX2dsU',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'casazero-a39ba.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'casazero-a39ba',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'casazero-a39ba.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '898881501223',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:898881501223:web:a00dabf851d21abc9fb602',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-4BHDS2S4KE',
};

function getOrInitApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }
  console.log('[Firebase] Initializing app:', firebaseConfig.projectId);
  return initializeApp(firebaseConfig);
}

export const app = getOrInitApp();

/** Firestore — groups/group_{id}/messages */
export const db = getFirestore(app);

/** Firebase Auth — custom token from Laravel web_login */
export const auth = getAuth(app);

let analyticsInitStarted = false;

/** Browser-only Analytics */
export async function initFirebaseAnalytics() {
  if (typeof window === 'undefined' || analyticsInitStarted) return;
  analyticsInitStarted = true;
  try {
    if (await isSupported()) {
      getAnalytics(app);
      console.log('[Firebase] Analytics initialized');
    }
  } catch (err) {
    console.warn('[Firebase] Analytics unavailable:', err);
  }
}

if (typeof window !== 'undefined') {
  void initFirebaseAnalytics();
}

export default app;
