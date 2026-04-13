import React from 'react';
import EvolutionInput from './EvolutionInput';
import { cn } from '../../../utils/cn';
import {
    Info,
    Copy,
    Trash,
    ArrowSquareOut as ExternalLink,
    CornersOut as Maximize,
    FileText,
    Image as ImageIcon,
    Clock
} from '@phosphor-icons/react';
import { useToast } from '../../../context/ToastContext';

const MediaPropertiesEditor = ({ item }) => {
    const { addToast } = useToast();
    if (!item) return null;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        addToast('Enlace copiado al portapapeles', 'info');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Asset Preview */}
            <div className="space-y-4">
                <div className="aspect-square rounded-2xl bg-white/5 border border-white/5 overflow-hidden group relative shadow-2xl">
                    <img src={item.url} className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-zinc-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button className="p-2 rounded-xl bg-white text-zinc-900 shadow-xl hover:scale-110 transition-transform">
                            <Maximize size={16} weight="bold" />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between px-1">
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-white tracking-tight truncate max-w-[180px]">{item.name}</p>
                        <p className="text-[9px] text-zinc-500 font-mono uppercase">{item.dimensions} • {item.size}</p>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
                <button
                    onClick={() => copyToClipboard(item.url)}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                >
                    <Copy size={16} weight="bold" />
                    Copiar Link
                </button>
                <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/5 text-[10px] font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all">
                    <ExternalLink size={16} weight="bold" />
                    Ver Original
                </button>
            </div>

            {/* Metadata Fields */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    <FileText size={14} weight="bold" />
                    Metadatos SEO
                </div>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Texto Alternativo (Alt Text)"
                        value={item.alt || ''}
                        onChange={() => { }}
                        placeholder="Descripción para accesibilidad..."
                    />
                    <EvolutionInput
                        label="Título de la imagen"
                        value={item.title || ''}
                        onChange={() => { }}
                        placeholder="Título interno..."
                    />
                </div>
            </div>

            {/* Technical Detail Card */}
            <div className="p-5 rounded-2xl bg-zinc-dark border border-white/5 space-y-4">
                <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-3">
                    <Info size={14} weight="bold" />
                    Detalles del Archivo
                </div>
                <div className="space-y-3">
                    <DetailRow icon={ImageIcon} label="Tipo" value={item.type.split('/')[1].toUpperCase()} />
                    <DetailRow icon={Clock} label="Subido" value="Hace 2 días" />
                    <DetailRow icon={Clock} label="Dueño" value="Alexis Vallejos" />
                </div>
            </div>

            {/* Danger Zone */}
            <div className="pt-4 border-t border-white/5">
                <button className="flex items-center gap-2 text-[11px] font-bold text-rose-500/50 hover:text-rose-500 transition-colors uppercase tracking-widest">
                    <Trash size={14} weight="bold" />
                    Eliminar Permanente
                </button>
            </div>
        </div>
    );
};

const DetailRow = ({ icon: Icon, label, value }) => (
    <div className="flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-2 text-zinc-500">
            <Icon size={14} weight="bold" className="opacity-50" />
            <span>{label}</span>
        </div>
        <span className="font-bold text-zinc-300">{value}</span>
    </div>
);

export default MediaPropertiesEditor;
