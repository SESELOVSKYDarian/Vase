import type { Ingredient } from '@/types/stock';

interface StockBadgeProps {
  ingredient: Ingredient;
}

export const StockBadge = ({ ingredient }: StockBadgeProps) => {
  const getBadge = () => {
    if (ingredient.stock === 0) {
      return { label: 'Agotado', className: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    }
    if (ingredient.stock < ingredient.minStock) {
      return { label: 'Bajo', className: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
    }
    return { label: 'OK', className: 'bg-green-500/20 text-green-400 border border-green-500/30' };
  };

  const badge = getBadge();

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold tracking-wide uppercase ${badge.className}`}>
      {badge.label}
    </span>
  );
};
