import { ShoppingCart, Package, User, LayoutGrid, Heart } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useCartStore } from '../store/useCartStore';
import { useFavoriteIds } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';
import { cn } from '../lib/utils';

export const BottomNav = () => {
  const { t, language } = useTranslation();
  const location = useLocation();
  const totalItems = useCartStore((state) => state.getTotalItems());
  const userId = useAppStore((s) => s.getUserId());
  const { data: favoriteIds = [] } = useFavoriteIds(userId);

  const navItems = [
    { path: '/catalog', icon: LayoutGrid, label: t('catalog'), isLogo: true },
    { path: '/favorites', icon: Heart, label: language === 'ru' ? 'Избранное' : 'Tanlangan', badge: favoriteIds.length },
    { path: '/cart', icon: ShoppingCart, label: t('cart'), badge: totalItems },
    { path: '/orders', icon: Package, label: t('orders') },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass dark:glass-dark border-t border-surface-100/50 dark:border-surface-700/50 pb-safe">
      <div className="flex items-stretch justify-around h-16">
        {navItems.map(({ path, icon: Icon, label, badge, isLogo }) => {
          const isActive = location.pathname === path ||
            (path === '/catalog' && location.pathname.startsWith('/product'));
          const isFavorites = path === '/favorites';
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'flex flex-col items-center justify-center flex-1 gap-1 relative transition-all duration-200',
                isActive
                  ? 'text-surface-900'
                  : 'text-surface-400 dark:text-surface-500 active:text-surface-600 dark:active:text-surface-300'
              )}
            >
              <div className="relative">
                <div className={cn(
                  'p-1 rounded-xl transition-all duration-200',
                  isActive && 'bg-surface-100 dark:bg-surface-700'
                )}>
                  {isLogo ? (
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      stroke={isActive ? '#E53E3E' : 'currentColor'}
                      className={cn(
                        "transition-all duration-200",
                        !isActive && "text-surface-400 dark:text-surface-500"
                      )}
                    >
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 01-8 0" />
                    </svg>
                  ) : (
                    <Icon
                      className="w-5 h-5 transition-all duration-200"
                      strokeWidth={isActive ? 2.5 : 1.8}
                      style={isActive && isFavorites ? { fill: '#E53E3E', color: '#E53E3E' } : undefined}
                    />
                  )}
                </div>
                {badge != null && badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[16px] h-4 flex items-center justify-center px-1 bg-brand-600 text-white text-2xs font-bold rounded-full animate-bounce-in">
                    {badge}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-2xs transition-all duration-200",
                isActive ? "font-bold" : "font-medium"
              )}>
                {label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-brand-600 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
