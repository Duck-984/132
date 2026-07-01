import { ChevronRight } from 'lucide-react';
import { ProductCard } from './ProductCard';
import { useCollectionProducts, useFavoriteIds } from '../lib/supabase/hooks';
import { useAppStore } from '../store/useAppStore';
import { getLocalizedValue } from '../lib/utils';
import type { ProductCollection } from '../lib/supabase/queries';

interface CollectionSectionProps {
  collection: ProductCollection;
  language: 'ru' | 'uz';
}

export const CollectionSection = ({ collection, language }: CollectionSectionProps) => {
  const userId = useAppStore((s) => s.getUserId());
  const { data: favoriteIds = [] } = useFavoriteIds(userId);
  const productIds = collection.product_ids ?? [];
  const { data: products = [], isLoading } = useCollectionProducts(productIds);

  if (productIds.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-4 mb-3">
        <h2 className="text-base font-bold text-surface-900 dark:text-white">
          {getLocalizedValue(collection.name, language)}
        </h2>
        <button className="flex items-center gap-0.5 text-xs font-medium text-surface-400 hover:text-surface-700 transition-colors">
          {language === 'ru' ? 'Все' : "Hammasi"}
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex-shrink-0 w-[160px]">
              <div className="rounded-2xl bg-surface-100 dark:bg-surface-800 h-48 skeleton" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-3 px-4 overflow-x-auto scrollbar-hide pb-1">
          {products.map((product) => (
            <div key={product.id} className="flex-shrink-0 w-[160px]">
              <ProductCard product={product} language={language as 'ru' | 'uz'} favoriteIds={favoriteIds} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
