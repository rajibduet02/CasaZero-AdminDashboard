# CasaZero Role-Based Permissions System

## Overview
CasaZero implements a comprehensive Role-Based Access Control (RBAC) system with three distinct user roles, each with specific capabilities and restrictions.

## User Roles

### 1. Resident/Client (`client`)
**Purpose**: End users who own or rent properties in the buildings managed by the system.

**Key Capabilities**:
- ✅ View personal documents
- ✅ Manage own maintenance tasks (N1/N2)
- ✅ Create and view own support tickets
- ✅ Participate in group chat
- ✅ Access CasaZero AI assistant
- ✅ View notifications
- ✅ Edit own profile

**Restrictions**:
- ❌ Cannot upload or delete documents
- ❌ Cannot create N3 (administrator-driven) tasks
- ❌ Cannot assign maintenance tasks
- ❌ Cannot view other residents' tickets
- ❌ Cannot access analytics
- ❌ Cannot moderate chat or manage channels
- ❌ Cannot manage users or buildings

### 2. Condominium Administrator (`admin`)
**Purpose**: Building managers who oversee a single condominium building and its residents.

**Key Capabilities**:
- ✅ All Resident capabilities, plus:
- ✅ **Documents**: Upload, delete, and share documents
- ✅ **Maintenance**: Create N3 tasks, assign tasks to residents, view all tasks in their building
- ✅ **Support Tickets**: View all tickets, assign tickets to technicians, resolve tickets
- ✅ **Chat**: Moderate messages, manage channels, send announcements
- ✅ **Users**: Invite new residents, view user list
- ✅ **Analytics**: Access building analytics dashboard
- ✅ **Announcements**: Create and delete building-wide announcements

**Restrictions**:
- ❌ Cannot switch between buildings (manages only one)
- ❌ Cannot remove residents (escalate to super-admin)
- ❌ Cannot manage other administrators
- ❌ Cannot manage building configurations
- ❌ Cannot view analytics across multiple buildings

### 3. Owner/Super Admin (`super-admin`)
**Purpose**: Furlan Costruzioni staff with full system access across all buildings.

**Key Capabilities**:
- ✅ All Administrator capabilities, plus:
- ✅ **Building Management**: Switch between buildings, manage building configurations
- ✅ **User Management**: Remove residents, create/manage administrators
- ✅ **System Configuration**: Full system settings access
- ✅ **Cross-Building Analytics**: View metrics across entire portfolio
- ✅ **Global Administration**: Highest level of control

**Full Access To**:
- All documents across all buildings
- All maintenance tasks across all buildings
- All support tickets across all buildings
- All users and administrators
- System-wide configurations

## Permission Matrix

| Feature | Resident | Admin | Super Admin |
|---------|----------|-------|-------------|
| **Navigation & Screens** |
| Home | ✅ | ✅ | ✅ |
| Documents | ✅ | ✅ | ✅ |
| Maintenance | ✅ | ✅ | ✅ |
| AI Assistant | ✅ | ✅ | ✅ |
| Support Tickets | ✅ | ✅ | ✅ |
| Group Chat | ✅ | ✅ | ✅ |
| Profile | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ✅ |
| Analytics | ❌ | ✅ | ✅ |
| User Management | ❌ | ❌ | ✅ |
| Building Management | ❌ | ❌ | ✅ |
| **Documents** |
| View Documents | ✅ | ✅ | ✅ |
| Upload Documents | ❌ | ✅ | ✅ |
| Delete Documents | ❌ | ✅ | ✅ |
| Share Documents | ❌ | ✅ | ✅ |
| **Maintenance** |
| View Maintenance | ✅ | ✅ (all) | ✅ (all) |
| Manage Own Tasks | ✅ | ✅ | ✅ |
| Create N3 Tasks | ❌ | ✅ | ✅ |
| Assign Maintenance | ❌ | ✅ | ✅ |
| **Support Tickets** |
| Create Tickets | ✅ | ✅ | ✅ |
| View Own Tickets | ✅ | ✅ | ✅ |
| View All Tickets | ❌ | ✅ (building) | ✅ (all) |
| Assign Tickets | ❌ | ✅ | ✅ |
| Resolve Tickets | ❌ | ✅ | ✅ |
| **Chat** |
| Participate in Chat | ✅ | ✅ | ✅ |
| Moderate Chat | ❌ | ✅ | ✅ |
| Manage Channels | ❌ | ✅ | ✅ |
| Send Announcements | ❌ | ✅ | ✅ |
| **User Management** |
| Invite Residents | ❌ | ✅ | ✅ |
| Remove Residents | ❌ | ❌ | ✅ |
| Manage Admins | ❌ | ❌ | ✅ |
| View User List | ❌ | ✅ | ✅ |
| **Building Management** |
| Switch Buildings | ❌ | ❌ | ✅ |
| Manage Buildings | ❌ | ❌ | ✅ |
| View All Buildings | ❌ | ❌ | ✅ |

## UI Implementation

### Bottom Navigation
The bottom navigation bar dynamically adjusts based on user role:

**Resident**: Home | Documents | AI | Tasks | Profile  
**Admin**: Home | Documents | AI | Tasks | Analytics | Profile  
**Super Admin**: Home | Documents | AI | Tasks | Analytics | Profile

### Home Screen Quick Actions
Quick action tiles are shown/hidden based on permissions:
- All roles see Documents, Maintenance, Chat, Tickets tiles
- Admins additionally see Analytics tile
- Super Admins additionally see Residents/User Management tile

### Document Screen
- Residents: View and download only
- Admins/Super Admins: Upload button visible, Share and Delete actions available

### Support Tickets Screen
- Residents: See only their own tickets, create ticket button visible
- Admins: See all tickets in their building, can assign and resolve
- Super Admins: See all tickets across all buildings, full management

### Chat Screen
- Residents: Standard chat features, report message option
- Admins/Super Admins: Additional moderation menu with "Send Announcement" and "Clear Chat History"

### Profile Screen
- All roles: Standard profile editing and settings
- Admins/Super Admins: Additional "Admin Settings" card with Building Management, User Management, and System Configuration options

## Visual Indicators

### Role Badges
- Resident: Blue (`bg-info`)
- Administrator: Sage Green (`bg-brand-sage-600`)
- Super Admin: Dark Gray (`bg-neutral-ink-900`)

### Permission Notices
Admins see contextual notices when viewing data from all users:
- "**Admin View**: Viewing all tickets from all residents"
- "**Admin View**: Viewing maintenance tasks across the building"

## Security Notes

1. All permission checks are performed using the `getPermissions(role)` function
2. UI elements are conditionally rendered based on permissions
3. Backend validation should mirror these frontend restrictions
4. Sensitive actions (delete, assign, resolve) are restricted to appropriate roles
5. Cross-building data access is limited to Super Admin role only

## Usage in Code

```typescript
import { getPermissions, type Role } from '../../utils/permissions';

function MyComponent({ role }: { role: Role }) {
  const permissions = getPermissions(role);
  
  return (
    <>
      {permissions.canUploadDocuments && (
        <Button>Upload Document</Button>
      )}
      
      {permissions.canViewAllTickets && (
        <div>Admin: Viewing all tickets</div>
      )}
    </>
  );
}
```

## Testing Different Roles

Use the Demo Controls (bottom-right corner) to switch between roles and test the permission system:
- Click "Client" to test resident features
- Click "Admin" to test administrator features  
- Click "Super Admin" to test full system access
