import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { PresenceDocument } from '../types/chat';

const PRESENCE_COLLECTION = 'presence';

export function buildPresenceDocId(userId: number): string {
  return `user_${userId}`;
}

function mapPresenceDocument(data: DocumentData): PresenceDocument {
  return {
    online: Boolean(data.online),
    lastSeen: data.lastSeen ?? null,
  };
}

export async function setUserPresence(userId: number, online: boolean): Promise<void> {
  const ref = doc(db, PRESENCE_COLLECTION, buildPresenceDocId(userId));
  await setDoc(
    ref,
    {
      online,
      lastSeen: serverTimestamp(),
    },
    { merge: true },
  );
}

export function subscribeToUserPresence(
  userId: number,
  onUpdate: (presence: PresenceDocument) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const ref = doc(db, PRESENCE_COLLECTION, buildPresenceDocId(userId));

  return onSnapshot(
    ref,
    (snapshot) => {
      if (!snapshot.exists()) {
        onUpdate({ online: false, lastSeen: null });
        return;
      }
      onUpdate(mapPresenceDocument(snapshot.data()));
    },
    (err) => onError?.(err),
  );
}

export function subscribeToUsersPresence(
  userIds: number[],
  onUpdate: (presenceByUserId: Map<number, boolean>) => void,
  onError?: (error: Error) => void,
): () => void {
  const uniqueIds = [...new Set(userIds.filter((id) => id > 0))];
  const presenceMap = new Map<number, boolean>();
  const unsubscribers: Unsubscribe[] = [];

  if (uniqueIds.length === 0) {
    onUpdate(presenceMap);
    return () => undefined;
  }

  uniqueIds.forEach((userId) => {
    const unsub = subscribeToUserPresence(
      userId,
      (presence) => {
        presenceMap.set(userId, presence.online);
        onUpdate(new Map(presenceMap));
      },
      onError,
    );
    unsubscribers.push(unsub);
  });

  return () => {
    unsubscribers.forEach((unsub) => unsub());
  };
}
