// Prueba directa al backend Express con la mesa activa
async function run() {
  // 1. Obtener mesas disponibles
  const mesasRes = await fetch('http://localhost:3001/api/mesas');
  if (!mesasRes.ok) {
    console.log("Error al obtener mesas:", mesasRes.status);
    return;
  }
  const mesasData = await mesasRes.json();
  const mesas = mesasData.mesas || mesasData;
  console.log("Mesas disponibles:", mesas.length);
  if (!mesas.length) return;

  const mesa = mesas[0];
  console.log("Usando mesa:", mesa.id, "numero:", mesa.numero);

  // 2. Crear pedido via backend
  const pedidoRes = await fetch('http://localhost:3001/api/pedidos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mesaId: mesa.id })
  });

  const pedidoData = await pedidoRes.json();
  if (!pedidoRes.ok) {
    console.log("Error al crear pedido:", pedidoData);
    return;
  }
  console.log("Pedido creado exitosamente!", pedidoData.pedido?.id);

  // 3. Limpiar - cancelar el pedido de prueba
  await fetch(`http://localhost:3001/api/pedidos/${pedidoData.pedido.id}/cancelar`, {
    method: 'PATCH'
  });
  console.log("Pedido de prueba cancelado (limpieza).");
}

run();
