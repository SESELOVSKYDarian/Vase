'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStockStore } from '@/store/stockStore';
import { useSuperAdmStore } from '@/store/superadmStore';
import { StockHeader } from '@/components/stock/StockHeader';
import { StockFilters } from '@/components/stock/StockFilters';
import { CategoryAccordion } from '@/components/stock/CategoryAccordion';
import { IngredientRow } from '@/components/stock/IngredientRow';
import { AddIngredientModal } from '@/components/stock/AddIngredientModal';

export default function StockPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const {
    categories,
    filter,
    view,
    searchQuery,
    selectedCategory,
  } = useStockStore();
  const { config, initializeConfig } = useSuperAdmStore();
  
  useEffect(() => {
    initializeConfig();
  }, [initializeConfig]);

  useEffect(() => {
    // Just wait a little to simulate loading
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const filteredAndGroupedIngredients = useMemo(() => {
    return categories.map(category => {
      let filteredIngredients = [...category.ingredients];

      // Filter by search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        filteredIngredients = filteredIngredients.filter(ing =>
          ing.name.toLowerCase().includes(query)
        );
      }

      // Filter by selected category
      if (selectedCategory && selectedCategory !== category.id) {
        filteredIngredients = [];
      }

      // Filter by stock status
      if (filter !== 'all') {
        filteredIngredients = filteredIngredients.filter(ing => {
          if (filter === 'empty') return ing.stock === 0;
          if (filter === 'low') return ing.stock > 0 && ing.stock < ing.minStock;
          if (filter === 'ok') return ing.stock >= ing.minStock;
          if (filter === 'expiring') {
            if (!ing.expirationDate || !ing.hasExpiration) return false;
            const expDate = new Date(ing.expirationDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            return diffDays <= 7;
          }
          return true;
        });
      }

      return { ...category, ingredients: filteredIngredients };
    }).filter(category => category.ingredients.length > 0);
  }, [categories, filter, searchQuery, selectedCategory]);

  const texts = config.theme.dashboardTexts?.stock || { title: 'Stock', subtitle: 'Gestiona el inventario de ingredientes' };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{texts.title}</h1>
        <p style={{ color: 'var(--color-text-secondary)' }} className="text-sm">{texts.subtitle}</p>
      </div>
      <StockHeader onOpenModal={() => setIsModalOpen(true)} />
      <StockFilters categories={categories} />

      {isLoading ? (
        <div className="flex items-center justify-center py-20" style={{ color: 'var(--color-text-secondary)' }}>
          <svg className="animate-spin w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span className="text-sm">Cargando productos…</span>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {view === 'grid' ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {filteredAndGroupedIngredients.length === 0 ? (
                <div className="text-center py-16 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  No se encontraron productos.
                </div>
              ) : (
                filteredAndGroupedIngredients.map(category => (
                  <CategoryAccordion
                    key={category.id}
                    category={category}
                    filteredIngredients={category.ingredients}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-surface)' }}
              className="border border-[#1a1a1a] rounded-xl overflow-hidden"
            >
              <table className="w-full">
                <thead style={{ backgroundColor: 'var(--color-surface)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Ingrediente
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Categoría
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Stock
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Estado
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Vencimiento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--color-text-secondary)' }}>
                      Última actualización
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndGroupedIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-16 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                        No se encontraron productos.
                      </td>
                    </tr>
                  ) : (
                    filteredAndGroupedIngredients.flatMap(category =>
                      category.ingredients.map((ing, index) => (
                        <IngredientRow
                          key={ing.id}
                          ingredient={ing}
                          index={index}
                        />
                      ))
                    )
                  )}
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      <AddIngredientModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        categories={categories}
      />
    </div>
  );
}
