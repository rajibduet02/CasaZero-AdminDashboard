export type ForgotPasswordStep = 1 | 2 | 3;

export type ForgotPasswordFormState = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
};

export type ForgotPasswordStepProps = {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
  onEmailChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onContinue: () => void;
  onVerify: () => void;
  onReset: () => void;
  onBack: () => void;
  onBackToLogin: () => void;
  emailError?: string;
  passwordError?: string;
  confirmError?: string;
  otpError?: string;
  isSubmitting?: boolean;
};
