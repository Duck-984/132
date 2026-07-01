import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { getTelegramUser } from '../lib/telegram';
import { ChevronRight, Sparkles, TrendingUp, Shield, Truck } from 'lucide-react';
import { useProducts, useBanners, useFavoriteIds } from '../lib/supabase/hooks';
import { Logo } from '../components/Logo';
import { BannerSlider } from '../components/BannerSlider';
import { ProductCard } from '../components/ProductCard';
import { ProductCardSkeleton } from '../components/Skeleton';

export const Home = () => {
  const navigate = useNavigate();
  const { language, setLanguage, setTelegramUserId, isRegistered } = useAppStore();
  const [entered, setEntered] = useState(false);

  const user = getTelegramUser();
  const userId = user?.id || 0;
  const { data: favoriteIds = [] } = useFavoriteIds(userId);
  const { data: banners = [] } = useBanners(true);
  const { data: productsData, isLoading: productsLoading } = useProducts(
    undefined,
    { field: 'views', order: 'desc' }
  );
  const featuredProducts = productsData?.pages.flatMap((p) => p.items) ?? [];

  useEffect(() => {
    if (user) {
      setTelegramUserId(user.id);
      const langCode = user.language_code;
      if (langCode === 'uz' || langCode === 'ru') {
        setLanguage(langCode);
      }
    }
  }, [user?.id, setLanguage, setTelegramUserId, user]);

  const handleLanguageSelect = (lang: 'ru' | 'uz') => {
    setLanguage(lang);
    setEntered(true);
    setTimeout(() => {
      if (user?.id || isRegistered()) {
        navigate('/catalog');
      } else {
        navigate('/register');
      }
    }, 300);
  };

  if (!entered && (!user?.id || !isRegistered())) {
    return (
      <div className="min-h-screen flex flex-col gradient-hero relative overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative z-10">
          <div className="w-full max-w-sm">
            {/* Logo & Brand */}
            <div className="text-center mb-12 animate-fade-in-up">
              <div className="inline-flex items-center justify-center mb-6">
                <Logo size="xl" variant="full" className="!flex-col !items-center !gap-3" />
              </div>
              <p className="text-surface-400 text-sm mt-3 text-balance max-w-xs mx-auto">
                {language === 'ru'
                  ? 'Модная одежда и аксессуары с доставкой по всему Узбекистану'
                  : "O'zbekiston bo'ylab yetkazib berish bilan moda kiyimlar va aksessuarlar"}
              </p>
            </div>

            {/* Language Selection */}
            <div className="space-y-3 mb-8 animate-fade-in-up stagger-2">
              <button
                onClick={() => handleLanguageSelect('ru')}
                className="w-full flex items-center gap-4 bg-white/8 hover:bg-white/12 active:scale-[0.98] backdrop-blur-sm border border-white/10 text-white py-4 px-5 rounded-2xl font-semibold text-base transition-all duration-200 group"
              >
                <span className="text-2xl">🇷🇺</span>
                <div className="text-left flex-1">
                  <p className="font-semibold">Русский</p>
                  <p className="text-xs text-surface-400 font-normal">Russian</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
              </button>

              <button
                onClick={() => handleLanguageSelect('uz')}
                className="w-full flex items-center gap-4 bg-white/8 hover:bg-white/12 active:scale-[0.98] backdrop-blur-sm border border-white/10 text-white py-4 px-5 rounded-2xl font-semibold text-base transition-all duration-200 group"
              >
                <span className="text-2xl">🇺🇿</span>
                <div className="text-left flex-1">
                  <p className="font-semibold">O'zbekcha</p>
                  <p className="text-xs text-surface-400 font-normal">Uzbek</p>
                </div>
                <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 animate-fade-in-up stagger-6">
              <div className="flex items-center gap-1.5 text-white/40">
                <Truck className="w-3.5 h-3.5" />
                <span className="text-2xs">{language === 'ru' ? 'Доставка' : 'Yetkazish'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/40">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-2xs">{language === 'ru' ? 'Гарантия' : 'Kafolat'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-white/40">
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-2xs">{language === 'ru' ? 'Качество' : 'Sifat'}</span>
              </div>
            </div>

            <p className="text-center text-surface-500 text-2xs mt-8">
              KUPI Shop v1.0
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Catalog preview for logged-in users
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950">
      {/* Hero Banner */}
      {banners.length > 0 && (
        <div className="animate-fade-in">
          <BannerSlider banners={banners} language={language} />
        </div>
      )}

      <div className="px-4 py-4 space-y-6">
        {/* Features strip */}
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {[
            { icon: Truck, label: language === 'ru' ? 'Быстрая доставка' : 'Tez yetkazish', color: 'bg-surface-100 text-surface-700' },
            { icon: Shield, label: language === 'ru' ? 'Гарантия качества' : 'Sifat kafolati', color: 'bg-surface-100 text-surface-700' },
            { icon: Sparkles, label: language === 'ru' ? 'Новинки каждую неделю' : 'Har hafta yangiliklar', color: 'bg-surface-100 text-surface-700' },
          ].map(({ icon: Icon, label, color }, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl whitespace-nowrap ${color} animate-fade-in-up`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="text-xs font-semibold">{label}</span>
            </div>
          ))}
        </div>

        {/* Popular Products */}
        <section className="animate-fade-in-up stagger-3">
          <div className="flex items-center justify-between mb-3">
            <h2 className="section-title">
              <TrendingUp className="w-5 h-5 text-surface-600" />
              {language === 'ru' ? 'Популярное' : 'Mashhur'}
            </h2>
            <button
              onClick={() => navigate('/catalog')}
              className="text-xs font-semibold text-surface-900 hover:text-surface-700 transition-colors"
            >
              {language === 'ru' ? 'Все' : 'Hammasi'} →
            </button>
          </div>

          {productsLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {featuredProducts.slice(0, 4).map((product, i) => (
                <div key={product.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.08}s` }}>
                  <ProductCard product={product} language={language} favoriteIds={favoriteIds} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* CTA */}
        <div className="bg-surface-900 rounded-2xl p-5 text-white animate-fade-in-up stagger-4">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="w-5 h-5" />
            <h3 className="font-bold">
              {language === 'ru' ? 'Скидка 10% на первый заказ' : "Birinchi buyurtmaga 10% chegirma"}
            </h3>
          </div>
          <p className="text-white/80 text-xs mb-3">
            {language === 'ru'
              ? 'Используйте промокод STYLE при оформлении заказа'
              : "STYLE promo kodini kiriting buyurtma paytida"}
          </p>
          <button
            onClick={() => navigate('/catalog')}
            className="bg-white text-surface-900 px-4 py-2 rounded-xl text-xs font-bold hover:bg-white/90 active:scale-95 transition-all"
          >
            {language === 'ru' ? 'Купить сейчас' : 'Hozir xarid qilish'}
          </button>
        </div>
      </div>
    </div>
  );
};
