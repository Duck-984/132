import { supabase, isSupabaseConfigured, Database } from '../supabase';
import { adminQueries } from '../adminApi';
import type { Product } from './products';

export type User = Database['public']['Tables']['users']['Row'];
export type Referral = Database['public']['Tables']['referrals']['Row'];

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const userQueries = {
  getByTelegramId: async (telegramId: number) => {
    if (!isSupabaseConfigured) {
      await delay();
      return { id: `${telegramId}`, telegram_id: telegramId, first_name: 'Гость', username: null, language: 'ru', phone: null, address: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    }
    const { data, error } = await supabase.from('users').select('*').eq('telegram_id', telegramId).maybeSingle();
    if (error) throw error;
    return data;
  },

  upsert: async (telegramId: number, userData: { first_name: string; username?: string | null; language?: string; phone?: string }) => {
    if (!isSupabaseConfigured) {
      await delay();
      return { id: `${telegramId}`, telegram_id: telegramId, ...userData, phone: null, address: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as User;
    }
    const { data, error } = await supabase.from('users').upsert({ telegram_id: telegramId, ...userData, updated_at: new Date().toISOString() }, { onConflict: 'telegram_id' }).select().single();
    if (error) throw error;
    return data as User;
  },

  updateProfile: async (telegramId: number, updates: { phone?: string; address?: string; first_name?: string }) => {
    if (!isSupabaseConfigured) {
      await delay();
      return { id: `${telegramId}`, telegram_id: telegramId, first_name: updates.first_name || 'Гость', username: null, language: 'ru', phone: updates.phone ?? null, address: updates.address ?? null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as User;
    }
    const { data, error } = await supabase.from('users').upsert({ telegram_id: telegramId, ...updates, updated_at: new Date().toISOString() }, { onConflict: 'telegram_id' }).select().single();
    if (error) throw error;
    return data as User;
  },
};

export const referralQueries = {
  getByCode: async (code: string) => {
    if (!isSupabaseConfigured) { await delay(); return null; }
    const { data, error } = await supabase.from('referrals').select('*').eq('referral_code', code).maybeSingle();
    if (error) throw error;
    return data;
  },

  create: async (telegramId: number) => {
    if (!isSupabaseConfigured) {
      await delay();
      return { id: `ref-${Date.now()}`, referrer_telegram_id: telegramId, referral_code: `REF${telegramId}${Math.random().toString(36).slice(7).toUpperCase()}`, bonus_amount: 50000, is_redeemed: false, redeemed_at: null, created_at: new Date().toISOString() } as Referral;
    }
    return adminQueries.createReferral({ referrer_telegram_id: telegramId, referral_code: `REF${telegramId}${Math.random().toString(36).slice(7).toUpperCase()}` }) as Promise<Referral>;
  },

  getByReferrer: async (telegramId: number) => {
    if (!isSupabaseConfigured) { await delay(); return []; }
    const { data, error } = await supabase.from('referrals').select('*').eq('referrer_telegram_id', telegramId);
    if (error) throw error;
    return data;
  },

  redeem: async (referralId: string, referredTelegramId: number) => {
    if (!isSupabaseConfigured) { await delay(); return null; }
    return adminQueries.updateReferral(referralId, { referred_telegram_id: referredTelegramId, is_redeemed: true, redeemed_at: new Date().toISOString() }) as Promise<Referral | null>;
  },
};

export const favoriteQueries = {
  getByUser: async (telegramUserId: number) => {
    if (!isSupabaseConfigured || !telegramUserId) return [];
    const { data, error } = await supabase.from('favorites').select('product_id, products(id, name, slug, price, images, is_active, stock, sizes, colors)').eq('telegram_user_id', telegramUserId).order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? [])
      .filter((row) => row.products !== null)
      .map((row) => ({ ...(row.products as Product), favoriteId: row.product_id })) as (Product & { favoriteId: string })[];
  },

  getProductIds: async (telegramUserId: number) => {
    if (!isSupabaseConfigured || !telegramUserId) return [] as string[];
    const { data, error } = await supabase.from('favorites').select('product_id').eq('telegram_user_id', telegramUserId);
    if (error) throw error;
    return (data ?? []).map((row) => row.product_id) as string[];
  },

  add: async (telegramUserId: number, productId: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('favorites').upsert({ telegram_user_id: telegramUserId, product_id: productId }, { onConflict: 'telegram_user_id,product_id', ignoreDuplicates: true });
    if (error && !error.message.includes('unique')) throw error;
  },

  remove: async (telegramUserId: number, productId: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('favorites').delete().eq('telegram_user_id', telegramUserId).eq('product_id', productId);
    if (error) throw error;
  },

  updatePrefs: async (telegramUserId: number, productId: string, prefs: { notify_price?: boolean; notify_stock?: boolean }) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('favorites').update(prefs).eq('telegram_user_id', telegramUserId).eq('product_id', productId);
    if (error) throw error;
  },

  getPrefs: async (telegramUserId: number, productId: string) => {
    if (!isSupabaseConfigured) return null;
    const { data } = await supabase.from('favorites').select('notify_price, notify_stock').eq('telegram_user_id', telegramUserId).eq('product_id', productId).maybeSingle();
    return data;
  },

  getAllStats: async () => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('favorites').select('product_id, notify_price, notify_stock');
    if (error) throw error;
    const map: Record<string, { likes: number; notify_price: number; notify_stock: number }> = {};
    (data ?? []).forEach((row) => {
      if (!map[row.product_id]) map[row.product_id] = { likes: 0, notify_price: 0, notify_stock: 0 };
      map[row.product_id].likes++;
      if (row.notify_price) map[row.product_id].notify_price++;
      if (row.notify_stock) map[row.product_id].notify_stock++;
    });
    return Object.entries(map).map(([product_id, stats]) => ({ product_id, ...stats }));
  },

  getStatsForProduct: async (productId: string) => {
    if (!isSupabaseConfigured) return { likes: 0, notify_price: 0, notify_stock: 0 };
    const { data, error } = await supabase.from('favorites').select('notify_price, notify_stock').eq('product_id', productId);
    if (error) throw error;
    return { likes: data?.length ?? 0, notify_price: data?.filter((r) => r.notify_price).length ?? 0, notify_stock: data?.filter((r) => r.notify_stock).length ?? 0 };
  },

  getNotifyPriceUsers: async (productId: string) => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('favorites').select('telegram_user_id').eq('product_id', productId).eq('notify_price', true);
    if (error) throw error;
    return (data ?? []).map((r) => r.telegram_user_id);
  },

  getNotifyStockUsers: async (productId: string) => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('favorites').select('telegram_user_id').eq('product_id', productId).eq('notify_stock', true);
    if (error) throw error;
    return (data ?? []).map((r) => r.telegram_user_id);
  },
};

export const paymentQueries = {
  createPayment: async (orderId: string, amount: number, paymentMethod: 'payme' | 'click' | 'uzum') => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !anonKey) { return { paymentUrl: null, orderId }; }
    const response = await fetch(`${supabaseUrl}/functions/v1/create-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${anonKey}`, 'Apikey': anonKey },
      body: JSON.stringify({ orderId, amount, paymentMethod }),
    });
    if (!response.ok) throw new Error('Failed to create payment');
    return response.json();
  },
};
