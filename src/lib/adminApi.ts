const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

function getAdminSession(): { admin_id: string; token: string } | null {
  try {
    const raw = localStorage.getItem('styletech_admin');
    if (!raw) return null;
    const admin = JSON.parse(raw);
    if (!admin?.id || !admin?._token) return null;
    return { admin_id: admin.id, token: admin._token };
  } catch {
    return null;
  }
}

function getCurrentAdminName(): string {
  try {
    const raw = localStorage.getItem('styletech_admin');
    if (!raw) return 'Admin';
    const admin = JSON.parse(raw);
    return admin?.first_name || 'Admin';
  } catch {
    return 'Admin';
  }
}

async function adminApiCall(action: string, table: string, params?: {
  data?: unknown;
  filters?: Record<string, unknown>;
  id?: string;
  retries?: number;
  skipSession?: boolean; // for public read-only calls (customer-facing)
}) {
  if (!supabaseUrl || !anonKey) {
    throw new Error('Supabase not configured');
  }

  const maxRetries = params?.retries ?? 1;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Attach admin_session for all mutation calls (not for public reads)
      const MUTATIONS = ['insert', 'update', 'delete', 'updateOrderStatus'];
      const admin_session = MUTATIONS.includes(action) && !params?.skipSession
        ? getAdminSession()
        : null;

      const body: Record<string, unknown> = { action, table };
      if (params?.data !== undefined) body.data = params.data;
      if (params?.filters !== undefined) body.filters = params.filters;
      if (params?.id !== undefined) body.id = params.id;
      if (admin_session) body.admin_session = admin_session;

      const response = await fetch(`${supabaseUrl}/functions/v1/admin-api`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Admin API error');
      }

      const result = await response.json();
      return result.data;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

// Public call — no session needed (customer-facing reads/writes that go via edge function)
// Used for: creating reviews, returns, recording coupon usage, notifications
function publicApiCall(action: string, table: string, params?: {
  data?: unknown;
  filters?: Record<string, unknown>;
  id?: string;
}) {
  return adminApiCall(action, table, { ...params, skipSession: true });
}

export const adminQueries = {
  // ── Orders ──────────────────────────────────────────────────────────────
  getOrders: () => adminApiCall('select', 'orders'),

  updateOrderStatus: (orderId: string, status: string, changedBy: string) =>
    adminApiCall('updateOrderStatus', 'orders', {
      id: orderId,
      data: { status, changed_by: changedBy },
    }),

  getOrdersFiltered: (filters?: Record<string, unknown>) =>
    adminApiCall('select', 'orders', { filters }),

  // ── Products ─────────────────────────────────────────────────────────────
  getProducts: () => adminApiCall('select', 'products'),

  createProduct: (product: Record<string, unknown>) =>
    adminApiCall('insert', 'products', { data: product }),

  updateProduct: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'products', { id, data: updates }),

  deleteProduct: (id: string) =>
    adminApiCall('delete', 'products', { id }),

  // ── Banners ──────────────────────────────────────────────────────────────
  getBanners: () => adminApiCall('select', 'banners'),

  createBanner: (banner: Record<string, unknown>) =>
    adminApiCall('insert', 'banners', { data: banner }),

  updateBanner: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'banners', { id, data: updates }),

  deleteBanner: (id: string) =>
    adminApiCall('delete', 'banners', { id }),

  // ── Delivery Zones ───────────────────────────────────────────────────────
  getDeliveryZones: () => adminApiCall('select', 'delivery_zones'),

  createDeliveryZone: (zone: Record<string, unknown>) =>
    adminApiCall('insert', 'delivery_zones', { data: zone }),

  updateDeliveryZone: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'delivery_zones', { id, data: updates }),

  deleteDeliveryZone: (id: string) =>
    adminApiCall('delete', 'delivery_zones', { id }),

  // ── Coupons ──────────────────────────────────────────────────────────────
  getCoupons: () => adminApiCall('select', 'coupons'),

  createCoupon: (coupon: Record<string, unknown>) =>
    adminApiCall('insert', 'coupons', { data: coupon }),

  updateCoupon: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'coupons', { id, data: updates }),

  deleteCoupon: (id: string) =>
    adminApiCall('delete', 'coupons', { id }),

  getCouponUsage: (filters?: Record<string, unknown>) =>
    adminApiCall('select', 'coupon_usage', { filters }),

  // coupon_usage records are created by customers (no admin session)
  recordCouponUsage: (couponId: string, telegramUserId: number, orderId?: string) =>
    publicApiCall('insert', 'coupon_usage', {
      data: { coupon_id: couponId, telegram_user_id: telegramUserId, order_id: orderId ?? null },
    }),

  // ── Returns ──────────────────────────────────────────────────────────────
  getReturns: () => adminApiCall('select', 'returns'),
  getReturnsFiltered: (filters?: Record<string, unknown>) =>
    adminApiCall('select', 'returns', { filters }),

  updateReturnStatus: (id: string, status: string, adminNote?: string) =>
    adminApiCall('updateReturnStatus', 'returns', {
      id,
      data: { status, admin_note: adminNote, changed_by: getCurrentAdminName() },
    }),

  // Returns are created by customers (no admin session)
  createReturn: (data: Record<string, unknown>) =>
    publicApiCall('insert', 'returns', { data }),

  // ── Users ────────────────────────────────────────────────────────────────
  getUsers: () => adminApiCall('select', 'users'),

  // Users are upserted by customers themselves (no admin session)
  upsertUser: (data: Record<string, unknown>) =>
    publicApiCall('insert', 'users', { data }),

  updateUser: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'users', { id, data: updates }),

  // ── Categories ───────────────────────────────────────────────────────────
  getCategories: () => adminApiCall('select', 'categories'),

  createCategory: (category: Record<string, unknown>) =>
    adminApiCall('insert', 'categories', { data: category }),

  updateCategory: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'categories', { id, data: updates }),

  deleteCategory: (id: string) =>
    adminApiCall('delete', 'categories', { id }),

  // ── Audit Log ────────────────────────────────────────────────────────────
  getAuditLog: () => adminApiCall('select', 'audit_log'),
  getAuditLogFiltered: (filters?: Record<string, unknown>) =>
    adminApiCall('select', 'audit_log', { filters }),

  insertAuditLog: (entry: Record<string, unknown>) =>
    adminApiCall('insert', 'audit_log', { data: entry }),

  // ── Admin Accounts ───────────────────────────────────────────────────────
  getAdminAccounts: () => adminApiCall('select', 'admin_accounts'),

  createAdminAccount: (account: Record<string, unknown>) =>
    adminApiCall('insert', 'admin_accounts', { data: account }),

  updateAdminAccount: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'admin_accounts', { id, data: updates }),

  // ── Collections ──────────────────────────────────────────────────────────
  getCollections: () => adminApiCall('select', 'product_collections'),

  createCollection: (collection: Record<string, unknown>) =>
    adminApiCall('insert', 'product_collections', { data: collection }),

  updateCollection: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'product_collections', { id, data: updates }),

  deleteCollection: (id: string) =>
    adminApiCall('delete', 'product_collections', { id }),

  // ── Reviews ──────────────────────────────────────────────────────────────
  getReviews: () => adminApiCall('select', 'reviews'),

  updateReview: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'reviews', { id, data: updates }),

  approveReview: (id: string) =>
    adminApiCall('update', 'reviews', { id, data: { is_approved: true } }),

  rejectReview: (id: string) =>
    adminApiCall('update', 'reviews', { id, data: { is_approved: false } }),

  replyToReview: (id: string, reply: string) =>
    adminApiCall('update', 'reviews', { id, data: { admin_reply: reply } }),

  // Reviews created by customers (no admin session)
  createReview: (data: Record<string, unknown>) =>
    publicApiCall('insert', 'reviews', { data }),

  // ── Referrals ────────────────────────────────────────────────────────────
  createReferral: (data: Record<string, unknown>) =>
    adminApiCall('insert', 'referrals', { data }),

  updateReferral: (id: string, updates: Record<string, unknown>) =>
    adminApiCall('update', 'referrals', { id, data: updates }),

  getReferrals: (filters?: Record<string, unknown>) =>
    adminApiCall('select', 'referrals', { filters }),

  // ── Notifications ─────────────────────────────────────────────────────────
  markNotificationRead: (id: string) =>
    adminApiCall('update', 'notifications', { id, data: { is_read: true } }),

  markAllNotificationsRead: (filters: Record<string, unknown>) =>
    adminApiCall('update', 'notifications', { id: '__bulk__', data: { is_read: true }, filters }),

  getNotifications: (filters?: Record<string, unknown>) =>
    adminApiCall('select', 'notifications', { filters }),

  createNotification: (data: Record<string, unknown>) =>
    adminApiCall('insert', 'notifications', { data }),

  // ── Product Relations ────────────────────────────────────────────────────
  createProductRelation: (data: Record<string, unknown>) =>
    adminApiCall('insert', 'product_relations', { data }),

  deleteProductRelation: (id: string) =>
    adminApiCall('delete', 'product_relations', { id }),

  getProductRelations: (filters?: Record<string, unknown>) =>
    adminApiCall('select', 'product_relations', { filters }),

  // ── Favorites ────────────────────────────────────────────────────────────
  addFavorite: (data: Record<string, unknown>) =>
    adminApiCall('insert', 'favorites', { data }),

  removeFavorite: (filters: Record<string, unknown> | string) => {
    if (typeof filters === 'string') {
      return adminApiCall('delete', 'favorites', { id: filters });
    }
    return adminApiCall('delete', 'favorites', { id: '__filter__', data: filters });
  },

  getFavorites: (filters: Record<string, unknown>) =>
    adminApiCall('select', 'favorites', { filters }),
};
