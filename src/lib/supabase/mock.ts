import type { Database, OrderItem, CustomerInfo, StatusHistoryEntry } from '../supabase';

type Product = Database['public']['Tables']['products']['Row'];
type Category = Database['public']['Tables']['categories']['Row'];
type Order = Database['public']['Tables']['orders']['Row'];
type Banner = { id: string; title: { ru: string; uz: string }; subtitle: { ru: string; uz: string }; image_url: string; link_url: string | null; link_label: { ru: string; uz: string } | null; bg_color: string; is_active: boolean; sort_order: number; created_at: string; updated_at: string };
type DeliveryZone = { id: string; city_ru: string; city_uz: string; region_ru: string; region_uz: string; standard_price: number; express_price: number; standard_days_min: number; standard_days_max: number; express_days_min: number; express_days_max: number; free_threshold: number | null; is_active: boolean; sort_order: number; created_at: string; updated_at: string };

const now = new Date().toISOString();

export const mockCategories: Category[] = [
  { id: 'cat-1', name: { ru: 'Футболки', uz: 'Futbolka' }, slug: 'tshirts', icon: 'shirt', created_at: now },
  { id: 'cat-2', name: { ru: 'Худи', uz: 'Xudi' }, slug: 'hoodies', icon: 'hoodie', created_at: now },
  { id: 'cat-3', name: { ru: 'Аксессуары', uz: 'Aksessuarlar' }, slug: 'accessories', icon: 'cap', created_at: now },
];

export const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: { ru: 'Футболка StyleTech', uz: 'StyleTech Futbolka' },
    slug: 'futbolka-styletech',
    price: 199000,
    description: { ru: 'Классическая футболка из хлопка премиум качества. Минималистичный дизайн, идеальная посадка.', uz: 'Premium paxtadan tayyorlangan klassik futbolka. Minimalistik dizayn, mukammal o\'lcham.' },
    category_id: 'cat-1',
    subcategory: null,
    images: [
      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&q=80',
      'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=600&q=80',
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Чёрный', hex: '#0E0E0E' },
      { name: 'Белый', hex: '#FFFFFF' },
      { name: 'Бежевый', hex: '#DDD6CE' },
    ],
    specs: {},
    stock: 25,
    is_active: true,
    views: 142,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'prod-2',
    name: { ru: 'Футболка Logo', uz: 'Logo Futbolka' },
    slug: 'futbolka-logo',
    price: 199000,
    description: { ru: 'Минималистичная футболка с логотипом бренда.', uz: 'Brend logosi bilan minimalistik futbolka.' },
    category_id: 'cat-1',
    subcategory: null,
    images: [
      'https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?w=600&q=80',
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Чёрный', hex: '#0E0E0E' },
      { name: 'Белый', hex: '#FFFFFF' },
    ],
    specs: {},
    stock: 18,
    is_active: true,
    views: 89,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'prod-3',
    name: { ru: 'Худи StyleTech', uz: 'StyleTech Xudi' },
    slug: 'xudi-styletech',
    price: 399000,
    description: { ru: 'Тёплое худи из плотного хлопка. Идеально для прохладной погоды.', uz: 'Qalin paxtadan tayyorlangan iliq xudi. Salqin ob-havo uchun mukammal.' },
    category_id: 'cat-2',
    subcategory: null,
    images: [
      'https://images.unsplash.com/photo-1556821840-3a63f7563303?w=600&q=80',
    ],
    sizes: ['M', 'L', 'XL'],
    colors: [
      { name: 'Чёрный', hex: '#0E0E0E' },
      { name: 'Серый', hex: '#8F8F8F' },
    ],
    specs: {},
    stock: 12,
    is_active: true,
    views: 203,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'prod-4',
    name: { ru: 'Кепка StyleTech', uz: 'StyleTech Keпka' },
    slug: 'kepka-styletech',
    price: 129000,
    description: { ru: 'Стильная бейсболка с вышитым логотипом.', uz: 'Tikilgan logosi bilan zamonaviy keпka.' },
    category_id: 'cat-3',
    subcategory: null,
    images: [
      'https://images.unsplash.com/photo-1588850561407-ed78c334e67a?w=600&q=80',
    ],
    sizes: ['S/M', 'L/XL'],
    colors: [
      { name: 'Чёрный', hex: '#0E0E0E' },
      { name: 'Белый', hex: '#FFFFFF' },
    ],
    specs: {},
    stock: 30,
    is_active: true,
    views: 67,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'prod-5',
    name: { ru: 'Худи Logo', uz: 'Logo Xudi' },
    slug: 'xudi-logo',
    price: 349000,
    description: { ru: 'Базовое худи с минималистичным логотипом.', uz: 'Minimalistik logoli asosiy xudi.' },
    category_id: 'cat-2',
    subcategory: null,
    images: [
      'https://images.unsplash.com/photo-1578768079470-389ab161be61?w=600&q=80',
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Белый', hex: '#FFFFFF' },
      { name: 'Бежевый', hex: '#DDD6CE' },
    ],
    specs: {},
    stock: 8,
    is_active: true,
    views: 156,
    created_at: now,
    updated_at: now,
  },
  {
    id: 'prod-6',
    name: { ru: 'Футболка Premium', uz: 'Premium Futbolka' },
    slug: 'futbolka-premium',
    price: 249000,
    description: { ru: 'Премиальная футболка из органического хлопка с увеличенной плотностью ткани.', uz: 'Organik paxtadan tayyorlangan premium futbolka.' },
    category_id: 'cat-1',
    subcategory: null,
    images: [
      'https://images.unsplash.com/photo-1562157873-818bc0726f68?w=600&q=80',
    ],
    sizes: ['S', 'M', 'L', 'XL'],
    colors: [
      { name: 'Чёрный', hex: '#0E0E0E' },
    ],
    specs: {},
    stock: 3,
    is_active: true,
    views: 98,
    created_at: now,
    updated_at: now,
  },
];

export const mockOrders: Order[] = [
  {
    id: 'ord-001',
    telegram_user_id: 123456,
    items: [
      { productId: 'prod-1', name: { ru: 'Футболка StyleTech', uz: 'StyleTech Futbolka' }, price: 199000, quantity: 2, size: 'M', color: 'Чёрный', image: mockProducts[0].images[0] } as OrderItem,
    ] as OrderItem[],
    total_amount: 398000,
    status: 'delivered',
    customer_info: { name: 'Алишер Т.', phone: '+998 90 123 45 67', city: 'Ташкент', address: 'ул. Ташкент, 15' } as CustomerInfo,
    delivery_type: 'standard',
    delivery_cost: 20000,
    payment_method: 'click',
    notes: null,
    transaction_id: null,
    paid_at: now,
    coupon_id: null,
    discount_amount: 0,
    status_history: [
      { status: 'new', changed_at: now, changed_by: 'System' },
      { status: 'delivered', changed_at: now, changed_by: 'Admin' },
    ] as StatusHistoryEntry[],
    created_at: now,
    updated_at: now,
  },
];

export const mockBanners: Banner[] = [];

export const mockDeliveryZones: DeliveryZone[] = [
  { id: 'zone-1', city_ru: 'Ташкент', city_uz: 'Toshkent', region_ru: 'г. Ташкент', region_uz: 'Toshkent shahri', standard_price: 20000, express_price: 50000, standard_days_min: 3, standard_days_max: 5, express_days_min: 1, express_days_max: 2, free_threshold: 500000, is_active: true, sort_order: 1, created_at: now, updated_at: now },
  { id: 'zone-2', city_ru: 'Самарканд', city_uz: 'Samarqand', region_ru: 'Самаркандская обл.', region_uz: 'Samarqand viloyati', standard_price: 30000, express_price: 70000, standard_days_min: 4, standard_days_max: 6, express_days_min: 2, express_days_max: 3, free_threshold: null, is_active: true, sort_order: 2, created_at: now, updated_at: now },
];

export const mockAdminAccounts = [
  { id: 'admin-1', email: 'admin@styletech.uz', first_name: 'Admin', role: 'admin' as const, is_active: true, created_at: now, last_login_at: now },
];
