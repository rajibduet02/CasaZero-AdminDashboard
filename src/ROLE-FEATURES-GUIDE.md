# CasaZero Role Features Quick Reference

## Overview
This guide explains the specific features available to each role in the CasaZero mobile app.

---

## 🏠 Client/Resident Role

### Authentication & Security
- ✅ Login with credentials provided by administrator (no self-signup)
- ✅ Two-factor authentication via:
  - Email OTP (6-digit code)
  - Google OAuth
- ✅ Change password within the app (Profile → Account & Security)
- ✅ Trusted device management

### Data Access
- ✅ **Residence-Only View**: Can only view content for their own residence
- ✅ Personal documents
- ✅ Own maintenance tasks (N1/N2)
- ✅ Own support tickets
- ❌ Cannot see other residents' data

### Push Notifications (FCM)
- ✅ Enable/disable push notifications
- ✅ Receive notifications for:
  - New documents uploaded
  - Maintenance task reminders (especially N2 mandatory tasks)
  - Support ticket updates
  - Group chat messages
  - Building announcements from administrators
- ✅ Granular notification preferences by category

### Core Features
- ✅ View and download documents (read-only)
- ✅ Create and view support tickets
- ✅ Participate in condominium group chat
- ✅ Access CasaZero AI assistant
- ✅ Manage own maintenance tasks
- ✅ Receive building announcements

### Restrictions
- ❌ Cannot upload or delete documents
- ❌ Cannot create N3 (admin-driven) maintenance tasks
- ❌ Cannot send announcements
- ❌ Cannot moderate chat
- ❌ Cannot access analytics
- ❌ Cannot manage users

---

## 🏢 Condominium Administrator Role

### Building Scope
- ✅ **Building-Wide Access**: Access all data for their managed building
- ✅ Building selector shows current building with stats
- ✅ View all residents in their building
- ❌ Cannot switch to other buildings (manages only one)

### Authentication
- ✅ Same 2FA options as residents
- ✅ Enhanced security features
- ✅ Admin badge on all screens

### Document Management
- ✅ **Upload Documents**: Add new documents for residents
- ✅ **Update Documents**: Modify existing documents
- ✅ **Delete Documents**: Remove outdated documents
- ✅ **Share Documents**: Send documents to specific residents
- ✅ Mobile read-only indicator for system documents

### Maintenance Management
- ✅ **View All Tasks**: See maintenance for entire building
- ✅ **Update Tasks**: Change status, dates, and attachments
- ✅ **Create N3 Tasks**: Administrator-driven maintenance
- ✅ **Assign Tasks**: Delegate tasks to specific residents
- ✅ Admin flow preview and task management

### Support Tickets
- ✅ **View All Tickets**: See tickets from all building residents
- ✅ **Assign Tickets**: Delegate to technicians or staff
- ✅ **Resolve Tickets**: Mark tickets as resolved
- ✅ Ticket analytics and metrics

### Communication
- ✅ **Send Announcements**: 
  - Create titled announcements with rich content
  - Target all residents or specific groups
  - Set priority (normal/urgent)
  - Toggle push notifications
  - Announcements appear in chat and feed
- ✅ **Moderate Chat**: 
  - Monitor group conversations
  - Manage channels
  - Clear chat history if needed
- ✅ Chat with all residents in the condominium

### User Management
- ✅ **Invite Residents**: Send email invitations with credentials
- ✅ **View User List**: See all residents in their building
- ✅ **Assign Units**: Designate residence units during invitation
- ❌ Cannot remove residents (must escalate to super-admin)
- ❌ Cannot create other administrators

### Analytics
- ✅ Access building analytics dashboard
- ✅ View maintenance metrics
- ✅ Ticket statistics
- ✅ Document access logs

---

## 👑 Owner/Super Admin (Furlan Costruzioni) Role

### Global Access
- ✅ **All-Buildings View**: Highest access across entire portfolio
- ✅ **Building Switcher**: Dropdown to switch between buildings
- ✅ **Global Scope**: See data across all buildings simultaneously
- ✅ Super-admin badge and indicators on all screens

### Mobile Preview Mode
- ℹ️ **Read-Only Indicators**: Global status badges
- ℹ️ **Preview States**: Building management previews
- ℹ️ **Desktop Notice**: "Full features available on desktop dashboard"
- ℹ️ Mobile shows placeholders for complex operations

### Building Management
- ✅ **View All Buildings**: Complete portfolio overview
- ✅ **Building Stats**:
  - Total units vs occupied units
  - Resident counts
  - Administrator assignments
  - Construction status
- ✅ **Configuration Preview** (Read-only on mobile):
  - Building name and address
  - Feature toggles (chat, tickets, maintenance)
  - System settings preview
- ✅ **Portfolio Dashboard**:
  - Total units across all buildings
  - Total residents
  - Building count
- ✅ **Construction Monitoring**:
  - Track buildings under construction
  - Expected completion dates
  - Progress indicators

### User Management (Full Access)
- ✅ **Create Administrators**: Invite and manage building admins
- ✅ **Create Residents**: Invite residents to any building
- ✅ **Remove Users**: Full user removal capability
- ✅ **Manage Admins**: Assign admin roles, edit permissions
- ✅ **Global User List**: See all users across all buildings
- ✅ **Cross-Building Operations**: Manage users in any building

### All Administrator Features
- ✅ All document management capabilities (global)
- ✅ All maintenance management (across buildings)
- ✅ All support ticket management (all buildings)
- ✅ All communication features (global announcements)
- ✅ All analytics (cross-building insights)

### Future Desktop Features
Preview placeholders on mobile, full access on desktop:
- 🔜 HVAC system controls
- 🔜 Access system management
- 🔜 Utility monitoring and controls
- 🔜 Advanced building automation
- 🔜 Cross-building analytics and reports
- 🔜 Bulk operations
- 🔜 System-wide configuration

---

## 🎯 Feature Comparison Matrix

| Feature | Resident | Admin | Super Admin |
|---------|----------|-------|-------------|
| **Authentication** |
| Login with credentials | ✅ | ✅ | ✅ |
| 2FA (Email OTP) | ✅ | ✅ | ✅ |
| 2FA (Google OAuth) | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ |
| **Data Access** |
| Own residence only | ✅ | ❌ | ❌ |
| Building-wide | ❌ | ✅ | ✅ |
| All buildings | ❌ | ❌ | ✅ |
| Building switcher | ❌ | ❌ | ✅ |
| **Documents** |
| View/Download | ✅ | ✅ | ✅ |
| Upload | ❌ | ✅ | ✅ |
| Delete | ❌ | ✅ | ✅ |
| Share | ❌ | ✅ | ✅ |
| **Maintenance** |
| View own tasks | ✅ | ✅ | ✅ |
| View all tasks | ❌ | ✅ (building) | ✅ (all) |
| Create N3 tasks | ❌ | ✅ | ✅ |
| Assign tasks | ❌ | ✅ | ✅ |
| **Support Tickets** |
| Create tickets | ✅ | ✅ | ✅ |
| View own tickets | ✅ | ✅ | ✅ |
| View all tickets | ❌ | ✅ (building) | ✅ (all) |
| Assign tickets | ❌ | ✅ | ✅ |
| Resolve tickets | ❌ | ✅ | ✅ |
| **Communication** |
| Group chat | ✅ | ✅ | ✅ |
| Send announcements | ❌ | ✅ | ✅ |
| Moderate chat | ❌ | ✅ | ✅ |
| Manage channels | ❌ | ✅ | ✅ |
| **User Management** |
| Invite residents | ❌ | ✅ | ✅ |
| Remove residents | ❌ | ❌ | ✅ |
| Create admins | ❌ | ❌ | ✅ |
| Manage admins | ❌ | ❌ | ✅ |
| View user list | ❌ | ✅ (building) | ✅ (all) |
| **Building Management** |
| View buildings | ❌ | Own only | ✅ All |
| Manage buildings | ❌ | ❌ | ✅ |
| Switch buildings | ❌ | ❌ | ✅ |
| Configure buildings | ❌ | ❌ | ✅ (desktop) |
| **Notifications** |
| Receive FCM push | ✅ | ✅ | ✅ |
| Manage preferences | ✅ | ✅ | ✅ |
| **Analytics** |
| Access analytics | ❌ | ✅ (building) | ✅ (global) |

---

## 📱 Navigation Paths

### Resident
- **Home** → Quick tiles (Documents, Maintenance, Chat, Tickets)
- **Profile** → Change Password, Push Notifications, Notification Preferences
- **Documents** → View, Download, Ask AI
- **Tickets** → Create, View Own

### Administrator  
- **Home** → Quick tiles + Analytics + Residents
- **Profile** → Admin Settings → User Management
- **Chat** → Send Announcement button
- **Documents** → Upload, Share, Delete
- **Tickets** → View All, Assign, Resolve
- **Users** → Invite Residents, View List

### Super Admin
- **Home** → Quick tiles + Analytics + Residents + Buildings
- **Profile** → Admin Settings → User Management, Building Management
- **Buildings** → View All, Configure (preview), Portfolio Overview
- **Users** → Full Management (create admins, remove users)
- **Building Selector** (top bar) → Switch between buildings

---

## 🔔 Push Notification Setup (FCM)

### For All Roles
1. Go to **Profile**
2. Scroll to **Push Notification Settings** card
3. Click **Enable Push Notifications**
4. Grant browser/device permission
5. Device registers with Firebase Cloud Messaging
6. Configure preferences below (Documents, Maintenance, Chat, Tickets)

### Notification Types
- **Documents**: New uploads, updates
- **Maintenance**: Task reminders (especially N2 mandatory)
- **Chat**: New messages, announcements
- **Tickets**: Status updates, assignments, resolutions
- **Announcements**: Building-wide or urgent notices

---

## 🎨 Visual Indicators

### Role Badges
- **Resident**: Blue badge (`bg-info`)
- **Administrator**: Sage green badge (`bg-brand-sage-600`)
- **Super Admin**: Dark badge (`bg-neutral-ink-900`)

### Scope Indicators
- **Admin (Building)**: Sage green alert "Admin View: Viewing data for your building"
- **Super Admin (Global)**: Dark alert "Super Admin: Global view across all buildings"
- **Super Admin (Building)**: Dark alert "Super Admin: Viewing single building (can switch)"

### Building Selector
- **Resident**: Simple building name
- **Admin**: Building name with stats (locked to one building)
- **Super Admin**: Dropdown selector with all buildings

---

## 🔒 Security & Permissions

### Permission Enforcement
All features check permissions before rendering:
```typescript
if (!permissions.canUploadDocuments) {
  // Hide upload button
}
```

### Data Isolation
- Residents: `canViewOnlyOwnResidence` - strict data isolation
- Admins: `canViewBuildingScope` - building-wide access
- Super-admins: `canViewGlobalScope` - cross-building access

### Role Assignment
- Residents: Assigned by administrator during invitation
- Administrators: Created by super-admin only
- Super-admins: System-level role (Furlan Costruzioni staff)

---

## 🚀 Getting Started

### For Residents
1. Receive invitation email from administrator
2. Click link and set up account
3. Complete 2FA setup (email or Google)
4. Enable push notifications in profile
5. Access documents, maintenance, and support

### For Administrators
1. Receive super-admin invitation
2. Login and access admin features
3. Invite residents to your building
4. Upload documents and create maintenance tasks
5. Send announcements and manage tickets

### For Super-Admins
1. System-level access provided
2. Access building management
3. Create administrators for each building
4. Monitor portfolio-wide metrics
5. Use desktop for advanced features

---

## 📞 Support

For role-specific questions or permission issues, contact:
- **Residents**: Your building administrator
- **Administrators**: Furlan Costruzioni support
- **System Issues**: CasaZero technical support

---

**Last Updated**: November 2025  
**Version**: 1.0.0 with Role Enhancements
