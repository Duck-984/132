import { supabase, isSupabaseConfigured, Database } from '../supabase';
import { adminQueries } from '../adminApi';

export type Review = Database['public']['Tables']['reviews']['Row'];
export type Promotion = Database['public']['Tables']['promotions']['Row'];
export type ProductCollection = Database['public']['Tables']['product_collections']['Row'];
export type ProductRelation = Database['public']['Tables']['product_relations']['Row'];

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const reviewQueries = {
  getByProductId: async (productId: string) => {
    if (!isSupabaseConfigured) { await delay(); return []; }
    const { data, error } = await supabase.from('reviews').select('*').eq('product_id', productId).eq('is_approved', true).order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  create: async (reviewData: Database['public']['Tables']['reviews']['Insert']) => {
    if (!isSupabaseConfigured) {
      await delay();
      return { ...reviewData, id: `rev-${Date.now()}`, created_at: new Date().toISOString(), is_approved: false, photos: [], images: [], is_verified_purchase: false, admin_reply: null, updated_at: new Date().toISOString(), user_name: reviewData.user_name ?? '' } as Review;
    }
    const { error } = await supabase.from('reviews').insert(reviewData);
    if (error) throw error;
    return { ...reviewData, id: `rev-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as Review;
  },

  getAverageRating: async (productId: string) => {
    if (!isSupabaseConfigured) return { average: 0, count: 0 };
    const { data, error, count } = await supabase.from('reviews').select('rating', { count: 'exact' }).eq('product_id', productId).eq('is_approved', true);
    if (error) throw error;
    if (!data?.length) return { average: 0, count: 0 };
    return { average: data.reduce((a, r) => a + r.rating, 0) / data.length, count: count ?? data.length };
  },

  uploadReviewPhoto: async (file: File) => {
    if (!isSupabaseConfigured) { await delay(); return URL.createObjectURL(file); }
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `reviews/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from('review-photos').upload(path, file, { upsert: false });
    if (error) throw error;
    return supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl;
  },

  getAllWithProductNames: async () => {
    if (!isSupabaseConfigured) return [];
    const reviews = await adminQueries.getReviews() as Review[];
    if (!reviews?.length) return [];
    const productIds = [...new Set(reviews.map((r) => r.product_id))];
    const { data: products } = await supabase.from('products').select('id, name').in('id', productIds);
    const productMap: Record<string, { ru: string; uz: string }> = {};
    (products ?? []).forEach((p: { id: string; name: { ru: string; uz: string } }) => { productMap[p.id] = p.name; });
    return reviews.map((r) => ({ ...r, product_name: productMap[r.product_id] ?? { ru: 'Удалён', uz: 'O\'chirilgan' } }));
  },

  update: async (id: string, updates: Partial<Review>) => {
    if (!isSupabaseConfigured) { await delay(); return; }
    await adminQueries.updateReview(id, { ...updates, updated_at: new Date().toISOString() });
  },

  approve: async (id: string) => {
    if (!isSupabaseConfigured) return;
    await adminQueries.approveReview(id);
  },

  reject: async (id: string) => {
    if (!isSupabaseConfigured) return;
    await adminQueries.rejectReview(id);
  },

  reply: async (id: string, reply: string) => {
    if (!isSupabaseConfigured) return;
    await adminQueries.replyToReview(id, reply);
  },
};

export const promotionQueries = {
  getActive: async (type?: 'new_arrival' | 'sale' | 'featured') => {
    if (!isSupabaseConfigured) { await delay(); return []; }
    let query = supabase.from('promotions').select('*').eq('is_active', true).lte('starts_at', new Date().toISOString()).or(`ends_at.is.null,ends_at.gte.${new Date().toISOString()}`);
    if (type) query = query.eq('type', type);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  getProductsByPromotion: async (promotionId: string) => {
    if (!isSupabaseConfigured) { await delay(); return []; }
    const { data: promo } = await supabase.from('promotions').select('product_ids').eq('id', promotionId).maybeSingle();
    if (!promo?.product_ids?.length) return [];
    const { data, error } = await supabase.from('products').select('*').in('id', promo.product_ids).eq('is_active', true);
    if (error) throw error;
    return data;
  },
};

export const productCollectionQueries = {
  getActive: async (): Promise<ProductCollection[]> => {
    if (!isSupabaseConfigured) { await delay(); return []; }
    const { data, error } = await supabase.from('product_collections').select('*').eq('is_active', true).order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ProductCollection[];
  },

  getAll: async (): Promise<ProductCollection[]> => {
    if (!isSupabaseConfigured) { await delay(); return []; }
    const { data, error } = await supabase.from('product_collections').select('*').order('sort_order', { ascending: true });
    if (error) throw error;
    return (data ?? []) as ProductCollection[];
  },

  getCollectionProducts: async (productIds: string[]) => {
    if (!isSupabaseConfigured || !productIds.length) return [];
    const { data, error } = await supabase.from('products').select('*').in('id', productIds).eq('is_active', true);
    if (error) throw error;
    const map = new Map((data ?? []).map(p => [p.id, p]));
    return productIds.map(id => map.get(id)).filter(Boolean) as import('./products').Product[];
  },

  create: async (data: Database['public']['Tables']['product_collections']['Insert']) => {
    if (!isSupabaseConfigured) { await delay(); return { ...data, id: `col-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as ProductCollection; }
    return adminQueries.createCollection(data as Record<string, unknown>);
  },

  update: async (id: string, data: Database['public']['Tables']['product_collections']['Update']) => {
    if (!isSupabaseConfigured) { await delay(); return { id, ...data } as ProductCollection; }
    return adminQueries.updateCollection(id, data as Record<string, unknown>);
  },

  delete: async (id: string) => {
    if (!isSupabaseConfigured) { await delay(); return; }
    await adminQueries.deleteCollection(id);
  },
};

export const productRelationQueries = {
  getRelated: async (productId: string, type?: ProductRelation['relation_type']) => {
    if (!isSupabaseConfigured) return [];
    let query = supabase.from('product_relations').select('*, products!product_relations_related_product_id_fkey(*)').eq('product_id', productId).order('sort_order');
    if (type) query = query.eq('relation_type', type);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  },

  getUpsells: (productId: string) => productRelationQueries.getRelated(productId, 'upsell'),
  getCrossSells: (productId: string) => productRelationQueries.getRelated(productId, 'cross_sell'),

  create: async (relation: Omit<ProductRelation, 'id' | 'created_at'>) => {
    if (!isSupabaseConfigured) return { ...relation, id: `pr-${Date.now()}`, created_at: new Date().toISOString() } as ProductRelation;
    return adminQueries.createProductRelation(relation as Record<string, unknown>);
  },

  delete: async (id: string) => {
    if (!isSupabaseConfigured) return;
    await adminQueries.deleteProductRelation(id);
  },
};
