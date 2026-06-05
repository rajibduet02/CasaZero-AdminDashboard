import { useEffect, useMemo, useState } from 'react';
import {
  fetchPrivateChatResidents,
  getSessionResidenceAdminId,
  isApiTruthyStatus,
  safeJsonParse,
  type PrivateChatResident,
} from '../utils/api';
import { resolveSessionUser } from '../utils/rbac';
import {
  buildConversationId,
  buildListRowId,
  subscribeToAdminConversations,
  timestampToMillis,
} from '../services/privateChatService';
import { usePresence } from './usePresence';
import type { ConversationDocument, ConversationListItem } from '../types/chat';

interface UseConversationsOptions {
  enabled: boolean;
  firebaseReady: boolean;
}

function resolveAdminDisplayName(sessionUser: Record<string, unknown> | null): string {
  if (!sessionUser) return 'Administrator';
  const name = String(sessionUser.user_name ?? sessionUser.name ?? '').trim();
  return name || 'Administrator';
}

function mergeResidentsWithFirestore(
  residents: PrivateChatResident[],
  adminId: number,
  firestoreMap: Map<string, ConversationDocument>,
  presenceMap: Map<number, boolean>,
): ConversationListItem[] {
  return residents.map((row) => {
    const conversationId = buildConversationId(adminId, row.id);
    const firestoreDoc = firestoreMap.get(conversationId);
    const hasConversation = Boolean(firestoreDoc);

    return {
      listRowId: buildListRowId(row.id, row.residence_id),
      conversationId,
      userId: row.id,
      userName: row.user_name,
      profileImage: row.profile_image,
      residenceId: row.residence_id,
      residenceName: row.residence_name,
      lastMessage: firestoreDoc?.lastMessage || undefined,
      lastMessageAt: firestoreDoc?.lastMessageAt
        ? timestampToMillis(firestoreDoc.lastMessageAt)
        : undefined,
      unreadCount: firestoreDoc?.unreadAdmin ?? 0,
      hasConversation,
      isOnline: presenceMap.get(row.id) ?? false,
    };
  });
}

export function useConversations({ enabled, firebaseReady }: UseConversationsOptions) {
  const sessionUser = useMemo(
    () => resolveSessionUser() as Record<string, unknown> | null,
    [],
  );
  const adminId = useMemo(() => getSessionResidenceAdminId(sessionUser), [sessionUser]);
  const adminName = useMemo(() => resolveAdminDisplayName(sessionUser), [sessionUser]);

  const [residents, setResidents] = useState<PrivateChatResident[]>([]);
  const [firestoreMap, setFirestoreMap] = useState<Map<string, ConversationDocument>>(
    () => new Map(),
  );
  const [loadingResidents, setLoadingResidents] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const residentIds = useMemo(() => residents.map((r) => r.id), [residents]);
  const { presenceByUserId } = usePresence({
    userIds: residentIds,
    enabled: enabled && firebaseReady,
  });

  useEffect(() => {
    if (!enabled || adminId == null) {
      setResidents([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoadingResidents(true);
    setError(null);

    (async () => {
      try {
        const response = await fetchPrivateChatResidents(adminId);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await safeJsonParse<{
          status?: unknown;
          data?: PrivateChatResident[];
        }>(response);

        if (cancelled) return;

        if (!isApiTruthyStatus(result.status) || !Array.isArray(result.data)) {
          setResidents([]);
          setError('Invalid resident list response');
          return;
        }

        setResidents(result.data);
      } catch (err) {
        if (!cancelled) {
          setResidents([]);
          setError(err instanceof Error ? err.message : 'Failed to load residents');
        }
      } finally {
        if (!cancelled) setLoadingResidents(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, adminId]);

  useEffect(() => {
    if (!enabled || !firebaseReady || adminId == null) {
      setFirestoreMap(new Map());
      return;
    }

    const unsubscribe = subscribeToAdminConversations(
      adminId,
      (map) => setFirestoreMap(map),
      (err) => setError(err.message),
    );

    return unsubscribe;
  }, [enabled, firebaseReady, adminId]);

  const conversations = useMemo(() => {
    if (adminId == null) return [];
    return mergeResidentsWithFirestore(residents, adminId, firestoreMap, presenceByUserId);
  }, [residents, adminId, firestoreMap, presenceByUserId]);

  return {
    conversations,
    loading: enabled && (loadingResidents || !firebaseReady),
    error,
    adminId,
    adminName,
  };
}
