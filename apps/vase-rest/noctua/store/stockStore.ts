"use client";

import { create } from "zustand";
import type { Ingredient, StockCategory, StockFilter, StockView } from "@/types/stock";
import type { Categoria, Producto } from "@/types/producto";
import { buildInitialStock } from "@/hooks/lib/stockMockData";

// MOCK DATA FOR BACKWARD COMPATIBILITY
const mockCategorias: Categoria[] = [
  { id: 'cafeteria', nombre: 'Cafetería' },
  { id: 'restaurante', nombre: 'Restaurante' },
  { id: 'bebidas', nombre: 'Bebidas' },
  { id: 'combos', nombre: 'Combos' }
];

const mockProductos: Producto[] = [
  { id: '1', nombre: 'Café con leche', precio: 1200, categoria_id: 'cafeteria', disponible: true },
  { id: '2', nombre: 'Medialunas de manteca', precio: 800, categoria_id: 'cafeteria', disponible: true },
  { id: '3', nombre: 'Milanesa de carne con papas fritas', precio: 4500, categoria_id: 'restaurante', disponible: true },
  { id: '4', nombre: 'Coca Cola 500ml', precio: 600, categoria_id: 'bebidas', disponible: true },
  { id: '5', nombre: 'Combo Milanesa + Bebida', precio: 5000, categoria_id: 'combos', disponible: true },
];

interface StockState {
  // NEW INGREDIENT SYSTEM
  categories: StockCategory[];
  filter: StockFilter;
  view: StockView;
  searchQuery: string;
  selectedCategory: string | null;
  setFilter: (filter: StockFilter) => void;
  setView: (view: StockView) => void;
  setSearch: (query: string) => void;
  setSelectedCategory: (categoryId: string | null) => void;
  setIngredients: (ingredients: Ingredient[]) => void;
  updateStock: (ingredientId: string, newStock: number) => void;
  incrementStock: (ingredientId: string) => void;
  decrementStock: (ingredientId: string) => void;
  addIngredient: (ingredient: Omit<Ingredient, 'id' | 'lastUpdated'>, precio: number, isNewCategory: boolean) => Promise<void>;
  removeIngredient: (ingredientId: string) => void;
  updateIngredient: (ingredientId: string, updates: Partial<Ingredient>) => Promise<void>;
  getLowStockIngredients: () => Ingredient[];
  getTotalIngredients: () => number;
  getExpiringIngredients: (daysThreshold: number) => Ingredient[];
  getIngredientsLinkedToDish: (dishId: string) => Ingredient[];
  deductIngredients: (deductions: { ingredientId: string; amount: number }[]) => void;

  // CATEGORIES & PRODUCTS (FOR SUPERADMIN)
  categorias: Categoria[];
  productos: Producto[];
  cargarCategorias: () => Promise<void>;
  cargarProductos: () => Promise<void>;
  agregarCategoria: (categoria: Omit<Categoria, 'id'>) => Promise<void>;
  actualizarCategoria: (id: string, updates: Partial<Categoria>) => Promise<void>;
  eliminarCategoria: (id: string) => Promise<void>;
  agregarProducto: (producto: Omit<Producto, 'id'>) => Promise<void>;
  actualizarProducto: (id: string, updates: Partial<Producto>) => Promise<void>;
  eliminarProducto: (id: string) => Promise<void>;
}

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[áàâäã]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[íìîï]/g, "i")
    .replace(/[óòôöõ]/g, "o")
    .replace(/[úùûü]/g, "u")
    .replace(/[ñ]/g, "n")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const useStockStore = create<StockState>((set, get) => {
  const initialCategories = buildInitialStock();

  return {
    // NEW INGREDIENT SYSTEM
    categories: initialCategories,
    filter: 'all',
    view: 'grid',
    searchQuery: '',
    selectedCategory: null,

    setFilter: (filter: StockFilter) => set({ filter }),
    setView: (view: StockView) => set({ view }),
    setSearch: (searchQuery: string) => set({ searchQuery }),
    setSelectedCategory: (categoryId: string | null) => set({ selectedCategory: categoryId }),

    // BACKWARD COMPATIBILITY
    categorias: mockCategorias,
    productos: mockProductos,
    cargarCategorias: async () => {
      try {
        const { obtenerCategorias } = await import("@/hooks/lib/api/productosApi");
        const data = await obtenerCategorias();
        if (data.length > 0) {
          set({ categorias: data });
        } else {
          set({ categorias: mockCategorias }); // Fallback si backend está vacío o inaccesible
        }
      } catch (error) {
        console.error("Error cargando categorias:", error);
        set({ categorias: mockCategorias }); // Fallback
      }
    },
    cargarProductos: async () => {
    try {
      const { obtenerProductos } = await import("@/hooks/lib/api/productosApi");
      const data = await obtenerProductos();
      
      let productosParaUsar: Producto[];
      if (data.length > 0) {
        productosParaUsar = data;
        set({ productos: data });
      } else {
        productosParaUsar = mockProductos;
        set({ productos: mockProductos }); // Fallback
      }

      const ingredients: Ingredient[] = productosParaUsar.map((p) => ({
        id: p.id,
        name: p.nombre,
        category: p.categoria?.nombre || p.categoria_id || "Sin categoría",
        stock: p.stock ?? 0,
        unit: "unidades",
        minStock: 5,
        expirationDate: null,
        hasExpiration: false,
        lastUpdated: new Date(),
      }));
      
      get().setIngredients(ingredients);
    } catch (error) {
      console.error("Error al cargar productos desde el backend:", error);
      set({ productos: mockProductos }); // Fallback
      
      const ingredients: Ingredient[] = mockProductos.map((p) => ({
        id: p.id,
        name: p.nombre,
        category: p.categoria?.nombre || p.categoria_id || "Sin categoría",
        stock: p.stock ?? 0,
        unit: "unidades",
        minStock: 5,
        expirationDate: null,
        hasExpiration: false,
        lastUpdated: new Date(),
      }));
      
      get().setIngredients(ingredients);
    }
  },

    setIngredients: (ingredients: Ingredient[]) => set((state) => {
      const categoryMap = new Map<string, StockCategory>();

      // Initialize with existing categories (preserving structure)
      state.categories.forEach((cat) => {
        categoryMap.set(cat.name, { ...cat, ingredients: [] });
      });

      // Add ingredients to their respective categories
      ingredients.forEach((ing) => {
        if (!categoryMap.has(ing.category)) {
          categoryMap.set(ing.category, {
            id: slugify(ing.category),
            name: ing.category,
            ingredients: [],
          });
        }
        const cat = categoryMap.get(ing.category)!;
        cat.ingredients.push(ing);
      });

      return { categories: Array.from(categoryMap.values()) };
    }),

    updateStock: async (ingredientId: string, newStock: number) => {
      // Optimistic update
      set((state) => ({
        categories: state.categories.map((cat) => ({
          ...cat,
          ingredients: cat.ingredients.map((ing) =>
            ing.id === ingredientId
              ? { ...ing, stock: Math.max(0, newStock), lastUpdated: new Date() }
              : ing
          ),
        })),
        productos: state.productos.map(p => p.id === ingredientId ? { ...p, stock: Math.max(0, newStock) } : p)
      }));

      try {
        const { apiFetch } = await import("@/hooks/lib/api/client");
        await apiFetch(`/productos/${ingredientId}`, {
          method: "PUT",
          body: JSON.stringify({ stock: Math.max(0, newStock) }),
        });
      } catch (error) {
        console.error("Error al actualizar stock en DB:", error);
      }
    },

    incrementStock: (ingredientId: string) =>
      set((state) => {
        const currentIngredient = state.categories
          .flatMap((cat) => cat.ingredients)
          .find((ing) => ing.id === ingredientId);
        if (currentIngredient) {
          get().updateStock(ingredientId, currentIngredient.stock + 1);
        }
        return state;
      }),

    decrementStock: (ingredientId: string) =>
      set((state) => {
        const currentIngredient = state.categories
          .flatMap((cat) => cat.ingredients)
          .find((ing) => ing.id === ingredientId);
        if (currentIngredient) {
          get().updateStock(ingredientId, currentIngredient.stock - 1);
        }
        return state;
      }),

    addIngredient: async (ingredient, precio, isNewCategory) => {
      try {
        const { crearProducto, crearCategoria } = await import("@/hooks/lib/api/productosApi");
        
        let categoryId = "";
        if (isNewCategory) {
          const nuevaCat = await crearCategoria(ingredient.category);
          categoryId = nuevaCat.id;
          set((state) => ({ categorias: [...state.categorias, nuevaCat] }));
        } else {
          // Find existing category ID
          const cat = get().categorias.find(c => c.nombre === ingredient.category);
          categoryId = cat?.id || ingredient.category;
        }

        const result = await crearProducto({
          nombre: ingredient.name,
          precio: precio,
          categoria_id: categoryId,
          stock: ingredient.stock,
          disponible: true,
        });

        if (result.success && result.producto) {
          const p = result.producto;
          const newIngredient: Ingredient = {
            id: p.id,
            name: p.nombre,
            category: p.categoria?.nombre || p.categoria_id,
            subcategory: ingredient.subcategory,
            stock: p.stock ?? 0,
            unit: ingredient.unit,
            minStock: ingredient.minStock,
            expirationDate: ingredient.expirationDate ?? null,
            hasExpiration: ingredient.hasExpiration ?? false,
            lastUpdated: new Date(),
          };

          set((state) => {
            const categoryExists = state.categories.some(
              (cat) => cat.name === newIngredient.category
            );
            if (categoryExists) {
              return {
                productos: [...state.productos, p],
                categories: state.categories.map((cat) =>
                  cat.name === newIngredient.category
                    ? { ...cat, ingredients: [...cat.ingredients, newIngredient] }
                    : cat
                ),
              };
            } else {
              return {
                productos: [...state.productos, p],
                categories: [
                  ...state.categories,
                  {
                    id: slugify(newIngredient.category),
                    name: newIngredient.category,
                    ingredients: [newIngredient],
                  },
                ],
              };
            }
          });
        }
      } catch (error) {
        console.warn("Backend no disponible, guardando localmente:", error);
        
        // Fallback: generar ID local y guardar solo en el store
        const newId = `local-${Date.now()}`;
        const newIngredient: Ingredient = {
          id: newId,
          name: ingredient.name,
          category: ingredient.category,
          subcategory: ingredient.subcategory,
          stock: ingredient.stock,
          unit: ingredient.unit,
          minStock: ingredient.minStock,
          expirationDate: ingredient.expirationDate ?? null,
          hasExpiration: ingredient.hasExpiration ?? false,
          lastUpdated: new Date(),
        };

        const localProduct = {
          id: newId,
          nombre: ingredient.name,
          precio: precio,
          categoria_id: ingredient.category,
          disponible: true,
          stock: ingredient.stock,
        };

        set((state) => {
          const categoryExists = state.categories.some(
            (cat) => cat.name === ingredient.category
          );
          
          let newCategorias = state.categorias;
          if (!state.categorias.some(c => c.nombre === ingredient.category)) {
            newCategorias = [...state.categorias, { id: ingredient.category, nombre: ingredient.category }];
          }

          if (categoryExists) {
            return {
              categorias: newCategorias,
              productos: [...state.productos, localProduct],
              categories: state.categories.map((cat) =>
                cat.name === ingredient.category
                  ? { ...cat, ingredients: [...cat.ingredients, newIngredient] }
                  : cat
              ),
            };
          } else {
            return {
              categorias: newCategorias,
              productos: [...state.productos, localProduct],
              categories: [
                ...state.categories,
                {
                  id: slugify(ingredient.category),
                  name: ingredient.category,
                  ingredients: [newIngredient],
                },
              ],
            };
          }
        });
      }
    },

    removeIngredient: async (ingredientId: string) => {
      // Optimistic update
      set((state) => ({
        categories: state.categories.map((cat) => ({
          ...cat,
          ingredients: cat.ingredients.filter((ing) => ing.id !== ingredientId),
        })),
        productos: state.productos.filter(p => p.id !== ingredientId)
      }));

      try {
        // Check if this ingredient exists in productos (only those are from the backend)
        const existsInProductos = get().productos.some(p => p.id === ingredientId);
        
        if (!ingredientId.startsWith("local-") && !existsInProductos) {
          // It's a local or initial stock item, don't call backend
          console.log("Ingredient not in productos, skipping backend delete");
          return;
        }

        const { eliminarProducto } = await import("@/hooks/lib/api/productosApi");
        await eliminarProducto(ingredientId);
      } catch (error) {
        console.warn("Backend no disponible, eliminación solo local:", error);
      }
    },

    getLowStockIngredients: () => {
      const allIngredients = get().categories.flatMap((cat) => cat.ingredients);
      return allIngredients.filter((ing) => ing.stock < ing.minStock);
    },

    getTotalIngredients: () => {
      return get().categories.reduce(
        (total, cat) => total + cat.ingredients.length, 0
      );
    },

    getExpiringIngredients: (daysThreshold: number) => {
      const allIngredients = get().categories.flatMap((cat) => cat.ingredients);
      const now = new Date();
      return allIngredients.filter((ing) => {
        if (!ing.expirationDate || !ing.hasExpiration) return false;
        const expirationDate = new Date(ing.expirationDate);
        const diffTime = expirationDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= daysThreshold;
      });
    },

    getIngredientsLinkedToDish: (dishId: string) => {
      // For now, return all ingredients used in any recipe
      // We'll implement this better later
      return [];
    },

    deductIngredients: (deductions: { ingredientId: string; amount: number }[]) => {
      set((state) => {
        const newCategories = state.categories.map((cat) => ({
          ...cat,
          ingredients: cat.ingredients.map((ing) => {
            const deduction = deductions.find((d) => d.ingredientId === ing.id);
            if (deduction) {
              return {
                ...ing,
                stock: Math.max(0, ing.stock - deduction.amount),
                lastUpdated: new Date()
              };
            }
            return ing;
          })
        }));
        return { categories: newCategories };
      });
    },

    updateIngredient: async (ingredientId: string, updates: Partial<Ingredient>) => {
      try {
        // First update in store (optimistic)
        set((state) => ({
          categories: state.categories.map((cat) => ({
            ...cat,
            ingredients: cat.ingredients.map((ing) =>
              ing.id === ingredientId ? { ...ing, ...updates, lastUpdated: new Date() } : ing
            ),
          })),
          productos: state.productos.map(p => p.id === ingredientId ? {
            ...p,
            nombre: updates.name || p.nombre,
            stock: updates.stock ?? p.stock,
            disponible: true,
          } : p)
        }));

        // Then try update in DB
        const { actualizarProducto } = await import("@/hooks/lib/api/productosApi");
        const producto = get().productos.find(p => p.id === ingredientId);
        if (producto && !ingredientId.startsWith("local-")) {
          await actualizarProducto(ingredientId, {
            nombre: updates.name || producto.nombre,
            stock: updates.stock ?? producto.stock,
            categoria_id: producto.categoria_id,
            precio: producto.precio,
          });
        }
      } catch (error) {
        console.warn("Backend no disponible, actualización solo local:", error);
      }
    },

    // CATEGORIES & PRODUCTS FUNCTIONS
    agregarCategoria: async (categoria: Omit<Categoria, 'id'>) => {
      try {
        const { crearCategoria } = await import("@/hooks/lib/api/productosApi");
        const nueva = await crearCategoria(categoria.nombre);
        set((state) => ({ categorias: [...state.categorias, nueva] }));
      } catch (error) {
        console.warn("Backend no disponible, guardando categoría localmente:", error);
        // Fallback: generar ID local y guardar solo en el store
        const newId = `local-cat-${Date.now()}`;
        set((state) => ({
          categorias: [...state.categorias, { id: newId, nombre: categoria.nombre }]
        }));
      }
    },

    actualizarCategoria: async (id: string, updates: Partial<Categoria>) => {
      try {
        // Optimistic update
        set((state) => ({
          categorias: state.categorias.map(c => c.id === id ? { ...c, ...updates } : c)
        }));

        if (!id.startsWith("local-")) {
          const { actualizarCategoria } = await import("@/hooks/lib/api/productosApi");
          await actualizarCategoria(id, updates);
        }
      } catch (error) {
        console.warn("Backend no disponible, actualización solo local:", error);
      }
    },

    eliminarCategoria: async (id: string) => {
      try {
        // Optimistic update
        set((state) => ({
          categorias: state.categorias.filter(c => c.id !== id)
        }));

        if (!id.startsWith("local-")) {
          const { eliminarCategoria } = await import("@/hooks/lib/api/productosApi");
          await eliminarCategoria(id);
        }
      } catch (error) {
        console.warn("Backend no disponible, eliminación solo local:", error);
      }
    },

    agregarProducto: async (producto: Omit<Producto, 'id'>) => {
      try {
        const { crearProducto } = await import("@/hooks/lib/api/productosApi");
        const result = await crearProducto({
          ...producto,
          stock: producto.stock ?? 0,
        });
        if (result.success && result.producto) {
          set((state) => ({ productos: [...state.productos, result.producto] }));

          // Also add to ingredients
          const newIngredient: Ingredient = {
            id: result.producto.id,
            name: result.producto.nombre,
            category: get().categorias.find(c => c.id === result.producto.categoria_id)?.nombre || "Sin categoría",
            stock: result.producto.stock || 0,
            unit: "unidades",
            minStock: 5,
            expirationDate: null,
            hasExpiration: false,
            lastUpdated: new Date(),
          };

          set((state) => {
            const categoryExists = state.categories.some(c => c.name === newIngredient.category);
            if (categoryExists) {
              return {
                categories: state.categories.map(c =>
                  c.name === newIngredient.category
                    ? { ...c, ingredients: [...c.ingredients, newIngredient] }
                    : c
                )
              };
            } else {
              return {
                categories: [
                  ...state.categories,
                  { id: slugify(newIngredient.category), name: newIngredient.category, ingredients: [newIngredient] }
                ]
              };
            }
          });
        }
      } catch (error) {
        console.warn("Backend no disponible, guardando producto localmente:", error);
        // Fallback: generar ID local y guardar solo en el store
        const newId = `local-prod-${Date.now()}`;
        const localProduct = { id: newId, ...producto };
        set((state) => ({ productos: [...state.productos, localProduct] }));

        // Also add to ingredients
        const newIngredient: Ingredient = {
          id: newId,
          name: producto.nombre,
          category: get().categorias.find(c => c.id === producto.categoria_id)?.nombre || "Sin categoría",
          stock: producto.stock || 0,
          unit: "unidades",
          minStock: 5,
          expirationDate: null,
          hasExpiration: false,
          lastUpdated: new Date(),
        };

        set((state) => {
          const categoryExists = state.categories.some(c => c.name === newIngredient.category);
          if (categoryExists) {
            return {
              categories: state.categories.map(c =>
                c.name === newIngredient.category
                  ? { ...c, ingredients: [...c.ingredients, newIngredient] }
                  : c
              )
            };
          } else {
            return {
              categories: [
                ...state.categories,
                { id: slugify(newIngredient.category), name: newIngredient.category, ingredients: [newIngredient] }
              ]
            };
          }
        });
      }
    },

    actualizarProducto: async (id: string, updates: Partial<Producto>) => {
      try {
        // Optimistic update
        set((state) => ({
          productos: state.productos.map(p => p.id === id ? { ...p, ...updates } : p)
        }));

        if (!id.startsWith("local-")) {
          const { actualizarProducto } = await import("@/hooks/lib/api/productosApi");
          await actualizarProducto(id, updates);
        }

        // Also update in ingredients
        set((state) => ({
          categories: state.categories.map((cat) => ({
            ...cat,
            ingredients: cat.ingredients.map((ing) =>
              ing.id === id ? {
                ...ing,
                name: updates.nombre || ing.name,
                stock: updates.stock ?? ing.stock,
                lastUpdated: new Date()
              } : ing
            ),
          })),
        }));
      } catch (error) {
        console.warn("Backend no disponible, actualización solo local:", error);
      }
    },

    eliminarProducto: async (id: string) => {
      try {
        // Optimistic update
        set((state) => ({
          productos: state.productos.filter(p => p.id !== id),
          categories: state.categories.map((cat) => ({
            ...cat,
            ingredients: cat.ingredients.filter((ing) => ing.id !== id),
          })),
        }));

        if (!id.startsWith("local-")) {
          const { eliminarProducto } = await import("@/hooks/lib/api/productosApi");
          await eliminarProducto(id);
        }
      } catch (error) {
        console.warn("Backend no disponible, eliminación solo local:", error);
      }
    },
  };
});
