import { useEffect, useState } from 'react';
import { fetchSessionUserDisplayName } from '../utils/api';
import { resolveChatSenderDisplayName } from '../utils/chatDisplay';
import { getFirebaseClaims } from '../firebase/firebaseAuth';

/**
 * Resolves the logged-in user's real name for chat (session → Firebase claims → API profile).
 * @param {Record<string, unknown> | null | undefined} sessionUser
 */
export function useChatSenderDisplayName(sessionUser) {
  const [displayName, setDisplayName] = useState(() =>
    resolveChatSenderDisplayName(sessionUser),
  );

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      const immediate = resolveChatSenderDisplayName(sessionUser);
      if (immediate) {
        if (!cancelled) setDisplayName(immediate);
        return;
      }

      try {
        const claims = await getFirebaseClaims();
        const fromClaims = resolveChatSenderDisplayName(null, claims);
        if (fromClaims && !cancelled) {
          setDisplayName(fromClaims);
          return;
        }
      } catch {
        /* ignore */
      }

      const fromApi = await fetchSessionUserDisplayName(sessionUser);
      if (!cancelled && fromApi) {
        setDisplayName(fromApi);
      }
    }

    void resolve();
    return () => {
      cancelled = true;
    };
  }, [sessionUser]);

  return displayName;
}
