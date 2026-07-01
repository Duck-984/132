import { useState, useEffect, useRef } from 'react';
import { Heart, BellOff, BellRing, Loader2 } from 'lucide-react';
import { useFavoritePrefs, useUpdateFavoritePrefs } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';
import { haptic } from '../lib/telegram';

interface WishlistToggleProps {
  productId: string;
  isFavorite: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onToggleFavorite: (e?: any) => void;
  language: 'ru' | 'uz';
  variant?: 'card' | 'detail';
}

export const WishlistToggle = ({
  productId,
  isFavorite,
  onToggleFavorite,
  language,
  variant = 'card',
}: WishlistToggleProps) => {
  const userId = useAppStore((s) => s.getUserId());
  const { data: prefs } = useFavoritePrefs(userId, productId);
  const updatePrefs = useUpdateFavoritePrefs(userId);
  const [showPrefs, setShowPrefs] = useState(false);
  const prefsRef = useRef<HTMLDivElement>(null);
  const savingRef = useRef<'notify_price' | 'notify_stock' | null>(null);

  useEffect(() => {
    if (!showPrefs) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (prefsRef.current && !prefsRef.current.contains(e.target as Node)) {
        setShowPrefs(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowPrefs(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showPrefs]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite();
    haptic.select();
    setShowPrefs(false);
  };

  const handlePrefToggle = async (field: 'notify_price' | 'notify_stock', e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFavorite) return;
    const newValue = !(prefs?.[field] ?? false);
    savingRef.current = field;
    updatePrefs.mutate({ productId, prefs: { [field]: newValue } });
    haptic.select();
  };

  const handleShowPrefs = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFavorite) return;
    setShowPrefs((v) => !v);
    haptic.select();
  };

  const isSaving = updatePrefs.isPending;
  const savingField = savingRef.current;

  if (variant === 'detail') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-150 active:scale-95 ${
            isFavorite
              ? 'bg-danger-light border-danger/30'
              : 'bg-white dark:bg-surface-700 border-surface-200 dark:border-surface-600'
          }`}
        >
          <Heart
            className={`w-5 h-5 transition-all duration-150 ${
              isFavorite ? 'text-danger fill-danger' : 'text-surface-500 dark:text-surface-400'
            }`}
          />
        </button>

        {isFavorite && (
          <div className="relative" ref={prefsRef}>
            <button
              onClick={handleShowPrefs}
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 border transition-all duration-150 active:scale-95 bg-white dark:bg-surface-700 border-surface-200 dark:border-surface-600 ${
            (prefs?.notify_price || prefs?.notify_stock) ? 'ring-2 ring-success/50' : ''
          }`}
            >
              {(prefs?.notify_price || prefs?.notify_stock) ? (
                <BellRing className="w-5 h-5 text-success" />
              ) : (
                <BellOff className="w-5 h-5 text-surface-400" />
              )}
            </button>

            {showPrefs && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-white dark:bg-surface-800 rounded-xl shadow-elevated border border-surface-200 dark:border-surface-700 p-2 min-w-[200px] animate-fade-in-down z-50">
                <p className="text-xs font-semibold text-surface-500 dark:text-surface-400 px-2 mb-1">
                  {language === 'ru' ? 'Уведомления' : 'Bildirishnomalar'}
                </p>
                <button
                  onClick={(e) => handlePrefToggle('notify_price', e)}
                  disabled={isSaving}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-surface-100 dark:hover:bg-surface-700 transition disabled:opacity-50"
                >
                  {isSaving && savingField === 'notify_price' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-surface-400" />
                  ) : prefs?.notify_price ? (
                    <BellRing className="w-4 h-4 text-success" />
                  ) : (
                    <BellOff className="w-4 h-4 text-surface-400" />
                  )}
                  <span className="text-surface-700 dark:text-surface-300">
                    {language === 'ru' ? 'Напомнить при скидке' : 'Chegirmada eslatish'}
                  </span>
                </button>
                <button
                  onClick={(e) => handlePrefToggle('notify_stock', e)}
                  disabled={isSaving}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm hover:bg-surface-100 dark:hover:bg-surface-700 transition disabled:opacity-50"
                >
                  {isSaving && savingField === 'notify_stock' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-surface-400" />
                  ) : prefs?.notify_stock ? (
                    <BellRing className="w-4 h-4 text-success" />
                  ) : (
                    <BellOff className="w-4 h-4 text-surface-400" />
                  )}
                  <span className="text-surface-700 dark:text-surface-300">
                    {language === 'ru' ? 'Напомнить при наличии' : 'Mavjud bo\'lganda eslatish'}
                  </span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Card variant — compact
  return (
    <div className="relative">
      <button
        onClick={handleToggle}
        className="absolute top-2 right-2 w-10 h-10 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-110 active:scale-90 z-10"
      >
        <Heart
          className={`w-4 h-4 transition-all duration-150 ${
            isFavorite ? 'text-danger fill-danger' : 'text-surface-400'
          }`}
        />
      </button>

      {isFavorite && (
        <div className="absolute top-2 right-14 z-10" ref={prefsRef}>
          <button
            onClick={handleShowPrefs}
            className={`w-8 h-8 rounded-full bg-white/85 backdrop-blur-sm flex items-center justify-center shadow-sm transition-all duration-150 hover:scale-110 active:scale-90 ${
              (prefs?.notify_price || prefs?.notify_stock) ? 'ring-2 ring-success/50' : ''
            }`}
          >
            {(prefs?.notify_price || prefs?.notify_stock) ? (
              <BellRing className="w-3.5 h-3.5 text-success" />
            ) : (
              <BellOff className="w-3.5 h-3.5 text-surface-400" />
            )}
          </button>

          {showPrefs && (
            <div className="absolute top-10 right-0 bg-white dark:bg-surface-800 rounded-xl shadow-elevated border border-surface-200 dark:border-surface-700 p-2 min-w-[180px] animate-fade-in-down z-50">
              <button
                onClick={(e) => handlePrefToggle('notify_price', e)}
                disabled={isSaving}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-surface-100 dark:hover:bg-surface-700 transition disabled:opacity-50"
              >
                {isSaving && savingField === 'notify_price' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-surface-400" />
                ) : prefs?.notify_price ? (
                  <BellRing className="w-3.5 h-3.5 text-success" />
                ) : (
                  <BellOff className="w-3.5 h-3.5 text-surface-400" />
                )}
                <span className="text-surface-700 dark:text-surface-300">
                  {language === 'ru' ? 'Скидка' : 'Chegirma'}
                </span>
              </button>
              <button
                onClick={(e) => handlePrefToggle('notify_stock', e)}
                disabled={isSaving}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-surface-100 dark:hover:bg-surface-700 transition disabled:opacity-50"
              >
                {isSaving && savingField === 'notify_stock' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-surface-400" />
                ) : prefs?.notify_stock ? (
                  <BellRing className="w-3.5 h-3.5 text-success" />
                ) : (
                  <BellOff className="w-3.5 h-3.5 text-surface-400" />
                )}
                <span className="text-surface-700 dark:text-surface-300">
                  {language === 'ru' ? 'Наличие' : 'Mavjudlik'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
