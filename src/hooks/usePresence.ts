import { useEffect, useState } from 'react';
import { subscribeToUsersPresence } from '../services/presenceService';

interface UsePresenceOptions {
  userIds: number[];
  enabled: boolean;
}

export function usePresence({ userIds, enabled }: UsePresenceOptions) {
  const [presenceByUserId, setPresenceByUserId] = useState<Map<number, boolean>>(
    () => new Map(),
  );

  const userIdsKey = userIds.join(',');

  useEffect(() => {
    if (!enabled || userIds.length === 0) {
      setPresenceByUserId(new Map());
      return;
    }

    const unsubscribe = subscribeToUsersPresence(userIds, (map) => {
      setPresenceByUserId(map);
    });

    return unsubscribe;
  }, [enabled, userIdsKey, userIds.length]);

  return { presenceByUserId };
}
