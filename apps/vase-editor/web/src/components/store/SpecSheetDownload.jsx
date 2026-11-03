import React from 'react';
import { Download, FileText } from 'lucide-react';
import { formatFileSize } from '../../utils/specSheet';

// Botón para descargar la ficha técnica del producto. compact: una línea, para debajo de la descripción.
export default function SpecSheetDownload({ sheet, compact = false }) {
    if (!sheet?.url) return null;
    const size = formatFileSize(sheet.size);
    if (compact) {
        return (
            <a href={sheet.url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline">
                <FileText className="size-4" />
                Descargar ficha técnica (PDF{size ? ` · ${size}` : ''})
            </a>
        );
    }
    return (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[#e5e1de] bg-[#faf8f6] px-4 py-3 dark:border-[#3d2f21] dark:bg-[#120d08]">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-[11px] font-black text-primary">PDF</span>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[#181411] dark:text-white">{sheet.name}</p>
                <p className="text-xs text-[#8a7560]">Ficha técnica{size ? ` · ${size}` : ''}</p>
            </div>
            <a href={sheet.url} target="_blank" rel="noopener noreferrer" download className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">
                <Download className="size-4" />
                Descargar
            </a>
        </div>
    );
}
