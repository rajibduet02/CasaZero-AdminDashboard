import React, { useState, useCallback, useRef, useEffect } from 'react';
import { AppBar } from './components/casazero/AppBar';
import { BottomNav } from './components/casazero/BottomNav';
import { NavigationIndicator } from './components/casazero/NavigationIndicator';
import { AuthScreen } from './components/screens/AuthScreen';
import { FirstLoginSetupScreen } from './components/screens/FirstLoginSetupScreen';
import { ChangePasswordScreen } from './components/screens/ChangePasswordScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { DocumentsScreen } from './components/screens/DocumentsScreen';
import { MaintenanceScreen } from './components/screens/MaintenanceScreen';
import { AIScreen } from './components/screens/AIScreen';
import { TicketsScreen } from './components/screens/TicketsScreen';
import { ChatScreen } from './components/screens/ChatScreen';
import { SmartHomeScreen } from './components/screens/SmartHomeScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { AnalyticsScreen } from './components/screens/AnalyticsScreen';
import { UserManagementScreen } from './components/screens/UserManagementScreen';
import { BuildingManagementScreen } from './components/screens/BuildingManagementScreen';
import { HubScreen } from './components/screens/HubScreen';
import { BuildingSelector } from './components/casazero/BuildingSelector';
import { DemoControls } from './components/casazero/DemoControls';
import { AdminApp } from './components/admin/AdminApp';
import { Toaster } from './components/ui/sonner';
import { getPermissions } from './utils/permissions';
import { LanguageProvider } from './utils/LanguageContext';
import { clearSession, getSessionToken, getSessionUser, normalizeRole, setSession } from './utils/session';
import { logoutFirebase, restoreFirebaseSessionFromUser } from './firebase/firebaseAuth';
import { motion } from 'motion/react';
import { LayoutDashboard } from 'lucide-react';

type Screen = 'home' | 'documents' | 'maintenance' | 'ai' | 'hub' | 'aichat' | 'tickets' | 'chat' | 'smarthome' | 'profile' | 'notifications' | 'analytics' | 'users' | 'buildings' | 'change-password';
type Role = 'client' | 'admin';
type AdminPage = 'dashboard' | 'users' | 'buildings' | 'documents' | 'maintenance' | 'analytics' | 'notifications' | 'settings';

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
  return {
    isAuthenticated: !firstLogin,
    isFirstLogin: firstLogin,
    userData: user,
    userEmail: email || 'demo@casazero.com',
    userName: String(user.user_name || 'Marco Rossi'),
    isAdminPanel: !firstLogin && isAdminDashboardRole(user.role),
    authToken: token,
  };
}

/** Public URL paths so opening the site (or bookmarking) matches login → dashboard flow. */
const PATH_LOGIN = '/login';
const PATH_SETUP = '/account-setup';
const PATH_DASHBOARD = '/dashboard';
const PATH_HOME = '/';

function resolveAuthUrl(info: {
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  setupComplete: boolean;
  isAdminPanel: boolean;
}): string {
  if (info.isFirstLogin && !info.setupComplete) return PATH_SETUP;
  if (!info.isAuthenticated) return PATH_LOGIN;
  return info.isAdminPanel ? PATH_DASHBOARD : PATH_HOME;
}

function replaceUrlToMatchAuth(info: {
  isAuthenticated: boolean;
  isFirstLogin: boolean;
  setupComplete: boolean;
  isAdminPanel: boolean;
}) {
  if (typeof window === 'undefined') return;
  const base = import.meta.env.BASE_URL || '/';
  const rel = resolveAuthUrl(info);
  const nextPath =
    base === '/' || base === ''
      ? rel
      : `${String(base).replace(/\/$/, '')}${rel === PATH_HOME ? '' : rel}`;
  if (window.location.pathname !== nextPath) {
    window.history.replaceState(null, '', nextPath);
  }
}

const initAuth = getInitialAuthState();

export default function App() {
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

  // Restore Firebase custom token session after page refresh (Laravel session already in localStorage)
  useEffect(() => {
    if (!initAuth.isAuthenticated || !initAuth.userData) return;

    const user = initAuth.userData as Record<string, unknown>;
    const firebaseToken = user?.firebase_token;
    if (typeof firebaseToken !== 'string' || !firebaseToken.trim()) {
      console.warn('⚠️ [FIREBASE AUTH] No firebase_token in stored session — chat requires re-login');
      return;
    }

    let cancelled = false;
    restoreFirebaseSessionFromUser(user)
      .then(() => {
        if (!cancelled) console.log('✅ [FIREBASE AUTH] Session restored on app load');
      })
      .catch((err) => {
        if (!cancelled) console.error('❌ [FIREBASE AUTH] Session restore failed:', err);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Admin panel state
  const [isAdminPanel, setIsAdminPanel] = useState(initAuth.isAdminPanel);
  const [adminPage, setAdminPage] = useState<AdminPage>('dashboard');
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

  const handleLogin = (selectedRole: string, email?: string, user?: any, token?: string) => {
    // Isolate old session state before hydrating a new authenticated session.
    clearSession();
    if (user && token) {
      setSession({ token, user });
    }

    setRole(appRoleFromLoginApi(selectedRole));
    setUserEmail(email || 'demo@casazero.com');
    
    // Store user data and token if provided
    if (user) {
      setUserData(user);
      setUserName(user.user_name || 'Marco Rossi');
    }
    if (token) {
      setAuthToken(token);
    }
    
    // Check if it's first login - check if password was set by admin
    if (user && user.is_password_set_by_admin === 'true') {
      setIsFirstLogin(true);
    } else {
      setIsAuthenticated(true);
      
      // Role-based redirect: admin & super-admin variants -> same admin dashboard; others -> mobile app
      if (isAdminDashboardRole(selectedRole)) {
        setIsAdminPanel(true);
        setAdminPage('dashboard');
      } else {
        setIsAdminPanel(false);
      }
    }
    
    // Reset history on login
    setHistory(['home']);
    setHistoryIndex(0);
  };

  const handleSetupComplete = () => {
    // Mark setup as complete
    localStorage.setItem(`casazero_setup_${userEmail}`, 'true');
    setIsFirstLogin(false);
    setSetupComplete(true);
    setIsAuthenticated(true);
    
    // Role-based redirect: admin & super-admin variants -> same admin dashboard; others -> mobile app
    if (isAdminDashboardRole(role)) {
      setIsAdminPanel(true);
      setAdminPage('dashboard');
    } else {
      setIsAdminPanel(false);
    }
  };

  const handleLogout = () => {
    void logoutFirebase();

    setIsAuthenticated(false);
    setIsFirstLogin(false);
    setSetupComplete(false);
    setCurrentScreen('home');
    setIsAdminPanel(false);
    setAdminPage('dashboard');
    setAuthToken('');
    setUserData(null);

    clearSession();

    setHistory(['home']);
    setHistoryIndex(0);
  };

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
      setAdminPage('dashboard');
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

  // Keep the browser URL aligned with auth: /login → (after login) /dashboard for admin, / for client app.
  React.useEffect(() => {
    replaceUrlToMatchAuth({
      isAuthenticated,
      isFirstLogin,
      setupComplete,
      isAdminPanel,
    });
  }, [isAuthenticated, isFirstLogin, setupComplete, isAdminPanel]);

  // If the user uses Back/Forward, correct obvious mismatches (e.g. /login while still logged in as admin).
  React.useEffect(() => {
    const onPopState = () => {
      const { token, user } = readStoredSession();
      const hasSession = !!(token && user);
      const path = window.location.pathname;
      const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
      const rel = base && path.startsWith(base) ? path.slice(base.length) || '/' : path;

      if (hasSession && isAdminDashboardRole(user?.role) && (rel === PATH_LOGIN || rel === PATH_SETUP)) {
        const dash = base ? `${base}${PATH_DASHBOARD.replace(/^\//, '')}` : PATH_DASHBOARD;
        window.history.replaceState(null, '', dash);
        return;
      }
      if (!hasSession && rel === PATH_DASHBOARD) {
        const login = base ? `${base}${PATH_LOGIN.replace(/^\//, '')}` : PATH_LOGIN;
        window.history.replaceState(null, '', login);
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Show first login setup if user hasn't completed it
  if (isFirstLogin && !setupComplete) {
    return (
      <LanguageProvider>
        <FirstLoginSetupScreen 
          onComplete={handleSetupComplete}
          userEmail={userEmail}
        />
      </LanguageProvider>
    );
  }

  if (!isAuthenticated) {
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
          <AdminApp onLogout={handleLogout} userData={userData} />
        </div>

        <Toaster />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
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
    </LanguageProvider>
  );
}