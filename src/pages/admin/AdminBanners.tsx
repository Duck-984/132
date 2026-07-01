import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Eye, EyeOff, GripVertical, Image, ShoppingBag, LogOut } from 'lucide-react';
import { useBanners, useCreateBanner, useUpdateBanner, useDeleteBanner } from '../../lib/supabase/hooks';
import { getCurrentAdmin, logoutAdmin, ROLE_LABELS } from '../../lib/auth';
import { auditLogQueries } from '../../lib/supabase/queries';
import type { Banner } from '../../lib/supabase/queries';
import type { Database } from '../../lib/supabase';

const GRADIENT_OPTIONS = [
  { label: 'Синий', value: 'from-blue-600 to-cyan-500' },
  { label: 'Зелёный', value: 'from-emerald-500 to-teal-600' },
  { label: 'Оранжевый', value: 'from-orange-500 to-red-500' },
  { label: 'Тёмный', value: 'from-gray-800 to-gray-600' },
  { label: 'Розовый', value: 'from-rose-500 to-pink-600' },
  { label: 'Жёлтый', value: 'from-yellow-400 to-orange-500' },
];

type FormData = {
  title_ru: string;
  title_uz: string;
  subtitle_ru: string;
  subtitle_uz: string;
  image_url: string;
  link_url: string;
  link_label_ru: string;
  link_label_uz: string;
  bg_color: string;
  is_active: boolean;
  sort_order: number;
};

const EMPTY_FORM: FormData = {
  title_ru: '',
  title_uz: '',
  subtitle_ru: '',
  subtitle_uz: '',
  image_url: '',
  link_url: '',
  link_label_ru: '',
  link_label_uz: '',
  bg_color: 'from-blue-600 to-cyan-500',
  is_active: true,
  sort_order: 0,
};

function bannerToForm(banner: Banner): FormData {
  return {
    title_ru: banner.title.ru,
    title_uz: banner.title.uz,
    subtitle_ru: banner.subtitle.ru,
    subtitle_uz: banner.subtitle.uz,
    image_url: banner.image_url,
    link_url: banner.link_url ?? '',
    link_label_ru: banner.link_label?.ru ?? '',
    link_label_uz: banner.link_label?.uz ?? '',
    bg_color: banner.bg_color,
    is_active: banner.is_active,
    sort_order: banner.sort_order,
  };
}

function formToBanner(form: FormData) {
  return {
    title: { ru: form.title_ru, uz: form.title_uz },
    subtitle: { ru: form.subtitle_ru, uz: form.subtitle_uz },
    image_url: form.image_url,
    link_url: form.link_url || null,
    link_label: form.link_label_ru ? { ru: form.link_label_ru, uz: form.link_label_uz } : null,
    bg_color: form.bg_color,
    is_active: form.is_active,
    sort_order: form.sort_order,
  };
}

export const AdminBanners = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const { data: banners = [], isLoading } = useBanners(false);
  const createBanner = useCreateBanner();
  const updateBanner = useUpdateBanner();
  const deleteBanner = useDeleteBanner();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (!admin) return null;

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (banner: Banner) => {
    setForm(bannerToForm(banner));
    setEditingId(banner.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.title_ru.trim() || !form.image_url.trim()) return;
    setSaving(true);
    try {
      const payload = formToBanner(form);
      if (editingId) {
        await updateBanner.mutateAsync({ id: editingId, data: payload });
        auditLogQueries.log({
          admin_id: admin?.id ?? 'unknown',
          action: 'update',
          entity_type: 'banners',
          entity_id: editingId,
          details: { title: form.title_ru },
        }).catch(() => {});
      } else {
        await createBanner.mutateAsync(payload as Omit<Database['public']['Tables']['banners']['Row'], 'id' | 'created_at' | 'updated_at'>);
        auditLogQueries.log({
          admin_id: admin?.id ?? 'unknown',
          action: 'create',
          entity_type: 'banners',
          details: { title: form.title_ru },
        }).catch(() => {});
      }
      setShowForm(false);
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (banner: Banner) => {
    await updateBanner.mutateAsync({ id: banner.id, data: { is_active: !banner.is_active } });
    auditLogQueries.log({
      admin_id: admin?.id ?? 'unknown',
      action: 'update',
      entity_type: 'banners',
      entity_id: banner.id,
      details: { is_active: !banner.is_active },
    }).catch(() => {});
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    const banner = banners.find(b => b.id === deleteId);
    await deleteBanner.mutateAsync(deleteId);
    setDeleteId(null);
    auditLogQueries.log({
      admin_id: admin?.id ?? 'unknown',
      action: 'delete',
      entity_type: 'banners',
      entity_id: deleteId,
      details: { title: banner?.title?.ru },
    }).catch(() => {});
  };

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
              <span className="font-bold text-surface-900 dark:text-white text-sm">Баннеры</span>
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Рекламные баннеры</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Управление слайдером на главной странице</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-medium transition-colors text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Добавить баннер
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : banners.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-surface-800 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
            <Image className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">Баннеров пока нет</p>
            <p className="text-sm text-surface-400 dark:text-surface-500 mt-1">Нажмите «Добавить баннер» чтобы создать первый</p>
          </div>
        ) : (
          <div className="space-y-4">
            {banners.map((banner) => (
              <div
                key={banner.id}
                className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden shadow-sm"
              >
                <div className="flex items-stretch">
                  <div className={`w-2 bg-gradient-to-b ${banner.bg_color} flex-shrink-0`} />
                  <div className="flex-1 p-4 sm:p-5 flex items-center gap-4">
                    <GripVertical className="w-4 h-4 text-surface-300 dark:text-surface-600 flex-shrink-0 cursor-grab" />
                    {banner.image_url && (
                      <div className="relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-700">
                        <img
                          src={banner.image_url}
                          alt={banner.title.ru}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-surface-900 dark:text-white truncate">{banner.title.ru}</p>
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                          banner.is_active
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400'
                        }`}>
                          {banner.is_active ? 'Активен' : 'Скрыт'}
                        </span>
                      </div>
                      <p className="text-sm text-surface-500 dark:text-surface-400 truncate">{banner.subtitle.ru}</p>
                      {banner.link_url && (
                        <p className="text-xs text-surface-900 dark:text-surface-600 mt-1 truncate">{banner.link_url}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleToggle(banner)}
                        className="p-2 rounded-lg text-surface-400 hover:text-surface-700 dark:hover:text-gray-200 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        title={banner.is_active ? 'Скрыть' : 'Показать'}
                      >
                        {banner.is_active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(banner)}
                        className="p-2 rounded-lg text-surface-400 hover:text-surface-900 dark:hover:text-surface-600 hover:bg-surface-100 dark:hover:bg-surface-200 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(banner.id)}
                        className="p-2 rounded-lg text-surface-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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
                {editingId ? 'Редактировать баннер' : 'Новый баннер'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-surface-400 hover:text-surface-700 dark:hover:text-gray-200 transition-colors p-1"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
              {/* Preview */}
              {form.image_url && (
                <div className={`relative h-28 rounded-xl bg-gradient-to-r ${form.bg_color} overflow-hidden`}>
                  <img
                    src={form.image_url}
                    alt="preview"
                    className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
                  />
                  <div className="absolute inset-0 flex flex-col justify-center px-5">
                    <p className="text-white font-bold text-lg leading-tight">{form.title_ru || 'Заголовок'}</p>
                    <p className="text-white/80 text-sm mt-1">{form.subtitle_ru || 'Подзаголовок'}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Заголовок (RU)</label>
                  <input
                    value={form.title_ru}
                    onChange={(e) => setForm({ ...form, title_ru: e.target.value })}
                    placeholder="Новая коллекция!"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Заголовок (UZ)</label>
                  <input
                    value={form.title_uz}
                    onChange={(e) => setForm({ ...form, title_uz: e.target.value })}
                    placeholder="Yangi kolleksiya!"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Подзаголовок (RU)</label>
                  <input
                    value={form.subtitle_ru}
                    onChange={(e) => setForm({ ...form, subtitle_ru: e.target.value })}
                    placeholder="Скидки до 30%"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Подзаголовок (UZ)</label>
                  <input
                    value={form.subtitle_uz}
                    onChange={(e) => setForm({ ...form, subtitle_uz: e.target.value })}
                    placeholder="30% chegirma"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">URL изображения</label>
                <input
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  placeholder="https://images.pexels.com/..."
                  className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Ссылка (URL)</label>
                  <input
                    value={form.link_url}
                    onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="/catalog"
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Кнопка (RU / UZ)</label>
                  <div className="flex gap-2">
                    <input
                      value={form.link_label_ru}
                      onChange={(e) => setForm({ ...form, link_label_ru: e.target.value })}
                      placeholder="Смотреть"
                      className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                    />
                    <input
                      value={form.link_label_uz}
                      onChange={(e) => setForm({ ...form, link_label_uz: e.target.value })}
                      placeholder="Ko'rish"
                      className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Цвет фона</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {GRADIENT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setForm({ ...form, bg_color: opt.value })}
                      className={`h-10 rounded-xl bg-gradient-to-r ${opt.value} transition-all ${
                        form.bg_color === opt.value ? 'ring-2 ring-offset-2 ring-blue-500 scale-105' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={opt.label}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-1.5">Порядок</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-surface-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium text-surface-500 dark:text-surface-400 mb-2">Активен</label>
                  <button
                    onClick={() => setForm({ ...form, is_active: !form.is_active })}
                    className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      form.is_active
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-surface-50 dark:bg-surface-700 text-surface-500 dark:text-surface-400 border border-surface-200 dark:border-surface-600'
                    }`}
                  >
                    {form.is_active ? 'Да, показывать' : 'Нет, скрыть'}
                  </button>
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
                disabled={saving || !form.title_ru.trim() || !form.image_url.trim()}
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
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-2">Удалить баннер?</h3>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-6">Это действие нельзя отменить.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-600 text-surface-700 dark:text-surface-300 text-sm font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
