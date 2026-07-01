export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'seller' | 'support' | 'content';

export interface AdminUser {
  id: string;
  first_name: string;
  email: string;
  role: AdminRole;
  _token?: string;
}

const STORAGE_KEY = 'styletech_admin';
const SESSION_VERIFY_KEY = 'styletech_admin_session_verified';
const SESSION_VERIFY_TTL = 5 * 60 * 1000; // 5 minutes

export async function loginAdmin(email: string, password: string): Promise<AdminUser | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'Apikey': anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    if (!data.success || !data.admin) return null;

    const user: AdminUser = {
      id: data.admin.id,
      first_name: data.admin.first_name,
      email: data.admin.email,
      role: data.admin.role as AdminRole,
      _token: data.sessionToken,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_VERIFY_KEY, Date.now().toString());
    return user;
  } catch {
    return null;
  }
}

export async function verifyAdminSession(): Promise<boolean> {
  const user = getCurrentAdmin();
  if (!user || !user._token) return false;

  // Check if we verified recently (client-side cache)
  const lastVerify = parseInt(localStorage.getItem(SESSION_VERIFY_KEY) || '0', 10);
  if (Date.now() - lastVerify < SESSION_VERIFY_TTL) {
    return true;
  }

  // Verify via edge function (server-side, uses service_role)
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return false;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/admin-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'Apikey': anonKey,
      },
      body: JSON.stringify({ verify_session: true, admin_id: user.id, token: user._token }),
    });

    if (!response.ok) {
      logoutAdmin();
      return false;
    }

    const data = await response.json();
    if (data.valid) {
      localStorage.setItem(SESSION_VERIFY_KEY, Date.now().toString());
      return true;
    }

    logoutAdmin();
    return false;
  } catch {
    // Network error — trust local cache for 5 min
    return Date.now() - lastVerify < SESSION_VERIFY_TTL * 2;
  }
}

export function getCurrentAdmin(): AdminUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AdminUser) : null;
  } catch {
    return null;
  }
}

export function logoutAdmin(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(SESSION_VERIFY_KEY);
}

export function canManageUsers(user: AdminUser | null): boolean {
  return user?.role === 'super_admin' || user?.role === 'admin';
}

export function canManageOrders(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager', 'support'].includes(user?.role ?? '');
}

export function canManageProducts(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager', 'seller', 'content'].includes(user?.role ?? '');
}

export function canManageBanners(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager', 'content'].includes(user?.role ?? '');
}

export function canManageDelivery(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager'].includes(user?.role ?? '');
}

export function canViewAuditLog(user: AdminUser | null): boolean {
  return ['super_admin', 'admin'].includes(user?.role ?? '');
}

export function canManageCoupons(user: AdminUser | null): boolean {
  return ['super_admin', 'admin', 'manager'].includes(user?.role ?? '');
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Суперадмин',
  admin: 'Администратор',
  manager: 'Менеджер',
  seller: 'Продавец',
  support: 'Поддержка',
  content: 'Контент-менеджер',
};
