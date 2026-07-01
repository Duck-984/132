import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Globe, Shield, ChevronDown, ChevronRight,
  Package, Pencil, X, Phone, MapPin, Clock,
} from 'lucide-react';
import { Layout } from '../components/Layout';
import { useTranslation } from '../hooks/useTranslation';
import { useAppStore } from '../store/useAppStore';
import { getTelegramUser } from '../lib/telegram';
import { useOrders, useUserProfile, useUpdateProfile } from '../lib/supabase/hooks';
import { formatPrice } from '../lib/utils';
import { toast } from '../components/Toast';
import { getStatusLabel, getStatusColor } from '../lib/orderStatuses';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

export const Profile = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const { getUserId, registeredName, registeredPhone } = useAppStore();
  const user = getTelegramUser();
  const userId = user?.id || getUserId();

  const { data: orders = [], isLoading: ordersLoading } = useOrders(userId);
  const { data: userProfile } = useUserProfile(userId);
  const updateProfileMutation = useUpdateProfile();

  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    name: '',
    username: user?.username ?? '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    setProfileData((prev) => ({
      ...prev,
      name: userProfile?.first_name || user?.first_name || registeredName || prev.name,
      phone: userProfile?.phone || registeredPhone || prev.phone,
      address: userProfile?.address || prev.address,
    }));
  }, [userProfile, user?.first_name, registeredName, registeredPhone]);

  const handleSaveProfile = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateProfileMutation.mutateAsync({
        telegramId: userId,
        updates: {
          first_name: profileData.name,
          phone: profileData.phone,
          address: profileData.address,
        },
      });
      setEditMode(false);
      toast.success(language === 'ru' ? 'Профиль сохранён' : 'Profil saqlandi');
    } catch {
      toast.error(language === 'ru' ? 'Ошибка сохранения' : 'Saqlashda xatolik');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 space-y-4 pb-24">
        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm">
          <div className="bg-gradient-to-r from-surface-900 to-surface-800 px-5 pt-6 pb-12 rounded-t-2xl">
            <div className="flex items-start justify-between">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <button
                onClick={() => setEditMode(!editMode)}
                className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition"
              >
                {editMode ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
              </button>
            </div>
            <div className="mt-3">
              <h2 className="text-xl font-bold text-white">
                {profileData.name || user?.first_name || (language === 'ru' ? 'Гость' : 'Mehmon')}
              </h2>
              {(profileData.username || user?.username) && (
                <p className="text-surface-300 text-sm mt-0.5">@{profileData.username || user?.username}</p>
              )}
            </div>
          </div>

          <div className="-mt-6 mx-4 bg-white dark:bg-surface-700 rounded-2xl shadow-md px-4 py-3 grid grid-cols-3 text-center divide-x divide-gray-100 dark:divide-gray-600 relative z-10">
            <div>
              <p className="text-lg font-bold text-surface-900 dark:text-white">{orders.length}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Заказов' : 'Buyurtma'}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-surface-900 dark:text-white">
                {orders.filter((o) => o.status === 'delivered').length}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Доставлено' : 'Yetkazildi'}</p>
            </div>
            <div>
              <p className="text-lg font-bold text-surface-900 dark:text-white">
                {orders.filter((o) => !['delivered', 'cancelled', 'returned'].includes(o.status ?? '')).length}
              </p>
              <p className="text-xs text-surface-500 dark:text-surface-400">{language === 'ru' ? 'В пути' : 'Yo\'lda'}</p>
            </div>
          </div>

          {editMode && (
            <div className="px-4 pt-5 pb-4 space-y-3">
              <div>
                <label className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1 block">
                  {language === 'ru' ? 'Имя' : 'Ism'}
                </label>
                <input
                  value={profileData.name}
                  onChange={(e) => setProfileData((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-surface-200 dark:border-surface-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-surface-900"
                  placeholder={language === 'ru' ? 'Ваше имя' : 'Ismingiz'}
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {language === 'ru' ? 'Телефон' : 'Telefon'}
                </label>
                <input
                  value={profileData.phone}
                  onChange={(e) => setProfileData((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-surface-200 dark:border-surface-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-surface-900"
                  placeholder="+998 __ ___ __ __"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {language === 'ru' ? 'Адрес' : 'Manzil'}
                </label>
                <input
                  value={profileData.address}
                  onChange={(e) => setProfileData((p) => ({ ...p, address: e.target.value }))}
                  className="w-full border border-surface-200 dark:border-surface-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-surface-800 text-surface-900 dark:text-white outline-none focus:ring-2 focus:ring-surface-900"
                  placeholder={language === 'ru' ? 'Город, улица' : "Shahar, ko'cha"}
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white py-2.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2"
              >
                {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                {t('save_profile')}
              </button>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between">
            <h3 className="font-bold text-surface-900 dark:text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-surface-900" />
              {t('my_orders')}
            </h3>
            <span className="text-xs bg-surface-100 dark:bg-surface-700 text-surface-900 dark:text-surface-600 font-semibold px-2 py-0.5 rounded-full">
              {orders.length}
            </span>
          </div>

          {ordersLoading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-6 h-6 border-[3px] border-surface-900 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-10">
              <Package className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-2" />
              <p className="text-sm text-surface-500 dark:text-surface-400">{t('no_orders')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-surface-700">
              {orders.map((order) => {
                const expanded = expandedOrderId === order.id;
                const historyOpen = showHistory === order.id;
                const info = order.customer_info as { name?: string; phone?: string; city?: string };
                const history = Array.isArray(order.status_history) ? order.status_history : [];

                return (
                  <div key={order.id}>
                    <button
                      onClick={() => setExpandedOrderId(expanded ? null : order.id)}
                      className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-surface-50 dark:hover:bg-surface-700/30 transition text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-surface-900 dark:text-white text-sm">
                            #{order.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="font-bold text-surface-900 dark:text-white text-sm whitespace-nowrap">
                            {formatPrice(Number(order.total_amount))}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusColor(order.status ?? 'new')}`}>
                            {getStatusLabel(order.status ?? 'new', language)}
                          </span>
                          <span className="text-xs text-surface-400 dark:text-surface-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(order.created_at)}
                          </span>
                        </div>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-surface-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    {expanded && (
                      <div className="bg-surface-50 dark:bg-surface-700/20 px-4 py-3 space-y-3 border-t border-surface-100 dark:border-surface-700">
                        {info && (info.name || info.phone || info.city) && (
                          <div className="space-y-1.5">
                            {info.name && (
                              <div className="flex justify-between text-sm">
                                <span className="text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Получатель' : 'Qabul qiluvchi'}</span>
                                <span className="font-medium text-surface-900 dark:text-white">{info.name}</span>
                              </div>
                            )}
                            {info.phone && (
                              <div className="flex justify-between text-sm">
                                <span className="text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Телефон' : 'Telefon'}</span>
                                <span className="font-medium text-surface-900 dark:text-white">{info.phone}</span>
                              </div>
                            )}
                            {info.city && (
                              <div className="flex justify-between text-sm">
                                <span className="text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Город' : 'Shahar'}</span>
                                <span className="font-medium text-surface-900 dark:text-white">{info.city}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {Array.isArray(order.items) && order.items.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-surface-400 dark:text-surface-500 uppercase tracking-wide mb-2">
                              {language === 'ru' ? 'Товары' : 'Mahsulotlar'}
                            </p>
                            <div className="space-y-1">
                              {(order.items as Array<{ name: { ru: string; uz: string } | string; size?: string; quantity: number; price: number }>).map((item, i) => (
                                <div key={i} className="flex justify-between text-sm">
                                  <span className="text-surface-700 dark:text-surface-300 truncate max-w-[65%]">
                                    {typeof item.name === 'object' ? (item.name[language] ?? item.name.ru) : item.name ?? '—'}
                                    {item.size && <span className="text-surface-400"> / {item.size}</span>}
                                    {' '}×{item.quantity}
                                  </span>
                                  <span className="font-semibold text-surface-900 dark:text-white ml-2 whitespace-nowrap">
                                    {formatPrice(Number(item.price) * Number(item.quantity))}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {Number(order.delivery_cost) > 0 && (
                          <div className="flex justify-between text-sm pt-2 border-t border-surface-200 dark:border-surface-600">
                            <span className="text-surface-500 dark:text-surface-400">{language === 'ru' ? 'Доставка' : 'Yetkazib berish'}</span>
                            <span className="font-medium text-surface-900 dark:text-white">{formatPrice(Number(order.delivery_cost))}</span>
                          </div>
                        )}

                        {history.length > 0 && (
                          <div>
                            <button
                              onClick={() => setShowHistory(historyOpen ? null : order.id)}
                              className="flex items-center gap-1.5 text-xs font-semibold text-surface-900 dark:text-surface-600 hover:text-surface-800 dark:hover:text-surface-400 transition"
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {language === 'ru' ? 'История статусов' : 'Status tarixi'} ({history.length})
                              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${historyOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {historyOpen && (
                              <div className="mt-2 space-y-2 pl-2">
                                {[...history].reverse().map((entry, i) => (
                                  <div key={i} className="flex items-start gap-2">
                                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-surface-400" />
                                    <div>
                                      <p className="text-xs font-semibold text-surface-800 dark:text-gray-200">
                                        {getStatusLabel(entry.status, language)}
                                      </p>
                                      <p className="text-xs text-surface-400 dark:text-surface-500">
                                        {formatDate(entry.changed_at)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-surface-800 rounded-2xl shadow-sm overflow-hidden">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition border-b border-surface-100 dark:border-surface-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                <Globe className="w-4 h-4 text-surface-900 dark:text-surface-600" />
              </div>
              <span className="text-sm font-medium text-surface-900 dark:text-white">{t('change_language')}</span>
            </div>
            <span className="text-xs text-surface-500 dark:text-surface-400 font-medium">
              {language === 'ru' ? 'Русский' : "O'zbekcha"}
            </span>
          </button>

          <button
            onClick={() => navigate('/about')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition border-b border-surface-100 dark:border-surface-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                <Globe className="w-4 h-4 text-surface-600 dark:text-surface-400" />
              </div>
              <span className="text-sm font-medium text-surface-900 dark:text-white">
                {language === 'ru' ? 'О нас' : 'Biz haqimizda'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-400" />
          </button>

          <button
            onClick={() => navigate('/faq')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition border-b border-surface-100 dark:border-surface-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                <Globe className="w-4 h-4 text-surface-600 dark:text-surface-400" />
              </div>
              <span className="text-sm font-medium text-surface-900 dark:text-white">
                {language === 'ru' ? 'Вопрос-ответ' : 'Savol-javob'}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-400" />
          </button>

          <button
            onClick={() => navigate('/contact')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition border-b border-surface-100 dark:border-surface-700"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                <Globe className="w-4 h-4 text-surface-600 dark:text-surface-400" />
              </div>
              <span className="text-sm font-medium text-surface-900 dark:text-white">
                {language === 'ru' ? 'Связаться с нами' : "Biz bilan bog'lanish"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-400" />
          </button>

          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center justify-between p-4 hover:bg-surface-50 dark:hover:bg-surface-700 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-surface-100 dark:bg-surface-700 flex items-center justify-center">
                <Shield className="w-4 h-4 text-surface-600 dark:text-surface-400" />
              </div>
              <span className="text-sm font-medium text-surface-900 dark:text-white">{t('admin_panel')}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-surface-400" />
          </button>
        </div>

        <p className="text-center text-xs text-surface-400 dark:text-surface-600">KUPI Shop v1.0</p>
      </div>
    </Layout>
  );
};
