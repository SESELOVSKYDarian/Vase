// services/pdf.service.ts
// Servicio de generación de PDF para comprobantes
// Usa jsPDF + jsPDF-autotable (cliente) o puede adaptarse a servidor con Puppeteer

export interface InvoicePDFData {
  company: {
    name: string
    legalName: string
    cuit: string
    address?: string
    city?: string
    ivaCondition: string
  }
  invoice: {
    letter: string
    pointOfSaleNum: number
    number: number
    date: string
    dueDate?: string
    cae?: string
    caeDueDate?: string
    qrCode?: string
  }
  customer?: {
    name: string
    documentNumber: string
    address?: string
    ivaCondition: string
  }
  items: {
    description: string
    quantity: number
    unitPrice: number
    ivaRate: number
    subtotal: number
    ivaAmount: number
    total: number
  }[]
  totals: {
    subtotal: number
    ivaAmount: number
    total: number
  }
}

/**
 * Genera HTML para previsualización/impresión del comprobante.
 * Para PDF real usar jsPDF en el cliente o Puppeteer en servidor.
 */
export function generateInvoiceHTML(data: InvoicePDFData): string {
  const { company, invoice, customer, items, totals } = data

  const formatN = (n: number) =>
    new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2 }).format(n)
  const formatC = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(n)

  const itemsHTML = items.map((item, i) => `
    <tr style="border-bottom: 1px solid #f0f0f0;">
      <td style="padding: 8px 12px;">${item.description}</td>
      <td style="padding: 8px 12px; text-align: center;">${formatN(item.quantity)}</td>
      <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${formatC(item.unitPrice)}</td>
      <td style="padding: 8px 12px; text-align: center;">${item.ivaRate}%</td>
      <td style="padding: 8px 12px; text-align: right; font-family: monospace;">${formatC(item.total)}</td>
    </tr>
  `).join('')

  return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Factura ${invoice.letter} ${String(invoice.pointOfSaleNum).padStart(4,'0')}-${String(invoice.number).padStart(8,'0')}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 12px; color: #333; background: white; }
        .page { max-width: 800px; margin: 0 auto; padding: 30px; }
        .header { display: flex; justify-content: space-between; margin-bottom: 24px; border-bottom: 2px solid #1d4ed8; padding-bottom: 20px; }
        .company-name { font-size: 20px; font-weight: bold; color: #1d4ed8; }
        .invoice-type { width: 80px; height: 80px; border: 2px solid #1d4ed8; display: flex; align-items: center; justify-content: center; font-size: 40px; font-weight: bold; color: #1d4ed8; border-radius: 8px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px; }
        .info-box { background: #f8f9fa; padding: 14px; border-radius: 6px; border: 1px solid #e5e7eb; }
        .info-box h4 { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 8px; }
        .info-box p { margin-bottom: 4px; }
        table.items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        table.items thead th { background: #1d4ed8; color: white; padding: 10px 12px; text-align: left; font-size: 11px; }
        table.items thead th:nth-child(2), table.items thead th:nth-child(3), table.items thead th:nth-child(4), table.items thead th:nth-child(5) { text-align: center; }
        table.items thead th:last-child { text-align: right; }
        .totals { display: flex; justify-content: flex-end; margin-bottom: 24px; }
        .totals-box { width: 260px; background: #f8f9fa; border-radius: 6px; padding: 14px; border: 1px solid #e5e7eb; }
        .totals-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
        .totals-row.total { border-top: 2px solid #1d4ed8; margin-top: 8px; padding-top: 8px; font-size: 15px; font-weight: bold; color: #1d4ed8; }
        .cae-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 12px; font-size: 11px; }
        .cae-box strong { color: #15803d; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 16px; }
        @media print { .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="header">
          <div>
            <p class="company-name">${company.name}</p>
            <p style="color: #6b7280; margin-top: 4px;">${company.legalName}</p>
            <p style="margin-top: 8px;"><strong>CUIT:</strong> ${company.cuit}</p>
            <p><strong>IVA:</strong> ${company.ivaCondition.replace(/_/g, ' ')}</p>
            ${company.address ? `<p>${company.address}${company.city ? ', ' + company.city : ''}</p>` : ''}
          </div>
          <div style="text-align: right;">
            <div class="invoice-type">${invoice.letter}</div>
            <p style="margin-top: 8px; font-weight: bold; font-size: 14px;">
              ${String(invoice.pointOfSaleNum).padStart(4,'0')}-${String(invoice.number).padStart(8,'0')}
            </p>
            <p style="color: #6b7280;">Fecha: ${invoice.date}</p>
            ${invoice.dueDate ? `<p style="color: #6b7280;">Vto.: ${invoice.dueDate}</p>` : ''}
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Datos del receptor</h4>
            <p><strong>${customer?.name ?? 'Consumidor Final'}</strong></p>
            ${customer?.documentNumber ? `<p>CUIT/DNI: ${customer.documentNumber}</p>` : ''}
            ${customer?.ivaCondition ? `<p>IVA: ${customer.ivaCondition.replace(/_/g, ' ')}</p>` : ''}
            ${customer?.address ? `<p>${customer.address}</p>` : ''}
          </div>
          <div class="info-box">
            <h4>Comprobante</h4>
            <p><strong>Tipo:</strong> Factura ${invoice.letter}</p>
            <p><strong>Número:</strong> ${String(invoice.pointOfSaleNum).padStart(4,'0')}-${String(invoice.number).padStart(8,'0')}</p>
            <p><strong>Fecha:</strong> ${invoice.date}</p>
            ${invoice.cae ? `<p><strong>CAE:</strong> <span style="font-family: monospace;">${invoice.cae}</span></p>` : ''}
            ${invoice.caeDueDate ? `<p><strong>Vto. CAE:</strong> ${invoice.caeDueDate}</p>` : ''}
          </div>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>Descripción</th>
              <th>Cantidad</th>
              <th>Precio unit.</th>
              <th>IVA %</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>${itemsHTML}</tbody>
        </table>

        <div class="totals">
          <div class="totals-box">
            <div class="totals-row"><span>Neto gravado</span><span>${formatC(totals.subtotal)}</span></div>
            <div class="totals-row"><span>IVA</span><span>${formatC(totals.ivaAmount)}</span></div>
            <div class="totals-row total"><span>TOTAL</span><span>${formatC(totals.total)}</span></div>
          </div>
        </div>

        ${invoice.cae ? `
        <div class="cae-box">
          <strong>✅ Comprobante autorizado por ARCA</strong><br>
          CAE N°: <span style="font-family: monospace;">${invoice.cae}</span>
          ${invoice.caeDueDate ? ` — Vto: ${invoice.caeDueDate}` : ''}
        </div>
        ` : ''}

        <div class="footer">
          <p>Comprobante generado por Vase Business — ERP SaaS Argentino</p>
          <p style="margin-top: 4px;">Este comprobante es válido como documento fiscal electrónico.</p>
        </div>
      </div>
    </body>
    </html>
  `
}
