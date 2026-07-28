import type { DashboardData, DateRange } from '@/types/analytics';
import { formatCurrency, formatRangeForFile, normalizePaymentMethod } from '@/utils/formatters';

function csvCell(value: string | number): string {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function downloadBlob(content: BlobPart, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function filename(range: DateRange, extension: 'csv' | 'pdf'): string {
  return `noctua-analytics-${formatRangeForFile(range.from)}-${formatRangeForFile(range.to)}.${extension}`;
}

export function exportDashboardCSV(data: DashboardData, range: DateRange) {
  const lines: string[] = [];

  lines.push('KPIs');
  lines.push(['Métrica', 'Valor'].map(csvCell).join(','));
  lines.push(['Ingresos totales', formatCurrency(data.kpis.totalRevenue)].map(csvCell).join(','));
  lines.push(['Pedidos completados', data.kpis.totalOrders].map(csvCell).join(','));
  lines.push(['Ticket promedio', formatCurrency(data.kpis.averageTicket)].map(csvCell).join(','));
  lines.push(['Descuentos totales', formatCurrency(data.kpis.totalDiscounts)].map(csvCell).join(','));
  lines.push(['Reservas', data.kpis.totalReservations].map(csvCell).join(','));
  lines.push('');

  lines.push('Ingresos en el tiempo');
  lines.push(['Fecha', 'Ingresos', 'Pedidos'].map(csvCell).join(','));
  data.revenueOverTime.forEach((item) => {
    lines.push([item.date, formatCurrency(item.revenue), item.orders].map(csvCell).join(','));
  });
  lines.push('');

  lines.push('Productos más vendidos');
  lines.push(['Producto', 'Categoría', 'Unidades', 'Ingresos'].map(csvCell).join(','));
  data.topProducts.top.forEach((item) => {
    lines.push([item.nombre, item.categoria, item.totalUnits, formatCurrency(item.totalRevenue)].map(csvCell).join(','));
  });
  lines.push('');

  lines.push('Productos menos vendidos');
  lines.push(['Producto', 'Categoría', 'Unidades', 'Ingresos'].map(csvCell).join(','));
  data.topProducts.bottom.forEach((item) => {
    lines.push([item.nombre, item.categoria, item.totalUnits, formatCurrency(item.totalRevenue)].map(csvCell).join(','));
  });
  lines.push('');

  lines.push('Métodos de pago');
  lines.push(['Método', 'Total', 'Cantidad', 'Porcentaje'].map(csvCell).join(','));
  data.paymentMethods.forEach((item) => {
    lines.push([normalizePaymentMethod(item.method), formatCurrency(item.total), item.count, `${item.percentage.toFixed(1)}%`].map(csvCell).join(','));
  });
  lines.push('');

  lines.push('Reservas');
  lines.push(['Total', 'Confirmadas', 'Canceladas', 'Comensales', 'Tasa de cancelación'].map(csvCell).join(','));
  lines.push([
    data.reservationStats.total,
    data.reservationStats.confirmed,
    data.reservationStats.cancelled,
    data.reservationStats.totalGuests,
    `${data.reservationStats.cancelRate.toFixed(1)}%`,
  ].map(csvCell).join(','));

  downloadBlob(lines.join('\n'), 'text/csv;charset=utf-8', filename(range, 'csv'));
}

export async function exportDashboardPDF(element: HTMLElement, range: DateRange) {
  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const hiddenElements = element.querySelectorAll<HTMLElement>('[data-export-hidden="true"]');
  hiddenElements.forEach((item) => {
    item.style.visibility = 'hidden';
  });

  try {
    const canvas = await html2canvas(element, {
      backgroundColor: '#050505',
      scale: 2,
      useCORS: true,
    });
    const pdf = new JsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 10;
    const headerHeight = 18;
    const footerHeight = 10;
    const imageWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * imageWidth) / canvas.width;
    let heightLeft = imageHeight;
    let position = margin + headerHeight;
    let page = 1;

    const imageData = canvas.toDataURL('image/png');

    while (heightLeft > 0) {
      if (page > 1) pdf.addPage();
      pdf.setFillColor(5, 5, 5);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.text('NOCTUA - Dashboard analítico', margin, 12);
      pdf.setFontSize(9);
      pdf.setTextColor(180, 180, 180);
      pdf.text(`Rango: ${formatRangeForFile(range.from)} al ${formatRangeForFile(range.to)}`, margin, 17);
      pdf.addImage(imageData, 'PNG', margin, position, imageWidth, imageHeight);
      pdf.setFontSize(8);
      pdf.text(`Página ${page}`, pageWidth - margin - 18, pageHeight - 6);

      heightLeft -= pageHeight - headerHeight - footerHeight;
      position -= pageHeight - headerHeight - footerHeight;
      page += 1;
    }

    pdf.save(filename(range, 'pdf'));
  } finally {
    hiddenElements.forEach((item) => {
      item.style.visibility = '';
    });
  }
}
