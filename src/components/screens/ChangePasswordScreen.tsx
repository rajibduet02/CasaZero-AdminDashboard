import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Eye, EyeOff, Check, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';
import casazeroLogo from 'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png';
import buildingBg from 'figma:asset/af8ff57797d14df91ef70730582bc16d71c05087.webp';

interface ChangePasswordScreenProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function ChangePasswordScreen({ onBack, onSuccess }: ChangePasswordScreenProps) {
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const passwordRequirements = [
    { label: t('passwordLength') || 'At least 8 characters', test: (pwd: string) => pwd.length >= 8 },
    { label: t('passwordUppercase') || 'Contains uppercase letter', test: (pwd: string) => /[A-Z]/.test(pwd) },
    { label: t('passwordLowercase') || 'Contains lowercase letter', test: (pwd: string) => /[a-z]/.test(pwd) },
    { label: t('passwordNumber') || 'Contains number', test: (pwd: string) => /[0-9]/.test(pwd) },
    { label: t('passwordSpecial') || 'Contains special character', test: (pwd: string) => /[!@#$%^&*(),.?\":{}|<>]/.test(pwd) },
  ];

  const handleChangePassword = async () => {
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error(t('error'), {
        description: t('fillAllFields') || 'Please fill in all fields',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error(t('error'), {
        description: t('passwordsDoNotMatch') || 'Passwords do not match',
      });
      return;
    }

    // Check password requirements
    const unmetRequirements = passwordRequirements.filter(req => !req.test(newPassword));
    if (unmetRequirements.length > 0) {
      toast.error(t('error'), {
        description: t('passwordRequirementsNotMet') || 'Password does not meet requirements',
      });
      return;
    }

    setIsLoading(true);

    // No authenticated "change password" Laravel endpoint is wired in this app
    // (only forgot-password OTP reset exists). Do not simulate success.
    setIsLoading(false);
    toast.error(t('error') || 'Error', {
      description:
        t('changePasswordUnavailable') ||
        'Changing password from this screen is not available yet. Please use “Forgot password” on the login page, or contact your administrator.',
    });
  };

  const isPasswordValid = newPassword && passwordRequirements.every(req => req.test(newPassword));
  const canSubmit = currentPassword && newPassword && confirmPassword && newPassword === confirmPassword && isPasswordValid;

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

      {/* Back Button - Top Left */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        onClick={onBack}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 text-white/90 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span className="text-sm">{t('back') || 'Back'}</span>
      </motion.button>

      {/* Mobile Container */}
      <div className="w-full max-w-[430px] min-h-screen relative z-10 flex items-center justify-center px-6 py-12 mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ 
            type: "spring",
            stiffness: 200,
            damping: 20,
            delay: 0.1
          }}
          className="w-full space-y-8"
        >
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-center mb-10"
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
              className="text-white/90 text-sm tracking-wide drop-shadow-lg"
            >
              {t('smartLiving')}
            </motion.p>
          </motion.div>

          {/* Card with Glassmorphism */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl space-y-6"
          >
            {/* Header */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl text-white">
                {t('changePassword') || 'Change Password'}
              </h1>
              <p className="text-sm text-white/70">
                {t('changePasswordDesc') || 'Enter your current password and choose a new one'}
              </p>
            </div>

            {/* Form */}
            <div className="space-y-5">
              {/* Current Password */}
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-white/90 text-sm">
                  {t('currentPassword') || 'Current Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="pr-10 bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-ink-400 hover:text-neutral-ink-600 transition-colors"
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-white/90 text-sm">
                  {t('newPassword') || 'New Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pr-10 bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-ink-400 hover:text-neutral-ink-600 transition-colors"
                  >
                    {showNewPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-white/90 text-sm">
                  {t('confirmPassword') || 'Confirm Password'}
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pr-10 bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-ink-400 hover:text-neutral-ink-600 transition-colors"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements */}
              {newPassword && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-2 pt-2"
                >
                  <p className="text-xs text-white/80">
                    {t('passwordRequirements') || 'Password requirements:'}
                  </p>
                  <div className="space-y-1.5">
                    {passwordRequirements.map((req, idx) => {
                      const isMet = req.test(newPassword);
                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center gap-2"
                        >
                          <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
                            isMet ? 'bg-success' : 'bg-white/30'
                          }`}>
                            {isMet && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className={`text-xs transition-colors ${
                            isMet ? 'text-success' : 'text-white/70'
                          }`}>
                            {req.label}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Password Match Indicator */}
              {confirmPassword && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`flex items-center gap-2 text-xs ${
                    newPassword === confirmPassword ? 'text-success' : 'text-danger'
                  }`}
                >
                  {newPassword === confirmPassword ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{t('passwordsMatch') || 'Passwords match'}</span>
                    </>
                  ) : (
                    <span>{t('passwordsDoNotMatch') || 'Passwords do not match'}</span>
                  )}
                </motion.div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              onClick={handleChangePassword}
              disabled={!canSubmit || isLoading}
              className="w-full h-12 rounded-xl shadow-lg hover:shadow-xl transition-all"
              style={{
                backgroundColor: canSubmit ? '#22C55E' : '#9CA3AF',
                color: 'white',
              }}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                />
              ) : (
                t('changePassword') || 'Change Password'
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
