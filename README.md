# CRM Taller — Control de Almacén

Aplicación web de gestión integral para un taller especializado en la fabricación de piezas de PVC y bandas transportadoras. Cubre el ciclo completo: presupuestos → pedidos → albaranes (en rama `dev`) → stock de materias primas, junto con un catálogo de productos, tarifas, calculadoras de precio y generación de PDFs.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) + React 19 |
| Base de datos | MySQL (producción) / SQLite (desarrollo) vía Prisma 6 |
| ORM | Prisma 6 — dos schemas: `schema.prisma` (MySQL) y `schema.dev.prisma` (SQLite) |
| Estilos | Tailwind CSS 4 + DaisyUI 5 — tema `corporate` |
| Datos cliente | SWR 2 para data fetching reactivo |
| PDF | jsPDF 3 + jspdf-autotable 5 |
| Excel | ExcelJS 4 |
| Email | Resend 6 |
| Gráficos | Recharts 3 |
| QR | qrcode 1.5 |
| Validación | Zod 4 |
| Auth | PIN opcional vía `middleware.js` (cookie `crm-auth`) |
| Icons | Lucide React |

---

## Requisitos previos

- **Node.js 22** — `nvm install 22 && nvm use 22`
- **Git**
- **MySQL 8+** (solo en producción; desarrollo usa SQLite incluido en el repo)

---

## Instalación y setup

### Desarrollo local (SQLite)

```bash
# 1. Clonar el repositorio
git clone <url-del-repo>
cd "Control-de-almac-n"

# 2. Instalar dependencias
npm install

# 3. Crear archivo de entorno
cp .env.example .env.local
# DATABASE_URL ya apunta a SQLite — no hace falta cambiar nada para desarrollo

# 4. Generar cliente Prisma con el schema de desarrollo
DATABASE_URL="file:./prisma/dev.db" npx prisma generate --schema=prisma/schema.dev.prisma

# 5. Levantar servidor de desarrollo
npm run dev
```

La app estará disponible en **http://localhost:3000**

> La base de datos SQLite de desarrollo (`prisma/dev.db`) ya está incluida en el repo con datos mock realistas.

### Aplicar cambios de schema en dev

```bash
DATABASE_URL="file:./prisma/dev.db" npx prisma db push --schema=prisma/schema.dev.prisma
```

### Si hay errores de Prisma tras un `git pull`

```bash
rm -rf .next
npm run dev
```

---

## Variables de entorno

Copia `.env.example` a `.env.local` y configura:

| Variable | Descripción | Ejemplo | Requerida |
|----------|-------------|---------|-----------|
| `DATABASE_URL` | Cadena de conexión a la base de datos | `file:./prisma/dev.db` (dev) / `mysql://user:pass@host:3306/dbname` (prod) | ✅ |
| `AUTH_PIN` | PIN de 4+ dígitos para proteger la app. Si no se define, la app es pública | `1234` | No |
| `RESEND_API_KEY` | API key de Resend para envío de emails | `re_xxxxxxxxxxxx` | No |
| `RESEND_FROM` | Dirección de remitente para emails | `CRM Taller <noreply@tudominio.com>` | No |

> Si `RESEND_API_KEY` no está definida, los envíos de email se simulan con logs en consola (sin error).

---

## Scripts disponibles

```bash
npm run dev        # Servidor de desarrollo con Turbopack (http://localhost:3000)
npm run build      # Build de producción
npm run start      # Servidor de producción (requiere build previo)
npm run lint       # Linting con ESLint
npm run generate   # Regenerar cliente Prisma (prisma generate)
npm run seed:mock  # Poblar la BD de desarrollo con datos de prueba
```

---

## Estructura del proyecto

```
Control-de-almac-n/
├── middleware.js              # Auth PIN + cabeceras de seguridad (HSTS en prod)
├── next.config.mjs            # Headers CSP, X-Frame-Options, etc.
├── prisma/
│   ├── schema.prisma          # Schema MySQL (producción)
│   ├── schema.dev.prisma      # Schema SQLite (desarrollo)
│   ├── dev.db                 # Base de datos SQLite con datos mock
│   └── seed-mock.js           # Seed de datos de prueba
├── src/
│   ├── app/
│   │   ├── api/               # Todos los endpoints de la API (Next.js Route Handlers)
│   │   ├── page.js            # Dashboard / inicio
│   │   ├── pedidos/           # Listado, detalle y creación de pedidos
│   │   ├── presupuestos/      # Listado, detalle, edición y creación de presupuestos
│   │   ├── proveedores/       # Pedidos a proveedores (nacional e importación)
│   │   ├── almacen/           # Hub almacén + stock de bobinas
│   │   ├── gestion/           # Clientes, productos, catálogos (materiales, fabricantes, proveedores)
│   │   ├── calculadora/       # Calculadora PVC, bandas, inversa y logística
│   │   ├── tarifas/           # Tarifas de material
│   │   ├── informes/          # Estadísticas y gráficos de ventas
│   │   ├── configuracion/     # Hub configuración: márgenes, tacos, logística, audit log
│   │   └── login/             # Pantalla de autenticación PIN
│   ├── componentes/           # Componentes React reutilizables
│   │   ├── layout/            # Encabezado (topnav con dropdowns), HubPage
│   │   ├── patrones/          # PaginaGestion (CRUD genérico completo en ~30 líneas)
│   │   ├── compuestos/        # TablaDatos, FormularioModal, FormularioEntidad
│   │   ├── calculadoras/      # CalculadoraBandas, CalculadoraLogistica, CalculadoraInversa
│   │   ├── modales/           # Modales reutilizables (cliente, producto, precios, búsqueda bandas)
│   │   ├── graficos/          # GraficoVentas, GraficoEstadisticas (Recharts)
│   │   └── ui/                # Primitivos: TarjetaKPI, Paginacion, FiltroBusqueda, Toaster, etc.
│   ├── lib/
│   │   ├── db.js              # Singleton Prisma (evita connection leaks en hot-reload)
│   │   ├── pdfGenerator.js    # Generación de PDFs para presupuestos y pedidos (jsPDF)
│   │   ├── sequence.js        # Numeración automática de documentos (PED-001-2026, etc.)
│   │   ├── validations.js     # Todos los schemas Zod
│   │   ├── logger.js          # logApiError — logs estructurados sin stack traces
│   │   ├── rateLimiter.js     # Rate limiting en memoria (ventana deslizante 60s)
│   │   ├── email.js           # Envío de emails via Resend
│   │   ├── audit.js           # logCreate/logUpdate/logDelete para audit trail
│   │   └── manejadores-api.js # handlePrismaError para errores DB comunes
│   └── utils/
│       ├── utilidades.js      # Helpers de respuesta API (manejarErrorApi, etc.)
│       └── helpers-matematicos.js
└── tests/                     # Tests Playwright (e2e)
```

---

## API — Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Validar PIN, crear cookie `crm-auth` |
| POST | `/api/auth/logout` | Eliminar cookie de sesión |
| GET | `/api/auth/status` | Comprobar si auth está activa y si hay sesión |

### Ventas — Presupuestos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/presupuestos` | Listado paginado (`?page`, `?limit`, `?estado`, `?q`) |
| POST | `/api/presupuestos` | Crear nuevo presupuesto con ítems |
| GET | `/api/presupuestos/[id]` | Detalle de un presupuesto |
| PUT | `/api/presupuestos/[id]` | Actualizar presupuesto |
| DELETE | `/api/presupuestos/[id]` | Eliminar presupuesto |
| GET | `/api/presupuestos/[id]/pdf` | Generar PDF del presupuesto |
| POST | `/api/presupuestos/[id]/email` | Enviar presupuesto por email (con PDF adjunto) |
| GET | `/api/presupuestos/export` | Exportar listado a Excel (máx. 5000, rate limited) |
| GET/POST | `/api/presupuestos/templates` | Plantillas de presupuesto |
| GET/PUT/DELETE | `/api/presupuestos/templates/[id]` | Gestión individual de plantilla |

### Ventas — Pedidos de clientes
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/pedidos` | Listado paginado (`?page`, `?limit`, `?estado`, `?q`, `?tab`) |
| POST | `/api/pedidos` | Crear pedido manualmente |
| GET | `/api/pedidos/[id]` | Detalle del pedido |
| PUT | `/api/pedidos/[id]` | Actualizar pedido |
| DELETE | `/api/pedidos/[id]` | Eliminar pedido |
| GET | `/api/pedidos/[id]/pdf` | Generar PDF del pedido |
| POST | `/api/pedidos/[id]/email` | Enviar pedido por email |
| POST | `/api/pedidos/from-presupuesto` | Crear pedido desde presupuesto existente |
| GET | `/api/pedidos/export` | Exportar a Excel (máx. 5000, rate limited) |

### Compras — Pedidos a proveedores
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/pedidos-proveedores-data` | Listado de pedidos a proveedores |
| POST | `/api/pedidos-proveedores-data` | Crear nuevo pedido a proveedor |
| GET | `/api/pedidos-proveedores-data/[id]` | Detalle del pedido |
| PUT | `/api/pedidos-proveedores-data/[id]` | Actualizar pedido (Zod validado) |
| DELETE | `/api/pedidos-proveedores-data/[id]` | Eliminar pedido + bobinas |
| POST | `/api/stock-management/receive-order` | Marcar pedido como Recibido → crear entradas de stock |

### Almacén — Stock
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/almacen-stock` | Listado de stock de bobinas |
| POST | `/api/almacen-stock` | Añadir o registrar salida de stock |
| GET | `/api/movimientos` | Historial de movimientos de stock |
| GET | `/api/stock-info/available-meters` | Metros disponibles por material/espesor |

### Catálogos
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/clientes` | Listado y creación de clientes |
| GET/PUT/DELETE | `/api/clientes/[id]` | Gestión individual |
| GET | `/api/clientes/[id]/resumen` | Resumen de actividad del cliente |
| GET/POST | `/api/proveedores` | Listado y creación de proveedores |
| GET/PUT/DELETE | `/api/proveedores/[id]` | Gestión individual |
| GET/POST | `/api/productos` | Listado y creación de productos |
| GET/PUT/DELETE | `/api/productos/[id]` | Gestión individual |
| GET/POST | `/api/materiales` | Catálogo de materiales |
| GET/PUT/DELETE | `/api/materiales/[id]` | Gestión individual |
| GET/POST | `/api/fabricantes` | Catálogo de fabricantes |
| GET/PUT/DELETE | `/api/fabricantes/[id]` | Gestión individual |

### Precios y tarifas
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/precios` | Tarifas de material (m²) |
| GET/PUT/DELETE | `/api/precios/[id]` | Gestión individual |
| POST | `/api/precios/bulk-update` | Actualización masiva por porcentaje (ORM, sin SQL injection) |
| GET/POST | `/api/tarifas-rollo` | Tarifas por rollo/metro lineal |
| GET/PUT/DELETE | `/api/tarifas-rollo/[id]` | Gestión individual |
| GET/POST | `/api/pricing/margenes` | Reglas de margen (multiplicador + gasto fijo) |
| GET/PUT/DELETE | `/api/pricing/margenes/[id]` | Gestión individual |
| POST | `/api/pricing/calculate` | Calcular precio de venta a partir de coste |
| POST | `/api/pricing/inverse-calc` | Calcular coste dado un precio de venta |
| GET/POST | `/api/pricing/descuentos` | Descuentos por tier de cliente |
| GET/POST | `/api/configuracion/referencias` | Referencias de bobinas |
| GET/PUT/DELETE | `/api/configuracion/referencias/[id]` | Gestión individual |

### Logística y envíos
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/logistica/calcular` | Calcular coste de envío por provincia/peso |
| GET/POST | `/api/logistica/tarifas` | Tarifas de transporte por provincia |
| GET/PUT/DELETE | `/api/logistica/tarifas/[id]` | Gestión individual |
| GET/PUT | `/api/logistica/config-paletizado` | Configuración de costes de paletizado |

### Configuración y utilidades
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | `/api/tacos` | Catálogo de tacos (PVC) |
| GET/PUT/DELETE | `/api/tacos/[id]` | Gestión individual |
| GET/POST | `/api/grapas` | Catálogo de grapas |
| GET/PUT/DELETE | `/api/grapas/[id]` | Gestión individual |
| GET/PUT | `/api/config` | Configuración global (IVA, datos empresa, etc.) |
| GET | `/api/config/backup` | Descarga backup JSON de la BD (rate limited, audit log) |
| GET | `/api/audit-log` | Registro de auditoría (acciones sobre facturas, etc.) |
| GET | `/api/informes` | Estadísticas: ventas mensuales, top clientes, etc. |
| GET | `/api/dashboard` | KPIs del panel de inicio |
| GET | `/api/busqueda` | Búsqueda global (clientes, productos, pedidos) |
| GET | `/api/export/csv` | Exportar modelo a CSV (máx. 5000 filas) |
| GET | `/api/notas` + POST | Tablón de notas rápidas |
| GET/POST | `/api/documentos` | Documentos adjuntos (PDFs, imágenes — MIME validado) |
| GET/DELETE | `/api/documentos/[id]` | Gestión individual |
| GET | `/api/maquinaria/procesos` | Parámetros de procesos de fabricación |
| GET/POST | `/api/plantillas` | Plantillas de productos |
| GET/PUT/DELETE | `/api/plantillas/[id]` | Gestión individual |
| GET/POST | `/api/catalogo` | Catálogo general |

---

## Base de datos

### Modelos principales (MySQL / SQLite)

| Modelo | Descripción |
|--------|-------------|
| `Cliente` | Clientes con NIF, tier y categoría |
| `Pedido` + `PedidoItem` | Pedidos de clientes con ítems y margen |
| `Presupuesto` + `PresupuestoItem` | Presupuestos convertibles a pedido |
| `PedidoProveedor` + `BobinaPedido` | Pedidos de compra (nacional/importación) con bobinas |
| `Stock` + `MovimientoStock` | Inventario de materias primas con historial |
| `Producto` | Catálogo de productos con precios y dimensiones |
| `TarifaMaterial` | Tarifas por material, espesor y color |
| `TarifaRollo` | Tarifas por metro lineal |
| `ReglaMargen` | Reglas de margen por base y tier de cliente |
| `Taco` / `Grapa` | Accesorios de unión con precio por metro |
| `TarifaTransporte` | Tarifas logísticas por provincia y código postal |
| `Config` | Configuración clave-valor (IVA, datos empresa) |
| `Sequence` | Contadores anuales para numeración de documentos |
| `AuditLog` | Registro de auditoría de acciones |
| `Documento` | Archivos adjuntos vinculados a productos |
| `Nota` | Notas rápidas del tablón |
| `PresupuestoTemplate` | Plantillas de presupuesto reutilizables |

### Numeración de documentos

`src/lib/sequence.js` — genera números del tipo `PED-001-2026`. Los contadores se reinician automáticamente cada año. Tipos: `pedido`, `presupuesto`.

### Inicializar base de datos de desarrollo

```bash
# Aplicar schema a SQLite
DATABASE_URL="file:./prisma/dev.db" npx prisma db push --schema=prisma/schema.dev.prisma

# Poblar con datos de prueba
npm run seed:mock
```

### Producción (MySQL)

```bash
# Regenerar cliente Prisma con schema MySQL
npx prisma generate

# Aplicar migraciones (en el servidor)
npx prisma migrate deploy
```

---

## Autenticación

La autenticación es **opcional**. Si `AUTH_PIN` no está definida en `.env.local`, la app es completamente pública.

Si está definida, el `middleware.js` protege todas las rutas (excepto `_next/*`, `/login`, `/api/auth/*`). Las APIs devuelven `401 JSON` y las páginas redirigen a `/login`.

- Cookie: `crm-auth` (HttpOnly, SameSite=Strict, 8 horas)
- La comparación de PIN usa `timingSafeEqual` (resistente a timing attacks)

---

## Seguridad

- **CSP** configurada en `next.config.mjs`: `default-src 'self'`, `frame-ancestors 'none'`
- **Headers**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `X-XSS-Protection`, `Referrer-Policy`
- **HSTS** en producción (via middleware)
- **Rate limiting** en exports Excel y `/api/informes` (ventana 60s en memoria)
- **Validación Zod** en todos los endpoints POST/PUT
- **Sin SQL raw**: toda la BD usa el ORM Prisma
- **MIME whitelist** en subida de documentos (PDF, JPEG, PNG, WebP)
- **Audit log** en acciones sensibles (facturas, backups)

---

## Despliegue

El proyecto corre en producción con **PM2** sobre un servidor local en red (`192.168.1.250`).

```bash
# En el servidor — actualizar y reiniciar
git pull origin dev
npm install
npm run build
pm2 restart crm-taller
```

Variables de entorno requeridas en producción:
- `DATABASE_URL` — conexión MySQL
- `NODE_ENV=production` — activa HSTS y otras protecciones
- `AUTH_PIN` — proteger acceso (recomendado)
- `RESEND_API_KEY` + `RESEND_FROM` — si se usan emails

---

## Páginas de la aplicación

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard con KPIs, pedidos pendientes y stock bajo |
| `/pedidos` | Listado de pedidos (facturables e internos) |
| `/pedidos/nuevo` | Crear nuevo pedido |
| `/pedidos/[id]` | Detalle: estado, ítems, PDF, email |
| `/presupuestos` | Listado de presupuestos |
| `/presupuestos/nuevo` | Crear presupuesto con ítems y plantillas |
| `/presupuestos/[id]` | Detalle: convertir a pedido, descargar PDF, enviar email |
| `/presupuestos/[id]/editar` | Editar presupuesto existente |
| `/proveedores` | Pedidos a proveedores |
| `/proveedores/nuevo-nacional` | Crear pedido nacional |
| `/proveedores/nuevo-importacion` | Crear importación (con tasa de cambio y naviera) |
| `/proveedores/[id]/editar` | Editar pedido a proveedor |
| `/almacen` | Hub de almacén |
| `/almacen/stock` | Inventario de bobinas con entradas/salidas |
| `/gestion/clientes` | Listado de clientes |
| `/gestion/clientes/[id]` | Ficha cliente con historial de pedidos |
| `/gestion/productos` | Catálogo de productos |
| `/gestion/productos/[id]` | Detalle de producto con documentos adjuntos |
| `/gestion/catalogos/materiales` | Gestión de materiales |
| `/gestion/catalogos/fabricantes` | Gestión de fabricantes |
| `/gestion/catalogos/proveedores` | Gestión de proveedores |
| `/tarifas` | Tarifas de material por espesor y color |
| `/calculadora` | Calculadora de piezas PVC |
| `/calculadora/bandas` | Calculadora de bandas transportadoras con tacos y grapas |
| `/calculadora/logistica` | Calculadora de costes de envío |
| `/calculadora/inversa` | Calcular coste desde precio de venta |
| `/informes` | Ventas mensuales, top clientes, estadísticas |
| `/configuracion` | Hub de configuración |
| `/configuracion/margenes` | Reglas de margen y precios especiales |
| `/configuracion/logistica` | Tarifas de transporte y paletizado |
| `/configuracion/tacos` | Catálogo de tacos y grapas |
| `/configuracion/audit-log` | Visor del registro de auditoría |
| `/busqueda` | Búsqueda global |
| `/login` | Pantalla de autenticación PIN |
