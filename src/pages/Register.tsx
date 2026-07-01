import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, ShoppingBag } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { toast } from '../components/Toast';
import { isSupabaseConfigured } from '../lib/supabase';
import { validatePhone } from '../lib/utils';

export const Register = () => {
  const navigate = useNavigate();
  const { language, setRegistration } = useAppStore();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    const trimName = name.trim();
    const trimPhone = phone.trim();

    if (trimName.length < 2) {
      toast.error(language === 'ru' ? 'Введите имя (мин. 2 символа)' : 'Ismingizni kiriting (kamida 2 belgi)');
      return;
    }

    if (!validatePhone(trimPhone)) {
      toast.error(language === 'ru' ? 'Введите корректный номер телефона (+998 XX XXX XX XX)' : "To'g'ri telefon raqam kiriting (+998 XX XXX XX XX)");
      return;
    }

    setSaving(true);
    try {
      if (!isSupabaseConfigured) {
        toast.error(language === 'ru' ? 'Сервис временно недоступен' : "Xizmat vaqtincha mavjud emas");
        setSaving(false);
        return;
      }

      const digits = trimPhone.replace(/\D/g, '');
      const numericId = parseInt(digits.slice(-9), 10);

      if (!numericId || numericId < 100000000) {
        toast.error(language === 'ru' ? 'Некорректный номер телефона' : "Noto'g'ri telefon raqam");
        setSaving(false);
        return;
      }

      const { userQueries } = await import('../lib/supabase/hooks');

      await userQueries.upsert(numericId, {
        first_name: trimName,
        username: null,
        language: language,
        phone: trimPhone,
      });

      setRegistration(trimName, trimPhone);
      toast.success(language === 'ru' ? 'Регистрация успешна!' : "Ro'yxatdan o'tish muvaffaqiyatli!");
      navigate('/catalog');
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('duplicate') || msg.includes('unique')) {
        toast.success(language === 'ru' ? 'Добро пожаловать!' : "Xush kelibsiz!");
        setRegistration(trimName, trimPhone);
        navigate('/catalog');
      } else {
        toast.error(language === 'ru' ? 'Ошибка регистрации. Попробуйте ещё раз' : "Ro'yxatdan o'tishda xatolik. Qaytadan urinib ko'ring");
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-50">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-100 rounded-2xl mb-5">
              <ShoppingBag className="w-8 h-8 text-surface-900" />
            </div>
            <h1 className="text-2xl font-bold text-surface-900 tracking-tight mb-2">
              {language === 'ru' ? 'Регистрация' : "Ro'yxatdan o'tish"}
            </h1>
            <p className="text-surface-400 text-sm">
              {language === 'ru'
                ? 'Введите данные для оформления заказов'
                : "Buyurtma berish uchun ma'lumotlarni kiriting"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white rounded-2xl p-5 space-y-4 shadow-sm">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  <User className="w-3.5 h-3.5" />
                  {language === 'ru' ? 'Ваше имя' : 'Ismingiz'} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={language === 'ru' ? 'Иван Петров' : 'Ism Familiya'}
                  className="w-full px-4 py-3 rounded-xl bg-white border border-surface-200 text-surface-900 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-surface-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-surface-400 uppercase tracking-wide mb-2">
                  <Phone className="w-3.5 h-3.5" />
                  {language === 'ru' ? 'Телефон' : 'Telefon'} *
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 90 123 45 67"
                  className="w-full px-4 py-3 rounded-xl bg-white border border-surface-200 text-surface-900 placeholder-surface-400 text-sm focus:outline-none focus:ring-2 focus:ring-surface-400 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-brand-300 text-white py-4 rounded-2xl font-semibold text-base transition-all flex items-center justify-center gap-2"
            >
              {saving && <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {language === 'ru' ? 'Продолжить' : 'Davom etish'}
            </button>
          </form>

          <p className="text-center text-surface-500 text-xs mt-8">
            {language === 'ru'
              ? 'Данные нужны для доставки заказов'
              : "Ma'lumotlar buyurtmalarni yetkazib berish uchun kerak"}
          </p>
        </div>
      </div>
    </div>
  );
};
