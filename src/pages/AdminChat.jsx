import React, { useMemo } from 'react';
import { Building2, Loader2, Lock, MessageSquareOff, ShieldAlert } from 'lucide-react';
import { ChatWindow } from '../components/admin/ChatWindow';
import { useFirestoreResidenceChat } from '../hooks/useFirestoreResidenceChat';
import { useChatResidences } from '../hooks/useChatResidences';
import { firestoreGroupId } from '../firebase/firestoreChat';
import { resolveSessionUser } from '../utils/rbac';
import { validateChatAccess } from '../utils/chatAccess';

/**
 * Read-only admin chat — super admin (all residences) + admin (assigned only).
 *
 * @param {{ selectedResidence: { id: number, name?: string, residence_name?: string } | null }} props
 */
export function AdminChat({ selectedResidence }) {
  const sessionUser = useMemo(() => resolveSessionUser(), []);
  const { items: allowedResidences, loading: residencesLoading } = useChatResidences(sessionUser);

  const residenceId = selectedResidence?.id ?? null;
  const residenceName =
    selectedResidence?.name ??
    selectedResidence?.residence_name ??
    (residenceId != null ? `Residence ${residenceId}` : '');

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

  const chatRows = useMemo(
    () =>
      messages.map((m) => ({
        id: m.id,
        sender_name: m.senderName,
        sender_role: m.sender_role,
        text: m.text,
        time: m.createdAtLabel,
      })),
    [messages],
  );

  const memberCount = useMemo(() => {
    const names = new Set(messages.map((m) => m.senderName).filter(Boolean));
    return Math.max(names.size, messages.length > 0 ? 1 : 0);
  }, [messages]);

  const roleLabel = accessInfo?.role ?? accessPreview?.role ?? 'unknown';
  const isSuperAdminRole = roleLabel === 'super_admin';

  if (residenceId == null) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center rounded-2xl border border-dashed border-neutral-line-200 bg-neutral-line-50/50 p-8">
        <div className="text-center max-w-md">
          <MessageSquareOff className="w-12 h-12 text-neutral-ink-400 mx-auto mb-4" />
          <p className="text-neutral-ink-700 font-medium">Select a residence</p>
          <p className="text-sm text-neutral-ink-500 mt-2">
            Pick a condominium from the sidebar to view live chat messages.
          </p>
        </div>
      </div>
    );
  }

  const groupId = firestoreGroupId(residenceId);

  if (authRequired) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 p-8">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-10 h-10 text-amber-700 mx-auto mb-3" />
          <p className="font-medium text-amber-950">Firebase authentication required</p>
          <p className="text-sm text-amber-900/80 mt-2">
            Sign out and sign in again so Firestore can use your custom token.
          </p>
        </div>
      </div>
    );
  }

  if (residencesLoading || (loading && !accessDenied)) {
    return (
      <div className="flex h-[calc(100vh-140px)] items-center justify-center rounded-2xl border border-neutral-line-200 bg-white">
        <div className="flex flex-col items-center text-neutral-ink-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#6A8F7B] mb-3" />
          <p className="text-sm">
            {!firebaseReady ? 'Connecting Firebase authentication…' : 'Loading chat…'}
          </p>
          <p className="text-xs font-mono mt-1 text-neutral-ink-400">{groupId}</p>
          <p className="text-xs mt-2 text-neutral-ink-400 capitalize">Role: {roleLabel.replace('_', ' ')}</p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col">
        <UnauthorizedAccessPanel
          residenceId={residenceId}
          residenceName={residenceName}
          roleLabel={roleLabel}
          reason={accessInfo?.reason}
        />
      </div>
    );
  }

  if (isPermissionDenied) {
    return (
      <div className="h-[calc(100vh-140px)] flex flex-col gap-3">
        <FirestorePermissionPanel groupId={groupId} message={error?.message} roleLabel={roleLabel} />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="h-[calc(100vh-140px)] flex items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-6"
        role="alert"
      >
        <div className="text-center max-w-md">
          <p className="font-medium text-red-800">Could not load chat</p>
          <p className="text-sm text-red-700 mt-2">{error.message}</p>
          <p className="text-xs font-mono text-red-600/80 mt-2">Code: {error.code}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-140px)] flex min-h-0 flex-col">
      {!isSuperAdminRole && (
        <p className="text-xs text-neutral-ink-500 mb-2 px-1">
          Viewing assigned residence chat only ({allowedResidences.length} available)
        </p>
      )}

      {messages.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col bg-white rounded-2xl shadow-sm overflow-hidden border border-neutral-line-200">
          <ChatHeader
            residenceName={residenceName}
            groupId={groupId}
            memberCount={0}
            roleLabel={roleLabel}
          />
          <div className="flex flex-1 flex-col items-center justify-center py-16 text-neutral-ink-500">
            <MessageSquareOff className="w-10 h-10 mb-3 opacity-50" />
            <p className="text-sm">No messages yet in this group.</p>
          </div>
        </div>
      ) : (
        <ChatWindow
          rootClassName="!min-h-0 flex-1 h-full min-h-0 w-full rounded-2xl border border-neutral-line-200 shadow-sm !h-full max-h-full"
          residenceName={residenceName}
          memberCount={memberCount}
          messages={chatRows}
          input=""
          onInputChange={() => {}}
          onSend={() => {}}
          readOnly
          typeMessagePlaceholder="View only"
          sendLabel="Send"
        />
      )}
    </div>
  );
}

function ChatHeader({ residenceName, groupId, memberCount, roleLabel }) {
  return (
    <div className="p-4 border-b border-neutral-line-200 flex items-center gap-3 shrink-0">
      <div className="shrink-0 w-10 h-10 rounded-xl bg-[#6A8F7B]/15 text-[#6A8F7B] flex items-center justify-center">
        <Building2 className="w-5 h-5" />
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-semibold text-neutral-ink-900 truncate">{residenceName}</h2>
        <p className="text-xs text-neutral-ink-500 mt-0.5 truncate">
          {groupId} • {memberCount} participant{memberCount === 1 ? '' : 's'} • {roleLabel}
        </p>
      </div>
      <span className="text-[10px] uppercase tracking-wide text-[#6A8F7B] bg-[#6A8F7B]/10 px-2 py-1 rounded-md shrink-0">
        View only
      </span>
    </div>
  );
}

function UnauthorizedAccessPanel({ residenceId, residenceName, roleLabel, reason }) {
  return (
    <div
      className="rounded-2xl border border-neutral-line-200 bg-neutral-line-50 p-6 text-sm text-neutral-ink-800 flex-1"
      role="alert"
    >
      <div className="flex items-start gap-3 max-w-2xl mx-auto">
        <Lock className="w-6 h-6 shrink-0 text-neutral-ink-600" />
        <div>
          <p className="font-semibold text-base">Chat access denied</p>
          <p className="mt-2">
            Your role (<span className="font-medium capitalize">{roleLabel.replace('_', ' ')}</span>)
            cannot open chat for <span className="font-medium">{residenceName}</span> (ID {residenceId}).
          </p>
          <p className="mt-2 text-xs text-neutral-ink-600">
            Admins may only view chats for residences assigned to their account.
          </p>
          {reason && (
            <p className="mt-2 text-xs font-mono text-neutral-ink-500">Reason: {reason}</p>
          )}
          <p className="mt-3 text-xs text-neutral-ink-500">
            No Firestore listener was started. See console: <span className="font-mono">❌ [CHAT ACCESS] Access denied</span>
          </p>
        </div>
      </div>
    </div>
  );
}

function FirestorePermissionPanel({ groupId, message, roleLabel }) {
  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 flex-1"
      role="alert"
    >
      <div className="flex items-start gap-3 max-w-2xl mx-auto">
        <ShieldAlert className="w-6 h-6 shrink-0 text-amber-700" />
        <div>
          <p className="font-semibold text-base">Firestore permission denied</p>
          <p className="mt-1 text-xs capitalize text-amber-800/90">Role: {roleLabel.replace('_', ' ')}</p>
          <p className="mt-2">
            Cannot read{' '}
            <code className="text-xs bg-amber-100 px-1.5 py-0.5 rounded font-mono">
              groups/{groupId}/messages
            </code>
            . Update Firestore security rules for admin access.
          </p>
          {message && (
            <p className="mt-2 text-xs font-mono break-all text-amber-800/90">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
