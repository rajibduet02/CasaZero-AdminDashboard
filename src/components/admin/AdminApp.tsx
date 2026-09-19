import React, { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'motion/react';
import { Loader2 } from 'lucide-react';
import { AdminLayout } from './AdminLayout';
import { AdminDashboard } from './AdminDashboard';
import { CondominiumAdminDashboard } from './CondominiumAdminDashboard';
import { toSupportStatusApiValue } from './supportStatus';
import { toast } from 'sonner';
import { API_BASE, isApiTruthyStatus, safeJsonParse,
  apiFetch,
  invalidateResidencesCatalog,
} from '../../utils/api';
import { normalizeUserFormRole } from './user-form/userFormRoleUtils';
import { resolveSessionUser,
  isSuperAdmin,
  getSafeRole,
  canCondominiumAdminAccessPage,
  ADMIN_ONLY_ADMIN_PAGES,
} from '../../utils/rbac';
import { parseResidenceIdFromChatPage } from './chatMockData';
import { ProtectedRoute } from './ProtectedRoute';
import { useLanguage } from '../../utils/LanguageContext';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  buildAdminHref,
  locationHref,
  parseAdminLocation,
  type AdminNavFilters,
} from '../../utils/adminRoutes';

const UserList = lazy(() => import('./UserList').then((m) => ({ default: m.UserList })));
const UserForm = lazy(() => import('./UserForm').then((m) => ({ default: m.UserForm })));
const ResidenceList = lazy(() => import('./ResidenceList').then((m) => ({ default: m.ResidenceList })));
const ResidenceForm = lazy(() => import('./ResidenceForm').then((m) => ({ default: m.ResidenceForm })));
const UnitManagementList = lazy(() => import('./UnitManagementList').then((m) => ({ default: m.UnitManagementList })));
const UnitForm = lazy(() => import('./UnitForm').then((m) => ({ default: m.UnitForm })));
const AssignResidences = lazy(() => import('./AssignResidences').then((m) => ({ default: m.AssignResidences })));
const ConstructionPhasesList = lazy(() => import('./ConstructionPhasesList').then((m) => ({ default: m.ConstructionPhasesList })));
const ResidenceWiseMaintenanceList = lazy(() =>
  import('./ResidenceWiseMaintenanceList').then((m) => ({ default: m.ResidenceWiseMaintenanceList })),
);
const DocumentList = lazy(() => import('./DocumentList').then((m) => ({ default: m.DocumentList })));
const DocumentForm = lazy(() => import('./DocumentForm').then((m) => ({ default: m.DocumentForm })));
const MaintenanceList = lazy(() => import('./MaintenanceList').then((m) => ({ default: m.MaintenanceList })));
const MaintenanceForm = lazy(() => import('./MaintenanceForm').then((m) => ({ default: m.MaintenanceForm })));
const SupportList = lazy(() => import('./SupportList').then((m) => ({ default: m.SupportList })));
const SupportForm = lazy(() => import('./SupportForm').then((m) => ({ default: m.SupportForm })));
const CompanyList = lazy(() => import('./CompanyList').then((m) => ({ default: m.CompanyList })));
const CondominiumChat = lazy(() => import('./CondominiumChat').then((m) => ({ default: m.CondominiumChat })));
const CondominiumChatPage = lazy(() =>
  import('./CondominiumChatPage').then((m) => ({ default: m.CondominiumChatPage })),
);
const DocumentsScreen = lazy(() =>
  import('../screens/DocumentsScreen').then((m) => ({ default: m.DocumentsScreen })),
);
const MaintenanceScreen = lazy(() =>
  import('../screens/MaintenanceScreen').then((m) => ({ default: m.MaintenanceScreen })),
);
const AnalyticsScreen = lazy(() =>
  import('../screens/AnalyticsScreen').then((m) => ({ default: m.AnalyticsScreen })),
);
const BuildingManagementScreen = lazy(() =>
  import('../screens/BuildingManagementScreen').then((m) => ({ default: m.BuildingManagementScreen })),
);
const NotificationsScreen = lazy(() =>
  import('../screens/NotificationsScreen').then((m) => ({ default: m.NotificationsScreen })),
);

function AdminScreenFallback() {
  return (
    <div className="flex w-full items-center justify-center py-16">
      <Loader2 className="w-12 h-12 text-[#6A8F7B] animate-spin" />
    </div>
  );
}

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

function parsePositiveId(value: unknown): number | null {
  const s = trimmedId(value);
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isNaN(n) || n <= 0 ? null : n;
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

  // residence_id / old_residence_id: required|integer|exists:residences,id
  // unit_id / old_unit_id: nullable|integer|exists:units,id — omit when unset (never send 0)
  const newResidenceId =
    parsePositiveId(resTrim) ??
    (formRole === 'admin' ? normalizedAdminResidenceNumericIds(user)[0] ?? null : null);
  const oldResidenceId = parsePositiveId(user.old_residence_id) ?? newResidenceId;
  const newUnitId = parsePositiveId(unitTrim);
  const oldUnitId = parsePositiveId(user.old_unit_id);

  if (formRole === 'admin' || formRole === 'resident') {
    if (newResidenceId != null) {
      body.residence_id = newResidenceId;
    }
    if (oldResidenceId != null) {
      body.old_residence_id = oldResidenceId;
    }
  }

  if (formRole === 'resident') {
    if (newUnitId != null) {
      body.unit_id = newUnitId;
    }
    if (oldUnitId != null) {
      body.old_unit_id = oldUnitId;
    }
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
  | 'residence-wise-maintenances'
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
  const { t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionUser = useMemo(() => resolveSessionUser(userData), [userData]);

  const { page: routedPage, filters: routedFilters } = useMemo(
    () => parseAdminLocation(location.pathname, location.search),
    [location.pathname, location.search],
  );
  const currentPage = routedPage as AdminPage;

  const goToAdminPage = useCallback(
    (page: string, filters?: AdminNavFilters, options?: { replace?: boolean }) => {
      const dest = buildAdminHref(page, filters);
      if (locationHref(location.pathname, location.search) === dest) return;
      navigate(dest, { replace: options?.replace });
    },
    [location.pathname, location.search, navigate],
  );

  const redirectCondoAdmin = useCallback((page: string) => {
    goToAdminPage(page, undefined, { replace: true });
  }, [goToAdminPage]);
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
  const documentFilterByUnit =
    routedFilters.unitId != null && routedFilters.residenceId != null
      ? { unit_id: routedFilters.unitId, residence_id: routedFilters.residenceId }
      : null;

  // Unit management state
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any>(null);
  const [refreshUnitList, setRefreshUnitList] = useState(0);
  const [sessionDefaultResidenceId, setSessionDefaultResidenceId] = useState<number | null>(null);
  const filteredResidenceId = routedFilters.residenceId ?? sessionDefaultResidenceId;

  // Maintenance management state
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<any>(null);
  const [refreshMaintenanceList, setRefreshMaintenanceList] = useState(0);
  const maintenanceFilterByResidenceId = routedFilters.residenceId ?? null;

  // Support (Tickets) state
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [editingSupportTicket, setEditingSupportTicket] = useState<any>(null);
  const [refreshSupportList, setRefreshSupportList] = useState(0);

  useLayoutEffect(() => {
    if (isSuperAdmin(sessionUser)) {
      if (ADMIN_ONLY_ADMIN_PAGES.has(currentPage)) {
        goToAdminPage('dashboard', undefined, { replace: true });
      }
      return;
    }
    if (!canCondominiumAdminAccessPage(currentPage)) {
      goToAdminPage('dashboard', undefined, { replace: true });
    }
  }, [sessionUser, currentPage, goToAdminPage]);

  useEffect(() => {
    if (getSafeRole(sessionUser) !== 'admin') return;
    const res = (sessionUser as { residences?: unknown }).residences;
    if (!Array.isArray(res) || res.length !== 1) return;
    const id = Number((res[0] as { residence_id?: unknown; id?: unknown }).residence_id ?? (res[0] as { id?: unknown }).id);
    if (!Number.isNaN(id)) {
      setSessionDefaultResidenceId(id);
    }
  }, [sessionUser]);

  const handleNavigate = (page: string) => {
    const navUser = resolveSessionUser(userData);
    if (isSuperAdmin(navUser)) {
      if (ADMIN_ONLY_ADMIN_PAGES.has(page)) {
        goToAdminPage('dashboard', undefined, { replace: true });
        return;
      }
    } else if (!canCondominiumAdminAccessPage(page)) {
      goToAdminPage('dashboard', undefined, { replace: true });
      return;
    }
    // Sidebar / card navigation omits query filters so those pages open unfiltered.
    if (page === 'document-list') {
      console.log('📄 [NAV] Clearing document filter - showing all documents');
    }
    if (page === 'maintenance-list') {
      console.log('🔧 [NAV] Clearing maintenance filter - showing all maintenances');
    }
    if (page === 'residence-wise-maintenances') {
      console.log('🔧 [NAV] Clearing residence-wise maintenance preselection');
    }
    if (page === 'support-list') {
      // Support filter can be added here when residence-based filtering is needed
    }
    const samePage = currentPage === page || (page === 'residences' && currentPage === 'residence-list');
    goToAdminPage(page, undefined, { replace: samePage });
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
        console.log('URL:', `${API_BASE}/user/update`);
        console.log('Method:', 'POST');
        console.log('Request Headers:', {
          'Content-Type': 'application/json',
        });
        console.log('Request Body:', JSON.stringify(updateRequestBody, null, 2));
        console.log('Request Body (Object):', updateRequestBody);

        const response = await apiFetch(`${API_BASE}/user/update`, {
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
          
          toast.success(t('successExclaim'), {
            description: data.message || t('userUpdated'),
          });
          
          setShowUserForm(false);
          setEditingUser(null);
          
          // Trigger user list refresh
          setRefreshUserList(prev => prev + 1);
          // Residence list admin column comes from cached POST /residences (`admin.user_name`).
          invalidateResidencesCatalog();
          setRefreshResidenceList(prev => prev + 1);
          
          console.log('User list refresh triggered');
          console.log('=== USER UPDATE COMPLETED SUCCESSFULLY ===');
        } else {
          console.error('❌ API ERROR: Update request failed with status true = false');
          console.error('Error Message:', data.message);
          console.error('Full Error Response:', data);
          
          toast.error(t('error'), {
            description: data.message || t('failedToUpdateUser'),
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

        const response = await apiFetch(`${API_BASE}/user/create`, {
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

          toast.success(t('successExclaim'), {
            description: data.message || t('userCreated'),
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
          
          toast.error(t('error'), {
            description: data.message || t('failedToCreateUser'),
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
      
      toast.error(t('error'), {
        description: t('failedToUpdateCreateUser'),
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
      toast.error(t('error'), { description: t('invalidResidence') });
      return;
    }

    console.log('🏢 [EDIT-RESIDENCE] GET', `${API_BASE}/single_residence/${residenceId}`);
    setLoading(true);

    try {
      const token = localStorage.getItem('casazero_token');
      const response = await apiFetch(`${API_BASE}/single_residence/${residenceId}`, {
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
        toast.error(t('error'), {
          description:
            (typeof result.message === 'string' && result.message) ||
            t('failedToLoadResidenceDetails'),
        });
      }
    } catch (error) {
      console.error('❌ [EDIT-RESIDENCE] Error fetching residence details:', error);
      toast.error(t('error'), {
        description:
          error instanceof Error ? error.message : t('failedToLoadResidenceDetails'),
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
        // UPDATE RESIDENCE — same auth/photo rules as POST /residences/store
        console.log('🔄 [UPDATE-BUILDING] Calling API to update building...');

        const token = localStorage.getItem('casazero_token');
        if (!token) {
          throw new Error(t('missingApiToken'));
        }

        const numberOfUnits = residence.number_of_units
          ? parseInt(String(residence.number_of_units), 10)
          : 0;
        const residenceAdmin =
          residence.residence_admin !== null && residence.residence_admin !== undefined
            ? Number(residence.residence_admin)
            : null;

        const requestBody: Record<string, unknown> = {
          token,
          residence_name: String(residence.residence_name ?? ''),
          residence_address: String(residence.residence_address ?? ''),
          residence_type: residence.residence_type ?? 'Condominium',
          residence_status: residence.residence_status || 'Completed',
          residence_admin: residenceAdmin,
          number_of_units: Number.isNaN(numberOfUnits) ? 0 : numberOfUnits,
        };

        const rawPhoto = residence.residence_photo;
        const isNewPhotoUpload =
          typeof rawPhoto === 'string' &&
          rawPhoto.trim().length > 0 &&
          rawPhoto.trim().startsWith('data:');
        if (isNewPhotoUpload) {
          requestBody.residence_photo = rawPhoto.trim();
        } else if (rawPhoto === null || rawPhoto === '') {
          requestBody.residence_photo = null;
        }

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
            ? `[base64 length ${String(requestBody.residence_photo).length}]`
            : requestBody.residence_photo === null
              ? null
              : '(omitted — existing server photo)',
          maintenances: requestBody.maintenances ?? '(none)',
        });
        console.log('🆔 Building ID:', residence.id);
        console.log('🌐 API Method: POST');
        console.log('🔗 API URL:', `${API_BASE}/residences/update/${residence.id}`);

        const response = await apiFetch(`${API_BASE}/residences/update/${residence.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        });

        console.log('📥 [UPDATE-BUILDING] Response Status:', response.status, response.ok);

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
          console.error('❌ [UPDATE-BUILDING] Error body:', errorText.slice(0, 800));
          throw new Error(message);
        }

        const result = (await safeJsonParse(response)) as {
          status?: unknown;
          message?: string;
          data?: unknown;
        };
        console.log('📥 Update API Response:', result);

        if (isApiTruthyStatus(result.status)) {
          console.log('✅ SUCCESS: Building updated successfully');

          toast.success(t('successExclaim'), {
            description:
              (typeof result.message === 'string' && result.message) ||
              t('buildingUpdatedSuccess'),
          });

          setShowResidenceForm(false);
          setEditingResidence(null);
          invalidateResidencesCatalog();
          setRefreshResidenceList((prev: number) => prev + 1);
          return;
        }

        console.error('❌ ERROR: Building update failed', result);
        throw new Error(
          (typeof result.message === 'string' && result.message) || t('failedToSaveBuilding')
        );
      } else {
        // CREATE RESIDENCE — POST /residences/store (fetch uses API_BASE)
        setLoading(true);
        console.log('🏢 [CREATE-RESIDENCE] Calling API to create residence...');

        const token = localStorage.getItem('casazero_token');
        if (!token) {
          throw new Error(t('missingApiToken'));
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

        const response = await apiFetch(storeUrl, {
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
          toast.success(t('successExclaim'), {
            description: result.message || t('residenceCreatedSuccess'),
          });
          invalidateResidencesCatalog();
          setRefreshResidenceList((prev: number) => prev + 1);
          return;
        }

        throw new Error(result.message || t('failedToSaveBuilding'));
      }
    } catch (error) {
      console.error(
        '❌ Error:',
        error instanceof Error ? error.message : error
      );

      const desc =
        error instanceof Error && error.message
          ? error.message
          : t('failedToSaveBuilding');
      toast.error(t('error'), { description: desc });
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
      const response = await apiFetch(`${API_BASE}/signle/documents/${document.id}`, {
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
        toast.warning(t('warning') || 'Warning', {
          description: t('documentDetailsFallback') || 'Document details could not be loaded. Using list data instead.',
        });
      }
    } catch (error) {
      console.error('❌ [EDIT-DOCUMENT] Failed to fetch document details:', error);
      setEditingDocument(document);
      toast.warning(t('warning') || 'Warning', {
        description: t('documentDetailsFallback') || 'Document details could not be loaded. Using list data instead.',
      });
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

        const response = await apiFetch(`${API_BASE}/documents/update`, {
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
          toast.success(t('successExclaim'), {
            description: result.message || t('documentUpdatedSuccess'),
          });

          setShowDocumentForm(false);
          setEditingDocument(null);
          setRefreshDocumentList(prev => prev + 1);
        } else {
          throw new Error(result.message || t('failedToSaveDocument'));
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
        
        const response = await apiFetch(`${API_BASE}/documents/store`, {
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
          
          toast.success(t('successExclaim'), {
            description: result.message || t('documentCreatedSuccess'),
          });
          
          setShowDocumentForm(false);
          setEditingDocument(null);
          setRefreshDocumentList(prev => prev + 1);
        } else {
          throw new Error(result.message || t('failedToSaveDocument'));
        }
      }
      
      console.log('=== DOCUMENT SAVE COMPLETED ===');
    } catch (error) {
      console.error('❌ Error:', error);
      
      toast.error(t('error'), {
        description: error instanceof Error
          ? error.message
          : t('failedToSaveDocument') || 'Failed to save document.',
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
        
        const response = await apiFetch(`${API_BASE}/unit_update`, {
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
          
          toast.success(t('successExclaim'), {
            description: result.message || t('unitUpdatedSuccess'),
          });
          
          setShowUnitForm(false);
          setEditingUnit(null);
          setRefreshUnitList((prev: number) => prev + 1);
        } else {
          console.error('❌ ERROR: Unit update failed', result);
          console.error('Error Message:', result.message);
          console.error('Full Error Response:', result);
          throw new Error(result.message || t('failedToSaveUnit'));
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
        
        const response = await apiFetch(`${API_BASE}/unit_store`, {
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
          
          toast.success(t('successExclaim'), {
            description: result.message || t('unitCreatedSuccess'),
          });
          
          setShowUnitForm(false);
          setEditingUnit(null);
          setRefreshUnitList(prev => prev + 1);
        } else {
          console.error('❌ API ERROR: Create failed');
          console.error('Error Message:', result.message);
          console.error('Full Error Response:', result);
          throw new Error(result.message || t('failedToSaveUnit'));
        }
      }
      
      setShowUnitForm(false);
      setEditingUnit(null);
      
      // Trigger unit list refresh
      setRefreshUnitList(prev => prev + 1);
      
      console.log('=== UNIT SAVE COMPLETED ===');
    } catch (error) {
      console.error('❌ Error:', error);
      
      toast.error(t('error'), {
        description: t('failedToSaveUnit'),
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle view units for a residence
  const handleViewUnitsForResidence = (residenceId: number) => {
    console.log('🏘️ [NAV-UNITS] Navigating to units page for residence ID:', residenceId);
    goToAdminPage('units', { residenceId });
  };

  // Handle clear filter for units
  const handleClearUnitFilter = () => {
    console.log('🔄 [CLEAR-FILTER] Clearing unit filter');
    goToAdminPage('units', undefined, { replace: true });
  };

  const handleUnitFilterChange = (residenceId: number | null) => {
    goToAdminPage(
      'units',
      residenceId != null ? { residenceId } : undefined,
      { replace: true },
    );
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
    
    goToAdminPage('document-list', {
      unitId: unit.id,
      residenceId: unit.residence_id,
    });
    
    toast.success(t('filteringDocuments'), {
      description: t('showingDocumentsFor').replace('{name}', unit.unit_name),
    });
  };

  // Residence wrench → dedicated residence-wise module (never the main MaintenanceList).
  const handleViewMaintenanceForResidence = (residenceId: number) => {
    console.log(
      '🔧 [VIEW-MAINTENANCE] Navigating to residence-wise maintenance for residence ID:',
      residenceId,
    );

    goToAdminPage('residence-wise-maintenances', { residenceId });

    toast.success(t('filteringMaintenance'), {
      description: t('showingMaintenanceForResidence'),
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
        const response = await apiFetch(`${API_BASE}/update/support_ticket`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            api_token,
            ticket_id: ticketData.id,
            issue_type_id: Number(ticketData.issue_type),
            title: ticketData.title,
            status: toSupportStatusApiValue(ticketData.status),
            description: ticketData.description,
            image: ticketData.attachment_url,
          }),
        });
        const res = await response.json();
        if (res?.status) {
          toast.success(t('success'), { description: res.message || t('ticketUpdatedSuccess') });
          setShowSupportForm(false);
          setEditingSupportTicket(null);
          setRefreshSupportList((prev) => prev + 1);
        } else {
          toast.error(t('error'), { description: res?.message || t('failedToUpdateTicket') });
        }
      } else {
        await new Promise((r) => setTimeout(r, 500));
        toast.success(t('success'), { description: t('ticketCreatedSuccess') });
        setShowSupportForm(false);
        setEditingSupportTicket(null);
        setRefreshSupportList((prev) => prev + 1);
      }
    } catch {
      toast.error(t('error'), { description: t('failedToSaveTicket') });
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    const superadminOnly = (node: React.ReactNode) => (
      <ProtectedRoute
        roles={['superadmin']}
        sessionUser={sessionUser}
        fallbackPage="dashboard"
        onRedirect={redirectCondoAdmin}
      >
        {node}
      </ProtectedRoute>
    );

    const chatPageForResidenceId = (residenceId: number) => {
      // RBAC + Firestore guard: AdminChat / useFirestoreResidenceChat (API residence catalog).
      return <CondominiumChatPage residenceId={residenceId} sessionUser={sessionUser} />;
    };

    switch (currentPage) {
      case 'dashboard':
        return isSuperAdmin(sessionUser) ? (
          <AdminDashboard onNavigate={handleNavigate} />
        ) : (
          <CondominiumAdminDashboard onNavigate={handleNavigate} sessionUser={sessionUser} />
        );
      
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
            onFilterChange={handleUnitFilterChange}
          />
        );
      
      case 'construction-phases':
        return superadminOnly(<ConstructionPhasesList />);

      case 'residence-wise-maintenances':
        return (
          <ResidenceWiseMaintenanceList
            key={
              maintenanceFilterByResidenceId != null
                ? `residence-wise-${maintenanceFilterByResidenceId}`
                : 'residence-wise-manual'
            }
            refreshKey={refreshMaintenanceList}
            initialResidenceId={maintenanceFilterByResidenceId}
          />
        );
      
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
            <h1 className="text-neutral-ink-900">{t('settings')}</h1>
            <p className="text-neutral-ink-500">{t('settingsComingSoon')}</p>
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
    <ErrorBoundary name="AdminApp">
      <>
      <AdminLayout
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={onLogout}
        sessionUser={sessionUser}
      >
        <Suspense fallback={<AdminScreenFallback />}>
          <ErrorBoundary name="AdminPage">
            {renderContent()}
          </ErrorBoundary>
        </Suspense>
      </AdminLayout>

      <Suspense fallback={null}>
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
      </Suspense>
    </>
    </ErrorBoundary>
  );
}