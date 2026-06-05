type ForgotPasswordLanguage = 'it' | 'en';

const copy = {
  en: {
    step1Title: 'Forgot Password',
    step1Description:
      'Enter your email address and we will send you a verification code.',
    continue: 'Continue',
    backToLogin: 'Back to Login',
    step2Title: 'Verify Your Identity',
    step2Subtitle: 'Email Authentication',
    step2SentMessage: "We've sent a verification code to your email.",
    verifyAndContinue: 'Verify and Continue',
    back: 'Back',
    resendCode: 'Resend Code',
    resendIn: 'Resend code in',
    step3Title: 'Reset Password',
    step3Description: 'Create a new password for your account.',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    resetPassword: 'Reset Password',
    emailRequired: 'Email is required',
    emailInvalid: 'Please enter a valid email address',
    otpRequired: 'Enter the 6-digit verification code',
    passwordRequired: 'Password is required',
    confirmRequired: 'Please confirm your password',
    passwordsMismatch: 'Passwords do not match',
    seconds: 's',
    otpSentSuccess: 'Verification code sent to your email.',
    passwordResetSuccess: 'Your password has been reset successfully.',
    requestFailed: 'Something went wrong. Please try again.',
    networkError: 'Unable to connect to server. Check your internet connection.',
  },
  it: {
    step1Title: 'Password Dimenticata',
    step1Description:
      'Inserisci il tuo indirizzo email e ti invieremo un codice di verifica.',
    continue: 'Continua',
    backToLogin: 'Torna al Login',
    step2Title: 'Verifica la Tua Identità',
    step2Subtitle: 'Autenticazione Email',
    step2SentMessage: 'Abbiamo inviato un codice di verifica alla tua email.',
    verifyAndContinue: 'Verifica e Continua',
    back: 'Indietro',
    resendCode: 'Invia di Nuovo il Codice',
    resendIn: 'Reinvia codice tra',
    step3Title: 'Reimposta Password',
    step3Description: 'Crea una nuova password per il tuo account.',
    newPassword: 'Nuova Password',
    confirmPassword: 'Conferma Password',
    resetPassword: 'Reimposta Password',
    emailRequired: "L'email è obbligatoria",
    emailInvalid: 'Inserisci un indirizzo email valido',
    otpRequired: 'Inserisci il codice di verifica a 6 cifre',
    passwordRequired: 'La password è obbligatoria',
    confirmRequired: 'Conferma la password',
    passwordsMismatch: 'Le password non corrispondono',
    seconds: 's',
    otpSentSuccess: 'Codice di verifica inviato alla tua email.',
    passwordResetSuccess: 'La password è stata reimpostata con successo.',
    requestFailed: 'Qualcosa è andato storto. Riprova.',
    networkError: 'Impossibile connettersi al server. Controlla la connessione.',
  },
} as const;

export type ForgotPasswordCopy = (typeof copy)['en'];

export function getForgotPasswordCopy(language: ForgotPasswordLanguage): ForgotPasswordCopy {
  return copy[language];
}

/** Mask email for display: ah***0@gmail.com */
export function maskEmail(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return trimmed;

  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at);

  if (local.length <= 2) {
    return `${local[0] ?? ''}***${domain}`;
  }
  const visibleStart = local.slice(0, 2);
  const visibleEnd = local.length > 4 ? local.slice(-1) : '';
  return `${visibleStart}***${visibleEnd}${domain}`;
}
