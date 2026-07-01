import { useEffect, useRef, useState } from 'react';
import { Package, Radio, RotateCcw, X, ShoppingBag, Search, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { useCartStore } from '../store/useCartStore';
import { useOrders } from '../lib/supabase/hooks';
import { supabase } from '../lib/supabase';
import { formatPrice, getLocalizedValue, formatDateTime } from '../lib/utils';
import { getTelegramUser, haptic } from '../lib/telegram';
import { getStatusColor, getStatusLabel } from '../lib/orderStatuses';
import { returnQueries } from '../lib/supabase/queries';
import { useUploadReturnPhoto } from '../lib/supabase/hooks';
import { toast } from '../components/Toast';
import type { OrderItem } from '../lib/supabase';
import type { Order } from '../lib/supabase/queries';

export const Orders = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const getUserId = useAppStore((state) => state.getUserId);

  const user = getTelegramUser();
  const userId = user?.id || getUserId();

  const { data: orders = [], isLoading } = useOrders(userId);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = searchQuery.trim()
    ? orders.filter((order) => {
        const q = searchQuery.toLowerCase();
        const idMatch = order.id.toLowerCase().includes(q);
        const itemMatch = Array.isArray(order.items)
          ? order.items.some((item: OrderItem) => {
              const name = typeof item.name === 'object' ? (item.name as { ru: string; uz: string }).ru : item.name;
              return name?.toLowerCase().includes(q);
            })
          : false;
        return idMatch || itemMatch;
      })
    : orders;

  const realtimeRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const [returnModal, setReturnModal] = useState<{ order: Order; selectedItems: number[] } | null>(null);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [returnPhotoUploading, setReturnPhotoUploading] = useState(false);
  const returnPhotoInputRef = useRef<HTMLInputElement>(null);
  const uploadReturnPhoto = useUploadReturnPhoto();

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`user-orders-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `telegram_user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['orders', userId] });
        }
      )
      .subscribe();

    realtimeRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, { ru: string; uz: string }> = {
      cash: { ru: 'Наличные', uz: 'Naqd pul' },
      payme: { ru: 'Payme', uz: 'Payme' },
      click: { ru: 'Click', uz: 'Click' },
      uzum: { ru: 'Uzum Bank', uz: 'Uzum Bank' },
    };
    return labels[method]?.[language] || method;
  };

  const canRequestReturn = (order: Order) => {
    if (order.status !== 'delivered') return false;
    const history = Array.isArray(order.status_history) ? order.status_history : [];
    const deliveredEntry = history.find((h) => h.status === 'delivered');
    const deliveredDate = deliveredEntry
      ? new Date(deliveredEntry.changed_at)
      : new Date(order.created_at);
    const now = new Date();
    const daysDiff = (now.getTime() - deliveredDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 14;
  };

  const handleReturnPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setReturnPhotoUploading(true);
    try {
      const toUpload = Array.from(files).slice(0, 5 - returnPhotos.length);
      const urls = await Promise.all(toUpload.map(f => uploadReturnPhoto.mutateAsync(f)));
      setReturnPhotos(prev => [...prev, ...urls].slice(0, 5));
    } catch {
      toast.error(language === 'ru' ? 'Ошибка загрузки фото' : 'Fotosni yuklashda xatolik');
    } finally {
      setReturnPhotoUploading(false);
      if (returnPhotoInputRef.current) returnPhotoInputRef.current.value = '';
    }
  };

  const handleReturnSubmit = async () => {
    if (!returnModal || !userId) return;
    if (!returnReason.trim()) {
      toast.error(language === 'ru' ? 'Укажите причину возврата' : "Qaytarish sababini kiriting");
      return;
    }
    if (returnModal.selectedItems.length === 0) {
      toast.error(language === 'ru' ? 'Выберите товары для возврата' : "Qaytarish uchun mahsulotlarni tanlang");
      return;
    }

    setReturnLoading(true);
    try {
      const order = returnModal.order;
      const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];
      const selected = returnModal.selectedItems.map(i => items[i]);

      await returnQueries.create({
        order_id: order.id,
        telegram_user_id: userId,
        items: selected.map(item => ({
          productId: item.productId,
          name: typeof item.name === 'object' ? (item.name as { ru: string; uz: string }).ru : item.name || '',
          quantity: item.quantity,
          price: item.price,
        })),
        reason: returnReason.trim(),
        photos: returnPhotos,
      });

      toast.success(language === 'ru' ? 'Заявка на возврат отправлена' : "Qaytarish so'rovi yuborildi");
      setReturnModal(null);
      setReturnReason('');
      setReturnPhotos([]);
    } catch {
      toast.error(language === 'ru' ? 'Ошибка отправки заявки' : "So'rovni yuborishda xatolik");
    } finally {
      setReturnLoading(false);
    }
  };

  const toggleReturnItem = (index: number) => {
    if (!returnModal) return;
    const selected = returnModal.selectedItems.includes(index)
      ? returnModal.selectedItems.filter(i => i !== index)
      : [...returnModal.selectedItems, index];
    setReturnModal({ ...returnModal, selectedItems: selected });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-bold text-surface-900 dark:text-white mb-4">
            {t('order_history')}
          </h1>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white dark:bg-surface-800 rounded-2xl overflow-hidden shadow-card">
                <div className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <div className="h-4 w-24 bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse" />
                    <div className="h-5 w-16 bg-surface-100 dark:bg-surface-700 rounded-full animate-pulse" />
                  </div>
                  <div className="flex gap-3">
                    <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-xl animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse" />
                      <div className="h-3 w-1/2 bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse" />
                    </div>
                  </div>
                  <div className="border-t border-surface-100 dark:border-surface-700 pt-3">
                    <div className="h-3 w-1/3 bg-surface-100 dark:bg-surface-700 rounded-lg animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  if (orders.length === 0) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 text-center">
          <Package className="w-24 h-24 text-surface-300 dark:text-surface-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-surface-900 dark:text-white mb-2">
            {t('no_orders')}
          </h2>
          <p className="text-surface-600 dark:text-surface-400 mb-6">
            {t('continue_shopping')}
          </p>
          <button
            onClick={() => navigate('/catalog')}
            className="bg-brand-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-700 transition-colors"
          >
            {t('catalog')}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-surface-900 dark:text-white">
            {t('order_history')}
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-surface-400">
            <Radio className="w-3 h-3 text-success animate-pulse-soft" />
            <span>{language === 'ru' ? 'Онлайн' : 'Onlayn'}</span>
          </div>
        </div>

        {orders.length > 3 && (
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={language === 'ru' ? 'Поиск по номеру или товару...' : "Raqam yoki mahsulot bo'yicha qidirish..."}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
            />
          </div>
        )}

        <div className="space-y-3 pb-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white dark:bg-surface-800 rounded-2xl overflow-hidden shadow-card"
            >
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono font-semibold text-surface-900 dark:text-white">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                      {formatDateTime(order.created_at, language)}
                    </p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(order.status)}`}
                  >
                    {getStatusLabel(order.status, language)}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  {(Array.isArray(order.items) ? (order.items as OrderItem[]) : [])
                    .slice(0, 2)
                    .map((item: OrderItem, index: number) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-surface-100 dark:bg-surface-700 rounded-xl overflow-hidden flex-shrink-0">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={getLocalizedValue(item.name, language)}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-surface-400 text-xs">
                              {t('no_image')}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                            {getLocalizedValue(item.name, language)}
                          </p>
                          <p className="text-xs text-surface-500 dark:text-surface-400">
                            {item.quantity} × {formatPrice(item.price)}
                            {item.size && ` · ${t('size')}: ${item.size}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  {(Array.isArray(order.items) ? (order.items as OrderItem[]) : []).length > 2 && (
                    <p className="text-xs text-surface-400 dark:text-surface-500">
                      {t('and_more')} {(order.items as OrderItem[]).length - 2} {t('items_count')}
                    </p>
                  )}
                </div>

                <div className="border-t border-surface-100 dark:border-surface-700 pt-3 space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-surface-500 dark:text-surface-400">
                      {t('payment_method')}
                    </span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {getPaymentMethodLabel(order.payment_method)}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-surface-500 dark:text-surface-400">
                      {t('delivery')}
                    </span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {order.delivery_type === 'express'
                        ? language === 'ru'
                          ? 'Экспресс'
                          : 'Ekspress'
                        : language === 'ru'
                        ? 'Стандарт'
                        : 'Standart'}{' '}
                      ({formatPrice(order.delivery_cost as number)})
                    </span>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-surface-100 dark:border-surface-700">
                    <span className="font-semibold text-surface-900 dark:text-white text-sm">
                      {t('total')}
                    </span>
                    <span className="text-lg font-extrabold text-surface-900">
                      {formatPrice(order.total_amount as number)}
                    </span>
                  </div>
                </div>

                {canRequestReturn(order) && (
                  <button
                    onClick={() => setReturnModal({ order, selectedItems: [] })}
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-50 dark:hover:bg-surface-700 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {language === 'ru' ? 'Запросить возврат' : "Qaytarish so'rovi"}
                  </button>
                )}

                {order.status === 'delivered' && (
                  <button
                    onClick={async () => {
                      const items = (Array.isArray(order.items) ? order.items : []) as OrderItem[];
                      const cartAdd = useCartStore.getState().addItem;
                      let addedCount = 0;
                      for (const item of items) {
                        const { data: product } = await supabase
                          .from('products').select('stock, is_active').eq('id', item.productId).maybeSingle();
                        if (product && product.is_active && product.stock > 0) {
                          const qty = Math.min(item.quantity, product.stock);
                          cartAdd({
                            productId: item.productId,
                            name: typeof item.name === 'object' ? item.name : { ru: String(item.name), uz: String(item.name) },
                            price: item.price,
                            quantity: qty,
                            image: item.image || '',
                            size: item.size,
                            color: item.color ? { name: item.color, hex: '' } : undefined,
                          });
                          addedCount++;
                        }
                      }
                      if (addedCount > 0) {
                        haptic.addToCart();
                        toast.success(language === 'ru' ? `${addedCount} товар(ов) добавлено в корзину` : `${addedCount} mahsulot savatga qo'shildi`);
                        navigate('/cart');
                      } else {
                        haptic.error();
                        toast.error(language === 'ru' ? 'Товары больше не доступны' : 'Mahsulotlar mavjud emas');
                      }
                    }}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium transition"
                  >
                    <ShoppingBag className="w-4 h-4" />
                    {language === 'ru' ? 'Заказать снова' : 'Qaytadan buyurtma berish'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {returnModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                {language === 'ru' ? 'Возврат товара' : "Mahsulotni qaytarish"}
              </h2>
              <button onClick={() => { setReturnModal(null); setReturnPhotos([]); setReturnReason(''); }} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-5">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wide">
                {language === 'ru' ? 'Выберите товары' : "Mahsulotlarni tanlang"}
              </p>
              {(returnModal.order.items as OrderItem[]).map((item, index) => (
                <label
                  key={index}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                    returnModal.selectedItems.includes(index)
                      ? 'border-surface-900 bg-surface-50 dark:bg-surface-700'
                      : 'border-surface-200 dark:border-surface-600'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={returnModal.selectedItems.includes(index)}
                    onChange={() => toggleReturnItem(index)}
                    className="w-4 h-4 rounded text-surface-900"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
                      {getLocalizedValue(item.name, language)}
                    </p>
                    <p className="text-xs text-surface-500">
                      {item.quantity} × {formatPrice(item.price)}
                      {item.size && ` · ${item.size}`}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-surface-900 dark:text-white">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </label>
              ))}
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2 block">
                {language === 'ru' ? 'Причина возврата' : "Qaytarish sababi"}
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-surface-200 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-surface-900 focus:border-transparent outline-none"
                placeholder={language === 'ru' ? 'Опишите причину...' : 'Sababni yozing...'}
              />
            </div>

            <div className="mb-5">
              <label className="text-xs font-semibold text-surface-500 uppercase tracking-wide mb-2 block">
                {language === 'ru' ? 'Фото дефекта (необязательно)' : "Nuqson fotosi (ixtiyoriy)"}
              </label>
              {returnPhotos.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {returnPhotos.map((url, i) => (
                    <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-600">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => setReturnPhotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {returnPhotos.length < 5 && (
                <button
                  type="button"
                  onClick={() => returnPhotoInputRef.current?.click()}
                  disabled={returnPhotoUploading}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-surface-300 dark:border-surface-600 text-sm text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-700 transition disabled:opacity-50"
                >
                  {returnPhotoUploading
                    ? <span className="w-4 h-4 border-2 border-surface-400 border-t-surface-800 rounded-full animate-spin" />
                    : <Camera className="w-4 h-4" />
                  }
                  {returnPhotoUploading
                    ? (language === 'ru' ? 'Загрузка...' : 'Yuklanmoqda...')
                    : (language === 'ru' ? 'Добавить фото' : "Foto qo'shish")
                  }
                </button>
              )}
              <input
                ref={returnPhotoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleReturnPhotoUpload}
              />
            </div>

            {returnModal.selectedItems.length > 0 && (
              <div className="bg-surface-50 dark:bg-surface-700 rounded-xl p-3 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-surface-500">{language === 'ru' ? 'Сумма возврата' : "Qaytarish miqdori"}:</span>
                  <span className="font-bold text-surface-900 dark:text-white">
                    {formatPrice(
                      returnModal.selectedItems.reduce((sum, i) => {
                        const items = returnModal.order.items as OrderItem[];
                        return sum + (items[i].price || 0) * (items[i].quantity || 1);
                      }, 0)
                    )}
                  </span>
                </div>
              </div>
            )}

            <button
              onClick={handleReturnSubmit}
              disabled={returnLoading || returnModal.selectedItems.length === 0 || !returnReason.trim()}
              className="btn-brand w-full py-3 rounded-xl text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {returnLoading && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {language === 'ru' ? 'Отправить заявку' : "So'rovni yuborish"}
            </button>
          </div>
        </div>
      )}
    </Layout>
  );
};
