'use client';

import { Search, Grid, List } from 'lucide-react';
import { useStockStore } from "@/store/stockStore";
import type { StockCategory } from "@/types/stock";
import { cn } from "@/hooks/lib/utils";

interface StockFiltersProps {
  categories: StockCategory[];
}

export const StockFilters = ({ categories }: StockFiltersProps) => {
  const {
    filter,
    setFilter,
    view,
    setView,
    searchQuery,
    setSearch,
    selectedCategory,
    setSelectedCategory,
  } = useStockStore();

  return (
    <div className="space-y-4">
      {/* Search and view toggle */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#676b67]" size={18} />
          <input
            type="text"
            placeholder="Buscar ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#2a2a2a] transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
          <button
            onClick={() => setView('grid')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === 'grid' ? 'bg-white text-black' : 'text-[#676b67] hover:text-white'
            )}
          >
            <Grid size={18} />
          </button>
          <button
            onClick={() => setView('list')}
            className={cn(
              "p-2 rounded-lg transition-colors",
              view === 'list' ? 'bg-white text-black' : 'text-[#676b67] hover:text-white'
            )}
          >
            <List size={18} />
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory(null)}
          className={cn(
            "px-4 py-2 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-colors",
            selectedCategory === null
              ? "bg-white text-black"
              : "bg-[#1a1a1a] text-[#bcb9b9] hover:bg-[#2a2a2a]"
          )}
        >
          Todas las categorías
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={cn(
              "px-4 py-2 rounded-full text-xs font-semibold tracking-wide whitespace-nowrap transition-colors",
              selectedCategory === cat.id
                ? "bg-white text-black"
                : "bg-[#1a1a1a] text-[#bcb9b9] hover:bg-[#2a2a2a]"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* State filters */}
      <div className="flex items-center gap-2">
        {[
          { key: 'all' as const, label: 'Todos' },
          { key: 'low' as const, label: 'Bajo' },
          { key: 'ok' as const, label: 'OK' },
          { key: 'empty' as const, label: 'Sin stock' },
          { key: 'expiring' as const, label: 'Por vencer' },
        ].map((state) => (
          <button
            key={state.key}
            onClick={() => setFilter(state.key)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-colors",
              filter === state.key
                ? "bg-[#1a1a1a] text-white border border-[#2a2a2a]"
                : "text-[#676b67] hover:text-white"
            )}
          >
            {state.label}
          </button>
        ))}
      </div>
    </div>
  );
};
