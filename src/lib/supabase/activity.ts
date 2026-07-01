import { supabase, isSupabaseConfigured, Database } from '../supabase';
import { adminQueries } from '../adminApi';

export type Return = Database['public']['Tables']['returns']['Row'];
export type Notification = Database['public']['Tables']['notifications']['Row'];
export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row'];

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const returnQueries = {
  uploadPhoto: async (file: File) => {
    if (!isSupabaseConfigured) { await delay(); return URL.createObjectURL(file); }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `returns/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('return-photos').upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase.storage.from('return-photos').getPublicUrl(path).data.publicUrl;
  },

  create: async (returnData: Omit<Return, 'id' | 'created_at' | 'updated_at' | 'status' | 'refund_amount' | 'admin_note'>) => {
    if (!isSupabaseConfigured) return { ...returnData, id: `ret-${Date.now()}`, status: 'pending' as const, refund_amount: 0, admin_note: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Return;
    const { data, error } = await supabase.from('returns').insert(returnData).select().single();
    if (error) throw error;
    return data as Return;
  },

  getByUser: async (telegramUserId: number) => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('returns').select('*').eq('telegram_user_id', telegramUserId).order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  getAll: async () => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('returns').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  updateStatus: async (id: string, status: Return['status'], adminNote?: string) => {
    if (!isSupabaseConfigured) return {} as Return;
    const { data, error } = await supabase.from('returns').update({
      status,
      admin_note: adminNote || null,
      updated_at: new Date().toISOString(),
    }).eq('id', id).select().single();
    if (error) throw error;
    return data as Return;
  },
};

export const notificationQueries = {
  getByUser: async (telegramUserId: number) => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('notifications').select('*').eq('telegram_user_id', telegramUserId).order('created_at', { ascending: false }).limit(30);
    if (error) throw error;
    return data ?? [];
  },

  getUnreadCount: async (telegramUserId: number) => {
    if (!isSupabaseConfigured) return 0;
    const { count } = await supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('telegram_user_id', telegramUserId).eq('is_read', false);
    return count ?? 0;
  },

  markAsRead: async (id: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) throw error;
  },

  markAllAsRead: async (telegramUserId: number) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('telegram_user_id', telegramUserId).eq('is_read', false);
    if (error) throw error;
  },

  create: async (notification: Omit<Notification, 'id' | 'created_at' | 'is_read' | 'sent_at'>) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('notifications').insert(notification);
    if (error) throw error;
  },
};

export const auditLogQueries = {
  log: async (entry: Omit<AuditLogEntry, 'id' | 'created_at' | 'ip_address' | 'entity_id'> & { entity_id?: string | null; ip_address?: string | null }) => {
    if (!isSupabaseConfigured) return;
    try {
      await adminQueries.insertAuditLog({ ...entry, entity_id: entry.entity_id ?? null, ip_address: entry.ip_address ?? null });
    } catch { /* non-critical */ }
  },

  getAll: async (limit = 100) => {
    if (!isSupabaseConfigured) return [];
    try {
      const data = await adminQueries.getAuditLogFiltered({});
      return (Array.isArray(data) ? data : []).slice(0, limit);
    } catch { return []; }
  },

  getByEntity: async (entityType: string, entityId?: string) => {
    if (!isSupabaseConfigured) return [];
    try {
      const filters: Record<string, unknown> = { entity_type: entityType };
      if (entityId) filters.entity_id = entityId;
      const data = await adminQueries.getAuditLogFiltered(filters);
      return Array.isArray(data) ? data.slice(0, 50) : [];
    } catch { return []; }
  },

  getByAdmin: async (adminId: string) => {
    if (!isSupabaseConfigured) return [];
    try {
      const data = await adminQueries.getAuditLogFiltered({ admin_id: adminId });
      return Array.isArray(data) ? data.slice(0, 100) : [];
    } catch { return []; }
  },
};
