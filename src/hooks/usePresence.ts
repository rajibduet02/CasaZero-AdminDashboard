import { useEffect, useRef, useState } from 'react';
import { subscribeToUserPresence } from '../services/presenceService';

interface UsePresenceOptions {
  userIds: number[];
  enabled: boolean;
}

/**
 * One Firestore listener per user id. Adding/removing ids does not
 * resubscribe listeners for ids that are still present.
 */
export function usePresence({ userIds, enabled }: UsePresenceOptions) {
  const [presenceByUserId, setPresenceByUserId] = useState<Map<number, boolean>>(
    () => new Map(),
  );
  const listenersRef = useRef(new Map<number, () => void>());
  const presenceMapRef = useRef(new Map<number, boolean>());

  const userIdsKey = userIds.join(',');

  useEffect(() => {
    const teardownAll = () => {
      listenersRef.current.forEach((unsub) => unsub());
      listenersRef.current.clear();
      presenceMapRef.current = new Map();
      setPresenceByUserId(new Map());
    };

    if (!enabled) {
      teardownAll();
      return;
    }

    const uniqueIds = [...new Set(userIds.filter((id) => id > 0))];
    const nextSet = new Set(uniqueIds);
    let removed = false;

    for (const [id, unsub] of listenersRef.current) {
      if (!nextSet.has(id)) {
        unsub();
        listenersRef.current.delete(id);
        presenceMapRef.current.delete(id);
        removed = true;
      }
    }

    for (const id of uniqueIds) {
      if (listenersRef.current.has(id)) continue;
      const unsub = subscribeToUserPresence(id, (presence) => {
        presenceMapRef.current.set(id, presence.online);
        setPresenceByUserId(new Map(presenceMapRef.current));
      });
      listenersRef.current.set(id, unsub);
    }

    if (removed) {
      setPresenceByUserId(new Map(presenceMapRef.current));
    }
  }, [enabled, userIdsKey]);

  useEffect(() => {
    return () => {
      listenersRef.current.forEach((unsub) => unsub());
      listenersRef.current.clear();
    };
  }, []);

  return { presenceByUserId };
}
