import { supabase, isSupabaseConfigured, Database } from '../supabase';
import { mockOrders } from './mock';

export type Order = Database['public']['Tables']['orders']['Row'];

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const orderQueries = {
  create: async (orderData: Database['public']['Tables']['orders']['Insert']) => {
    if (!isSupabaseConfigured) {
      await delay();
      return { ...orderData, id: `ord-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), status_history: [], transaction_id: null, paid_at: null } as Order;
    }
    const { data, error } = await supabase.from('orders').insert(orderData).select().single();
    if (error) throw error;
    return data;
  },

  getByTelegramUserId: async (telegramUserId: number) => {
    if (!isSupabaseConfigured) {
      await delay();
      const hiddenStatuses = ['cancelled', 'returned', 'return_requested'];
      return mockOrders.filter((o) => !hiddenStatuses.includes(o.status));
    }
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('telegram_user_id', telegramUserId)
      .not('status', 'in', '("cancelled","returned","return_requested")')
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },

  getById: async (id: string) => {
    if (!isSupabaseConfigured) { await delay(); return mockOrders.find((o) => o.id === id) ?? null; }
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  updateStatus: async (id: string, status: string, changedBy = 'admin', note?: string) => {
    if (!isSupabaseConfigured) { await delay(); return mockOrders.find((o) => o.id === id) as Order; }
    const { data, error } = await supabase.rpc('append_order_status', {
      p_order_id: id,
      p_status: status,
      p_changed_by: changedBy,
      p_note: note || null,
    }).maybeSingle();
    if (error) throw error;
    return data as Order;
  },

  subscribeToOrders: (callback: (payload: { new: Record<string, unknown>; old: Record<string, unknown>; eventType: string }) => void) => {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} } as ReturnType<typeof supabase.channel>;
    return supabase.channel('orders-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, callback).subscribe();
  },
};
