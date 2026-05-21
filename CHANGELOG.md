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
- ⏳ Configuración del emisor (NIF, nombre fiscal, dirección)
- ⏳ Modelo `RegistroVeriFactu` (hash encadenado SHA-256)
- ⏳ Servicio de cálculo de huella digital
- ⏳ Servicio de generación XML (esquema AEAT)
- ⏳ QR en PDF de factura con enlace de verificación
- ⏳ Inmutabilidad de facturas (solo rectificativas)
- ⏳ (Fase D2) Envío al webservice AEAT

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
