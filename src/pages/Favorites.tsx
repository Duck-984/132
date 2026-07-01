import { useNavigate } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { Layout } from '../components/Layout';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';
import { useTranslation } from '../hooks/useTranslation';
import { useFavorites } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';

export const Favorites = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const userId = useAppStore((s) => s.getUserId());
  const { data: favorites = [], isLoading } = useFavorites(userId);

  return (
    <Layout>
      <div className="px-4 pt-5 pb-2">
        <h1 className="text-xl font-bold text-surface-900 tracking-tight">
          {language === 'ru' ? 'Избранное' : 'Tanlanganlar'}
        </h1>
        {!isLoading && favorites.length > 0 && (
          <p className="text-sm text-surface-500 mt-0.5">
            {favorites.length} {language === 'ru' ? 'товаров' : 'mahsulot'}
          </p>
        )}
      </div>

      <div className="px-4 pb-24 pt-3">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <ProductCardSkeleton key={i} />)}
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div
              className="w-20 h-20 rounded-3xl flex items-center justify-center mb-5 bg-surface-100 border border-surface-200"
            >
              <Heart className="w-9 h-9 text-surface-300" />
            </div>
            <p className="text-base font-semibold text-surface-900 mb-1">
              {language === 'ru' ? 'Здесь пусто' : 'Bu yerda hali hech narsa yo\'q'}
            </p>
            <p className="text-sm text-surface-500 mb-6 max-w-[240px] leading-relaxed">
              {language === 'ru'
                ? 'Добавляйте товары в избранное — нажмите на сердечко'
                : 'Mahsulotlarni yoqtirganlaringizga qo\'shish uchun yurakcha tugmasini bosing'}
            </p>
            <button
              onClick={() => navigate('/catalog')}
              className="btn-brand px-6 h-12 rounded-xl text-sm"
            >
              {t('catalog')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {favorites.map((product, i) => (
              <div
                key={product.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${Math.min(i, 5) * 0.05}s` }}
              >
                <ProductCard product={product} language={language} favoriteIds={favorites.map(f => f.id)} />
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};
