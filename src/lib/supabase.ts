import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured — running in offline/demo mode. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type Database = {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: { ru: string; uz: string };
          slug: string;
          icon: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      products: {
        Row: {
          id: string;
          name: { ru: string; uz: string };
          slug: string;
          price: number;
          description: { ru: string; uz: string };
          category_id: string | null;
          subcategory: string | null;
          images: string[];
          sizes: string[];
          colors: Array<{ name: string; hex: string }>;
          specs: Record<string, string | number | boolean>;
          stock: number;
          is_active: boolean;
          views: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['products']['Row'], 'id' | 'created_at' | 'updated_at' | 'views'>;
        Update: Partial<Database['public']['Tables']['products']['Insert']>;
      };
      users: {
        Row: {
          id: string;
          telegram_id: number;
          first_name: string;
          username: string | null;
          language: string;
          phone: string | null;
          address: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      orders: {
        Row: {
          id: string;
          telegram_user_id: number;
          items: OrderItem[];
          total_amount: number;
          status: string;
          customer_info: CustomerInfo;
          delivery_type: string;
          delivery_cost: number;
          payment_method: string;
          notes: string | null;
          transaction_id: string | null;
          paid_at: string | null;
          coupon_id: string | null;
          discount_amount: number;
          status_history: StatusHistoryEntry[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['orders']['Row'], 'id' | 'created_at' | 'updated_at' | 'transaction_id' | 'paid_at' | 'status_history' | 'discount_amount'> & {
          transaction_id?: string | null;
          paid_at?: string | null;
          coupon_id?: string | null;
          discount_amount?: number;
          status_history?: StatusHistoryEntry[];
        };
        Update: Partial<Database['public']['Tables']['orders']['Insert']>;
      };
      reviews: {
        Row: {
          id: string;
          product_id: string;
          telegram_user_id: number;
          user_name: string;
          rating: number;
          comment: string | null;
          images: string[];
          photos: string[];
          is_verified_purchase: boolean;
          admin_reply: string | null;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['reviews']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['reviews']['Insert']>;
      };
      promotions: {
        Row: {
          id: string;
          title: { ru: string; uz: string };
          description: { ru: string; uz: string };
          type: 'new_arrival' | 'sale' | 'featured';
          product_ids: string[];
          discount_percent: number | null;
          discount_percentage: number | null;
          is_active: boolean;
          starts_at: string;
          ends_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['promotions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['promotions']['Insert']>;
      };
      referrals: {
        Row: {
          id: string;
          referrer_telegram_id: number;
          referred_telegram_id: number | null;
          referral_code: string;
          bonus_amount: number;
          is_redeemed: boolean;
          redeemed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['referrals']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['referrals']['Insert']>;
      };
      banners: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['banners']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['banners']['Insert']>;
      };
      delivery_zones: {
        Row: {
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
        Insert: Omit<Database['public']['Tables']['delivery_zones']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['delivery_zones']['Insert']>;
      };
      coupons: {
        Row: {
          id: string;
          code: string;
          type: 'percent' | 'fixed';
          value: number;
          min_order_amount: number;
          max_uses_total: number | null;
          max_uses_per_user: number;
          valid_from: string;
          valid_until: string | null;
          is_active: boolean;
          new_customers_only: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['coupons']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['coupons']['Insert']>;
      };
      coupon_usage: {
        Row: {
          id: string;
          coupon_id: string;
          telegram_user_id: number;
          order_id: string | null;
          used_at: string;
        };
        Insert: Omit<Database['public']['Tables']['coupon_usage']['Row'], 'id' | 'used_at'>;
        Update: Partial<Database['public']['Tables']['coupon_usage']['Insert']>;
      };
      abandoned_carts: {
        Row: {
          id: string;
          telegram_user_id: number;
          items: OrderItem[];
          total_amount: number;
          notified_at: string | null;
          recovered_order_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['abandoned_carts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['abandoned_carts']['Insert']>;
      };
      notifications: {
        Row: {
          id: string;
          telegram_user_id: number;
          type: string;
          title: string;
          body: string;
          data: Record<string, unknown>;
          is_read: boolean;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['notifications']['Insert']>;
      };
      returns: {
        Row: {
          id: string;
          order_id: string;
          telegram_user_id: number;
          items: Array<{ productId: string; name: string; quantity: number; price: number }>;
          reason: string;
          status: 'pending' | 'approved' | 'rejected' | 'refunded';
          refund_amount: number;
          admin_note: string | null;
          photos: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['returns']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['returns']['Insert']>;
      };
      audit_log: {
        Row: {
          id: string;
          admin_id: string;
          action: string;
          entity_type: string;
          entity_id: string | null;
          details: Record<string, unknown>;
          ip_address: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['audit_log']['Insert']>;
      };
      product_relations: {
        Row: {
          id: string;
          product_id: string;
          related_product_id: string;
          relation_type: 'upsell' | 'cross_sell' | 'bundle';
          sort_order: number;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_relations']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['product_relations']['Insert']>;
      };
      product_collections: {
        Row: {
          id: string;
          name: { ru: string; uz: string };
          slug: string;
          icon: string;
          product_ids: string[];
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['product_collections']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['product_collections']['Insert']>;
      };
      favorites: {
        Row: {
          id: string;
          telegram_user_id: number;
          product_id: string;
          notify_price: boolean;
          notify_stock: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['favorites']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['favorites']['Insert']>;
      };
      admin_accounts: {
        Row: {
          id: string;
          email: string;
          first_name: string;
          username: string | null;
          role: string;
          password_hash: string;
          session_token: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['admin_accounts']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['admin_accounts']['Insert']>;
      };
    };
  };
};

export interface OrderItem {
  productId: string;
  name: { ru: string; uz: string } | string;
  price: number;
  quantity: number;
  size?: string;
  color?: string;
  image?: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  city: string;
  address: string;
  zone_id?: string;
  region?: string;
}

export interface StatusHistoryEntry {
  status: string;
  changed_at: string;
  changed_by: string;
  note?: string;
}
