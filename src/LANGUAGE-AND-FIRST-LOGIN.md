# Language Settings & First Login Flow

## Overview
This document describes the implementation of multi-language support (Italian/English) and the first-time login security setup flow in CasaZero.

## Language Settings

### Features
- **Dual Language Support**: Italian (IT) and English (EN)
- **Default Language**: Italian (IT)
- **Persistent Across App**: Language selection applies to all screens and components
- **Easy Toggle**: Language switcher available on login screen and profile settings

### Implementation Details

#### Language Context (`/utils/LanguageContext.tsx`)
- Centralized translation management using React Context
- Comprehensive translation keys covering all app screens:
  - Authentication & Security
  - Navigation & Common UI
  - Home, Documents, Maintenance screens
  - Profile, Analytics, User Management screens
  - Status messages and time-related text
  - First-login setup flow

#### Language Selector Locations
1. **Login Screen**: Top-right floating button with IT/EN toggle
2. **Profile Screen**: Integrated language selector in Preferences section

#### Usage in Components
```tsx
import { useLanguage } from '../../utils/LanguageContext';

function MyComponent() {
  const { language, setLanguage, t } = useLanguage();
  
  return (
    <div>
      <h1>{t('welcomeBack')}</h1>
      <button onClick={() => setLanguage('it')}>Italiano</button>
      <button onClick={() => setLanguage('en')}>English</button>
    </div>
  );
}
```

## First Login Security Flow

### Features
1. **Automatic Detection**: System detects first-time login
2. **Forced Password Change**: Users must change their initial password
3. **2FA Option**: Optional two-factor authentication setup
4. **Password Requirements**:
   - Minimum 8 characters
   - At least one uppercase letter
   - At least one lowercase letter
   - At least one number
   - At least one special character
5. **Real-time Validation**: Visual feedback on password requirements
6. **Skip Option**: Users can skip 2FA setup (password change is mandatory)

### User Flow

#### Step 1: Password Change (Mandatory)
1. User enters current password
2. User creates new password
3. User confirms new password
4. Real-time validation shows which requirements are met
5. System validates all requirements before proceeding

#### Step 2: 2FA Setup (Optional)
1. User can enable/disable 2FA
2. If enabled:
   - QR code is displayed for authenticator app
   - User scans QR code with authenticator app (Google Authenticator, Authy, etc.)
   - User enters 6-digit verification code
   - System validates code
3. If disabled:
   - User can skip and proceed to app
   - "Skip for now" button available

### Implementation Details

#### First Login Detection
- Uses localStorage to track setup completion
- Key format: `casazero_setup_{userEmail}`
- Checked on each login attempt

#### Component Structure
```
App.tsx
├── AuthScreen (Login)
├── FirstLoginSetupScreen (Setup Flow)
│   ├── Password Change Step
│   └── 2FA Setup Step
└── Main App (After completion)
```

#### State Management in App.tsx
```tsx
const [isFirstLogin, setIsFirstLogin] = useState(false);
const [setupComplete, setSetupComplete] = useState(false);
const [userEmail, setUserEmail] = useState('');
```

### Security Features
1. **Password Visibility Toggle**: Eye icon to show/hide passwords
2. **Visual Password Strength**: Color-coded requirement indicators
3. **Progress Tracking**: Progress bar showing setup completion
4. **Smooth Animations**: Professional transitions between steps
5. **Form Validation**: Client-side validation prevents invalid submissions

### Demo Mode
For testing purposes, a "Reset First Login (Demo)" button is available in the Profile screen that:
- Clears all localStorage data
- Reloads the application
- Triggers the first-login flow again

## Removed Features
- **Google Sign-In**: Removed as requested
- The OR divider and Google button have been eliminated from the login screen

## Translation Coverage

### Fully Translated Screens
✅ AuthScreen (Login)
✅ FirstLoginSetupScreen
✅ BottomNav (Navigation)
✅ ProfileScreen (partial - key elements)
✅ HomeScreen (partial - key elements)
✅ DocumentsScreen (partial - key elements)

### Screens Needing Translation Extension
The following screens have the language context integrated but need comprehensive translation of all text elements:
- MaintenanceScreen
- AIScreen
- TicketsScreen
- ChatScreen
- NotificationsScreen
- AnalyticsScreen
- UserManagementScreen
- BuildingManagementScreen

## Future Enhancements

### Language Settings
- Add more languages (German, French, Spanish)
- Auto-detect browser language
- Persistent language preference per user in database

### First Login Flow
- Backend integration for password validation
- Email verification step
- SMS-based 2FA option
- Biometric authentication setup
- Security questions setup
- Password history tracking
- Password expiry policies

## Testing

### Test First Login Flow
1. Clear localStorage or click "Reset First Login (Demo)"
2. Log in with any credentials
3. Complete password change with valid password
4. Enable/disable 2FA as desired
5. Verify access to main application

### Test Language Switching
1. Change language on login screen
2. Verify all text updates immediately
3. Log in and navigate to Profile
4. Change language in Profile settings
5. Verify all UI text updates across the app

## Notes
- All translations are client-side for demo purposes
- In production, translations should be managed server-side or via a CMS
- localStorage is used for demo; production should use secure backend storage
- 2FA QR codes should be generated server-side with proper encryption
- Verification codes should be validated server-side
