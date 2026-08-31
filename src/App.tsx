import React, { lazy, Suspense, useState, useCallback, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AuthScreen } from './components/screens/AuthScreen';
import { Toaster } from './components/ui/sonner';
import { getPermissions } from './utils/permissions';
import { LanguageProvider } from './utils/LanguageContext';
import { clearSession, getSessionToken, getSessionUser, normalizeRole, setSession } from './utils/session';
import {
  handleAuthenticationFailure,
  isHandlingAuthenticationFailure,
  onAuthenticationFailure,
  resetAuthenticationFailureGate,
} from './utils/authFailure';
import { validateStoredSession } from './utils/api';
import { logoutFirebase, restoreFirebaseSessionFromUser } from './firebase/firebaseAuth';
import { motion } from 'motion/react';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import {
  PATH_LOGIN,
  PATH_SETUP,
  PATH_DASHBOARD,
  PATH_HOME,
  isAdminPath,
  saveAdminReturnTo,
  clearAdminReturnTo,
  locationHref,
} from './utils/adminRoutes';

const AdminApp = lazy(() =>
  import('./components/admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);
const FirstLoginSetupScreen = lazy(() =>
  import('./components/screens/FirstLoginSetupScreen').then((m) => ({ default: m.FirstLoginSetupScreen })),
);
const ChangePasswordScreen = lazy(() =>
  import('./components/screens/ChangePasswordScreen').then((m) => ({ default: m.ChangePasswordScreen })),
);
const HomeScreen = lazy(() =>
  import('./components/screens/HomeScreen').then((m) => ({ default: m.HomeScreen })),
);
const DocumentsScreen = lazy(() =>
  import('./components/screens/DocumentsScreen').then((m) => ({ default: m.DocumentsScreen })),
);
const MaintenanceScreen = lazy(() =>
  import('./components/screens/MaintenanceScreen').then((m) => ({ default: m.MaintenanceScreen })),
);
const AIScreen = lazy(() =>
  import('./components/screens/AIScreen').then((m) => ({ default: m.AIScreen })),
);
const TicketsScreen = lazy(() =>
  import('./components/screens/TicketsScreen').then((m) => ({ default: m.TicketsScreen })),
);
const ChatScreen = lazy(() =>
  import('./components/screens/ChatScreen').then((m) => ({ default: m.ChatScreen })),
);
const SmartHomeScreen = lazy(() =>
  import('./components/screens/SmartHomeScreen').then((m) => ({ default: m.SmartHomeScreen })),
);
const ProfileScreen = lazy(() =>
  import('./components/screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
);
const NotificationsScreen = lazy(() =>
  import('./components/screens/NotificationsScreen').then((m) => ({ default: m.NotificationsScreen })),
);
const AnalyticsScreen = lazy(() =>
  import('./components/screens/AnalyticsScreen').then((m) => ({ default: m.AnalyticsScreen })),
);
const UserManagementScreen = lazy(() =>
  import('./components/screens/UserManagementScreen').then((m) => ({ default: m.UserManagementScreen })),
);
const BuildingManagementScreen = lazy(() =>
  import('./components/screens/BuildingManagementScreen').then((m) => ({ default: m.BuildingManagementScreen })),
);
const HubScreen = lazy(() =>
  import('./components/screens/HubScreen').then((m) => ({ default: m.HubScreen })),
);
const AppBar = lazy(() =>
  import('./components/casazero/AppBar').then((m) => ({ default: m.AppBar })),
);
const BottomNav = lazy(() =>
  import('./components/casazero/BottomNav').then((m) => ({ default: m.BottomNav })),
);
const NavigationIndicator = lazy(() =>
  import('./components/casazero/NavigationIndicator').then((m) => ({ default: m.NavigationIndicator })),
);
const BuildingSelector = lazy(() =>
  import('./components/casazero/BuildingSelector').then((m) => ({ default: m.BuildingSelector })),
);
const DemoControls = lazy(() =>
  import('./components/casazero/DemoControls').then((m) => ({ default: m.DemoControls })),
);

function RouteChunkFallback() {
  return (
    <div className="flex min-h-[40vh] w-full items-center justify-center">
      <Loader2 className="h-12 w-12 animate-spin text-[#6A8F7B]" />
    </div>
  );
}

/** Session restore/validation lifecycle for protected UI. */
type AuthStatus = 'checking' | 'authenticated' | 'unauthenticated';

type Screen = 'home' | 'documents' | 'maintenance' | 'ai' | 'hub' | 'aichat' | 'tickets' | 'chat' | 'smarthome' | 'profile' | 'notifications' | 'analytics' | 'users' | 'buildings' | 'change-password';
type Role = 'client' | 'admin';

/** Web login may return `admin`, `superadmin`, `super_admin`, etc. — all open the same admin dashboard. */
function isAdminDashboardRole(raw: string | undefined | null): boolean {
  return normalizeRole(raw) === 'admin' || normalizeRole(raw) === 'super_admin';
}

function appRoleFromLoginApi(raw: string): Role {
  return isAdminDashboardRole(raw) ? 'admin' : 'client';
}

function readStoredSession(): { token: string | null; user: any | null } {
  if (typeof window === 'undefined') return { token: null, user: null };
  const token = getSessionToken();
  const user = getSessionUser();
  if (!token || !user) return { token: null, user: null };
  return { token, user };
}

function getInitialAuthState() {
  const { token, user } = readStoredSession();
  if (!token || !user) {
    return {
      authStatus: 'unauthenticated' as AuthStatus,
      isAuthenticated: false,
      isFirstLogin: false,
      userData: null as any,
      userEmail: '',
      userName: 'Marco Rossi',
      isAdminPanel: false,
      authToken: '',
    };
  }
  const email = String(user.email || '');
  const needsPasswordChange =
    user.is_password_set_by_admin === 'true' || user.is_password_set_by_admin === true;
  const setupDone = email.length > 0 && localStorage.getItem(`casazero_setup_${email}`) === 'true';
  const firstLogin = !!(needsPasswordChange && !setupDone);
  // Token presence alone is not proof of a valid session — start in `checking`
  // and confirm with the API before rendering protected dashboard UI.
  return {
    authStatus: 'checking' as AuthStatus,
    isAuthenticated: false,
    isFirstLogin: firstLogin,
    userData: user,
    userEmail: email || 'demo@casazero.com',
    userName: String(user.user_name || 'Marco Rossi'),
    isAdminPanel: false,
    authToken: token,
  };
}

function resolveAuthHref(info: {
  authStatus: AuthStatus;
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  setupComplete: boolean;
  isAdminPanel: boolean;
  pathname: string;
}): string | null {
  // Keep the current URL while validating a stored token (avoids /login flash).
  if (info.authStatus === 'checking') return null;
  if (info.isFirstLogin && !info.setupComplete) return PATH_SETUP;
  if (info.authStatus !== 'authenticated' || !info.isAuthenticated) return PATH_LOGIN;
  if (info.isAdminPanel) {
    if (isAdminPath(info.pathname)) return null;
    return PATH_DASHBOARD;
  }
  return PATH_HOME;
}

const initAuth = getInitialAuthState();

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [authStatus, setAuthStatus] = useState<AuthStatus>(initAuth.authStatus);
  const [isAuthenticated, setIsAuthenticated] = useState(initAuth.isAuthenticated);
  const [isFirstLogin, setIsFirstLogin] = useState(initAuth.isFirstLogin);
  const [setupComplete, setSetupComplete] = useState(false);
  const [userEmail, setUserEmail] = useState(initAuth.userEmail);
  const [userName, setUserName] = useState(initAuth.userName);
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [role, setRole] = useState<Role>(() =>
    initAuth.userData?.role ? appRoleFromLoginApi(String(initAuth.userData.role)) : 'client',
  );
  const [currentResidence, setCurrentResidence] = useState('Building A, Unit 4B');
  const [notificationCount] = useState(3);
  const [authToken, setAuthToken] = useState(initAuth.authToken);
  const [userData, setUserData] = useState<any>(initAuth.userData);

  // Admin panel state
  const [isAdminPanel, setIsAdminPanel] = useState(initAuth.isAdminPanel);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Building management state
  const [currentBuilding, setCurrentBuilding] = useState({
    id: '1',
    name: 'Residenza Verde Building A',
    address: 'Via Giuseppe Verdi 42, 20121 Milano MI',
    units: 24,
    residents: 42,
  });

  const [buildings] = useState([
    {
      id: '1',
      name: 'Residenza Verde Building A',
      address: 'Via Giuseppe Verdi 42, 20121 Milano MI',
      units: 24,
      residents: 42,
    },
    {
      id: '2',
      name: 'Residenza Verde Building B',
      address: 'Via Giuseppe Verdi 44, 20121 Milano MI',
      units: 32,
      residents: 0,
    },
  ]);

  // Navigation history management
  const [history, setHistory] = useState<Screen[]>(['home']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const isNavigatingRef = useRef(false);
  const [navigationDirection, setNavigationDirection] = useState<'back' | 'forward' | null>(null);

  // Demo: For testing different property states
  const [residenceStatus, setResidenceStatus] = useState<'completed' | 'under-construction'>('completed');

  const applyAuthenticatedSession = useCallback(
    (selectedRole: string, user: any | null, token: string, firstLogin: boolean) => {
      setRole(appRoleFromLoginApi(selectedRole));
      if (user) {
        setUserData(user);
        setUserName(user.user_name || 'Marco Rossi');
        setUserEmail(String(user.email || 'demo@casazero.com'));
      }
      setAuthToken(token);
      setIsFirstLogin(firstLogin);

      if (firstLogin) {
        setAuthStatus('authenticated');
        setIsAuthenticated(false);
        setIsAdminPanel(false);
        return;
      }

      setAuthStatus('authenticated');
      setIsAuthenticated(true);
      if (isAdminDashboardRole(selectedRole)) {
        setIsAdminPanel(true);
      } else {
        setIsAdminPanel(false);
      }
    },
    [],
  );

  const handleLogin = (selectedRole: string, email?: string, user?: any, token?: string) => {
    // Isolate old session state before hydrating a new authenticated session.
    clearSession();
    resetAuthenticationFailureGate();

    if (user && token) {
      setSession({ token, user });
    }

    setUserEmail(email || 'demo@casazero.com');

    const firstLogin = !!(user && user.is_password_set_by_admin === 'true');
    applyAuthenticatedSession(selectedRole, user ?? null, token || '', firstLogin);

    // Reset history on login
    setHistory(['home']);
    setHistoryIndex(0);
  };

  const handleSetupComplete = () => {
    // Mark setup as complete
    localStorage.setItem(`casazero_setup_${userEmail}`, 'true');
    setIsFirstLogin(false);
    setSetupComplete(true);
    setAuthStatus('authenticated');
    setIsAuthenticated(true);
    resetAuthenticationFailureGate();

    // Role-based redirect: admin & super-admin variants -> same admin dashboard; others -> mobile app
    if (isAdminDashboardRole(role)) {
      setIsAdminPanel(true);
    } else {
      setIsAdminPanel(false);
    }
  };

  const handleLogout = useCallback(() => {
    void logoutFirebase();

    clearAdminReturnTo();

    setAuthStatus('unauthenticated');
    setIsAuthenticated(false);
    setIsFirstLogin(false);
    setSetupComplete(false);
    setCurrentScreen('home');
    setIsAdminPanel(false);
    setAuthToken('');
    setUserData(null);

    clearSession();

    setHistory(['home']);
    setHistoryIndex(0);
    navigate(PATH_LOGIN, { replace: true });
  }, [navigate]);

  // Global API 401 → single logout/redirect (see apiFetch + authFailure.ts).
  useEffect(() => {
    return onAuthenticationFailure(() => {
      handleLogout();
    });
  }, [handleLogout]);

  // On boot/refresh: validate stored token with the backend before showing protected UI.
  useEffect(() => {
    if (authStatus !== 'checking') return;

    let cancelled = false;

    (async () => {
      const { token, user } = readStoredSession();
      if (!token || !user) {
        if (!cancelled) {
          handleAuthenticationFailure({ reason: 'missing_session' });
          setAuthStatus('unauthenticated');
          setIsAuthenticated(false);
        }
        return;
      }

      const result = await validateStoredSession();
      if (cancelled) return;

      if (!result.ok) {
        // validateStoredSession already triggers handleAuthenticationFailure on 401 via apiFetch.
        if (result.reason === 'missing_session') {
          handleAuthenticationFailure({ reason: 'missing_session' });
        } else if (result.reason !== 'unauthorized') {
          handleAuthenticationFailure({ reason: 'session_validation_failed' });
        }
        setAuthStatus('unauthenticated');
        setIsAuthenticated(false);
        setIsAdminPanel(false);
        setAuthToken('');
        setUserData(null);
        return;
      }

      const email = String(user.email || '');
      const needsPasswordChange =
        user.is_password_set_by_admin === 'true' || user.is_password_set_by_admin === true;
      const setupDone = email.length > 0 && localStorage.getItem(`casazero_setup_${email}`) === 'true';
      const firstLogin = !!(needsPasswordChange && !setupDone);

      applyAuthenticatedSession(String(user.role || 'client'), user, token, firstLogin);

      // Restore Firebase only after Laravel session is confirmed valid.
      const firebaseToken = (user as Record<string, unknown>)?.firebase_token;
      if (typeof firebaseToken === 'string' && firebaseToken.trim()) {
        restoreFirebaseSessionFromUser(user as Record<string, unknown>)
          .then(() => {
            if (!cancelled && import.meta.env.DEV) {
              console.log('✅ [FIREBASE AUTH] Session restored on app load');
            }
          })
          .catch((err) => {
            if (!cancelled && import.meta.env.DEV) {
              console.error('❌ [FIREBASE AUTH] Session restore failed:', err);
            }
          });
      } else if (import.meta.env.DEV) {
        console.warn('⚠️ [FIREBASE AUTH] No firebase_token in stored session — chat requires re-login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authStatus, applyAuthenticatedSession]);

  // While logged in, re-check api_token (DB revoke / rotate). Many list APIs do not
  // validate the token, so dashboard UI can otherwise stay open until refresh.
  useEffect(() => {
    if (authStatus !== 'authenticated' || !isAuthenticated) return;

    let cancelled = false;

    const revalidate = () => {
      if (isHandlingAuthenticationFailure()) return;
      void validateStoredSession().then((result) => {
        if (cancelled) return;
        if (!result.ok && result.reason === 'unauthorized') {
          // apiFetch already invoked handleAuthenticationFailure → handleLogout.
        }
      });
    };

    const onFocus = () => revalidate();
    window.addEventListener('focus', onFocus);
    const intervalId = window.setInterval(revalidate, 30_000);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
      window.clearInterval(intervalId);
    };
  }, [authStatus, isAuthenticated]);

  // Navigate to a new screen and update history
  const handleNavigate = useCallback((screen: string) => {
    if (isNavigatingRef.current) return; // Prevent navigation loops
    
    const newScreen = screen as Screen;
    
    // Don't add duplicate consecutive screens
    if (newScreen === currentScreen) return;

    setCurrentScreen(newScreen);
    
    setHistory(prev => {
      // If we're not at the end of history, remove everything after current position
      const newHistory = prev.slice(0, historyIndex + 1);
      // Add new screen to history
      return [...newHistory, newScreen];
    });
    
    setHistoryIndex(prev => prev + 1);
  }, [currentScreen, historyIndex]);

  // Navigate back in history
  const handleBack = useCallback(() => {
    if (historyIndex > 0) {
      isNavigatingRef.current = true;
      setNavigationDirection('back');
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setCurrentScreen(history[newIndex]);
      
      // Reset the flag and direction after navigation
      setTimeout(() => {
        isNavigatingRef.current = false;
        setNavigationDirection(null);
      }, 800);
    }
  }, [history, historyIndex]);

  // Navigate forward in history
  const handleForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isNavigatingRef.current = true;
      setNavigationDirection('forward');
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setCurrentScreen(history[newIndex]);
      
      // Reset the flag and direction after navigation
      setTimeout(() => {
        isNavigatingRef.current = false;
        setNavigationDirection(null);
      }, 800);
    }
  }, [history, historyIndex]);

  const handleNotifications = () => {
    handleNavigate('notifications');
  };

  // Handle role change from Demo Controls
  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    
    // Redirect to admin dashboard if switching to admin role
    if (newRole === 'admin') {
      setIsAdminPanel(true);
    } else {
      // Switch back to mobile app if changing to client role
      setIsAdminPanel(false);
    }
  };

  // Check if back/forward navigation is available
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;

  // Keyboard shortcuts for navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Left Arrow or Cmd/Ctrl + [
      if ((e.altKey && e.key === 'ArrowLeft') || ((e.metaKey || e.ctrlKey) && e.key === '[')) {
        e.preventDefault();
        if (canGoBack) handleBack();
      }
      // Alt + Right Arrow or Cmd/Ctrl + ]
      if ((e.altKey && e.key === 'ArrowRight') || ((e.metaKey || e.ctrlKey) && e.key === ']')) {
        e.preventDefault();
        if (canGoForward) handleForward();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canGoBack, canGoForward, handleBack, handleForward]);

  // Swipe gestures for mobile navigation
  React.useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      touchEndY = e.changedTouches[0].screenY;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Only trigger swipe if horizontal movement is greater than vertical
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0 && canGoBack) {
          // Swipe right - go back
          handleBack();
        } else if (deltaX < 0 && canGoForward) {
          // Swipe left - go forward
          handleForward();
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canGoBack, canGoForward, handleBack, handleForward]);

  // Keep auth URLs in sync without collapsing valid /dashboard/* deep links to /dashboard.
  React.useEffect(() => {
    const nextHref = resolveAuthHref({
      authStatus,
      isAuthenticated,
      isFirstLogin,
      setupComplete,
      isAdminPanel,
      pathname: location.pathname,
    });
    if (nextHref == null) return;

    if (
      (nextHref === PATH_LOGIN || nextHref === PATH_SETUP) &&
      isAdminPath(location.pathname)
    ) {
      saveAdminReturnTo(location.pathname, location.search);
    }

    let dest = nextHref;
    if (nextHref === PATH_DASHBOARD && isAdminPanel && !isAdminPath(location.pathname)) {
      dest = PATH_DASHBOARD;
    }

    if (locationHref(location.pathname, location.search) !== dest) {
      navigate(dest, { replace: true });
    }
  }, [
    authStatus,
    isAuthenticated,
    isFirstLogin,
    setupComplete,
    isAdminPanel,
    location.pathname,
    location.search,
    navigate,
  ]);

  // After session invalidation, Back must not restore a zombie authenticated dashboard.
  React.useEffect(() => {
    if (authStatus === 'checking') return;
    if (isHandlingAuthenticationFailure()) {
      if (isAdminPath(location.pathname) && location.pathname !== PATH_LOGIN) {
        navigate(PATH_LOGIN, { replace: true });
      }
      return;
    }
    const { token, user } = readStoredSession();
    const hasSession = !!(token && user) && authStatus === 'authenticated' && isAuthenticated;
    if (hasSession || !isAdminPath(location.pathname)) return;

    saveAdminReturnTo(location.pathname, location.search);
    if (location.pathname !== PATH_LOGIN) {
      navigate(PATH_LOGIN, { replace: true });
    }
    if (authStatus !== 'unauthenticated' || isAuthenticated) {
      handleLogout();
    }
  }, [authStatus, isAuthenticated, handleLogout, location.pathname, location.search, navigate]);

  // Do not flash protected UI while the stored token is being validated.
  if (authStatus === 'checking') {
    return (
      <LanguageProvider>
        <div className="min-h-screen flex items-center justify-center bg-surface-warm-50">
          <div className="text-sm text-gray-600" role="status" aria-live="polite">
            Verifying session…
          </div>
        </div>
      </LanguageProvider>
    );
  }

  // Show first login setup if user hasn't completed it
  if (isFirstLogin && !setupComplete) {
    return (
      <LanguageProvider>
        <Suspense fallback={<RouteChunkFallback />}>
          <FirstLoginSetupScreen 
            onComplete={handleSetupComplete}
            userEmail={userEmail}
          />
        </Suspense>
      </LanguageProvider>
    );
  }

  if (authStatus !== 'authenticated' || !isAuthenticated) {
    return (
      <LanguageProvider>
        <AuthScreen onLogin={handleLogin} />
      </LanguageProvider>
    );
  }

  const getScreenTitle = () => {
    switch (currentScreen) {
      case 'home':
        return null; // Uses residence switcher
      case 'documents':
        return 'Documents';
      case 'maintenance':
        return 'Maintenance';
      case 'ai':
        return 'CasaZero AI';
      case 'hub':
        return 'Ecosystem Hub';
      case 'aichat':
        return 'CasaZero AI';
      case 'tickets':
        return 'Support Tickets';
      case 'chat':
        return 'Group Chat';
      case 'smarthome':
        return 'Smart Home';
      case 'profile':
        return 'Profile';
      case 'notifications':
        return 'Notifications';
      case 'analytics':
        return 'Analytics';
      case 'users':
        return 'User Management';
      case 'buildings':
        return 'Building Management';
      case 'change-password':
        return null; // No app bar for change password screen
      default:
        return '';
    }
  };

  // Get permissions for current role
  const permissions = getPermissions(role);

  const showResidenceSwitcher = currentScreen === 'home';
  const showSearch = currentScreen === 'documents' || currentScreen === 'maintenance';

  // If admin panel is active, render AdminApp
  if (isAdminPanel) {
    return (
      <LanguageProvider>
        <div className="h-screen max-h-screen overflow-hidden">
          <Suspense fallback={<RouteChunkFallback />}>
            <AdminApp onLogout={handleLogout} userData={userData} />
          </Suspense>
        </div>

        <Toaster />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <Suspense fallback={<RouteChunkFallback />}>
      <div className="min-h-screen bg-surface-warm-50 w-full max-w-full overflow-x-hidden">
        {/* Navigation Direction Indicator */}
        <NavigationIndicator direction={navigationDirection} />
      
      {/* App Bar - Hidden on Change Password screen */}
      {currentScreen !== 'change-password' && (
        <AppBar
          title={getScreenTitle() || undefined}
          variant={currentScreen === 'home' ? 'branded' : 'default'}
          showResidenceSwitcher={showResidenceSwitcher}
          currentResidence={currentResidence}
          onResidenceSwitch={() => console.log('Switch residence')}
          showSearch={showSearch && currentScreen !== 'ai' && currentScreen !== 'chat' && currentScreen !== 'notifications'}
          onSearch={() => console.log('Search')}
          showNotifications={currentScreen !== 'ai' && currentScreen !== 'chat' && currentScreen !== 'notifications'}
          notificationCount={notificationCount}
          onNotifications={handleNotifications}
          canGoBack={canGoBack}
          onBack={handleBack}
          canGoForward={canGoForward}
          onForward={handleForward}
        />
      )}

      {/* Building Selector - Show on relevant screens for admins */}
      {role === 'admin' && 
       (currentScreen === 'home' || currentScreen === 'documents' || currentScreen === 'maintenance' || 
        currentScreen === 'tickets' || currentScreen === 'analytics' || currentScreen === 'users' || 
        currentScreen === 'buildings') && (
        <BuildingSelector
          role={role}
          currentBuilding={currentBuilding}
          buildings={role === 'admin' ? buildings : undefined}
          onBuildingChange={(buildingId) => {
            const building = buildings.find(b => b.id === buildingId);
            if (building) setCurrentBuilding(building);
          }}
        />
      )}

      {/* Main Content */}
      <main className="relative w-full max-w-full overflow-x-hidden">
        {currentScreen === 'home' && (
          <HomeScreen
            role={role}
            firstName="Marco"
            fullName={userName}
            residenceStatus={residenceStatus}
            onNavigate={handleNavigate}
          />
        )}

        {currentScreen === 'documents' && (
          <DocumentsScreen role={role} onAskAI={() => handleNavigate('ai')} />
        )}

        {currentScreen === 'maintenance' && (
          <MaintenanceScreen
            role={role}
            onAskAI={() => handleNavigate('ai')}
          />
        )}

        {currentScreen === 'ai' && <AIScreen />}

        {currentScreen === 'hub' && (
          <HubScreen role={role} onNavigate={handleNavigate} />
        )}

        {currentScreen === 'aichat' && <AIScreen />}

        {currentScreen === 'tickets' && <TicketsScreen role={role} />}

        {currentScreen === 'chat' && <ChatScreen role={role} />}

        {currentScreen === 'smarthome' && <SmartHomeScreen role={role} />}

        {currentScreen === 'profile' && (
          <ProfileScreen role={role} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}

        {currentScreen === 'notifications' && (
          <NotificationsScreen onNavigate={handleNavigate} />
        )}

        {currentScreen === 'analytics' && permissions.canAccessAnalytics && (
          <AnalyticsScreen role={role} />
        )}

        {currentScreen === 'users' && permissions.canViewUserList && (
          <UserManagementScreen role={role} />
        )}

        {currentScreen === 'buildings' && permissions.canManageBuildings && (
          <BuildingManagementScreen role={role} />
        )}

        {currentScreen === 'change-password' && (
          <ChangePasswordScreen 
            onBack={() => handleNavigate('profile')}
            onSuccess={() => handleNavigate('profile')}
          />
        )}
      </main>

      {/* Bottom Navigation - Hidden on Notifications and Change Password screens */}
      {currentScreen !== 'notifications' && currentScreen !== 'change-password' && (
        <BottomNav
          activeTab={currentScreen}
          role={role}
          onTabChange={(tab) => handleNavigate(tab)}
        />
      )}

      {/* Toast Notifications */}
      <Toaster />

      {/* Demo Controls - Only visible when authenticated */}
      {import.meta.env.DEV && (
        <DemoControls
          currentRole={role}
          onRoleChange={handleRoleChange}
          residenceStatus={residenceStatus}
          onResidenceStatusChange={setResidenceStatus}
        />
      )}

      {/* Admin Panel Toggle Button - Only for admins */}
      {role === 'admin' && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsAdminPanel(true)}
          className="fixed bottom-6 right-6 z-40 p-4 rounded-full bg-gradient-to-r from-[#6A8F7B] to-[#5a7a68] text-white shadow-2xl hover:shadow-xl transition-all duration-300"
          title="Open Admin Panel"
        >
          <LayoutDashboard className="w-6 h-6" />
        </motion.button>
      )}
      </div>
      </Suspense>
    </LanguageProvider>
  );
}