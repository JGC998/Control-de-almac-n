# Changelog — CRM Taller

Registro diario de cambios, mejoras y tareas pendientes.
- ✅ Completado  |  🔄 En progreso  |  ⏳ Pendiente  |  ❌ Descartado

---

## 2026-05-21

### Rama: `refactorizacion`

#### Fase A — Navegación y diseño

- ✅ Merge rama `dev` → `main` (11 commits)
- ✅ Eliminar rama `feature/calculadora-pvc-v1`
- ✅ Crear rama `refactorizacion`
- ✅ Mover navegación de barra lateral a cabecera horizontal (topnav)
- ✅ Aplicar tema **Corporate** como predeterminado (selector de temas incluido: Dim, Night, Dracula, Corporate, Nord)
- ✅ Arreglar buscador — migrar `input-group` → `join` (DaisyUI v5)
- ✅ Crear hub pages: `/ventas`, `/compras`, `/gestion`, `/herramientas`
- ✅ Nav: label de sección = link al hub · chevron = dropdown rápido
- ✅ Añadir **Informes** como ítem propio en la barra (antes estaba enterrado en Herramientas)
- ✅ BD SQLite local para desarrollo (`prisma/dev.db`) con datos mock realistas (15 clientes, 10 productos, 52 presupuestos, 39 pedidos…)

#### Reorganización de navegación (esta sesión)

- ✅ **Ventas** — dropdown en dos bloques: *Crear* (Presupuesto, Pedido, Albarán·, Factura·) y *Ver* (listados)
- ✅ **Compras** — dropdown en dos bloques: *Crear* (Pedido nacional, Importación) y *Ver* (pedidos, proveedores)
- ✅ **Almacén** — renombrado a catálogo de materiales/productos; stock de inventario movido a `/almacen/stock`
- ✅ **Gestión** — solo Clientes + Tarifas de material
- ✅ **Herramientas** — solo calculadoras (Planos/Documentos eliminado del menú)
- ✅ **Configuración** — hub page antes de acceder a sub-secciones
- ✅ Dropdown siempre visible al pasar el cursor sobre cualquier parte de la sección (no solo el chevron)

---

---

## 2026-05-21 (sesión 2)

### Rama: `refactorizacion`

#### Correcciones de bugs
- ✅ `key={boolOpen}` en modales → claves estáticas únicas (FormularioPedidoProveedor, documentos)
- ✅ `setState` síncrono en `useEffect` → lazy initialization en ThemeSwitcher
- ✅ Dropdowns del nav: solo un dropdown abierto a la vez (estado JS, no CSS hover)
- ✅ Quitar "Ver todo en X →" del pie de dropdown (el label ya navega al hub)
- ✅ Cards del hub: fondo `bg-base-200` para distinguirse del fondo de la página

#### Fase B — Albaranes
- ✅ Modelos Prisma: `Albaran`, `AlbaranItem`; relaciones en `Pedido`, `Cliente`, `Producto`
- ✅ BD actualizada (`prisma db push`)
- ✅ API `GET/POST /api/albaranes`
- ✅ API `GET/PUT/DELETE /api/albaranes/[id]`
- ✅ API `GET /api/albaranes/[id]/pdf` (genera PDF con firma, totales, referencia al pedido)
- ✅ API `POST /api/pedidos/[id]/albaran` — genera albarán desde pedido (transacción)
- ✅ Página `/albaranes` — listado con filtro por estado y paginación
- ✅ Página `/albaranes/[id]` — detalle con cambio de estado y descarga PDF
- ✅ Página `/albaranes/nuevo` — selección de pedido para generar albarán
- ✅ Página `/pedidos/[id]` — botón "Generar albarán" + sección de albaranes vinculados
- ✅ Nav: "Nuevo albarán" y "Albaranes" activos (quitado `disabled: true`)
- ✅ Hub Ventas: cards de Albarán y Albaranes activas

---

## 2026-05-22

### Fase D — VeriFactu

- ✅ Modelo `ConfiguracionEmisor` en Prisma (NIF, nombre fiscal, dirección, modo pruebas/producción)
- ✅ `src/lib/verifactu.js` — cálculo de huella SHA-256 encadenada, generación XML AEAT, URL QR de verificación
- ✅ Al emitir factura (BORRADOR → EMITIDA): hash VeriFactu calculado automáticamente, `estadoEnvioAeat = PENDIENTE`
- ✅ Facturas EMITIDA/PAGADA son inmutables (solo rectificativas permitidas)
- ✅ API `POST /api/facturas/[id]/rectificativa` — crea facturas correctivas R1–R5 (Sustitución / Diferencias)
- ✅ API `GET /api/facturas/[id]/xml` — exporta XML VeriFactu individual, marca como EXPORTADO
- ✅ API `GET /api/facturas/exportar-aeat` — exporta lote de hasta 1000 facturas PENDIENTE; re-exporta EXPORTADO si no hay pendientes
- ✅ PDF de factura incluye QR VeriFactu con URL de verificación
- ✅ Página `/configuracion/emisor` — formulario NIF, nombre fiscal, dirección, modo test/prod
- ✅ Página `/facturas/[id]` — sección VeriFactu con estado envío, botón XML individual, botón rectificativa
- ✅ Página `/facturas` — listado con paginación, filtros por `clientId`, `albaranId`, `pedidoId`, `estado`
- ✅ Página `/facturas/[id]` — detalle completo con albarán/pedido vinculado, ítems, rectificativas

### Fase E — Cobros y vencimientos

- ✅ Campo `fechaPago DateTime?` añadido al modelo `Factura` en `schema.dev.prisma`
- ✅ `PUT /api/facturas/[id]` — auto-registra `fechaPago = now()` al cambiar estado a PAGADA
- ✅ Listado `/facturas` — badges **VENCIDA** (rojo) y **PRÓXIMA** (<7 días, amarillo) en columna de vencimiento
- ✅ Detalle `/facturas/[id]` — badges de vencimiento + fecha de pago cuando está disponible

### UI — Factura manual

- ✅ Página `/facturas/nuevo` rediseñada con dos pestañas:
  - **Manual**: selector de cliente SWR, líneas de ítems libres, fecha de vencimiento, notas, preview de totales en tiempo real
  - **Desde albarán**: flujo original de generación desde albarán emitido

### Seguridad S1–S13

- ✅ **S1/S2** — Autenticación PIN opcional vía `middleware.js` + cookie `crm-auth` (HttpOnly, SameSite=Strict, 8h)
  - `middleware.js` (raíz) — protege todas las rutas excepto `_next/*`, `/login`, `/api/auth/*`
  - `src/app/login/page.js` — pantalla de login con overlay (`fixed inset-0 z-[100]`)
  - `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/status`
  - `Encabezado.js` — botón de logout visible cuando `AUTH_PIN` está configurado
  - `.env.local` — `AUTH_PIN` comentado por defecto (desactivado en desarrollo)
- ✅ **S3** — Audit log al cambiar estado de factura (fire-and-forget `db.auditLog.create().catch(() => {})`)
- ✅ **S4** — Audit log al crear rectificativa
- ✅ **S7** — Cap de 5000 filas en exportación CSV (`GET /api/export/csv`)
- ✅ **S8** — Middleware S1 cubre todas las rutas API (no requiere cambios adicionales)
- ✅ **S9** — Rate limiting en `GET /api/informes`: 20 peticiones/min por IP, responde 429 con `Retry-After`
- ✅ **S11** — Eliminada exposición de `error.message` en 4 rutas de catch blocks
- ✅ **S13** — `src/lib/logger.js` con `logApiError(error, context)`: logs estructurados sin stack traces ni consultas SQL
  - Reemplazados todos los `console.error(error)` en los ~59 archivos de rutas API

---

## Backlog — por implementar (futuro)

### Fase B — Albaranes
- ✅ ~~Modelo Prisma: `Albaran`, `AlbaranItem`~~
- ✅ ~~Migración de base de datos~~
- ✅ ~~API `/api/albaranes/`~~
- ✅ ~~Página `/albaranes` (listado)~~
- ✅ ~~Flujo: Pedido → generar Albarán~~
- ✅ ~~PDF de albarán~~
- ✅ ~~Activar enlaces "Nuevo albarán" y "Albaranes" en nav~~

### Fase C — Facturas ✅
- ✅ ~~Modelo Prisma: `Factura`, `FacturaItem`~~
- ✅ ~~Migración de base de datos~~
- ✅ ~~API `/api/facturas/`~~
- ✅ ~~Página `/facturas` (listado)~~
- ✅ ~~Flujo: Albarán → generar Factura~~
- ✅ ~~PDF de factura (con desglose IVA + espacio reservado VeriFactu QR)~~
- ✅ ~~Activar enlaces "Nueva factura" y "Facturas" en nav~~

### Fase D — VeriFactu (obligatorio antes del 01/01/2027)
- ✅ ~~Configuración del emisor (NIF, nombre fiscal, dirección)~~
- ✅ ~~Hash encadenado SHA-256~~
- ✅ ~~Servicio de cálculo de huella digital~~
- ✅ ~~Servicio de generación XML (esquema AEAT)~~
- ✅ ~~QR en PDF de factura con enlace de verificación~~
- ✅ ~~Inmutabilidad de facturas (solo rectificativas)~~
- ✅ ~~Exportación por lotes (hasta 1000 facturas)~~
- ⏳ (Fase D2) Envío directo al webservice AEAT (actualmente solo exportación de archivo)

### Fase E — Cobros y vencimientos
- ✅ ~~Badges VENCIDA/PRÓXIMA en listado y detalle de facturas~~
- ✅ ~~Auto-registro de fecha de pago al marcar PAGADA~~
- ⏳ Panel "Facturas pendientes de cobro" en dashboard

### Fase E — Informes PDF
- ⏳ Botón "Exportar a PDF" en página de Informes
- ⏳ Informe de ventas por período
- ⏳ Informe de clientes / actividad

### Pendientes técnicos
- ⏳ Hub de Configuración: separar `/configuracion` (Márgenes) en `/configuracion/margenes` para que `/configuracion` sea solo el hub
- ⏳ PDF — texto de cliente desbordando recuadro en nota de trabajo (`src/app/api/pedidos/[id]/pdf/route.js`)
- ⏳ PDF — botón "Imprimir" directo desde el pedido (`src/app/pedidos/[id]/page.js`)
- ⏳ Pedidos — eliminar botón "Enviar Email" de la vista de detalle (`src/app/pedidos/[id]/page.js`)
- ⏳ Calculadora de Envíos — desglose detallado, botón "añadir al pedido", mejoras UX
