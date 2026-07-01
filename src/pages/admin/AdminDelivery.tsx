import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, Truck, ShoppingBag, LogOut, MapPin, Zap,
} from 'lucide-react';
import {
  useDeliveryZones,
  useCreateDeliveryZone,
  useUpdateDeliveryZone,
  useDeleteDeliveryZone,
} from '../../lib/supabase/hooks';
import { getCurrentAdmin, logoutAdmin, ROLE_LABELS } from '../../lib/auth';
import { auditLogQueries } from '../../lib/supabase/queries';
import { formatPrice } from '../../lib/utils';
import type { DeliveryZone } from '../../lib/supabase/queries';

type FormData = {
  city_ru: string;
  city_uz: string;
  region_ru: string;
  region_uz: string;
  standard_price: number;
  express_price: number;
  standard_days_min: number;
  standard_days_max: number;
  express_days_min: number;
  express_days_max: number;
  free_threshold: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_FORM: FormData = {
  city_ru: '',
  city_uz: '',
  region_ru: '',
  region_uz: '',
  standard_price: 20000,
  express_price: 50000,
  standard_days_min: 3,
  standard_days_max: 5,
  express_days_min: 1,
  express_days_max: 2,
  free_threshold: '',
  is_active: true,
  sort_order: 0,
};

function zoneToForm(zone: DeliveryZone): FormData {
  return {
    city_ru: zone.city_ru,
    city_uz: zone.city_uz,
    region_ru: zone.region_ru,
    region_uz: zone.region_uz,
    standard_price: zone.standard_price,
    express_price: zone.express_price,
    standard_days_min: zone.standard_days_min,
    standard_days_max: zone.standard_days_max,
    express_days_min: zone.express_days_min,
    express_days_max: zone.express_days_max,
    free_threshold: zone.free_threshold ? String(zone.free_threshold) : '',
    is_active: zone.is_active,
    sort_order: zone.sort_order,
  };
}

function formToZone(form: FormData) {
  return {
    city_ru: form.city_ru,
    city_uz: form.city_uz,
    region_ru: form.region_ru,
    region_uz: form.region_uz,
    standard_price: Number(form.standard_price),
    express_price: Number(form.express_price),
    standard_days_min: Number(form.standard_days_min),
    standard_days_max: Number(form.standard_days_max),
    express_days_min: Number(form.express_days_min),
    express_days_max: Number(form.express_days_max),
    free_threshold: form.free_threshold ? Number(form.free_threshold) : null,
    is_active: form.is_active,
    sort_order: Number(form.sort_order),
  };
}

function NumInput({
  label, value, onChange, min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">{label}</label>
      <input
        type="number"
        min={min ?? 0}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
      />
    </div>
  );
}

export const AdminDelivery = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const { data: zones = [], isLoading } = useDeliveryZones(false);
  const createZone = useCreateDeliveryZone();
  const updateZone = useUpdateDeliveryZone();
  const deleteZone = useDeleteDeliveryZone();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (!admin) return null;

  const filtered = zones.filter(
    (z) =>
      z.city_ru.toLowerCase().includes(search.toLowerCase()) ||
      z.city_uz.toLowerCase().includes(search.toLowerCase()) ||
      z.region_ru.toLowerCase().includes(search.toLowerCase()) ||
      z.region_uz.toLowerCase().includes(search.toLowerCase()),
  );

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, sort_order: zones.length + 1 });
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (zone: DeliveryZone) => {
    setForm(zoneToForm(zone));
    setEditingId(zone.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.city_ru.trim()) return;
    setSaving(true);
    try {
      const payload = formToZone(form);
      if (editingId) {
        await updateZone.mutateAsync({ id: editingId, data: payload });
        auditLogQueries.log({
          admin_id: admin?.id ?? 'unknown',
          action: 'update',
          entity_type: 'delivery_zones',
          entity_id: editingId,
          details: { city: form.city_ru },
        }).catch(() => {});
      } else {
        await createZone.mutateAsync(payload as Omit<DeliveryZone, 'id' | 'created_at' | 'updated_at'>);
        auditLogQueries.log({
          admin_id: admin?.id ?? 'unknown',
          action: 'create',
          entity_type: 'delivery_zones',
          details: { city: form.city_ru },
        }).catch(() => {});
      }
      setShowForm(false);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (zone: DeliveryZone) => {
    await updateZone.mutateAsync({ id: zone.id, data: { is_active: !zone.is_active } });
    auditLogQueries.log({
      admin_id: admin?.id ?? 'unknown',
      action: 'update',
      entity_type: 'delivery_zones',
      entity_id: zone.id,
      details: { city: zone.city_ru, is_active: !zone.is_active },
    }).catch(() => {});
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const zone = zones.find(z => z.id === deleteId);
    await deleteZone.mutateAsync(deleteId);
    setDeleteId(null);
    auditLogQueries.log({
      admin_id: admin?.id ?? 'unknown',
      action: 'delete',
      entity_type: 'delivery_zones',
      entity_id: deleteId,
      details: { city: zone?.city_ru },
    }).catch(() => {});
  };

  const tf = (field: keyof FormData, val: string) => setForm({ ...form, [field]: val });

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1.5 text-surface-500 hover:text-surface-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-sm">Назад</span>
            </Link>
            <span className="text-surface-300 dark:text-surface-600">|</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-surface-900 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-surface-900 dark:text-white text-sm">Доставка</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-surface-900 dark:text-white leading-none">{admin.first_name}</p>
              <p className="text-xs text-surface-500 dark:text-surface-400 mt-0.5">{ROLE_LABELS[admin.role]}</p>
            </div>
            <button
              onClick={() => { logoutAdmin(); navigate('/admin'); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 hover:text-surface-900 dark:hover:text-white transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Зоны доставки</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Тарифы по городам Узбекистана</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Добавить зону
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">Всего зон</p>
            <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">{zones.length}</p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">Активных</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
              {zones.filter((z) => z.is_active).length}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">Мин. цена</p>
            <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
              {zones.length ? formatPrice(Math.min(...zones.map((z) => z.standard_price))) : '—'}
            </p>
          </div>
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 p-4">
            <p className="text-xs text-surface-500 dark:text-surface-400">С бесплатной</p>
            <p className="text-2xl font-bold text-surface-900 dark:text-white mt-1">
              {zones.filter((z) => z.free_threshold && z.free_threshold > 0).length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по городу или региону..."
            className="w-full max-w-sm px-4 py-2.5 bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900 placeholder:text-surface-400"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 shadow-sm overflow-hidden">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <Truck className="w-10 h-10 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                <p className="text-surface-500 dark:text-surface-400 font-medium">Зон не найдено</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-50 dark:bg-surface-700/50 border-b border-surface-100 dark:border-surface-700">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">Город / Регион</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">Стандарт</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">Экспресс</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide hidden sm:table-cell">Беспл. от</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide">Статус</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-surface-700/50">
                    {filtered.map((zone) => (
                      <tr key={zone.id} className="hover:bg-surface-50/50 dark:hover:bg-surface-700/20 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <MapPin className="w-3.5 h-3.5 text-surface-900 flex-shrink-0" />
                            <div>
                              <p className="font-semibold text-surface-900 dark:text-white">{zone.city_ru}</p>
                              <p className="text-[11px] text-surface-500 dark:text-surface-400">{zone.region_ru}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <p className="font-semibold text-surface-900 dark:text-white">{formatPrice(zone.standard_price)}</p>
                          <p className="text-[11px] text-surface-500 dark:text-surface-400">
                            {zone.standard_days_min}–{zone.standard_days_max} дн.
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Zap className="w-3 h-3 text-orange-500" />
                            <p className="font-semibold text-surface-900 dark:text-white">{formatPrice(zone.express_price)}</p>
                          </div>
                          <p className="text-[11px] text-surface-500 dark:text-surface-400">
                            {zone.express_days_min}–{zone.express_days_max} дн.
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-right hidden sm:table-cell">
                          {zone.free_threshold && zone.free_threshold > 0 ? (
                            <p className="text-xs font-medium text-green-600 dark:text-green-400">
                              {formatPrice(zone.free_threshold)}
                            </p>
                          ) : (
                            <p className="text-xs text-surface-400 dark:text-surface-500">—</p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            zone.is_active
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                          }`}>
                            {zone.is_active ? 'Активна' : 'Скрыта'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => handleToggle(zone)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                              title={zone.is_active ? 'Скрыть' : 'Активировать'}
                            >
                              {zone.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => openEdit(zone)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-surface-900 dark:hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteId(zone.id)}
                              className="p-1.5 rounded-lg text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative bg-white dark:bg-surface-800 w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-surface-100 dark:border-surface-700 flex items-center justify-between flex-shrink-0">
              <h2 className="text-lg font-bold text-surface-900 dark:text-white">
                {editingId ? 'Редактировать зону' : 'Новая зона доставки'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-surface-400 hover:text-surface-700 dark:hover:text-gray-200 transition-colors p-1">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* City names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Город (RU) *</label>
                  <input value={form.city_ru} onChange={(e) => tf('city_ru', e.target.value)} placeholder="Ташкент"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Город (UZ) *</label>
                  <input value={form.city_uz} onChange={(e) => tf('city_uz', e.target.value)} placeholder="Toshkent"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Регион (RU)</label>
                  <input value={form.region_ru} onChange={(e) => tf('region_ru', e.target.value)} placeholder="г. Ташкент"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Регион (UZ)</label>
                  <input value={form.region_uz} onChange={(e) => tf('region_uz', e.target.value)} placeholder="Toshkent shahri"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900" />
                </div>
              </div>

              <div className="border-t border-surface-100 dark:border-surface-700 pt-4">
                <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3">Стандартная доставка</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <NumInput label="Цена (сум)" value={form.standard_price} onChange={(v) => setForm({ ...form, standard_price: v })} min={0} />
                  <NumInput label="Мин. дней" value={form.standard_days_min} onChange={(v) => setForm({ ...form, standard_days_min: v })} min={0} />
                  <NumInput label="Макс. дней" value={form.standard_days_max} onChange={(v) => setForm({ ...form, standard_days_max: v })} min={0} />
                  <div />
                </div>
              </div>

              <div className="border-t border-surface-100 dark:border-surface-700 pt-4">
                <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-orange-500" /> Экспресс доставка
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <NumInput label="Цена (сум)" value={form.express_price} onChange={(v) => setForm({ ...form, express_price: v })} min={0} />
                  <NumInput label="Мин. дней" value={form.express_days_min} onChange={(v) => setForm({ ...form, express_days_min: v })} min={0} />
                  <NumInput label="Макс. дней" value={form.express_days_max} onChange={(v) => setForm({ ...form, express_days_max: v })} min={0} />
                  <div />
                </div>
              </div>

              <div className="border-t border-surface-100 dark:border-surface-700 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Беспл. от (сум, пусто = нет)</label>
                    <input
                      type="number"
                      min={0}
                      value={form.free_threshold}
                      onChange={(e) => tf('free_threshold', e.target.value)}
                      placeholder="500000"
                      className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                    />
                  </div>
                  <NumInput label="Порядок" value={form.sort_order} onChange={(v) => setForm({ ...form, sort_order: v })} min={0} />
                  <div>
                    <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Активна</label>
                    <button
                      onClick={() => setForm({ ...form, is_active: !form.is_active })}
                      className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        form.is_active
                          ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                          : 'bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600'
                      }`}
                    >
                      {form.is_active ? 'Да, доступна' : 'Нет, скрыта'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-surface-100 dark:border-surface-700 flex gap-3 flex-shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.city_ru.trim()}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {saving ? 'Сохранение...' : editingId ? 'Сохранить' : 'Создать'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Удалить зону?</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors">
                Отмена
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
