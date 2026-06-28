import fs from 'fs';
import path from 'path';

let pdfDocumentModulePromise = null;
let qrCodeModulePromise = null;

async function loadPdfDocument() {
    if (!pdfDocumentModulePromise) {
        pdfDocumentModulePromise = import('pdfkit')
            .then((module) => module.default || module)
            .catch((error) => {
                pdfDocumentModulePromise = null;
                throw error;
            });
    }

    return pdfDocumentModulePromise;
}

async function loadQrCode() {
    if (!qrCodeModulePromise) {
        qrCodeModulePromise = import('qrcode')
            .then((module) => module.default || module)
            .catch((error) => {
                qrCodeModulePromise = null;
                throw error;
            });
    }

    return qrCodeModulePromise;
}

export async function generateFiscalInvoice(order) {
    return new Promise(async (resolve, reject) => {
        try {
            const PDFDocument = await loadPdfDocument();
            const QRCode = await loadQrCode();
            const doc = new PDFDocument({ margin: 50 });

            // Directorio temporal o uploads
            const outPath = path.join(process.cwd(), 'uploads', `invoice-${order.id}.pdf`);
            const writeStream = fs.createWriteStream(outPath);
            doc.pipe(writeStream);

            // Cabecera
            doc.fontSize(20).text('Factura Fiscal', { align: 'center' });
            doc.moveDown();
            doc.fontSize(12).text(`Nro Orden: ${order.id}`);
            doc.text(`Fecha: ${new Date().toLocaleDateString()}`);
            doc.text(`Cliente ID: ${order.user_id || 'N/A'}`);
            doc.moveDown();

            // Detalles Financieros
            doc.fontSize(14).text('Detalles Financieros', { underline: true });
            doc.moveDown();

            doc.fontSize(12);
            doc.text(`Subtotal: $${Number(order.subtotal).toFixed(2)} ${order.currency}`);
            doc.text(`Costo de Envío: $${Number(order.shipping || 0).toFixed(2)} ${order.currency}`);
            doc.text(`Impuestos Totales: $${Number(order.tax || 0).toFixed(2)} ${order.currency}`);
            doc.moveDown();

            doc.fontSize(16).text(`TOTAL FACTURADO: $${Number(order.total).toFixed(2)} ${order.currency}`, { bold: true });
            doc.moveDown();

            // Avisos Formales
            doc.fontSize(10).fillColor('gray')
               .text('Nota: Los impuestos pueden variar según la jurisdicción/región de la dirección de envío.', { align: 'justify' });
            doc.moveDown();

            // Sello Digital y QR
            const validationUrl = `https://mytienda.com/fiscal/verify?o=${order.id}`;
            const qrCodeDataUrl = await QRCode.toDataURL(validationUrl);
            const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
            const qrBuffer = Buffer.from(base64Data, "base64");

            doc.image(qrBuffer, 50, doc.y, { width: 100 });
            doc.text('Código de validación', 50, doc.y + 110);

            doc.end();

            writeStream.on('finish', () => resolve({ filePath: outPath, url: `/uploads/invoice-${order.id}.pdf` }));
            writeStream.on('error', reject);

        } catch (error) {
            console.error('Error al generar PDF de factura:', error);
            if (
                error?.code === 'ERR_MODULE_NOT_FOUND' ||
                String(error?.message || '').includes('pdfkit') ||
                String(error?.message || '').includes('qrcode')
            ) {
                resolve({
                    error: 'La facturacion PDF no esta disponible porque faltan dependencias del generador de comprobantes.',
                    details: error?.message || error,
                });
                return;
            }

            resolve({ error: 'No se pudo generar la factura fiscal.', details: error });
        }
    });
}
