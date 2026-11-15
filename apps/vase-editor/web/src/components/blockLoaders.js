// Bloques de página que no van incluidos en el arranque de la tienda: cada uno se descarga cuando hace falta.
// Tener acá la lista permite dos cosas: que la página los cargue al usarlos y que se puedan pedir por adelantado.
export const BLOCK_LOADERS = {
    AboutHero: () => import('./blocks/AboutHero'),
    AboutMission: () => import('./blocks/AboutMission'),
    AboutStats: () => import('./blocks/AboutStats'),
    AboutValues: () => import('./blocks/AboutValues'),
    AboutTeam: () => import('./blocks/AboutTeam'),
    AboutCTA: () => import('./blocks/AboutCTA'),
    FeaturesBento: () => import('./blocks/FeaturesBento'),
    FeaturesBentoGrid: () => import('./blocks/FeaturesBentoGrid'),
    PiquimHero: () => import('./blocks/PiquimHero'),
    PiquimAnnounceBar: () => import('./blocks/PiquimAnnounceBar'),
    PiquimTresMundos: () => import('./blocks/PiquimTresMundos'),
    PiquimCatalog3Panel: () => import('./blocks/PiquimCatalog3Panel'),
    PiquimFeaturedProducts: () => import('./blocks/PiquimFeaturedProducts'),
    PiquimCTABanner: () => import('./blocks/PiquimCTABanner'),
};

// Pide por adelantado los bloques cuyo nombre empieza con el prefijo (por ejemplo, todos los de Piquim),
// así ya están descargados cuando la página los dibuja. Si alguno falla, se vuelve a pedir al usarlo.
export function preloadBlocks(prefix) {
    Object.entries(BLOCK_LOADERS).forEach(([name, load]) => {
        if (name.startsWith(prefix)) load().catch(() => {});
    });
}
