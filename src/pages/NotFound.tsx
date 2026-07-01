import { ArrowLeft, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export const NotFound = () => {
  const { language } = useTranslation();

  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex flex-col items-center justify-center px-6">
      <div className="text-center">
        <div className="w-20 h-20 rounded-2xl bg-surface-100 dark:bg-surface-800 flex items-center justify-center mx-auto mb-5">
          <Search className="w-9 h-9 text-surface-300 dark:text-surface-600" />
        </div>
        <h1 className="text-5xl font-extrabold text-surface-900 dark:text-white mb-2">404</h1>
        <p className="text-lg font-semibold text-surface-900 dark:text-white mb-1.5">
          {language === 'ru' ? 'Страница не найдена' : 'Sahifa topilmadi'}
        </p>
        <p className="text-sm text-surface-500 dark:text-surface-400 mb-8 max-w-[260px]">
          {language === 'ru'
            ? 'Страница, которую вы ищете, не существует или была перемещена'
            : "Siz qidirgan sahifa mavjud emas yoki ko'chirilgan"}
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {language === 'ru' ? 'На главную' : 'Bosh sahifa'}
        </Link>
      </div>
    </div>
  );
};
