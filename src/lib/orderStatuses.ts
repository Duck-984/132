export const ORDER_STATUSES = [
  { value: 'new',              label_ru: 'Новый',         label_uz: 'Yangi',                  color: 'bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300',             dot: 'bg-surface-400' },
  { value: 'processing',       label_ru: 'В обработке',   label_uz: "Ko'rib chiqilmoqda",     color: 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300',             dot: 'bg-surface-500' },
  { value: 'assembling',       label_ru: 'В сборке',      label_uz: "Yig'ilmoqda",            color: 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300',             dot: 'bg-surface-500' },
  { value: 'assembled',        label_ru: 'Собран',        label_uz: "Yig'ildi",               color: 'bg-surface-200 dark:bg-surface-700 text-surface-700 dark:text-surface-300',             dot: 'bg-surface-600' },
  { value: 'shipping',         label_ru: 'В доставке',    label_uz: 'Yetkazilmoqda',          color: 'bg-brand-600 text-white',                                                              dot: 'bg-white' },
  { value: 'delivered',        label_ru: 'Доставлен',     label_uz: 'Yetkazildi',             color: 'bg-brand-700 text-white',                                                              dot: 'bg-white' },
  { value: 'cancelled',        label_ru: 'Отменён',       label_uz: 'Bekor qilindi',          color: 'bg-danger/10 text-danger dark:bg-danger/20',                                             dot: 'bg-danger' },
  { value: 'return_requested', label_ru: 'Возврат',       label_uz: 'Qaytarish',              color: 'bg-danger/10 text-danger dark:bg-danger/20',                                             dot: 'bg-danger' },
  { value: 'returned',         label_ru: 'Возвращён',     label_uz: 'Qaytarildi',             color: 'bg-surface-100 dark:bg-surface-700 text-surface-500 dark:text-surface-400',             dot: 'bg-surface-400' },
  { value: 'paid',             label_ru: 'Оплачен',       label_uz: "To'langan",              color: 'bg-brand-700 text-white',                                                              dot: 'bg-white' },
  { value: 'shipped',          label_ru: 'Отправлен',     label_uz: 'Yuborilgan',             color: 'bg-surface-700 text-white',                                                              dot: 'bg-white' },
] as const;

export type OrderStatusValue = typeof ORDER_STATUSES[number]['value'];

export const getStatusInfo = (value: string) =>
  ORDER_STATUSES.find((s) => s.value === value) ?? ORDER_STATUSES[0];

export const getStatusLabel = (status: string, lang: 'ru' | 'uz') => {
  const info = getStatusInfo(status);
  return lang === 'ru' ? info.label_ru : info.label_uz;
};

export const getStatusColor = (status: string) => getStatusInfo(status).color;
