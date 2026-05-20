import { useEffect, useMemo, useState } from 'react';
import { subscribeToResidenceMessages } from '../firebase/firestoreChat.js';
import { validateChatAccess } from '../utils/chatAccess.js';
import { resolveSessionUser } from '../utils/rbac';
import { useFirebaseAuth } from './useFirebaseAuth.js';

/**
 * Realtime Firestore chat — waits for Firebase Auth before subscribing.
 *
 * @param {number | null} residenceId
 * @param {{ allowedResidences?: Array<{ id: number, residence_admin?: number | null }>, sessionUser?: object | null, catalogLoading?: boolean }} [options]
 */
export function useFirestoreResidenceChat(residenceId, options = {}) {
  const { allowedResidences = [], sessionUser, catalogLoading = false } = options;
  const { ready: firebaseReady, initializing: firebaseInitializing, claims } = useFirebaseAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessInfo, setAccessInfo] = useState(null);
  const [authRequired, setAuthRequired] = useState(false);

  const accessCheck = useMemo(() => {
    if (residenceId == null || Number.isNaN(Number(residenceId))) {
      return { granted: false, role: 'unknown', reason: 'invalid_residence' };
    }
    return validateChatAccess({
      sessionUser: sessionUser ?? resolveSessionUser(),
      residenceId,
      allowedResidences,
      catalogLoading,
    });
  }, [residenceId, allowedResidences, sessionUser, catalogLoading]);

  useEffect(() => {
    setAccessInfo(accessCheck);

    if (residenceId == null || Number.isNaN(Number(residenceId))) {
      setMessages([]);
      setLoading(false);
      setError(null);
      setAccessDenied(false);
      setAuthRequired(false);
      return;
    }

    if (!accessCheck.granted) {
      if (accessCheck.pending) {
        setLoading(true);
        setAccessDenied(false);
        setAuthRequired(false);
        setError(null);
        return;
      }
      setMessages([]);
      setLoading(false);
      setError(null);
      setAccessDenied(true);
      setAuthRequired(false);
      return;
    }

    setAccessDenied(false);

    if (firebaseInitializing || !firebaseReady) {
      setLoading(true);
      setAuthRequired(!firebaseInitializing && !firebaseReady);
      setMessages([]);
      setError(null);
      console.log('⏳ [FIRESTORE] Waiting for Firebase Auth before connecting...', {
        firebaseInitializing,
        firebaseReady,
        claimsRole: claims?.role,
      });
      return;
    }

    setAuthRequired(false);
    let active = true;
    setLoading(true);
    setError(null);
    setMessages([]);

    console.log('[useFirestoreResidenceChat] Firebase auth ready — subscribing residenceId:', residenceId);
    console.log('🔐 [FIRESTORE] Auth claims:', {
      user_id: claims?.user_id,
      role: claims?.role,
    });

    const unsubscribe = subscribeToResidenceMessages(
      residenceId,
      (next) => {
        if (!active) return;
        setMessages(next);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        setError({
          code: err?.code ?? 'unknown',
          message: err?.message ?? 'Failed to load chat',
          isPermissionDenied: err?.code === 'permission-denied',
        });
        setLoading(false);
      },
    );

    return () => {
      active = false;
      console.log('[useFirestoreResidenceChat] Cleanup — residenceId:', residenceId);
      unsubscribe();
    };
  }, [
    residenceId,
    accessCheck.granted,
    accessCheck.reason,
    firebaseReady,
    firebaseInitializing,
    claims?.user_id,
    claims?.role,
  ]);

  return {
    messages,
    loading: loading || (accessCheck.granted && (firebaseInitializing || !firebaseReady)),
    error,
    accessDenied,
    accessInfo,
    authRequired,
    firebaseReady,
    firebaseClaims: claims,
    isPermissionDenied: Boolean(error?.isPermissionDenied),
  };
}
