import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
} from 'firebase/auth';
import { auth, initFirebaseAnalytics } from './firebase.js';

/** Align Laravel / mobile claim spellings with Firestore rules (`super_admin`). */
function normalizeClaimRole(raw) {
  const r = String(raw ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (r === 'superadmin' || r === 'super_admin') return 'super_admin';
  if (r === 'admin' || r === 'administrator') return 'admin';
  return r;
}

/**
 * Sign in with Laravel-issued custom token (production flow).
 * @param {string} firebaseToken
 * @returns {Promise<{ uid: string, claims: Record<string, unknown> }>}
 */
export async function loginWithFirebaseToken(firebaseToken) {
  const token = String(firebaseToken ?? '').trim();
  if (!token) {
    throw new Error('Missing firebase_token from login response');
  }

  if (import.meta.env.DEV) {
    console.log('🔥 [FIREBASE AUTH] Signing in...');
  }

  try {
    const credential = await signInWithCustomToken(auth, token);
    const user = credential.user;

    const tokenResult = await user.getIdTokenResult();
    const claims = tokenResult.claims ?? {};

    if (import.meta.env.DEV) {
      const normalizedRole = normalizeClaimRole(claims.role);
      console.log('✅ [FIREBASE AUTH] Login success');
      console.log('👤 [FIREBASE AUTH] UID:', user.uid);
      console.log('🔐 [FIREBASE AUTH] Claims:', {
        user_id: claims.user_id,
        role: claims.role,
        normalized_role: normalizedRole,
        email: claims.email,
      });

      if (normalizedRole === 'super_admin') {
        console.log('✅ [FIREBASE AUTH] Super admin role detected in token');
      } else if (normalizedRole === 'admin') {
        console.log('✅ [FIREBASE AUTH] Admin role detected in token');
      }
    }

    verifyFirebaseClaims(claims);
    void initFirebaseAnalytics();

    return { uid: user.uid, claims };
  } catch (err) {
    console.error('❌ [FIREBASE AUTH] Login failed:', err?.code, err?.message);
    throw err;
  }
}

/**
 * Ensure custom claims required by Firestore rules exist.
 */
export function verifyFirebaseClaims(claims) {
  const userId = claims.user_id;
  const role = claims.role;
  const email = claims.email;

  if (userId == null || userId === '') {
    console.warn('⚠️ [FIREBASE AUTH] Claim user_id is missing');
  }
  if (!role) {
    console.warn('⚠️ [FIREBASE AUTH] Claim role is missing');
  }
  if (!email) {
    console.warn('⚠️ [FIREBASE AUTH] Claim email is missing');
  }

  return { userId, role, email };
}

/** Current Firebase user or null */
export function getFirebaseUser() {
  return auth.currentUser;
}

/** Load ID token custom claims for the signed-in user */
export async function getFirebaseClaims() {
  const user = auth.currentUser;
  if (!user) return null;

  const tokenResult = await user.getIdTokenResult();
  const claims = tokenResult.claims ?? {};
  if (import.meta.env.DEV) {
    console.log('🔐 [FIREBASE AUTH] Claims loaded:', {
      user_id: claims.user_id,
      role: claims.role,
      email: claims.email,
    });
  }
  return claims;
}

/** Sign out Firebase (call on Laravel logout) */
export async function logoutFirebase() {
  try {
    if (auth.currentUser) {
      if (import.meta.env.DEV) {
        console.log('🔥 [FIREBASE AUTH] Signing out...');
      }
      await signOut(auth);
      if (import.meta.env.DEV) {
        console.log('✅ [FIREBASE AUTH] Signed out');
      }
    }
  } catch (err) {
    console.error('❌ [FIREBASE AUTH] Sign out error:', err?.message);
  }
}

/**
 * Wait until Firebase auth state is resolved (signed in or signed out).
 * @param {number} [timeoutMs]
 * @returns {Promise<import('firebase/auth').User | null>}
 */
export function waitForFirebaseAuth(timeoutMs = 15000) {
  return new Promise((resolve, reject) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }

    const timer = setTimeout(() => {
      unsub();
      reject(new Error('Firebase auth timeout'));
    }, timeoutMs);

    const unsub = onAuthStateChanged(auth, (user) => {
      clearTimeout(timer);
      unsub();
      resolve(user);
    });
  });
}

/**
 * Restore Firebase session from stored Laravel user (page refresh).
 * @param {Record<string, unknown> | null} sessionUser
 */
export async function restoreFirebaseSessionFromUser(sessionUser) {
  if (!sessionUser || typeof sessionUser !== 'object') return null;
  if (auth.currentUser) {
    if (import.meta.env.DEV) {
      console.log('🔥 [FIREBASE AUTH] Session already active');
    }
    return getFirebaseClaims();
  }

  const firebaseToken = sessionUser.firebase_token;
  if (!firebaseToken) {
    console.warn('⚠️ [FIREBASE AUTH] No firebase_token on stored user — skip restore');
    return null;
  }

  if (import.meta.env.DEV) {
    console.log('🔥 [FIREBASE AUTH] Restoring session from stored token...');
  }
  const { claims } = await loginWithFirebaseToken(String(firebaseToken));
  return claims;
}

export { onAuthStateChanged };
