import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, ArrowLeft, Eye, EyeOff, Minus, AlertTriangle, Warehouse } from 'lucide-react';
import { supabase, Database } from '../../lib/supabase';
import { adminQueries } from '../../lib/adminApi';
import { getCurrentAdmin, ROLE_LABELS } from '../../lib/auth';
import { formatPrice } from '../../lib/utils';
import { useWishlistStats } from '../../lib/supabase/hooks';
import { Heart, Bell } from 'lucide-react';
import { toast } from '../../components/Toast';
import { auditLogQueries } from '../../lib/supabase/queries';

type Product = Database['public']['Tables']['products']['Row'];

const LOW_STOCK_THRESHOLD = 5;

const StockCell = ({
  product,
  onAdjust,
  onSet,
  disabled,
}: {
  product: Product;
  onAdjust: (delta: number) => void;
  onSet: (val: number) => void;
  disabled: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [inputVal, setInputVal] = useState(String(product.stock));
  const isLow = (product.stock ?? 0) <= LOW_STOCK_THRESHOLD;
  const isOut = (product.stock ?? 0) === 0;

  const commitEdit = () => {
    const n = parseInt(inputVal, 10);
    if (!isNaN(n) && n >= 0) onSet(n);
    setEditing(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <button
        disabled={disabled || (product.stock ?? 0) <= 0}
        onClick={() => onAdjust(-1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30 transition"
      >
        <Minus className="w-3 h-3" />
      </button>

      {editing ? (
        <input
          autoFocus
          type="number"
          min={0}
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="w-14 text-center text-sm font-semibold border border-surface-400 rounded-lg outline-none bg-white dark:bg-surface-700 text-surface-900 dark:text-white px-1 py-0.5"
        />
      ) : (
        <button
          onClick={() => { setInputVal(String(product.stock)); setEditing(true); }}
          className={`min-w-[2.5rem] text-center text-sm font-bold px-2 py-0.5 rounded-lg transition ${
            isOut
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              : isLow
              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
              : 'bg-surface-100 dark:bg-surface-700 text-surface-800 dark:text-gray-200'
          } hover:ring-2 hover:ring-surface-400`}
          title="Нажмите для ввода вручную"
        >
          {product.stock ?? 0}
        </button>
      )}

      <button
        disabled={disabled}
        onClick={() => onAdjust(+1)}
        className="w-7 h-7 flex items-center justify-center rounded-lg border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30 transition"
      >
        <Plus className="w-3 h-3" />
      </button>

      {isOut && (
        <span className="text-xs font-semibold text-red-500 hidden sm:block">нет</span>
      )}
      {!isOut && isLow && (
        <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 hidden sm:block" />
      )}
    </div>
  );
};

export const AdminProducts = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<string | null>(null);
  const [stockView, setStockView] = useState(false);
  const { data: wishlistStats = [] } = useWishlistStats();
  const [notifyingId, setNotifyingId] = useState<string | null>(null);

  const getWishlistStat = (productId: string) =>
    wishlistStats.find((s) => s.product_id === productId) || { likes: 0, notify_price: 0, notify_stock: 0 };

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setProducts(data ?? []);
    } catch {
      toast.error('Не удалось загрузить список товаров.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить этот товар? Действие необратимо.')) return;
    const product = products.find(p => p.id === id);
    try {
      await adminQueries.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Товар удалён.');

      auditLogQueries.log({
        admin_id: admin?.id ?? 'unknown',
        action: 'delete',
        entity_type: 'products',
        entity_id: id,
        details: { name: typeof product?.name === 'object' ? (product.name as { ru: string })?.ru : product?.name },
      }).catch(() => {});
    } catch {
      toast.error('Ошибка при удалении товара.');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    try {
      await adminQueries.updateProduct(id, { is_active: !current });
      setProducts((prev) => prev.map((p) => p.id === id ? { ...p, is_active: !current } : p));

      auditLogQueries.log({
        admin_id: admin?.id ?? 'unknown',
        action: 'update',
        entity_type: 'products',
        entity_id: id,
        details: { is_active: !current },
      }).catch(() => {});
    } catch {
      toast.error('Ошибка при изменении статуса.');
    }
  };

  const adjustStock = async (productId: string, delta: number) => {
    if (adjustingId) return;
    setAdjustingId(productId);
    try {
      const product = products.find((p) => p.id === productId);
      if (!product) return;
      const newStock = Math.max(0, (product.stock ?? 0) + delta);
      await adminQueries.updateProduct(productId, { stock: newStock, updated_at: new Date().toISOString() });
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: newStock } : p));
      toast.success(`Остаток: ${newStock} шт.`);
    } catch {
      toast.error('Ошибка при изменении остатка.');
    } finally {
      setAdjustingId(null);
    }
  };

  const setStock = async (productId: string, newStock: number) => {
    if (adjustingId) return;
    setAdjustingId(productId);
    try {
      await adminQueries.updateProduct(productId, { stock: newStock, updated_at: new Date().toISOString() });
      setProducts((prev) => prev.map((p) => p.id === productId ? { ...p, stock: newStock } : p));
      toast.success(`Остаток установлен: ${newStock} шт.`);
    } catch {
      toast.error('Ошибка при установке остатка.');
    } finally {
      setAdjustingId(null);
    }
  };

  const handleNotifyPriceDrop = async (productId: string) => {
    if (notifyingId) return;
    setNotifyingId(productId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify({
          product_id: productId,
          type: 'price_drop',
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Уведомлено: ${result.sent || 0} пользователей`);
      } else {
        toast.error(result.error || 'Ошибка отправки уведомлений');
      }
    } catch {
      toast.error('Ошибка отправки уведомлений');
    } finally {
      setNotifyingId(null);
    }
  };

  const handleNotifyStock = async (productId: string) => {
    if (notifyingId) return;
    setNotifyingId(productId);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify({
          product_id: productId,
          type: 'stock_available',
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(`Уведомлено: ${result.sent || 0} пользователей`);
      } else {
        toast.error(result.error || 'Ошибка отправки уведомлений');
      }
    } catch {
      toast.error('Ошибка отправки уведомлений');
    } finally {
      setNotifyingId(null);
    }
  };

  const displayProducts = stockView
    ? [...products].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    : products;

  const lowStockCount = products.filter((p) => (p.stock ?? 0) <= LOW_STOCK_THRESHOLD && (p.stock ?? 0) > 0).length;
  const outOfStockCount = products.filter((p) => (p.stock ?? 0) === 0).length;

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
              <h1 className="text-lg font-bold text-surface-900 dark:text-white">Товары</h1>
              <p className="text-xs text-surface-500 dark:text-surface-400">{products.length} позиций</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setStockView(!stockView)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition ${
                stockView
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white dark:bg-surface-800 text-surface-700 dark:text-surface-300 border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'
              }`}
            >
              <Warehouse className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Склад</span>
            </button>

            <div className="text-right hidden sm:block ml-2">
              <p className="text-sm font-semibold text-surface-900 dark:text-white leading-none">{admin.first_name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                admin.role === 'admin'
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                  : admin.role === 'manager'
                  ? 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300'
                  : 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300'
              }`}>
                {ROLE_LABELS[admin.role]}
              </span>
            </div>

            <button
              onClick={() => navigate('/admin/products/new')}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <div className="mb-5 flex flex-wrap gap-3">
            {outOfStockCount > 0 && (
              <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-2.5 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Нет в наличии: {outOfStockCount} товар(а)
              </div>
            )}
            {lowStockCount > 0 && (
              <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 rounded-xl px-4 py-2.5 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Мало на складе (≤{LOW_STOCK_THRESHOLD} шт.): {lowStockCount} товар(а)
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-surface-500 dark:text-surface-400 mb-4">Товаров пока нет</p>
            <button
              onClick={() => navigate('/admin/products/new')}
              className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-700 transition"
            >
              <Plus className="w-4 h-4" />
              Добавить первый товар
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-700/50 border-b border-surface-200 dark:border-surface-700">
                    <th className="text-left px-5 py-3 font-semibold text-surface-700 dark:text-surface-300">Товар</th>
                    <th className="text-left px-5 py-3 font-semibold text-surface-700 dark:text-surface-300">Цена</th>
                    <th className="text-left px-5 py-3 font-semibold text-surface-700 dark:text-surface-300">
                      <span className="flex items-center gap-1.5">
                        <Warehouse className="w-3.5 h-3.5" />
                        Остаток
                      </span>
                    </th>
                    <th className="text-left px-5 py-3 font-semibold text-surface-700 dark:text-surface-300">Видимость</th>
                    <th className="text-left px-5 py-3 font-semibold text-surface-700 dark:text-surface-300">
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5" />
                        Спрос
                      </span>
                    </th>
                    <th className="text-right px-5 py-3 font-semibold text-surface-700 dark:text-surface-300">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-surface-700">
                  {displayProducts.map((product) => {
                    const isLow = (product.stock ?? 0) <= LOW_STOCK_THRESHOLD;
                    const isOut = (product.stock ?? 0) === 0;

                    return (
                      <tr
                        key={product.id}
                        className={`hover:bg-surface-50 dark:hover:bg-surface-700/30 transition ${
                          isOut ? 'bg-red-50/30 dark:bg-red-900/5' : isLow ? 'bg-yellow-50/30 dark:bg-yellow-900/5' : ''
                        }`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-surface-100 dark:bg-surface-700 overflow-hidden flex-shrink-0">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xs text-surface-400">нет</div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-surface-900 dark:text-white truncate max-w-[160px]">
                                {(product.name as { ru: string; uz: string })?.ru ?? '—'}
                              </p>
                              <p className="text-xs text-surface-500 dark:text-surface-400 truncate max-w-[160px]">{product.slug}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5 font-semibold text-surface-900 dark:text-white whitespace-nowrap">
                          {formatPrice(Number(product.price))}
                        </td>

                        <td className="px-5 py-3.5">
                          <StockCell
                            product={product}
                            onAdjust={(delta) => adjustStock(product.id, delta)}
                            onSet={(val) => setStock(product.id, val)}
                            disabled={adjustingId === product.id}
                          />
                        </td>

                        <td className="px-5 py-3.5">
                          <button
                            onClick={() => toggleActive(product.id, product.is_active ?? true)}
                            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full transition ${
                              product.is_active
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                : 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-surface-600'
                            }`}
                          >
                            {product.is_active
                              ? <><Eye className="w-3.5 h-3.5" />Активен</>
                              : <><EyeOff className="w-3.5 h-3.5" />Скрыт</>
                            }
                          </button>
                        </td>

                        <td className="px-5 py-3.5">
                          {(() => {
                            const stats = getWishlistStat(product.id);
                            return (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 text-xs">
                                  <Heart className="w-3 h-3 text-danger" />
                                  <span className="font-semibold text-surface-900 dark:text-white">{stats.likes}</span>
                                  <span className="text-surface-400">лайков</span>
                                </div>
                                {stats.notify_price > 0 && (
                                  <button
                                    onClick={() => handleNotifyPriceDrop(product.id)}
                                    disabled={notifyingId === product.id}
                                    className="flex items-center gap-1 text-xs text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition"
                                  >
                                    <Bell className="w-3 h-3" />
                                    {notifyingId === product.id ? '...' : `Скидка (${stats.notify_price})`}
                                  </button>
                                )}
                                {stats.notify_stock > 0 && product.stock === 0 && (
                                  <button
                                    onClick={() => handleNotifyStock(product.id)}
                                    disabled={notifyingId === product.id}
                                    className="flex items-center gap-1 text-xs text-surface-600 dark:text-surface-400 hover:text-surface-900 dark:hover:text-white transition"
                                  >
                                    <Bell className="w-3 h-3" />
                                    {notifyingId === product.id ? '...' : `Наличие (${stats.notify_stock})`}
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>

                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => navigate(`/admin/products/${product.id}/edit`)}
                              className="p-2 text-surface-900 dark:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-200 rounded-lg transition"
                              title="Редактировать"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(product.id)}
                              className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
