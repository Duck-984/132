import { supabase, isSupabaseConfigured, Database } from '../supabase';
import { adminQueries } from '../adminApi';
import { mockProducts, mockCategories } from './mock';

export type Product = Database['public']['Tables']['products']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];

export interface ProductFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  inStock?: boolean;
  search?: string;
}

export interface ProductSort {
  field: 'created_at' | 'price' | 'views';
  order: 'asc' | 'desc';
}

export const PAGE_SIZE = 20;

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const productQueries = {
  getAll: async (filters?: ProductFilters, sort?: ProductSort, offset = 0, limit = PAGE_SIZE) => {
    if (!isSupabaseConfigured) {
      await delay();
      let items = [...mockProducts].filter((p) => p.is_active);
      if (filters?.categoryId) items = items.filter((p) => p.category_id === filters.categoryId);
      if (filters?.minPrice !== undefined) items = items.filter((p) => p.price >= filters.minPrice!);
      if (filters?.maxPrice !== undefined) items = items.filter((p) => p.price <= filters.maxPrice!);
      if (filters?.inStock) items = items.filter((p) => p.stock > 0);
      if (filters?.search) {
        const q = filters.search.toLowerCase();
        items = items.filter((p) => p.name.ru.toLowerCase().includes(q) || p.name.uz.toLowerCase().includes(q));
      }
      if (filters?.sizes?.length) items = items.filter((p) => p.sizes.some((s) => filters.sizes!.includes(s)));
      if (filters?.colors?.length) items = items.filter((p) => p.colors.some((c) => filters.colors!.includes(c.hex)));
      if (sort) items.sort((a, b) => sort.order === 'asc' ? (a[sort.field] as number) - (b[sort.field] as number) : (b[sort.field] as number) - (a[sort.field] as number));
      return { items: items.slice(offset, offset + limit), total: items.length };
    }

    let query = supabase.from('products').select('*', { count: 'exact' }).eq('is_active', true);

    if (filters?.categoryId) query = query.eq('category_id', filters.categoryId);
    if (filters?.minPrice !== undefined) query = query.gte('price', filters.minPrice);
    if (filters?.maxPrice !== undefined) query = query.lte('price', filters.maxPrice);
    if (filters?.search?.trim()) {
      const s = filters.search.replace(/[%_()]/g, '\\$&');
      query = query.or(`name->ru.ilike.%${s}%,name->uz.ilike.%${s}%,description->ru.ilike.%${s}%,description->uz.ilike.%${s}%`);
    }
    if (filters?.inStock) query = query.gt('stock', 0);
    if (sort) {
      query = query.order(sort.field, { ascending: sort.order === 'asc' });
    } else {
      query = query.order('created_at', { ascending: false });
    }
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;
    if (error) throw error;

    let filteredData = data || [];
    if (filters?.sizes?.length) filteredData = filteredData.filter(p => p.sizes.some((s: string) => filters.sizes!.includes(s)));
    if (filters?.colors?.length) filteredData = filteredData.filter(p => p.colors.some((c: { hex: string }) => filters.colors!.includes(c.hex)));

    return { items: filteredData, total: count ?? 0 };
  },

  getBySlug: async (slug: string) => {
    if (!isSupabaseConfigured) { await delay(); return mockProducts.find((p) => p.slug === slug) ?? null; }
    const { data, error } = await supabase.from('products').select('*').eq('slug', slug).maybeSingle();
    if (error) throw error;
    return data;
  },

  incrementViews: async (id: string) => {
    if (!isSupabaseConfigured) return;
    await supabase.rpc('increment_views', { p_id: id });
  },

  uploadImages: async (files: File[]) => {
    if (!isSupabaseConfigured) return files.map(() => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80');
    return Promise.all(files.map(async (file) => {
      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('product-images').upload(path, file);
      if (error) throw error;
      return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl;
    }));
  },
};

export const inventoryQueries = {
  updateStock: async (productId: string, newStock: number) => {
    if (!isSupabaseConfigured) { await delay(); return { id: productId, stock: newStock }; }
    const data = await adminQueries.updateProduct(productId, { stock: newStock, updated_at: new Date().toISOString() });
    return { id: productId, stock: (data as { stock: number }).stock };
  },

  adjustStock: async (productId: string, delta: number) => {
    if (!isSupabaseConfigured) { await delay(); return { id: productId, stock: 0 }; }
    const products = await adminQueries.getProducts() as Array<{ id: string; stock: number }>;
    const p = products.find((p) => p.id === productId);
    const newStock = Math.max(0, (p?.stock ?? 0) + delta);
    const updated = await adminQueries.updateProduct(productId, { stock: newStock, updated_at: new Date().toISOString() });
    return { id: productId, stock: (updated as { stock: number }).stock };
  },

  getAllWithStock: async () => {
    if (!isSupabaseConfigured) { await delay(); return mockProducts; }
    const { data, error } = await supabase.from('products').select('id, name, slug, price, stock, images, is_active, category_id').order('stock', { ascending: true });
    if (error) throw error;
    return data ?? [];
  },
};

export type CategoryWithCount = Category & { product_count: number };

export const categoryQueries = {
  getAll: async () => {
    if (!isSupabaseConfigured) { await delay(); return mockCategories; }
    const { data, error } = await supabase.from('categories').select('*').order('name->ru');
    if (error) throw error;
    return data;
  },

  getAllWithProductCount: async (): Promise<CategoryWithCount[]> => {
    if (!isSupabaseConfigured) { await delay(); return mockCategories.map((c) => ({ ...c, product_count: 0 })); }
    const [{ data: categories, error: catError }, { data: products }] = await Promise.all([
      supabase.from('categories').select('*').order('name->ru'),
      supabase.from('products').select('category_id'),
    ]);
    if (catError) throw catError;
    const counts: Record<string, number> = {};
    (products ?? []).forEach((p) => { if (p.category_id) counts[p.category_id] = (counts[p.category_id] ?? 0) + 1; });
    return (categories ?? []).map((c) => ({ ...c, product_count: counts[c.id] ?? 0 }));
  },

  create: async (data: Database['public']['Tables']['categories']['Insert']) => {
    if (!isSupabaseConfigured) { await delay(); return { ...data, id: `cat-${Date.now()}`, created_at: new Date().toISOString() } as Category; }
    return adminQueries.createCategory(data as Record<string, unknown>);
  },

  update: async (id: string, data: Database['public']['Tables']['categories']['Update']) => {
    if (!isSupabaseConfigured) { await delay(); return data as Category; }
    return adminQueries.updateCategory(id, data as Record<string, unknown>);
  },

  delete: async (id: string) => {
    if (!isSupabaseConfigured) { await delay(); return; }
    await adminQueries.deleteCategory(id);
  },
};
