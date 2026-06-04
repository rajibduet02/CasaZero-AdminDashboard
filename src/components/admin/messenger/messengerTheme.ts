/** Messenger design tokens — aligned with CasaZero admin (sage + forest green). */

export const MESSENGER_PRIMARY = '#2D5A43';
export const MESSENGER_PRIMARY_LIGHT = '#3D6B52';
export const MESSENGER_SAGE = '#6A8F7B';
export const MESSENGER_SAGE_LIGHT = '#E8F2EC';
export const MESSENGER_BADGE_GREEN = '#2FB476';
export const MESSENGER_INCOMING_BG = '#F4F5F7';
export const MESSENGER_CHAT_BG = '#F8FAF9';
export const MESSENGER_LIST_BG = '#FFFFFF';
export const MESSENGER_SURFACE_MUTED = '#F3F5F4';

/** Offset from viewport top (admin header). */
export const MESSENGER_PANEL_TOP = '4.5rem';

export const MESSENGER_LIST_WIDTH = 300;
/** Right chat pane — wider for comfortable reading. */
export const MESSENGER_CHAT_WIDTH = 520;
export const MESSENGER_PANEL_WIDTH = MESSENGER_LIST_WIDTH + MESSENGER_CHAT_WIDTH;

export const MESSENGER_PANEL_SHADOW =
  '0 25px 50px -12px rgba(45, 90, 67, 0.25), 0 12px 24px -8px rgba(0, 0, 0, 0.12)';

export const AVATAR_COLORS = {
  green: 'bg-gradient-to-br from-[#4A7D5E] to-[#2D5A43] text-white shadow-sm',
  purple: 'bg-gradient-to-br from-[#9B7FD4] to-[#6B4FA8] text-white shadow-sm',
  orange: 'bg-gradient-to-br from-[#E8A07A] to-[#C97A4E] text-white shadow-sm',
  blue: 'bg-gradient-to-br from-[#6B9AE8] to-[#3A6FC4] text-white shadow-sm',
  teal: 'bg-gradient-to-br from-[#5BB8AD] to-[#2E8A7F] text-white shadow-sm',
} as const;

/** Inline gradient fallback so avatars never render as empty white circles. */
export const AVATAR_GRADIENTS: Record<keyof typeof AVATAR_COLORS, string> = {
  green: 'linear-gradient(135deg, #4A7D5E 0%, #2D5A43 100%)',
  purple: 'linear-gradient(135deg, #9B7FD4 0%, #6B4FA8 100%)',
  orange: 'linear-gradient(135deg, #E8A07A 0%, #C97A4E 100%)',
  blue: 'linear-gradient(135deg, #6B9AE8 0%, #3A6FC4 100%)',
  teal: 'linear-gradient(135deg, #5BB8AD 0%, #2E8A7F 100%)',
};

export type AvatarColorKey = keyof typeof AVATAR_COLORS;
