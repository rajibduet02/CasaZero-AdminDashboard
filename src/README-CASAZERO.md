# CasaZero - Smart Home Ecosystem Mobile App

A comprehensive mobile application for managing smart home residences with role-based access for Residents, Condominium Administrators, and Super Admins.

## 📱 App Overview

CasaZero is a mobile-first smart home management platform designed for iOS and Android. It provides residents with tools to manage documents, maintenance tasks, support tickets, and communication, while enabling administrators to oversee multiple properties efficiently.

## 🎨 Design System

### Brand Colors
- **Primary Sage**: `#6B8E62` (sage-600), `#89A87C` (sage-500), `#C6D7C1` (sage-300)
- **Accent**: `#4CD964` (lime-500)
- **Neutrals**: `#2B2B2B` (ink-900), `#4A4A4A` (ink-700), `#6F6F6F` (ink-500), `#E6E6E6` (line-200)
- **Surfaces**: `#FFFFFF` (white), `#FAFAF7` (warm-50)
- **Semantic**: Success `#2FB476`, Warning `#FFB020`, Danger `#E25555`, Info `#3B82F6`

### Typography
- **Headings**: Inter/SF Pro (Semibold)
- **Body**: Inter (Regular)
- **Labels/Numbers**: Inter (Medium)

### Component Style
- Rounded corners: 12-16px border radius (rounded-xl)
- Soft shadows with Material 3 influence
- Bottom navigation: Icon-only with sage green glow on active state
- Mobile-optimized at 390×844px base

## 👥 User Roles

### 1. Client/Resident
- Login with admin-provided credentials
- 2FA via email OTP or Google OAuth
- View residence-specific content only
- Receive push notifications
- Open support tickets
- Join condominium group chat

### 2. Condominium Administrator
- Manage specific residences
- Upload/update documents
- Manage maintenance tasks
- Send announcements
- Chat with residents

### 3. Owner/Super Admin (Furlan)
- Global access across all properties
- Manage users, admins, and residences
- View global statistics
- Override settings and permissions

## 🏗️ App Structure

### Navigation
Bottom navigation with 5 tabs (icon-only):
1. **Home** - Dashboard and updates
2. **Documents** - Digital document center
3. **CasaZero AI** - Intelligent assistant (cube icon)
4. **Maintenance** - Task management
5. **Profile** - User settings

### Screen Flows

#### 0. Authentication
- **Login Flow**: Role selection → Email/Password → 2FA (OTP or Google OAuth)
- **Forgot Password**: Email entry → confirmation
- **Change Credentials**: Current password → new credentials → success
- **States**: Wrong credentials, locked account, expired OTP, offline

#### 1. Home Screen
Two variants based on property status:

**a. Completed Property**
- Hero image header with residence photo
- Welcome card with personalized greeting
- Quick access tiles: Documents, Maintenance, Chat, Tickets
- Priority feed with N2 maintenance reminders, admin updates, new documents

**b. Under Construction**
- Amazon-style progress timeline:
  - Plate Foundation → Building Structure → Facades → Interior Finishes → Final Delivery
- Milestone dates and descriptions
- Construction document access
- What's new banner for app updates

#### 2. Documents Screen
- **Categories** (with counters):
  - Ownership & Legal
  - Technical Building
  - Energy & Environmental
  - Compliance & Safety
  - Administrative & Maintenance
- **Document Card** displays: Title, type (PDF/DWG), date, tags, size, status
- **Actions**: View, Download, Share, Ask CasaZero AI
- **Features**: Filter, search, category tabs
- **States**: Empty, error, offline

#### 3. Maintenance Management

**Priority System**:

**N1 - Optional (Recommendations)**
- Resident actions: Read, Ignore, Ask AI
- Auto-dismisses after 48 hours with visible timer
- Appears in "CasaZero recommends" feed
- Admin/Super Admin: Full edit access, no validation

**N2 - Mandatory (Safety/Compliance)**
- Resident actions: Mark Complete, Open Ticket, Contact Supplier, Ask AI
- Push notifications if not completed
- Reminder every 14 days when overdue
- Admin/Super Admin: Validate completion, attach reports, adjust dates

**N3 - Administrator-Driven**
- Resident: View-only status, Ask AI
- Admin actions: Take Charge, In Progress, Complete, Attach Files, Reschedule
- Admin receives notification at due date
- Super Admin: Full access including history and contact management

**Maintenance Card Components**:
- Title, category, description
- Priority badge (N1/N2/N3)
- Status (Pending/Overdue/In Progress/Completed)
- Frequency and due dates
- Attachments (reports, photos, invoices)
- Contacts (customized per residence, managed by Super Admin)
- Role-specific action buttons

**Filters**: All, N1, N2, N3, Pending, Overdue, In Progress, Completed

#### 4. Notifications (FCM)
- **Grouped by type**: Documents, Maintenance, Chat, Tickets
- **Actions**: Open related screen, mark read, delete
- **Settings**: Per-category notification toggles
- **Badge counters** on app bar

#### 5. Support Tickets
- **Create Ticket**: 
  - Category selector (Plumbing, Electrical, HVAC, Building, Appliances, Safety)
  - Description with rich text
  - Photo attachments
  - Optional urgency level
- **Ticket List**: Filter by Open, In Progress, Resolved
- **Ticket Detail**:
  - Timeline (Created → Admin Assigned → Technician Note → Resolved)
  - Attachments and photos
  - Internal notes (admin preview)
  - Chat-like updates
- **Actions**: Add note/photo, close ticket, reopen

#### 6. Condominium Group Chat
- **Channel Features**:
  - Admin announcements (highlighted banner style)
  - Resident replies
  - Photo and document attachments
  - Typing indicators
  - Delivered/read receipts
- **Chat Details**: Participant list, mute channel, report message
- Real-time messaging interface

#### 7. CasaZero AI Assistant
- **Contextual Help**:
  - Document explanations
  - Maintenance task guidance
  - Energy report analysis
  - Ticket suggestions
- **Suggested Prompts** for common questions
- **Disclaimer**: AI responses for guidance only
- **Offline Fallback**: Graceful degradation
- Chat-style interface with message history

#### 8. Profile Screen
- **Personal Info**: Name, email, phone, residence details
- **Account Security**:
  - Change password
  - Two-factor authentication status
  - Trusted devices management
- **Notification Preferences**: Per-category toggles
- **App Settings**: Language, privacy policy
- **Role Badge**: Displays current role with visual distinction
- **Sign Out**: Confirmation dialog

## 🎯 Component Library

### Custom Components (`/components/casazero/`)

1. **BottomNav** - 5-icon navigation with active state glow
2. **AppBar** - Top bar with variants (default, branded, minimal)
3. **StatusBadge** - Priority (N1/N2/N3) and status indicators
4. **MaintenanceCard** - Dynamic card with role-aware actions
5. **DocumentCard** - File preview with metadata and actions
6. **ProgressTimeline** - Construction milestone tracker
7. **EmptyState** - Reusable empty/error/offline states
8. **LoadingState** - Skeleton loaders
9. **RoleBadge** - User role indicator

### ShadCN Components Used
- Accordion, Alert Dialog, Alert, Avatar, Badge, Button
- Calendar, Card, Carousel, Checkbox, Dialog, Drawer
- Dropdown Menu, Form, Input, Label, Select, Sheet
- Skeleton, Switch, Tabs, Textarea, Toast/Sonner, Tooltip

## 🔄 State Management

### Application States
- **Authentication**: isAuthenticated, role, currentUser
- **Navigation**: currentScreen, previousScreen
- **Notifications**: unreadCount, notificationsList
- **Residence**: currentResidence, residenceStatus

### Loading States
All screens include:
- Initial load skeleton
- Pull-to-refresh
- Error boundaries
- Offline detection

### Error States
- Network errors
- Authentication errors
- Permission errors
- Empty states with helpful messaging

## 📊 Data Points (API Integration Ready)

### User Profile
```typescript
{
  id, firstName, lastName, email, phone,
  role, residenceId, memberSince, avatar
}
```

### Maintenance Task
```typescript
{
  id, title, category, description,
  priority: 'N1' | 'N2' | 'N3',
  status: 'pending' | 'overdue' | 'in-progress' | 'completed',
  frequency, nextDue, lastCompleted,
  attachments[], contacts[], history[]
}
```

### Document
```typescript
{
  id, title, type, category, date, size,
  tags[], status, url, relatedMaintenanceTasks[]
}
```

### Support Ticket
```typescript
{
  id, title, category, description,
  status: 'open' | 'in-progress' | 'resolved',
  priority, created, updated,
  attachments[], timeline[], assignedTo
}
```

### Chat Message
```typescript
{
  id, sender, senderRole, content, timestamp,
  type: 'message' | 'announcement',
  attachment?, read, delivered
}
```

## 🎨 Accessibility Features

- Minimum 16px body text
- 44px touch targets
- WCAG AA+ contrast ratios
- Dark mode support (auto-switching with tokens)
- Screen reader compatible
- Keyboard navigation support

## 🚀 Features Highlights

### Smart Maintenance System
- Three-tier priority system (N1/N2/N3)
- Role-aware actions and permissions
- Auto-dismiss for optional tasks
- Recurring reminders for mandatory tasks
- Contact management per residence

### AI Integration
- Context-aware assistance
- Document analysis
- Maintenance recommendations
- Natural language queries
- Suggested prompts for common tasks

### Real-time Communication
- Group chat per condominium
- Admin announcements
- Typing indicators
- Read receipts
- File sharing

### Document Management
- Multi-category organization
- Version control ready
- Quick actions (view, download, share)
- AI-powered explanations
- Search and filter

## 🔐 Security Features

- Admin-provided credentials (no self-signup)
- Two-factor authentication (Email OTP or Google OAuth)
- Trusted device management
- Role-based access control
- Secure credential changes in-app

## 📱 Platform Considerations

### iOS
- Safe area support for notch/island
- SF Pro font integration
- Native share sheet integration

### Android
- Material Design 3 influence
- Adaptive icons
- Bottom sheet behaviors

### Responsive Design
- Base: 390×844px
- Supports smaller and taller screens
- Max-width constraints for larger devices
- Flexible layouts with proper constraints

## 🎯 Next Steps / Future Enhancements

1. **Backend Integration**: Connect to Supabase or custom API
2. **Push Notifications**: Implement FCM for real-time alerts
3. **Offline Support**: Local storage and sync
4. **Multi-language**: i18n implementation
5. **Advanced Analytics**: Usage tracking and insights
6. **Calendar Integration**: Maintenance scheduling
7. **Payment Gateway**: For condominium fees
8. **Energy Monitoring**: Real-time consumption data
9. **Smart Home Integration**: IoT device controls
10. **Biometric Auth**: Face ID / Fingerprint

## 🏗️ Development Notes

### File Structure
```
/App.tsx                    - Main app component
/components/
  /casazero/                - Custom components
    BottomNav.tsx
    AppBar.tsx
    StatusBadge.tsx
    MaintenanceCard.tsx
    DocumentCard.tsx
    ProgressTimeline.tsx
    EmptyState.tsx
    LoadingState.tsx
    RoleBadge.tsx
  /screens/                 - Screen components
    AuthScreen.tsx
    HomeScreen.tsx
    DocumentsScreen.tsx
    MaintenanceScreen.tsx
    AIScreen.tsx
    TicketsScreen.tsx
    ChatScreen.tsx
    ProfileScreen.tsx
    NotificationsScreen.tsx
  /ui/                      - ShadCN components
/styles/
  globals.css               - Design tokens and base styles
```

### Design Tokens
All colors, spacing, and typography are defined as CSS variables in `globals.css` for easy theming and dark mode support.

---

**Version**: 1.0.0  
**Last Updated**: November 3, 2025  
**Platform**: React + Tailwind CSS  
**Target**: iOS & Android Mobile
