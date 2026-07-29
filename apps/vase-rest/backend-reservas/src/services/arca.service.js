/**
 * Solicita o simula CAE para facturacion fiscal.
 */
export const solicitarCAE = async (datosFactura) => {
  const numeroComprobanteSimulado = Math.floor(Math.random() * 90000000) + 10000000;

  const caeSimulado = String(Math.floor(Math.random() * 90000000000000) + 10000000000000);

  const fechaVencimiento = new Date();
  fechaVencimiento.setDate(fechaVencimiento.getDate() + 10);

  return {
    exito: true,
    resultado: "A",
    cae: caeSimulado,
    vencimientoCAE: fechaVencimiento.toISOString().slice(0, 10).replaceAll("-", ""),
    numeroComprobante: numeroComprobanteSimulado,
    observaciones: "CAE simulado para ambiente de desarrollo",
    datosEnviados: datosFactura
  };
};