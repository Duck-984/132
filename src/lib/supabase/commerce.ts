import { supabase, isSupabaseConfigured, Database } from '../supabase';
import { adminQueries } from '../adminApi';
import { mockBanners, mockDeliveryZones } from './mock';

export type Banner = {
  id: string;
  title: { ru: string; uz: string };
  subtitle: { ru: string; uz: string };
  image_url: string;
  link_url: string | null;
  link_label: { ru: string; uz: string } | null;
  bg_color: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type DeliveryZone = {
  id: string;
  city_ru: string;
  city_uz: string;
  region_ru: string;
  region_uz: string;
  standard_price: number;
  express_price: number;
  standard_days_min: number;
  standard_days_max: number;
  express_days_min: number;
  express_days_max: number;
  free_threshold: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type Coupon = Database['public']['Tables']['coupons']['Row'];
export type CouponUsage = Database['public']['Tables']['coupon_usage']['Row'];

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const bannerQueries = {
  getActive: async (): Promise<Banner[]> => {
    if (!isSupabaseConfigured) { await delay(); return mockBanners.filter((b) => b.is_active); }
    const { data, error } = await supabase.from('banners').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Banner[];
  },

  getAll: async (): Promise<Banner[]> => {
    if (!isSupabaseConfigured) { await delay(); return mockBanners; }
    const { data, error } = await supabase.from('banners').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as Banner[];
  },

  create: async (banner: Omit<Banner, 'id' | 'created_at' | 'updated_at'>): Promise<Banner> => {
    if (!isSupabaseConfigured) { await delay(); return { ...banner, id: `banner-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; }
    return adminQueries.createBanner(banner as Record<string, unknown>) as Promise<Banner>;
  },

  update: async (id: string, banner: Partial<Omit<Banner, 'id' | 'created_at' | 'updated_at'>>): Promise<Banner> => {
    if (!isSupabaseConfigured) { await delay(); return mockBanners[0] as Banner; }
    return adminQueries.updateBanner(id, banner as Record<string, unknown>) as Promise<Banner>;
  },

  delete: async (id: string): Promise<void> => {
    if (!isSupabaseConfigured) { await delay(); return; }
    await adminQueries.deleteBanner(id);
  },
};

export const deliveryZoneQueries = {
  getActive: async (): Promise<DeliveryZone[]> => {
    if (!isSupabaseConfigured) { await delay(); return mockDeliveryZones.filter((z) => z.is_active); }
    const { data, error } = await supabase.from('delivery_zones').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DeliveryZone[];
  },

  getAll: async (): Promise<DeliveryZone[]> => {
    if (!isSupabaseConfigured) { await delay(); return mockDeliveryZones; }
    const { data, error } = await supabase.from('delivery_zones').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as DeliveryZone[];
  },

  create: async (zone: Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>): Promise<DeliveryZone> => {
    if (!isSupabaseConfigured) { await delay(); return { ...zone, id: `zone-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }; }
    return adminQueries.createDeliveryZone(zone as Record<string, unknown>) as Promise<DeliveryZone>;
  },

  update: async (id: string, zone: Partial<Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>>): Promise<DeliveryZone> => {
    if (!isSupabaseConfigured) { await delay(); const z = mockDeliveryZones.find((z) => z.id === id); if (z) Object.assign(z, zone); return z as DeliveryZone; }
    return adminQueries.updateDeliveryZone(id, zone as Record<string, unknown>) as Promise<DeliveryZone>;
  },

  delete: async (id: string): Promise<void> => {
    if (!isSupabaseConfigured) { await delay(); return; }
    await adminQueries.deleteDeliveryZone(id);
  },
};

export const couponQueries = {
  validate: async (code: string, telegramUserId: number, orderAmount: number) => {
    if (!isSupabaseConfigured) return { valid: true, coupon: null, discount: 0, error: null };
    const { data: coupon, error } = await supabase.from('coupons').select('*').eq('code', code.toUpperCase()).eq('is_active', true).maybeSingle();
    if (error || !coupon) return { valid: false, coupon: null, discount: 0, error: 'Купон не найден' };
    if (coupon.valid_until && new Date(coupon.valid_until) < new Date()) return { valid: false, coupon, discount: 0, error: 'Купон истёк' };
    if (new Date(coupon.valid_from) > new Date()) return { valid: false, coupon, discount: 0, error: 'Купон ещё не активен' };
    if (orderAmount < coupon.min_order_amount) return { valid: false, coupon, discount: 0, error: `Минимальная сумма: ${coupon.min_order_amount}` };
    if (coupon.max_uses_total) {
      const { count } = await supabase.from('coupon_usage').select('*', { count: 'exact', head: true }).eq('coupon_id', coupon.id);
      if ((count ?? 0) >= coupon.max_uses_total) return { valid: false, coupon, discount: 0, error: 'Купон закончился' };
    }
    const { count: userCount } = await supabase.from('coupon_usage').select('*', { count: 'exact', head: true }).eq('coupon_id', coupon.id).eq('telegram_user_id', telegramUserId);
    if ((userCount ?? 0) >= coupon.max_uses_per_user) return { valid: false, coupon, discount: 0, error: 'Вы уже использовали этот купон' };
    if (coupon.new_customers_only) {
      const { count: orderCount } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('telegram_user_id', telegramUserId);
      if ((orderCount ?? 0) > 0) return { valid: false, coupon, discount: 0, error: 'Купон только для новых клиентов' };
    }
    const discount = coupon.type === 'percent' ? Math.round(orderAmount * coupon.value / 100) : Math.min(coupon.value, orderAmount);
    return { valid: true, coupon, discount, error: null };
  },

  recordUsage: async (couponId: string, telegramUserId: number, orderId?: string) => {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('coupon_usage').insert({ coupon_id: couponId, telegram_user_id: telegramUserId, order_id: orderId ?? null });
    if (error) throw error;
  },

  getAll: async () => {
    if (!isSupabaseConfigured) return [];
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  },

  create: async (coupon: Omit<Coupon, 'id' | 'created_at' | 'updated_at'>) => {
    if (!isSupabaseConfigured) return { ...coupon, id: `coupon-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Coupon;
    return adminQueries.createCoupon(coupon as Record<string, unknown>) as Promise<Coupon>;
  },

  update: async (id: string, updates: Partial<Omit<Coupon, 'id' | 'created_at' | 'updated_at'>>) => {
    if (!isSupabaseConfigured) return {} as Coupon;
    return adminQueries.updateCoupon(id, updates as Record<string, unknown>) as Promise<Coupon>;
  },

  delete: async (id: string) => {
    if (!isSupabaseConfigured) return;
    await adminQueries.deleteCoupon(id);
  },

  getUsageStats: async (couponId: string) => {
    if (!isSupabaseConfigured) return { totalUses: 0, uniqueUsers: 0 };
    const { data } = await supabase.from('coupon_usage').select('telegram_user_id').eq('coupon_id', couponId);
    const users = new Set((data ?? []).map((u) => u.telegram_user_id));
    return { totalUses: data?.length ?? 0, uniqueUsers: users.size };
  },
};
