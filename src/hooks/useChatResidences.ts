import { useEffect, useMemo, useState } from 'react';
import {
  fetchResidencesCatalog,
  getSessionResidenceAdminId,
  isApiTruthyStatus,
  residencesArrayFromApiResult,
  safeJsonParse,
} from '../utils/api';
import { isSuperAdmin, resolveSessionUser } from '../utils/rbac';

export type ChatResidenceItem = {
  id: number;
  name: string;
  /** Laravel `residence_admin` — used to validate admin chat access. */
  residence_admin: number | null;
};

function toAdminId(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function mapSessionResidences(residences: unknown): ChatResidenceItem[] {
  if (!Array.isArray(residences) || residences.length === 0) return [];
  return residences
    .map(
      (r: {
        residence_id?: unknown;
        id?: unknown;
        residence_name?: unknown;
        name?: unknown;
        residence_admin?: unknown;
      }) => {
        const id = Number(r.residence_id ?? r.id);
        if (Number.isNaN(id)) return null;
        const name = String(r.residence_name ?? r.name ?? '').trim() || `Residence ${id}`;
        return { id, name, residence_admin: toAdminId(r.residence_admin) };
      },
    )
    .filter(Boolean) as ChatResidenceItem[];
}

function mapApiResidences(result: Record<string, unknown>): ChatResidenceItem[] {
  const list = residencesArrayFromApiResult(result) as Array<{
    id?: unknown;
    residence_name?: unknown;
    residence_admin?: unknown;
  }>;
  return list
    .map((row) => {
      const id = Number(row.id);
      if (Number.isNaN(id)) return null;
      const name = String(row.residence_name ?? '').trim() || `Residence ${id}`;
      return { id, name, residence_admin: toAdminId(row.residence_admin) };
    })
    .filter(Boolean) as ChatResidenceItem[];
}

/**
 * Residences shown under Condominium Chat in the sidebar.
 * Superadmin: full catalog from POST /residences.
 * Condominium admin: scoped list from the same endpoint (not session mock data).
 */
export function useChatResidences(
  sessionUser?: { role?: unknown; residences?: unknown } | null,
) {
  const resolvedUser = useMemo(
    () =>
      (sessionUser != null
        ? resolveSessionUser(sessionUser as Record<string, unknown>)
        : resolveSessionUser()) as Record<string, unknown> | null,
    [sessionUser],
  );

  const fetchKey = useMemo(() => {
    if (!resolvedUser) return '';
    const adminId = getSessionResidenceAdminId(resolvedUser);
    const superFlag = isSuperAdmin(resolvedUser) ? '1' : '0';
    return `${adminId ?? 'none'}:${superFlag}`;
  }, [resolvedUser]);

  const [items, setItems] = useState<ChatResidenceItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!resolvedUser || fetchKey === '' || fetchKey.startsWith('none:')) {
      setItems([]);
      return;
    }

    const sessionPlaceholder = mapSessionResidences(resolvedUser.residences);
    if (sessionPlaceholder.length > 0) {
      setItems(sessionPlaceholder);
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        const response = await fetchResidencesCatalog({ sessionUser: resolvedUser });
        const result = await safeJsonParse<Record<string, unknown>>(response);

        if (cancelled) return;

        if (!isApiTruthyStatus(result.status)) {
          if (sessionPlaceholder.length === 0) setItems([]);
          return;
        }

        setItems(mapApiResidences(result));
      } catch {
        if (!cancelled && sessionPlaceholder.length === 0) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fetchKey]);

  return { items, loading };
}
