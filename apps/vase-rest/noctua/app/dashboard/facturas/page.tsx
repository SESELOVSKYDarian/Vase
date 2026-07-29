'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCcw,
  ShieldCheck,
  Users,
} from 'lucide-react';

import {
  EstadoArca,
  type ArcaEstado,
} from '@/components/facturas/EstadoArca';
import { FormularioCobro } from '@/components/facturas/FormularioCobro';
import { PedidoSelector } from '@/components/facturas/PedidoSelector';
import { TablaFacturas } from '@/components/facturas/TablaFacturas';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/hooks/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  ADVERTENCIA_PAGO_INTERNO_NO_FISCAL,
  MOTIVOS_PAGO_INTERNO_NO_FISCAL,
  RESULTADO_PAGO_INTERNO_NO_FISCAL,
  formatearARS,
} from '@/components/facturas/facturasConstants';

import {
  facturasService,
  type ClienteFacturaInput,
  type Factura,
  type FacturasFiltros,
  type MetodoPagoFactura,
  type MotivoPagoInternoNoFiscal,
  type MovimientoCajaNoFiscal,
  type Pago,
  type PedidoListoFactura,
  type TipoComprobante,
} from '@/services/facturasService';

type MensajeUI =
  | {
      tipo: 'success' | 'warning' | 'error';
      titulo: string;
      detalle?: string;
    }
  | null;

type CargarDatosOptions = {
  mostrarError?: boolean;
  seleccionarSiguiente?: boolean;
};

/**
 * Genera una clave única para evitar operaciones duplicadas,
 * especialmente en pagos de cuenta corriente.
 */
function createIdempotencyKey() {
  if (
    typeof crypto !== 'undefined' &&
    'randomUUID' in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

/**
 * Descarga un archivo recibido como Blob.
 */
function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;

  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
}

function formatearFechaMovimiento(value?: string) {
  if (!value) return '-';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function obtenerMotivoPagoInternoLabel(value?: string) {
  return (
    MOTIVOS_PAGO_INTERNO_NO_FISCAL.find(
      (motivo) => motivo.value === value
    )?.label ||
    value ||
    '-'
  );
}

export default function FacturasPage() {
  const [pedidos, setPedidos] = useState<
    PedidoListoFactura[]
  >([]);

  const [facturas, setFacturas] = useState<Factura[]>([]);

  const [movimientosCaja, setMovimientosCaja] = useState<
    MovimientoCajaNoFiscal[]
  >([]);

  const [
    pedidoSeleccionadoId,
    setPedidoSeleccionadoId,
  ] = useState('');

  const [arca, setArca] = useState<ArcaEstado>(null);
  const [mensaje, setMensaje] = useState<MensajeUI>(null);

  const [loading, setLoading] = useState(false);

  const [verificandoArca, setVerificandoArca] =
    useState(false);

  const [cobrando, setCobrando] = useState(false);
  const cobrandoRef = useRef(false);
  const [exportando, setExportando] = useState(false);
  const [exportandoMovimientos, setExportandoMovimientos] =
    useState(false);

  const exportandoRef = useRef(false);
  const exportandoMovimientosRef = useRef(false);

  const [metodoPago, setMetodoPago] =
    useState<MetodoPagoFactura>('efectivo');

  const [tipoComprobante, setTipoComprobante] =
    useState<TipoComprobante>(6);

  const [marcaTarjeta, setMarcaTarjeta] =
    useState('Visa');

  const [bancoTarjeta, setBancoTarjeta] =
    useState('');

  const [
    proveedorBilletera,
    setProveedorBilletera,
  ] = useState('Mercado Pago');

  const [referenciaPago, setReferenciaPago] =
    useState('');

  const [recibidoPor, setRecibidoPor] =
    useState('admin');

  const [montoRecibido, setMontoRecibido] =
    useState<number>(0);

  const [pagoPendiente, setPagoPendiente] =
    useState<Pago | null>(null);

  const [clienteCuenta, setClienteCuenta] =
    useState<ClienteFacturaInput>({});

  const [pagoInternoSeleccionado, setPagoInternoSeleccionado] =
    useState(false);

  const [motivoPagoInterno, setMotivoPagoInterno] =
    useState<MotivoPagoInternoNoFiscal>('prueba_interna');

  const [observacionPagoInterno, setObservacionPagoInterno] =
    useState('');

  const [confirmandoPagoInterno, setConfirmandoPagoInterno] =
    useState(false);

  const [filtros, setFiltros] =
    useState<FacturasFiltros>({});

  const usuario = useAuthStore((state) => state.usuario);
  const puedeRegistrarPagoInterno = usuario?.rol === 'admin';

  /**
   * Busca el pedido seleccionado dentro de la lista actual.
   */
  const pedidoSeleccionado = useMemo(() => {
    return (
      pedidos.find(
        (pedido) =>
          pedido.id === pedidoSeleccionadoId
      ) || null
    );
  }, [pedidos, pedidoSeleccionadoId]);

  /**
   * Calcula el vuelto solamente cuando el monto recibido
   * supera el total del pedido.
   */
  const vuelto = useMemo(() => {
    if (!pedidoSeleccionado) return 0;

    const calculado =
      Number(montoRecibido || 0) -
      Number(pedidoSeleccionado.total || 0);

    return calculado > 0 ? calculado : 0;
  }, [montoRecibido, pedidoSeleccionado]);

  /**
   * Muestra mensajes personalizados dentro de la interfaz.
   */
  const mostrarMensaje = useCallback(
    (nuevoMensaje: MensajeUI) => {
      setMensaje(nuevoMensaje);
    },
    []
  );

  /**
   * Carga los pedidos disponibles y las facturas emitidas.
   *
   * Si el pedido actualmente seleccionado ya no existe,
   * puede seleccionar el siguiente disponible.
   */
  const cargarDatos = useCallback(async (options: CargarDatosOptions = {}) => {
    const mostrarError = options.mostrarError ?? true;
    const seleccionarSiguiente = options.seleccionarSiguiente ?? true;

    try {
      setLoading(true);

      const [
        pedidosListos,
        facturasEmitidas,
        movimientosInternos,
      ] = await Promise.all([
        facturasService.obtenerPedidosListos(),
        facturasService.obtenerFacturas(filtros),
        puedeRegistrarPagoInterno
          ? facturasService.obtenerMovimientosCaja({
              desde: filtros.desde,
              hasta: filtros.hasta,
              tipo: 'ingreso_no_fiscal',
            }).catch(() => [])
          : Promise.resolve([]),
      ]);

      const pedidosDisponibles = Array.isArray(
        pedidosListos
      )
        ? pedidosListos
        : [];

      const facturasDisponibles = Array.isArray(
        facturasEmitidas
      )
        ? facturasEmitidas
        : [];

      const movimientosDisponibles = Array.isArray(
        movimientosInternos
      )
        ? movimientosInternos
        : [];

      setPedidos(pedidosDisponibles);
      setFacturas(facturasDisponibles);
      setMovimientosCaja(movimientosDisponibles);

      const pedidoActualSigueDisponible =
        pedidosDisponibles.some(
          (pedido) =>
            pedido.id === pedidoSeleccionadoId
        );

      if (!pedidoActualSigueDisponible) {
        const siguientePedido = seleccionarSiguiente
          ? pedidosDisponibles[0] ?? null
          : null;

        setPedidoSeleccionadoId(
          siguientePedido?.id ?? ''
        );

        setMontoRecibido(
          Number(siguientePedido?.total ?? 0)
        );

        setPagoPendiente(null);
      }
    } catch (error) {
      if (mostrarError) {
        mostrarMensaje({
          tipo: 'error',
          titulo: 'Error al cargar facturas',
          detalle:
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los datos.',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [
    filtros,
    mostrarMensaje,
    pedidoSeleccionadoId,
    puedeRegistrarPagoInterno,
  ]);

  /**
   * Comprueba la disponibilidad del servicio de ARCA.
   */
  const verificarARCA = useCallback(async () => {
    try {
      setVerificandoArca(true);

      const response =
        await facturasService.verificarARCA();

      setArca(response.arca);

      mostrarMensaje({
        tipo: 'success',
        titulo: 'ARCA verificado',
        detalle: response.arca.mensaje,
      });
    } catch (error) {
      const detalle =
        error instanceof Error
          ? error.message
          : 'No se pudo verificar ARCA';

      setArca({
        ok: false,
        mensaje: detalle,
      });

      mostrarMensaje({
        tipo: 'error',
        titulo: 'Error ARCA',
        detalle,
      });
    } finally {
      setVerificandoArca(false);
    }
  }, [mostrarMensaje]);

  /**
   * Limpia todos los campos del formulario de cobro.
   */
  const limpiarFormulario = useCallback(() => {
    setPedidoSeleccionadoId('');
    setMetodoPago('efectivo');
    setTipoComprobante(6);
    setMarcaTarjeta('Visa');
    setBancoTarjeta('');
    setProveedorBilletera('Mercado Pago');
    setReferenciaPago('');
    setRecibidoPor('admin');
    setMontoRecibido(0);
    setPagoPendiente(null);
    setClienteCuenta({});
    setPagoInternoSeleccionado(false);
    setMotivoPagoInterno('prueba_interna');
    setObservacionPagoInterno('');
    setConfirmandoPagoInterno(false);
  }, []);

  /**
   * Selecciona un pedido y actualiza el monto recibido.
   */
  const seleccionarPedido = useCallback(
    (pedidoId: string) => {
      const nuevoPedido = pedidos.find(
        (pedido) => pedido.id === pedidoId
      );

      setPedidoSeleccionadoId(pedidoId);

      setMontoRecibido(
        Number(nuevoPedido?.total || 0)
      );

      setPagoPendiente(null);
    },
    [pedidos]
  );

  /**
   * Registra el pago y emite la factura.
   *
   * Para efectivo se crea primero un pago temporal.
   * Para los demás métodos, el pedido se elimina
   * inmediatamente de las opciones de cobro.
   */
  const cobrarPedido = useCallback(async () => {
    if (cobrandoRef.current) return;

    mostrarMensaje(null);

    if (!pedidoSeleccionado) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Selecciona un pedido',
        detalle: 'No hay pedido seleccionado.',
      });

      return;
    }

    if (!arca?.ok) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Verifica ARCA',
        detalle:
          'Antes de cobrar tenes que verificar ARCA.',
      });

      return;
    }

    if (
      (metodoPago === 'debito' ||
        metodoPago === 'credito') &&
      !bancoTarjeta.trim()
    ) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Falta banco',
        detalle:
          'Indica el banco de la tarjeta.',
      });

      return;
    }

    if (
      metodoPago === 'billetera_virtual' &&
      !proveedorBilletera.trim()
    ) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Falta billetera',
        detalle:
          'Indica la billetera virtual utilizada.',
      });

      return;
    }

    if (
      metodoPago === 'efectivo' &&
      Number(montoRecibido || 0) <
        Number(pedidoSeleccionado.total || 0)
    ) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Monto insuficiente',
        detalle:
          'El monto recibido no puede ser menor al total del pedido.',
      });

      return;
    }

    if (
      metodoPago === 'cuenta_corriente' &&
      !clienteCuenta.nombre?.trim()
    ) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Falta cliente',
        detalle:
          'La cuenta corriente necesita un cliente.',
      });

      return;
    }

    /*
     * Guardamos el ID antes de limpiar el formulario.
     * Este valor será utilizado para retirar el pedido
     * de la lista una vez completado el cobro.
     */
    const pedidoCobradoId =
      pedidoSeleccionado.id;

    cobrandoRef.current = true;

    try {
      setCobrando(true);

      const response =
        await facturasService.cobrarPedido({
          pedidoId: pedidoCobradoId,
          metodoPago,
          tipoComprobante,

          tipoTarjeta:
            metodoPago === 'debito' ||
            metodoPago === 'credito'
              ? metodoPago
              : undefined,

          marcaTarjeta:
            metodoPago === 'debito' ||
            metodoPago === 'credito'
              ? marcaTarjeta
              : undefined,

          bancoTarjeta:
            metodoPago === 'debito' ||
            metodoPago === 'credito'
              ? bancoTarjeta
              : undefined,

          proveedorBilletera:
            metodoPago === 'billetera_virtual'
              ? proveedorBilletera
              : undefined,

          referenciaPago,
          recibidoPor,
          montoRecibido,
          vuelto,

          cliente:
            metodoPago === 'cuenta_corriente'
              ? clienteCuenta
              : undefined,

          idempotencyKey:
            metodoPago === 'cuenta_corriente'
              ? createIdempotencyKey()
              : undefined,
        });

      /*
       * El pago en efectivo todavía no cierra el pedido.
       * Primero debe ser confirmado por el usuario.
       */
      if (response.requiereConfirmacion) {
        setPagoPendiente(response.pago);

        mostrarMensaje({
          tipo: 'warning',
          titulo: 'Efectivo pendiente',
          detalle:
            'El pago quedó guardado temporalmente. Confirmalo para cerrar la mesa.',
        });

        return;
      }

      /*
       * Para tarjeta, billetera y cuenta corriente,
       * quitamos inmediatamente el pedido de la lista.
       */
      setPedidos((actuales) =>
        actuales.filter(
          (pedido) =>
            pedido.id !== pedidoCobradoId
        )
      );

      mostrarMensaje({
        tipo: 'success',

        titulo:
          metodoPago === 'cuenta_corriente'
            ? 'Débito registrado'
            : 'Factura emitida',

        detalle:
          metodoPago === 'cuenta_corriente'
            ? 'La factura quedó vinculada a la cuenta corriente y el pedido fue cerrado.'
            : 'El pedido fue cerrado y la mesa quedó libre.',
      });

      limpiarFormulario();

      /*
       * Consultamos nuevamente el backend para confirmar
       * que el pedido realmente dejó de estar disponible.
       */
      await cargarDatos({ mostrarError: false, seleccionarSiguiente: false });
    } catch (error) {
      /*
       * Puede ocurrir que la factura se haya registrado
       * correctamente, pero la respuesta HTTP haya fallado.
       *
       * Antes de mostrar un error, comprobamos si la
       * factura ya existe.
       */
      try {
        const facturasActualizadas =
          await facturasService.obtenerFacturas(
            filtros
          );

        const facturaCreada =
          facturasActualizadas.find(
            (factura) =>
              factura.pedidoId ===
              pedidoCobradoId
          );

        if (facturaCreada) {
          setPedidos((actuales) =>
            actuales.filter(
              (pedido) =>
                pedido.id !== pedidoCobradoId
            )
          );

          mostrarMensaje({
            tipo: 'success',
            titulo: 'Factura emitida',
            detalle:
              'La factura fue registrada. El listado de pedidos fue actualizado.',
          });

          limpiarFormulario();
          await cargarDatos({ mostrarError: false, seleccionarSiguiente: false });

          return;
        }
      } catch {
        /*
         * Si la comprobación también falla,
         * mostramos el error original.
         */
      }

      mostrarMensaje({
        tipo: 'error',
        titulo: 'Error al cobrar',
        detalle:
          error instanceof Error
            ? error.message
            : 'No se pudo cobrar el pedido',
      });
    } finally {
      cobrandoRef.current = false;
      setCobrando(false);
    }
  }, [
    arca,
    bancoTarjeta,
    cargarDatos,
    clienteCuenta,
    cobrandoRef,
    filtros,
    limpiarFormulario,
    marcaTarjeta,
    metodoPago,
    montoRecibido,
    pedidoSeleccionado,
    proveedorBilletera,
    recibidoPor,
    referenciaPago,
    tipoComprobante,
    vuelto,
    mostrarMensaje,
  ]);

  /**
   * Abre la confirmacion personalizada del pago interno no fiscal.
   */
  const solicitarPagoInterno = useCallback(() => {
    if (cobrandoRef.current) return;

    mostrarMensaje(null);

    if (!puedeRegistrarPagoInterno) {
      mostrarMensaje({
        tipo: 'error',
        titulo: 'Sin permiso',
        detalle:
          'Solo administradores pueden registrar Pago interno no fiscal.',
      });

      return;
    }

    if (!pedidoSeleccionado) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Selecciona un pedido',
        detalle: 'No hay pedido seleccionado.',
      });

      return;
    }

    if (!recibidoPor.trim()) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Falta responsable',
        detalle: 'Indica quien recibe el movimiento interno.',
      });

      return;
    }

    if (
      Number(montoRecibido || 0) <
      Number(pedidoSeleccionado.total || 0)
    ) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Monto insuficiente',
        detalle:
          'El monto recibido no puede ser menor al total del pedido.',
      });

      return;
    }

    if (
      motivoPagoInterno === 'otro' &&
      !observacionPagoInterno.trim()
    ) {
      mostrarMensaje({
        tipo: 'warning',
        titulo: 'Falta observacion',
        detalle:
          'Cuando el motivo es otro, la observacion es obligatoria.',
      });

      return;
    }

    setConfirmandoPagoInterno(true);
  }, [
    cobrandoRef,
    montoRecibido,
    motivoPagoInterno,
    mostrarMensaje,
    observacionPagoInterno,
    pedidoSeleccionado,
    puedeRegistrarPagoInterno,
    recibidoPor,
  ]);

  /**
   * Registra el movimiento interno sin validar ARCA ni emitir factura.
   */
  const registrarPagoInterno = useCallback(async () => {
    if (cobrandoRef.current) return;
    if (!pedidoSeleccionado || !puedeRegistrarPagoInterno) return;

    mostrarMensaje(null);

    const pedidoCobradoId = pedidoSeleccionado.id;

    cobrandoRef.current = true;

    try {
      setCobrando(true);

      await facturasService.registrarPagoInternoNoFiscal({
        pedidoId: pedidoCobradoId,
        motivo: motivoPagoInterno,
        observacion: observacionPagoInterno,
        recibidoPor,
        montoRecibido,
      });

      setPedidos((actuales) =>
        actuales.filter(
          (pedido) => pedido.id !== pedidoCobradoId
        )
      );

      mostrarMensaje({
        tipo: 'success',
        titulo: 'Movimiento interno registrado',
        detalle: RESULTADO_PAGO_INTERNO_NO_FISCAL,
      });

      limpiarFormulario();
      await cargarDatos({ mostrarError: false, seleccionarSiguiente: false });
    } catch (error) {
      try {
        const pedidosActualizados = await facturasService.obtenerPedidosListos();
        const pedidoSigueDisponible = pedidosActualizados.some(
          (pedido) => pedido.id === pedidoCobradoId
        );

        if (!pedidoSigueDisponible) {
          setPedidos(pedidosActualizados);
          limpiarFormulario();

          mostrarMensaje({
            tipo: 'success',
            titulo: 'Movimiento interno registrado',
            detalle: RESULTADO_PAGO_INTERNO_NO_FISCAL,
          });

          await cargarDatos({ mostrarError: false, seleccionarSiguiente: false });
          return;
        }

        setPedidos(pedidosActualizados);
      } catch {
        // Si la recuperacion tambien falla, se muestra el error original.
      }

      mostrarMensaje({
        tipo: 'error',
        titulo: 'Error al registrar movimiento',
        detalle:
          error instanceof Error
            ? error.message
            : 'No se pudo registrar el movimiento interno.',
      });
    } finally {
      setConfirmandoPagoInterno(false);
      cobrandoRef.current = false;
      setCobrando(false);
    }
  }, [
    cargarDatos,
    cobrandoRef,
    limpiarFormulario,
    montoRecibido,
    motivoPagoInterno,
    mostrarMensaje,
    observacionPagoInterno,
    pedidoSeleccionado,
    puedeRegistrarPagoInterno,
    recibidoPor,
  ]);

  /**
   * Confirma un pago temporal en efectivo.
   *
   * Después de confirmar:
   * - se emite la factura;
   * - se cierra el pedido;
   * - se libera la mesa;
   * - se elimina el pedido de la lista.
   */
  const confirmarEfectivo =
    useCallback(async () => {
      if (cobrandoRef.current) return;

      mostrarMensaje(null);

      if (!pagoPendiente) {
        mostrarMensaje({
          tipo: 'warning',
          titulo: 'No hay pago pendiente',
          detalle:
            'Primero tenes que registrar un pago en efectivo.',
        });

        return;
      }

      /*
       * Tomamos el pedido relacionado con el pago.
       * Utilizamos el pedido seleccionado como respaldo.
       */
      const pedidoCobradoId =
        pagoPendiente.pedidoId ||
        pedidoSeleccionadoId;

      cobrandoRef.current = true;

      try {
        setCobrando(true);

        await facturasService.confirmarPagoEfectivo(
          {
            pagoId: pagoPendiente.id,
            recibidoPor,
            montoRecibido,
            vuelto,
          }
        );

        /*
         * Quitamos inmediatamente el pedido
         * de las opciones disponibles.
         */
        if (pedidoCobradoId) {
          setPedidos((actuales) =>
            actuales.filter(
              (pedido) =>
                pedido.id !==
                pedidoCobradoId
            )
          );
        }

        mostrarMensaje({
          tipo: 'success',
          titulo: 'Efectivo confirmado',
          detalle:
            'La factura fue emitida, el pedido fue cerrado y la mesa quedó libre.',
        });

        setPagoPendiente(null);
        limpiarFormulario();

        /*
         * Confirmamos nuevamente el estado real
         * consultando el backend.
         */
        await cargarDatos({ mostrarError: false, seleccionarSiguiente: false });
      } catch (error) {
        mostrarMensaje({
          tipo: 'error',
          titulo:
            'Error al confirmar efectivo',
          detalle:
            error instanceof Error
              ? error.message
              : 'No se pudo confirmar el efectivo',
        });
      } finally {
        cobrandoRef.current = false;
        setCobrando(false);
      }
    }, [
      cargarDatos,
      cobrandoRef,
      limpiarFormulario,
      montoRecibido,
      mostrarMensaje,
      pagoPendiente,
      pedidoSeleccionadoId,
      recibidoPor,
      vuelto,
    ]);

  /**
   * Exporta las facturas aplicando los filtros actuales.
   */
  const exportarFacturas =
    useCallback(async () => {
      if (exportandoRef.current) return;

      exportandoRef.current = true;

      try {
        setExportando(true);

        const archivo =
          await facturasService.exportarFacturas(
            filtros
          );

        descargarBlob(
          archivo.blob,
          archivo.filename
        );

        mostrarMensaje({
          tipo: 'success',
          titulo: 'Exportación lista',
          detalle:
            'El archivo Excel fue generado.',
        });
      } catch (error) {
        mostrarMensaje({
          tipo: 'error',
          titulo: 'Error al exportar',
          detalle:
            error instanceof Error
              ? error.message
              : 'No se pudo generar el Excel.',
        });
      } finally {
        exportandoRef.current = false;
        setExportando(false);
      }
    }, [filtros, mostrarMensaje]);

  /**
   * Evita pasar una promesa directamente al componente.
   */
  const handleCobrar = useCallback(() => {
    void cobrarPedido();
  }, [cobrarPedido]);

  const handleSolicitarPagoInterno = useCallback(() => {
    solicitarPagoInterno();
  }, [solicitarPagoInterno]);

  const handleRegistrarPagoInterno = useCallback(() => {
    void registrarPagoInterno();
  }, [registrarPagoInterno]);

  /**
   * Confirma el efectivo desde el formulario.
   */
  const handleConfirmarEfectivo =
    useCallback(() => {
      void confirmarEfectivo();
    }, [confirmarEfectivo]);

  /**
   * Exporta los movimientos internos en un archivo separado.
   */
  const exportarMovimientosCaja =
    useCallback(async () => {
      if (exportandoMovimientosRef.current) return;

      exportandoMovimientosRef.current = true;

      try {
        setExportandoMovimientos(true);

        const archivo =
          await facturasService.exportarMovimientosCaja({
            desde: filtros.desde,
            hasta: filtros.hasta,
            tipo: 'ingreso_no_fiscal',
          });

        descargarBlob(
          archivo.blob,
          archivo.filename
        );

        mostrarMensaje({
          tipo: 'success',
          titulo: 'Exportacion lista',
          detalle:
            'El Excel de movimientos de caja fue generado.',
        });
      } catch (error) {
        mostrarMensaje({
          tipo: 'error',
          titulo: 'Error al exportar',
          detalle:
            error instanceof Error
              ? error.message
              : 'No se pudo generar el Excel.',
        });
      } finally {
        exportandoMovimientosRef.current = false;
        setExportandoMovimientos(false);
      }
    }, [
      filtros.desde,
      filtros.hasta,
      mostrarMensaje,
    ]);

  /**
   * Carga inicial de pedidos y facturas.
   */
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void cargarDatos();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [cargarDatos]);

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-6 space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-black tracking-[0.18em] uppercase">
            Facturas
          </h1>

          <p className="text-sm text-[#676B67] mt-1">
            Selecciona un pedido listo para
            cobrar, verifica ARCA y emite la
            factura.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/facturas/cuentas-corrientes"
            className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-300 hover:bg-emerald-500/20"
          >
            <Users size={16} />
            Cuentas corrientes
          </Link>

          <button
            type="button"
            onClick={() => {
              void verificarARCA();
            }}
            disabled={verificandoArca}
            className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-bold text-blue-300 hover:bg-blue-500/20 disabled:opacity-50"
          >
            <ShieldCheck size={16} />

            {verificandoArca
              ? 'Verificando...'
              : 'Verificar ARCA'}
          </button>

          <button
            type="button"
            onClick={() => {
              void cargarDatos();
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-[#2a2a2a] bg-[#0d0d0d] px-4 py-3 text-sm font-bold text-[#BCB9B9] hover:bg-[#151515] disabled:opacity-50"
          >
            <RefreshCcw size={16} />

            {loading
              ? 'Actualizando...'
              : 'Actualizar'}
          </button>
        </div>
      </header>

      {mensaje && (
        <section
          className={cn(
            'rounded-2xl border p-4 flex items-start gap-3',

            mensaje.tipo === 'success' &&
              'border-green-500/30 bg-green-500/10 text-green-200',

            mensaje.tipo === 'warning' &&
              'border-yellow-500/30 bg-yellow-500/10 text-yellow-200',

            mensaje.tipo === 'error' &&
              'border-red-500/30 bg-red-500/10 text-red-200'
          )}
        >
          {mensaje.tipo === 'success' ? (
            <CheckCircle size={20} />
          ) : (
            <AlertTriangle size={20} />
          )}

          <div>
            <h2 className="text-sm font-black uppercase tracking-widest">
              {mensaje.titulo}
            </h2>

            {mensaje.detalle && (
              <p className="text-sm mt-1 opacity-80">
                {mensaje.detalle}
              </p>
            )}
          </div>
        </section>
      )}

      <EstadoArca arca={arca} />

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
        <PedidoSelector
          pedidos={pedidos}
          pedidoSeleccionado={
            pedidoSeleccionado
          }
          pedidoSeleccionadoId={
            pedidoSeleccionadoId
          }
          onSeleccionarPedido={
            seleccionarPedido
          }
        />

        <FormularioCobro
          pedidoSeleccionado={
            pedidoSeleccionado
          }
          metodoPago={metodoPago}
          tipoComprobante={tipoComprobante}
          marcaTarjeta={marcaTarjeta}
          bancoTarjeta={bancoTarjeta}
          proveedorBilletera={
            proveedorBilletera
          }
          referenciaPago={referenciaPago}
          recibidoPor={recibidoPor}
          montoRecibido={montoRecibido}
          vuelto={vuelto}
          clienteCuenta={clienteCuenta}
          pagoPendiente={pagoPendiente}
          cobrando={cobrando}
          pagoInternoSeleccionado={
            pagoInternoSeleccionado
          }
          motivoPagoInterno={
            motivoPagoInterno
          }
          observacionPagoInterno={
            observacionPagoInterno
          }
          puedeRegistrarPagoInterno={
            puedeRegistrarPagoInterno
          }
          onMetodoPagoChange={setMetodoPago}
          onTipoComprobanteChange={
            setTipoComprobante
          }
          onMarcaTarjetaChange={
            setMarcaTarjeta
          }
          onBancoTarjetaChange={
            setBancoTarjeta
          }
          onProveedorBilleteraChange={
            setProveedorBilletera
          }
          onReferenciaPagoChange={
            setReferenciaPago
          }
          onRecibidoPorChange={
            setRecibidoPor
          }
          onMontoRecibidoChange={
            setMontoRecibido
          }
          onClienteCuentaChange={
            setClienteCuenta
          }
          onPagoInternoSeleccionadoChange={
            setPagoInternoSeleccionado
          }
          onMotivoPagoInternoChange={
            setMotivoPagoInterno
          }
          onObservacionPagoInternoChange={
            setObservacionPagoInterno
          }
          onCobrar={handleCobrar}
          onConfirmarEfectivo={
            handleConfirmarEfectivo
          }
          onSolicitarPagoInterno={
            handleSolicitarPagoInterno
          }
        />
      </div>

      <TablaFacturas
        facturas={facturas}
        filtros={filtros}
        exportando={exportando}
        onFiltroChange={setFiltros}
        onExportar={() => {
          void exportarFacturas();
        }}
      />

      {puedeRegistrarPagoInterno && (
        <section className="rounded-2xl border border-[#1a1a1a] bg-[#080808] p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-4">
            <h2 className="font-black tracking-widest uppercase text-sm">Movimientos de caja</h2>

            <button
              type="button"
              onClick={() => {
                void exportarMovimientosCaja();
              }}
              disabled={exportandoMovimientos}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-200 hover:bg-yellow-500/20 disabled:opacity-50"
            >
              <Download size={16} />
              {exportandoMovimientos
                ? 'Exportando...'
                : 'Exportar movimientos'}
            </button>
          </div>

          {movimientosCaja.length === 0 ? (
            <p className="text-sm text-[#676B67]">Todavia no hay movimientos de caja para los filtros seleccionados.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a1a] text-left text-[#676B67]">
                    <th className="py-3">Fecha</th>
                    <th className="py-3">Pedido</th>
                    <th className="py-3">Mesa</th>
                    <th className="py-3">Importe</th>
                    <th className="py-3">Motivo</th>
                    <th className="py-3">Observacion</th>
                    <th className="py-3">Usuario</th>
                    <th className="py-3">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientosCaja.map((movimiento) => (
                    <tr key={movimiento.id} className="border-b border-[#111]">
                      <td className="py-3">{formatearFechaMovimiento(movimiento.creadoEn)}</td>
                      <td className="py-3 font-mono text-xs">{movimiento.pedidoId || '-'}</td>
                      <td className="py-3">{movimiento.mesa?.numero || '-'}</td>
                      <td className="py-3 font-mono">{formatearARS(movimiento.importe)}</td>
                      <td className="py-3">{obtenerMotivoPagoInternoLabel(movimiento.motivo)}</td>
                      <td className="py-3 text-[#BCB9B9]">{movimiento.observacion || '-'}</td>
                      <td className="py-3">{movimiento.creadoPor || '-'}</td>
                      <td className="py-3">
                        <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-200">
                          {movimiento.tipo}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <Modal
        isOpen={confirmandoPagoInterno}
        onClose={() => {
          if (!cobrando) {
            setConfirmandoPagoInterno(false);
          }
        }}
        title="Pago interno no fiscal"
        size="lg"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-yellow-100">
            <p className="text-sm font-semibold">
              {ADVERTENCIA_PAGO_INTERNO_NO_FISCAL}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[#676B67] uppercase tracking-widest text-xs font-bold">Pedido</p>
              <p className="mt-1 font-mono">{pedidoSeleccionado?.id || '-'}</p>
            </div>
            <div>
              <p className="text-[#676B67] uppercase tracking-widest text-xs font-bold">Mesa</p>
              <p className="mt-1">{pedidoSeleccionado?.mesa?.numero || '-'}</p>
            </div>
            <div>
              <p className="text-[#676B67] uppercase tracking-widest text-xs font-bold">Importe</p>
              <p className="mt-1 font-mono">{formatearARS(Number(montoRecibido || 0))}</p>
            </div>
            <div>
              <p className="text-[#676B67] uppercase tracking-widest text-xs font-bold">Motivo</p>
              <p className="mt-1">{obtenerMotivoPagoInternoLabel(motivoPagoInterno)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-[#676B67] uppercase tracking-widest text-xs font-bold">Observacion</p>
              <p className="mt-1 text-[#BCB9B9]">{observacionPagoInterno || '-'}</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end pt-2">
            <button
              type="button"
              onClick={() => setConfirmandoPagoInterno(false)}
              disabled={cobrando}
              className="rounded-xl border border-[#2a2a2a] bg-black px-4 py-3 text-sm font-bold text-[#BCB9B9] hover:bg-[#151515] disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleRegistrarPagoInterno}
              disabled={cobrando}
              className="rounded-xl bg-yellow-300 px-4 py-3 text-sm font-black text-black hover:bg-yellow-200 disabled:opacity-50"
            >
              {cobrando
                ? 'Procesando...'
                : 'Confirmar movimiento interno'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
