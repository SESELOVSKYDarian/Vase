'use client';

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import type { DashboardData, DateRange } from '@/types/analytics';
import { exportDashboardCSV, exportDashboardPDF } from '@/utils/exportDashboard';

interface ExportButtonProps {
  data: DashboardData | null;
  dateRange: DateRange;
  targetRef: React.RefObject<HTMLElement | null>;
}

export function ExportButton({ data, dateRange, targetRef }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const disabled = !data || exporting;

  const handleCSV = () => {
    if (!data) return;
    exportDashboardCSV(data, dateRange);
    setOpen(false);
  };

  const handlePDF = async () => {
    if (!targetRef.current) return;
    setExporting(true);
    setOpen(false);

    try {
      await exportDashboardPDF(targetRef.current, dateRange);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="relative" data-export-hidden="true">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#D9D9D9] disabled:cursor-not-allowed disabled:opacity-40"
      >
        {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
        Exportar
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-48 overflow-hidden rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] shadow-2xl">
          <button type="button" onClick={handleCSV} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#BCB9B9] hover:bg-white/5 hover:text-white">
            <FileSpreadsheet size={15} />
            Exportar CSV
          </button>
          <button type="button" onClick={handlePDF} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-[#BCB9B9] hover:bg-white/5 hover:text-white">
            <FileText size={15} />
            Exportar PDF
          </button>
        </div>
      )}
    </div>
  );
}
