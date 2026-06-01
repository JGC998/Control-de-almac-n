# CRM Taller

Sistema de gestión integral para un taller de fabricación de bandas y cintas PVC. Cubre el ciclo completo: presupuesto → pedido → albarán → factura (con hash chain VeriFactu), gestión de stock de materias primas, pedidos a proveedores, calculadoras de precios, herramientas de importación y análisis de rentabilidad.

---

## Stack tecnológico

| Capa | Tecnología |
|------|------------|
| Framework | Next.js 16 (App Router, React 19) |
| ORM | Prisma 6 |
| Base de datos | SQLite (dev) · MySQL (prod) |
| UI | DaisyUI 5 + Tailwind CSS 4 — tema `corporate` |
| Fetching | SWR 2 |
| PDFs | jsPDF 3 + jspdf-autotable 5 |
| Hojas de cálculo | ExcelJS 4 |
| Email | Resend 6 |
| Gráficos | Recharts 3 |
| Validación | Zod 4 |
| QR codes | qrcode |

---

## Requisitos previos

- Node.js 20+
- npm 10+
- SQLite (incluido — solo para desarrollo)
- MySQL 8+ (solo para producción)

---

## Instalación y setup local

```bash
# 1. Instalar dependencias
npm install

# 2. Crear el archivo de variables de entorno
cp .env.example .env.local
# Editar .env.local si es necesario

# 3. Crear y sincronizar la base de datos de desarrollo (SQLite)
$env:DATABASE_URL = "file:./prisma/dev.db"  # PowerShell
npx prisma db push --schema=prisma/schema.dev.prisma

# 4. (Opcional) Cargar datos de prueba
npm run seed:mock

# 5. Arrancar el servidor de desarrollo
npm run dev
# → http://localhost:3000
```

> **Nota**: En PowerShell hay que establecer `$env:DATABASE_URL` antes de cada comando `prisma`. En bash: `DATABASE_URL=file:./prisma/dev.db npx prisma ...`

---

## Variables de entorno

| Variable | Descripción | Ejemplo | Requerida |
|----------|-------------|---------|-----------|
| `DATABASE_URL` | Cadena de conexión a la base de datos | `file:./prisma/dev.db` (dev) · `mysql://user:pass@host/db` (prod) | ✅ |
| `AUTH_PIN` | PIN de acceso (si se omite, la app es pública) | `1234` | ❌ |
| `RESEND_API_KEY` | Clave API de Resend para envío de emails | `re_xxxxxxxxxxxx` | ❌ |
| `RESEND_FROM` | Dirección de remitente para emails | `CRM Taller <no-reply@taller.com>` | ❌ |

---

## Scripts disponibles

```bash
npm run dev          # Servidor de desarrollo con Turbopack en localhost:3000
npm run dev:lan      # Igual pero accesible desde la red local (0.0.0.0) — para tablet/móvil
npm run build        # Build de producción
npm start            # Arranca el servidor de producción (requiere build previo)
npm run lint         # ESLint sobre todo el proyecto
npm run generate     # Regenera el cliente Prisma tras cambios de schema
npm run seed:mock    # Carga datos de prueba (clientes, pedidos, stock, tarifas...)
```

---

## Estructura del proyecto

```
.
├── prisma/
│   ├── schema.prisma          # Schema MySQL (producción)
│   ├── schema.dev.prisma      # Schema SQLite (desarrollo)
│   ├── dev.db                 # Base de datos SQLite local
│   └── seed-*.js              # Scripts de datos de prueba
│
├── public/
│   ├── logo-crm.png           # Logo (cacheado en memoria para PDFs)
│   ├── manifest.json          # PWA manifest (app instalable)
│   └── planos/                # Archivos de documentos subidos
│
├── src/
│   ├── app/
│   │   ├── api/               # Todas las rutas API (Next.js Route Handlers)
│   │   ├── layout.js          # Layout raíz con PWA meta tags
│   │   ├── page.js            # Dashboard principal
│   │   ├── pedidos/           # Listado, detalle, nuevo, nota de trabajo imprimible
│   │   ├── presupuestos/      # Listado, detalle, nuevo
│   │   ├── almacen/           # Gestión de stock
│   │   ├── gestion/           # Clientes, productos, fabricantes, materiales
│   │   ├── herramientas/      # Calculadora contenedor, carta de porte
│   │   ├── calculadora/       # Calculadora PVC, envíos, inversa
│   │   ├── informes/          # Informes, rentabilidad, historial de precios
│   │   ├── proveedores/       # Pedidos a proveedores
│   │   ├── tarifas/           # Gestión de tarifas de material
│   │   ├── configuracion/     # Ajustes, márgenes, logística, emisor VeriFactu
│   │   ├── tablet/            # Mini-app táctil para el taller
│   │   └── login/             # Pantalla de autenticación PIN
│   │
│   ├── componentes/
│   │   ├── layout/            # Encabezado con búsqueda global Ctrl+K, HubPage
│   │   ├── compuestos/        # TablaDatos, TablaConSeleccion (acciones en bloque), PaginaGestion
│   │   ├── pedidos/           # FormularioPedidoCliente, EditorFilaItem
│   │   ├── presupuestos/      # TemplateManager (plantillas reutilizables)
│   │   ├── modales/           # Modales de creación rápida y edición
│   │   └── ui/                # BarraBusqueda, BusquedaGlobal, filtros, paginación
│   │
│   └── lib/
│       ├── db.js              # Singleton Prisma (evita leaks en hot-reload)
│       ├── sequence.js        # Numeración automática con reset anual (PED-001-2026)
│       ├── pdfGenerator.js    # PDFs: presupuesto, pedido, albarán, factura, carta de porte
│       ├── validations.js     # Todos los schemas Zod
│       ├── logger.js          # logApiError — logs seguros sin stack traces
│       ├── audit.js           # logCreate / logUpdate / logDelete
│       ├── email.js           # Envío de emails vía Resend con PDF adjunto
│       ├── manejadores-api.js # handlePrismaError + crearManejadoresCRUD genérico
│       ├── rateLimiter.js     # Rate limiting en memoria (ventana deslizante 60 s)
│       ├── verifactu.js       # Hash SHA-256 encadenado + XML para AEAT
│       └── fetcher.js         # Fetcher global para SWR
│
├── middleware.js              # Auth PIN + redirección móvil + HSTS headers
├── CLAUDE.md                  # Guía de arquitectura para desarrollo con IA
├── CHANGELOG.md               # Historial detallado de cambios
└── ROADMAP.md                 # Estado del roadmap
```

---

## Base de datos

### Modelos (27)

| Modelo | Descripción |
|--------|-------------|
| `Cliente` | Clientes con NIF, categoría, tier, tarifas especiales |
| `Pedido` / `PedidoItem` | Pedidos de clientes con ítems, margen y estado |
| `Presupuesto` / `PresupuestoItem` | Presupuestos convertibles a pedido |
| `Albaran` / `AlbaranItem` | Albaranes de entrega generados desde pedido |
| `Factura` / `FacturaItem` | Facturas inmutables con hash VeriFactu |
| `Proveedor` | Proveedores (nacionales e importación) |
| `PedidoProveedor` / `BobinaPedido` | Pedidos de compra con bobinas |
| `Producto` | Catálogo de productos con precios escalonados |
| `Fabricante` | Fabricantes vinculados a productos |
| `Material` | Tipos de material (PVC, bandas, etc.) |
| `Stock` / `MovimientoStock` | Inventario de materias primas con historial |
| `ReferenciaBobina` | Referencias de bobinas con ancho, lonas, peso/m |
| `ReglaMargen` | Reglas de margen (multiplicador + gasto fijo) |
| `TarifaMaterial` | Precios por material, espesor y color |
| `TarifaRollo` | Precios por metro lineal de rollo |
| `TarifaTransporte` | Tarifas de transporte por provincia y tipología de palé |
| `TarifaCliente` | Precios especiales pactados por cliente |
| `ImportacionContenedor` | Cálculos de importación guardados (USD/M, gastos, €/metro por bobina) |
| `ConfigPaletizado` | Costes de paletizado (palé europeo / medio palé) |
| `PresupuestoTemplate` | Plantillas de líneas reutilizables |
| `Taco` / `Grapa` | Accesorios con precio por metro |
| `Documento` | Ficheros adjuntos por producto (PDF, imágenes) |
| `Nota` | Notas rápidas del tablón |
| `Config` | Configuración global clave-valor (IVA, datos empresa) |
| `Sequence` | Contadores anuales para numeración de documentos |
| `AuditLog` | Registro de auditoría de acciones CRUD |
| `ConfiguracionEmisor` | Datos del emisor para VeriFactu (NIF, nombre, dirección) |

### Flujo de documentos

```
Presupuesto ──► Pedido ──► Albarán ──► Factura
                                          │
                                    BORRADOR → EMITIDA
                                    (hash SHA-256 encadenado + XML AEAT)
```

Las facturas en estado `EMITIDA` o `PAGADA` son **inmutables**. Solo se pueden corregir con facturas rectificativas (R1–R5).

### Comandos de base de datos

```bash
# Desarrollo — sincronizar schema (SQLite)
$env:DATABASE_URL = "file:./prisma/dev.db"
npx prisma db push --schema=prisma/schema.dev.prisma

# Regenerar cliente Prisma tras cambiar schema
npm run generate

# Ver la base de datos en el navegador
npx prisma studio --schema=prisma/schema.dev.prisma

# Producción — aplicar migraciones MySQL
npx prisma migrate deploy --schema=prisma/schema.prisma
```

> Los dos schemas (`schema.prisma` MySQL y `schema.dev.prisma` SQLite) se mantienen **en sincronía manual**. La diferencia principal es el provider y que MySQL usa `@@fulltext` en `Cliente` y `Producto` para búsqueda eficiente.

---

## API — Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login con PIN |
| `POST` | `/api/auth/logout` | Cerrar sesión |
| `GET` | `/api/auth/status` | Estado de autenticación |

### Ventas — Presupuestos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/presupuestos` | Listar (paginado, filtros por estado, fecha, búsqueda) |
| `POST` | `/api/presupuestos` | Crear presupuesto |
| `GET/PUT/DELETE` | `/api/presupuestos/[id]` | Detalle / Editar / Eliminar |
| `POST` | `/api/presupuestos/[id]/email` | Enviar por email con PDF adjunto |
| `GET` | `/api/presupuestos/[id]/pdf` | Generar PDF |
| `POST` | `/api/presupuestos/bulk-update` | Cambio de estado en bloque (Aceptado/Rechazado) |
| `GET` | `/api/presupuestos/export` | Exportar a Excel |
| `GET/POST` | `/api/presupuestos/templates` | Plantillas de líneas reutilizables |
| `GET/PUT/DELETE` | `/api/presupuestos/templates/[id]` | Gestión de plantilla |

### Ventas — Pedidos

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/pedidos` | Listar (paginado, tabs facturables/internos, filtros) |
| `POST` | `/api/pedidos` | Crear pedido |
| `GET/PUT/PATCH/DELETE` | `/api/pedidos/[id]` | Detalle / Editar / Cambiar estado / Eliminar |
| `POST` | `/api/pedidos/[id]/email` | Enviar por email con PDF adjunto |
| `GET` | `/api/pedidos/[id]/pdf` | Generar PDF del pedido |
| `POST` | `/api/pedidos/bulk-update` | Cambio de estado en bloque (Facturado/Cancelado) |
| `GET` | `/api/pedidos/export` | Exportar a Excel |
| `POST` | `/api/pedidos/from-presupuesto` | Convertir presupuesto en pedido |

### Clientes

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/clientes` | Listar / Crear clientes |
| `GET/PUT/DELETE` | `/api/clientes/[id]` | Detalle / Editar / Eliminar |
| `GET` | `/api/clientes/[id]/resumen` | Stats, últimos pedidos y presupuestos |
| `GET` | `/api/clientes/[id]/historial-precios` | Historial de precios por referencia de producto |
| `GET/POST/PUT/DELETE` | `/api/tarifas-cliente` | Tarifas especiales pactadas por cliente |

### Compras a proveedores

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/proveedores` | Listar / Crear proveedores |
| `GET/PUT/DELETE` | `/api/proveedores/[id]` | Gestión de proveedor |
| `GET` | `/api/pedidos-proveedores-data` | Listar pedidos a proveedores (paginado) |
| `POST` | `/api/pedidos-proveedores-data` | Crear pedido a proveedor |
| `GET/PUT/DELETE` | `/api/pedidos-proveedores-data/[id]` | Gestión de pedido proveedor |
| `POST` | `/api/stock-management/receive-order` | Recibir pedido → actualizar stock automáticamente |
| `GET/POST/PUT/DELETE` | `/api/configuracion/referencias` | Referencias de bobina (ancho, lonas, peso/m) |

### Almacén y stock

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/api/almacen-stock` | Listar stock (filtros material, proveedor, disponibilidad) |
| `POST` | `/api/almacen-stock` | Entrada o salida de stock |
| `GET` | `/api/movimientos` | Historial de movimientos |
| `POST` | `/api/movimientos` | Registrar movimiento manual |
| `GET` | `/api/stock-info/available-meters` | Metros disponibles por material/espesor |

### Catálogo

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST` | `/api/productos` | Listar / Crear productos |
| `GET/PUT/DELETE` | `/api/productos/[id]` | Gestión de producto |
| `GET/POST` | `/api/materiales` | Materiales |
| `GET/PUT/DELETE` | `/api/materiales/[id]` | Gestión de material |
| `GET/POST` | `/api/fabricantes` | Fabricantes |
| `GET/PUT/DELETE` | `/api/fabricantes/[id]` | Gestión de fabricante |
| `GET/POST/PUT/DELETE` | `/api/catalogo` · `/api/catalogo/[id]` | Catálogo combinado |
| `GET/POST` | `/api/grapas` · `/api/grapas/[id]` | Grapas con precio/m |
| `GET/POST` | `/api/tacos` · `/api/tacos/[id]` | Tacos con precio/m |
| `GET/POST` | `/api/documentos` | Subida de documentos (PDF, JPEG, PNG, WebP) |
| `GET/DELETE` | `/api/documentos/[id]` | Gestión de documento |

### Precios y tarifas

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/POST/PUT/DELETE` | `/api/precios` | Tarifas de material (espesor + color) |
| `GET/PUT/DELETE` | `/api/precios/[id]` | Gestión de tarifa |
| `POST` | `/api/precios/bulk-update` | Actualización masiva de precios |
| `GET/POST` | `/api/tarifas-rollo` · `/api/tarifas-rollo/[id]` | Tarifas por metro lineal |
| `GET/POST/PUT/DELETE` | `/api/pricing/margenes` · `/api/pricing/margenes/[id]` | Reglas de margen |
| `POST` | `/api/pricing/calculate` | Calcular precio de venta desde coste |
| `POST` | `/api/pricing/inverse-calc` | Calcular coste máximo desde precio objetivo |
| `GET/POST/PUT/DELETE` | `/api/pricing/descuentos` | Descuentos por categoría |
| `GET/POST/PUT/DELETE` | `/api/pricing/especiales` | Precios especiales por producto-cliente |

### Logística

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/logistica/calcular` | Calcular coste de envío (provincia + tipología palé) |
| `GET` | `/api/logistica/tarifas` | Tarifas de transporte por provincia |
| `PUT` | `/api/logistica/tarifas/[id]` | Actualizar tarifa |
| `GET/PUT` | `/api/logistica/config-paletizado` | Costes de paletizado |

### Herramientas de importación

| Método | Ruta | Descripción |
|--------|------|-------------|
| `POST` | `/api/herramientas/carta-porte` | Generar PDF de carta de porte / albarán de expedición |
| `GET/POST` | `/api/importaciones` | Historial de cálculos de contenedor guardados |
| `GET/DELETE` | `/api/importaciones/[id]` | Gestión de importación |
| `GET` | `/api/importaciones/historico-bobinas` | Evolución USD/M y €/M real por referencia de bobina |

### Informes

| Método | Ruta | `tipo` disponibles |
|--------|------|--------------------|
| `GET` | `/api/informes` | `kpis` · `ventas-mensuales` · `top-clientes` · `ventas-por-producto` · `ventas-por-cliente` · `presupuestos-sin-respuesta` · `margen-pedidos` · `rentabilidad-clientes` |
| `GET` | `/api/dashboard` | KPIs del dashboard principal |

### Sistema y configuración

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET/PUT` | `/api/config` | Configuración global (IVA, nombre empresa, NIF, dirección…) |
| `GET` | `/api/config/backup` | Exportar configuración como JSON |
| `GET` | `/api/audit-log` | Registro de auditoría |
| `GET` | `/api/busqueda` | Búsqueda global (clientes, pedidos, presupuestos, productos) |
| `GET` | `/api/export/csv` | Exportar cualquier modelo a CSV |
| `GET/POST` | `/api/notas` | Notas del tablón principal |
| `GET` | `/api/maquinaria/procesos` | Procesos de maquinaria asociados a productos |

---

## Autenticación

Si `AUTH_PIN` está definido, toda la app queda protegida. El middleware:

1. Verifica la cookie `crm-auth` con `timingSafeEqual` (previene timing attacks)
2. Redirige páginas sin sesión a `/login?redirect=...`
3. Devuelve `401 JSON` a las llamadas API sin sesión
4. Añade `Strict-Transport-Security` en producción
5. Detecta User-Agent móvil y redirige `/` → `/tablet`

Si `AUTH_PIN` no está definido la app es pública (útil en red local cerrada).

---

## PWA — App instalable

`public/manifest.json` habilita la instalación como app nativa:

- `display: standalone` — sin barra del navegador
- Shortcuts: "Nuevo pedido" (`/pedidos/nuevo`) y "Stock" (`/tablet`)
- Meta tags Apple en `layout.js` para iOS

Para instalar: Chrome/Safari → "Añadir a pantalla de inicio".

---

## Funcionalidades destacadas

| Funcionalidad | Descripción |
|---------------|-------------|
| **Búsqueda global Ctrl+K** | Modal con resultados agrupados por tipo, navegación ↑↓/Enter/Esc |
| **Acciones en bloque** | Checkbox multi-selección en listados + barra flotante con cambio de estado y exportación CSV |
| **Calculadora de contenedor** | Gastos de importación: `suplidos + exentos` se repercuten en el €/metro; `sujetos` solo se almacenan. Prorrateo por valor económico de cada bobina. Historial guardable |
| **Carta de porte** | PDF con expedidor (prefilled desde config), destinatario, mercancías e inventario de palés por bobina |
| **Tarifas por cliente** | Precios pactados que aparecen como sugerencia al crear pedidos/presupuestos |
| **Historial de precios** | Por cliente: último precio, media, mín/máx y frecuencia por referencia |
| **Plantillas de pedido** | Guardar y cargar combinaciones de líneas; disponible tanto en pedidos como en presupuestos |
| **Nota de trabajo** | Vista imprimible del pedido sin precios para el operario del taller (`/pedidos/[id]/nota-trabajo`) |
| **Informes de rentabilidad** | Margen bruto por pedido, rentabilidad por cliente, evolución histórica de USD/M por bobina |
| **Mini-app tablet** | `/tablet` — interfaz táctil optimizada: tarifas, stock, calculadora de precios, pedidos pendientes |
| **VeriFactu D.1** | Hash SHA-256 encadenado en facturas + exportación XML para envío manual al webservice AEAT |

---

## Despliegue en producción

```bash
# 1. Variables de entorno en el servidor
DATABASE_URL="mysql://user:password@host:3306/crm_taller"
AUTH_PIN="pin_seguro"
RESEND_API_KEY="re_xxxxxxxxxxxx"
RESEND_FROM="CRM Taller <no-reply@tudominio.com>"

# 2. Instalar dependencias
npm ci

# 3. Aplicar migraciones MySQL
npx prisma migrate deploy --schema=prisma/schema.prisma

# 4. Generar el cliente Prisma
npm run generate

# 5. Build
npm run build

# 6. Arrancar (recomendado con PM2)
pm2 start "npm start" --name crm-taller
pm2 save
```

---

## Seguridad implementada

| Medida | Dónde |
|--------|-------|
| PIN con `timingSafeEqual` | `middleware.js` |
| Rate limiting (20 req/min) | `/api/informes`, exports Excel |
| Validación Zod en todos los POST/PUT | `src/lib/validations.js` |
| Logs sin stack traces ni query internals | `src/lib/logger.js` |
| Headers CSP, X-Frame-Options, HSTS | `middleware.js` |
| MIME whitelist en upload de documentos | `/api/documentos` |
| Parámetros preparados (Prisma ORM) | Todas las queries |
| Audit trail de acciones CRUD | `src/lib/audit.js` |

---

## Convenciones de código

```js
// Logging — nunca console.error directamente
import { logApiError } from '@/lib/logger';
logApiError(error, 'contexto opcional');

// Audit trail — fire-and-forget, no bloquea la respuesta
db.auditLog.create({ data: { action, entity, entityId, details } }).catch(() => {});

// Validación en POST/PUT
const result = schema.safeParse(body);
if (!result.success) {
  return NextResponse.json(
    { error: 'Datos inválidos', errors: result.error.flatten().fieldErrors },
    { status: 400 }
  );
}
```

> **DaisyUI 5**: usar siempre nombres de clase estáticos. Nunca construir clases con template literals — Tailwind no las genera en el build.
