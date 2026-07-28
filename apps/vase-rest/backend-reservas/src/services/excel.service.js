import ExcelJS from "exceljs";

const MONEY_FORMAT = '"$"#,##0.00;[Red]-"$"#,##0.00';

/**
 * Evita formulas inyectadas al exportar valores de usuario a Excel.
 */
export function sanitizarTextoExcel(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function asDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function money(value) {
  return Number(Number(value || 0).toFixed(2));
}

function aplicarFormatoBase(worksheet) {
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: worksheet.columns.length },
  };

  const header = worksheet.getRow(1);
  header.font = { bold: true, color: { argb: "FFFFFFFF" } };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF111827" },
  };
  header.alignment = { vertical: "middle" };
}

/**
 * Genera el Excel de facturas fiscales filtradas.
 */
export async function generarExcelFacturas({ facturas, filtros }) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NOCTUA";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Facturas");
  worksheet.columns = [
    { header: "Numero", key: "numero", width: 18 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Fecha emision", key: "fecha", width: 18 },
    { header: "Cliente", key: "cliente", width: 28 },
    { header: "Documento", key: "documento", width: 18 },
    { header: "Condicion fiscal", key: "condicionFiscal", width: 20 },
    { header: "Subtotal", key: "subtotal", width: 14 },
    { header: "Impuestos", key: "impuestos", width: 14 },
    { header: "Descuentos", key: "descuentos", width: 14 },
    { header: "Total", key: "total", width: 14 },
    { header: "Moneda", key: "moneda", width: 10 },
    { header: "Forma de pago", key: "metodoPago", width: 18 },
    { header: "Estado", key: "estado", width: 16 },
    { header: "CAE", key: "cae", width: 18 },
    { header: "Vencimiento CAE", key: "vencimientoCae", width: 18 },
    { header: "Punto de venta", key: "puntoVenta", width: 16 },
    { header: "Fecha de pago", key: "fechaPago", width: 18 },
    { header: "Saldo pendiente", key: "saldoPendiente", width: 18 },
  ];

  for (const factura of facturas) {
    worksheet.addRow({
      numero: sanitizarTextoExcel(factura.numeroComprobante || factura.numero_comprobante),
      tipo: factura.tipoComprobante || factura.tipo_comprobante,
      fecha: asDate(factura.creadoEn || factura.creado_en),
      cliente: sanitizarTextoExcel(factura.cliente?.nombre || factura.clientes?.nombre || ""),
      documento: sanitizarTextoExcel(factura.cliente?.documento || factura.clientes?.documento || ""),
      condicionFiscal: sanitizarTextoExcel(
        factura.cliente?.condicionFiscal || factura.clientes?.condicion_fiscal || ""
      ),
      subtotal: money(factura.subtotal),
      impuestos: money(factura.impuestos),
      descuentos: money(factura.descuento),
      total: money(factura.total),
      moneda: "ARS",
      metodoPago: sanitizarTextoExcel(factura.metodoPago || factura.metodo_pago || ""),
      estado: sanitizarTextoExcel(factura.estado || ""),
      cae: sanitizarTextoExcel(factura.cae || ""),
      vencimientoCae: sanitizarTextoExcel(factura.vencimientoCae || factura.vencimiento_cae || ""),
      puntoVenta: factura.puntoVenta || factura.punto_venta || "",
      fechaPago: asDate(factura.pago?.confirmadoEn || factura.pagos?.confirmado_en),
      saldoPendiente: money(factura.saldoPendiente || factura.saldo_pendiente),
    });
  }

  const totalRow = worksheet.addRow({
    numero: "Totales",
    subtotal: facturas.reduce((acc, factura) => acc + money(factura.subtotal), 0),
    impuestos: facturas.reduce((acc, factura) => acc + money(factura.impuestos), 0),
    descuentos: facturas.reduce((acc, factura) => acc + money(factura.descuento), 0),
    total: facturas.reduce((acc, factura) => acc + money(factura.total), 0),
    saldoPendiente: facturas.reduce(
      (acc, factura) => acc + money(factura.saldoPendiente || factura.saldo_pendiente),
      0
    ),
  });
  totalRow.font = { bold: true };

  aplicarFormatoBase(worksheet);
  for (const key of ["subtotal", "impuestos", "descuentos", "total", "saldoPendiente"]) {
    worksheet.getColumn(key).numFmt = MONEY_FORMAT;
  }
  worksheet.getColumn("fecha").numFmt = "dd/mm/yyyy";
  worksheet.getColumn("fechaPago").numFmt = "dd/mm/yyyy";

  const desde = filtros.desde || "inicio";
  const hasta = filtros.hasta || "hoy";
  const filename = `facturas_${desde}_${hasta}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename };
}

/**
 * Exporta solo movimientos de caja internos no fiscales.
 */
export async function generarExcelMovimientosCaja(movimientos = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NOCTUA";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Movimientos de caja");
  worksheet.columns = [
    { header: "Fecha", key: "fecha", width: 18 },
    { header: "Pedido", key: "pedido", width: 36 },
    { header: "Mesa", key: "mesa", width: 12 },
    { header: "Importe", key: "importe", width: 14 },
    { header: "Motivo", key: "motivo", width: 24 },
    { header: "Observacion", key: "observacion", width: 36 },
    { header: "Usuario", key: "usuario", width: 22 },
    { header: "Tipo", key: "tipo", width: 20 },
    { header: "Metodo", key: "metodo", width: 16 },
  ];

  for (const movimiento of movimientos) {
    worksheet.addRow({
      fecha: asDate(movimiento.creadoEn || movimiento.creado_en),
      pedido: sanitizarTextoExcel(movimiento.pedidoId || movimiento.pedido_id || ""),
      mesa: sanitizarTextoExcel(movimiento.mesa?.numero || movimiento.mesas?.numero || ""),
      importe: money(movimiento.importe),
      motivo: sanitizarTextoExcel(movimiento.motivo || ""),
      observacion: sanitizarTextoExcel(movimiento.observacion || ""),
      usuario: sanitizarTextoExcel(movimiento.creadoPor || movimiento.creado_por || ""),
      tipo: sanitizarTextoExcel(movimiento.tipo || ""),
      metodo: sanitizarTextoExcel(movimiento.metodo || ""),
    });
  }

  const totalRow = worksheet.addRow({
    pedido: "Totales",
    importe: movimientos.reduce((acc, movimiento) => acc + money(movimiento.importe), 0),
  });
  totalRow.font = { bold: true };

  aplicarFormatoBase(worksheet);
  worksheet.getColumn("fecha").numFmt = "dd/mm/yyyy";
  worksheet.getColumn("importe").numFmt = MONEY_FORMAT;

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename: "movimientos_caja_no_fiscal.xlsx" };
}

/**
 * Genera el resumen detallado de cuenta corriente de un cliente.
 */
export async function generarExcelCuentaCorriente(detalle) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "NOCTUA";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("Cuenta corriente");
  worksheet.columns = [
    { header: "Fecha", key: "fecha", width: 18 },
    { header: "Tipo", key: "tipo", width: 12 },
    { header: "Origen", key: "origen", width: 18 },
    { header: "Descripcion", key: "descripcion", width: 36 },
    { header: "Comprobante", key: "comprobante", width: 20 },
    { header: "Debito", key: "debito", width: 14 },
    { header: "Credito", key: "credito", width: 14 },
    { header: "Saldo acumulado", key: "saldo", width: 18 },
    { header: "Usuario", key: "usuario", width: 20 },
  ];

  let saldo = 0;
  for (const movimiento of detalle.movimientos) {
    const importe = money(movimiento.importe);
    saldo += movimiento.tipo === "DEBIT" ? importe : -importe;
    worksheet.addRow({
      fecha: asDate(movimiento.fecha),
      tipo: movimiento.tipo,
      origen: movimiento.origen,
      descripcion: sanitizarTextoExcel(movimiento.descripcion),
      comprobante: sanitizarTextoExcel(movimiento.facturaId || ""),
      debito: movimiento.tipo === "DEBIT" ? importe : 0,
      credito: movimiento.tipo === "CREDIT" ? importe : 0,
      saldo: money(saldo),
      usuario: sanitizarTextoExcel(movimiento.creadoPor || ""),
    });
  }

  aplicarFormatoBase(worksheet);
  for (const key of ["debito", "credito", "saldo"]) {
    worksheet.getColumn(key).numFmt = MONEY_FORMAT;
  }
  worksheet.getColumn("fecha").numFmt = "dd/mm/yyyy";

  const filename = `cuenta_corriente_${detalle.cliente.id}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, filename };
}
