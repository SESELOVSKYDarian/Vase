import React from 'react';
import EvolutionInput from './EvolutionInput';
import { cn } from '../../../utils/cn';
import {
    Tag,
    CurrencyDollar as DollarSign,
    Package as Box,
    Image as ImageIcon,
    Archive,
    Trash,
    Eye,
    EyeSlash as EyeOff,
    Plus
} from '@phosphor-icons/react';

const ProductPropertiesEditor = ({ product, onChange }) => {
    if (!product) return null;

    const handlePropChange = (key, value) => {
        onChange({
            ...product,
            [key]: value
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Status & Visibility */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-2">
                    {product.active ? <Eye size={16} weight="bold" className="text-emerald-500" /> : <EyeOff size={16} weight="bold" className="text-zinc-500" />}
                    <span className="text-xs font-medium text-white">Producto Visible</span>
                </div>
                <button
                    onClick={() => handlePropChange('active', !product.active)}
                    className={cn(
                        "w-10 h-5 rounded-full transition-all relative",
                        product.active ? "bg-evolution-indigo" : "bg-zinc-700"
                    )}
                >
                    <div className={cn(
                        "absolute top-1 w-3 h-3 rounded-full bg-white transition-all",
                        product.active ? "left-6" : "left-1"
                    )} />
                </button>
            </div>

            {/* Basic Info */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Tag size={14} weight="bold" />
                    Información General
                </div>
                <div className="space-y-4">
                    <EvolutionInput
                        label="Nombre del Producto"
                        value={product.name || ''}
                        onChange={(e) => handlePropChange('name', e.target.value)}
                    />
                    <EvolutionInput
                        label="Descripción"
                        value={product.description || ''}
                        onChange={(e) => handlePropChange('description', e.target.value)}
                        multiline
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <EvolutionInput
                            label="SKU"
                            value={product.sku || ''}
                            onChange={(e) => handlePropChange('sku', e.target.value)}
                        />
                        <EvolutionInput
                            label="Código de Barras"
                            value={product.barcode || ''}
                            onChange={(e) => handlePropChange('barcode', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Pricing & Stock */}
            <div className="p-6 rounded-2xl bg-zinc-dark border border-white/5 space-y-6">
                <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest border-b border-white/5 pb-4">
                    <DollarSign size={14} weight="bold" />
                    Precios y Inventario
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-600 uppercase font-bold pl-1">Precio Unitario</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 font-bold">$</span>
                            <input
                                type="number"
                                value={product.price || 0}
                                onChange={(e) => handlePropChange('price', parseFloat(e.target.value))}
                                className="w-full bg-white/5 border border-white/5 rounded-lg h-10 text-xs text-white pl-7 pr-3 outline-none focus:ring-1 focus:ring-evolution-indigo/50 transition-all font-mono"
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] text-zinc-600 uppercase font-bold pl-1">Stock Actual</label>
                        <div className="relative">
                            <Box size={14} weight="bold" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input
                                type="number"
                                value={product.stock || 0}
                                onChange={(e) => handlePropChange('stock', parseInt(e.target.value))}
                                className="w-full bg-white/5 border border-white/5 rounded-lg h-10 text-xs text-white pl-9 pr-3 outline-none focus:ring-1 focus:ring-evolution-indigo/50 transition-all font-mono"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Media Gallery */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
                        <ImageIcon size={14} weight="bold" />
                        Media (Galería)
                    </div>
                    <button className="text-[10px] font-bold text-evolution-indigo hover:underline uppercase tracking-tight">Gestionar</button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="aspect-square rounded-xl bg-white/5 border border-dashed border-white/10 flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors">
                        <Plus size={16} weight="bold" className="text-zinc-600" />
                    </div>
                    {product.images?.slice(0, 2).map((img, i) => (
                        <div key={i} className="aspect-square rounded-xl bg-white/5 border border-white/5 overflow-hidden group relative">
                            <img src={img.url} className="w-full h-full object-cover opacity-60" />
                            <div className="absolute inset-0 bg-zinc-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Trash size={14} weight="bold" className="text-rose-500 cursor-pointer" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dangerous Zone */}
            <div className="pt-4 border-t border-white/5">
                <button className="flex items-center gap-2 text-[11px] font-bold text-rose-500/50 hover:text-rose-500 transition-colors uppercase tracking-widest">
                    <Archive size={14} weight="bold" />
                    Archivar Producto
                </button>
            </div>
        </div>
    );
};

export default ProductPropertiesEditor;
