'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Search } from 'lucide-react';
import { DishAdminCard } from '@/components/platos/DishAdminCard';
import { DishFormPanel } from '@/components/platos/DishFormPanel';
import { ConfirmDeleteModal } from '@/components/superadm/shared/ConfirmDeleteModal';
import { ingredientesService } from '@/services/ingredientesService';
import { platosService } from '@/services/platosService';
import type { Ingrediente, Plato, PlatoInput } from '@/types/platos';

export default function PlatosPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [platoToEdit, setPlatoToEdit] = useState<Plato | undefined>();
  const [platoToDelete, setPlatoToDelete] = useState<Plato | undefined>();
  const [mutationError, setMutationError] = useState<string | null>(null);

  const platosQuery = useQuery({
    queryKey: ['platos', 'productos'],
    queryFn: platosService.getPlatos,
  });

  const categoriasQuery = useQuery({
    queryKey: ['platos', 'categorias'],
    queryFn: platosService.getCategorias,
  });

  const ingredientesQuery = useQuery({
    queryKey: ['platos', 'ingredientes'],
    queryFn: ingredientesService.getIngredientes,
  });

  const invalidatePlatos = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['platos'] }),
      queryClient.invalidateQueries({ queryKey: ['productos', 'catalogo', 'disponibles'] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (input: PlatoInput) => {
      if (platoToEdit) return platosService.updatePlato(platoToEdit.id, input);
      return platosService.createPlato(input);
    },
    onSuccess: async () => {
      setMutationError(null);
      setIsFormOpen(false);
      setPlatoToEdit(undefined);
      await invalidatePlatos();
    },
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : 'No se pudo guardar el plato.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => platosService.softDeletePlato(id),
    onSuccess: async () => {
      setMutationError(null);
      setPlatoToDelete(undefined);
      await invalidatePlatos();
    },
    onError: (error) => {
      setMutationError(error instanceof Error ? error.message : 'No se pudo eliminar el plato.');
    },
  });

  const createIngredientMutation = useMutation({
    mutationFn: ingredientesService.createIngrediente,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['platos', 'ingredientes'] });
    },
  });

  const platos = platosQuery.data ?? [];
  const categorias = categoriasQuery.data ?? [];
  const ingredientes = ingredientesQuery.data ?? [];

  const categoriesForFilter = useMemo(() => {
    const fromProducts = new Map<string, string>();
    platos.forEach((plato) => {
      if (plato.categoriaId) fromProducts.set(plato.categoriaId, plato.categoriaNombre);
    });
    categorias.forEach((category) => fromProducts.set(category.id, category.nombre));
    return Array.from(fromProducts.entries()).map(([id, nombre]) => ({ id, nombre }));
  }, [categorias, platos]);

  const filteredPlatos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return platos.filter((plato) => {
      const matchesCategory = selectedCategory === 'all' || plato.categoriaId === selectedCategory;
      const matchesSearch = !query || plato.nombre.toLowerCase().includes(query);
      return matchesCategory && matchesSearch;
    });
  }, [platos, searchQuery, selectedCategory]);

  const openCreate = () => {
    setMutationError(null);
    setPlatoToEdit(undefined);
    setIsFormOpen(true);
  };

  const openEdit = (plato: Plato) => {
    setMutationError(null);
    setPlatoToEdit(plato);
    setIsFormOpen(true);
  };

  const handleCreateIngredient = async (input: {
    nombre: string;
    unidadMedida: string;
    stockActual: number;
    stockMinimo: number;
  }): Promise<Ingrediente> => {
    return createIngredientMutation.mutateAsync(input);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Platos</h1>
          <p className="text-[#676b67]">Productos reales desde Supabase y recetas persistidas.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-500 flex items-center gap-2"
        >
          <Plus size={16} />
          Nuevo plato
        </button>
      </div>

      {(mutationError || platosQuery.error || ingredientesQuery.error) && (
        <div className="mb-6 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
          {mutationError ||
            (platosQuery.error instanceof Error ? platosQuery.error.message : null) ||
            (ingredientesQuery.error instanceof Error ? ingredientesQuery.error.message : null)}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#676b67]" size={18} />
          <input
            type="text"
            placeholder="Buscar plato..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="w-full bg-[#151515] border border-[#252525] rounded-lg pl-10 pr-4 py-2 text-white"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
          className="bg-[#151515] border border-[#252525] rounded-lg px-4 py-2 text-white"
        >
          <option value="all">Todas</option>
          {categoriesForFilter.map((category) => (
            <option key={category.id} value={category.id}>{category.nombre}</option>
          ))}
        </select>
      </div>

      {platosQuery.isLoading ? (
        <p className="text-[#676b67] text-center py-12">Cargando platos reales...</p>
      ) : filteredPlatos.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-[#676b67]">No hay platos para mostrar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredPlatos.map((plato) => (
            <DishAdminCard
              key={plato.id}
              plato={plato}
              onEdit={() => openEdit(plato)}
              onDelete={() => setPlatoToDelete(plato)}
            />
          ))}
        </div>
      )}

      <DishFormPanel
        key={`${isFormOpen ? 'open' : 'closed'}-${platoToEdit?.id || 'new'}`}
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setPlatoToEdit(undefined);
        }}
        platoToEdit={platoToEdit}
        categorias={categorias}
        ingredientes={ingredientes}
        isSaving={saveMutation.isPending}
        onSubmit={(input) => saveMutation.mutate(input)}
        onCreateIngredient={handleCreateIngredient}
      />

      <ConfirmDeleteModal
        isOpen={!!platoToDelete}
        onClose={() => setPlatoToDelete(undefined)}
        onConfirm={() => {
          if (platoToDelete) deleteMutation.mutate(platoToDelete.id);
        }}
        title={`Eliminar "${platoToDelete?.nombre || ''}"`}
        message="El plato se desactivara en productos.activo y no se eliminara historicamente."
      />
    </div>
  );
}
