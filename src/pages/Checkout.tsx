import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, CreditCard, Truck, Zap, Tag, MapPin, User, FileText, ShoppingBag, Lock, ChevronRight } from 'lucide-react';
import { Layout } from '../components/Layout';
import { CouponInput } from '../components/CouponInput';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { useAppStore } from '../store/useAppStore';
import { useCreatePayment, useDeliveryZones } from '../lib/supabase/hooks';
import { formatPrice, getLocalizedValue, validatePhone } from '../lib/utils';
import { haptic, getTelegramUser } from '../lib/telegram';
import { toast } from '../components/Toast';
import type { DeliveryZone } from '../lib/supabase/queries';

export const Checkout = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const getUserId = useAppStore((state) => state.getUserId);
  const user = getTelegramUser();
  const userId = user?.id || getUserId();

  const createPaymentMutation = useCreatePayment();
  const { data: deliveryZones = [], isLoading: zonesLoading } = useDeliveryZones(true);

  const [step, setStep] = useState<'info' | 'delivery' | 'payment'>('info');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    zoneId: '',
    address: '',
    deliveryType: 'standard' as 'standard' | 'express',
    paymentMethod: 'payme' as 'payme' | 'click' | 'uzum' | 'cash',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const submittingRef = useRef(false);
  const [appliedCoupon, setAppliedCoupon] = useState<{ id: string; code: string; discount: number } | null>(null);

  useEffect(() => {
    if (items.length === 0 && !orderPlaced) {
      navigate('/cart');
    }
  }, [items.length, orderPlaced, navigate]);

  const selectedZone: DeliveryZone | undefined = useMemo(() => {
    if (!formData.zoneId && deliveryZones.length > 0) return deliveryZones[0];
    return deliveryZones.find((z) => z.id === formData.zoneId) ?? deliveryZones[0];
  }, [formData.zoneId, deliveryZones]);

  const subtotal = getTotalPrice();

  const deliveryCost = useMemo(() => {
    if (!selectedZone) return 20000;
    const price = formData.deliveryType === 'express'
      ? selectedZone.express_price
      : selectedZone.standard_price;
    if (
      formData.deliveryType === 'standard' &&
      selectedZone.free_threshold &&
      selectedZone.free_threshold > 0 &&
      subtotal >= selectedZone.free_threshold
    ) {
      return 0;
    }
    return price;
  }, [selectedZone, formData.deliveryType, subtotal]);

  const totalAmount = subtotal + deliveryCost - (appliedCoupon?.discount || 0);
  const isFree = deliveryCost === 0 && formData.deliveryType === 'standard';

  const cityLabel = (zone: DeliveryZone) =>
    language === 'uz' ? zone.city_uz : zone.city_ru;

  const daysLabel = (min: number, max: number) =>
    `${min}${min !== max ? `–${max}` : ''} ${language === 'ru' ? (max === 1 ? 'день' : 'дн.') : 'kun'}`;

  const validateForm = (): string | null => {
    if (formData.fullName.trim().length < 2) {
      return language === 'ru' ? 'Введите ваше имя' : 'Ismingizni kiriting';
    }
    if (!validatePhone(formData.phone)) {
      return language === 'ru' ? 'Введите корректный номер телефона' : "To'g'ri telefon raqam kiriting";
    }
    if (formData.address.trim().length < 5) {
      return language === 'ru' ? 'Введите адрес доставки' : "Manzilni kiriting";
    }
    return null;
  };

  const handleSubmit = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      submittingRef.current = false;
      return;
    }

    setLoading(true);

    try {
      if (!userId) {
        toast.error(language === 'ru' ? 'Ошибка идентификации' : 'Aniqlashda xatolik');
        setLoading(false);
        return;
      }

      const city = selectedZone
        ? (language === 'uz' ? selectedZone.city_uz : selectedZone.city_ru)
        : '';

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'Apikey': anonKey,
        },
        body: JSON.stringify({
          telegram_user_id: userId,
          items: items.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            size: item.size,
            color: item.color?.name,
            image: item.image,
          })),
          total_amount: totalAmount,
          customer_info: {
            name: formData.fullName,
            phone: formData.phone,
            city,
            address: formData.address,
            zone_id: selectedZone?.id,
            region: selectedZone
              ? (language === 'uz' ? selectedZone.region_uz : selectedZone.region_ru)
              : '',
          },
          delivery_type: formData.deliveryType,
          delivery_cost: deliveryCost,
          payment_method: formData.paymentMethod,
          notes: formData.notes,
          coupon_id: appliedCoupon?.id || undefined,
          discount_amount: appliedCoupon?.discount || 0,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const { order } = await response.json();
      setOrderId(order.id);

      if (formData.paymentMethod !== 'cash') {
        try {
          const paymentData = await createPaymentMutation.mutateAsync({
            orderId: order.id,
            amount: totalAmount,
            paymentMethod: formData.paymentMethod,
          });
          if (paymentData.paymentUrl) {
            localStorage.setItem('pending_order_id', order.id);
            setOrderPlaced(true);
            clearCart();
            window.location.href = paymentData.paymentUrl;
            return;
          }
        } catch (paymentError) {
          console.error('Payment error:', paymentError);
          toast.error(language === 'ru' ? 'Ошибка создания платежа. Оплатите при получении.' : "To'lov yaratishda xatolik. Yetkazishda to'lang.");
        }
      }

      setOrderPlaced(true);
      clearCart();
      haptic.success();
      toast.success(t('order_success'));
    } catch (error) {
      console.error('Error placing order:', error);
      haptic.error();
      toast.error(error instanceof Error ? error.message : t('error'));
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  if (items.length === 0 && !orderPlaced) return null;

  if (orderPlaced) {
    return (
      <Layout showBottomNav={false}>
        <div className="min-h-screen bg-surface-50 dark:bg-surface-900 flex flex-col items-center justify-center px-6 py-16">
          <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-6 animate-bounce-in">
            <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-surface-900 dark:text-white mb-2 text-center">
            {language === 'ru' ? 'Заказ оформлен!' : "Buyurtma berildi!"}
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-1 text-center">
            {language === 'ru' ? 'Номер заказа' : 'Buyurtma raqami'}
          </p>
          <p className="text-lg font-bold text-surface-900 dark:text-white font-mono mb-2">
            #{orderId.slice(0, 8).toUpperCase()}
          </p>
          <p className="text-sm text-surface-400 dark:text-surface-500 text-center mb-8 max-w-[260px]">
            {language === 'ru'
              ? 'Мы свяжемся с вами в ближайшее время для подтверждения'
              : "Tez orada tasdiqlash uchun siz bilan bog'lanamiz"}
          </p>
          <div className="w-full max-w-xs space-y-3">
            <button
              onClick={() => navigate('/orders')}
              className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              {language === 'ru' ? 'Мои заказы' : 'Buyurtmalarim'}
            </button>
            <button
              onClick={() => navigate('/catalog')}
              className="w-full py-3.5 rounded-xl bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 text-surface-900 dark:text-white text-sm font-semibold transition-colors"
            >
              {language === 'ru' ? 'Продолжить покупки' : "Xaridni davom ettirish"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showBottomNav={false}>
      <div className="min-h-screen bg-surface-50 dark:bg-surface-900 pb-28">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => {
                if (step === 'payment') setStep('delivery');
                else if (step === 'delivery') setStep('info');
                else navigate('/cart');
              }}
              className="w-9 h-9 rounded-full bg-surface-100 dark:bg-surface-700 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 text-surface-700 dark:text-surface-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-base font-bold text-surface-900 dark:text-white">
                {t('checkout')}
              </h1>
              <p className="text-xs text-surface-400 dark:text-surface-500">
                {step === 'info' ? (language === 'ru' ? 'Данные покупателя' : "Xaridor ma'lumotlari")
                  : step === 'delivery' ? (language === 'ru' ? 'Доставка' : 'Yetkazib berish')
                  : (language === 'ru' ? 'Оплата' : "To'lov")}
              </p>
            </div>
          </div>
          {/* Progress */}
          <div className="flex px-4 pb-3 gap-1.5">
            {['info', 'delivery', 'payment'].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  (s === 'info' && step === 'info') ||
                  (s === 'delivery' && (step === 'delivery' || step === 'payment')) ||
                  (s === 'payment' && step === 'payment')
                    ? 'bg-surface-900'
                    : 'bg-surface-200 dark:bg-surface-700'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="px-4 pt-4">
          {/* Step 1: Customer Info */}
          {step === 'info' && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white mb-4">
                  <User className="w-4 h-4 text-surface-400" />
                  {language === 'ru' ? 'Контакты' : "Aloqa"}
                </h2>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">
                      {t('full_name')} *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      placeholder={language === 'ru' ? 'Иван Иванов' : 'Ism Familiya'}
                      className="w-full px-3.5 py-3 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">
                      {t('phone')} *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+998 90 123 45 67"
                      className="w-full px-3.5 py-3 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900 transition"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  if (!formData.fullName.trim() || formData.fullName.trim().length < 2) {
                    toast.error(language === 'ru' ? 'Введите ваше имя' : 'Ismingizni kiriting');
                    return;
                  }
                  const phoneClean = formData.phone.replace(/[\s\-()]/g, '');
                  if (!/^\+?[0-9]{9,13}$/.test(phoneClean)) {
                    toast.error(language === 'ru' ? 'Введите корректный номер телефона' : "To'g'ri telefon raqam kiriting");
                    return;
                  }
                  setStep('delivery');
                }}
                className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {language === 'ru' ? 'Далее' : 'Keyingi'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 2: Delivery */}
          {step === 'delivery' && (
            <div className="space-y-4 animate-fade-in">
              {/* Address */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white mb-4">
                  <MapPin className="w-4 h-4 text-surface-400" />
                  {language === 'ru' ? 'Адрес доставки' : 'Yetkazish manzili'}
                </h2>

                {/* City */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">
                    {language === 'ru' ? 'Город' : 'Shahar'} *
                  </label>
                  {zonesLoading ? (
                    <div className="h-11 bg-surface-100 dark:bg-surface-700 rounded-xl animate-pulse" />
                  ) : (
                    <select
                      value={formData.zoneId || (deliveryZones[0]?.id ?? '')}
                      onChange={(e) => setFormData({ ...formData, zoneId: e.target.value })}
                      className="w-full px-3.5 py-3 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900 transition"
                    >
                      {deliveryZones.map((zone) => (
                        <option key={zone.id} value={zone.id}>
                          {cityLabel(zone)} — {language === 'uz' ? zone.region_uz : zone.region_ru}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Address */}
                <div className="mb-3">
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">
                    {t('address')} *
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={language === 'ru' ? 'Улица, дом, квартира, подъезд' : "Ko'cha, uy, xonadon, kirish"}
                    rows={2}
                    className="w-full px-3.5 py-3 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900 transition resize-none"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">
                    {language === 'ru' ? 'Комментарий к заказу' : "Buyurtma izohi"}
                  </label>
                  <input
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={language === 'ru' ? 'Пожелания по доставке (необязательно)' : "Yetkazish istaklari (ixtiyoriy)"}
                    className="w-full px-3.5 py-3 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white placeholder-surface-400 focus:outline-none focus:ring-2 focus:ring-surface-900 transition"
                  />
                </div>
              </div>

              {/* Free shipping notice */}
              {selectedZone?.free_threshold && selectedZone.free_threshold > 0 && (
                <div className={`flex items-center gap-2 text-xs rounded-xl px-3.5 py-2.5 ${
                  subtotal >= selectedZone.free_threshold
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                    : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                }`}>
                  <Tag className="w-3.5 h-3.5 flex-shrink-0" />
                  {subtotal >= selectedZone.free_threshold
                    ? (language === 'ru' ? 'Бесплатная доставка!' : 'Bepul yetkazib berish!')
                    : (language === 'ru'
                      ? `Бесплатно от ${formatPrice(selectedZone.free_threshold)} (+${formatPrice(selectedZone.free_threshold - subtotal)})`
                      : `${formatPrice(selectedZone.free_threshold)} dan bepul (+${formatPrice(selectedZone.free_threshold - subtotal)})`)}
                </div>
              )}

              {/* Delivery Type */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white mb-3">
                  <Truck className="w-4 h-4 text-surface-400" />
                  {language === 'ru' ? 'Способ доставки' : 'Yetkazish usuli'}
                </h2>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'standard' })}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      formData.deliveryType === 'standard'
                        ? 'border-surface-900 bg-surface-50 dark:bg-surface-700'
                        : 'border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        formData.deliveryType === 'standard' ? 'bg-surface-900 text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                      }`}>
                        <Truck className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-surface-900 dark:text-white">{t('delivery_standard')}</p>
                        <p className="text-xs text-surface-400 dark:text-surface-500">
                          {selectedZone
                            ? daysLabel(selectedZone.standard_days_min, selectedZone.standard_days_max)
                            : '3–5 дн.'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-white">
                      {isFree ? (language === 'ru' ? 'Бесплатно' : 'Bepul') : (selectedZone ? formatPrice(selectedZone.standard_price) : formatPrice(20000))}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, deliveryType: 'express' })}
                    className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      formData.deliveryType === 'express'
                        ? 'border-surface-900 bg-surface-50 dark:bg-surface-700'
                        : 'border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        formData.deliveryType === 'express' ? 'bg-surface-900 text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                      }`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold text-surface-900 dark:text-white">{t('delivery_express')}</p>
                        <p className="text-xs text-surface-400 dark:text-surface-500">
                          {selectedZone
                            ? daysLabel(selectedZone.express_days_min, selectedZone.express_days_max)
                            : '1–2 дн.'}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-surface-900 dark:text-white">
                      {selectedZone ? formatPrice(selectedZone.express_price) : formatPrice(50000)}
                    </span>
                  </button>
                </div>
              </div>

              {/* Coupon */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white mb-3">
                  <Tag className="w-4 h-4 text-surface-400" />
                  {language === 'ru' ? 'Промокод' : 'Promo kod'}
                </h2>
                <CouponInput
                  telegramUserId={userId || 0}
                  orderAmount={subtotal + deliveryCost}
                  onApply={(couponId, discount, code) => {
                    setAppliedCoupon({ id: couponId, code, discount });
                    toast.success(language === 'ru' ? 'Купон применён' : "Kupon qo'llanildi");
                  }}
                  onRemove={() => {
                    setAppliedCoupon(null);
                    toast.success(language === 'ru' ? 'Купон убран' : "Kupon o'chirildi");
                  }}
                  appliedCoupon={appliedCoupon ? { code: appliedCoupon.code, discount: appliedCoupon.discount } : null}
                  language={language}
                />
              </div>

              <button
                onClick={() => {
                  if (formData.address.trim().length < 5) {
                    toast.error(language === 'ru' ? 'Введите адрес доставки' : "Manzilni kiriting");
                    return;
                  }
                  setStep('payment');
                }}
                className="w-full py-3.5 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {language === 'ru' ? 'Далее' : 'Keyingi'}
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === 'payment' && (
            <div className="space-y-4 animate-fade-in">
              {/* Payment Methods */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-surface-900 dark:text-white mb-3">
                  <CreditCard className="w-4 h-4 text-surface-400" />
                  {t('payment_method')}
                </h2>
                <div className="space-y-2">
                  {[
                    { id: 'payme', label: 'Payme', desc: language === 'ru' ? 'Онлайн-оплата' : "Online to'lov" },
                    { id: 'click', label: 'Click', desc: language === 'ru' ? 'Онлайн-оплата' : "Online to'lov" },
                    { id: 'uzum', label: 'Uzum Bank', desc: language === 'ru' ? 'Онлайн-оплата' : "Online to'lov" },
                    { id: 'cash', label: t('payment_cash'), desc: language === 'ru' ? 'При получении' : 'Yetkazishda' },
                  ].map(({ id, label, desc }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: id as typeof formData.paymentMethod })}
                      className={`w-full flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                        formData.paymentMethod === id
                          ? 'border-surface-900 bg-surface-50 dark:bg-surface-700'
                          : 'border-surface-200 dark:border-surface-600 hover:bg-surface-50 dark:hover:bg-surface-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                          formData.paymentMethod === id ? 'bg-surface-900 text-white' : 'bg-surface-100 dark:bg-surface-700 text-surface-500'
                        }`}>
                          {id === 'cash' ? <FileText className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-semibold text-surface-900 dark:text-white">{label}</p>
                          <p className="text-xs text-surface-400 dark:text-surface-500">{desc}</p>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        formData.paymentMethod === id
                          ? 'border-surface-900 bg-surface-900'
                          : 'border-surface-300 dark:border-surface-600'
                      }`}>
                        {formData.paymentMethod === id && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-white dark:bg-surface-800 rounded-2xl p-4 shadow-sm border border-surface-100 dark:border-surface-700">
                <h2 className="text-sm font-semibold text-surface-900 dark:text-white mb-3">
                  {language === 'ru' ? 'Итого' : 'Jami'}
                </h2>
                <div className="space-y-2 mb-3">
                  {/* Items */}
                  {items.map((item) => (
                    <div key={`${item.productId}-${item.size ?? ''}-${item.color?.hex ?? ''}`} className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-surface-100 dark:bg-surface-700 overflow-hidden flex-shrink-0">
                        {item.image && <img src={item.image} alt="" className="w-full h-full object-cover" loading="lazy" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-surface-900 dark:text-white truncate">
                          {getLocalizedValue(item.name, language)}
                        </p>
                        <p className="text-[10px] text-surface-400">
                          {item.quantity} × {formatPrice(item.price)}
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-surface-900 dark:text-white">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-surface-100 dark:border-surface-700 pt-3 space-y-2">
                  <div className="flex justify-between text-xs text-surface-500 dark:text-surface-400">
                    <span>{language === 'ru' ? 'Товары' : 'Mahsulotlar'}</span>
                    <span className="font-medium text-surface-900 dark:text-white">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-surface-500 dark:text-surface-400">
                    <span>{language === 'ru' ? 'Доставка' : 'Yetkazish'}</span>
                    <span className="font-medium text-surface-900 dark:text-white">
                      {isFree ? (language === 'ru' ? 'Бесплатно' : 'Bepul') : formatPrice(deliveryCost)}
                    </span>
                  </div>
                  {appliedCoupon && appliedCoupon.discount > 0 && (
                    <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                      <span>{language === 'ru' ? 'Скидка' : "Chegirma"} ({appliedCoupon.code})</span>
                      <span className="font-medium">-{formatPrice(appliedCoupon.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-surface-100 dark:border-surface-700 pt-2 flex justify-between">
                    <span className="text-sm font-bold text-surface-900 dark:text-white">{t('total')}</span>
                    <span className="text-lg font-extrabold text-surface-900 dark:text-white">{formatPrice(totalAmount)}</span>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-4 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98] text-white text-sm font-semibold transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('loading')}</span>
                  </>
                ) : (
                  <>
                    {formData.paymentMethod === 'cash' ? (
                      <ShoppingBag className="w-4 h-4" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    <span>
                      {formData.paymentMethod === 'cash'
                        ? t('place_order')
                        : (language === 'ru' ? 'Оплатить' : "To'lash")}
                      {' '}— {formatPrice(totalAmount)}
                    </span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 pb-4">
                <Lock className="w-3 h-3 text-surface-300" />
                <span className="text-[10px] text-surface-400">
                  {language === 'ru' ? 'Безопасная оплата' : "Xavfsiz to'lov"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};
