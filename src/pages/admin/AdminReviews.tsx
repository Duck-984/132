import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MessageSquare, Check, X, ChevronDown, LogOut, ZoomIn } from 'lucide-react';
import { toast } from '../../components/Toast';
import { useAllReviews, useApproveReview, useRejectReview, useReplyToReview } from '../../lib/supabase/hooks';
import { getCurrentAdmin, logoutAdmin, ROLE_LABELS } from '../../lib/auth';
import { getLocalizedValue } from '../../lib/utils';
import { auditLogQueries } from '../../lib/supabase/queries';

type FilterType = 'all' | 'pending' | 'approved' | 'bad';

export const AdminReviews = () => {
  const navigate = useNavigate();
  const admin = getCurrentAdmin();
  const { data: reviews = [], isLoading } = useAllReviews();
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  const replyToReview = useReplyToReview();

  const [filter, setFilter] = useState<FilterType>('all');
  const [replyingId, setReplyingId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (!admin) return null;

  const filtered = reviews.filter((r) => {
    if (filter === 'pending') return !r.is_approved;
    if (filter === 'approved') return r.is_approved;
    if (filter === 'bad') return r.is_approved && r.rating <= 2;
    return true;
  });

  const stats = {
    total: reviews.length,
    approved: reviews.filter(r => r.is_approved).length,
    pending: reviews.filter(r => !r.is_approved).length,
    avg: reviews.length > 0 ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : '0.0',
    fiveStar: reviews.filter(r => r.rating === 5).length,
    oneTwoStar: reviews.filter(r => r.rating <= 2).length,
  };

  const handleApprove = async (id: string) => {
    try {
      await approveReview.mutateAsync(id);
      toast.success('Отзыв одобрен');
      auditLogQueries.log({ admin_id: admin.id, action: 'update', entity_type: 'reviews', entity_id: id, details: { action: 'approved' } }).catch(() => {});
    } catch {
      toast.error('Ошибка при одобрении отзыва');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await rejectReview.mutateAsync(id);
      toast.success('Отзыв скрыт');
      auditLogQueries.log({ admin_id: admin.id, action: 'update', entity_type: 'reviews', entity_id: id, details: { action: 'rejected' } }).catch(() => {});
    } catch {
      toast.error('Ошибка при отклонении отзыва');
    }
  };

  const handleReply = async (id: string) => {
    if (!replyText.trim()) return;
    try {
      await replyToReview.mutateAsync({ id, reply: replyText.trim() });
      toast.success('Ответ сохранён');
    } catch {
      toast.error('Ошибка при сохранении ответа');
    }
    setReplyingId(null);
    setReplyText('');
    auditLogQueries.log({
      admin_id: admin.id,
      action: 'update',
      entity_type: 'reviews',
      entity_id: id,
      details: { action: 'reply', reply_length: replyText.trim().length },
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
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-surface-900 dark:text-white text-sm">Отзывы</span>
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
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Всего" value={stats.total} />
          <StatCard label="Средний балл" value={stats.avg} icon={<Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />} />
          <StatCard label="5 звёзд" value={stats.fiveStar} accent />
          <StatCard label="1-2 звезды" value={stats.oneTwoStar} danger />
          <StatCard label="На модерации" value={stats.pending} warning />
          <StatCard label="Одобрено" value={stats.approved} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
          {([
            { key: 'all', label: 'Все' },
            { key: 'pending', label: `На модерации (${stats.pending})` },
            { key: 'approved', label: 'Одобренные' },
            { key: 'bad', label: 'Негативные (1-2★)' },
          ] as { key: FilterType; label: string }[]).map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                filter === f.key
                  ? 'bg-brand-600 text-white'
                  : 'bg-white dark:bg-surface-800 text-surface-600 dark:text-surface-400 border border-surface-200 dark:border-surface-700 hover:bg-surface-100 dark:hover:bg-surface-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Reviews List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-surface-800 rounded-2xl border border-dashed border-surface-200 dark:border-surface-700">
            <MessageSquare className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
            <p className="text-surface-500 dark:text-surface-400 font-medium">Нет отзывов</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => {
              const photos = review.photos?.length ? review.photos : review.images ?? [];
              const isExpanded = expandedId === review.id;
              return (
                <div
                  key={review.id}
                  className={`bg-white dark:bg-surface-800 rounded-2xl border overflow-hidden shadow-sm ${
                    !review.is_approved
                      ? 'border-yellow-300 dark:border-yellow-700'
                      : review.rating <= 2
                      ? 'border-red-200 dark:border-red-800'
                      : 'border-surface-200 dark:border-surface-700'
                  }`}
                >
                  <div className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-surface-900 dark:text-white">{review.user_name}</span>
                          {!review.is_approved && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 font-medium">
                              На модерации
                            </span>
                          )}
                          {review.is_verified_purchase && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                              Покупка ✓
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-surface-400 dark:text-surface-500 mt-0.5">
                          {review.product_name ? getLocalizedValue(review.product_name as { ru: string; uz: string }, 'ru') : 'Товар'} · {new Date(review.created_at).toLocaleDateString('ru-RU')}
                        </p>
                      </div>
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${s <= review.rating ? 'text-yellow-500 fill-yellow-500' : 'text-surface-200 dark:text-surface-600'}`}
                          />
                        ))}
                      </div>
                    </div>

                    {review.comment && (
                      <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed mt-2">{review.comment}</p>
                    )}

                    {/* Photos */}
                    {photos.length > 0 && (
                      <div className="flex gap-2 mt-3 overflow-x-auto">
                        {photos.map((photo: string, i: number) => (
                          <button
                            key={i}
                            onClick={() => setLightboxUrl(photo)}
                            className="relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-surface-100 dark:bg-surface-700 group"
                          >
                            <img src={photo} alt="" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                              <ZoomIn className="w-4 h-4 text-white" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Admin Reply */}
                    {review.admin_reply && (
                      <div className="mt-3 p-3 rounded-xl bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600">
                        <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 mb-1">Ответ магазина</p>
                        <p className="text-sm text-surface-700 dark:text-surface-300">{review.admin_reply}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="px-4 sm:px-5 py-3 border-t border-surface-100 dark:border-surface-700 flex items-center gap-2 flex-wrap">
                    {!review.is_approved && (
                      <>
                        <button
                          onClick={() => handleApprove(review.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Одобрить
                        </button>
                        <button
                          onClick={() => handleReject(review.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                          Отклонить
                        </button>
                      </>
                    )}
                    {review.is_approved && (
                      <button
                        onClick={() => handleReject(review.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 text-xs font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        Скрыть
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setExpandedId(isExpanded ? null : review.id);
                        setReplyingId(isExpanded ? null : review.id);
                        setReplyText(review.admin_reply ?? '');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-200 dark:border-surface-600 text-surface-600 dark:text-surface-400 text-xs font-medium hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors ml-auto"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      {review.admin_reply ? 'Редактировать ответ' : 'Ответить'}
                      <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {/* Reply Form */}
                  {isExpanded && replyingId === review.id && (
                    <div className="px-4 sm:px-5 pb-4 border-t border-surface-100 dark:border-surface-700 pt-3">
                      <textarea
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Ответ магазина..."
                        rows={3}
                        className="w-full px-3 py-2.5 bg-surface-50 dark:bg-surface-700 border border-surface-200 dark:border-surface-600 rounded-xl text-sm text-surface-900 dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-surface-900"
                      />
                      <div className="flex gap-2 mt-2 justify-end">
                        <button
                          onClick={() => { setExpandedId(null); setReplyingId(null); }}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleReply(review.id)}
                          disabled={!replyText.trim()}
                          className="px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-medium transition-colors"
                        >
                          {review.admin_reply ? 'Обновить ответ' : 'Отправить ответ'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {lightboxUrl && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

function StatCard({ label, value, icon, accent, danger, warning }: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  accent?: boolean;
  danger?: boolean;
  warning?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-surface-800 rounded-xl p-4 border ${
      danger ? 'border-red-200 dark:border-red-800' : warning ? 'border-yellow-200 dark:border-yellow-800' : 'border-surface-200 dark:border-surface-700'
    }`}>
      <p className="text-xs text-surface-500 dark:text-surface-400">{label}</p>
      <div className="flex items-center gap-1.5 mt-1">
        {icon}
        <span className={`text-lg font-bold ${
          danger ? 'text-red-600 dark:text-red-400' : warning ? 'text-yellow-600 dark:text-yellow-400' : accent ? 'text-green-600 dark:text-green-400' : 'text-surface-900 dark:text-white'
        }`}>
          {value}
        </span>
      </div>
    </div>
  );
}
