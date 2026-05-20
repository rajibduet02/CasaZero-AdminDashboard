import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase.js';
import { getFirebaseClaims } from '../firebase/firebaseAuth.js';

/**
 * Tracks Firebase Auth readiness for Firestore listeners.
 * `ready` is true once the first auth state event has fired AND user is signed in.
 */
export function useFirebaseAuth() {
  const [ready, setReady] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState(null);
  const [claims, setClaims] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setInitializing(false);

      if (!fbUser) {
        setUser(null);
        setClaims(null);
        setReady(false);
        return;
      }

      try {
        const loaded = await getFirebaseClaims();
        setUser(fbUser);
        setClaims(loaded);
        setReady(true);
        console.log('✅ [FIREBASE AUTH] User authenticated (hook)');
      } catch (err) {
        console.error('❌ [FIREBASE AUTH] Failed to load claims:', err?.message);
        setUser(fbUser);
        setClaims(null);
        setReady(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return {
    ready,
    initializing,
    isAuthenticated: Boolean(user),
    user,
    claims,
  };
}
