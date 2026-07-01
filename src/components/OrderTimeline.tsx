import { CheckCircle, Clock, Package, Truck, XCircle, RotateCcw, CreditCard } from 'lucide-react';
import { getStatusLabel } from '../lib/orderStatuses';
import type { StatusHistoryEntry } from '../lib/supabase';

interface OrderTimelineProps {
  status: string;
  statusHistory: StatusHistoryEntry[];
  language: 'ru' | 'uz';
}

const STATUS_ICONS: Record<string, typeof CheckCircle> = {
  new: Package,
  processing: Clock,
  assembling: Package,
  assembled: Package,
  paid: CreditCard,
  shipping: Truck,
  shipped: Truck,
  delivered: CheckCircle,
  cancelled: XCircle,
  return_requested: RotateCcw,
  returned: RotateCcw,
};

const STATUS_STEPS = ['new', 'paid', 'processing', 'assembled', 'shipped', 'delivered'];

export const OrderTimeline = ({ status, statusHistory, language }: OrderTimelineProps) => {
  const historyMap = new Map(statusHistory.map((h) => [h.status, h]));
  const currentIdx = STATUS_STEPS.indexOf(status);

  return (
    <div className="space-y-0">
      {STATUS_STEPS.map((step, idx) => {
        const history = historyMap.get(step);
        const isCompleted = idx <= currentIdx && status !== 'cancelled';
        const isCurrent = step === status;
        const Icon = STATUS_ICONS[step] || Clock;

        return (
          <div key={step} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                isCompleted
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-100 dark:bg-surface-700 text-surface-400'
              } ${isCurrent ? 'ring-2 ring-surface-900/20 ring-offset-2' : ''}`}>
                <Icon className="w-4 h-4" />
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`w-0.5 h-8 ${idx < currentIdx ? 'bg-brand-600' : 'bg-surface-200 dark:bg-surface-600'}`} />
              )}
            </div>
            <div className="pb-6 pt-1">
              <p className={`text-sm font-medium ${isCompleted ? 'text-surface-900 dark:text-white' : 'text-surface-400'}`}>
                {getStatusLabel(step, language)}
              </p>
              {history && (
                <p className="text-xs text-surface-400 mt-0.5">
                  {new Date(history.changed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  {history.note && ` — ${history.note}`}
                </p>
              )}
            </div>
          </div>
        );
      })}

      {status === 'cancelled' && (
        <div className="flex gap-3">
          <div className="w-8 h-8 rounded-full bg-danger/10 flex items-center justify-center flex-shrink-0">
            <XCircle className="w-4 h-4 text-danger" />
          </div>
          <div className="pt-1">
            <p className="text-sm font-medium text-danger">{getStatusLabel('cancelled', language)}</p>
            {historyMap.get('cancelled') && (
              <p className="text-xs text-surface-400 mt-0.5">
                {new Date(historyMap.get('cancelled')!.changed_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
