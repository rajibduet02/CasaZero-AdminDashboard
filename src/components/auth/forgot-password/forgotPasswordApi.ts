import { API_BASE, apiFetch, isApiTruthyStatus, safeJsonParse } from '../../../utils/api';

export const AUTH_FORGOT_PASSWORD_URL = `${API_BASE}/auth/forgot-password`;
export const AUTH_RESET_PASSWORD_URL = `${API_BASE}/auth/reset-password`;

export type ForgotPasswordSendResponse = {
  status: boolean;
  message: string;
  email: string;
  user_id: number;
};

export type ResetPasswordResponse = {
  status: boolean;
  message: string;
};

async function parseAuthJson<T extends Record<string, unknown>>(response: Response): Promise<T> {
  const data = await safeJsonParse<T>(response);
  return data;
}

function authErrorMessage(data: Record<string, unknown>, fallback: string): string {
  if (typeof data.message === 'string' && data.message.trim()) return data.message;
  const errors = data.errors;
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors as Record<string, unknown[]>).flat()[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}

/** Step 1 / resend — POST `{ email }` */
export async function sendForgotPasswordOtp(email: string): Promise<ForgotPasswordSendResponse> {
  const response = await apiFetch(AUTH_FORGOT_PASSWORD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email: email.trim() }),
    skipAuth: true,
    skipAuthFailureHandling: true,
  });

  const data = await parseAuthJson<Record<string, unknown>>(response);

  if (!response.ok || !isApiTruthyStatus(data.status)) {
    throw new Error(authErrorMessage(data, 'Failed to send verification code'));
  }

  return data as unknown as ForgotPasswordSendResponse;
}

/** Step 3 — POST `{ email, otp, password, password_confirmation }` */
export async function resetForgotPassword(payload: {
  email: string;
  otp: string;
  password: string;
  password_confirmation: string;
}): Promise<ResetPasswordResponse> {
  const response = await apiFetch(AUTH_RESET_PASSWORD_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: payload.email.trim(),
      otp: payload.otp.trim(),
      password: payload.password,
      password_confirmation: payload.password_confirmation,
    }),
    skipAuth: true,
    skipAuthFailureHandling: true,
  });

  const data = await parseAuthJson<Record<string, unknown>>(response);

  if (!response.ok || !isApiTruthyStatus(data.status)) {
    throw new Error(authErrorMessage(data, 'Failed to reset password'));
  }

  return data as unknown as ResetPasswordResponse;
}
