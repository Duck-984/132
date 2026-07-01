import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, X, AlertCircle, Shield, Users, Send, MessageCircle, Package, ChevronDown, ChevronRight, ChevronLeft, Search } from 'lucide-react';
import { hashSync } from 'bcryptjs';
import { supabase } from '../../lib/supabase';
import { getCurrentAdmin, AdminRole, ROLE_LABELS } from '../../lib/auth';
import { formatPrice } from '../../lib/utils';
import { auditLogQueries } from '../../lib/supabase/queries';
import type { OrderItem, CustomerInfo } from '../../lib/supabase';
import { adminQueries } from '../../lib/adminApi';

interface AdminAccount {
  id: string;
  email: string;
  first_name: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
}

interface TelegramUser {
  id: string;
  telegram_id: number;
  first_name: string;
  username: string | null;
  language: string;
  created_at: string;
}

const ROLES: AdminRole[] = ['super_admin', 'admin', 'manager', 'seller', 'support', 'content'];

const roleCls: Record<string, string> = {
  admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  manager: 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300',
  seller: 'bg-surface-100 dark:bg-surface-700 text-surface-700 dark:text-surface-300',
  super_admin: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
  support: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  content: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
};

const roleDescriptions: Record<AdminRole, string> = {
  super_admin: 'Полный доступ, управление пользователями и безопасность',
  admin: 'Полный доступ ко всем разделам панели управления',
  manager: 'Доступ к товарам, заказам, баннерам, доставке и аналитике',
  seller: 'Доступ только к управлению товарами и складом',
  support: 'Доступ к заказам и возвратам для поддержки клиентов',
  content: 'Доступ к товарам, баннерам и контенту',
};

export const AdminUsers = () => {
  const admin = getCurrentAdmin();
  const [tab, setTab] = useState<'admins' | 'telegram'>('admins');

  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);
  const [telegramUsers, setTelegramUsers] = useState<TelegramUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AdminAccount | null>(null);
  const [form, setForm] = useState({
    email: '',
    password_plain: '',
    first_name: '',
    role: 'seller' as AdminRole,
    is_active: true,
  });

  const BCRYPT_SALT_ROUNDS = 10;
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Message to user
  const [messageModal, setMessageModal] = useState<{ telegramId: number; firstName: string } | null>(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Order history
  const [ordersModal, setOrdersModal] = useState<{ telegramId: number; firstName: string } | null>(null);
  const [userOrders, setUserOrders] = useState<Database['public']['Tables']['orders']['Row'][]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const USERS_PER_PAGE = 10;
  const [usersPage, setUsersPage] = useState(1);

  const filteredUsers = telegramUsers.filter((u) => {
    if (!userSearch.trim()) return true;
    const q = userSearch.toLowerCase();
    return (
      u.first_name?.toLowerCase().includes(q) ||
      u.username?.toLowerCase().includes(q) ||
      String(u.telegram_id).includes(q)
    );
  });

  const totalUsersPages = Math.ceil(filteredUsers.length / USERS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (usersPage - 1) * USERS_PER_PAGE,
    usersPage * USERS_PER_PAGE
  );

  // Reset page when search changes
  useEffect(() => { setUsersPage(1); }, [userSearch]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (tab === 'admins') {
        const data = await adminQueries.getAdminAccounts();
        setAdminAccounts((Array.isArray(data) ? data : []) as AdminAccount[]);
      } else {
        const { data, error: err } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);
        if (err) throw err;
        setTelegramUsers(data ?? []);
      }
    } catch {
      setError('Не удалось загрузить данные.');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    loadData();
  }, [tab, loadData]);

  const openCreate = () => {
    setEditing(null);
    setForm({ email: '', password_plain: '', first_name: '', role: 'seller', is_active: true });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (u: AdminAccount) => {
    setEditing(u);
    setForm({
      email: u.email,
      password_plain: '',
      first_name: u.first_name,
      role: u.role,
      is_active: u.is_active,
    });
    setFormError('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.first_name.trim()) { setFormError('Введите имя'); return; }
    if (!form.email.trim()) { setFormError('Введите email'); return; }
    if (!editing && !form.password_plain) { setFormError('Введите пароль'); return; }

    setSaving(true);
    try {
      if (editing) {
        const updates: Record<string, unknown> = {
          first_name: form.first_name.trim(),
          role: form.role,
          is_active: form.is_active,
        };
        if (form.password_plain) {
          updates.password_hash = hashSync(form.password_plain, BCRYPT_SALT_ROUNDS);
        }
        await adminQueries.updateAdminAccount(editing.id, updates);
        setSuccess('Сотрудник обновлён');
      } else {
        await adminQueries.createAdminAccount({
          email: form.email.trim().toLowerCase(),
          password_hash: hashSync(form.password_plain, BCRYPT_SALT_ROUNDS),
          first_name: form.first_name.trim(),
          role: form.role,
          is_active: form.is_active,
        });
        setSuccess('Сотрудник добавлен');
      }
      closeForm();
      await loadData();
      setTimeout(() => setSuccess(''), 3000);

      auditLogQueries.log({
        admin_id: admin?.id ?? 'unknown',
        action: editing ? 'update' : 'create',
        entity_type: 'admin_accounts',
        entity_id: editing?.id ?? null,
        details: { email: form.email, role: form.role, name: form.first_name },
      }).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка при сохранении';
      setFormError(msg.includes('duplicate') ? 'Этот email уже используется' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить сотрудника? Действие необратимо.')) return;
    const account = adminAccounts.find(a => a.id === id);
    try {
      const { error: err } = await supabase.from('admin_accounts').delete().eq('id', id);
      if (err) throw err;
      setAdminAccounts((prev) => prev.filter((u) => u.id !== id));
      setSuccess('Сотрудник удалён');
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError('Ошибка при удалении.');
      return;
    }

    auditLogQueries.log({
      admin_id: admin?.id ?? 'unknown',
      action: 'delete',
      entity_type: 'admin_accounts',
      entity_id: id,
      details: { email: account?.email, name: account?.first_name },
    }).catch(() => {});
  };

  const toggleActive = async (account: AdminAccount) => {
    try {
      await adminQueries.updateAdminAccount(account.id, { is_active: !account.is_active });
      setAdminAccounts((prev) =>
        prev.map((u) => u.id === account.id ? { ...u, is_active: !u.is_active } : u)
      );
    } catch {
      setError('Ошибка обновления статуса');
      return;
    }

    auditLogQueries.log({
      admin_id: admin?.id ?? 'unknown',
      action: 'update',
      entity_type: 'admin_accounts',
      entity_id: account.id,
      details: { email: account.email, is_active: !account.is_active },
    }).catch(() => {});
  };

  const fetchUserOrders = async (telegramId: number) => {
    setOrdersLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('telegram_user_id', telegramId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserOrders(data ?? []);
    } catch {
      setError('Не удалось загрузить заказы');
      setTimeout(() => setError(''), 3000);
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageModal || !messageText.trim()) return;
    setSendingMessage(true);
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
          telegram_user_id: messageModal.telegramId,
          message: messageText.trim(),
        }),
      });
      const result = await response.json();
      if (result.success) {
        setSuccess(`Сообщение отправлено ${messageModal.firstName}`);
        setMessageModal(null);
        setMessageText('');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(result.error || 'Ошибка отправки сообщения');
        setTimeout(() => setError(''), 3000);
      }
    } catch {
      setError('Ошибка отправки сообщения');
      setTimeout(() => setError(''), 3000);
    } finally {
      setSendingMessage(false);
    }
  };

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
            <h1 className="text-lg font-bold text-surface-900 dark:text-white">Пользователи</h1>
          </div>
          {tab === 'admins' && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить</span>
            </button>
          )}
        </div>
      </header>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md shadow-2xl border border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100 dark:border-surface-700">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                {editing ? 'Редактировать сотрудника' : 'Новый сотрудник'}
              </h2>
              <button
                onClick={closeForm}
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Имя
                </label>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-surface-900 focus:border-transparent outline-none text-sm"
                  placeholder="Иван Петров"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  disabled={!!editing}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-surface-900 focus:border-transparent outline-none text-sm disabled:opacity-60"
                  placeholder="manager@shop.uz"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  {editing ? 'Новый пароль (оставьте пустым чтобы не менять)' : 'Пароль'}
                </label>
                <input
                  type="password"
                  value={form.password_plain}
                  onChange={(e) => setForm({ ...form, password_plain: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-surface-900 focus:border-transparent outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Роль
                </label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as AdminRole })}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white focus:ring-2 focus:ring-surface-900 focus:border-transparent outline-none text-sm"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1.5">
                  {roleDescriptions[form.role]}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-surface-900' : 'bg-surface-300 dark:bg-gray-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-surface-700 dark:text-surface-300">
                  {form.is_active ? 'Активен' : 'Заблокирован'}
                </span>
              </div>

              {formError && (
                <div className="flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
                >
                  {saving && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {editing ? 'Сохранить' : 'Создать'}
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-900 dark:text-white font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  Отмена
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {ordersModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-2xl max-h-[80vh] shadow-2xl border border-surface-200 dark:border-surface-700 flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100 dark:border-surface-700 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-900 flex items-center justify-center">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-surface-900 dark:text-white">История заказов</h2>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {ordersModal.firstName} · ID: {ordersModal.telegramId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setOrdersModal(null); setUserOrders([]); setExpandedOrderId(null); }}
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {ordersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : userOrders.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                  <p className="text-sm text-surface-500 dark:text-surface-400">У этого пользователя пока нет заказов</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrders.map((order) => {
                    const isExpanded = expandedOrderId === order.id;
                    const items = Array.isArray(order.items) ? order.items : [];
                    return (
                      <div key={order.id} className="bg-surface-50 dark:bg-surface-700/50 rounded-xl border border-surface-200 dark:border-surface-600 overflow-hidden">
                        <button
                          onClick={() => setExpandedOrderId(isExpanded ? null : order.id)}
                          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-100 dark:hover:bg-surface-700 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-surface-900 dark:text-white font-mono">
                              #{order.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              order.status === 'delivered' ? 'bg-green-100 text-green-700' :
                              order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              'bg-surface-200 text-surface-700'
                            }`}>
                              {order.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-surface-900 dark:text-white">
                              {formatPrice(Number(order.total_amount))}
                            </span>
                            <span className="text-xs text-surface-500 dark:text-surface-400">
                              {new Date(order.created_at).toLocaleDateString('ru-RU')}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-4 pb-4 border-t border-surface-200 dark:border-surface-600 pt-3 space-y-2">
                            {items.map((item: OrderItem, i: number) => (
                              <div key={i} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                  {item.image && (
                                    <img src={item.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
                                  )}
                                  <span className="text-surface-700 dark:text-surface-300">
                                    {typeof item.name === 'object' ? (item.name as { ru: string }).ru : item.name}
                                    {item.size && <span className="text-surface-400"> · {item.size}</span>}
                                    {' '}× {item.quantity}
                                  </span>
                                </div>
                                <span className="font-semibold text-surface-900 dark:text-white">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                            <div className="flex justify-between pt-2 border-t border-surface-200 dark:border-surface-600 text-sm">
                              <span className="text-surface-500 dark:text-surface-400">Доставка</span>
                              <span className="font-medium text-surface-900 dark:text-white">{formatPrice(Number(order.delivery_cost))}</span>
                            </div>
                            {order.customer_info && (
                              <div className="pt-2 border-t border-surface-200 dark:border-surface-600 text-xs text-surface-500 dark:text-surface-400">
                                <p>{(order.customer_info as CustomerInfo)?.name} · {(order.customer_info as CustomerInfo)?.phone}</p>
                                <p>{(order.customer_info as CustomerInfo)?.city}, {(order.customer_info as CustomerInfo)?.address}</p>
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
          </div>
        </div>
      )}

      {messageModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-surface-800 rounded-2xl w-full max-w-md shadow-2xl border border-surface-200 dark:border-surface-700">
            <div className="flex items-center justify-between px-6 py-5 border-b border-surface-100 dark:border-surface-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-900 flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-surface-900 dark:text-white">Написать клиенту</h2>
                  <p className="text-xs text-surface-500 dark:text-surface-400">
                    {messageModal.firstName} · ID: {messageModal.telegramId}
                  </p>
                </div>
              </div>
              <button
                onClick={() => { setMessageModal(null); setMessageText(''); }}
                className="p-1.5 rounded-lg text-surface-500 hover:text-surface-900 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-surface-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-surface-700 dark:text-surface-300 mb-1.5">
                  Сообщение
                </label>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Введите сообщение... (поддерживается HTML: &lt;b&gt;жирный&lt;/b&gt;, &lt;i&gt;курсив&lt;/i&gt;)"
                  rows={5}
                  className="w-full px-4 py-3 rounded-xl border border-surface-300 dark:border-surface-600 bg-white dark:bg-surface-700 text-surface-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-surface-900 focus:border-transparent outline-none text-sm resize-none"
                />
                <p className="text-xs text-surface-400 dark:text-surface-500 mt-1.5">
                  Сообщение будет отправлено через Telegram бот
                </p>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSendMessage}
                  disabled={sendingMessage || !messageText.trim()}
                  className="flex-1 flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2.5 rounded-xl transition disabled:opacity-60 text-sm"
                >
                  {sendingMessage ? (
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {sendingMessage ? 'Отправка...' : 'Отправить'}
                </button>
                <button
                  type="button"
                  onClick={() => { setMessageModal(null); setMessageText(''); }}
                  className="flex-1 bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-900 dark:text-white font-semibold py-2.5 rounded-xl transition text-sm"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {success && (
          <div className="mb-5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-xl px-4 py-3 text-sm">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('admins')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'admins' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'}`}
          >
            <Shield className="w-4 h-4" />
            Сотрудники панели
          </button>
          <button
            onClick={() => setTab('telegram')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'telegram' ? 'bg-brand-600 text-white' : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 hover:bg-surface-50 dark:hover:bg-surface-700'}`}
          >
            <Users className="w-4 h-4" />
            Покупатели
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tab === 'admins' ? (
          adminAccounts.length === 0 ? (
            <div className="text-center py-20 text-surface-400 dark:text-surface-500 text-sm">
              Нет сотрудников
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-700/50 border-b border-surface-200 dark:border-surface-700">
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Имя</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Email</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Роль</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300 hidden sm:table-cell">Последний вход</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Статус</th>
                    <th className="text-right px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-surface-700">
                  {adminAccounts.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition">
                      <td className="px-6 py-4 font-semibold text-surface-900 dark:text-white">
                        {u.first_name}
                      </td>
                      <td className="px-6 py-4 text-surface-500 dark:text-surface-400 text-xs">
                        {u.email}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleCls[u.role] ?? roleCls.seller}`}>
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-surface-500 dark:text-surface-400 text-xs hidden sm:table-cell">
                        {u.last_login_at
                          ? new Date(u.last_login_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleActive(u)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full transition ${u.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' : 'bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400'}`}
                        >
                          {u.is_active ? 'Активен' : 'Заблокирован'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEdit(u)}
                            className="p-2 text-surface-900 dark:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-200 rounded-lg transition"
                            title="Редактировать"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="p-2 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          telegramUsers.length === 0 ? (
            <div className="text-center py-20 text-surface-400 dark:text-surface-500 text-sm">
              Нет покупателей
            </div>
          ) : (
            <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
              {telegramUsers.length > 5 && (
                <div className="px-4 py-3 border-b border-surface-200 dark:border-surface-700">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                    <input
                      type="text"
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Поиск по имени, username или ID..."
                      className="w-full pl-10 pr-4 py-2 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                    />
                  </div>
                </div>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-50 dark:bg-surface-700/50 border-b border-surface-200 dark:border-surface-700">
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Имя</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Username</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Telegram ID</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Язык</th>
                    <th className="text-left px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Добавлен</th>
                    <th className="text-right px-6 py-3 font-semibold text-surface-700 dark:text-surface-300">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-surface-700">
                  {paginatedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-surface-50 dark:hover:bg-surface-700/30 transition">
                      <td className="px-6 py-4 font-semibold text-surface-900 dark:text-white">
                        {u.first_name}
                      </td>
                      <td className="px-6 py-4 text-surface-500 dark:text-surface-400">
                        {u.username ? `@${u.username}` : '—'}
                      </td>
                      <td className="px-6 py-4 text-surface-500 dark:text-surface-400 font-mono text-xs">
                        {u.telegram_id}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium px-2 py-0.5 bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 rounded-full uppercase">
                          {u.language}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-surface-500 dark:text-surface-400 text-xs">
                        {new Date(u.created_at).toLocaleDateString('ru-RU')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setOrdersModal({ telegramId: u.telegram_id, firstName: u.first_name });
                              fetchUserOrders(u.telegram_id);
                            }}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-700 hover:bg-surface-200 dark:hover:bg-surface-600 text-surface-700 dark:text-surface-300 text-xs font-medium transition"
                          >
                            <Package className="w-3 h-3" />
                            Заказы
                          </button>
                          <button
                            onClick={() => setMessageModal({ telegramId: u.telegram_id, firstName: u.first_name })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium transition"
                          >
                            <Send className="w-3 h-3" />
                            Написать
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {userSearch.trim() && filteredUsers.length === 0 && (
                <div className="text-center py-8 text-surface-500 dark:text-surface-400 text-sm">
                  Пользователи не найдены по запросу "{userSearch}"
                </div>
              )}
              {filteredUsers.length > USERS_PER_PAGE && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-surface-200 dark:border-surface-700">
                  <span className="text-xs text-surface-500 dark:text-surface-400">
                    {filteredUsers.length} пользователей · Страница {usersPage} из {totalUsersPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setUsersPage((p) => Math.max(1, p - 1))}
                      disabled={usersPage === 1}
                      className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30 transition"
                    >
                      <ChevronLeft className="w-4 h-4 text-surface-600 dark:text-surface-400" />
                    </button>
                    {Array.from({ length: Math.min(totalUsersPages, 5) }, (_, i) => {
                      let pageNum: number;
                      if (totalUsersPages <= 5) {
                        pageNum = i + 1;
                      } else if (usersPage <= 3) {
                        pageNum = i + 1;
                      } else if (usersPage >= totalUsersPages - 2) {
                        pageNum = totalUsersPages - 4 + i;
                      } else {
                        pageNum = usersPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setUsersPage(pageNum)}
                          className={`w-8 h-8 rounded-lg text-xs font-semibold transition ${
                            usersPage === pageNum
                              ? 'bg-brand-600 text-white'
                              : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-700'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    <button
                      onClick={() => setUsersPage((p) => Math.min(totalUsersPages, p + 1))}
                      disabled={usersPage === totalUsersPages}
                      className="p-1.5 rounded-lg border border-surface-200 dark:border-surface-600 hover:bg-surface-100 dark:hover:bg-surface-700 disabled:opacity-30 transition"
                    >
                      <ChevronRight className="w-4 h-4 text-surface-600 dark:text-surface-400" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </main>
    </div>
  );
};
