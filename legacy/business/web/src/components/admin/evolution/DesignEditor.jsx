import React, { useState } from 'react';
import useEvolutionStore from '../../../store/useEvolutionStore';
import SortableSection from './SortableSection';
import { cn } from '../../../utils/cn';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    SquaresFour as Layout,
    Eye,
    EyeSlash,
    ArrowCounterClockwise,
    DeviceMobile,
    Monitor,
    DeviceTablet,
    ArrowSquareOut,
    Rows as ListIcon
} from '@phosphor-icons/react';

const DesignEditor = ({ pageSections, settings, onReorder }) => {
    const { selectItem, selectedId } = useEvolutionStore();
    const [viewMode, setViewMode] = useState('desktop');
    const [showPreview, setShowPreview] = useState(true);
    const iframeRef = React.useRef(null);

    // Iframe Sync Logic
    const syncIframe = React.useCallback(() => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.postMessage({
                type: 'EVOLUTION_SYNC_SECTIONS',
                data: pageSections.home
            }, '*');
            iframeRef.current.contentWindow.postMessage({
                type: 'EVOLUTION_SYNC_SETTINGS',
                data: settings
            }, '*');
        }
    }, [pageSections.home, settings]);

    React.useEffect(() => {
        const timer = setTimeout(syncIframe, 100);
        return () => clearTimeout(timer);
    }, [pageSections.home, settings, syncIframe]);

    // Handle signals from Preview
    React.useEffect(() => {
        const handleMessage = (e) => {
            if (e.data.type === 'EVOLUTION_PREVIEW_READY') syncIframe();
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [syncIframe]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = pageSections.home.findIndex(s => s.id === active.id);
            const newIndex = pageSections.home.findIndex(s => s.id === over.id);
            onReorder(arrayMove(pageSections.home, oldIndex, newIndex));
        }
    };

    return (
        <div className="h-full flex flex-col space-y-6">
            {/* Design Controls Bar */}
            <div className="fixed bottom-0 left-0 right-0 md:sticky md:top-0 flex items-center justify-between bg-zinc-900/95 md:bg-zinc-dark/40 p-3 md:p-2 rounded-t-2xl md:rounded-xl border-t md:border border-white/10 md:border-white/5 backdrop-blur-lg z-50">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setViewMode('desktop')}
                        className={cn("p-2 rounded-lg transition-all", viewMode === 'desktop' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <Monitor size={18} weight={viewMode === 'desktop' ? "bold" : "regular"} />
                    </button>
                    <button
                        onClick={() => setViewMode('tablet')}
                        className={cn("p-2 rounded-lg transition-all", viewMode === 'tablet' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <DeviceTablet size={18} weight={viewMode === 'tablet' ? "bold" : "regular"} />
                    </button>
                    <button
                        onClick={() => setViewMode('mobile')}
                        className={cn("p-2 rounded-lg transition-all", viewMode === 'mobile' ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300")}
                    >
                        <DeviceMobile size={18} weight={viewMode === 'mobile' ? "bold" : "regular"} />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <div className="h-4 w-[1px] bg-white/10 mx-2" />
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                            showPreview ? "text-evolution-indigo bg-evolution-indigo/10" : "text-zinc-400 hover:text-white"
                        )}
                    >
                        {showPreview ? <Layout size={16} weight="bold" /> : <ListIcon size={16} weight="bold" />}
                        {showPreview ? 'Vista Previa' : 'Estructura'}
                    </button>
                    <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-zinc-400 hover:text-white transition-colors">
                        <ArrowCounterClockwise size={16} weight="bold" />
                        Reset
                    </button>
                </div>
            </div>

            {/* The "Infinite Canvas" Viewport or Structure View */}
            <div className="flex-1 flex flex-col items-center p-0 md:p-2 mb-20 md:mb-0">
                {!showPreview ? (
                    <div className="w-full max-w-2xl bg-zinc-dark/20 border-0 md:border border-white/5 rounded-none md:rounded-3xl overflow-hidden shadow-none md:shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="p-4 md:p-6 border-b border-white/5 bg-white/5">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Estructura de la Página</h3>
                            <p className="text-[10px] text-zinc-500 mt-1 font-medium">Arrastra para reordenar los bloques de contenido</p>
                        </div>
                        <DndContext
                            sensors={sensors}
                            collisionDetection={closestCenter}
                            onDragEnd={handleDragEnd}
                        >
                            <SortableContext
                                items={pageSections.home.map(s => s.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <div className="divide-y divide-white/5">
                                    {pageSections.home.map((section) => (
                                        <SortableSection
                                            key={section.id}
                                            section={section}
                                            isSelected={selectedId === section.id}
                                            onSelect={selectItem}
                                            showPreview={false}
                                        />
                                    ))}
                                </div>
                            </SortableContext>
                        </DndContext>
                    </div>
                ) : (
                    <div
                        className={cn(
                            "bg-white rounded-2xl shadow-2xl transition-all duration-500 overflow-hidden border-[8px] border-zinc-900 relative group evolution-viewport-shadow",
                            viewMode === 'desktop' && "w-full max-w-[1700px] aspect-video",
                            viewMode === 'tablet' && "w-[768px] aspect-[4/3]",
                            viewMode === 'mobile' && "w-[375px] aspect-[9/19.5]"
                        )}
                    >
                        {/* Live Preview Iframe */}
                        <iframe
                            ref={iframeRef}
                            src="/admin/preview"
                            className="w-full h-full border-none pointer-events-none"
                            title="Preview"
                        />

                        <div className="absolute inset-x-0 bottom-4 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="px-4 py-2 bg-zinc-dark/80 backdrop-blur-md rounded-full border border-white/10 text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live View Ready
                            </div>
                        </div>

                        {/* External Link Overlay */}
                        <a
                            href="/"
                            target="_blank"
                            className="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur shadow-lg rounded-lg text-zinc-500 hover:text-evolution-indigo opacity-0 group-hover:opacity-100 transition-all z-40"
                        >
                            <ArrowSquareOut size={16} weight="bold" />
                        </a>
                    </div>
                )}
            </div>

            {/* Quick Actions Footer */}
            <div className="flex items-center justify-center gap-4">
                <p className="text-[11px] text-zinc-500 font-medium">Consejo: Arrastra los bloques por el icono lateral para cambiar su orden visual.</p>
            </div>
        </div>
    );
};

export default DesignEditor;
