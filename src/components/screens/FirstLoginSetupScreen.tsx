import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Switch } from '../ui/switch';
import { Shield, Lock, Check, AlertCircle, Eye, EyeOff, Smartphone } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';
import casazeroLogo from 'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png';
import buildingBg from 'figma:asset/af8ff57797d14df91ef70730582bc16d71c05087.webp';

interface FirstLoginSetupScreenProps {
  onComplete: () => void;
  userEmail: string;
}

export function FirstLoginSetupScreen({ onComplete, userEmail }: FirstLoginSetupScreenProps) {
  const { language, t } = useLanguage();
  const [step, setStep] = useState(1);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [enable2FA, setEnable2FA] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  const passwordRequirements = [
    { label: t('passwordLength') || 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { label: t('passwordUppercase') || 'Contains uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: t('passwordLowercase') || 'Contains lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: t('passwordNumber') || 'Contains number', test: (pwd: string) => /[0-9]/.test(pwd) },
    { label: t('passwordSpecial') || 'Contains special character', test: (pwd: string) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) },
  ];

  const handlePasswordChange = () => {
    // Validate current password
    if (!currentPassword || currentPassword.trim() === '') {
      toast.error(t('error'), {
        description: t('enterCurrentPassword') || 'Please enter your current password',
      });
      return;
    }

    // Validate new password fields
    if (!newPassword || newPassword.trim() === '') {
      toast.error(t('error'), {
        description: t('enterNewPassword') || 'Please enter and confirm your new password',
      });
      return;
    }

    if (!confirmPassword || confirmPassword.trim() === '') {
      toast.error(t('error'), {
        description: t('enterNewPassword') || 'Please enter and confirm your new password',
      });
      return;
    }

    // Check if passwords match
    if (newPassword !== confirmPassword) {
      toast.error(t('error'), {
        description: t('passwordsNoMatch') || 'Passwords do not match',
      });
      return;
    }

    // Check all password requirements are met
    const allRequirementsMet = passwordRequirements.every(req => req.test(newPassword));
    if (!allRequirementsMet) {
      toast.error(t('error'), {
        description: t('passwordRequirementsNotMet') || 'Password does not meet all requirements',
      });
      return;
    }

    // All validations passed - show success and proceed to 2FA setup
    toast.success(t('success'), {
      description: t('passwordChanged') || 'Password changed successfully',
    });

    // Move to 2FA Configuration page
    setStep(2);
  };

  const handle2FASetup = () => {
    if (enable2FA) {
      if (!verificationCode || verificationCode.length !== 6) {
        toast.error(t('error'), {
          description: t('enterVerificationCode') || 'Please enter the 6-digit verification code',
        });
        return;
      }
      
      toast.success(t('success'), {
        description: t('2faEnabled') || 'Two-factor authentication enabled successfully',
      });
    }

    // Complete setup
    onComplete();
  };

  const progressValue = step === 1 ? 50 : 100;

  // Check if password change form is valid
  const isPasswordFormValid = 
    currentPassword.trim() !== '' &&
    newPassword.trim() !== '' &&
    confirmPassword.trim() !== '' &&
    newPassword === confirmPassword &&
    passwordRequirements.every(req => req.test(newPassword));

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Modern Building Background */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ 
          backgroundImage: `url(${buildingBg})`
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/30"></div>
      </div>

      {/* Mobile Container */}
      <div className="w-full max-w-[430px] min-h-screen relative z-10 flex items-center justify-center px-6 py-12 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-8"
          >
            <img 
              src={casazeroLogo} 
              alt="CasaZero" 
              className="mx-auto mb-3 drop-shadow-2xl"
              style={{ width: '240px', height: 'auto', filter: 'brightness(0) invert(1)' }}
            />
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/90 text-sm tracking-wide drop-shadow-lg mb-4"
            >
              {t('smartLiving')}
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-2 text-white"
            >
              {t('firstLoginSetup') || 'First-Time Setup'}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-white/70 text-sm"
            >
              {t('secureYourAccount') || 'Secure your account with a new password and two-factor authentication'}
            </motion.p>
          </motion.div>

          {/* Progress Bar */}
          <div className="mb-6">
            <Progress value={progressValue} className="h-2" />
            <div className="flex justify-between mt-2 text-xs text-white/70">
              <span className={step === 1 ? 'text-white font-medium' : ''}>
                {t('changePassword')}
              </span>
              <span className={step === 2 ? 'text-white font-medium' : ''}>
                {t('twoFactorAuth')}
              </span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* Step 1: Password Change */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-sage-500 to-brand-sage-600 flex items-center justify-center shadow-lg">
                        <Lock className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-white">{t('changePassword')}</CardTitle>
                        <CardDescription className="text-white/70">{t('createStrongPassword') || 'Create a strong, unique password'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Alert className="bg-white/20 border-white/30 backdrop-blur-sm">
                      <AlertCircle className="w-4 h-4 text-white" />
                      <AlertDescription className="text-sm text-white/90">
                        {t('firstLoginPasswordChange') || 'For security reasons, you must change your password on first login'}
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="current-password" className="text-white/90 text-sm">{t('password') || 'Current Password'}</Label>
                      <div className="relative">
                        <Input
                          id="current-password"
                          type={showCurrentPassword ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-ink-400 hover:text-neutral-ink-600"
                        >
                          {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-white/90 text-sm">{t('newPassword') || 'New Password'}</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-ink-400 hover:text-neutral-ink-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-white/90 text-sm">{t('confirmPassword') || 'Confirm New Password'}</Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className={`bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all ${
                            confirmPassword && newPassword ? (
                              newPassword === confirmPassword 
                                ? 'border-success focus:border-success' 
                                : 'border-danger focus:border-danger'
                            ) : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-ink-400 hover:text-neutral-ink-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {confirmPassword && newPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-danger flex items-center gap-1 bg-white/90 rounded-lg px-2 py-1">
                          <AlertCircle className="w-3 h-3" />
                          {language === 'it' ? 'Le password non corrispondono' : 'Passwords do not match'}
                        </p>
                      )}
                      {confirmPassword && newPassword && newPassword === confirmPassword && (
                        <p className="text-xs text-success flex items-center gap-1 bg-white/90 rounded-lg px-2 py-1">
                          <Check className="w-3 h-3" />
                          {language === 'it' ? 'Le password corrispondono' : 'Passwords match'}
                        </p>
                      )}
                    </div>

                    {/* Password Requirements */}
                    {newPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className={`rounded-xl p-4 space-y-2 border transition-all duration-300 ${
                          passwordRequirements.every(req => req.test(newPassword))
                            ? 'bg-success/20 border-success/40 backdrop-blur-sm'
                            : 'bg-white/20 border-white/30 backdrop-blur-sm'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm text-white/90">{t('passwordRequirements') || 'Password Requirements:'}</p>
                          {passwordRequirements.every(req => req.test(newPassword)) && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="flex items-center gap-1 text-white"
                            >
                              <Check className="w-4 h-4" />
                              <span className="text-xs font-medium">
                                {language === 'it' ? 'Completo' : 'Complete'}
                              </span>
                            </motion.div>
                          )}
                        </div>
                        {passwordRequirements.map((req, index) => (
                          <motion.div 
                            key={index} 
                            className="flex items-center gap-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all duration-300 ${
                              req.test(newPassword) ? 'bg-success scale-110' : 'bg-neutral-line-300'
                            }`}>
                              {req.test(newPassword) && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`text-xs transition-all duration-300 ${
                              req.test(newPassword) ? 'text-white font-medium' : 'text-white/70'
                            }`}>
                              {req.label}
                            </span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}

                    {isPasswordFormValid && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-success/20 border border-success/40 backdrop-blur-sm rounded-xl p-3 flex items-center justify-center gap-2"
                      >
                        <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm text-white font-medium">
                          {language === 'it' 
                            ? 'Password valida! Pronto per continuare' 
                            : 'Valid password! Ready to continue'}
                        </span>
                      </motion.div>
                    )}

                    <Button 
                      onClick={handlePasswordChange}
                      disabled={!isPasswordFormValid}
                      className={`w-full shadow-lg hover:shadow-xl transition-all duration-300 ${
                        isPasswordFormValid 
                          ? 'bg-brand-sage-500 hover:bg-brand-sage-600' 
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                      size="lg"
                    >
                      {language === 'it' 
                        ? 'Continua alla Configurazione 2FA' 
                        : 'Continue to 2FA Setup'}
                    </Button>
                    
                    {!isPasswordFormValid && (currentPassword || newPassword || confirmPassword) && (
                      <motion.p 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs text-center text-white/70 flex items-center justify-center gap-1"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {language === 'it' 
                          ? 'Completa tutti i campi e soddisfa i requisiti della password' 
                          : 'Complete all fields and meet password requirements'}
                      </motion.p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: 2FA Setup */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl">
                  <CardHeader className="px-4 sm:px-6">
                    <div className="flex items-start sm:items-center gap-3 mb-2">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-info to-info/80 flex items-center justify-center shadow-lg flex-shrink-0">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-base sm:text-lg">{t('twoFactorAuth')}</CardTitle>
                        <CardDescription className="text-white/70 text-xs sm:text-sm">{t('addExtraSecurity') || 'Add an extra layer of security'}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 sm:space-y-5 px-4 sm:px-6">
                    <Alert className="bg-white/20 border-white/30 backdrop-blur-sm">
                      <Smartphone className="w-4 h-4 text-white flex-shrink-0" />
                      <AlertDescription className="text-xs sm:text-sm text-white/90">
                        {t('2faRecommended') || 'Two-factor authentication is highly recommended for protecting your account'}
                      </AlertDescription>
                    </Alert>

                    <div className="flex items-start sm:items-center justify-between gap-3 p-3 sm:p-4 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30">
                      <div className="flex-1 min-w-0">
                        <Label htmlFor="enable-2fa" className="cursor-pointer">
                          <span className="font-medium text-white text-sm sm:text-base">{t('enable2FA') || 'Enable Two-Factor Authentication'}</span>
                          <p className="text-xs text-white/70 mt-1">
                            {t('2faDescription') || 'Require a verification code from your phone when signing in'}
                          </p>
                        </Label>
                      </div>
                      <Switch
                        id="enable-2fa"
                        checked={enable2FA}
                        onCheckedChange={setEnable2FA}
                        className="flex-shrink-0"
                      />
                    </div>

                    <AnimatePresence>
                      {enable2FA && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4"
                        >
                          <div className="bg-white/90 backdrop-blur-sm border border-white/40 rounded-xl p-3 sm:p-4 text-center">
                            <div className="w-32 h-32 sm:w-40 sm:h-40 mx-auto bg-neutral-line-100 rounded-xl mb-3 flex items-center justify-center">
                              <p className="text-xs sm:text-sm text-neutral-ink-500">{t('qrCodePlaceholder') || 'QR Code'}</p>
                            </div>
                            <p className="text-xs text-neutral-ink-600 mb-2 px-2">
                              {t('scanQRCode') || 'Scan this QR code with your authenticator app'}
                            </p>
                            <code className="text-xs bg-neutral-line-100 px-2 sm:px-3 py-1 rounded break-all">
                              CASA-ZERO-{userEmail.split('@')[0].toUpperCase()}
                            </code>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="verification-code" className="text-white/90 text-xs sm:text-sm">{t('verificationCode') || 'Verification Code'}</Label>
                            <Input
                              id="verification-code"
                              type="text"
                              value={verificationCode}
                              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                              placeholder="000000"
                              className="text-center tracking-widest text-base sm:text-lg bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-11 sm:h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                              maxLength={6}
                            />
                            <p className="text-xs text-white/70 px-1">
                              {t('enterCodeFromApp') || 'Enter the 6-digit code from your authenticator app'}
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <Button 
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 h-10 sm:h-11"
                      >
                        {t('back')}
                      </Button>
                      <Button 
                        onClick={handle2FASetup}
                        className="flex-1 shadow-lg hover:shadow-xl h-10 sm:h-11"
                      >
                        {t('complete') || 'Complete Setup'}
                      </Button>
                    </div>

                    {!enable2FA && (
                      <Button 
                        variant="ghost"
                        onClick={onComplete}
                        className="w-full text-white/70 hover:text-white h-10"
                      >
                        {t('skipForNow') || 'Skip for now'}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-center text-xs text-white/60 mt-6"
          >
            {t('copyright')}
          </motion.p>
        </motion.div>
      </div>
    </div>
  );
}
