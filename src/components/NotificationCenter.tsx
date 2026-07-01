import { useNavigate } from 'react-router-dom';
import { Bell, Package, Tag, AlertCircle, Trash2 } from 'lucide-react';
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';

const NOTIFICATION_ICONS: Record<string, typeof Bell> = {
  order_accepted: Package,
  order_shipped: Package,
  order_delivered: Package,
  order_returned: Trash2,
  promo: Tag,
  promo_new: Tag,
  system: Bell,
  cancellation: AlertCircle,
};

export const NotificationCenter = () => {
  const { getUserId } = useAppStore();
  const userId = getUserId();
  const { data: notifications = [] } = useNotifications(userId);
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead(userId);
  const navigate = useNavigate();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-3">
      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="w-10 h-10 text-surface-300 mx-auto mb-3" />
          <p className="text-sm text-surface-500">Нет уведомлений</p>
        </div>
      ) : (
        <>
          {unreadCount > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-surface-500">{unreadCount} непрочитанных</span>
              <button onClick={() => markAllRead.mutate()} className="text-xs text-surface-900 font-medium hover:underline">
                Прочитать все
              </button>
            </div>
          )}
          <div className="space-y-2">
            {notifications.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type] || Bell;
              return (
                <button
                  key={notification.id}
                  onClick={() => {
                    markRead.mutate(notification.id);
                    if (notification.data && typeof notification.data === 'object' && 'order_id' in notification.data) {
                      navigate('/orders');
                    }
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition ${
                    notification.is_read
                      ? 'bg-white dark:bg-surface-800'
                      : 'bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-600'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    notification.is_read ? 'bg-surface-100 dark:bg-surface-700' : 'bg-brand-600 text-white'
                  }`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${notification.is_read ? 'text-surface-700 dark:text-surface-300' : 'text-surface-900 dark:text-white'}`}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-surface-500 mt-0.5 line-clamp-2">{notification.body}</p>
                    <p className="text-2xs text-surface-400 mt-1">
                      {new Date(notification.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="w-2 h-2 rounded-full bg-brand-600 flex-shrink-0 mt-2" />
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
