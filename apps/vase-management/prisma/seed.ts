// prisma/seed.ts — Vase Business v2.0
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ─── Roles y permisos básicos ─────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { name: 'Administrador' },
    update: {},
    create: { name: 'Administrador', description: 'Acceso total al sistema', isSystem: true },
  })
  const vendedorRole = await prisma.role.upsert({
    where: { name: 'Vendedor' },
    update: {},
    create: { name: 'Vendedor', description: 'Acceso a ventas y clientes', isSystem: true },
  })

  // ─── Usuarios ──────────────────────────────────────────────────────
  const hashedAdmin = await bcrypt.hash('admin123', 10)
  const hashedVendedor = await bcrypt.hash('vendedor123', 10)

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@vase.com' },
    update: {},
    create: { email: 'superadmin@vase.com', name: 'Super Admin', password: hashedAdmin, isSuperAdmin: true },
  })

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: {},
    create: { email: 'admin@demo.com', name: 'Admin Demo', password: hashedAdmin },
  })

  const vendedorUser = await prisma.user.upsert({
    where: { email: 'vendedor@demo.com' },
    update: {},
    create: { email: 'vendedor@demo.com', name: 'Vendedor Demo', password: hashedVendedor },
  })

  // ─── Empresa demo ──────────────────────────────────────────────────
  const company = await prisma.company.create({
    data: {
      name: 'Demo SA',
      legalName: 'Demo Sociedad Anónima',
      cuit: '30-71234567-0',
      address: 'Av. Corrientes 1234',
      city: 'CABA',
      province: 'Buenos Aires',
      phone: '011-4567-8900',
      email: 'contacto@demosa.com.ar',
      ivaCondition: 'RESPONSABLE_INSCRIPTO',
      plan: 'PROFESSIONAL',
    },
  })

  // ─── Permisos y asignación a roles ──────────────────────────────────
  // CRÍTICO: los endpoints de acciones críticas ahora validan permisos
  // reales (fail-closed). Sin esto, el usuario admin de la demo quedaría
  // bloqueado de acciones que antes funcionaban sin restricción.
  const permissionDefs = [
    { code: 'invoice.authorize', name: 'Autorizar facturas', module: 'facturacion' },
    { code: 'invoice.cancel', name: 'Anular facturas', module: 'facturacion' },
    { code: 'invoice.renumber', name: 'Cambiar numeración de comprobantes', module: 'facturacion' },
    { code: 'sale.cancel', name: 'Anular ventas', module: 'ventas' },
    { code: 'price.bulk_update', name: 'Modificar precios masivamente', module: 'productos' },
    { code: 'customer.delete', name: 'Eliminar clientes', module: 'clientes' },
    { code: 'product.delete', name: 'Eliminar productos', module: 'productos' },
    { code: 'stock.adjust', name: 'Ajustar stock', module: 'stock' },
    { code: 'stock.zero_out', name: 'Poner stock en cero', module: 'stock' },
    { code: 'balance.adjust', name: 'Ajustar saldos de cuenta corriente', module: 'tesoreria' },
    { code: 'period.close', name: 'Cerrar período fiscal', module: 'utilidades' },
    { code: 'cash.close', name: 'Cerrar caja', module: 'tesoreria' },
    { code: 'stock.reprocess', name: 'Reprocesar stock', module: 'utilidades' },
    { code: 'debt.recalculate', name: 'Recalcular deuda', module: 'utilidades' },
  ]

  const permissions = []
  for (const p of permissionDefs) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: p,
    })
    permissions.push(perm)
  }

  // El rol Administrador tiene TODOS los permisos críticos por defecto.
  // El rol Vendedor no tiene ninguno (debe pedírselos explícitamente a un admin).
  for (const perm of permissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: perm.id },
    })
  }


  await prisma.companyUser.create({ data: { companyId: company.id, userId: adminUser.id, roleId: adminRole.id } })
  await prisma.companyUser.create({ data: { companyId: company.id, userId: vendedorUser.id, roleId: vendedorRole.id } })

  // ─── Sucursal y punto de venta ──────────────────────────────────────
  const branch = await prisma.branch.create({
    data: { companyId: company.id, name: 'Casa Central', address: 'Av. Corrientes 1234', isMain: true },
  })
  const pos = await prisma.pointOfSale.create({
    data: { branchId: branch.id, number: 1, name: 'Caja Principal' },
  })

  // ─── Caja registradora y cuenta bancaria demo (Etapa 2) ──────────────
  await prisma.cashRegister.create({
    data: { companyId: company.id, name: 'Caja Mostrador', branchId: branch.id },
  })
  await prisma.bankAccount.create({
    data: { companyId: company.id, bankName: 'Banco Nación', alias: 'demo.sa.cuenta', cbu: '0110012340000012345678', balance: 0 },
  })

  // ─── Zonas, grupos y rutas ──────────────────────────────────────────
  const zonaNorte = await prisma.salesZone.create({ data: { companyId: company.id, name: 'Zona Norte' } })
  const zonaSur = await prisma.salesZone.create({ data: { companyId: company.id, name: 'Zona Sur' } })

  const grupoMayorista = await prisma.customerGroup.create({
    data: { companyId: company.id, name: 'Mayoristas', discount: 10 },
  })
  const grupoVip = await prisma.customerGroup.create({
    data: { companyId: company.id, name: 'VIP', discount: 5 },
  })

  const rutaCentro = await prisma.deliveryRoute.create({ data: { companyId: company.id, name: 'Ruta Centro' } })

  // ─── Depósitos / Almacenes ───────────────────────────────────────────
  const depositoCentral = await prisma.warehouse.create({
    data: { companyId: company.id, name: 'Depósito Central', address: 'Av. Industrial 1234', isMain: true },
  })
  const depositoSucursal = await prisma.warehouse.create({
    data: { companyId: company.id, name: 'Depósito Sucursal Norte' },
  })

  // ─── Categorías, marcas, familias ──────────────────────────────────
  const categorias = await Promise.all([
    prisma.category.create({ data: { companyId: company.id, name: 'Electrónica', color: '#3b82f6' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Indumentaria', color: '#8b5cf6' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Alimentos', color: '#10b981' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Herramientas', color: '#f59e0b' } }),
    prisma.category.create({ data: { companyId: company.id, name: 'Oficina', color: '#06b6d4' } }),
  ])

  const marcas = await Promise.all([
    prisma.brand.create({ data: { companyId: company.id, name: 'Samsung' } }),
    prisma.brand.create({ data: { companyId: company.id, name: 'Nike' } }),
    prisma.brand.create({ data: { companyId: company.id, name: 'Genérico' } }),
    prisma.brand.create({ data: { companyId: company.id, name: 'Stanley' } }),
    prisma.brand.create({ data: { companyId: company.id, name: 'Bic' } }),
  ])

  const seccion = await prisma.productSection.create({ data: { companyId: company.id, name: 'General' } })
  const familia = await prisma.productFamily.create({ data: { companyId: company.id, sectionId: seccion.id, name: 'Línea Principal' } })

  // ─── Lista de precios ────────────────────────────────────────────────
  const listaDefault = await prisma.priceList.create({
    data: { companyId: company.id, name: 'Lista General', isDefault: true },
  })
  const listaMayorista = await prisma.priceList.create({
    data: { companyId: company.id, name: 'Mayorista', discount: 10 },
  })

  // ─── Productos ────────────────────────────────────────────────────────
  const productosData = [
    { name: 'Smartphone Galaxy A54', categoryId: categorias[0].id, brandId: marcas[0].id, price: 350000, cost: 250000, stock: 15, minStock: 5 },
    { name: 'Auriculares Bluetooth', categoryId: categorias[0].id, brandId: marcas[0].id, price: 25000, cost: 15000, stock: 40, minStock: 10 },
    { name: 'Remera Deportiva', categoryId: categorias[1].id, brandId: marcas[1].id, price: 12000, cost: 6000, stock: 60, minStock: 15 },
    { name: 'Zapatillas Running', categoryId: categorias[1].id, brandId: marcas[1].id, price: 85000, cost: 50000, stock: 25, minStock: 8 },
    { name: 'Aceite de Oliva 500ml', categoryId: categorias[2].id, brandId: marcas[2].id, price: 4500, cost: 2800, stock: 100, minStock: 20 },
    { name: 'Arroz 1kg', categoryId: categorias[2].id, brandId: marcas[2].id, price: 1200, cost: 700, stock: 200, minStock: 50 },
    { name: 'Taladro Eléctrico', categoryId: categorias[3].id, brandId: marcas[3].id, price: 65000, cost: 40000, stock: 8, minStock: 3 },
    { name: 'Set Destornilladores', categoryId: categorias[3].id, brandId: marcas[3].id, price: 18000, cost: 10000, stock: 30, minStock: 10 },
    { name: 'Resma Papel A4', categoryId: categorias[4].id, brandId: marcas[4].id, price: 5500, cost: 3500, stock: 80, minStock: 20 },
    { name: 'Lapicera Bic Azul x12', categoryId: categorias[4].id, brandId: marcas[4].id, price: 3200, cost: 1800, stock: 150, minStock: 30 },
  ]

  const productos = []
  for (const p of productosData) {
    const product = await prisma.product.create({
      data: {
        companyId: company.id,
        categoryId: p.categoryId,
        brandId: p.brandId,
        familyId: familia.id,
        code: `PRD-${Math.floor(1000 + Math.random() * 9000)}`,
        name: p.name,
        unit: 'UN',
        price: p.price,
        cost: p.cost,
        stock: p.stock,
        minStock: p.minStock,
        ivaRate: 21,
      },
    })
    productos.push(product)

    // Movimiento inicial de stock
    await prisma.stockMovement.create({
      data: {
        companyId: company.id,
        warehouseId: depositoCentral.id,
        productId: product.id,
        type: 'ENTRY',
        quantity: p.stock,
        unitCost: p.cost,
        reference: 'Stock inicial',
      },
    })

    await prisma.stockLevel.create({
      data: { productId: product.id, warehouseId: depositoCentral.id, quantity: p.stock, available: p.stock },
    })

    await prisma.priceListItem.create({
      data: { priceListId: listaDefault.id, productId: product.id, price: p.price },
    })
    await prisma.priceListItem.create({
      data: { priceListId: listaMayorista.id, productId: product.id, price: p.price * 0.9 },
    })
  }

  // ─── Clientes ────────────────────────────────────────────────────────
  const clientesData = [
    { name: 'Juan Pérez', documentNumber: '20-12345678-9', ivaCondition: 'RESPONSABLE_INSCRIPTO' as const, email: 'juan@email.com', phone: '11-2345-6789', groupId: grupoVip.id, zoneId: zonaNorte.id, creditLimit: 100000 },
    { name: 'María González', documentNumber: '27-87654321-3', ivaCondition: 'MONOTRIBUTISTA' as const, email: 'maria@email.com', phone: '11-3456-7890', groupId: grupoMayorista.id, zoneId: zonaSur.id, creditLimit: 200000 },
    { name: 'Comercial Sur SRL', documentNumber: '30-55667788-2', ivaCondition: 'RESPONSABLE_INSCRIPTO' as const, email: 'ventas@comercialsur.com', phone: '11-4567-8901', groupId: grupoMayorista.id, zoneId: zonaSur.id, creditLimit: 500000 },
    { name: 'Carlos Rodríguez', documentNumber: '20-99887766-5', ivaCondition: 'CONSUMIDOR_FINAL' as const, phone: '11-5678-9012', zoneId: zonaNorte.id, creditLimit: 0 },
    { name: 'Ana Martínez', documentNumber: '27-44556677-8', ivaCondition: 'CONSUMIDOR_FINAL' as const, email: 'ana@email.com', deliveryRouteId: rutaCentro.id, creditLimit: 50000 },
  ]

  const clientes = []
  for (const c of clientesData) {
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        documentType: 'CUIT',
        address: 'Calle Falsa 123',
        city: 'CABA',
        birthDate: new Date(1985 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
        ...c,
      },
    })
    clientes.push(customer)
  }

  // ─── Proveedores ─────────────────────────────────────────────────────
  const proveedoresData = [
    { name: 'Distribuidora Tech SA', documentNumber: '30-11223344-5', email: 'compras@disttech.com', phone: '11-1111-2222', paymentTermDays: 30 },
    { name: 'Indumentaria Mayorista', documentNumber: '30-22334455-6', email: 'ventas@indumayor.com', phone: '11-2222-3333', paymentTermDays: 45 },
    { name: 'Alimentos del Sur SRL', documentNumber: '30-33445566-7', email: 'pedidos@alimentossur.com', phone: '11-3333-4444', paymentTermDays: 15 },
  ]

  const proveedores = []
  for (const p of proveedoresData) {
    const supplier = await prisma.supplier.create({
      data: { companyId: company.id, documentType: 'CUIT', ivaCondition: 'RESPONSABLE_INSCRIPTO', ...p },
    })
    proveedores.push(supplier)
  }

  // ─── Ventas demo ─────────────────────────────────────────────────────
  for (let i = 0; i < 8; i++) {
    const customer = clientes[i % clientes.length]
    const product = productos[i % productos.length]
    const qty = 1 + Math.floor(Math.random() * 5)
    const subtotal = Number(product.price) * qty
    const ivaAmount = subtotal * 0.21
    const total = subtotal + ivaAmount
    const statuses: any[] = ['CONFIRMED', 'DELIVERED', 'INVOICED', 'PENDING']

    const sale = await prisma.sale.create({
      data: {
        companyId: company.id,
        branchId: branch.id,
        customerId: customer.id,
        userId: vendedorUser.id,
        type: 'SALE',
        status: statuses[i % statuses.length],
        number: `V-${1000 + i}`,
        date: new Date(Date.now() - i * 3 * 864e5),
        subtotal,
        ivaAmount,
        total,
        paidAmount: i % 3 === 0 ? total : total * 0.5,
        balance: i % 3 === 0 ? 0 : total * 0.5,
        items: {
          create: [{
            productId: product.id,
            quantity: qty,
            unitPrice: product.price,
            ivaRate: 21,
            subtotal,
            ivaAmount,
            total,
          }],
        },
      },
    })

    // Stock movement por la venta
    await prisma.stockMovement.create({
      data: {
        companyId: company.id, warehouseId: depositoCentral.id, productId: product.id,
        type: 'SALE', quantity: qty, reference: `Venta ${sale.number}`,
      },
    })
  }

  // ─── Facturas demo con CAE mock ──────────────────────────────────────
  for (let i = 0; i < 4; i++) {
    const customer = clientes[i % clientes.length]
    const subtotal = 50000 + i * 15000
    const ivaAmount = subtotal * 0.21
    const total = subtotal + ivaAmount
    const cae = Array.from({ length: 14 }, () => Math.floor(Math.random() * 10)).join('')
    const dueDate = new Date(Date.now() + (i - 1) * 5 * 864e5) // algunas pasadas, algunas futuras

    await prisma.invoice.create({
      data: {
        companyId: company.id,
        customerId: customer.id,
        userId: adminUser.id,
        pointOfSaleId: pos.id,
        letter: i % 2 === 0 ? 'A' : 'B',
        number: 1000 + i,
        date: new Date(Date.now() - i * 5 * 864e5),
        dueDate,
        subtotal,
        ivaAmount,
        total,
        paidAmount: i === 0 ? total : 0,
        balance: i === 0 ? 0 : total,
        cae,
        caeDueDate: new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10).replace(/-/g, ''),
        status: 'AUTHORIZED',
      },
    })
  }

  // ─── Compra demo ─────────────────────────────────────────────────────
  const purchaseSubtotal = 80000
  await prisma.purchase.create({
    data: {
      companyId: company.id,
      supplierId: proveedores[0].id,
      type: 'INVOICE',
      status: 'PENDING',
      number: 'C-0001',
      date: new Date(),
      dueDate: new Date(Date.now() + 30 * 864e5),
      subtotal: purchaseSubtotal,
      ivaAmount: purchaseSubtotal * 0.21,
      total: purchaseSubtotal * 1.21,
      balance: purchaseSubtotal * 1.21,
      items: {
        create: [{
          productId: productos[0].id,
          quantity: 10,
          unitCost: 8000,
          ivaRate: 21,
          subtotal: 80000,
          ivaAmount: 16800,
          total: 96800,
        }],
      },
    },
  })

  // ─── Movimientos de caja demo ─────────────────────────────────────────
  for (let i = 0; i < 10; i++) {
    const isIncome = i % 3 !== 0
    await prisma.cashMovement.create({
      data: {
        companyId: company.id,
        type: isIncome ? 'INCOME' : 'EXPENSE',
        category: isIncome ? 'Ventas' : 'Gastos generales',
        amount: 10000 + Math.random() * 50000,
        description: isIncome ? `Cobro venta #${1000 + i}` : `Pago proveedor/gasto #${i}`,
        date: new Date(Date.now() - i * 2 * 864e5),
        method: 'CASH',
      },
    })
  }

  console.log('✅ Seed completado exitosamente')
  console.log('')
  console.log('👤 Usuarios de prueba:')
  console.log('   superadmin@vase.com / admin123 (Super Admin)')
  console.log('   admin@demo.com / admin123 (Admin Demo SA)')
  console.log('   vendedor@demo.com / vendedor123 (Vendedor Demo SA)')
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
