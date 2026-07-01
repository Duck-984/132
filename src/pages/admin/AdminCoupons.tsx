import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Tag, Trash2, X } from 'lucide-react';
import { useCoupons, useCreateCoupon, useDeleteCoupon } from '../../lib/supabase/hooks';
import { toast } from '../../components/Toast';
import { formatPrice } from '../../lib/utils';
import { auditLogQueries } from '../../lib/supabase/queries';
import { getCurrentAdmin } from '../../lib/auth';

export const AdminCoupons = () => {
  const admin = getCurrentAdmin();
  const { data: coupons = [], isLoading } = useCoupons();
  const createCoupon = useCreateCoupon();
  const deleteCoupon = useDeleteCoupon();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: '',
    min_order_amount: '',
    max_uses_total: '',
    max_uses_per_user: '1',
    valid_until: '',
    new_customers_only: false,
  });

  const handleCreate = async () => {
    if (!form.code.trim() || !form.value) {
      toast.error('Заполните код и значение');
      return;
    }
    try {
      await createCoupon.mutateAsync({
        code: form.code.toUpperCase().trim(),
        type: form.type,
        value: Number(form.value),
        min_order_amount: Number(form.min_order_amount) || 0,
        max_uses_total: form.max_uses_total ? Number(form.max_uses_total) : null,
        max_uses_per_user: Number(form.max_uses_per_user) || 1,
        valid_from: new Date().toISOString(),
        valid_until: form.valid_until || null,
        is_active: true,
        new_customers_only: form.new_customers_only,
      });
      toast.success('Купон создан');
      setShowCreate(false);
      setForm({ code: '', type: 'percent', value: '', min_order_amount: '', max_uses_total: '', max_uses_per_user: '1', valid_until: '', new_customers_only: false });

      auditLogQueries.log({
        admin_id: admin?.id ?? 'unknown',
        action: 'create',
        entity_type: 'coupons',
        details: { code: form.code.toUpperCase(), type: form.type, value: Number(form.value) },
      }).catch(() => {});
    } catch {
      toast.error('Ошибка создания');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить купон?')) return;
    const coupon = coupons.find(c => c.id === id);
    await deleteCoupon.mutateAsync(id);
    toast.success('Удалён');

    auditLogQueries.log({
      admin_id: admin?.id ?? 'unknown',
      action: 'delete',
      entity_type: 'coupons',
      entity_id: id,
      details: { code: coupon?.code },
    }).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin/dashboard" className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-lg font-bold text-surface-900 dark:text-white">Купоны</h1>
          </div>
          <button onClick={() => setShowCreate(true)} className="btn-brand px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" /> Создать
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="text-center py-12"><span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" /></div>
        ) : coupons.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500">Нет купонов</p>
          </div>
        ) : (
          coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white dark:bg-surface-800 rounded-2xl p-4 border border-surface-200 dark:border-surface-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-900 flex items-center justify-center">
                  <Tag className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-surface-900 dark:text-white font-mono">{coupon.code}</p>
                  <p className="text-xs text-surface-500">
                    {coupon.type === 'percent' ? `${coupon.value}%` : formatPrice(coupon.value)}
                    {coupon.min_order_amount > 0 && ` · мин. ${formatPrice(coupon.min_order_amount)}`}
                    {coupon.new_customers_only && ' · новые клиенты'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${coupon.is_active ? 'bg-success/10 text-success' : 'bg-surface-100 text-surface-500'}`}>
                  {coupon.is_active ? 'Активен' : 'Выкл'}
                </span>
                <button onClick={() => handleDelete(coupon.id)} className="p-2 rounded-lg hover:bg-danger/10 text-surface-400 hover:text-danger transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-surface-800 rounded-t-2xl sm:rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">Новый купон</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-surface-500 mb-1 block">Код</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-premium text-sm" placeholder="SALE20" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-500 mb-1 block">Тип</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as 'percent' | 'fixed' })} className="input-premium text-sm">
                    <option value="percent">Процент</option>
                    <option value="fixed">Фикс</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-500 mb-1 block">Значение</label>
                  <input type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="input-premium text-sm" placeholder={form.type === 'percent' ? '20' : '50000'} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-500 mb-1 block">Мин. сумма</label>
                  <input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })} className="input-premium text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-500 mb-1 block">Лимит всего</label>
                  <input type="number" value={form.max_uses_total} onChange={(e) => setForm({ ...form, max_uses_total: e.target.value })} className="input-premium text-sm" placeholder="∞" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-surface-500 mb-1 block">Лимит/пользователь</label>
                  <input type="number" value={form.max_uses_per_user} onChange={(e) => setForm({ ...form, max_uses_per_user: e.target.value })} className="input-premium text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-surface-500 mb-1 block">Действует до</label>
                  <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="input-premium text-sm" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-surface-700 dark:text-surface-300">
                <input type="checkbox" checked={form.new_customers_only} onChange={(e) => setForm({ ...form, new_customers_only: e.target.checked })} className="rounded" />
                Только для новых клиентов
              </label>
              <button onClick={handleCreate} disabled={createCoupon.isPending} className="btn-brand w-full py-3 rounded-xl text-sm">
                {createCoupon.isPending ? 'Создание...' : 'Создать купон'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
