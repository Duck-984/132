import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Banner } from '../lib/supabase/queries';

interface Props {
  banners: Banner[];
  language: 'ru' | 'uz';
  onNavigate: (url?: string) => void;
}

const AUTOPLAY_DELAY = 5000;

export const HomeBannerSlider = ({ banners, language, onNavigate }: Props) => {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const goTo = useCallback(
    (index: number) => {
      if (animating) return;
      setAnimating(true);
      setCurrent(((index % banners.length) + banners.length) % banners.length);
      setTimeout(() => setAnimating(false), 600);
    },
    [banners.length, animating],
  );

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (banners.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % banners.length);
    }, AUTOPLAY_DELAY);
  }, [banners.length]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      goTo(dx < 0 ? current + 1 : current - 1);
      startTimer();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  if (!banners.length) return null;

  const handleCta = (b: Banner) => {
    if (b.link_url) {
      onNavigate(b.link_url);
    } else {
      onNavigate();
    }
  };

  return (
    <div
      className="relative overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="relative h-52 sm:h-64">
        {banners.map((b, i) => (
          <div
            key={b.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              i === current
                ? 'opacity-100 z-10 scale-100'
                : 'opacity-0 z-0 scale-[1.02]'
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${b.bg_color}`} />

            {b.image_url && (
              <img
                src={b.image_url}
                alt={b.title[language] || b.title.ru}
                className="absolute inset-0 w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/35 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />

            <div className="absolute inset-0 flex flex-col justify-end px-5 pb-6">
              {b.subtitle && (b.subtitle.ru || b.subtitle.uz) && (
                <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.15em] mb-2 drop-shadow-sm">
                  {b.subtitle[language] || b.subtitle.ru}
                </p>
              )}
              <p
                className="text-white font-bold text-xl sm:text-2xl leading-tight drop-shadow-md max-w-[78%]"
                style={{ textShadow: '0 2px 12px rgba(0,0,0,0.5)' }}
              >
                {b.title[language] || b.title.ru}
              </p>
              <button
                onClick={() => handleCta(b)}
                className="mt-4 self-start flex items-center gap-1.5 px-4 py-2 bg-white text-gray-900 rounded-full text-xs font-bold hover:bg-white/90 active:scale-95 transition-all shadow-lg"
              >
                {b.link_label
                  ? (b.link_label[language] || b.link_label.ru)
                  : (language === 'ru' ? 'Смотреть каталог' : "Katalogni ko'rish")}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {banners.length > 1 && (
        <>
          <button
            onClick={() => { goTo(current - 1); startTimer(); }}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={() => { goTo(current + 1); startTimer(); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/25 hover:bg-black/45 backdrop-blur-sm flex items-center justify-center transition-colors"
          >
            <ChevronRight className="w-4 h-4 text-white" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => { goTo(i); startTimer(); }}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 h-2 bg-white'
                    : 'w-2 h-2 bg-white/45 hover:bg-white/65'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};
