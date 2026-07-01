import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RotateCcw, Check, X, ZoomIn } from 'lucide-react';
import { useAllReturns } from '../../lib/supabase/hooks';
import { toast } from '../../components/Toast';
import { auditLogQueries } from '../../lib/supabase/queries';
import { getCurrentAdmin } from '../../lib/auth';
import { adminQueries } from '../../lib/adminApi';

import type { Return } from '../../lib/supabase/queries';

const STATUS_LABELS: Record<Return['status'], string> = {
  pending: 'Ожидает',
  approved: 'Одобрен',
  rejected: 'Отклонён',
  refunded: 'Возвращён',
};

const STATUS_COLORS: Record<Return['status'], string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  rejected: 'bg-danger/10 text-danger',
  refunded: 'bg-brand-600 text-white',
};

export const AdminReturns = () => {
  const admin = getCurrentAdmin();
  const { data: returns = [], isLoading, refetch } = useAllReturns();
  
  const [adminNote, setAdminNote] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleStatusUpdate = async (id: string, status: Return['status']) => {
    if (updatingId) return;
    setUpdatingId(id);
    const ret = returns.find(r => r.id === id);

    try {
      // The new updateReturnStatus in adminApi handles:
      // - Status update in DB
      // - Telegram notification to customer
      // - In-app notification
      // - Order status change (approved → return_requested, refunded → returned)
      // - Stock restoration on refund
      await adminQueries.updateReturnStatus(id, status, adminNote || undefined);
      toast.success(`Статус: ${STATUS_LABELS[status]}`);

      auditLogQueries.log({
        admin_id: admin?.id ?? 'unknown',
        action: 'status_change',
        entity_type: 'returns',
        entity_id: id,
        details: { new_status: status, admin_note: adminNote, order_id: ret?.order_id },
      }).catch(() => {});

      setAdminNote('');
      refetch();
    } catch {
      toast.error('Ошибка при обновлении статуса возврата.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/admin/dashboard" className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <RotateCcw className="w-5 h-5 text-surface-900" />
          <h1 className="text-lg font-bold text-surface-900 dark:text-white">Возвраты</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-3">
        {isLoading ? (
          <div className="text-center py-12"><span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" /></div>
        ) : returns.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500">Нет заявок на возврат</p>
          </div>
        ) : (
          returns.map((ret) => (
            <div key={ret.id} className="bg-white dark:bg-surface-800 rounded-2xl p-4 border border-surface-200 dark:border-surface-700">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-surface-900 dark:text-white">
                    Заказ #{ret.order_id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="text-xs text-surface-500 mt-0.5">
                    {new Date(ret.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${STATUS_COLORS[ret.status as Return["status"]]}`}>
                  {STATUS_LABELS[ret.status as Return["status"]]}
                </span>
              </div>
              <p className="text-sm text-surface-700 dark:text-surface-300 mb-2">
                <span className="text-surface-500">Причина:</span> {ret.reason}
              </p>

              {/* Photos from customer */}
              {Array.isArray((ret as Return & { photos?: string[] }).photos) && ((ret as Return & { photos?: string[] }).photos ?? []).length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-surface-500 mb-1.5">Фото от клиента:</p>
                  <div className="flex gap-2 flex-wrap">
                    {((ret as Return & { photos?: string[] }).photos ?? []).map((url: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => setLightboxUrl(url)}
                        className="relative w-16 h-16 rounded-xl overflow-hidden border border-surface-200 dark:border-surface-600 group"
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                          <ZoomIn className="w-4 h-4 text-white" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {ret.admin_note && (
                <p className="text-xs text-surface-500 mb-2 italic">Комментарий: {ret.admin_note}</p>
              )}
              {ret.status === 'pending' && (
                <div className="flex items-center gap-2 mt-3">
                  <input
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                    placeholder="Комментарий..."
                    className="flex-1 input-premium text-xs py-2"
                  />
                  <button
                    onClick={() => handleStatusUpdate(ret.id, 'approved')}
                    disabled={updatingId === ret.id}
                    className="p-2 rounded-lg bg-success/10 text-success hover:bg-success/20 transition disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleStatusUpdate(ret.id, 'rejected')}
                    disabled={updatingId === ret.id}
                    className="p-2 rounded-lg bg-danger/10 text-danger hover:bg-danger/20 transition disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {ret.status === 'approved' && (
                <button
                  onClick={() => handleStatusUpdate(ret.id, 'refunded')}
                  disabled={updatingId === ret.id}
                  className="btn-brand px-4 py-2 rounded-xl text-xs mt-3 disabled:opacity-50"
                >
                  {updatingId === ret.id ? 'Обработка...' : 'Подтвердить возврат'}
                </button>
              )}
            </div>
          ))
        )}
      </main>

      {/* Lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightboxUrl(null)}
        >
          <img src={lightboxUrl} alt="" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            onClick={() => setLightboxUrl(null)}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};
