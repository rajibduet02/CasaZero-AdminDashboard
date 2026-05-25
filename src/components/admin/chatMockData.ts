/** Sidebar + chat routing (labels via `t(labelKey)`). */
export const CHAT_MOCK_RESIDENCES = [
  { id: 1, labelKey: 'chatResidencePolicePark' as const },
  { id: 2, labelKey: 'chatResidenceAttoExaResidence' as const },
  { id: 3, labelKey: 'chatResidenceBashundhraHeights' as const },
] as const;

export const CHAT_MOCK_MEMBER_COUNT = 12;

/** Seed rows for mock chat — all display strings resolved via `t(key)` in the UI. */
export type MockChatLine = {
  id: number;
  senderRole: 'resident' | 'admin';
  senderNameKey: string;
  bodyKey: string;
  time: string;
};

export function chatPageIdForResidence(residenceId: number): string {
  return `condominium-chat-${residenceId}`;
}

export function parseResidenceIdFromChatPage(page: string): number | null {
  const m = /^condominium-chat-(\d+)$/.exec(page);
  return m ? parseInt(m[1], 10) : null;
}

export function isCondominiumChatPage(page: string): boolean {
  return page === 'condominium-chat' || /^condominium-chat-\d+$/.test(page);
}

/** Fills the admin chat main column (must sit inside `.admin-chat-main`). */
export const CHAT_PAGE_SHELL_CLASS =
  'flex h-full min-h-0 flex-col overflow-hidden';

export function getMockChatLines(residenceId: number): MockChatLine[] {
  switch (residenceId) {
    case 2:
      return [
        {
          id: 1,
          senderRole: 'resident',
          senderNameKey: 'chatMockPersonLucaBianchi',
          bodyKey: 'chatMockR2Msg1',
          time: '09:05',
        },
        {
          id: 2,
          senderRole: 'admin',
          senderNameKey: 'chatSenderAdmin',
          bodyKey: 'chatMockR2Msg2',
          time: '09:08',
        },
      ];
    case 3:
      return [
        {
          id: 1,
          senderRole: 'resident',
          senderNameKey: 'chatMockPersonSaraNeri',
          bodyKey: 'chatMockR3Msg1',
          time: '14:22',
        },
        {
          id: 2,
          senderRole: 'admin',
          senderNameKey: 'chatSenderAdmin',
          bodyKey: 'chatMockR3Msg2',
          time: '14:30',
        },
      ];
    case 1:
    default:
      return [
        {
          id: 1,
          senderRole: 'resident',
          senderNameKey: 'chatMockPersonMarcoRossi',
          bodyKey: 'chatMockR1Msg1',
          time: '10:10',
        },
        {
          id: 2,
          senderRole: 'admin',
          senderNameKey: 'chatSenderAdmin',
          bodyKey: 'chatMockR1Msg2',
          time: '10:12',
        },
      ];
  }
}
