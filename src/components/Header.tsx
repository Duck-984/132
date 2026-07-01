import { ShoppingBag, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/useCartStore';
import { Logo } from './Logo';

export const Header = () => {
  const totalItems = useCartStore((state) => state.getTotalItems());

  return (
    <header className="sticky top-0 z-50 glass dark:glass-dark border-b border-surface-100/50 dark:border-surface-700/50">
      <div className="px-4 h-14 flex items-center justify-between">
        <Link to="/catalog" className="flex items-center gap-2">
          <Logo size="sm" variant="icon" />
          <span className="text-sm font-bold tracking-widest text-surface-900 dark:text-white uppercase">
            KUPI
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/cart"
            className="relative p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <ShoppingBag className="w-5 h-5 text-surface-600 dark:text-surface-300" />
            {totalItems > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] flex items-center justify-center px-1 bg-brand-600 text-white text-2xs font-bold rounded-full animate-bounce-in">
                {totalItems}
              </span>
            )}
          </Link>

          <Link
            to="/profile"
            className="p-2.5 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <User className="w-5 h-5 text-surface-600 dark:text-surface-300" />
          </Link>
        </div>
      </div>
    </header>
  );
};
