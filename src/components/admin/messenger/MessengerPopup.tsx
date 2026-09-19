import React, { memo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { useLanguage } from '../../../utils/LanguageContext';
import { MessengerHeader } from './MessengerHeader';
import { MessengerSearch } from './MessengerSearch';
import { MessengerTabs } from './MessengerTabs';
import { MessengerConversationList } from './MessengerConversationList';
import { MessengerChatWindow } from './MessengerChatWindow';
import { MessengerEmptyPane } from './MessengerEmptyPane';
import {
  MESSENGER_CHAT_WIDTH,
  MESSENGER_LIST_WIDTH,
  MESSENGER_PANEL_SHADOW,
  MESSENGER_PANEL_TOP,
  MESSENGER_PANEL_WIDTH,
} from './messengerTheme';
import type { UseMessengerReturn } from './useMessenger';

interface MessengerPopupProps {
  messenger: UseMessengerReturn;
}

export const MessengerPopup = memo(function MessengerPopup({ messenger }: MessengerPopupProps) {
  const { t } = useLanguage();
  const panelRef = useRef<HTMLDivElement>(null);
  const ignoreOutsideUntilRef = useRef(0);

  const {
    close,
    selectedConversation,
    selectConversation,
    search,
    setSearch,
    activeTab,
    setActiveTab,
    conversations,
    loading,
    selectedConversationId,
    unreadTotal,
    activeMessages,
    chatInput,
    setChatInput,
    handleSend,
    sending,
    messagesLoading,
    openingChat,
    listError,
    composerError,
    firebaseWarn,
  } = messenger;

  useEffect(() => {
    ignoreOutsideUntilRef.current = Date.now() + 400;
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [close]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (Date.now() < ignoreOutsideUntilRef.current) return;
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      const btn = document.getElementById('casazero-messenger-trigger');
      if (btn?.contains(target)) return;
      close();
    };

    document.addEventListener('mousedown', onPointerDown, true);
    return () => document.removeEventListener('mousedown', onPointerDown, true);
  }, [close]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[99] bg-neutral-ink-900/40 backdrop-blur-sm"
        style={{ top: MESSENGER_PANEL_TOP, bottom: 0 }}
        aria-hidden
        onClick={close}
      />

      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t('messengerAriaLabel')}
        initial={{ opacity: 0, x: 32, scale: 0.98 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="fixed z-[100] isolate flex flex-row overflow-hidden bg-white rounded-l-2xl border border-[#E8F2EC] shadow-2xl"
        style={{
          top: MESSENGER_PANEL_TOP,
          right: 0,
          bottom: 0,
          width: MESSENGER_PANEL_WIDTH,
          maxWidth: 'calc(100vw - 0.5rem)',
          minHeight: 0,
          boxShadow: MESSENGER_PANEL_SHADOW,
        }}
      >
        <div
          className="flex flex-col h-full min-h-0 overflow-hidden shrink-0 border-r border-[#E8F2EC] bg-white"
          style={{ width: MESSENGER_LIST_WIDTH }}
        >
          <MessengerHeader
            onFilterClick={() => setActiveTab('unread')}
            onNewMessageClick={() => setActiveTab('all')}
            onClose={close}
          />
          <MessengerSearch value={search} onChange={setSearch} />
          <MessengerTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            unreadCount={unreadTotal}
          />
          {(listError || firebaseWarn) && (
            <div
              role="alert"
              className="mx-3 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
            >
              {listError ||
                t('firebaseAuthRequiredHint') ||
                'Messaging may be unavailable. Try signing out and back in.'}
            </div>
          )}
          <MessengerConversationList
            conversations={conversations}
            loading={loading}
            selectedId={selectedConversationId}
            onSelect={selectConversation}
          />
        </div>

        <div
          className="flex flex-col min-h-0 flex-1 bg-[#F8FAF9] relative border-l border-[#E8F2EC] h-full"
          style={{
            width: MESSENGER_CHAT_WIDTH,
            minWidth: MESSENGER_CHAT_WIDTH,
            flex: '1 1 0%',
          }}
        >
          <AnimatePresence mode="wait">
            {selectedConversation ? (
              <MessengerChatWindow
                key={selectedConversation.id}
                conversation={selectedConversation}
                messages={activeMessages}
                input={chatInput}
                onInputChange={setChatInput}
                onSend={handleSend}
                sending={sending || openingChat}
                messagesLoading={messagesLoading || openingChat}
                errorMessage={composerError}
              />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-1 min-h-0"
              >
                <MessengerEmptyPane />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </>,
    document.body,
  );
});
