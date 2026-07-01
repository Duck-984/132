import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package, ShoppingBag, DollarSign, LogOut, Users, TrendingUp,
  Image, BarChart2, ArrowUpRight, ShoppingCart, Truck, Calendar,
  Tag, RotateCcw, Shield, FolderTree, MessageSquare, Layers, Bell,
} from 'lucide-react';
import {
  getCurrentAdmin, logoutAdmin,
  canManageUsers, canManageOrders, canManageBanners, canManageDelivery,
  canManageCoupons, canViewAuditLog,
  ROLE_LABELS,
} from '../../lib/auth';
import { formatPrice } from '../../lib/utils';
import { supabase, type OrderItem, type Database } from '../../lib/supabase';
import { getStatusInfo } from '../../lib/orderStatuses';

interface SalesDay { date: string; revenue: number; orders: number }
interface TopProduct { name: string; orders: number; revenue: number }

type Period = '7d' | '30d' | 'all';

interface DashStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalUsers: number;
  recentOrders: Database['public']['Tables']['orders']['Row'][];
  salesByDay: SalesDay[];
  topProducts: TopProduct[];
  ordersByStatus: Record<string, number>;
  avgOrderValue: number;
  activeBanners: number;
  newUsersCount: number;
}

const EMPTY_STATS: DashStats = {
  totalOrders: 0,
  totalRevenue: 0,
  totalProducts: 0,
  totalUsers: 0,
  recentOrders: [],
  salesByDay: [],
  topProducts: [],
  ordersByStatus: {},
  avgOrderValue: 0,
  activeBanners: 0,
  newUsersCount: 0,
};

const STATUS_BAR_COLORS: Record<string, string> = {
  new: 'bg-surface-400',
  processing: 'bg-surface-600',
  assembling: 'bg-yellow-500',
  assembled: 'bg-amber-500',
  shipping: 'bg-orange-500',
  delivered: 'bg-surface-900',
  cancelled: 'bg-red-300',
  return_requested: 'bg-rose-500',
  returned: 'bg-slate-400',
  paid: 'bg-green-500',
  shipped: 'bg-surface-500',
};

const PERIOD_LABELS: Record<Period, string> = {
  '7d': '7 дней',
  '30d': '30 дней',
  'all': 'Всё время',
};

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const [stats, setStats] = useState<DashStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('7d');
  const [pendingCounts, setPendingCounts] = useState({ orders: 0, reviews: 0, returns: 0 });

  const loadPendingCounts = useCallback(async () => {
    const [ordersRes, reviewsRes, returnsRes] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('is_approved', false),
      supabase.from('returns').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    setPendingCounts({
      orders: ordersRes.count ?? 0,
      reviews: reviewsRes.count ?? 0,
      returns: returnsRes.count ?? 0,
    });
  }, []);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();
      let dateFrom: string | null = null;

      if (period === '7d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        dateFrom = d.toISOString().slice(0, 10);
      } else if (period === '30d') {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        dateFrom = d.toISOString().slice(0, 10);
      }

      let ordersQuery = supabase
        .from('orders')
        .select('total_amount, status, created_at, items', { count: 'exact' });
      if (dateFrom) {
        ordersQuery = ordersQuery.gte('created_at', dateFrom + 'T00:00:00');
      }

      const [ordersRes, productsRes, recentRes, bannersRes, usersRes] = await Promise.all([
        ordersQuery,
        supabase.from('products').select('id', { count: 'exact' }),
        supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(6),
        supabase.from('banners').select('id', { count: 'exact' }).eq('is_active', true),
        supabase.from('users').select('id', { count: 'exact' }),
      ]);

      const allOrders = ordersRes.data ?? [];
      const totalRevenue = allOrders.reduce((s, o) => s + Number(o.total_amount), 0);
      const avgOrderValue = allOrders.length ? totalRevenue / allOrders.length : 0;

      const days = period === '7d' ? 7 : period === '30d' ? 30 : 14;
      const salesByDay: SalesDay[] = Array.from({ length: days }, (_, i) => {
        const d = new Date(now);
        d.setDate(d.getDate() - (days - 1 - i));
        const dateStr = d.toISOString().slice(0, 10);
        const dayOrders = allOrders.filter(o => o.created_at.slice(0, 10) === dateStr);
        return {
          date: dateStr,
          revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
          orders: dayOrders.length,
        };
      });

      const ordersByStatus: Record<string, number> = {};
      allOrders.forEach(o => {
        ordersByStatus[o.status] = (ordersByStatus[o.status] ?? 0) + 1;
      });

      const productMap: Record<string, { name: string; orders: number; revenue: number }> = {};
      allOrders.forEach(order => {
        const items = order.items as OrderItem[];
        if (!Array.isArray(items)) return;
        items.forEach((item: OrderItem) => {
          const key = item.productId ?? 'unknown';
          const itemName = typeof item.name === 'object' ? (item.name as { ru: string; uz: string }).ru : item.name;
          if (!productMap[key]) {
            productMap[key] = { name: itemName ?? key, orders: 0, revenue: 0 };
          }
          productMap[key].orders += item.quantity ?? 1;
          productMap[key].revenue += (item.price ?? 0) * (item.quantity ?? 1);
        });
      });
      const topProducts = Object.values(productMap)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      setStats({
        totalOrders: ordersRes.count ?? 0,
        totalRevenue,
        totalProducts: productsRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        recentOrders: recentRes.data ?? [],
        salesByDay,
        topProducts,
        ordersByStatus,
        avgOrderValue,
        activeBanners: bannersRes.count ?? 0,
        newUsersCount: usersRes.count ?? 0,
      });
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => { loadStats(); loadPendingCounts(); }, [loadStats, loadPendingCounts]);

  // Refresh pending counts every 30s
  useEffect(() => {
    const t = setInterval(loadPendingCounts, 30_000);
    return () => clearInterval(t);
  }, [loadPendingCounts]);

  const handleLogout = () => { logoutAdmin(); navigate('/admin'); };

  if (!admin) return null;

  const maxDayRevenue = Math.max(...stats.salesByDay.map(d => d.revenue), 1);

  const dateFormat = period === '30d'
    ? { day: 'numeric' as const, month: 'short' as const }
    : { day: 'numeric' as const, month: 'short' as const };
  const showEvery = period === '30d' ? 4 : 1;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-surface-900 flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-surface-900 dark:text-white leading-none">KUPI Shop</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Панель управления</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {(pendingCounts.orders + pendingCounts.reviews + pendingCounts.returns) > 0 && (
              <Link to="/admin/orders" className="relative">
                <Bell className="w-5 h-5 text-surface-600 dark:text-surface-400" />
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-white text-2xs font-bold flex items-center justify-center leading-none">
                  {pendingCounts.orders + pendingCounts.reviews + pendingCounts.returns}
                </span>
              </Link>
            )}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-surface-900 dark:text-white leading-none">{admin.first_name}</p>
              <p className="text-xs mt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded-full font-medium ${
                  admin.role === 'admin'
                    ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    : admin.role === 'manager'
                    ? 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300'
                    : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300'
                }`}>
                  {ROLE_LABELS[admin.role]}
                </span>
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* Pending alerts */}
        {(pendingCounts.orders > 0 || pendingCounts.reviews > 0 || pendingCounts.returns > 0) && (
          <div className="flex flex-wrap gap-3">
            {pendingCounts.orders > 0 && (
              <Link to="/admin/orders" className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-900/30 transition group">
                <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <Package className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">Новые заказы</p>
                  <p className="text-lg font-bold text-amber-900 dark:text-amber-300 leading-none">{pendingCounts.orders}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-500 ml-1 opacity-0 group-hover:opacity-100 transition" />
              </Link>
            )}
            {pendingCounts.reviews > 0 && (
              <Link to="/admin/reviews" className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/30 transition group">
                <div className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-semibold">Отзывы на модерации</p>
                  <p className="text-lg font-bold text-blue-900 dark:text-blue-300 leading-none">{pendingCounts.reviews}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-blue-500 ml-1 opacity-0 group-hover:opacity-100 transition" />
              </Link>
            )}
            {pendingCounts.returns > 0 && (
              <Link to="/admin/returns" className="flex items-center gap-2.5 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition group">
                <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                  <RotateCcw className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-xs text-red-700 dark:text-red-400 font-semibold">Заявки на возврат</p>
                  <p className="text-lg font-bold text-red-900 dark:text-red-300 leading-none">{pendingCounts.returns}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-red-500 ml-1 opacity-0 group-hover:opacity-100 transition" />
              </Link>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-surface-900 dark:text-white">Обзор</h2>
          <div className="flex items-center gap-1 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl p-1">
            <Calendar className="w-4 h-4 text-surface-400 ml-2" />
            {(['7d', '30d', 'all'] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  period === p
                    ? 'bg-brand-600 text-white'
                    : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Заказов"
            value={loading ? null : stats.totalOrders}
            icon={<ShoppingCart className="w-5 h-5 text-surface-700" />}
            iconBg="bg-surface-100"
            sub={period === 'all' ? 'за всё время' : `за ${PERIOD_LABELS[period]}`}
          />
          <KpiCard
            label="Выручка"
            value={loading ? null : formatPrice(stats.totalRevenue)}
            icon={<TrendingUp className="w-5 h-5 text-surface-700" />}
            iconBg="bg-surface-100"
            sub={period === 'all' ? 'за всё время' : `за ${PERIOD_LABELS[period]}`}
          />
          <KpiCard
            label="Средний чек"
            value={loading ? null : formatPrice(stats.avgOrderValue)}
            icon={<DollarSign className="w-5 h-5 text-surface-700" />}
            iconBg="bg-surface-100"
            sub="на заказ"
          />
          <KpiCard
            label="Покупатели"
            value={loading ? null : stats.totalUsers}
            icon={<Users className="w-5 h-5 text-surface-700" />}
            iconBg="bg-surface-100"
            sub="всего"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-2 gap-4">
          <KpiCard
            label="Товары"
            value={loading ? null : stats.totalProducts}
            icon={<Package className="w-5 h-5 text-surface-700" />}
            iconBg="bg-surface-100"
            sub="в каталоге"
          />
          <KpiCard
            label="Активные баннеры"
            value={loading ? null : stats.activeBanners}
            icon={<Image className="w-5 h-5 text-surface-700" />}
            iconBg="bg-surface-100"
            sub="показываются"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-surface-900 dark:text-white">
                  Продажи {period !== 'all' ? `за ${PERIOD_LABELS[period]}` : '(последние 14 дней)'}
                </h2>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">Выручка по дням</p>
              </div>
              <BarChart2 className="w-5 h-5 text-surface-400 dark:text-surface-500" />
            </div>
            {loading ? (
              <div className="flex items-center justify-center h-36">
                <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex items-end gap-1 h-36">
                {stats.salesByDay.map((day, idx) => {
                  const pct = maxDayRevenue > 0 ? (day.revenue / maxDayRevenue) * 100 : 0;
                  const showLabel = showEvery === 1 || idx % showEvery === 0;
                  const label = new Date(day.date).toLocaleDateString('ru-RU', dateFormat);
                  return (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                        {formatPrice(day.revenue)} · {day.orders} заказ.
                      </div>
                      <div className="w-full flex items-end" style={{ height: '100px' }}>
                        <div
                          className={`w-full rounded-t-lg transition-all duration-300 ${day.revenue > 0 ? 'bg-brand-600 hover:bg-brand-700' : 'bg-surface-100 dark:bg-surface-700'}`}
                          style={{ height: `${Math.max(pct, pct > 0 ? 4 : 2)}%` }}
                        />
                      </div>
                      {showLabel && (
                        <span className="text-[9px] text-surface-400 dark:text-surface-500 whitespace-nowrap leading-tight">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-6">
            <h2 className="font-bold text-surface-900 dark:text-white mb-1">Статусы заказов</h2>
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-5">Распределение</p>
            {loading ? (
              <div className="flex items-center justify-center h-36">
                <span className="w-6 h-6 border-3 border-surface-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : Object.keys(stats.ordersByStatus).length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-8">Заказов нет</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(stats.ordersByStatus)
                  .sort(([, a], [, b]) => b - a)
                  .map(([status, count]) => {
                    const total = stats.totalOrders || 1;
                    const pct = Math.round((count / total) * 100);
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-surface-600 dark:text-surface-400">{getStatusInfo(status).label_ru}</span>
                          <span className="text-xs font-semibold text-surface-900 dark:text-white">{count} ({pct}%)</span>
                        </div>
                        <div className="h-1.5 bg-surface-100 dark:bg-surface-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${STATUS_BAR_COLORS[status] ?? 'bg-surface-400'} transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="flex flex-col gap-3">
            <NavCard to="/admin/products" icon={<ShoppingBag className="w-5 h-5" />} label="Товары" sub="Добавить, редактировать" />
            <NavCard to="/admin/categories" icon={<FolderTree className="w-5 h-5" />} label="Категории" sub="Управление категориями" />
            <NavCard to="/admin/collections" icon={<Layers className="w-5 h-5" />} label="Подборки" sub="Секции в каталоге" />
            {canManageOrders(admin) && (
              <NavCard to="/admin/orders" icon={<Package className="w-5 h-5" />} label="Заказы" sub="Просмотр и статусы" />
            )}
            {canManageBanners(admin) && (
              <NavCard to="/admin/banners" icon={<Image className="w-5 h-5" />} label="Баннеры" sub={`${stats.activeBanners} активных`} />
            )}
            <NavCard to="/admin/reviews" icon={<MessageSquare className="w-5 h-5" />} label="Отзывы" sub="Модерация и ответы" />
            {canManageDelivery(admin) && (
              <NavCard to="/admin/delivery" icon={<Truck className="w-5 h-5" />} label="Доставка" sub="Тарифы по регионам" />
            )}
            {canManageUsers(admin) && (
              <NavCard to="/admin/users" icon={<Users className="w-5 h-5" />} label="Пользователи" sub="Роли и доступы" />
            )}
            {canManageCoupons(admin) && (
              <NavCard to="/admin/coupons" icon={<Tag className="w-5 h-5" />} label="Купоны" sub="Промо-механики" />
            )}
            {canManageOrders(admin) && (
              <NavCard to="/admin/returns" icon={<RotateCcw className="w-5 h-5" />} label="Возвраты" sub="Заявки на возврат" />
            )}
            {canViewAuditLog(admin) && (
              <NavCard to="/admin/audit" icon={<Shield className="w-5 h-5" />} label="Audit Log" sub="История действий" />
            )}
          </div>

          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-700">
              <h2 className="font-bold text-surface-900 dark:text-white text-sm">Топ товаров</h2>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">По выручке · {PERIOD_LABELS[period]}</p>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-6 h-6 border-3 border-surface-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats.topProducts.length === 0 ? (
              <p className="text-sm text-surface-400 text-center py-10">Нет данных</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-surface-700/50">
                {stats.topProducts.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                      i === 0 ? 'bg-brand-600 text-white'
                      : i === 1 ? 'bg-surface-200 dark:bg-surface-600 text-surface-700 dark:text-surface-200'
                      : i === 2 ? 'bg-surface-300 text-surface-800'
                      : 'bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-surface-900 dark:text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-surface-500 dark:text-surface-400">{p.orders} шт.</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-surface-900 dark:text-white whitespace-nowrap">{formatPrice(p.revenue)}</p>
                      <p className="flex items-center justify-end gap-0.5 text-[10px] text-surface-500">
                        <ArrowUpRight className="w-2.5 h-2.5" />
                        <span>выручка</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-surface-900 dark:text-white text-sm">Последние заказы</h2>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">6 последних</p>
              </div>
              {canManageOrders(admin) && (
                <Link to="/admin/orders" className="text-xs text-surface-900 dark:text-white hover:underline font-medium">
                  Все
                </Link>
              )}
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-6 h-6 border-3 border-surface-900 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : stats.recentOrders.length === 0 ? (
              <p className="text-sm text-surface-400 dark:text-surface-500 text-center py-10">Заказов пока нет</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-surface-700/50">
                {stats.recentOrders.map((order) => (
                  <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-surface-900 dark:text-white">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[10px] text-surface-500 dark:text-surface-400 mt-0.5">
                        {new Date(order.created_at).toLocaleDateString('ru-RU', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getStatusInfo(order.status).color}`}>
                        {getStatusInfo(order.status).label_ru}
                      </span>
                      <p className="text-xs font-bold text-surface-900 dark:text-white whitespace-nowrap">
                        {formatPrice(Number(order.total_amount))}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

function KpiCard({
  label, value, icon, iconBg, sub,
}: {
  label: string;
  value: string | number | null;
  icon: React.ReactNode;
  iconBg: string;
  sub?: string;
}) {
  return (
    <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 border border-surface-200 dark:border-surface-700">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-surface-500 dark:text-surface-400 font-medium">{label}</p>
          <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1 truncate">
            {value === null ? '—' : value}
          </p>
          {sub && <p className="text-xs text-surface-400 dark:text-surface-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function NavCard({
  to, icon, label, sub,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-4 bg-white dark:bg-surface-800 rounded-2xl p-4 border border-surface-200 dark:border-surface-700 hover:shadow-md transition group"
    >
      <div className="w-10 h-10 rounded-xl flex items-center justify-center transition bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 group-hover:bg-surface-200 dark:group-hover:bg-surface-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-surface-900 dark:text-white text-sm">{label}</p>
        <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{sub}</p>
      </div>
      <ArrowUpRight className="w-4 h-4 text-surface-300 dark:text-surface-600 group-hover:text-surface-500 dark:group-hover:text-surface-400 transition flex-shrink-0" />
    </Link>
  );
}
