/* ============================================================
   MGG · Seed
   Datos iniciales de demostración (idempotente).
   ============================================================ */
(function () {
  const SEED_FLAG = 'mgg.seeded.v1';

  const proveedores = [
    { id: 'prov_1', rif: 'J-30056789-1', razonSocial: 'Minera del Sur C.A.',           contacto: 'Luis Ramírez', telefono: '0414-1234567', email: 'ventas@minerasur.com.ve',    direccion: 'Av. Libertador, Caracas',     categorias: ['Explosivos', 'Maquinaria'], estado: 'activo', createdAt: new Date(Date.now() - 86400000 * 60).toISOString() },
    { id: 'prov_2', rif: 'J-40123456-7', razonSocial: 'Suministros Industriales Orinoco', contacto: 'María Pérez',  telefono: '0212-5557890', email: 'orinoco@suministros.com.ve', direccion: 'Zona Industrial, Pto Ordaz',  categorias: ['EPP', 'Herramientas'],      estado: 'activo', createdAt: new Date(Date.now() - 86400000 * 50).toISOString() },
    { id: 'prov_3', rif: 'J-29876543-2', razonSocial: 'Transporte Pesado Guayana',     contacto: 'José Gómez',   telefono: '0286-3334455', email: 'op@tpguayana.com',           direccion: 'Av. Guayana, Pto Ordaz',      categorias: ['Logística'],                estado: 'activo', createdAt: new Date(Date.now() - 86400000 * 45).toISOString() },
    { id: 'prov_4', rif: 'J-31112233-4', razonSocial: 'Repuestos y Servicios Andes',   contacto: 'Carmen Díaz',  telefono: '0274-2226677', email: 'andes@repser.com.ve',        direccion: 'Mérida',                      categorias: ['Repuestos', 'Lubricantes'], estado: 'activo', createdAt: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'prov_5', rif: 'J-32223344-5', razonSocial: 'Químicos del Caribe',           contacto: 'Pedro Salas',  telefono: '0212-6669988', email: 'qcaribe@qdc.com.ve',         direccion: 'La Guaira',                   categorias: ['Reactivos', 'Químicos'],    estado: 'inactivo', createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  ];

  // restockPct: opcional · % personalizado del stockMin para el modo "Detallado".
  //   Alto (>=150%) → insumos de consumo rápido (alertar muy antes del mínimo)
  //   Bajo  (<=70%) → maquinaria / piezas grandes que rotan lento
  //   null          → cae al fallback global de la política
  const productos = [
    { id: 'prod_1',  sku: 'EXP-001', nombre: 'Detonador eléctrico',       categoria: 'Explosivos',  unidad: 'und',    stock: 240, stockMin: 80,  precio: 12.5,   almacen: 'General', estado: 'activo', restockPct: null },
    { id: 'prod_2',  sku: 'EXP-002', nombre: 'ANFO (saco 25kg)',          categoria: 'Explosivos',  unidad: 'saco',   stock: 65,  stockMin: 100, precio: 38.0,   almacen: 'General', estado: 'activo', restockPct: 180 },
    { id: 'prod_3',  sku: 'EPP-001', nombre: 'Casco de seguridad',        categoria: 'EPP',         unidad: 'und',    stock: 420, stockMin: 150, precio: 14.0,   almacen: 'General', estado: 'activo', restockPct: null },
    { id: 'prod_4',  sku: 'EPP-002', nombre: 'Guantes anti-corte',        categoria: 'EPP',         unidad: 'par',    stock: 50,  stockMin: 200, precio: 6.5,    almacen: 'General', estado: 'activo', restockPct: 150 },
    { id: 'prod_5',  sku: 'EPP-003', nombre: 'Lentes industriales',       categoria: 'EPP',         unidad: 'und',    stock: 310, stockMin: 100, precio: 4.8,    almacen: 'General', estado: 'activo', restockPct: null },
    { id: 'prod_6',  sku: 'HER-001', nombre: 'Pico minero',               categoria: 'Herramientas',unidad: 'und',    stock: 75,  stockMin: 30,  precio: 22.0,   almacen: 'General', estado: 'activo', restockPct: null },
    { id: 'prod_7',  sku: 'HER-002', nombre: 'Pala punta corazón',        categoria: 'Herramientas',unidad: 'und',    stock: 110, stockMin: 40,  precio: 18.5,   almacen: 'General', estado: 'activo', restockPct: null },
    { id: 'prod_8',  sku: 'MAQ-001', nombre: 'Broca tricónica 8"',        categoria: 'Maquinaria',  unidad: 'und',    stock: 12,  stockMin: 8,   precio: 540.0,  almacen: 'General', estado: 'activo', restockPct: 50  },
    { id: 'prod_9',  sku: 'LUB-001', nombre: 'Aceite hidráulico 55gal',   categoria: 'Lubricantes', unidad: 'tambor', stock: 18,  stockMin: 10,  precio: 320.0,  almacen: 'General', estado: 'activo', restockPct: null },
    { id: 'prod_10', sku: 'REA-001', nombre: 'Cianuro de sodio (kg)',     categoria: 'Reactivos',   unidad: 'kg',     stock: 4,   stockMin: 50,  precio: 26.0,   almacen: 'General', estado: 'activo', restockPct: 200 },
    { id: 'prod_11', sku: 'REP-001', nombre: 'Filtro hidráulico CAT',     categoria: 'Repuestos',   unidad: 'und',    stock: 22,  stockMin: 12,  precio: 95.0,   almacen: 'General', estado: 'activo', restockPct: null },
    { id: 'prod_12', sku: 'LOG-001', nombre: 'Neumático 14.00R25',        categoria: 'Logística',   unidad: 'und',    stock: 6,   stockMin: 4,   precio: 1850.0, almacen: 'General', estado: 'activo', restockPct: 60  },
  ];

  const now = Date.now();
  const ordenes = [
    {
      id: 'ord_1', codigo: 'OP-2026-0001',
      proveedorId: 'prov_2', solicitanteEmail: 'analista@mineralgroupguayana.com.ve', solicitante: 'Carlos Hernández',
      items: [
        { productoId: 'prod_4', nombre: 'Guantes anti-corte', sku: 'EPP-002', cantidad: 250, precio: 6.5 },
        { productoId: 'prod_3', nombre: 'Casco de seguridad', sku: 'EPP-001', cantidad: 50,  precio: 14.0 },
      ],
      total: 250 * 6.5 + 50 * 14, estado: 'pendiente', notas: 'Reposición urgente de EPP planta 2.',
      historial: [{ at: new Date(now - 86400000 * 2).toISOString(), evento: 'creada', actor: 'analista@mineralgroupguayana.com.ve' }],
      createdAt: new Date(now - 86400000 * 2).toISOString(),
    },
    {
      id: 'ord_2', codigo: 'OP-2026-0002',
      proveedorId: 'prov_5', solicitanteEmail: 'analista@mineralgroupguayana.com.ve', solicitante: 'Carlos Hernández',
      items: [{ productoId: 'prod_10', nombre: 'Cianuro de sodio (kg)', sku: 'REA-001', cantidad: 100, precio: 26.0 }],
      total: 100 * 26, estado: 'pendiente', notas: 'Proceso de lixiviación.',
      historial: [{ at: new Date(now - 86400000 * 1).toISOString(), evento: 'creada', actor: 'analista@mineralgroupguayana.com.ve' }],
      createdAt: new Date(now - 86400000 * 1).toISOString(),
    },
    {
      id: 'ord_3', codigo: 'OP-2026-0003',
      proveedorId: 'prov_1', solicitanteEmail: 'analista@mineralgroupguayana.com.ve', solicitante: 'Carlos Hernández',
      items: [{ productoId: 'prod_2', nombre: 'ANFO (saco 25kg)', sku: 'EXP-002', cantidad: 80, precio: 38.0 }],
      total: 80 * 38, estado: 'aprobada', notas: 'Frente de voladura Norte.',
      historial: [
        { at: new Date(now - 86400000 * 6).toISOString(), evento: 'creada', actor: 'analista@mineralgroupguayana.com.ve' },
        { at: new Date(now - 86400000 * 5).toISOString(), evento: 'aprobada', actor: 'admin@mineralgroupguayana.com.ve' },
      ],
      createdAt: new Date(now - 86400000 * 6).toISOString(),
      aprobadaPor: 'admin@mineralgroupguayana.com.ve', aprobadaEn: new Date(now - 86400000 * 5).toISOString(),
    },
    {
      id: 'ord_4', codigo: 'OP-2026-0004',
      proveedorId: 'prov_3', solicitanteEmail: 'analista@mineralgroupguayana.com.ve', solicitante: 'Carlos Hernández',
      items: [{ productoId: 'prod_12', nombre: 'Neumático 14.00R25', sku: 'LOG-001', cantidad: 2, precio: 1850.0 }],
      total: 2 * 1850, estado: 'rechazada', notas: 'Presupuesto trimestral agotado.',
      historial: [
        { at: new Date(now - 86400000 * 9).toISOString(), evento: 'creada', actor: 'analista@mineralgroupguayana.com.ve' },
        { at: new Date(now - 86400000 * 8).toISOString(), evento: 'rechazada', actor: 'admin@mineralgroupguayana.com.ve', motivo: 'Solicitar en próximo ciclo presupuestario.' },
      ],
      createdAt: new Date(now - 86400000 * 9).toISOString(),
      rechazadaPor: 'admin@mineralgroupguayana.com.ve', rechazadaEn: new Date(now - 86400000 * 8).toISOString(),
      motivoRechazo: 'Solicitar en próximo ciclo presupuestario.',
    },
  ];

  const facturas = [
    {
      id: 'fac_1', numero: 'FAC-2026-0001',
      ordenId: 'ord_3', proveedorId: 'prov_1',
      items: ordenes[2].items,
      subtotal: ordenes[2].total,
      iva: ordenes[2].total * 0.16,
      total: ordenes[2].total * 1.16,
      estado: 'pagada',
      emision: new Date(now - 86400000 * 4).toISOString(),
      vencimiento: new Date(now + 86400000 * 26).toISOString(),
    },
  ];

  // ─── Roles del sistema ───────────────────────────────────
  // Los permisos siguen el formato `<modulo>:<accion>` o `<modulo>:*` (todo el módulo)
  // o `*` (acceso total).
  const roles = [
    {
      id: 'admin',
      nombre: 'Administradora',
      descripcion: 'Acceso total al sistema. Aprueba órdenes, gestiona usuarios y políticas.',
      sistema: true,
      permisos: ['*'],
    },
    {
      id: 'analista',
      nombre: 'Analista',
      descripcion: 'Crea solicitudes de pedido y gestiona el inventario operativamente.',
      sistema: true,
      permisos: [
        'inventario:view', 'inventario:edit',
        'proveedores:view',
        'ordenes:view', 'ordenes:create', 'ordenes:cambiar_proveedor', 'ordenes:desistir',
        'facturacion:view',
        'ajustes:view',
      ],
    },
    {
      id: 'supervisor',
      nombre: 'Supervisor',
      descripcion: 'Acceso de solo lectura sobre las operaciones del sistema.',
      sistema: true,
      permisos: [
        'inventario:view',
        'proveedores:view',
        'ordenes:view',
        'facturacion:view',
        'ajustes:view',
      ],
    },
  ];

  // En producción `password` sería un hash bcrypt/argon2.
  // En este demo guardamos un placeholder y exponemos el flujo de restablecimiento.
  // `passwordTemporal` indica que en el próximo login debe forzarse cambio.
  const usuarios = [
    { id: 'usr_1', email: 'admin@mineralgroupguayana.com.ve',     nombre: 'María Rodríguez',  rolId: 'admin',      telefono: '0212-1112233', departamento: 'Dirección',  estado: 'activo',   password: 'demo1234', passwordTemporal: false, passwordResetAt: null, createdAt: new Date(Date.now() - 86400000 * 90).toISOString() },
    { id: 'usr_2', email: 'analista@mineralgroupguayana.com.ve',  nombre: 'Carlos Hernández', rolId: 'analista',   telefono: '0414-7778899', departamento: 'Operaciones',estado: 'activo',   password: 'demo1234', passwordTemporal: false, passwordResetAt: null, createdAt: new Date(Date.now() - 86400000 * 75).toISOString() },
    { id: 'usr_3', email: 'supervisor@mineralgroupguayana.com.ve',nombre: 'Ana Pérez',        rolId: 'supervisor', telefono: '0212-3334455', departamento: 'Auditoría',  estado: 'activo',   password: 'demo1234', passwordTemporal: false, passwordResetAt: null, createdAt: new Date(Date.now() - 86400000 * 40).toISOString() },
    { id: 'usr_4', email: 'lmarcano@mineralgroupguayana.com.ve',  nombre: 'Luis Marcano',     rolId: 'analista',   telefono: '0414-5556677', departamento: 'Compras',    estado: 'inactivo', password: 'demo1234', passwordTemporal: false, passwordResetAt: null, createdAt: new Date(Date.now() - 86400000 * 20).toISOString() },
  ];

  // Movimientos iniciales del kardex (uno por producto: alta con stock inicial).
  // Se generan dinámicamente para usar los ids/cantidades reales del seed.
  function buildMovimientosIniciales() {
    const baseAt = Date.now() - 86400000 * 60; // hace 60 días
    return productos.map((p, idx) => ({
      id: 'mov_init_' + p.id,
      productoId: p.id,
      tipo: 'creacion',
      delta: p.stock,
      stockAntes: 0,
      stockDespues: p.stock,
      actor: 'admin@mineralgroupguayana.com.ve',
      actorName: 'María Rodríguez',
      refTipo: 'manual',
      refId: null,
      refCodigo: null,
      proveedorId: null,
      detalle: 'Carga inicial del inventario',
      at: new Date(baseAt + idx * 86400000 * 0.3).toISOString(),
      createdAt: new Date(baseAt + idx * 86400000 * 0.3).toISOString(),
    }));
  }

  function seed(force) {
    if (localStorage.getItem(SEED_FLAG) && !force) return;
    Store.replace('proveedores', proveedores);
    Store.replace('productos',  productos);
    Store.replace('ordenes',    ordenes);
    Store.replace('facturas',   facturas);
    Store.replace('roles',      roles);
    Store.replace('usuarios',   usuarios);
    Store.replace('movimientos', buildMovimientosIniciales());
    Store.replace('notificaciones', []);
    localStorage.setItem(SEED_FLAG, '1');
  }

  function reset() {
    ['proveedores', 'productos', 'ordenes', 'facturas', 'roles', 'usuarios', 'movimientos', 'notificaciones']
      .forEach(t => localStorage.removeItem('mgg.db.' + t));
    localStorage.removeItem(SEED_FLAG);
    seed(true);
  }

  window.Seed = { seed, reset };
})();
