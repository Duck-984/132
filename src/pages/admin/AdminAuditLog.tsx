import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, User, Package, Trash2, Edit3, Eye, Settings } from 'lucide-react';
import { useAuditLog } from '../../lib/supabase/hooks';

const ACTION_ICONS: Record<string, typeof Eye> = {
  create: Package,
  update: Edit3,
  delete: Trash2,
  status_change: Settings,
  broadcast: Shield,
  login: User,
};

const ENTITY_COLORS: Record<string, string> = {
  product: 'bg-blue-100 text-blue-700',
  order: 'bg-green-100 text-green-700',
  user: 'bg-purple-100 text-purple-700',
  banner: 'bg-yellow-100 text-yellow-700',
  coupon: 'bg-pink-100 text-pink-700',
  delivery_zone: 'bg-orange-100 text-orange-700',
  admin: 'bg-red-100 text-red-700',
  review: 'bg-cyan-100 text-cyan-700',
};

export const AdminAuditLog = () => {
  const { data: logs = [], isLoading } = useAuditLog(200);

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-900">
      <header className="sticky top-0 z-40 bg-white dark:bg-surface-800 border-b border-surface-200 dark:border-surface-700">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to="/admin/dashboard" className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-5 h-5 text-surface-900" />
          <h1 className="text-lg font-bold text-surface-900 dark:text-white">Audit Log</h1>
          <span className="text-xs text-surface-400 ml-auto">{logs.length} записей</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {isLoading ? (
          <div className="text-center py-12"><span className="w-8 h-8 border-4 border-surface-900 border-t-transparent rounded-full animate-spin" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-500">Нет записей</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => {
              const Icon = ACTION_ICONS[log.action] || Eye;
              return (
                <div key={log.id} className="bg-white dark:bg-surface-800 rounded-xl p-3 border border-surface-200 dark:border-surface-700 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-surface-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-surface-600 dark:text-surface-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ENTITY_COLORS[log.entity_type] || 'bg-surface-100 text-surface-600'}`}>
                        {log.entity_type}
                      </span>
                      <span className="text-xs font-semibold text-surface-900 dark:text-white">{log.action}</span>
                      {log.entity_id && (
                        <span className="text-2xs text-surface-400 font-mono">#{log.entity_id.slice(0, 8)}</span>
                      )}
                    </div>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-surface-500 mt-1 truncate">
                        {JSON.stringify(log.details).slice(0, 120)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-2xs text-surface-400">
                      <span>{log.admin_id}</span>
                      <span>·</span>
                      <span>{new Date(log.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
