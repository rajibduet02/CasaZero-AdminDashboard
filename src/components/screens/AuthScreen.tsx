import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Languages, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useLanguage } from '../../utils/LanguageContext';
import { API_BASE } from '../../utils/api';
import { ForgotPasswordPanel } from '../auth/forgot-password';
import { setSession } from '../../utils/session';
import { loginWithFirebaseToken } from '../../firebase/firebaseAuth';
import casazeroLogo from 'figma:asset/f1971ba654cdd5f64a8a1c117d59b8bac1719bb4.png';
import buildingBg from 'figma:asset/af8ff57797d14df91ef70730582bc16d71c05087.png';

interface AuthScreenProps {
  onLogin: (role: string, email?: string, userData?: any, token?: string) => void;
}

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const isDev = import.meta.env.DEV;
  const debugLog = (...args: unknown[]) => {
    if (isDev) console.log(...args);
  };
  const debugError = (...args: unknown[]) => {
    if (isDev) console.error(...args);
  };
  const [email, setEmail] = useState('rajibduet02@gmail.com');
  //const [email, setEmail] = useState('sajid@gmail.com');
  const [password, setPassword] = useState('CasaZero@024017');
  //const [password, setPassword] = useState('12345678');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [forgotOpen, setForgotOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  // Validate email format
  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Clear error when user types
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: undefined }));
    }
  };

  const handleLogin = async () => {
    // Reset errors
    setErrors({});

    // Validate inputs
    const newErrors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      newErrors.email = t('emailRequired') || 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = t('emailInvalid') || 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = t('passwordRequired') || 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = t('passwordTooShort') || 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error(t('validationError') || 'Validation Error', {
        description: t('pleaseFillAllFields') || 'Please fill in all fields correctly',
      });
      return;
    }

    setLoading(true);

    // ====== DEBUG: Login Request Started ======
    debugLog('🔐 [LOGIN] Request initiated at:', new Date().toISOString());
    
    const apiUrl = `${API_BASE}/user/web_login`;
    const requestBody = {
      email,
      password,
    };
    
    debugLog('🌐 [LOGIN] API URL:', apiUrl);

    try {
      debugLog('⏳ [LOGIN] Sending POST request...');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // ====== DEBUG: Response Received ======
      debugLog('📥 [LOGIN] Response received at:', new Date().toISOString());
      debugLog('📊 [LOGIN] HTTP Status:', response.status, response.statusText);

      // Handle HTTP errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        debugError('❌ [LOGIN] Request failed with status:', response.status);
        debugError('💥 [LOGIN] Error response data:', errorData);
        
        // Specific error messages based on status codes
        if (response.status === 401) {
          debugError('🚫 [LOGIN] Authentication failed - Invalid credentials');
          toast.error(t('authenticationFailed') || 'Authentication Failed', {
            description: errorData.message || t('invalidCredentials') || 'Invalid email or password. Please check your credentials.',
          });
          return;
        } else if (response.status === 403) {
          debugError('⛔ [LOGIN] Access denied - Account inactive');
          toast.error(t('accessDenied') || 'Access Denied', {
            description: errorData.message || t('accountInactive') || 'Your account is inactive. Please contact support.',
          });
          return;
        } else if (response.status === 429) {
          debugError('⚠️ [LOGIN] Too many login attempts');
          toast.error(t('tooManyAttempts') || 'Too Many Attempts', {
            description: t('tryAgainLater') || 'Too many login attempts. Please try again later.',
          });
          return;
        } else if (response.status >= 500) {
          debugError('🔥 [LOGIN] Server error - Status:', response.status);
          toast.error(t('serverError') || 'Server Error', {
            description: t('serverUnavailable') || 'Server is currently unavailable. Please try again later.',
          });
          return;
        } else {
          debugError('⁉️ [LOGIN] Unexpected error - Status:', response.status);
          toast.error(t('loginFailed') || 'Login Failed', {
            description: errorData.message || t('unexpectedError') || 'An unexpected error occurred. Please try again.',
          });
          return;
        }
      }

      const data = await response.json();
      
      // ====== DEBUG: Success Response Data ======
      debugLog('✅ [LOGIN] Response parsed successfully');

      // Check if login was successful (new API structure)
      if (data.success && data.user && data.user.api_token) {
        debugLog('🎯 [LOGIN] Login validation passed');

        if (!data.user.firebase_token) {
          debugError('❌ [LOGIN] Missing firebase_token in login response');
          toast.error(t('loginFailed') || 'Login Failed', {
            description:
              'Firebase authentication token missing. Chat and realtime features require firebase_token from the server.',
          });
          return;
        }

        try {
          console.log('🔥 [LOGIN] Starting Firebase custom token sign-in...');
          await loginWithFirebaseToken(data.user.firebase_token);
          console.log('✅ [LOGIN] Firebase authentication complete');
        } catch (firebaseErr: unknown) {
          const msg =
            firebaseErr instanceof Error ? firebaseErr.message : 'Firebase sign-in failed';
          debugError('❌ [LOGIN] Firebase auth failed:', firebaseErr);
          toast.error('Firebase authentication failed', {
            description: msg,
          });
          return;
        }

        setSession({ token: data.user.api_token, user: data.user });

        toast.success(t('welcomeBack') || 'Welcome Back!', {
          description: data.message || `${t('loginSuccessful') || 'Login successful'}, ${data.user.email}`,
        });

        debugLog('🚀 [LOGIN] Redirecting to dashboard...');

        setTimeout(() => {
          onLogin(data.user.role, data.user.email, data.user, data.user.api_token);
        }, 300);
      } else {
        debugError('❌ [LOGIN] Login validation failed - Missing required fields');
        debugError('🔍 [LOGIN] Response validation:', {
          hasSuccess: !!data.success,
          hasUser: !!data.user,
          hasApiToken: !!data.user?.api_token,
          hasFirebaseToken: !!data.user?.firebase_token,
        });
        
        // Generic failure message
        toast.error(t('loginFailed') || 'Login Failed', {
          description: data.message || t('invalidCredentials') || 'Invalid email or password. Please try again.',
        });
      }
    } catch (error) {
      debugError('💥 [LOGIN] Exception caught:', error);
      
      // Network or connection errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        debugError('🌐 [LOGIN] Network/Connection error detected');
        toast.error(t('connectionError') || 'Connection Error', {
          description: t('checkInternet') || 'Unable to connect to server. Please check your internet connection.',
        });
      } else {
        debugError('⚡ [LOGIN] Unexpected error occurred');
        toast.error(t('loginFailed') || 'Login Failed', {
          description: t('networkError') || 'An unexpected error occurred. Please try again.',
        });
      }
    } finally {
      debugLog('🏁 [LOGIN] Request completed at:', new Date().toISOString());
      setLoading(false);
    }
  };

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

      {/* Language Selector - Top Right */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="absolute top-6 right-6 z-20"
      >
        <div className="flex items-center gap-1 bg-white/20 backdrop-blur-md rounded-full px-3 py-2 border border-white/30 shadow-lg">
          <Languages className="w-4 h-4 text-white" />
          <button
            onClick={() => setLanguage('it')}
            className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${
              language === 'it'
                ? 'bg-white/90 text-[#6A8F7B]'
                : 'text-white hover:bg-white/20'
            }`}
          >
            IT
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 rounded-full text-xs transition-all duration-300 ${
              language === 'en'
                ? 'bg-white/90 text-[#6A8F7B]'
                : 'text-white hover:bg-white/20'
            }`}
          >
            EN
          </button>
        </div>
      </motion.div>
      
      {/* Login Container */}
      <div className="w-full max-w-md relative z-10 px-6">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full"
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

          {forgotOpen ? (
            <ForgotPasswordPanel
              initialEmail={email}
              onClose={() => setForgotOpen(false)}
            />
          ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="backdrop-blur-xl bg-white/10 rounded-3xl p-8 border border-white/20 shadow-2xl"
          >
            <div className="space-y-5">
              {/* Email Field */}
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-white/90 text-sm"
                >
                  {t('email')}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('emailPlaceholder')}
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className="bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 placeholder:text-neutral-ink-400 rounded-xl h-12 px-4 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label 
                  htmlFor="password" 
                  className="text-white/90 text-sm"
                >
                  {t('password')}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                    className="bg-white/90 backdrop-blur-sm border-white/40 text-neutral-ink-900 rounded-xl h-12 px-4 pr-12 focus:bg-white focus:border-[#6A8F7B] focus:ring-2 focus:ring-[#6A8F7B]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-ink-500 hover:text-[#6A8F7B] transition-colors duration-200"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.password}
                  </p>
                )}
              </div>

              {/* Forgot Password Link */}
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setForgotOpen(true)}
                  className="text-xs text-white/80 hover:text-white transition-colors duration-200 underline underline-offset-2"
                >
                  {t('forgotPassword')}
                </button>
              </div>

              {/* Sign In Button */}
              <Button 
                onClick={handleLogin}
                disabled={loading}
                className="w-full bg-[#6A8F7B] hover:bg-[#5a7a68] text-white rounded-xl h-12 shadow-lg hover:shadow-xl transition-all duration-300 mt-2"
                size="lg"
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </div>
                ) : (
                  t('signIn')
                )}
              </Button>

              {/* Demo Mode Indicator */}
              <div className="relative mt-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/20"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-transparent text-white/60 text-xs">
                    {t('demoMode')}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
          )}

          {/* Copyright */}
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="text-center text-xs text-white/60 mt-8 drop-shadow-lg"
          >
            {t('copyright')}
          </motion.p>
        </motion.div>
      </div>

    </div>
  );
}