import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Lock, MessageSquareOff, ShieldAlert } from 'lucide-react';
import { ChatWindow } from '../components/admin/ChatWindow';
import { useFirestoreResidenceChat } from '../hooks/useFirestoreResidenceChat';
import { useChatResidences } from '../hooks/useChatResidences';
import { firestoreGroupId, sendResidenceMessage } from '../firebase/firestoreChat';
import { getSessionResidenceAdminId, sendResidenceGroupChatNotifications } from '../utils/api';
import { isSuperAdmin, resolveSessionUser } from '../utils/rbac';
import { validateChatAccess } from '../utils/chatAccess';
import { chatRoleLabel, enrichChatSenderName } from '../utils/chatDisplay';
import { useChatSenderDisplayName } from '../hooks/useChatSenderDisplayName';
import { useLanguage } from '../utils/LanguageContext';
import { CHAT_PAGE_SHELL_CLASS } from '../components/admin/chatMockData';

/**
 * Condominium chat — super admin: view-only; condominium admin: can send messages.
 *
 * @param {{
 *   selectedResidence: { id: number, name?: string, residence_name?: string } | null,
 *   sessionUser?: Record<string, unknown> | null,
 * }} props
 */
export function AdminChat({ selectedResidence, sessionUser: sessionUserProp }) {
  const { t } = useLanguage();
  const sessionUser = useMemo(
    () => resolveSessionUser(sessionUserProp),
    [sessionUserProp],
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);

  const { items: allowedResidences, loading: residencesLoading } = useChatResidences(sessionUser);

  const residenceId = selectedResidence?.id ?? null;

  useEffect(() => {
    setInput('');
    setSendError(null);
  }, [residenceId]);
  const residenceName =
    selectedResidence?.name ??
    selectedResidence?.residence_name ??
    (residenceId != null
      ? t('residenceWithId').replace('{id}', String(residenceId))
      : '');

  const accessPreview = useMemo(() => {
    if (residenceId == null) return null;
    return validateChatAccess({
      sessionUser,
      residenceId,
      allowedResidences,
      catalogLoading: residencesLoading,
    });
  }, [sessionUser, residenceId, allowedResidences, residencesLoading]);

  const {
    messages,
    loading,
    error,
    accessDenied,
    accessInfo,
    authRequired,
    firebaseReady,
    isPermissionDenied,
  } = useFirestoreResidenceChat(residenceId, {
    allowedResidences,
    sessionUser,
    catalogLoading: residencesLoading,
  });

  const sessionDisplayName = useChatSenderDisplayName(sessionUser);

  const sessionUserId = useMemo(
    () => getSessionResidenceAdminId(sessionUser),
    [sessionUser],
  );

  const chatRows = useMemo(
    () =>
      messages.map((m) => {
        const senderName = enrichChatSenderName(
          m.senderName,
          m.sender_role,
          m.user_id,
          sessionUserId,
          sessionDisplayName,
          String(sessionUser?.email ?? ''),
        );
        return {
          id: m.id,
          sender_name: senderName,
          sender_role: m.sender_role,
          sender_role_label: chatRoleLabel(m.sender_role, t),
          text: m.text,
          time: m.createdAtLabel,
        };
      }),
    [messages, sessionDisplayName, sessionUserId, sessionUser, t],
  );

  const memberCount = useMemo(() => {
    const names = new Set(messages.map((m) => m.senderName).filter(Boolean));
    return Math.max(names.size, messages.length > 0 ? 1 : 0);
  }, [messages]);

  const roleLabel = accessInfo?.role ?? accessPreview?.role ?? 'unknown';
  const isSuperAdminRole = isSuperAdmin(sessionUser);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isSuperAdminRole || residenceId == null || sending) return;

    const nameForSend = String(sessionDisplayName ?? '').trim();
    if (!nameForSend) {
      setSendError(t('couldNotLoadUsername'));
      return;
    }

    setSending(true);
    setSendError(null);
    try {
      await sendResidenceMessage(residenceId, {
        text,
        sessionUser,
        displayName: nameForSend,
      });
      setInput('');
      if (sessionUserId != null) {
        void sendResidenceGroupChatNotifications(residenceId, sessionUserId, text);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('failedToSendMessage');
      setSendError(message);
      console.error('❌ [FIRESTORE] Send failed:', err);
    } finally {
      setSending(false);
    }
  }, [input, isSuperAdminRole, residenceId, sending, sessionUser, sessionDisplayName, sessionUserId, t]);

  if (residenceId == null) {
    return (
      <div className={`${CHAT_PAGE_SHELL_CLASS} items-center justify-center rounded-2xl border border-dashed border-neutral-line-200 bg-neutral-line-50/50 p-8`}>
        <div className="text-center max-w-md">
          <MessageSquareOff className="w-12 h-12 text-neutral-ink-400 mx-auto mb-4" />
          <p className="text-neutral-ink-700 font-medium">{t('selectResidence')}</p>
          <p className="text-sm text-neutral-ink-500 mt-2">
            {t('pickCondominiumFromSidebar')}
          </p>
        </div>
      </div>
    );
  }

  const groupId = firestoreGroupId(residenceId);

  if (authRequired) {
    return (
      <div className={`${CHAT_PAGE_SHELL_CLASS} items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8`}>
        <div className="text-center max-w-md">
          <ShieldAlert className="w-10 h-10 text-amber-700 mx-auto mb-3" />
          <p className="font-medium text-amber-950">{t('firebaseAuthRequired')}</p>
          <p className="text-sm text-amber-900/80 mt-2">
            {t('firebaseAuthRequiredHint')}
          </p>
        </div>
      </div>
    );
  }

  if (residencesLoading || (loading && !accessDenied)) {
    return (
      <div className={`${CHAT_PAGE_SHELL_CLASS} items-center justify-center rounded-2xl border border-neutral-line-200 bg-white`}>
        <div className="flex flex-col items-center text-neutral-ink-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#6A8F7B] mb-3" />
          <p className="text-sm">
            {!firebaseReady ? t('connectingFirebaseAuth') : t('loadingChat')}
          </p>
          <p className="text-xs font-mono mt-1 text-neutral-ink-400">{groupId}</p>
          <p className="text-xs mt-2 text-neutral-ink-400 capitalize">
            {t('roleWithLabel').replace('{role}', roleLabel.replace('_', ' '))}
          </p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className={CHAT_PAGE_SHELL_CLASS}>
        <UnauthorizedAccessPanel
          residenceId={residenceId}
          residenceName={residenceName}
          roleLabel={roleLabel}
          reason={accessInfo?.reason}
          t={t}
        />
      </div>
    );
  }

  if (isPermissionDenied) {
    return (
      <div className={`${CHAT_PAGE_SHELL_CLASS} gap-3`}>
        <FirestorePermissionPanel groupId={groupId} message={error?.message} roleLabel={roleLabel} t={t} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`${CHAT_PAGE_SHELL_CLASS} items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6`}
        role="alert"
      >
        <div className="text-center max-w-md">
          <p className="font-medium text-red-800">{t('couldNotLoadChat')}</p>
          <p className="text-sm text-red-700 mt-2">{error.message}</p>
          <p className="text-xs font-mono text-red-600/80 mt-2">
            {t('errorCodeLabel').replace('{code}', String(error.code ?? ''))}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={CHAT_PAGE_SHELL_CLASS}>
      {!isSuperAdminRole && (
        <p className="shrink-0 text-xs text-neutral-ink-500 mb-1.5 px-1">
          {t('viewingAssignedResidenceChat').replace(
            '{count}',
            String(allowedResidences.length),
          )}
        </p>
      )}

      {isSuperAdminRole && (
        <p className="shrink-0 text-xs text-neutral-ink-500 mb-1.5 px-1">
          {t('viewOnlySuperAdminChat')}
        </p>
      )}

      <ChatWindow
        rootClassName="flex-1 min-h-0"
        residenceName={residenceName}
        memberCount={memberCount}
        messages={chatRows}
        input={input}
        onInputChange={(v) => {
          setInput(v);
          if (sendError) setSendError(null);
        }}
        onSend={() => {
          void handleSend();
        }}
        readOnly={isSuperAdminRole}
        sendDisabled={sending}
        typeMessagePlaceholder={t('typeMessage')}
        sendLabel={t('sendMessage')}
      />

      {sendError && (
        <p className="shrink-0 text-xs text-red-600 mt-2 px-1" role="alert">
          {sendError}
        </p>
      )}
    </div>
  );
}

function UnauthorizedAccessPanel({ residenceId, residenceName, roleLabel, reason, t }) {
  return (
    <div
      className="rounded-2xl border border-neutral-line-200 bg-neutral-line-50 p-6 text-sm text-neutral-ink-800 flex-1"
      role="alert"
    >
      <div className="flex items-start gap-3 max-w-2xl mx-auto">
        <Lock className="w-6 h-6 shrink-0 text-neutral-ink-600" />
        <div>
          <p className="font-semibold text-base">{t('chatAccessDeniedTitle')}</p>
          <p className="mt-2">
            {t('chatAccessDeniedBody')
              .replace('{role}', roleLabel.replace('_', ' '))
              .replace('{name}', residenceName)
              .replace('{id}', String(residenceId))}
          </p>
          <p className="mt-2 text-xs text-neutral-ink-600">
            {t('adminsMayOnlyViewAssignedChats')}
          </p>
          {reason && (
            <p className="mt-2 text-xs font-mono text-neutral-ink-500">
              {t('reasonWithLabel').replace('{reason}', reason)}
            </p>
          )}
          <p className="mt-3 text-xs text-neutral-ink-500">
            {t('noFirestoreListenerStarted')}
          </p>
        </div>
      </div>
    </div>
  );
}

function FirestorePermissionPanel({ groupId, message, roleLabel, t }) {
  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 flex-1"
      role="alert"
    >
      <div className="flex items-start gap-3 max-w-2xl mx-auto">
        <ShieldAlert className="w-6 h-6 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold text-base">{t('firestorePermissionDeniedTitle')}</p>
          <p className="mt-1 text-xs capitalize text-amber-800/90">
            {t('roleWithLabel').replace('{role}', roleLabel.replace('_', ' '))}
          </p>
          <p className="mt-2">
            {t('firestorePermissionDeniedBody').replace('{groupId}', groupId)}
          </p>
          {message && (
            <p className="mt-2 text-xs font-mono break-all text-amber-800/90">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
