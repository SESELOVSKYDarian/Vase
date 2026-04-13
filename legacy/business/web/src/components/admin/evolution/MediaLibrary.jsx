import React, { useState } from 'react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import { cn } from '../../../utils/cn';
import {
    Image as ImageIcon,
    UploadSimple,
    MagnifyingGlass,
    SquaresFour,
    List,
    Trash,
    ArrowSquareOut,
    CheckCircle,
    Funnel,
    HardDrive,
    DotsThree
} from '@phosphor-icons/react';

const MediaLibrary = () => {
    const [viewMode, setViewMode] = useState('grid');
    const [searchQuery, setSearchQuery] = useState('');
    const { selectItem, selectedId } = useEvolutionStore();

    // Mock Media Data
    const [mediaItems] = useState([
        { id: 'm1', name: 'hero-banner-summer.jpg', url: 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=800', size: '1.2MB', type: 'image/jpeg', dimensions: '1920x1080' },
        { id: 'm2', name: 'product-sneaker-01.png', url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&q=80&w=800', size: '850KB', type: 'image/png', dimensions: '1200x1200' },
        { id: 'm3', name: 'logo-alt-dark.svg', url: 'https://cdn.worldvectorlogo.com/logos/nike-11.svg', size: '12KB', type: 'image/svg+xml', dimensions: '500x200' },
        { id: 'm4', name: 'category-fashion.webp', url: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=800', size: '420KB', type: 'image/webp', dimensions: '800x600' },
        { id: 'm5', name: 'lookbook-winter-preview.jpg', url: 'https://images.unsplash.com/photo-1511405946472-a37e3b5ccd47?auto=format&fit=crop&q=80&w=800', size: '2.4MB', type: 'image/jpeg', dimensions: '2560x1440' },
        { id: 'm6', name: 'avatar-user-ref-09.jpg', url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=400', size: '92KB', type: 'image/jpeg', dimensions: '512x512' },
    ]);

    const filteredMedia = mediaItems.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-500">
            {/* Header Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-white tracking-tight">Biblioteca Media</h2>
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                        >
                            <SquaresFour size={18} weight={viewMode === 'grid' ? "bold" : "regular"} />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                        >
                            <List size={18} weight={viewMode === 'list' ? "bold" : "regular"} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <MagnifyingGlass size={16} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-evolution-indigo transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar assets..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="bg-zinc-dark/40 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-evolution-indigo/50 focus:border-evolution-indigo/50 transition-all w-64"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-evolution-indigo text-white text-xs font-bold rounded-xl hover:bg-evolution-indigo/90 transition-all shadow-glow">
                        <UploadSimple size={16} weight="bold" />
                        Subir Archivo
                    </button>
                </div>
            </div>

            {/* Content Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar pr-2 -mr-2">
                {viewMode === 'grid' ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4 pb-10">
                        {filteredMedia.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => selectItem(item.id, 'media', item)}
                                className={cn(
                                    "group bg-zinc-dark/20 border border-white/5 rounded-2xl p-2 cursor-pointer transition-all hover:border-white/20 hover:bg-zinc-dark/40 relative overflow-hidden",
                                    selectedId === item.id && "border-evolution-indigo ring-1 ring-evolution-indigo/20 bg-zinc-dark/60 shadow-glow"
                                )}
                            >
                                <div className="aspect-square rounded-xl bg-white/5 overflow-hidden relative border border-white/5">
                                    <img
                                        src={item.url}
                                        alt={item.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80 group-hover:opacity-100"
                                    />
                                    {selectedId === item.id && (
                                        <div className="absolute top-2 right-2 p-1 bg-evolution-indigo rounded-full shadow-lg">
                                            <CheckCircle size={12} weight="bold" className="text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="mt-2 px-1">
                                    <p className="text-[10px] font-medium text-zinc-500 truncate group-hover:text-zinc-300 transition-colors">
                                        {item.name}
                                    </p>
                                </div>

                                {/* Overlay Actions */}
                                <div className="absolute inset-0 bg-zinc-950/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none group-hover:pointer-events-auto">
                                    <div className="flex gap-2 scale-90 group-hover:scale-100 transition-transform">
                                        <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10">
                                            <ArrowSquareOut size={16} weight="bold" />
                                        </button>
                                        <button className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-500 hover:text-white backdrop-blur-md border border-rose-500/20 transition-all">
                                            <Trash size={16} weight="bold" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2 pb-10">
                        {filteredMedia.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => selectItem(item.id, 'media', item)}
                                className={cn(
                                    "flex items-center gap-4 p-3 rounded-xl bg-zinc-dark/20 border border-white/5 hover:border-white/20 hover:bg-zinc-dark/40 transition-all cursor-pointer",
                                    selectedId === item.id && "border-evolution-indigo bg-zinc-dark/60"
                                )}
                            >
                                <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/5 flex-shrink-0">
                                    <img src={item.url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{item.name}</p>
                                    <p className="text-[10px] text-zinc-500">{item.dimensions} • {item.type}</p>
                                </div>
                                <div className="text-[10px] font-mono text-zinc-600 px-3 whitespace-nowrap">
                                    {item.size}
                                </div>
                                <button className="p-2 text-zinc-600 hover:text-white transition-colors">
                                    <DotsThree size={18} weight="bold" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Storage Indicator */}
            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex items-center gap-3">
                    <HardDrive size={18} weight="bold" className="text-zinc-600" />
                    <div className="space-y-1">
                        <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            <span>Almacenamiento</span>
                            <span className="text-white">12.4 GB / 50 GB</span>
                        </div>
                        <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-evolution-indigo w-[25%] rounded-full shadow-glow" />
                        </div>
                    </div>
                </div>
                <button className="flex items-center gap-2 text-[11px] font-bold text-zinc-400 hover:text-white transition-colors">
                    <Funnel size={14} weight="bold" />
                    Ver solo imágenes
                </button>
            </div>
        </div>
    );
};


export default MediaLibrary;
