import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { AdminLayout } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { ResidenceList } from './ResidenceList';
import { ResidenceForm } from './ResidenceForm';
import { UnitManagementList } from './UnitManagementList';
import { UnitForm } from './UnitForm';
import { AssignResidences } from './AssignResidences';
import { ConstructionPhasesList } from './ConstructionPhasesList';
import { DocumentList } from './DocumentList';
import { DocumentForm } from './DocumentForm';
import { MaintenanceList } from './MaintenanceList';
import { MaintenanceForm } from './MaintenanceForm';
import { SupportList } from './SupportList';
import { SupportForm } from './SupportForm';
import { CompanyList } from './CompanyList';
import { CondominiumChat } from './CondominiumChat';
import { CondominiumChatPage } from './CondominiumChatPage';
import { DocumentsScreen } from '../screens/DocumentsScreen';
import { MaintenanceScreen } from '../screens/MaintenanceScreen';
import { AnalyticsScreen } from '../screens/AnalyticsScreen';
import { BuildingManagementScreen } from '../screens/BuildingManagementScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { toast } from 'sonner';
import { API_BASE, safeJsonParse } from '../../utils/api';
import { normalizeUserFormRole } from './user-form/userFormRoleUtils';
import {
  resolveSessionUser,
  isSuperAdmin,
  getSafeRole,
  canCondominiumAdminAccessPage,
  canAccessChatResidence,
} from '../../utils/rbac';
import { parseResidenceIdFromChatPage } from './chatMockData';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * Align legacy UI values with the API. Only `client` is remapped; all other
 * roles (including `super_admin`) are sent as selected.
 */
function mapRoleForUserApi(role: string): string {
  const r = String(role);
  if (r === 'client') return 'resident';
  return r;
}

function trimmedId(value: unknown): string {
  if (value == null) return '';
  const s = String(value).trim();
  return s;
}

/** Ordered unique residence ids for administrator (multi-select form). */
function normalizedAdminResidenceNumericIds(user: {
  residenceIds?: unknown;
  residence_ids?: unknown;
  residence_id?: unknown;
}): number[] {
  const fromMulti = user.residenceIds ?? user.residence_ids;
  if (Array.isArray(fromMulti) && fromMulti.length > 0) {
    const out: number[] = [];
    const seen = new Set<number>();
    for (const x of fromMulti) {
      const n = parseInt(String(x).trim(), 10);
      if (Number.isNaN(n) || n <= 0 || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
    }
    if (out.length > 0) return out;
  }
  const single = trimmedId(user.residence_id);
  if (!single) return [];
  const n = parseInt(single, 10);
  return Number.isNaN(n) || n <= 0 ? [] : [n];
}

/** JSON body for POST /user/update — shared by edit flow and post-create assignment sync. */
function buildUserUpdateBody(
  api_token: string,
  userId: number,
  user: any,
  opts?: { includePassword?: boolean },
) {
  const formRole = normalizeUserFormRole(String(user.role));
  const resTrim = trimmedId(user.residence_id);
  const unitTrim = trimmedId(user.unit_id);

  const body: Record<string, unknown> = {
    api_token,
    user_id: userId,
    user_name: user.user_name,
    email: user.email,
    phone: user.phone || '',
    role: mapRoleForUserApi(String(user.role)),
    language: user.language || 'en',
    is_document_notify: user.is_document_notify ? 1 : 0,
    is_maintenance_notify: user.is_maintenance_notify ? 1 : 0,
    is_chat_notify: user.is_chat_notify ? 1 : 0,
    is_support_ticket_notify: user.is_support_ticket_notify ? 1 : 0,
    is_password_set_by_admin: user.is_password_set_by_admin ? 1 : 0,
    user_status: user.user_status ? 1 : 0,
  };

  if (formRole === 'admin') {
    const adminIds = normalizedAdminResidenceNumericIds(user);
    if (adminIds.length >= 1) {
      body.residence_id = adminIds;
    }
  } else if (formRole !== 'super_admin' && resTrim) {
    body.residence_id = parseInt(resTrim, 10);
  }
  if (formRole === 'resident' && unitTrim) {
    body.unit_id = parseInt(unitTrim, 10);
  }

  if (opts?.includePassword && user.password) {
    body.password = user.password;
    body.password_confirmation = user.confirmPassword || user.password;
  }

  return body;
}

/** JSON body for POST /user/create — matches API (multi `residence_id` array for administrators). */
function buildUserCreateBody(entry_user_id: number, user: any): Record<string, unknown> {
  const formRole = normalizeUserFormRole(String(user.role));
  const phoneRaw = user.phone;
  const phone =
    phoneRaw == null || String(phoneRaw).trim() === ''
      ? null
      : String(phoneRaw).trim();

  const body: Record<string, unknown> = {
    entry_user_id,
    user_name: user.user_name,
    email: user.email,
    phone,
    password: user.password ?? '',
    password_confirmation: user.confirmPassword ?? user.password ?? '',
    role: mapRoleForUserApi(String(user.role)),
    language: user.language || 'en',
    is_document_notify: user.is_document_notify ? 1 : 0,
    is_maintenance_notify: user.is_maintenance_notify ? 1 : 0,
    is_chat_notify: user.is_chat_notify ? 1 : 0,
    is_support_ticket_notify: user.is_support_ticket_notify ? 1 : 0,
    is_password_set_by_admin: user.is_password_set_by_admin ? 1 : 0,
    user_status: user.user_status ? 1 : 0,
  };

  const adminIds = normalizedAdminResidenceNumericIds(user);
  const createResidenceId = trimmedId(user.residence_id);
  const createUnitId = trimmedId(user.unit_id);

  if (formRole === 'admin') {
    if (adminIds.length >= 1) {
      body.residence_id = adminIds;
    }
  } else if (formRole === 'resident' && createResidenceId) {
    body.residence_id = parseInt(createResidenceId, 10);
  }

  if (formRole === 'resident' && createUnitId) {
    body.unit_id = parseInt(createUnitId, 10);
  }

  return body;
}

function isApiSuccess(data: { status?: unknown; success?: unknown }): boolean {
  return (
    data.status === true ||
    data.status === 1 ||
    data.success === true ||
    data.success === 1
  );
}

/**
 * GET /single_residence/:id returns `admin: { id, user_name }` (no `residence_admin`).
 * Normalize so ResidenceForm can bind the admin select and submit updates.
 */
function mapSingleResidenceToForm(data: Record<string, unknown>): Record<string, unknown> {
  const adminObj = data.admin as { id?: number } | null | undefined;
  let residence_admin: number | null = null;
  const raw = data.residence_admin;
  if (raw != null && raw !== '') {
    const n = Number(raw);
    if (!Number.isNaN(n)) residence_admin = n;
  } else if (adminObj?.id != null) {
    const n = Number(adminObj.id);
    if (!Number.isNaN(n)) residence_admin = n;
  }
  return {
    ...data,
    residence_admin,
  };
}

type AdminPage =
  | 'dashboard'
  | 'users'
  | 'residences'
  | 'residence-list'
  | 'units'
  | 'construction-phases'
  | 'assign-residences'
  | 'document-list'
  | 'maintenance-list'
  | 'support-list'
  | 'condominium-chat'
  | 'condominium-chat-1'
  | 'condominium-chat-2'
  | 'condominium-chat-3'
  | 'company-list'
  | 'buildings'
  | 'documents'
  | 'maintenance'
  | 'analytics'
  | 'notifications'
  | 'settings';

interface AdminAppProps {
  onLogout: () => void;
  userData?: any;
}

export function AdminApp({ onLogout, userData }: AdminAppProps) {
  const sessionUser = useMemo(() => resolveSessionUser(userData), [userData]);

  const [currentPage, setCurrentPage] = useState<AdminPage>(() =>
    isSuperAdmin(sessionUser) ? 'dashboard' : 'residence-list',
  );

  const redirectCondoAdmin = useCallback((page: string) => {
    setCurrentPage(page as AdminPage);
  }, []);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [refreshUserList, setRefreshUserList] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Residence management state
  const [showResidenceForm, setShowResidenceForm] = useState(false);
  const [editingResidence, setEditingResidence] = useState<any>(null);
  const [refreshResidenceList, setRefreshResidenceList] = useState(0);

  // Document management state
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [editingDocument, setEditingDocument] = useState<any>(null);
  const [refreshDocumentList, setRefreshDocumentList] = useState(0);
  const [prefilledDocumentData, setPrefilledDocumentData] = useState<{ residence_id?: number; residence_name?: string; unit_id?: number; unit_name?: string } | null>(null);
  const [documentFilterByUnit, setDocumentFilterByUnit] = useState<{ unit_id: number; residence_id: number } | null>(null);

  // Unit management state
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [refreshUnitList, setRefreshUnitList] = useState(0);
  const [filteredResidenceId, setFilteredResidenceId] = useState<number | null>(null);

  // Maintenance management state
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [refreshMaintenanceList, setRefreshMaintenanceList] = useState(0);
  const [maintenanceFilterByResidenceId, setMaintenanceFilterByResidenceId] = useState<number | null>(null);

  // Support (Tickets) state
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [editingSupportTicket, setEditingSupportTicket] = useState<any>(null);
  const [refreshSupportList, setRefreshSupportList] = useState(0);

  useLayoutEffect(() => {
    if (isSuperAdmin(sessionUser)) return;
    if (!canCondominiumAdminAccessPage(currentPage)) {
      setCurrentPage('residence-list');
    }
  }, [sessionUser, currentPage]);

  useEffect(() => {
    if (getSafeRole(sessionUser) !== 'admin') return;
    const res = (sessionUser as { residences?: unknown }).residences;
    if (!Array.isArray(res) || res.length !== 1) return;
    const id = Number((res[0] as { residence_id?: unknown; id?: unknown }).residence_id ?? (res[0] as { id?: unknown }).id);
    if (!Number.isNaN(id)) {
      setFilteredResidenceId(id);
    }
  }, [sessionUser]);

  const handleNavigate = (page: string) => {
    const navUser = resolveSessionUser(userData);
    if (!isSuperAdmin(navUser) && !canCondominiumAdminAccessPage(page)) {
      setCurrentPage('residence-list');
      return;
    }
    // Clear document filter when navigating from menu
    if (page === 'document-list') {
      setDocumentFilterByUnit(null);
      console.log('📄 [NAV] Clearing document filter - showing all documents');
    }
    // Clear maintenance filter when navigating from menu
    if (page === 'maintenance-list') {
      setMaintenanceFilterByResidenceId(null);
      console.log('🔧 [NAV] Clearing maintenance filter - showing all maintenances');
    }
    if (page === 'support-list') {
      // Support filter can be added here when residence-based filtering is needed
    }
    setCurrentPage(page as AdminPage);
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleSaveUser = async (user: any) => {
    console.log('=== USER SAVE STARTED ===');
    console.log('Form Data Received:', user);
    console.log('Is Edit Mode:', !!editingUser);
    
    setLoading(true);
    
    // Get the logged-in admin's ID from userData or localStorage
    const currentUser = userData || JSON.parse(localStorage.getItem('casazero_user') || '{}');
    const entry_user_id = currentUser.id || 1;
    
    console.log('Current Admin User:', currentUser);
    console.log('Entry User ID:', entry_user_id);
    
    try {
      if (editingUser && user.id) {
        // UPDATE USER
        console.log('=== USER UPDATE OPERATION ===');
        console.log('Updating User ID:', user.id);
        
        const api_token = localStorage.getItem('casazero_token') || '';

        const updateRequestBody = buildUserUpdateBody(
          api_token,
          parseInt(String(user.id), 10),
          user,
          { includePassword: !!user.password },
        );

        if (user.password) {
          console.log('Password fields added to update request');
        } else {
          console.log('No password provided - password will not be updated');
        }

        console.log('=== API REQUEST (Update User) ===');
        console.log('URL:', 'https://smarthome.attoexasolutions.com/api/user/update');
        console.log('Method:', 'POST');
        console.log('Request Headers:', {
          'Content-Type': 'application/json',
        });
        console.log('Request Body:', JSON.stringify(updateRequestBody, null, 2));
        console.log('Request Body (Object):', updateRequestBody);

        const response = await fetch(`${API_BASE}/user/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updateRequestBody),
        });

        const data = await safeJsonParse(response);
        
        console.log('Response Data:', data);
        console.log('Response Data (JSON):', JSON.stringify(data, null, 2));

        if (isApiSuccess(data)) {
          console.log('✅ SUCCESS: User updated successfully');
          console.log('Updated User Data:', data.user);
          
          toast.success('Success!', {
            description: data.message || 'User updated successfully',
          });
          
          setShowUserForm(false);
          setEditingUser(null);
          
          // Trigger user list refresh
          setRefreshUserList(prev => prev + 1);
          
          console.log('User list refresh triggered');
          console.log('=== USER UPDATE COMPLETED SUCCESSFULLY ===');
        } else {
          console.error('❌ API ERROR: Update request failed with status true = false');
          console.error('Error Message:', data.message);
          console.error('Full Error Response:', data);
          
          toast.error('Error', {
            description: data.message || 'Failed to update user',
          });
        }
      } else {
        // CREATE USER — POST JSON /user/create (admin: residence_id is number[])
        console.log('=== USER CREATE OPERATION ===');
        console.log('📋 Form Data Received:', user);

        const token = localStorage.getItem('casazero_token') || '';
        const formRole = normalizeUserFormRole(String(user.role));
        const createResidenceId = trimmedId(user.residence_id);
        const createUnitId = trimmedId(user.unit_id);
        const adminResidenceIds = normalizedAdminResidenceNumericIds(user);

        const createBody = buildUserCreateBody(Number(entry_user_id), user);

        console.log('=== API REQUEST (Create User) ===');
        console.log('URL:', `${API_BASE}/user/create`);
        console.log('Method:', 'POST');
        console.log('Content-Type:', 'application/json');
        console.log('Request Body:', JSON.stringify(createBody, null, 2));
        console.log('- role (form):', user.role, '| sent:', mapRoleForUserApi(String(user.role)));
        console.log(
          '- residence_id:',
          formRole === 'admin'
            ? adminResidenceIds.length
              ? adminResidenceIds
              : '(not provided)'
            : createResidenceId || '(not provided)',
        );
        console.log(
          '- unit_id:',
          formRole === 'resident' ? createUnitId || '(not provided)' : '(omitted — not resident)',
        );
        console.log('🔑 Auth token:', token ? 'Present' : 'Missing');

        const response = await fetch(`${API_BASE}/user/create`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify(createBody),
        });

        const data = await safeJsonParse(response);
        
        console.log('📥 Response Data:', data);
        console.log('📥 Response Data (JSON):', JSON.stringify(data, null, 2));

        if (isApiSuccess(data)) {
          console.log('✅ SUCCESS: User created successfully');
          console.log('👤 Created User Data:', data.user);
          
          if (data.unit_assignment) {
            console.log('🏠 Unit Assignment:', data.unit_assignment);
          }

          toast.success('Success!', {
            description: data.message || 'User created successfully',
          });
          
          setShowUserForm(false);
          setEditingUser(null);
          
          // Trigger user list refresh
          setRefreshUserList(prev => prev + 1);
          
          console.log('User list refresh triggered');
          console.log('=== USER CREATION COMPLETED SUCCESSFULLY ===');
        } else {
          console.error('❌ API ERROR: Request failed with status true = false');
          console.error('Error Message:', data.message);
          console.error('Full Error Response:', data);
          
          toast.error('Error', {
            description: data.message || 'Failed to create user',
          });
        }
      }
    } catch (error) {
      console.error('=== EXCEPTION CAUGHT ===');
      console.error('Error Type:', error instanceof Error ? error.constructor.name : typeof error);
      console.error('Error Message:', error instanceof Error ? error.message : String(error));
      console.error('Error Stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Full Error Object:', error);
      
      if (error instanceof TypeError) {
        console.error('Network Error Details:');
        console.error('- This might be a CORS issue');
        console.error('- Or the server might be unreachable');
        console.error('- Check network tab for more details');
      }
      
      toast.error('Error', {
        description: editingUser ? 'Failed to update user. Please try again.' : 'Failed to create user. Please try again.',
      });
    } finally {
      setLoading(false);
      console.log('Loading state set to false');
      console.log('=== USER SAVE PROCESS ENDED ===');
    }
  };

  const handleCreateResidence = () => {
    setEditingResidence(null);
    setShowResidenceForm(true);
  };

  const handleEditResidence = async (residence: any) => {
    const residenceId = residence?.id;
    if (residenceId == null || Number.isNaN(Number(residenceId))) {
      toast.error('Error', { description: 'Invalid residence.' });
      return;
    }

    console.log('🏢 [EDIT-RESIDENCE] GET', `${API_BASE}/single_residence/${residenceId}`);
    setLoading(true);

    try {
      const token = localStorage.getItem('casazero_token');
      const response = await fetch(`${API_BASE}/single_residence/${residenceId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        const text = await response.text();
        let msg = `HTTP ${response.status}`;
        try {
          const j = JSON.parse(text) as { message?: string };
          if (j?.message) msg = j.message;
        } catch {
          if (text?.length && text.length < 300) msg = text;
        }
        throw new Error(msg);
      }

      const result = (await safeJsonParse(response)) as {
        status?: unknown;
        data?: Record<string, unknown>;
        message?: string;
      };
      console.log('📥 [EDIT-RESIDENCE] API Response:', {
        status: result.status,
        id: result.data?.id,
        hasMaintenances: Array.isArray(result.data?.maintenances),
      });

      if (isApiSuccess(result) && result.data && typeof result.data === 'object') {
        const normalized = mapSingleResidenceToForm(result.data);
        console.log('✅ [EDIT-RESIDENCE] Normalized for form:', {
          id: normalized.id,
          residence_admin: normalized.residence_admin,
          maintenancesCount: Array.isArray(normalized.maintenances)
            ? normalized.maintenances.length
            : 0,
        });
        setEditingResidence(normalized);
        setShowResidenceForm(true);
      } else {
        console.error('❌ [EDIT-RESIDENCE] Unsuccessful response:', result);
        toast.error('Error', {
          description:
            (typeof result.message === 'string' && result.message) ||
            'Failed to load residence details',
        });
      }
    } catch (error) {
      console.error('❌ [EDIT-RESIDENCE] Error fetching residence details:', error);
      toast.error('Error', {
        description:
          error instanceof Error ? error.message : 'Failed to load residence details',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveResidence = async (residence: any) => {
    const isResidenceUpdate = !!(editingResidence && residence.id);

    console.log('=== RESIDENCE SAVE STARTED ===');
    console.log('Form Data Received:', residence);
    console.log('Residence Admin Value:', residence.residence_admin);
    console.log('Residence Admin Type:', typeof residence.residence_admin);
    console.log('Is Edit Mode:', isResidenceUpdate);

    // Only block the app with loading for update; create closes the modal immediately and runs in the background.
    if (isResidenceUpdate) {
      setLoading(true);
    }

    try {
      if (isResidenceUpdate) {
        // UPDATE RESIDENCE
        console.log('🔄 [UPDATE-BUILDING] Calling API to update building...');
        
        // Convert number_of_units to number
        const numberOfUnits = residence.number_of_units ? parseInt(residence.number_of_units) : 0;
        
        const token = localStorage.getItem('casazero_token');
        const requestBody: Record<string, unknown> = {
          residence_name: residence.residence_name,
          residence_address: residence.residence_address,
          residence_type: residence.residence_type,
          residence_status: residence.residence_status || 'Completed',
          residence_admin: residence.residence_admin ?? null,
          number_of_units: numberOfUnits,
          residence_photo: residence.residence_photo || null,
        };
        if (Array.isArray(residence.maintenances) && residence.maintenances.length > 0) {
          requestBody.maintenances = residence.maintenances.map(
            (m: { maintenance_id: number; company_id: number }) => ({
              maintenance_id: Number(m.maintenance_id),
              company_id: Number(m.company_id),
            })
          );
        }

        console.log('📤 Update Request Body:', {
          ...requestBody,
          residence_photo: requestBody.residence_photo
            ? `[base64/string, length ${String(requestBody.residence_photo).length}]`
            : null,
          maintenances: requestBody.maintenances ?? '(none)',
        });
        console.log('🆔 Building ID:', residence.id);
        console.log('🌐 API Method: POST');
        console.log('🔗 API URL:', `https://smarthome.attoexasolutions.com/api/residences/update/${residence.id}`);
        
        const response = await fetch(`${API_BASE}/residences/update/${residence.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(requestBody),
        });
        
        const result = await safeJsonParse(response);
        console.log('📥 Update API Response:', result);
        
        if (result.status && result.data) {
          console.log('✅ SUCCESS: Building updated successfully');

          toast.success('Success!', {
            description: 'Building updated successfully',
          });

          setShowResidenceForm(false);
          setEditingResidence(null);
          setRefreshResidenceList((prev: number) => prev + 1);
          return;
        } else {
          console.error('❌ ERROR: Building update failed', result);
          throw new Error(result.message || 'Failed to update building');
        }
      } else {
        // CREATE RESIDENCE — POST https://smarthome.attoexasolutions.com/api/residences/store
        setLoading(true);
        console.log('🏢 [CREATE-RESIDENCE] Calling API to create residence...');

        const token = localStorage.getItem('casazero_token');
        if (!token) {
          throw new Error('Authentication token not found. Please login again.');
        }

        const numberOfUnits = residence.number_of_units
          ? parseInt(String(residence.number_of_units), 10)
          : 0;
        const residenceAdmin =
          residence.residence_admin !== null && residence.residence_admin !== undefined
            ? Number(residence.residence_admin)
            : null;

        const maintenances: { maintenance_id: number; company_id: number }[] = Array.isArray(
          residence.maintenances
        )
          ? residence.maintenances.map(
              (m: { maintenance_id: number; company_id: number }) => ({
                maintenance_id: Number(m.maintenance_id),
                company_id: Number(m.company_id),
              })
            )
          : [];

        const storeUrl = `${API_BASE}/residences/store`;
        const authHeaders: Record<string, string> = {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        };

        // API expects application/json (base64 data URL or null for residence_photo), not multipart.
        const requestBody: Record<string, unknown> = {
          residence_name: String(residence.residence_name ?? ''),
          residence_address: String(residence.residence_address ?? ''),
          residence_type: residence.residence_type ?? 'Condominium',
          residence_status: residence.residence_status || 'Completed',
          residence_photo: residence.residence_photo || null,
          residence_admin: residenceAdmin,
          number_of_units: Number.isNaN(numberOfUnits) ? 0 : numberOfUnits,
          token,
        };
        if (maintenances.length > 0) {
          requestBody.maintenances = maintenances;
        }

        console.log('📤 [CREATE-RESIDENCE] POST JSON /residences/store', {
          ...requestBody,
          residence_photo: requestBody.residence_photo
            ? `[base64 length ${String(requestBody.residence_photo).length}]`
            : null,
          maintenances: requestBody.maintenances ?? '(none)',
        });

        const response = await fetch(storeUrl, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 [CREATE-RESIDENCE] Response Status:', response.status, response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          let message = `HTTP error! status: ${response.status}`;
          try {
            const errJson = JSON.parse(errorText) as {
              message?: string;
              errors?: Record<string, string[] | string>;
            };
            if (errJson.errors && typeof errJson.errors === 'object') {
              const first = Object.values(errJson.errors).flat()[0];
              if (typeof first === 'string' && first.trim()) message = first;
            }
            if (message === `HTTP error! status: ${response.status}` && errJson.message) {
              message = errJson.message;
            }
          } catch {
            if (errorText && errorText.length < 500) message = errorText;
          }
          console.error('❌ [CREATE-RESIDENCE] Error body:', errorText.slice(0, 800));
          throw new Error(message);
        }

        const result = (await safeJsonParse(response)) as {
          status?: boolean;
          message?: string;
          data?: {
            id?: number;
            residence_name?: string;
            maintenances?: unknown;
          };
        };

        console.log('📥 [CREATE-RESIDENCE] API Response:', {
          status: result.status,
          message: result.message,
          dataId: result.data?.id,
        });

        if (result.status === true && result.data != null) {
          toast.success('Success!', {
            description: result.message || 'Residence created successfully',
          });
          setRefreshResidenceList((prev: number) => prev + 1);
          return;
        }

        throw new Error(result.message || 'Failed to create residence');
      }
    } catch (error) {
      console.error(
        '❌ Error:',
        error instanceof Error ? error.message : error
      );

      const desc =
        error instanceof Error && error.message
          ? error.message
          : editingResidence
            ? 'Failed to update building. Please try again.'
            : 'Failed to create building. Please try again.';
      toast.error('Error', { description: desc });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = () => {
    setEditingDocument(null);
    setShowDocumentForm(true);
  };

  const handleEditDocument = async (document: any) => {
    console.log('📝 [EDIT-DOCUMENT] Loading document for editing:', document);

    try {
      const token = localStorage.getItem('casazero_token');
      const response = await fetch(`${API_BASE}/signle/documents/${document.id}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      const result = await safeJsonParse(response);
      console.log('📥 [EDIT-DOCUMENT] single document response:', result);

      if (result?.status === true && result?.data) {
        const detail = result.data;
        const mappedDocument = {
          ...document,
          ...detail,
          category_id: detail.category?.id ?? document.category_id ?? '',
          type_id: detail.type?.id ?? document.type_id ?? '',
          residence_id: detail.residence?.id ?? detail.residence_id ?? document.residence_id ?? '',
          unit_id: detail.unit?.id ?? detail.unit_id ?? document.unit_id ?? '',
        };
        setEditingDocument(mappedDocument);
      } else {
        console.warn('⚠️ [EDIT-DOCUMENT] Falling back to list document payload');
        setEditingDocument(document);
      }
    } catch (error) {
      console.error('❌ [EDIT-DOCUMENT] Failed to fetch document details:', error);
      setEditingDocument(document);
    } finally {
      setShowDocumentForm(true);
    }
  };

  const handleSaveDocument = async (document: any) => {
    console.log('=== DOCUMENT SAVE STARTED ===');
    console.log('Form Data Received:', document);
    console.log('Is Edit Mode:', !!editingDocument);
    
    setLoading(true);
    
    try {
      if (editingDocument && document.id) {
        // UPDATE DOCUMENT
        console.log('📝 [UPDATE-DOCUMENT] Calling API to update document...');

        const token = localStorage.getItem('casazero_token') || '';
        console.log('🔑 [UPDATE-DOCUMENT] Token:', token ? 'Present' : 'Missing');

        const updateRequestBody: any = {
          token,
          document_id: Number(document.id),
          document_name: document.document_name,
          document_description: document.document_description || '',
          category_id: document.category_id ? Number(document.category_id) : null,
          type_id: document.type_id ? Number(document.type_id) : null,
        };

        // Only send file_url when the user replaced the file (base64 data URL).
        // Sending the existing server path (e.g. "documents/...") causes "Invalid file format".
        const rawFileUrl = document.file_url;
        const isNewFileUpload =
          typeof rawFileUrl === 'string' &&
          rawFileUrl.trim().length > 0 &&
          rawFileUrl.trim().startsWith('data:');
        if (isNewFileUpload) {
          updateRequestBody.file_url = rawFileUrl.trim();
        }

        console.log('📤 [UPDATE-DOCUMENT] Request body:', {
          ...updateRequestBody,
          file_url: updateRequestBody.file_url
            ? `${String(updateRequestBody.file_url).substring(0, 50)}...`
            : '(omitted — no new file)',
        });

        const response = await fetch(`${API_BASE}/documents/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify(updateRequestBody),
        });

        const result = await safeJsonParse(response);
        console.log('📥 [UPDATE-DOCUMENT] API Response:', result);

        if (result.status === true && result.data) {
          toast.success('Success!', {
            description: result.message || 'Document updated successfully',
          });

          setShowDocumentForm(false);
          setEditingDocument(null);
          setRefreshDocumentList(prev => prev + 1);
        } else {
          throw new Error(result.message || 'Failed to update document');
        }
      } else {
        // CREATE DOCUMENT - Call real API
        console.log('📝 [CREATE-DOCUMENT] Calling API to create document...');
        
        // Get the logged-in user's ID
        const currentUser = userData || JSON.parse(localStorage.getItem('casazero_user') || '{}');
        const userId = currentUser.id || 2;
        
        console.log('=== CREATE DOCUMENT DEBUG ===');
        console.log('Current User:', currentUser);
        console.log('User ID:', userId);
        console.log('Document Data:', document);
        console.log('File URL (base64) length:', document.file_url?.length || 0);
        console.log('=== END DEBUG ===');
        
        // Prepare JSON request body
        const requestBody: any = {
          user_id: userId,
          document_name: document.document_name,
          document_description: document.document_description || null,
          category_id: document.category_id || null,
          type_id: document.type_id || null,
        };
        
        // Add residence_id only if provided
        if (document.residence_id) {
          requestBody.residence_id = document.residence_id;
        }
        
        // Add unit_id only if provided
        if (document.unit_id) {
          requestBody.unit_id = document.unit_id;
          console.log('🏠 [UNIT] Unit ID added:', document.unit_id);
        }
        
        // Add file_url (base64 string) if provided
        if (document.file_url) {
          requestBody.file_url = document.file_url;
          console.log('📎 [FILE] Base64 file URL added, length:', document.file_url.length);
        }
        
        console.log('📤 Request JSON body:', {
          ...requestBody,
          file_url: requestBody.file_url ? `${requestBody.file_url.substring(0, 50)}...` : null
        });
        
        // Get auth token from localStorage
        const token = localStorage.getItem('casazero_token');
        console.log('🔑 [CREATE-DOCUMENT] Auth token:', token ? 'Present' : 'Missing');
        
        const response = await fetch(`${API_BASE}/documents/store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
          body: JSON.stringify(requestBody),
        });
        
        const result = await safeJsonParse(response);
        console.log('📥 API Response:', result);
        
        if (result.status && result.data) {
          console.log('✅ SUCCESS: Document created successfully');
          console.log('📄 Created Document:', result.data);
          
          toast.success('Success!', {
            description: result.message || 'Document created successfully',
          });
          
          setShowDocumentForm(false);
          setEditingDocument(null);
          setRefreshDocumentList(prev => prev + 1);
        } else {
          throw new Error(result.message || 'Failed to create document');
        }
      }
      
      console.log('=== DOCUMENT SAVE COMPLETED ===');
    } catch (error) {
      console.error('❌ Error:', error);
      
      toast.error('Error', {
        description: editingDocument 
          ? 'Failed to update document. Please try again.' 
          : 'Failed to create document. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = () => {
    setEditingUnit(null);
    setShowUnitForm(true);
  };

  const handleEditUnit = (unit: any) => {
    console.log('🏠 [EDIT-UNIT] Loading unit details for ID:', unit.id);
    console.log('🏠 [EDIT-UNIT] Unit data:', unit);
    console.log('🏠 [EDIT-UNIT] User object:', unit.user);
    
    // List rows set user_id only for resident assignment; API `user` may be admin contact without user_id
    const unitWithUserId = {
      ...unit,
      user_id: unit.user_id ?? null,
    };
    
    console.log('🏠 [EDIT-UNIT] Unit with user_id:', unitWithUserId);
    setEditingUnit(unitWithUserId);
    setShowUnitForm(true);
  };

  const handleSaveUnit = async (unit: any) => {
    console.log('=== UNIT SAVE STARTED ===');
    console.log('Form Data Received:', unit);
    console.log('Is Edit Mode:', !!editingUnit);
    
    setLoading(true);
    
    try {
      if (editingUnit && unit.id) {
        // UPDATE UNIT
        console.log('🏠 [UPDATE-UNIT] Calling API to update unit...');
        
        console.log('=== UPDATE UNIT DEBUG ===');
        console.log('Form Data:', unit);
        console.log('Unit ID:', unit.id);
        console.log('Residence ID:', unit.residence_id);
        console.log('Unit Name:', unit.unit_name);
        console.log('Unit Description:', unit.unit_description);
        console.log('User ID:', unit.user_id);
        
        const requestBody: any = {
          id: parseInt(unit.id),
          residence_id: parseInt(unit.residence_id),
          unit_name: unit.unit_name,
          unit_description: unit.unit_description || '',
        };
        
        // Add user_id only if provided
        if (unit.user_id) {
          requestBody.user_id = parseInt(unit.user_id.toString());
        }
        
        console.log('📤 Update Request Body:', requestBody);
        console.log('📤 Request Body (JSON):', JSON.stringify(requestBody, null, 2));
        console.log('=== END DEBUG ===');
        
        const response = await fetch(`${API_BASE}/unit_update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('📥 Response Status:', response.status);
        console.log('📥 Response OK:', response.ok);
        
        if (!response.ok) {
          console.error('❌ HTTP Error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Error Response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await safeJsonParse(response);
        console.log('📥 Update API Response:', result);
        
        if (result.status && result.data) {
          console.log('✅ SUCCESS: Unit updated successfully');
          console.log('Updated Unit Data:', result.data);
          
          toast.success('Success!', {
            description: result.message || 'Unit updated successfully',
          });
          
          setShowUnitForm(false);
          setEditingUnit(null);
          setRefreshUnitList((prev: number) => prev + 1);
        } else {
          console.error('❌ ERROR: Unit update failed', result);
          console.error('Error Message:', result.message);
          console.error('Full Error Response:', result);
          throw new Error(result.message || 'Failed to update unit');
        }
      } else {
        // CREATE UNIT - Call API
        console.log('🏠 [CREATE-UNIT] Calling API to create unit...');
        
        console.log('=== CREATE UNIT DEBUG ===');
        console.log('Form Data:', unit);
        console.log('Residence ID:', unit.residence_id);
        console.log('Unit Name:', unit.unit_name);
        console.log('Unit Description:', unit.unit_description);
        console.log('User ID:', unit.user_id);
        
        const requestBody: any = {
          residence_id: parseInt(unit.residence_id),
          unit_name: unit.unit_name,
          unit_description: unit.unit_description || '',
        };
        
        // Add user_id only if provided
        if (unit.user_id) {
          requestBody.user_id = parseInt(unit.user_id.toString());
        }
        
        console.log('📤 Request Body (will be sent to API):');
        console.log(JSON.stringify(requestBody, null, 2));
        console.log('=== END DEBUG ===');
        
        const response = await fetch(`${API_BASE}/unit_store`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });
        
        console.log('📥 Response Status:', response.status);
        console.log('📥 Response OK:', response.ok);
        
        if (!response.ok) {
          console.error('❌ HTTP Error:', response.status, response.statusText);
          const errorText = await response.text();
          console.error('❌ Error Response:', errorText);
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await safeJsonParse(response);
        console.log('📥 Create API Response:', result);
        
        if (result.status && result.data) {
          console.log('✅ SUCCESS: Unit created successfully');
          console.log('Created Unit Data:', result.data);
          console.log('Unit Object:', result.data.unit);
          console.log('User Object:', result.data.user);
          
          toast.success('Success!', {
            description: result.message || 'Unit created successfully',
          });
          
          setShowUnitForm(false);
          setEditingUnit(null);
          setRefreshUnitList(prev => prev + 1);
        } else {
          console.error('❌ API ERROR: Create failed');
          console.error('Error Message:', result.message);
          console.error('Full Error Response:', result);
          throw new Error(result.message || 'Failed to create unit');
        }
      }
      
      setShowUnitForm(false);
      setEditingUnit(null);
      
      // Trigger unit list refresh
      setRefreshUnitList(prev => prev + 1);
      
      console.log('=== UNIT SAVE COMPLETED ===');
    } catch (error) {
      console.error('❌ Error:', error);
      
      toast.error('Error', {
        description: editingUnit 
          ? 'Failed to update unit. Please try again.' 
          : 'Failed to create unit. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle view units for a residence
  const handleViewUnitsForResidence = (residenceId: number) => {
    console.log('🏘️ [NAV-UNITS] Navigating to units page for residence ID:', residenceId);
    setFilteredResidenceId(residenceId);
    setCurrentPage('units');
  };

  // Handle clear filter for units
  const handleClearUnitFilter = () => {
    console.log('🔄 [CLEAR-FILTER] Clearing unit filter');
    setFilteredResidenceId(null);
  };

  // Handle upload document from units page
  const handleUploadDocumentFromUnit = (unit: any) => {
    console.log('📤 [UPLOAD-DOC] Opening document form from unit:', unit);
    setPrefilledDocumentData({
      residence_id: unit.residence_id,
      residence_name: unit.residence?.residence_name || '',
      unit_id: unit.id,
      unit_name: unit.unit_name,
    });
    setEditingDocument(null);
    setShowDocumentForm(true);
  };

  // Handle view documents for a unit
  const handleViewDocumentsForUnit = (unit: any) => {
    console.log('📄 [VIEW-DOCS] Navigating to documents page for unit:', unit);
    console.log('📄 [VIEW-DOCS] Unit ID:', unit.id);
    console.log('📄 [VIEW-DOCS] Residence ID:', unit.residence_id);
    
    // Set the document filter by unit and residence
    setDocumentFilterByUnit({
      unit_id: unit.id,
      residence_id: unit.residence_id,
    });
    
    // Navigate to document list page
    setCurrentPage('document-list');
    
    toast.success('Filtering Documents', {
      description: `Showing documents for ${unit.unit_name}`,
    });
  };

  // Handle view maintenance for a residence
  const handleViewMaintenanceForResidence = (residenceId: number) => {
    console.log('🔧 [VIEW-MAINTENANCE] Navigating to maintenance page for residence ID:', residenceId);
    
    // Set the maintenance filter by residence
    setMaintenanceFilterByResidenceId(residenceId);
    
    // Navigate to maintenance list page
    setCurrentPage('maintenance-list');
    
    toast.success('Filtering Maintenance', {
      description: `Showing maintenance for selected residence`,
    });
  };

  // Maintenance handlers
  const handleCreateMaintenance = () => {
    setEditingMaintenance(null);
    setShowMaintenanceForm(true);
  };

  const handleEditMaintenance = async (maintenance: any) => {
    console.log('🔧 [EDIT-MAINTENANCE] Opening maintenance form for editing:', maintenance);
    
    // Pass maintenance object (with ID) to form - form will call maintenance/show API
    // This ensures we always get fresh data from the API
    setEditingMaintenance(maintenance);
    setShowMaintenanceForm(true);
  };

  const handleSaveMaintenance = async (maintenance: any) => {
    console.log('=== MAINTENANCE SAVE CALLBACK ===');
    console.log('Form Data Received:', maintenance);
    console.log('Is Edit Mode:', !!editingMaintenance);
    
    // Check if this is a successful creation (API was already called in the form)
    if (maintenance._created) {
      console.log('✅ [MAINTENANCE] Creation was successful, refreshing list...');
      setShowMaintenanceForm(false);
      setEditingMaintenance(null);
      setRefreshMaintenanceList(prev => prev + 1);
      return;
    }
    
    // Check if this is a successful update (API was already called in the form)
    if (maintenance._updated) {
      console.log('✅ [MAINTENANCE] Update was successful, refreshing list...');
      setShowMaintenanceForm(false);
      setEditingMaintenance(null);
      setRefreshMaintenanceList(prev => prev + 1);
      return;
    }
    
    // Fallback for any other scenarios (should not normally happen)
    console.log('⚠️ [MAINTENANCE] Unexpected save callback - closing form...');
    setShowMaintenanceForm(false);
    setEditingMaintenance(null);
    setRefreshMaintenanceList(prev => prev + 1);
  };

  const handleSaveSupportTicket = async (ticketData: any) => {
    setLoading(true);
    try {
      const api_token = localStorage.getItem('casazero_token') || '';

      if (editingSupportTicket) {
        const response = await fetch(`${API_BASE}/update/support_ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            api_token,
            ticket_id: ticketData.id,
            issue_type_id: Number(ticketData.issue_type),
            title: ticketData.title,
            status: ticketData.status,
            description: ticketData.description,
            image: ticketData.attachment_url,
          }),
        });
        const res = await response.json();
        if (res?.status) {
          toast.success('Success', { description: res.message || 'Ticket updated successfully.' });
          setShowSupportForm(false);
          setEditingSupportTicket(null);
          setRefreshSupportList((prev) => prev + 1);
        } else {
          toast.error('Error', { description: res?.message || 'Failed to update ticket' });
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
        toast.success('Success', { description: 'Ticket created successfully.' });
        setShowSupportForm(false);
        setEditingSupportTicket(null);
        setRefreshSupportList((prev) => prev + 1);
      }
    } catch {
      toast.error('Error', { description: 'Failed to save ticket' });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    const superadminOnly = (node: React.ReactNode) => (
      <ProtectedRoute
        roles={['superadmin']}
        sessionUser={sessionUser}
        fallbackPage="residence-list"
        onRedirect={redirectCondoAdmin}
      >
        {node}
      </ProtectedRoute>
    );

    const chatPageForResidenceId = (residenceId: number) => {
      if (!isSuperAdmin(sessionUser) && !canAccessChatResidence(sessionUser, residenceId)) {
        return (
          <div className="rounded-xl border border-neutral-line-200 bg-white p-6 text-sm text-neutral-ink-600">
            <p>You do not have access to this residence chat.</p>
          </div>
        );
      }
      return <CondominiumChatPage residenceId={residenceId} />;
    };

    switch (currentPage) {
      case 'dashboard':
        return superadminOnly(<AdminDashboard onNavigate={handleNavigate} />);
      
      case 'users':
        return superadminOnly(
          <UserList
            onCreateUser={handleCreateUser}
            onEditUser={handleEditUser}
            refreshKey={refreshUserList}
          />,
        );
      
      case 'residence-list':
        return (
          <ResidenceList
            onCreateResidence={handleCreateResidence}
            onEditResidence={handleEditResidence}
            showAddResidenceButton={isSuperAdmin(sessionUser)}
            refreshKey={refreshResidenceList}
            onViewUnits={handleViewUnitsForResidence}
            onViewMaintenance={handleViewMaintenanceForResidence}
          />
        );
      
      case 'residences':
        return (
          <ResidenceList
            onCreateResidence={handleCreateResidence}
            onEditResidence={handleEditResidence}
            showAddResidenceButton={isSuperAdmin(sessionUser)}
            refreshKey={refreshResidenceList}
            onViewUnits={handleViewUnitsForResidence}
            onViewMaintenance={handleViewMaintenanceForResidence}
          />
        );
      
      case 'units':
        return (
          <UnitManagementList
            onCreateUnit={handleCreateUnit}
            onEditUnit={handleEditUnit}
            showAddUnitButton={isSuperAdmin(sessionUser)}
            refreshKey={refreshUnitList}
            filteredResidenceId={filteredResidenceId}
            onUploadDocument={handleUploadDocumentFromUnit}
            onViewDocuments={handleViewDocumentsForUnit}
            onClearFilter={handleClearUnitFilter}
            onFilterChange={setFilteredResidenceId}
          />
        );
      
      case 'construction-phases':
        return superadminOnly(<ConstructionPhasesList />);
      
      case 'assign-residences':
        return superadminOnly(<AssignResidences />);
      
      case 'document-list':
        return superadminOnly(
          <DocumentList
            onCreateDocument={handleCreateDocument}
            onEditDocument={handleEditDocument}
            refreshKey={refreshDocumentList}
            filterByUnit={documentFilterByUnit}
          />,
        );
      
      case 'maintenance-list':
        return (
          <MaintenanceList
            onCreateMaintenance={handleCreateMaintenance}
            onEditMaintenance={handleEditMaintenance}
            refreshKey={refreshMaintenanceList}
            filterByResidenceId={maintenanceFilterByResidenceId}
          />
        );

      case 'support-list':
        return superadminOnly(
          <SupportList
            onCreateTicket={() => {
              setEditingSupportTicket(null);
              setShowSupportForm(true);
            }}
            onEditTicket={(ticket) => {
              setEditingSupportTicket(ticket);
              setShowSupportForm(true);
            }}
            refreshKey={refreshSupportList}
          />,
        );

      case 'condominium-chat':
        return <CondominiumChat />;

      case 'company-list':
        return superadminOnly(<CompanyList />);
      
      case 'buildings':
        return superadminOnly(<BuildingManagementScreen role="admin" />);
      
      case 'documents':
        return superadminOnly(<DocumentsScreen role="admin" onAskAI={() => {}} />);
      
      case 'maintenance':
        return superadminOnly(<MaintenanceScreen role="admin" onAskAI={() => {}} />);
      
      case 'analytics':
        return superadminOnly(<AnalyticsScreen role="admin" />);
      
      case 'notifications':
        return superadminOnly(<NotificationsScreen onNavigate={handleNavigate} />);
      
      case 'settings':
        return superadminOnly(
          <div className="space-y-6">
            <h1 className="text-neutral-ink-900">Settings</h1>
            <p className="text-neutral-ink-500">Settings page coming soon...</p>
          </div>,
        );
      
      default: {
        const dynamicChatId = parseResidenceIdFromChatPage(currentPage);
        if (dynamicChatId != null) {
          return chatPageForResidenceId(dynamicChatId);
        }
        if (isSuperAdmin(sessionUser)) {
          return <AdminDashboard onNavigate={handleNavigate} />;
        }
        return (
          <ResidenceList
            onCreateResidence={handleCreateResidence}
            onEditResidence={handleEditResidence}
            showAddResidenceButton={isSuperAdmin(sessionUser)}
            refreshKey={refreshResidenceList}
            onViewUnits={handleViewUnitsForResidence}
            onViewMaintenance={handleViewMaintenanceForResidence}
          />
        );
      }
    }
  };

  return (
    <>
      <AdminLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        sessionUser={sessionUser}
      >
        {renderContent()}
      </AdminLayout>

      {/* User Form Modal */}
      <AnimatePresence>
        {showUserForm && (
          <UserForm
            user={editingUser}
            filteredResidenceId={filteredResidenceId}
            onClose={() => {
              setShowUserForm(false);
              setEditingUser(null);
            }}
            onSave={handleSaveUser}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Residence Form Modal */}
      <AnimatePresence>
        {showResidenceForm && (
          <ResidenceForm
            residence={editingResidence}
            onClose={() => {
              setShowResidenceForm(false);
              setEditingResidence(null);
            }}
            onSave={handleSaveResidence}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Document Form Modal */}
      <AnimatePresence>
        {showDocumentForm && (
          <DocumentForm
            document={editingDocument}
            onClose={() => {
              setShowDocumentForm(false);
              setEditingDocument(null);
              setPrefilledDocumentData(null);
            }}
            onSave={handleSaveDocument}
            loading={loading}
            prefilledData={prefilledDocumentData}
          />
        )}
      </AnimatePresence>

      {/* Unit Form Modal */}
      <AnimatePresence>
        {showUnitForm && (
          <UnitForm
            unit={editingUnit}
            onClose={() => {
              setShowUnitForm(false);
              setEditingUnit(null);
            }}
            onSave={handleSaveUnit}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Maintenance Form Modal */}
      <AnimatePresence>
        {showMaintenanceForm && (
          <MaintenanceForm
            maintenance={editingMaintenance}
            onClose={() => {
              setShowMaintenanceForm(false);
              setEditingMaintenance(null);
            }}
            onSave={handleSaveMaintenance}
            loading={loading}
          />
        )}
      </AnimatePresence>

      {/* Support Form Modal */}
      <AnimatePresence>
        {showSupportForm && (
          <SupportForm
            ticket={editingSupportTicket}
            onClose={() => {
              setShowSupportForm(false);
              setEditingSupportTicket(null);
            }}
            onSave={handleSaveSupportTicket}
            loading={loading}
          />
        )}
      </AnimatePresence>
    </>
  );
}