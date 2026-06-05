/**
 * Typed Firebase entry point for private chat.
 * Wraps existing singleton bootstrap and auth helpers.
 */
import type { User } from 'firebase/auth';
import { app, auth, db } from '../firebase/firebase.js';
import {
  loginWithFirebaseToken,
  logoutFirebase,
  onAuthStateChanged,
  restoreFirebaseSessionFromUser,
  waitForFirebaseAuth,
} from '../firebase/firebaseAuth.js';

export { app, auth, db, loginWithFirebaseToken, logoutFirebase, onAuthStateChanged, restoreFirebaseSessionFromUser, waitForFirebaseAuth };

export type FirebaseClaims = Record<string, unknown>;

export function getStoredSessionUser(): Record<string, unknown> | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('casazero_user');
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function getStoredFirebaseToken(): string | null {
  const user = getStoredSessionUser();
  const token = user?.firebase_token;
  return typeof token === 'string' && token.trim() ? token.trim() : null;
}

export async function ensureFirebaseSession(): Promise<User | null> {
  if (auth.currentUser) return auth.currentUser;

  const sessionUser = getStoredSessionUser();
  if (!sessionUser) return null;

  await restoreFirebaseSessionFromUser(sessionUser);
  return auth.currentUser;
}
