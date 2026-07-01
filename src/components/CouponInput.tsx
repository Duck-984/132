import { useState } from 'react';
import { Tag, Check, AlertCircle } from 'lucide-react';
import { useValidateCoupon } from '../lib/supabase/hooks';
import { formatPrice } from '../lib/utils';

interface CouponInputProps {
  telegramUserId: number;
  orderAmount: number;
  onApply: (couponId: string, discount: number, code: string) => void;
  onRemove: () => void;
  appliedCoupon?: { code: string; discount: number } | null;
  language: 'ru' | 'uz';
}

export const CouponInput = ({ telegramUserId, orderAmount, onApply, onRemove, appliedCoupon, language }: CouponInputProps) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const validateCoupon = useValidateCoupon();

  const handleApply = async () => {
    if (!code.trim()) return;
    setError('');
    try {
      const result = await validateCoupon.mutateAsync({ code: code.trim(), telegramUserId, orderAmount });
      if (result.valid && result.coupon) {
        onApply(result.coupon.id, result.discount, result.coupon.code);
        setCode('');
      } else if (result.error) {
        setError(result.error);
      }
    } catch {
      setError(language === 'ru' ? 'Ошибка проверки купона' : "Kupon tekshirishda xatolik");
    }
  };

  if (appliedCoupon) {
    return (
      <div className="flex items-center justify-between bg-success/10 border border-success/20 rounded-xl px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-success" />
          <span className="text-sm font-medium text-surface-900">{appliedCoupon.code}</span>
          <span className="text-xs text-success font-semibold">-{formatPrice(appliedCoupon.discount)}</span>
        </div>
        <button onClick={onRemove} className="text-xs text-surface-500 hover:text-danger transition">
          {language === 'ru' ? 'Убрать' : "O'chirish"}
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex gap-2">
      <div className="flex-1 relative">
        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleApply()}
          placeholder={language === 'ru' ? 'Код купона' : 'Kupon kodi'}
          className="input-premium text-sm pl-9"
        />
      </div>
      <button
        onClick={handleApply}
        disabled={validateCoupon.isPending || !code.trim()}
        className="btn-brand px-4 py-2 rounded-xl text-sm whitespace-nowrap"
      >
        {validateCoupon.isPending ? '...' : language === 'ru' ? 'Применить' : "Qo'llash"}
      </button>
      {(error || validateCoupon.isError) && (
        <div className="absolute top-full mt-1 flex items-center gap-1 text-xs text-danger">
          <AlertCircle className="w-3 h-3" />
          {error || validateCoupon.error?.message || 'Ошибка'}
        </div>
      )}
    </div>
  );
};
