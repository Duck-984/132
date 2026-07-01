import { useState, useEffect } from 'react';
import { Trash2, Minus, Plus, ShoppingBag, Lock, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { formatPrice, getLocalizedValue } from '../lib/utils';
import { haptic } from '../lib/telegram';
import { supabase } from '../lib/supabase';

export const Cart = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const items = useCartStore((state) => state.items);
  const updateQuantity = useCartStore((state) => state.updateQuantity);
  const removeItem = useCartStore((state) => state.removeItem);
  const getTotalPrice = useCartStore((state) => state.getTotalPrice);
  const getTotalItems = useCartStore((state) => state.getTotalItems);
  const [confirmRemove, setConfirmRemove] = useState<{ productId: string; size?: string; colorHex?: string } | null>(null);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  useEffect(() => {
    if (items.length === 0) return;
    const productIds = [...new Set(items.map(i => i.productId))];
    (async () => {
      try {
        const { data } = await supabase
          .from('products')
          .select('id, stock, is_active')
          .in('id', productIds);
        if (!data) return;
        const map: Record<string, number> = {};
        data.forEach((p) => { map[p.id] = p.stock ?? 0; });
        setStockMap(map);
      } catch { /* stock check is best-effort */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handleRemove = (productId: string, size?: string, colorHex?: string) => {
    setConfirmRemove({ productId, size, colorHex });
  };

  const confirmRemoveItem = () => {
    if (confirmRemove) {
      removeItem(confirmRemove.productId, confirmRemove.size, confirmRemove.colorHex);
      haptic.remove();
      setConfirmRemove(null);
    }
  };

  const handleUpdateQty = (productId: string, newQty: number, size?: string, color?: { name: string; hex: string }) => {
    if (newQty < 1) {
      handleRemove(productId, size, color?.hex);
      return;
    }
    const maxStock = stockMap[productId] ?? Infinity;
    if (newQty > maxStock) {
      updateQuantity(productId, maxStock, size, color?.hex);
      haptic.error();
      return;
    }
    updateQuantity(productId, newQty, size, color?.hex);
  };

  const totalItems = getTotalItems();
  const totalPrice = getTotalPrice();
  const hasOutOfStock = Object.keys(stockMap).length > 0 && items.some(i => stockMap[i.productId] !== undefined && stockMap[i.productId] <= 0);

  if (items.length === 0) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center px-4 py-24">
          <div className="w-20 h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mb-5">
            <ShoppingBag className="w-9 h-9 text-surface-300 dark:text-surface-600" />
          </div>
          <h2 className="text-lg font-bold text-surface-900 dark:text-white mb-1.5">
            {language === 'ru' ? 'Корзина пуста' : "Savat bo'sh"}
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 text-center max-w-[240px]">
            {language === 'ru' ? 'Добавьте товары из каталога, чтобы оформить заказ' : "Buyurtma berish uchun katalogdan mahsulotlar qo'shing"}
          </p>
          <button
            onClick={() => navigate('/catalog')}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
          >
            {language === 'ru' ? 'Перейти в каталог' : "Katalogga o'tish"}
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBottomNav={false}>
      <div className="bg-surface-50 dark:bg-surface-900 min-h-screen pb-44">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center"
            >
              <ArrowLeft className="w-4.5 h-4.5 text-surface-700 dark:text-surface-300" />
            </button>
            <div>
              <h1 className="text-base font-bold text-surface-900 dark:text-white leading-tight">
                {t('cart')}
              </h1>
              <p className="text-xs text-surface-400 dark:text-surface-500">
                {totalItems} {language === 'ru' ? (totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров') : 'mahsulot'}
              </p>
            </div>
          </div>
        </div>

        {/* Items */}
        <div className="px-3 pt-3 space-y-2.5">
          {Object.keys(stockMap).length > 0 && items.some(i => stockMap[i.productId] !== undefined && stockMap[i.productId] <= 0) && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-3 py-2.5 text-xs font-medium">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {language === 'ru'
                ? 'Некоторые товары закончились. Уберите их из корзины для оформления заказа.'
                : "Ba'zi mahsulotlar tugadi. Buyurtma berish uchun ularni savatdan o'chiring."}
            </div>
          )}
          {items.map((item) => {
            const itemTotal = item.price * item.quantity;
            const stock = stockMap[item.productId];
            const outOfStock = stock !== undefined && stock <= 0;
            const lowStock = stock !== undefined && stock > 0 && stock <= 5;
            const atMaxStock = stock !== undefined && item.quantity >= stock;
            return (
              <div
                key={`${item.productId}-${item.size ?? ''}-${item.color?.hex ?? ''}`}
                className={`bg-white dark:bg-surface-800 rounded-2xl p-3 shadow-sm border ${
                  outOfStock
                    ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/5'
                    : lowStock
                    ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/30 dark:bg-yellow-900/5'
                    : 'border-surface-100 dark:border-surface-700'
                }`}
              >
                {outOfStock && (
                  <div className="flex items-center gap-1.5 mb-2 px-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">
                      {language === 'ru' ? 'Нет в наличии' : 'Mavjud emas'}
                    </span>
                  </div>
                )}
                <div className="flex gap-3">
          {/* Image */}
          <div
            className="w-20 h-20 bg-surface-100 dark:bg-surface-700 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer"
          >
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={getLocalizedValue(item.name, language)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-surface-300">
                        <ShoppingBag className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-surface-900 dark:text-white truncate">
                      {getLocalizedValue(item.name, language)}
                    </h3>

                    {/* Options */}
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item.size && (
                        <span className="text-xs px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400">
                          {t('size')}: {item.size}
                        </span>
                      )}
                      {item.color && (
                        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400">
                          <span
                            className="w-3 h-3 rounded-full border border-surface-300 dark:border-surface-500 flex-shrink-0"
                            style={{ backgroundColor: item.color.hex }}
                          />
                          {item.color.name}
                        </span>
                      )}
                    </div>

                    {/* Price + Quantity */}
                    <div className="flex items-center justify-between mt-2.5">
                      <p className="text-sm font-bold text-surface-900 dark:text-white">
                        {formatPrice(itemTotal)}
                        {item.quantity > 1 && (
                          <span className="text-xs font-normal text-surface-400 dark:text-surface-500 ml-1.5">
                            {formatPrice(item.price)} × {item.quantity}
                          </span>
                        )}
                      </p>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleUpdateQty(item.productId, item.quantity - 1, item.size, item.color)}
                          className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center active:scale-90 transition disabled:opacity-30"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4 text-surface-600 dark:text-surface-300" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold text-surface-900 dark:text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleUpdateQty(item.productId, item.quantity + 1, item.size, item.color)}
                          disabled={outOfStock || atMaxStock}
                          className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center active:scale-90 transition disabled:opacity-30"
                        >
                          <Plus className="w-4 h-4 text-surface-600 dark:text-surface-300" />
                        </button>
                        <button
                          onClick={() => handleRemove(item.productId, item.size, item.color?.hex)}
                          className="w-10 h-10 rounded-lg flex items-center justify-center ml-1 text-surface-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 active:scale-90 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {stock !== undefined && !outOfStock && (
                        <p className={`text-[10px] mt-1 ${lowStock ? 'text-yellow-600 dark:text-yellow-400' : 'text-surface-400 dark:text-surface-500'}`}>
                          {language === 'ru' ? `На складе: ${stock} шт.` : `Omborda: ${stock} dona`}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Fixed checkout bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 pb-safe">
        <div className="bg-white/95 dark:bg-surface-800/95 backdrop-blur-md border-t border-surface-200 dark:border-surface-700 px-4 pt-3 pb-4 shadow-elevated">
          {/* Summary */}
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-surface-400 dark:text-surface-500">
                {language === 'ru' ? 'Итого' : 'Jami'}
              </p>
              <p className="text-xl font-extrabold text-surface-900 dark:text-white">
                {formatPrice(totalPrice)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-surface-400 dark:text-surface-500">
                {totalItems} {language === 'ru' ? 'товар' : 'mahsulot'}
              </p>
            </div>
          </div>

          {/* Checkout button */}
          <button
            onClick={() => navigate('/checkout')}
            disabled={hasOutOfStock}
            className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {language === 'ru' ? 'Оформить заказ' : 'Buyurtma berish'}
          </button>

          <div className="flex items-center justify-center gap-1.5 mt-2">
            <Lock className="w-3 h-3 text-surface-300" />
            <span className="text-[10px] text-surface-400">
              {language === 'ru' ? 'Безопасная оплата' : "Xavfsiz to'lov"}
            </span>
          </div>
        </div>
      </div>

      {/* Remove confirmation modal */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-8">
          <div className="bg-white dark:bg-surface-800 rounded-2xl p-5 w-full max-w-xs shadow-xl">
            <p className="text-sm font-medium text-surface-900 dark:text-white text-center mb-1">
              {language === 'ru' ? 'Удалить из корзины?' : "Savatdan o'chirish?"}
            </p>
            <p className="text-xs text-surface-400 text-center mb-5">
              {language === 'ru' ? 'Товар будет убран' : "Mahsulot o'chiriladi"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmRemove(null)}
                className="flex-1 py-2.5 rounded-xl bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300 text-sm font-medium active:scale-95 transition"
              >
                {t('cancel')}
              </button>
              <button
                onClick={confirmRemoveItem}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium active:scale-95 transition"
              >
                {t('delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};
