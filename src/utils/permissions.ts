/**
 * Role-Based Access Control (RBAC) System for CasaZero
 * 
 * Defines permissions and capabilities for two user roles:
 * 1. Resident/Client (client)
 * 2. Condominium Administrator (admin)
 */

export type Role = 'client' | 'admin';

export interface Permissions {
  // Navigation & Screens
  canAccessHome: boolean;
  canAccessDocuments: boolean;
  canAccessMaintenance: boolean;
  canAccessAI: boolean;
  canAccessTickets: boolean;
  canAccessChat: boolean;
  canAccessSmartHome: boolean;
  canAccessProfile: boolean;
  canAccessNotifications: boolean;
  canAccessAnalytics: boolean; // Admin only
  canAccessUserManagement: boolean; // Admin only
  canAccessBuildingManagement: boolean; // Admin only
  
  // Documents
  canViewDocuments: boolean;
  canUploadDocuments: boolean;
  canDeleteDocuments: boolean;
  canShareDocuments: boolean;
  
  // Maintenance
  canViewMaintenance: boolean;
  canManageOwnMaintenance: boolean; // Mark complete, ignore N1 tasks
  canCreateN3Tasks: boolean; // Admin-driven tasks
  canAssignMaintenance: boolean; // Admin can assign tasks to residents
  canViewAllMaintenance: boolean; // Admin can see all tasks in their building
  
  // Support Tickets
  canCreateTickets: boolean;
  canViewOwnTickets: boolean;
  canViewAllTickets: boolean; // Admin can see all tickets in their building
  canAssignTickets: boolean;
  canResolveTickets: boolean;
  
  // Chat
  canParticipateInChat: boolean;
  canModerateChat: boolean;
  canManageChannels: boolean;
  
  // Smart Home / Domotica
  canViewDevices: boolean;
  canControlDevices: boolean;
  
  // User Management
  canInviteResidents: boolean;
  canRemoveResidents: boolean;
  canManageAdmins: boolean;
  canViewUserList: boolean;
  
  // Building Management
  canSwitchBuildings: boolean;
  canManageBuildings: boolean;
  canViewAllBuildings: boolean;
  
  // Announcements
  canCreateAnnouncements: boolean;
  canDeleteAnnouncements: boolean;
  
  // Profile & Settings
  canEditOwnProfile: boolean;
  canViewOthersProfiles: boolean;
  
  // Data Scope
  canViewOnlyOwnResidence: boolean; // Residents see only their data
  canViewBuildingScope: boolean; // Admins see building-wide data
  canViewGlobalScope: boolean; // Admin sees all buildings
}

/**
 * Get permissions for a given role
 */
export function getPermissions(role: Role): Permissions {
  const basePermissions: Permissions = {
    // Navigation & Screens
    canAccessHome: true,
    canAccessDocuments: true,
    canAccessMaintenance: true,
    canAccessAI: true,
    canAccessTickets: true,
    canAccessChat: true,
    canAccessSmartHome: true,
    canAccessProfile: true,
    canAccessNotifications: true,
    canAccessAnalytics: false,
    canAccessUserManagement: false,
    canAccessBuildingManagement: false,
    
    // Documents
    canViewDocuments: true,
    canUploadDocuments: false,
    canDeleteDocuments: false,
    canShareDocuments: false,
    
    // Maintenance
    canViewMaintenance: true,
    canManageOwnMaintenance: true,
    canCreateN3Tasks: false,
    canAssignMaintenance: false,
    canViewAllMaintenance: false,
    
    // Support Tickets
    canCreateTickets: true,
    canViewOwnTickets: true,
    canViewAllTickets: false,
    canAssignTickets: false,
    canResolveTickets: false,
    
    // Chat
    canParticipateInChat: true,
    canModerateChat: false,
    canManageChannels: false,
    
    // Smart Home / Domotica
    canViewDevices: true,
    canControlDevices: true,
    
    // User Management
    canInviteResidents: false,
    canRemoveResidents: false,
    canManageAdmins: false,
    canViewUserList: false,
    
    // Building Management
    canSwitchBuildings: false,
    canManageBuildings: false,
    canViewAllBuildings: false,
    
    // Announcements
    canCreateAnnouncements: false,
    canDeleteAnnouncements: false,
    
    // Profile & Settings
    canEditOwnProfile: true,
    canViewOthersProfiles: false,
    
    // Data Scope
    canViewOnlyOwnResidence: true,
    canViewBuildingScope: false,
    canViewGlobalScope: false,
  };

  switch (role) {
    case 'client':
      // Residents/Clients have base permissions
      return basePermissions;
      
    case 'admin':
      // Condominium Administrators have elevated permissions
      return {
        ...basePermissions,
        // Additional screen access
        canAccessAnalytics: true,
        canAccessUserManagement: true,
        canAccessBuildingManagement: true,
        
        // Documents
        canUploadDocuments: true,
        canDeleteDocuments: true,
        canShareDocuments: true,
        
        // Maintenance
        canCreateN3Tasks: true,
        canAssignMaintenance: true,
        canViewAllMaintenance: true,
        
        // Support Tickets
        canViewAllTickets: true,
        canAssignTickets: true,
        canResolveTickets: true,
        
        // Chat
        canModerateChat: true,
        canManageChannels: true,
        
        // Smart Home / Domotica
        canViewDevices: true,
        canControlDevices: true,
        
        // User Management (full)
        canInviteResidents: true,
        canRemoveResidents: true,
        canManageAdmins: true,
        canViewUserList: true,
        
        // Building Management (across all buildings)
        canSwitchBuildings: true,
        canManageBuildings: true,
        canViewAllBuildings: true,
        
        // Announcements
        canCreateAnnouncements: true,
        canDeleteAnnouncements: true,
        
        // Profile
        canViewOthersProfiles: true,
        
        // Data Scope
        canViewOnlyOwnResidence: false,
        canViewBuildingScope: true,
        canViewGlobalScope: true,
      };
      
    default:
      return basePermissions;
  }
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: keyof Permissions): boolean {
  const permissions = getPermissions(role);
  return permissions[permission];
}

/**
 * Get user-friendly role label
 */
export function getRoleLabel(role: Role): string {
  switch (role) {
    case 'client':
      return 'Resident';
    case 'admin':
      return 'Administrator';
    case 'super-admin':
      return 'Super Admin';
    default:
      return 'User';
  }
}

/**
 * Get role badge color
 */
export function getRoleBadgeColor(role: Role): string {
  switch (role) {
    case 'client':
      return 'bg-info';
    case 'admin':
      return 'bg-brand-sage-600';
    case 'super-admin':
      return 'bg-neutral-ink-900';
    default:
      return 'bg-neutral-ink-500';
  }
}
