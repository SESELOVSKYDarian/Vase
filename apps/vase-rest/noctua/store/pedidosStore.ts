"use client";

import { create } from "zustand";
import type { Pedido, ItemPedido, EstadoCocina } from "@/types/pedido";
import type { Dish } from "@/types/dishes";
import { generateId } from "@/hooks/lib/utils";
import { abrirPedidoRow, agregarProductoAPedido, obtenerPedidoPorId, obtenerPedidos, obtenerPedidosActivos, actualizarEstadoPedido, eliminarPedido as eliminarPedidoApi } from "@/hooks/lib/api/pedidosApi";
import { useMesasStore } from "@/store/mesasStore";
import { buildInitialDishes } from "@/hooks/lib/dishesMockData";
import { calculateAllDishesAvailability, calculateMaxAvailable } from "@/lib/recipeCalculator";
import type { Ingredient } from "@/types/stock";
import { useStockStore } from "./stockStore";

interface PedidosState {
  pedidos: Pedido[];
  // Borradores en construcción, indexados por mesaId. Cada borrador contiene
  // SOLO los ítems aún no enviados a cocina (los ya enviados viven en `pedidos`).
  // Al estar keyed por mesa, nunca hay "sangrado" de estado entre mesas.
  borradores: Record<string, Pedido>;
  mesaActivaId: string | null;
  dishes: Dish[];

  cargarPedidos: () => Promise<void>;
  cargarPedidosActivos: () => Promise<void>;
  cargarDishes: () => void;

  // Borrador de pedido (en construcción, por mesa)
  iniciarPedido: (mesaId: string, numeroMesa: number, zona: string, personas: number) => void;
  setMesaActiva: (mesaId: string | null) => void;
  agregarItem: (mesaId: string, item: Omit<ItemPedido, 'subtotal'>) => void;
  quitarItem: (mesaId: string, productoId: string) => void;
  cambiarCantidad: (mesaId: string, productoId: string, cantidad: number) => void;
  cancelarPedido: (mesaId: string) => void;
  setItemNotas: (mesaId: string, productoId: string, notas: string) => void;
  getBorrador: (mesaId: string) => Pedido | undefined;

  // Enviar a cocina (persiste el borrador de la mesa)
  enviarPedido: (mesaId: string) => Promise<Pedido | null>;

  // Actualizar estado (desde cocina)
  actualizarEstadoCocina: (pedidoId: string, estado: EstadoCocina) => Promise<void>;

  // Eliminar pedido
  eliminarPedido: (pedidoId: string) => Promise<void>;

  // Comensales
  setComensalesPedido: (mesaId: string, comensales: number) => void;

  // Getters
  getPedidoPorMesa: (mesaId: string) => Pedido | undefined;
  
  // Dishes
  updateDishesAvailability: (ingredients: Ingredient[]) => void;
  addDish: (dish: Dish) => void;
  updateDish: (dishId: string, updates: Partial<Dish>) => void;
  deleteDish: (dishId: string) => void;
}

export const usePedidosStore = create<PedidosState>((set, get) => ({
  pedidos: [],
  borradores: {},
  mesaActivaId: null,
  dishes: buildInitialDishes(),

  cargarPedidos: async () => {
    try {
      const pedidos = await obtenerPedidos();
      set({ pedidos });
    } catch (error) {
      console.error("Error cargando pedidos:", error);
    }
  },

  cargarPedidosActivos: async () => {
    try {
      const pedidos = await obtenerPedidosActivos();
      // Merge: conservar pedidos no-activos ya en el store (ej. para facturas)
      set((state) => {
        const activosIds = new Set(pedidos.map((p) => p.id));
        const otrosPedidos = state.pedidos.filter(
          (p) => !activosIds.has(p.id) && !["pendiente", "preparando", "listo", "entregado"].includes(p.estado)
        );
        return { pedidos: [...otrosPedidos, ...pedidos] };
      });

      // Hidratar comensales en las mesas desde el pedido activo (la tabla mesas
      // no persiste personas, pero pedidos.comensales sí → así el badge sobrevive al refresh)
      const mesasStore = useMesasStore.getState();
      for (const p of pedidos) {
        if (p.personas && p.personas > 0) {
          mesasStore.setPersonasMesa(p.mesaId, p.personas);
        }
      }
    } catch (error) {
      console.error("Error cargando pedidos activos:", error);
    }
  },

  cargarDishes: () => {
    const dishes = buildInitialDishes();
    const stockIngredients = useStockStore.getState().categories.flatMap(cat => cat.ingredients);
    const dishesWithAvailability = calculateAllDishesAvailability(dishes, stockIngredients);
    set({ dishes: dishesWithAvailability });
  },

  iniciarPedido: (mesaId, numeroMesa, zona, personas) =>
    set((state) => {
      const existente = state.borradores[mesaId];
      // Reusa el borrador si ya existía (recuperación al volver a la mesa),
      // actualizando solo los metadatos; si no, crea uno vacío.
      const borrador: Pedido = existente
        ? { ...existente, numeroMesa, zona, personas: personas || existente.personas }
        : {
            id: generateId(),
            mesaId,
            numeroMesa,
            zona,
            items: [],
            total: 0,
            estado: 'pendiente',
            creadoEn: new Date(),
            actualizadoEn: new Date(),
            personas,
          };
      return { borradores: { ...state.borradores, [mesaId]: borrador }, mesaActivaId: mesaId };
    }),

  setMesaActiva: (mesaId) => set({ mesaActivaId: mesaId }),

  agregarItem: (mesaId, item) =>
    set((state) => {
      const b = state.borradores[mesaId];
      if (!b) return {};
      const existIdx = b.items.findIndex((i) => i.productoId === item.productoId);
      let newItems: ItemPedido[];
      if (existIdx >= 0) {
        newItems = b.items.map((i, idx) =>
          idx === existIdx
            ? {
                ...i,
                cantidad: i.cantidad + item.cantidad,
                subtotal: (i.cantidad + item.cantidad) * i.precioUnitario,
                notas: item.notas || i.notas,
              }
            : i
        );
      } else {
        newItems = [...b.items, { ...item, subtotal: item.cantidad * item.precioUnitario }];
      }
      const total = newItems.reduce((acc, i) => acc + i.subtotal, 0);
      return {
        borradores: { ...state.borradores, [mesaId]: { ...b, items: newItems, total, actualizadoEn: new Date() } },
      };
    }),

  quitarItem: (mesaId, productoId) =>
    set((state) => {
      const b = state.borradores[mesaId];
      if (!b) return {};
      const newItems = b.items.filter((i) => i.productoId !== productoId);
      const total = newItems.reduce((acc, i) => acc + i.subtotal, 0);
      return { borradores: { ...state.borradores, [mesaId]: { ...b, items: newItems, total } } };
    }),

  cambiarCantidad: (mesaId, productoId, cantidad) =>
    set((state) => {
      const b = state.borradores[mesaId];
      if (!b) return {};
      // Quitar un ítem es una acción explícita (quitarItem), no "bajar a 0"
      if (cantidad < 1) return {};
      const newItems = b.items.map((i) =>
        i.productoId === productoId
          ? { ...i, cantidad, subtotal: cantidad * i.precioUnitario }
          : i
      );
      const total = newItems.reduce((acc, i) => acc + i.subtotal, 0);
      return { borradores: { ...state.borradores, [mesaId]: { ...b, items: newItems, total } } };
    }),

  cancelarPedido: (mesaId) =>
    set((state) => {
      const borradores = { ...state.borradores };
      delete borradores[mesaId];
      return {
        borradores,
        mesaActivaId: state.mesaActivaId === mesaId ? null : state.mesaActivaId,
      };
    }),

  setItemNotas: (mesaId, productoId, notas) =>
    set((state) => {
      const b = state.borradores[mesaId];
      if (!b) return {};
      const newItems = b.items.map((i) =>
        i.productoId === productoId ? { ...i, notas } : i
      );
      return { borradores: { ...state.borradores, [mesaId]: { ...b, items: newItems } } };
    }),

  getBorrador: (mesaId) => get().borradores[mesaId],

  enviarPedido: async (mesaId) => {
    const borrador = get().borradores[mesaId];
    if (!borrador || borrador.items.length === 0) return null;

    // Abre (o reutiliza) el pedido de la mesa. El backend no duplica: si ya hay
    // un pedido abierto para la mesa, devuelve ese.
    const pedidoRow = await abrirPedidoRow(borrador.mesaId, borrador.personas);
    const pedidoId = String(pedidoRow.id);
    const teniaItems = (pedidoRow.items?.length ?? pedidoRow.detalles?.length ?? 0) > 0;

    // Envía los ítems uno a uno. Cada uno descuenta stock en el backend; si uno
    // falla (ej: sin stock), los ya enviados quedan persistidos y se quitan del
    // borrador, de modo que un reintento no los duplica.
    let enviados = 0;
    try {
      for (const item of [...borrador.items]) {
        await agregarProductoAPedido(pedidoId, {
          productoId: item.productoId,
          cantidad: item.cantidad,
          notas: item.notas,
        });
        enviados++;
        set((state) => {
          const b = state.borradores[mesaId];
          if (!b) return {};
          const items = b.items.filter((i) => i.productoId !== item.productoId);
          const total = items.reduce((acc, i) => acc + i.subtotal, 0);
          return { borradores: { ...state.borradores, [mesaId]: { ...b, items, total } } };
        });
      }
    } catch (err) {
      // Si no se envió ningún ítem y el pedido lo creamos nosotros (estaba vacío),
      // eliminarlo para no dejar un pedido vacío colgando en cocina.
      if (enviados === 0 && !teniaItems) {
        try { await eliminarPedidoApi(pedidoId); } catch { /* noop */ }
      }
      throw err;
    }

    // Todos los ítems se enviaron: traer el pedido completo y limpiar el borrador.
    const pedidoFinal = await obtenerPedidoPorId(pedidoId);
    set((state) => {
      const existIdx = state.pedidos.findIndex((p) => p.id === pedidoFinal.id);
      const pedidos =
        existIdx >= 0
          ? state.pedidos.map((p) => (p.id === pedidoFinal.id ? pedidoFinal : p))
          : [...state.pedidos, pedidoFinal];
      const borradores = { ...state.borradores };
      delete borradores[mesaId];
      return { pedidos, borradores };
    });

    useMesasStore.getState().asignarPedido(pedidoFinal.mesaId, pedidoFinal.id);
    useMesasStore.getState().setEstadoMesa(pedidoFinal.mesaId, 'esperando_pedido');

    return pedidoFinal;
  },

  actualizarEstadoCocina: async (pedidoId, estado) => {
    try {
      await actualizarEstadoPedido(pedidoId, estado);
      set((state) => ({
        pedidos: state.pedidos.map((p) =>
          p.id === pedidoId ? { ...p, estado, actualizadoEn: new Date() } : p
        ),
      }));
    } catch (e) {
      console.error("Error al actualizar en BD:", e);
    }
  },

  eliminarPedido: async (pedidoId) => {
    try {
      // Capturar mesaId y mesas unidas antes de eliminar
      const pedido = get().pedidos.find((p) => p.id === pedidoId);
      const mesaId = pedido?.mesaId;

      await eliminarPedidoApi(pedidoId);

      set((state) => ({
        pedidos: state.pedidos.filter((p) => p.id !== pedidoId),
      }));

      // Liberar la mesa y sus unidas en el store local
      if (mesaId) {
        const mesasStore = useMesasStore.getState();
        const mesa = mesasStore.mesas.find((m) => m.id === mesaId);
        if (mesa?.mesasUnidas && mesa.mesasUnidas.length > 0) {
          mesa.mesasUnidas.forEach((id) => mesasStore.cerrarMesa(id));
        }
        mesasStore.cerrarMesa(mesaId);
      }
    } catch (e) {
      console.error("Error al eliminar pedido:", e);
      throw e;
    }
  },

  setComensalesPedido: (mesaId, comensales) =>
    set((state) => {
      const borradores = state.borradores[mesaId]
        ? { ...state.borradores, [mesaId]: { ...state.borradores[mesaId], personas: comensales } }
        : state.borradores;
      return {
        pedidos: state.pedidos.map((p) =>
          p.mesaId === mesaId ? { ...p, personas: comensales } : p
        ),
        borradores,
      };
    }),

  getPedidoPorMesa: (mesaId) =>
    get().pedidos.find((p) => p.mesaId === mesaId),

  updateDishesAvailability: (ingredients: Ingredient[]) => {
    set((state) => ({
      dishes: calculateAllDishesAvailability(state.dishes, ingredients)
    }));
  },

  addDish: (dish: Dish) => {
    set((state) => {
      const stockIngredients = useStockStore.getState().categories.flatMap(cat => cat.ingredients);
      const stockMap = new Map<string, Ingredient>();
      stockIngredients.forEach(ing => stockMap.set(ing.id, ing));
      
      const dishWithAvailability = {
        ...dish,
        maxAvailable: calculateMaxAvailable(dish.recipe, stockMap),
        isAvailable: calculateMaxAvailable(dish.recipe, stockMap) > 0
      };
      return { dishes: [...state.dishes, dishWithAvailability] };
    });
  },

  updateDish: (dishId: string, updates: Partial<Dish>) => {
    set((state) => {
      const stockIngredients = useStockStore.getState().categories.flatMap(cat => cat.ingredients);
      const stockMap = new Map<string, Ingredient>();
      stockIngredients.forEach(ing => stockMap.set(ing.id, ing));
      
      return {
        dishes: state.dishes.map(dish => {
          if (dish.id === dishId) {
            const updatedDish = { ...dish, ...updates };
            return {
              ...updatedDish,
              maxAvailable: calculateMaxAvailable(updatedDish.recipe, stockMap),
              isAvailable: calculateMaxAvailable(updatedDish.recipe, stockMap) > 0
            };
          }
          return dish;
        })
      };
    });
  },

  deleteDish: (dishId: string) => {
    set((state) => ({
      dishes: state.dishes.filter(dish => dish.id !== dishId)
    }));
  },
}));
