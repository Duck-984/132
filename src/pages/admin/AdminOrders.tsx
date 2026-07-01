import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Clock, User, MapPin, Package, History, Inbox, Hourglass, Archive, Search, X } from 'lucide-react';
import { Database, type StatusHistoryEntry, type CustomerInfo, type OrderItem } from '../../lib/supabase';
import { getCurrentAdmin, ROLE_LABELS } from '../../lib/auth';
import { formatPrice } from '../../lib/utils';
import { toast } from '../../components/Toast';
import { ORDER_STATUSES, getStatusInfo } from '../../lib/orderStatuses';
import { adminQueries } from '../../lib/adminApi';
import { auditLogQueries } from '../../lib/supabase/queries';

type Order = Database['public']['Tables']['orders']['Row'];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const StatusBadge = ({ status }: { status: string }) => {
  const info = getStatusInfo(status);
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${info.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${info.dot}`} />
      {info.label_ru}
    </span>
  );
};

type TabType = 'new' | 'pending' | 'archive';

const ARCHIVE_STATUSES = ['delivered', 'cancelled', 'returned', 'return_requested'];

export const AdminOrders = () => {
  const admin = getCurrentAdmin();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [historyId, setHistoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('new');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await adminQueries.getOrders();
      setOrders(data ?? []);
    } catch {
      toast.error('Не удалось загрузить заказы.');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    if (updatingId) return;
    setUpdatingId(orderId);
    try {
      const updatedOrder = await adminQueries.updateOrderStatus(
        orderId,
        newStatus,
        admin?.first_name ?? 'Admin'
      );

      setOrders((prev) =>
        prev.map((o) =>
          o.id === orderId ? { ...o, ...updatedOrder } : o
        )
      );
      const label = getStatusInfo(newStatus).label_ru;
      toast.success(`Статус изменён: ${label}`);

      auditLogQueries.log({
        admin_id: admin?.id ?? 'unknown',
        action: 'status_change',
        entity_type: 'orders',
        entity_id: orderId,
        details: { new_status: newStatus, admin_name: admin?.first_name },
      }).catch(() => {});
    } catch {
      toast.error('Ошибка при обновлении статуса.');
    } finally {
      setUpdatingId(null);
    }
  };

  const trimmedSearch = searchQuery.trim().toLowerCase();

  const { newOrders, pendingOrders, archiveOrders, counts } = useMemo(() => {
    const matchesSearch = (order: Order): boolean => {
      if (!trimmedSearch) return true;
      const info = order.customer_info as CustomerInfo;
      const nameMatch = info?.name?.toLowerCase().includes(trimmedSearch);
      const phoneMatch = info?.phone?.toLowerCase().includes(trimmedSearch);
      const idMatch = order.id.toLowerCase().includes(trimmedSearch);
      return !!(nameMatch || phoneMatch || idMatch);
    };

    const newOrders = orders.filter(o => o.status === 'new' && matchesSearch(o));
    const pendingOrders = orders.filter(o => ['processing', 'assembling', 'assembled', 'shipping', 'paid', 'shipped'].includes(o.status ?? '') && matchesSearch(o));
    const archiveOrders = orders.filter(o => ARCHIVE_STATUSES.includes(o.status ?? '') && matchesSearch(o));
    return {
      newOrders,
      pendingOrders,
      archiveOrders,
      counts: {
        new: orders.filter(o => o.status === 'new').length,
        pending: orders.filter(o => ['processing', 'assembling', 'assembled', 'shipping', 'paid', 'shipped'].includes(o.status ?? '')).length,
        archive: orders.filter(o => ARCHIVE_STATUSES.includes(o.status ?? '')).length,
      },
    };
  }, [orders, trimmedSearch]);

  const displayedOrders = activeTab === 'new' ? newOrders : activeTab === 'pending' ? pendingOrders : archiveOrders;

  if (!admin) return null;

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="p-2 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-bold text-surface-900 dark:text-white">Заказы</h1>
              <p className="text-xs text-surface-500 dark:text-surface-400">{orders.length} всего</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-surface-900 dark:text-white leading-none">{admin.first_name}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              admin.role === 'admin'
                ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300'
            }`}>
              {ROLE_LABELS[admin.role]}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по имени, телефону или номеру заказа..."
            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900 transition"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition"
            >
              <X className="w-3.5 h-3.5 text-surface-400" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'new'
                ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900'
                : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            }`}
          >
            <Inbox className="w-4 h-4" />
            Новые {counts.new > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 dark:bg-surface-900/20 rounded-full text-[10px]">{counts.new}</span>}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'pending'
                ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900'
                : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            }`}
          >
            <Hourglass className="w-4 h-4" />
            В обработке {counts.pending > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 dark:bg-surface-900/20 rounded-full text-[10px]">{counts.pending}</span>}
          </button>
          <button
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-2 text-xs font-semibold px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
              activeTab === 'archive'
                ? 'bg-surface-900 dark:bg-white text-white dark:text-surface-900'
                : 'bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700'
            }`}
          >
            <Archive className="w-4 h-4" />
            Архив {counts.archive > 0 && <span className="ml-1 px-1.5 py-0.5 bg-white/20 dark:bg-surface-900/20 rounded-full text-[10px]">{counts.archive}</span>}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayedOrders.length === 0 ? (
          <div className="text-center py-20 text-surface-400 dark:text-surface-500 text-sm">
            {activeTab === 'new' && (searchQuery ? 'Нет заказов по запросу' : 'Новых заказов нет')}
            {activeTab === 'pending' && (searchQuery ? 'Нет заказов по запросу' : 'Нет заказов в обработке')}
            {activeTab === 'archive' && (searchQuery ? 'Нет заказов по запросу' : 'Архив пуст')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {displayedOrders.map((order) => {
              const expanded = expandedId === order.id;
              const showHistory = historyId === order.id;
              const info = order.customer_info as CustomerInfo;
              const history: StatusHistoryEntry[] = Array.isArray(order.status_history)
                ? order.status_history
                : [];

              return (
                <div
                  key={order.id}
                  className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden"
                >
                  <div className="px-5 py-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div>
                            <p className="font-bold text-surface-900 dark:text-white text-sm">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </p>
                            <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDate(order.created_at)}
                            </p>
                            {info?.name && (
                              <p className="text-xs text-surface-600 dark:text-surface-300 mt-0.5 flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {info.name}{info.phone ? ` · ${info.phone}` : ''}
                              </p>
                            )}
                          </div>
                          <p className="text-xl font-bold text-surface-900 dark:text-white whitespace-nowrap">
                            {formatPrice(Number(order.total_amount))}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={order.status ?? 'new'} />

                          <select
                            value={order.status ?? 'new'}
                            onChange={(e) => updateStatus(order.id, e.target.value)}
                            disabled={updatingId === order.id}
                            className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-surface-900 cursor-pointer disabled:opacity-50"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s.value} value={s.value}>{s.label_ru}</option>
                            ))}
                          </select>

                          {order.payment_method && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 font-medium">
                              {order.payment_method}
                            </span>
                          )}
                          {order.delivery_type && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 font-medium">
                              {order.delivery_type}
                            </span>
                          )}

                          {history.length > 0 && (
                            <button
                              onClick={() => setHistoryId(showHistory ? null : order.id)}
                              className="text-xs px-2.5 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600 font-medium flex items-center gap-1 transition"
                            >
                              <History className="w-3 h-3" />
                              История ({history.length})
                            </button>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() => setExpandedId(expanded ? null : order.id)}
                        className="p-2 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition flex-shrink-0 mt-1"
                      >
                        <ChevronDown className={`w-5 h-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {showHistory && history.length > 0 && (
                    <div className="border-t border-surface-100 dark:border-surface-700 px-5 py-4 bg-surface-50/40 dark:bg-surface-700/10">
                      <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                        <History className="w-3.5 h-3.5" />
                        История изменений
                      </p>
                      <div className="space-y-2.5">
                        {[...history].reverse().map((entry: StatusHistoryEntry, i: number) => (
                          <div key={i} className="flex items-start gap-3">
                            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${getStatusInfo(entry.status).dot}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-surface-900 dark:text-white">
                                  {getStatusInfo(entry.status).label_ru}
                                </span>
                                <span className="text-xs text-surface-500 dark:text-surface-400">
                                  — {entry.changed_by}
                                </span>
                              </div>
                              <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                                {formatDate(entry.changed_at)}
                              </p>
                              {entry.note && (
                                <p className="text-xs text-surface-600 dark:text-surface-300 mt-0.5 italic">{entry.note}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {expanded && (
                    <div className="border-t border-surface-100 dark:border-surface-700 px-5 py-4 bg-surface-50/50 dark:bg-surface-700/20 space-y-4">
                      {info && (
                        <div>
                          <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5" />
                            Покупатель
                          </p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {info.name && (
                              <div>
                                <p className="text-xs text-surface-500 dark:text-surface-400">Имя</p>
                                <p className="font-medium text-surface-900 dark:text-white">{info.name}</p>
                              </div>
                            )}
                            {info.phone && (
                              <div>
                                <p className="text-xs text-surface-500 dark:text-surface-400">Телефон</p>
                                <p className="font-medium text-surface-900 dark:text-white">{info.phone}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {info && (info.city || info.address) && (
                        <div>
                          <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5" />
                            Адрес доставки
                          </p>
                          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                            {info.city && (
                              <div>
                                <p className="text-xs text-surface-500 dark:text-surface-400">Город</p>
                                <p className="font-medium text-surface-900 dark:text-white">{info.city}</p>
                              </div>
                            )}
                            {info.address && (
                              <div>
                                <p className="text-xs text-surface-500 dark:text-surface-400">Адрес</p>
                                <p className="font-medium text-surface-900 dark:text-white">{info.address}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {Array.isArray(order.items) && order.items.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                            <Package className="w-3.5 h-3.5" />
                            Товары
                          </p>
                          <div className="space-y-1.5">
                            {(order.items as OrderItem[]).map((item: OrderItem, i: number) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-surface-700 dark:text-surface-300">
                                  {typeof item.name === 'object' ? (item.name as { ru: string; uz: string }).ru : item.name ?? '—'}
                                  {item.size && <span className="text-surface-500"> / {item.size}</span>}
                                  {item.color && <span className="text-surface-500"> / {item.color}</span>}
                                  {' '}× {item.quantity}
                                </span>
                                <span className="font-semibold text-surface-900 dark:text-white ml-3 whitespace-nowrap">
                                  {formatPrice(Number(item.price) * Number(item.quantity))}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {Number(order.delivery_cost) > 0 && (
                        <div className="flex justify-between text-sm pt-2 border-t border-surface-200 dark:border-surface-600">
                          <span className="text-surface-500 dark:text-surface-400">Доставка</span>
                          <span className="font-medium text-surface-900 dark:text-white">
                            {formatPrice(Number(order.delivery_cost))}
                          </span>
                        </div>
                      )}

                      {order.notes && (
                        <div>
                          <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-1">
                            Примечание
                          </p>
                          <p className="text-sm text-surface-700 dark:text-surface-300">{order.notes}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
