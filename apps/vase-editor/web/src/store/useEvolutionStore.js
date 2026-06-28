import { create } from 'zustand';

const useEvolutionStore = create((set) => ({
    // Navigation & View
    activeModule: 'home', // legacy: home/about/appearance/catalog/pricing/users/checkout/tenants
    isSidebarCollapsed: false,
    isInspectorOpen: true,
    catalogInspectorSection: 'general',

    // Selection Context (for the Inspector)
    selectedId: null,      // e.g., product ID or block ID
    selectionType: null,   // 'product', 'block', 'settings'
    selectionData: null,   // Current data of the selected item

    // Actions
    setActiveModule: (module) => set((state) => ({
        activeModule: module,
        selectedId: null,
        selectionType: null,
        selectionData: null,
        catalogInspectorSection: module === 'catalog' ? 'general' : state.catalogInspectorSection,
    })),
    setCatalogInspectorSection: (section) => set({
        catalogInspectorSection: section || 'general',
    }),
    setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
    setInspectorOpen: (open) => set({ isInspectorOpen: open }),
    toggleInspector: () => set((state) => ({ isInspectorOpen: !state.isInspectorOpen })),

    // Selection logic
    selectItem: (id, type, data = null) => set({
        selectedId: id,
        selectionType: type,
        selectionData: data,
        isInspectorOpen: true
    }),
    clearSelection: () => set({ selectedId: null, selectionType: null, selectionData: null }),
    updateSelectionData: (patch) => set((state) => ({
        selectionData: state.selectionData ? { ...state.selectionData, ...patch } : null
    })),
}));

export default useEvolutionStore;
