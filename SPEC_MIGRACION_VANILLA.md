# ESPECIFICACIÓN COMPLETA — MIGRACIÓN A HTML/CSS/JS VANILLA

> **Propósito:** Este documento es la especificación técnica exhaustiva del CRM de taller para que un desarrollador o IA pueda reconstruir la aplicación completa desde cero usando HTML, CSS y JavaScript puro, sin frameworks como React o Next.js. Toda la lógica de negocio, estructura de datos y comportamientos de la interfaz están documentados aquí.

---

## 0. DECISIÓN ARQUITECTÓNICA

### Stack propuesto

| Capa | Tecnología | Justificación |
|------|------------|---------------|
| **Backend** | Node.js + Express.js | Simple, maduro, sin magia. Dura décadas. |
| **ORM** | Prisma + PostgreSQL | Mantener la base de datos exactamente igual, sin migración de datos. |
| **Frontend** | HTML + CSS + JS vanilla | Sin transpilación, sin bundler, funciona en cualquier navegador. |
| **CSS** | Tailwind CDN + DaisyUI CDN | Mismo aspecto visual, sin compilación. |
| **Iconos** | Lucide (CDN) | Mismos iconos, sin dependencias de React. |
| **PDF** | jsPDF + jspdf-autotable (CDN browser) | Funciona en navegador directamente. |
| **Gráficos** | Chart.js (CDN) | Reemplaza Recharts, sin dependencia de React. |
| **Excel/CSV** | SheetJS (xlsx CDN) | Exportación a Excel desde el navegador. |
| **Email** | Resend API (desde backend) | Sin cambios, misma integración. |
| **Autenticación** | Sessions con express-session + bcrypt | Simple, suficiente para una app interna. |

### Estructura de carpetas del nuevo proyecto

```
crm-taller/
├── server/
│   ├── index.js              # Entrada principal Express
│   ├── routes/               # Rutas Express (equivalentes a api/)
│   │   ├── clientes.js
│   │   ├── pedidos.js
│   │   ├── presupuestos.js
│   │   ├── productos.js
│   │   ├── proveedores.js
│   │   ├── stock.js
│   │   ├── config.js
│   │   ├── grapas.js
│   │   ├── tacos.js
│   │   ├── tarifas.js
│   │   ├── precios.js
│   │   ├── informes.js
│   │   ├── documentos.js
│   │   ├── audit.js
│   │   ├── busqueda.js
│   │   ├── pdf.js
│   │   ├── email.js
│   │   └── logistica.js
│   ├── lib/
│   │   ├── db.js             # Prisma client singleton
│   │   ├── audit.js          # Funciones de audit log
│   │   ├── pdf.js            # Generación de PDFs (Node)
│   │   ├── email.js          # Resend integration
│   │   ├── sequence.js       # Generador de números de documento
│   │   └── validations.js    # Validación con Zod
│   └── prisma/
│       └── schema.prisma     # Sin cambios respecto al actual
├── public/
│   ├── index.html            # Shell SPA único
│   ├── css/
│   │   └── app.css           # Estilos extra
│   ├── js/
│   │   ├── app.js            # Router SPA + inicialización
│   │   ├── api.js            # Capa de llamadas fetch al backend
│   │   ├── utils.js          # Utilidades (formatCurrency, fechas, etc.)
│   │   ├── pdf-client.js     # Generación PDF en navegador
│   │   └── pages/            # Módulos JS por página
│   │       ├── dashboard.js
│   │       ├── clientes.js
│   │       ├── clientes-detalle.js
│   │       ├── pedidos.js
│   │       ├── pedidos-nuevo.js
│   │       ├── pedidos-detalle.js
│   │       ├── presupuestos.js
│   │       ├── presupuestos-nuevo.js
│   │       ├── presupuestos-detalle.js
│   │       ├── productos.js
│   │       ├── almacen.js
│   │       ├── proveedores.js
│   │       ├── calculadora-bandas.js
│   │       ├── calculadora-inversa.js
│   │       ├── calculadora-logistica.js
│   │       ├── configuracion.js
│   │       ├── tarifas.js
│   │       ├── informes.js
│   │       ├── audit-log.js
│   │       └── busqueda.js
│   └── templates/            # Fragmentos HTML reutilizables
│       ├── layout.html       # Sidebar + header shell
│       └── modales/          # HTML de modales
├── package.json
└── .env
```

---

## 1. BASE DE DATOS — ESQUEMA PRISMA (SIN CAMBIOS)

Mantener exactamente el mismo `schema.prisma` actual. No hay que migrar datos.

### Modelos y sus campos

#### `Cliente`
```
id           String  @id @default(uuid())
nombre       String  @unique
email        String?
direccion    String?
telefono     String?
tier         String?   // Nivel del cliente: FABRICANTE, INTERMEDIARIO, FINAL
categoria    String?   // Categoría libre
pedidos      Pedido[]
presupuestos Presupuesto[]
```

#### `Pedido` (Pedido de cliente)
```
id            String   @id @default(uuid())
numero        String   @unique           // Formato: PED-001-2026
fechaCreacion DateTime @default(now())
estado        String                     // Borrador | Pendiente | Enviado | Completado | Cancelado
notas         String?
subtotal      Float
tax           Float                      // Importe IVA (no porcentaje)
total         Float
clienteId     String?
presupuestoId String?  @unique           // Si fue creado desde presupuesto
marginId      String?                    // ID de ReglaMargen aplicada
cliente       Cliente?
presupuesto   Presupuesto?
items         PedidoItem[]
```

#### `PedidoItem` (Línea de pedido)
```
id               String  @id @default(uuid())
descripcion      String
quantity         Int
unitPrice        Float
pesoUnitario     Float   @default(0)
detallesTecnicos String?   // JSON: { dimensiones, color, tipoConfeccion, grapa, tacos }
pedidoId         String
productoId       String?
pedido           Pedido   (OnDelete: Cascade)
producto         Producto?
```

#### `Presupuesto` (Presupuesto/oferta)
```
id            String   @id @default(uuid())
numero        String   @unique           // Formato: PRES-001-2026
fechaCreacion DateTime @default(now())
estado        String                     // Borrador | Enviado | Aceptado | Rechazado | Expirado
notas         String?
subtotal      Float
tax           Float
total         Float
clienteId     String?
marginId      String?
cliente       Cliente?
items         PresupuestoItem[]
pedido        Pedido?                    // Si fue convertido a pedido
```

#### `PresupuestoItem`
```
id               String  @id @default(uuid())
descripcion      String
quantity         Int
unitPrice        Float
pesoUnitario     Float   @default(0)
detallesTecnicos String?
presupuestoId    String
productoId       String?
```

#### `Producto`
```
id                  String  @id @default(uuid())
nombre              String
referenciaFabricante String?
espesor             Float?
largo               Float?
ancho               Float?
precioUnitario      Float   @default(0)   // Precio de venta general
pesoUnitario        Float   @default(0)
costoUnitario       Float?
tieneTroquel        Boolean @default(false)
color               String?
fabricanteId        String?
materialId          String?
precioVentaFab      Float   @default(0)   // Precio para FABRICANTE
precioVentaInt      Float   @default(0)   // Precio para INTERMEDIARIO
precioVentaFin      Float   @default(0)   // Precio para FINAL
creadoEn            DateTime @default(now())
actualizado         DateTime @updatedAt
fabricante          Fabricante?
material            Material?
itemsPedido         PedidoItem[]
itemsPresup         PresupuestoItem[]
documentos          Documento[]
```

#### `Proveedor`
```
id        String @id @default(uuid())
nombre    String @unique
email     String?
telefono  String?
direccion String?
pedidos   PedidoProveedor[]
```

#### `PedidoProveedor` (Pedido a proveedor)
```
id                   String    @id @default(uuid())
material             String
fecha                DateTime  @default(now())
estado               String    // Pendiente | En tránsito | Recibido | Cancelado
tipo                 String    @default("NACIONAL")  // NACIONAL | IMPORTACION
notas                String?
numeroFactura        String?
gastosTotales        Float     @default(0)
tasaCambio           Float     @default(1)    // Para importaciones en divisa
numeroContenedor     String?
naviera              String?
fechaLlegadaEstimada DateTime?
proveedorId          String
proveedor            Proveedor
bobinas              BobinaPedido[]
```

#### `BobinaPedido` (Bobina dentro de pedido a proveedor)
```
id           String  @id @default(uuid())
cantidad     Int     @default(1)
pedidoId     String
ancho        Float?   // mm
largo        Float?   // m
espesor      Float?   // mm
precioMetro  Float    @default(0)
referenciaId String?
pedido       PedidoProveedor (OnDelete: Cascade)
referencia   ReferenciaBobina?
```

#### `ReferenciaBobina` (Catálogo maestro de bobinas)
```
id                 String @id @default(uuid())
referencia         String
ancho              Float?
lonas              Float?
pesoPorMetroLineal Float?
bobinas            BobinaPedido[]
@@unique([referencia, ancho, lonas])
```

#### `ReglaMargen` (Regla de margen de precios)
```
id            String  @id @default(uuid())
base          String  @unique   // Identificador único de la regla
multiplicador Float             // Ej: 1.35 = margen 35%
gastoFijo     Float?            // Gasto fijo adicional en €
descripcion   String            // Nombre descriptivo
tierCliente   String?           // FABRICANTE | INTERMEDIARIO | FINAL
```

#### `TarifaMaterial` (Precio de material por m²)
```
id       String  @id @default(uuid())
material String              // PVC, CAUCHO, POLIURETANO, etc.
espesor  Float               // mm
precio   Float               // €/m²
peso     Float               // kg/m²
color    String?             // Para PVC: VERDE, BLANCO, AZUL, NEGRO
@@unique([material, espesor, color])
```

#### `TarifaRollo` (Tarifa de venta de rollo)
```
id             String  @id @default(uuid())
material       String
espesor        Float
ancho          Float?
color          String?
metrajeMinimo  Float   @default(10)
precioBase     Float              // €/m²
peso           Float              // kg/m²
@@unique([material, espesor, color])
```

#### `Stock` (Inventario de material en almacén)
```
id                String  @id @default(uuid())
material          String
espesor           Float?
metrosDisponibles Float
proveedor         String?
costoMetro        Float?
cantidadBobinas   Int?    @default(0)
movimientos       MovimientoStock[]
```

#### `MovimientoStock`
```
id        String   @id @default(uuid())
tipo      String              // ENTRADA | SALIDA | AJUSTE
cantidad  Float
fecha     DateTime @default(now())
stockId   String?
stockItem Stock?
```

#### `Documento`
```
id               String   @id @default(uuid())
tipo             String              // PLANO | FICHA_TECNICA | FOTO | OTRO
referencia       String              // Referencia del documento
descripcion      String?
rutaArchivo      String              // Ruta relativa en servidor
maquinaUbicacion String?
fechaSubida      DateTime @default(now())
productoId       String?
producto         Producto?
@@unique([referencia, rutaArchivo])
```

#### `Nota` (Tablón de notas)
```
id      String   @id @default(uuid())
content String
fecha   DateTime @default(now())
```

#### `Config` (Configuración del sistema)
```
id    String @id @default(uuid())
key   String @unique
value String
```
**Claves de configuración importantes:**
- `iva` → porcentaje IVA (ej: `21`)
- `empresa_nombre` → nombre empresa para PDF
- `empresa_direccion`
- `empresa_telefono`
- `empresa_email`
- `longitud_barra_tacos` → metros de barra de tacos (default: `2`)

#### `Sequence` (Numeración automática)
```
name  String  // "pedido" | "presupuesto" | "pedido_proveedor"
year  Int     // 2026
value Int     // contador actual
@@id([name, year])
```

#### `AuditLog`
```
id        String   @id @default(uuid())
action    String   @index   // CREATE | UPDATE | DELETE
entity    String   @index   // "Pedido" | "Cliente" | etc.
entityId  String?
details   Json?             // { before: {...}, after: {...} }
user      String?
createdAt DateTime @default(now()) @index
```

#### `Taco` (Taco elevador para bandas)
```
id          Int     @id @default(autoincrement())
tipo        String              // RECTO | INCLINADO
altura      Int                 // mm: 10, 20, 30, 40, 50, 60, 70, 80, 90, 100
precioMetro Float              // €/metro lineal
activo      Boolean @default(true)
@@unique([tipo, altura])
```

#### `Grapa` (Grapa de unión para bandas)
```
id          Int     @id @default(autoincrement())
nombre      String
fabricante  String?
descripcion String?
precioMetro Float   @default(0)
activo      Boolean @default(true)
```

#### `TarifaTransporte`
```
id           String  @id @default(uuid())
provincia    String
codigoPostal String
parcel       Float?
miniQuarter  Float?
miniLight    Float?
quarter      Float?
light        Float?
half         Float?
megaLight    Float?
full         Float?
megaFull     Float?
@@unique([provincia, codigoPostal])
```

#### `ConfigPaletizado`
```
id          String  @id @default(uuid())
tipo        String  @unique   // EUROPEO | MEDIO
costePale   Float
costeFilm   Float   @default(0.538)
costeFleje  Float   @default(0.183)
costePrecinto Float @default(0.0147)
```

#### `PresupuestoTemplate`
```
id          String   @id @default(uuid())
nombre      String   @unique
descripcion String?
items       Json              // Array de PresupuestoItem sin IDs
marginId    String?
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

#### `Fabricante`
```
id       String  @id @default(uuid())
nombre   String  @unique
productos Producto[]
```

#### `Material`
```
id       String  @id @default(uuid())
nombre   String  @unique
productos Producto[]
```

---

## 2. BACKEND — API REST (Express.js)

### Configuración principal (`server/index.js`)

```javascript
const express = require('express')
const cors = require('cors')
const path = require('path')
const app = express()

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, '../public')))

// Rutas API
app.use('/api/clientes', require('./routes/clientes'))
app.use('/api/pedidos', require('./routes/pedidos'))
// ... todas las rutas

// SPA fallback — siempre devolver index.html para rutas frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

app.listen(3000)
```

### Patrón de respuesta de errores

Todas las respuestas de error siguen:
```json
{ "message": "Descripción del error" }
```

Con códigos HTTP:
- `400` — Datos inválidos
- `404` — No encontrado
- `409` — Conflicto (nombre duplicado, etc.)
- `422` — Error de validación
- `500` — Error interno

### Generador de números de documento (`server/lib/sequence.js`)

```javascript
// Genera: PED-001-2026, PRES-001-2026, PPROV-001-2026
async function nextSequence(name) {
  const year = new Date().getFullYear()
  const seq = await db.sequence.upsert({
    where: { name_year: { name, year } },
    update: { value: { increment: 1 } },
    create: { name, year, value: 1 },
  })
  const prefix = { pedido: 'PED', presupuesto: 'PRES', pedido_proveedor: 'PPROV' }[name]
  return `${prefix}-${String(seq.value).padStart(3, '0')}-${year}`
}
```

### Audit log (`server/lib/audit.js`)

```javascript
async function logAction(action, entity, entityId, details = {}, user = 'sistema') {
  await db.auditLog.create({
    data: { action, entity, entityId, details, user }
  })
}
// Uso: await logAction('CREATE', 'Pedido', pedido.id, { numero: pedido.numero })
// Uso: await logAction('UPDATE', 'Cliente', id, { before: oldData, after: newData })
// Uso: await logAction('DELETE', 'Producto', id, { nombre: producto.nombre })
```

---

## 3. ENDPOINTS DE LA API

### CLIENTES

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/clientes` | Lista todos los clientes. Query: `?search=nombre` |
| POST | `/api/clientes` | Crear cliente. Body: `{ nombre, email?, telefono?, direccion?, categoria? }` |
| GET | `/api/clientes/:id` | Detalle de cliente |
| PUT | `/api/clientes/:id` | Actualizar cliente |
| DELETE | `/api/clientes/:id` | Eliminar cliente (error si tiene pedidos) |
| GET | `/api/clientes/:id/resumen` | Stats: `{ cliente, pedidos[], presupuestos[], stats: { totalFacturado, numPedidos, numPresupuestos, ultimoPedido } }` |

**Lógica resumen de cliente:**
- `totalFacturado` = suma de `total` de pedidos con `estado NOT IN ['Cancelado', 'Borrador']`
- `pedidos` incluye el margen aplicado: join con `ReglaMargen` por `marginId`

### PEDIDOS DE CLIENTE

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/pedidos` | Lista con paginación. Query: `?page=1&limit=20&search=num&estado=&clientId=` |
| POST | `/api/pedidos` | Crear pedido |
| GET | `/api/pedidos/:id` | Detalle con items y cliente |
| PUT | `/api/pedidos/:id` | Actualizar pedido completo (reemplaza items) |
| DELETE | `/api/pedidos/:id` | Eliminar pedido |
| GET | `/api/pedidos/:id/pdf` | Devuelve PDF como buffer |
| POST | `/api/pedidos/:id/email` | Enviar pedido por email al cliente |
| POST | `/api/pedidos/from-presupuesto` | Crear pedido desde presupuesto. Body: `{ presupuestoId }` |

**Validación al crear/actualizar pedido:**
```javascript
// items[] debe tener:
{
  descripcion: String (required),
  quantity: Integer >= 1,
  unitPrice: Float >= 0,
  productoId: String? (UUID o null),
  pesoUnitario: Float >= 0,
  detallesTecnicos: String? (JSON serializado)
}
// Calcular automáticamente:
subtotal = sum(item.quantity * item.unitPrice)
tax = subtotal * (config.iva / 100)  // config.iva default 21
total = subtotal + tax
```

**Crear pedido desde presupuesto:**
```javascript
// 1. Obtener presupuesto con items
// 2. Generar nuevo número de pedido
// 3. Copiar: clienteId, marginId, notas, items[]
// 4. Copiar detallesTecnicos de cada item
// 5. Marcar presupuesto como estado = 'Aceptado'
// 6. Guardar presupuestoId en el pedido nuevo
```

**Estados válidos de pedido:** `Borrador` | `Pendiente` | `Enviado` | `Completado` | `Cancelado`

### PRESUPUESTOS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/presupuestos` | Lista con paginación. Query: `?page&limit&search&estado&clientId` |
| POST | `/api/presupuestos` | Crear presupuesto |
| GET | `/api/presupuestos/:id` | Detalle con items y cliente |
| PUT | `/api/presupuestos/:id` | Actualizar (reemplaza items) |
| DELETE | `/api/presupuestos/:id` | Eliminar |
| GET | `/api/presupuestos/:id/pdf` | PDF del presupuesto |
| POST | `/api/presupuestos/:id/email` | Enviar por email |
| GET | `/api/presupuestos/templates` | Lista plantillas |
| POST | `/api/presupuestos/templates` | Crear plantilla |
| PUT | `/api/presupuestos/templates/:id` | Actualizar plantilla |
| DELETE | `/api/presupuestos/templates/:id` | Eliminar plantilla |

**Estados válidos de presupuesto:** `Borrador` | `Enviado` | `Aceptado` | `Rechazado` | `Expirado`

### PRODUCTOS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/productos` | Lista con paginación y búsqueda. Query: `?search&page&limit` |
| POST | `/api/productos` | Crear producto |
| GET | `/api/productos/:id` | Detalle con fabricante, material, documentos |
| PUT | `/api/productos/:id` | Actualizar |
| DELETE | `/api/productos/:id` | Eliminar |

**Campos de producto al crear:**
```javascript
{
  nombre, referenciaFabricante?, espesor?, largo?, ancho?,
  precioUnitario?, pesoUnitario?, costoUnitario?,
  tieneTroquel?, color?,
  fabricanteId?, materialId?,
  precioVentaFab?, precioVentaInt?, precioVentaFin?
}
```

### STOCK Y ALMACÉN

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/almacen-stock` | Lista todos los items de stock |
| POST | `/api/almacen-stock` | Crear item de stock |
| PUT | `/api/almacen-stock/:id` | Actualizar item de stock |
| DELETE | `/api/almacen-stock/:id` | Eliminar item de stock |
| GET | `/api/movimientos` | Historial de movimientos. Query: `?stockId&tipo&desde&hasta&limit` |
| POST | `/api/movimientos` | Registrar movimiento. Body: `{ stockId, tipo, cantidad, nota? }` |
| GET | `/api/stock-info/available-meters` | Stock disponible por material/espesor |

**Lógica de movimiento:**
```javascript
// Al registrar ENTRADA: stock.metrosDisponibles += cantidad
// Al registrar SALIDA: stock.metrosDisponibles -= cantidad (mínimo 0)
// Al registrar AJUSTE: stock.metrosDisponibles = cantidad (valor absoluto)
```

### PROVEEDORES Y PEDIDOS A PROVEEDOR

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/proveedores` | Lista proveedores |
| POST | `/api/proveedores` | Crear proveedor |
| GET | `/api/proveedores/:id` | Detalle proveedor |
| PUT | `/api/proveedores/:id` | Actualizar |
| DELETE | `/api/proveedores/:id` | Eliminar |
| GET | `/api/pedidos-proveedores-data` | Lista pedidos a proveedores. Query: `?estado&tipo` |
| POST | `/api/pedidos-proveedores-data` | Crear pedido a proveedor |
| GET | `/api/pedidos-proveedores-data/:id` | Detalle con bobinas |
| PUT | `/api/pedidos-proveedores-data/:id` | Actualizar |
| DELETE | `/api/pedidos-proveedores-data/:id` | Eliminar |
| POST | `/api/stock-management/receive-order` | Recibir pedido en almacén. Body: `{ pedidoId }` |

**Al recibir pedido en almacén:**
```javascript
// 1. Cambiar estado del pedido a 'Recibido'
// 2. Para cada bobina del pedido:
//    - Buscar stock existente con mismo material+espesor
//    - Si existe: metrosDisponibles += (bobina.largo * bobina.cantidad)
//    - Si no existe: crear nuevo item de stock
// 3. Crear movimientos de ENTRADA por cada bobina
// 4. Log de auditoría
```

### PRECIOS Y MÁRGENES

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/pricing/margenes` | Lista reglas de margen |
| POST | `/api/pricing/margenes` | Crear regla |
| PUT | `/api/pricing/margenes/:id` | Actualizar regla |
| DELETE | `/api/pricing/margenes/:id` | Eliminar regla |
| GET | `/api/precios` | Lista tarifas de material (TarifaMaterial) |
| POST | `/api/precios` | Crear tarifa |
| PUT | `/api/precios/:id` | Actualizar tarifa |
| DELETE | `/api/precios/:id` | Eliminar tarifa |
| POST | `/api/precios/bulk-update` | Actualizar múltiples tarifas. Body: `{ updates: [{id, precio}] }` |
| GET | `/api/pricing/calculate` | Calcular precio con margen. Query: `?base&marginId` |

**Lógica de cálculo de precio:**
```javascript
// precioFinal = (precioBase * margen.multiplicador) + (margen.gastoFijo ?? 0)
```

**Calculadora inversa:**
```javascript
// POST /api/pricing/inverse-calc
// Body: { precioObjetivo, marginId }
// Respuesta: { costoNecesario, margen }
// costoNecesario = (precioObjetivo - gastoFijo) / multiplicador
```

### TARIFAS DE MATERIAL

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/precios` | Lista TarifaMaterial. Filtros: `?material&espesor` |
| POST | `/api/precios` | Crear tarifa |
| PUT | `/api/precios/:id` | Actualizar |
| DELETE | `/api/precios/:id` | Eliminar |
| GET | `/api/tarifas-rollo` | Lista TarifaRollo |
| POST | `/api/tarifas-rollo` | Crear |
| PUT | `/api/tarifas-rollo/:id` | Actualizar |
| DELETE | `/api/tarifas-rollo/:id` | Eliminar |

### GRAPAS Y TACOS (Confección PVC)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/grapas` | Lista grapas activas. Ordenadas por fabricante/nombre. |
| POST | `/api/grapas` | Crear grapa. Body: `{ nombre, fabricante?, descripcion?, precioMetro }` |
| PATCH | `/api/grapas/:id` | Actualización parcial |
| DELETE | `/api/grapas/:id` | Eliminar |
| GET | `/api/tacos` | Lista tacos activos. Ordenados por tipo/altura. |
| POST | `/api/tacos` | Crear taco. Body: `{ tipo, altura, precioMetro }` |
| PATCH | `/api/tacos/:id` | Actualización parcial |
| DELETE | `/api/tacos/:id` | Eliminar |

### LOGÍSTICA

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/logistica/tarifas` | Lista tarifas de transporte |
| POST | `/api/logistica/tarifas` | Crear tarifa |
| PUT | `/api/logistica/tarifas/:id` | Actualizar |
| DELETE | `/api/logistica/tarifas/:id` | Eliminar |
| GET | `/api/logistica/config-paletizado` | Config costes paletizado (EUROPEO, MEDIO) |
| PUT | `/api/logistica/config-paletizado` | Actualizar config. Body: `{ tipo, costePale, costeFilm, costeFleje, costePrecinto }` |
| POST | `/api/logistica/calcular` | Calcular coste logístico |

**Lógica cálculo logístico:**
```javascript
// Body: { pesoTotal, codigoPostal, tipoPalet, cantidadPalet }
// 1. Buscar tarifa por codigoPostal
// 2. Seleccionar tarifa según tipoPalet (parcel/quarter/full/etc.)
// 3. Calcular coste paletizado:
//    costePaletizado = (cantidadPalet * configPalet.costePale)
//                    + (cantidadPalet * configPalet.costeFilm)
//                    + (cantidadPalet * configPalet.costeFleje)
//                    + (cantidadPalet * configPalet.costePrecinto)
// 4. Total = tarifaTransporte + costePaletizado
```

### CONFIGURACIÓN

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/config` | Lee todas las claves de configuración como objeto `{ key: value }` |
| PUT | `/api/config` | Guarda/actualiza múltiples claves. Body: `{ iva: 21, empresa_nombre: "..." }` |

**Claves de Config disponibles:**

| Clave | Tipo | Default | Descripción |
|-------|------|---------|-------------|
| `iva` | Float | 21 | Porcentaje IVA |
| `empresa_nombre` | String | "" | Nombre empresa para PDFs |
| `empresa_direccion` | String | "" | Dirección empresa |
| `empresa_telefono` | String | "" | Teléfono empresa |
| `empresa_email` | String | "" | Email empresa |
| `longitud_barra_tacos` | Float | 2 | Longitud barra tacos en metros |

### BÚSQUEDA GLOBAL

```
GET /api/busqueda?q=termino
```
Busca en paralelo en: Clientes (nombre), Productos (nombre, referencia), Pedidos (numero), Presupuestos (numero).

Respuesta:
```json
{
  "clientes": [{ "id", "nombre", "tipo": "cliente" }],
  "productos": [{ "id", "nombre", "tipo": "producto" }],
  "pedidos": [{ "id", "numero", "estado", "tipo": "pedido" }],
  "presupuestos": [{ "id", "numero", "estado", "tipo": "presupuesto" }]
}
```

### INFORMES

```
GET /api/informes?tipo=ventas-mensuales
GET /api/informes?tipo=top-clientes
GET /api/informes?tipo=ventas-por-producto
```

**ventas-mensuales:** Agrupa pedidos (no Cancelado, no Borrador) por mes (YYYY-MM). Devuelve `[{ mes, totalVentas, numPedidos }]` ordenado por mes ASC.

**top-clientes:** Agrupa pedidos por clienteId. Devuelve `[{ clienteId, nombre, totalFacturado, numPedidos }]` ordenado por totalFacturado DESC.

**ventas-por-producto:** Agrupa PedidoItems por productoId/descripcion. Devuelve top 50 `[{ descripcion, cantidadTotal, totalVentas }]`.

### AUDIT LOG

```
GET /api/audit-log?action=&entity=&desde=&hasta=&page=1&limit=50
```
Devuelve: `{ logs: [AuditLog], total: number }`

### DASHBOARD

```
GET /api/dashboard
```
Devuelve:
```json
{
  "kpis": {
    "pedidosPendientes": 5,
    "presupuestosPendientes": 3,
    "totalFacturadoMes": 12500.50,
    "stockBajo": 2
  },
  "stockItems": [{ "material", "espesor", "metrosDisponibles", "cantidadBobinas" }],
  "movimientosRecientes": [últimos 10 MovimientoStock con info del stock],
  "pedidosRecientes": [últimos 5 pedidos con cliente],
  "notas": [todas las notas del tablón]
}
```

### DOCUMENTOS

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/documentos` | Lista documentos. Query: `?productoId&tipo` |
| POST | `/api/documentos` | Subir documento (multipart/form-data) |
| GET | `/api/documentos/:id` | Detalle |
| DELETE | `/api/documentos/:id` | Eliminar |

### FABRICANTES Y MATERIALES (Catálogos)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/fabricantes` | Lista |
| POST | `/api/fabricantes` | Crear |
| PUT | `/api/fabricantes/:id` | Actualizar nombre |
| DELETE | `/api/fabricantes/:id` | Eliminar |
| GET | `/api/materiales` | Lista |
| POST | `/api/materiales` | Crear |
| PUT | `/api/materiales/:id` | Actualizar nombre |
| DELETE | `/api/materiales/:id` | Eliminar |

### REFERENCIAS DE BOBINA

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/configuracion/referencias` | Lista referencias maestro |
| POST | `/api/configuracion/referencias` | Crear referencia |
| PUT | `/api/configuracion/referencias/:id` | Actualizar |
| DELETE | `/api/configuracion/referencias/:id` | Eliminar |

### NOTAS (Tablón)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/notas` | Lista todas las notas |
| POST | `/api/notas` | Crear nota. Body: `{ content }` |
| DELETE | `/api/notas/:id` | Eliminar nota |

### EMAIL

**Enviar pedido:**
```
POST /api/pedidos/:id/email
Body: { to?: string }  // Si no se especifica, usa el email del cliente
```
Envía PDF del pedido adjunto. Asunto: "Nota de trabajo #PED-001-2026"

**Enviar presupuesto:**
```
POST /api/presupuestos/:id/email
Body: { to?: string }
```
Envía PDF del presupuesto adjunto. Asunto: "Presupuesto #PRES-001-2026"

---

## 4. LÓGICA DE NEGOCIO — CALCULADORA DE BANDAS PVC

Esta es la funcionalidad más compleja. Una banda PVC tiene:
- **Material:** Siempre PVC en esta calculadora
- **Espesor:** De la tabla TarifaMaterial (ej: 3, 5, 8, 10 mm)
- **Color:** VERDE | BLANCO | AZUL | NEGRO
- **Ancho:** en mm (medida de la banda)
- **Largo:** en mm (circunferencia de la banda)
- **Tipo confección:** VULCANIZADA (sin fin) | GRAPA
- **Grapa:** Solo si confección = GRAPA (referencia a tabla Grapa)
- **Tacos:** Opcional (elevadores en la banda)

### Cálculo del precio unitario de una banda

```javascript
function calcularBanda({ tarifas, espesor, color, anchoMm, largoMm, tipoConfeccion, grapa, costeVulcanizadoMetro, configuracionTacos }) {
  
  // 1. Encontrar tarifa
  const tarifa = tarifas.find(t =>
    t.material === 'PVC' &&
    Number(t.espesor) === Number(espesor) &&
    t.color === color
  )
  if (!tarifa) throw new Error('Tarifa no encontrada')

  const ancM = anchoMm / 1000  // convertir a metros
  const larM = largoMm / 1000
  const area = ancM * larM      // m²

  // 2. Coste material base
  const costeMaterial = tarifa.precio * area  // €

  // 3. Coste confección
  let costeConfeccion = 0
  if (tipoConfeccion === 'VULCANIZADA') {
    costeConfeccion = costeVulcanizadoMetro * ancM
    // costeVulcanizadoMetro se configura en la UI, default 50 €/m
  } else if (tipoConfeccion === 'GRAPA' && grapa) {
    costeConfeccion = grapa.precioMetro * ancM
  }

  // 4. Coste tacos (si tiene)
  const costeTacos = configuracionTacos?.costeTacos ?? 0

  return {
    costeMaterial,
    costeConfeccion,
    costeTacos,
    precioUnitario: costeMaterial + costeConfeccion + costeTacos,
    pesoUnitario: tarifa.peso * area  // kg
  }
}
```

### Cálculo de configuración de tacos

Los tacos son elevadores que se montan sobre la banda. El modal de configuración calcula:

```javascript
function calcularTacos({ taco, anchoBandaMm, largoBandaMm, separacionTacosMm, tacos }) {
  // taco: { tipo, altura, precioMetro }
  // separacionTacosMm: distancia entre tacos (default 150mm)
  
  const largoBandaM = largoBandaMm / 1000
  
  // Número de tacos que caben en la banda
  const cantidadTacos = Math.floor(largoBandaM * 1000 / separacionTacosMm)
  
  // Metros lineales de taco necesarios
  const metrosLineales = cantidadTacos * (anchoBandaMm / 1000)
  
  // Coste
  const costeTacos = metrosLineales * taco.precioMetro
  
  // Barras necesarias (para el PDF)
  const longitudBarra = config.longitud_barra_tacos ?? 2  // metros
  const numBarras = Math.ceil(metrosLineales / longitudBarra)
  
  return {
    tipo: taco.tipo,
    altura: taco.altura,
    cantidadTacos,
    metrosLineales,
    costeTacos,
    numBarras,
    longitudBarra
  }
}
```

### Datos del item al añadir al pedido

```javascript
const item = {
  descripcion: `PVC ${espesor}mm ${color} - ${tipoConfeccion === 'VULCANIZADA' ? 'Cerrada Sin Fin' : 'Cerrada con Grapa'}${tacos ? ` + Tacos ${tacos.tipo} ${tacos.altura}mm` : ''}`,
  dimensiones: { ancho: anchoBandaMm, largo: largoBandaMm, espesor },
  color,
  material: 'PVC',
  tipoConfeccion,
  grapa: tipoConfeccion === 'GRAPA' ? grapaSeleccionada : null,
  unidades: cantidadBandas,
  precioUnitario,
  precioTotal: precioUnitario * cantidadBandas,
  pesoTotal: pesoUnitario * cantidadBandas,
  pesoUnitario,
  tacos: configuracionTacos || null,

  // Se guarda en detallesTecnicos del PedidoItem como JSON string:
  detallesTecnicos: JSON.stringify({
    dimensiones: { ancho: anchoBandaMm, largo: largoBandaMm, espesor },
    color,
    tipoConfeccion,
    grapa: tipoConfeccion === 'GRAPA' ? grapaSeleccionada : null,
    tacos: configuracionTacos || null,
  })
}
```

---

## 5. GENERACIÓN DE PDF

Los PDFs se generan en el **backend** con `jsPDF` + `jspdf-autotable` para Node.js.

### PDF de Pedido (Nota de Trabajo)

**Página 1 — Nota de Trabajo**

```
ENCABEZADO:
- Logo empresa (si existe) o nombre empresa
- Título: "NOTA DE TRABAJO" grande
- Número: PED-001-2026
- Fecha: 28/04/2026
- Estado: badge coloreado

DATOS CLIENTE:
- Nombre, email, teléfono, dirección

TABLA DE ITEMS:
Columnas: Descripción | Cant. | Precio Unit. | Total
Footer: Subtotal | IVA (21%) | TOTAL

NOTAS DEL PEDIDO (si tiene)
```

**Página 2 — DETALLES TÉCNICOS PVC** (solo si hay items con `detallesTecnicos`)

Por cada item PVC:
```
Cabecera oscura: "BANDA X: [descripción]"

Tabla dimensiones:
| Material     | PVC         |
| Color        | VERDE       |
| Espesor      | 8 mm        |
| Ancho        | 650 mm      |   // formatMm(valor) = "650 mm" o "1.500 mm"
| Largo        | 14.560 mm   |   // usar toLocaleString('de-DE') para separador de miles
| Confección   | Sin Fin     |   // o "Grapa: [nombre grapa]"

Si tiene tacos:
Tabla tacos:
| Tipo de taco      | RECTO              |
| Altura            | 30 mm              |
| Cantidad de tacos | 97 uds             |
| Metros lineales   | 63,05 m            |
| Barras necesarias | 32 barras de 2 m   |
```

**Función formatMm:**
```javascript
function formatMm(value) {
  return Math.round(parseFloat(value) || 0).toLocaleString('de-DE') + ' mm'
  // 14560 → "14.560 mm", 650 → "650 mm"
}
```

### PDF de Presupuesto

```
ENCABEZADO:
- Nombre empresa
- Título: "PRESUPUESTO"
- Número: PRES-001-2026
- Fecha
- Válido hasta: +30 días

DATOS CLIENTE

TABLA DE ITEMS:
Descripción | Cant. | Precio Unit. | Total

SUBTOTAL / IVA / TOTAL

CONDICIONES GENERALES (texto configurable)
```

---

## 6. SISTEMA DE EMAIL

Usa la API de **Resend** (`https://api.resend.com/emails`) con la clave `RESEND_API_KEY` en `.env`.

```javascript
// server/lib/email.js
const { Resend } = require('resend')
const resend = new Resend(process.env.RESEND_API_KEY)

async function sendOrderEmail(order, pdfBuffer) {
  await resend.emails.send({
    from: process.env.FROM_EMAIL || 'noreply@tuempresa.com',
    to: order.cliente?.email,
    subject: `Nota de trabajo #${order.numero}`,
    html: `<p>Adjunto encontrará la nota de trabajo #${order.numero}</p>`,
    attachments: [{
      filename: `nota-trabajo-${order.numero}.pdf`,
      content: pdfBuffer.toString('base64'),
    }]
  })
}
```

---

## 7. FRONTEND — SPA VANILLA

### Shell HTML (`public/index.html`)

```html
<!DOCTYPE html>
<html lang="es" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CRM Taller</title>
  <link href="https://cdn.jsdelivr.net/npm/daisyui@5/dist/full.min.css" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <link rel="stylesheet" href="/css/app.css">
</head>
<body>
  <div class="drawer lg:drawer-open">
    <input id="drawer-toggle" type="checkbox" class="drawer-toggle" />

    <!-- Contenido principal -->
    <div class="drawer-content flex flex-col">
      <!-- Header -->
      <header id="app-header" class="navbar bg-base-100 shadow-sm">
        <label for="drawer-toggle" class="btn btn-ghost lg:hidden">
          <i data-lucide="menu"></i>
        </label>
        <div class="flex-1">
          <input type="search" id="search-global" placeholder="Buscar..." class="input input-sm input-bordered w-64" />
        </div>
        <div id="search-results" class="hidden absolute top-16 right-4 bg-base-100 shadow-xl rounded-lg z-50 w-80 max-h-80 overflow-y-auto"></div>
      </header>

      <!-- Área de contenido de la página -->
      <main id="app-content" class="flex-1 overflow-auto p-4">
        <!-- El contenido se inyecta aquí por el router -->
        <div id="page-container"></div>
      </main>
    </div>

    <!-- Sidebar -->
    <nav class="drawer-side z-40">
      <label for="drawer-toggle" class="drawer-overlay"></label>
      <div class="menu bg-base-300 min-h-full w-64 p-4">
        <a href="/" class="text-xl font-bold mb-4 block">CRM Taller</a>
        <ul id="sidebar-menu" class="menu w-full">
          <!-- generado por JS -->
        </ul>
      </div>
    </nav>
  </div>

  <!-- Modales globales -->
  <div id="modal-container"></div>

  <!-- Scripts -->
  <script src="/js/utils.js"></script>
  <script src="/js/api.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>
```

### Router SPA (`public/js/app.js`)

```javascript
// Router hash-based: #/pedidos, #/pedidos/123, etc.
const routes = {
  '/': () => import('./pages/dashboard.js'),
  '/pedidos': () => import('./pages/pedidos.js'),
  '/pedidos/nuevo': () => import('./pages/pedidos-nuevo.js'),
  '/pedidos/:id': () => import('./pages/pedidos-detalle.js'),
  '/presupuestos': () => import('./pages/presupuestos.js'),
  '/presupuestos/nuevo': () => import('./pages/presupuestos-nuevo.js'),
  '/presupuestos/:id': () => import('./pages/presupuestos-detalle.js'),
  '/presupuestos/:id/editar': () => import('./pages/presupuestos-editar.js'),
  '/clientes': () => import('./pages/clientes.js'),
  '/clientes/:id': () => import('./pages/clientes-detalle.js'),
  '/productos': () => import('./pages/productos.js'),
  '/almacen': () => import('./pages/almacen.js'),
  '/proveedores': () => import('./pages/proveedores.js'),
  '/calculadora': () => import('./pages/calculadora-bandas.js'),
  '/calculadora/inversa': () => import('./pages/calculadora-inversa.js'),
  '/calculadora/logistica': () => import('./pages/calculadora-logistica.js'),
  '/configuracion': () => import('./pages/configuracion.js'),
  '/tarifas': () => import('./pages/tarifas.js'),
  '/informes': () => import('./pages/informes.js'),
  '/configuracion/audit-log': () => import('./pages/audit-log.js'),
  '/busqueda': () => import('./pages/busqueda.js'),
}

async function navigate(path) {
  const container = document.getElementById('page-container')
  container.innerHTML = '<div class="flex justify-center py-20"><span class="loading loading-spinner loading-lg"></span></div>'
  
  // Match route (con params :id)
  const match = matchRoute(path)
  if (!match) {
    container.innerHTML = '<div class="text-center py-20">Página no encontrada</div>'
    return
  }
  
  const module = await match.loader()
  await module.render(container, match.params)
  lucide.createIcons()  // Re-render lucide icons después de inyectar HTML
}

window.addEventListener('hashchange', () => navigate(location.hash.slice(1) || '/'))
window.addEventListener('load', () => navigate(location.hash.slice(1) || '/'))
```

### Capa API (`public/js/api.js`)

```javascript
const BASE = '/api'

async function fetchApi(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message || 'Error de red')
  }
  if (res.status === 204) return null
  return res.json()
}

const api = {
  get: (path) => fetchApi(path),
  post: (path, body) => fetchApi(path, { method: 'POST', body }),
  put: (path, body) => fetchApi(path, { method: 'PUT', body }),
  patch: (path, body) => fetchApi(path, { method: 'PATCH', body }),
  delete: (path) => fetchApi(path, { method: 'DELETE' }),
}
```

### Utilidades (`public/js/utils.js`)

```javascript
// Formatear moneda europea
function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value ?? 0)
}

// Formatear mm con separador de miles
function formatMm(value) {
  return Math.round(parseFloat(value) || 0).toLocaleString('de-DE') + ' mm'
}

// Formatear fecha corta
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES')
}

// Mostrar toast de notificación
function showToast(message, type = 'success') {
  const toast = document.createElement('div')
  toast.className = `toast toast-end z-50`
  toast.innerHTML = `<div class="alert alert-${type}"><span>${message}</span></div>`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 3000)
}

// Calcular totales de pedido/presupuesto
function calcularTotales(items, ivaPct = 21) {
  const subtotal = items.reduce((sum, i) => sum + (i.quantity * i.unitPrice), 0)
  const tax = subtotal * (ivaPct / 100)
  return { subtotal, tax, total: subtotal + tax }
}

// Badge de estado con color
function stateBadge(estado) {
  const clases = {
    Completado: 'badge-success', Aceptado: 'badge-success',
    Pendiente: 'badge-warning', Enviado: 'badge-info',
    Cancelado: 'badge-error', Borrador: 'badge-ghost', Rechazado: 'badge-error',
    Expirado: 'badge-neutral', 'En tránsito': 'badge-info', Recibido: 'badge-success',
  }
  return `<span class="badge ${clases[estado] ?? 'badge-neutral'} badge-sm">${estado}</span>`
}

// Exportar tabla HTML a CSV
function exportTableCSV(data, filename) {
  if (!data?.length) return
  const headers = Object.keys(data[0])
  const rows = data.map(row =>
    headers.map(h => {
      const v = row[h]
      return typeof v === 'string' && (v.includes(',') || v.includes('"'))
        ? `"${v.replace(/"/g, '""')}"` : v
    }).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}
```

---

## 8. PÁGINAS — COMPORTAMIENTO DETALLADO

### Dashboard (`/`)

**Datos necesarios:** `GET /api/dashboard`

**Contenido:**
1. Row de 4 tarjetas KPI:
   - Pedidos pendientes (badge naranja)
   - Presupuestos activos
   - Facturado este mes (€)
   - Alertas de stock bajo
2. Gráfico de barras (Chart.js): ventas últimos 6 meses desde `/api/informes?tipo=ventas-mensuales`
3. Tabla "Stock actual": material, espesor, metros disponibles, nº bobinas
4. Lista "Pedidos recientes": últimos 5 con número, cliente, estado, total
5. Tablón de notas: lista de notas con botón añadir y eliminar

### Lista de Pedidos (`/pedidos`)

**Filtros:**
- Búsqueda por número/cliente (input text)
- Filtro por estado (select: todos | Borrador | Pendiente | Enviado | Completado | Cancelado)
- Paginación: 20 por página

**Tabla:**
| Número | Cliente | Fecha | Estado | Margen | Total | Acciones |
|--------|---------|-------|--------|--------|-------|---------|

**Acciones por fila:** Ver detalle | Descargar PDF | Eliminar (con confirmación)

**Botón "Nuevo Pedido"** → navega a `#/pedidos/nuevo`

### Formulario Nuevo Pedido (`/pedidos/nuevo`)

**Secciones:**
1. **Cliente:** Selector con búsqueda (GET /api/clientes?search=...) o crear nuevo cliente inline
2. **Margen:** Select con GET /api/pricing/margenes
3. **Estado:** Select (default: Borrador)
4. **Notas:** Textarea
5. **Items:** Tabla editable con filas
6. **Totales:** Subtotal, IVA, Total (calculados en tiempo real)
7. **Calculadora PVC:** Panel lateral colapsable con la calculadora de bandas

**Lógica de items:**
- Cada fila: [Buscar producto] | Descripción | Cantidad | Precio Unit. | Peso Unit. | Total | [Eliminar]
- Al seleccionar producto: rellena descripción, precioUnitario según tier del cliente, pesoUnitario
- El precio unitario se selecciona según `cliente.tier`:
  - FABRICANTE → `producto.precioVentaFab`
  - INTERMEDIARIO → `producto.precioVentaInt`
  - FINAL o null → `producto.precioVentaFin`
- Input cantidad: solo enteros positivos
- Input precio: decimales, mínimo 0
- Al añadir banda desde calculadora: crea item con detallesTecnicos JSON

**Al guardar:** POST /api/pedidos con el payload completo, redirigir a detalle.

### Detalle de Pedido (`/pedidos/:id`)

**Datos:** GET /api/pedidos/:id (include: cliente, items con producto)

**Secciones:**
1. Cabecera: número, estado (badge), fecha, cliente
2. Botones acción: Editar | Descargar PDF | Enviar Email | Eliminar
3. Tabla de items: descripción, cantidad, precio unit., peso, total
   - Si item tiene `detallesTecnicos`: mostrar badge "PVC" o icono con popover de datos técnicos
4. Resumen: subtotal, IVA, total
5. Si tiene `presupuestoId`: enlace al presupuesto origen
6. Notas

### Lista de Presupuestos (`/presupuestos`)

Igual que pedidos pero con estados: Borrador | Enviado | Aceptado | Rechazado | Expirado

**Botón extra en cada fila:** "Convertir a Pedido" (si estado != Aceptado ni tiene pedido ya)
- Llama POST /api/pedidos/from-presupuesto con { presupuestoId }
- Al completar: navega al pedido creado

**Gestión de plantillas:**
- Botón "Plantillas" que abre panel/modal
- Permite guardar la configuración actual como plantilla
- Al crear nuevo presupuesto: opción de cargar desde plantilla

### Detalle de Presupuesto (`/presupuestos/:id`)

Igual que pedido pero con botón "Convertir a Pedido" prominente si estado es Aceptado o Enviado.

### Lista de Clientes (`/clientes`)

**Tabla:** Nombre | Categoría | Email | Teléfono | Nº Pedidos | Total Facturado | Acciones

**Acciones:** Ver detalle | Editar | Eliminar

### Detalle de Cliente (`/clientes/:id`)

**Datos:** GET /api/clientes/:id/resumen

**Secciones:**
1. Cabecera con nombre y botón Editar
2. Info básica: categoría, email, teléfono, dirección (4 tarjetas)
3. Stats: Total Facturado | Nº Pedidos | Nº Presupuestos | Último pedido
4. Tabla pedidos: Número (link) | Fecha | Estado | Margen aplicado | Total
5. Tabla presupuestos: Número (link) | Fecha | Estado | Total

### Gestión de Productos (`/productos`)

**Tabla:** Nombre | Referencia | Material | Fabricante | Precio | Stock | Acciones

**Modal edición** inline (no página separada).

**Campos al crear/editar:**
- Nombre, Referencia fabricante
- Espesor (mm), Largo (mm), Ancho (mm)
- Material (select desde /api/materiales)
- Fabricante (select desde /api/fabricantes)
- Color
- Tiene troquel (checkbox)
- Precio venta FAB / INT / FIN
- Precio unitario general, Costo unitario
- Peso unitario

### Almacén/Stock (`/almacen`)

**Tabla stock:** Material | Espesor | Metros disponibles | Nº Bobinas | Proveedor | Coste/m | Acciones

**Acciones por fila:**
- "+" Entrada: modal con cantidad y nota
- "-" Salida: modal con cantidad y nota
- "Ajustar": modal con nuevo valor total

**Historial de movimientos:** Tabla paginada debajo del stock con filtros por fecha y tipo.

### Pedidos a Proveedor (`/proveedores`)

**Tabs:**
- "Nacionales": pedidos tipo NACIONAL
- "Importaciones": pedidos tipo IMPORTACION

**Por cada pedido muestra:** Número | Material | Proveedor | Estado | Fecha | Total bobinas | Acciones

**Modal detalle:** Muestra datos del pedido incluyendo bobinas, container (si importación), etc.

**Al recibir:** Botón "Recibir" → POST /api/stock-management/receive-order

### Calculadora de Bandas PVC (`/calculadora`)

**Panel izquierdo — Configuración:**
1. Espesor (select desde /api/precios filtrando material=PVC)
2. Color (VERDE | BLANCO | AZUL | NEGRO)
3. Ancho en mm (input number)
4. Largo en mm (input number)
5. Tipo confección: radio buttons [Sin Fin] [Grapa]
   - Si GRAPA: select de grapas desde /api/grapas
6. Botón "Configurar Tacos" (abre modal)
7. Sección colapsable "Configuración de Costes":
   - Coste vulcanizado (€/m, default 50)

**Panel derecho — Resultado:**
- Cantidad (input number, default 1)
- Desglose: Material + Confección + Tacos
- Precio Unitario (grande)
- Botón "Añadir a Pedido/Presupuesto" (si hay uno activo en localStorage)
- O botón "Crear Pedido Nuevo" con este item

**Modal Configuración Tacos:**
- Select tipo de taco (GET /api/tacos)
- Separación entre tacos (mm, default 150)
- Preview: cantidad tacos, metros lineales, barras necesarias
- Coste total de tacos

### Calculadora Inversa (`/calculadora/inversa`)

Dada una tarifa objetivo, calcular el coste mínimo necesario.

**Inputs:**
- Precio objetivo (€)
- Margen aplicado (select desde /api/pricing/margenes)

**Output:**
- Coste máximo de entrada
- Beneficio
- Porcentaje de margen real

```javascript
// Si margen.gastoFijo existe:
costoEntrada = (precioObjetivo - margen.gastoFijo) / margen.multiplicador
// Si no:
costoEntrada = precioObjetivo / margen.multiplicador
beneficio = precioObjetivo - costoEntrada
margenReal = (beneficio / precioObjetivo) * 100
```

### Calculadora Logística (`/calculadora/logistica`)

**Inputs:**
- Código postal destino (input, busca en TarifaTransporte)
- Peso total (kg)
- Tipo de palet: Parcel | MiniQuarter | Quarter | MiniLight | Light | Half | MegaLight | Full | MegaFull
- Cantidad de palés

**Output:**
- Tarifa transporte encontrada
- Coste paletizado (desglose: palé + film + fleje + precinto)
- Total

### Configuración (`/configuracion`)

**Tabs:**
1. **General:** IVA, datos empresa (nombre, dirección, teléfono, email)
2. **Márgenes:** CRUD tabla ReglaMargen (base, multiplicador, gastoFijo, descripcion, tierCliente)
3. **Confección PVC:**
   - Longitud barra tacos (input, guarda en config.longitud_barra_tacos)
   - Sección "Tacos": CRUD tabla Taco (tipo, altura, precioMetro)
   - Sección "Grapas": CRUD tabla Grapa (nombre, fabricante, descripcion, precioMetro)
4. **Logística:** Config costes paletizado + tabla TarifaTransporte

### Tarifas (`/tarifas`)

**Tabs:**
1. **Materiales:** Tabla TarifaMaterial por material+espesor+color con precio y peso. Edición inline.
2. **Rollos:** Tabla TarifaRollo. Edición inline.

**Botón "Actualización masiva precios":** Modal donde se introduce % de incremento y aplica a todos.

### Informes (`/informes`)

**Tabs con gráficos (Chart.js) y tablas:**

1. **Ventas por Mes:**
   - Gráfico de barras: eje X = mes, eje Y = total €
   - Tabla: mes | nº pedidos | total ventas
   - Botón exportar CSV

2. **Top Clientes:**
   - Gráfico barras horizontal: top 10 clientes
   - Tabla completa: ranking | nombre | nº pedidos | total facturado
   - Botón exportar CSV

3. **Por Producto:**
   - Tabla: ranking | descripción | cantidad total | total ventas
   - Botón exportar CSV

### Audit Log (`/configuracion/audit-log`)

**Filtros:** action (CREATE/UPDATE/DELETE) | entity | fecha desde/hasta

**Tabla:** Fecha | Acción | Entidad | ID | Detalles (expandible) | Usuario

### Búsqueda Global

- Input en el header con debounce 300ms
- Muestra resultados en dropdown: clientes, productos, pedidos, presupuestos
- Click en resultado navega a su detalle
- Enter navega a `/busqueda?q=termino` que muestra todos los resultados organizados

---

## 9. NAVEGACIÓN (SIDEBAR)

```javascript
const menuStructure = [
  { label: 'Inicio', icon: 'home', href: '/' },
  { label: 'Ventas', icon: 'dollar-sign', children: [
    { label: 'Presupuestos', icon: 'file-text', href: '/presupuestos' },
    { label: 'Pedidos Cliente', icon: 'package', href: '/pedidos' },
  ]},
  { label: 'Compras', icon: 'truck', children: [
    { label: 'Pedidos Proveedor', icon: 'truck', href: '/proveedores' },
    { label: 'Gestión Proveedores', icon: 'factory', href: '/gestion/proveedores' },
  ]},
  { label: 'Almacén', icon: 'warehouse', href: '/almacen' },
  { label: 'Calculadoras', icon: 'calculator', children: [
    { label: 'Calculadora PVC', icon: 'layers', href: '/calculadora' },
    { label: 'Calculadora Envíos', icon: 'truck', href: '/calculadora/logistica' },
    { label: 'Calculadora Inversa', icon: 'dollar-sign', href: '/calculadora/inversa' },
  ]},
  { label: 'Gestión', icon: 'users', children: [
    { label: 'Clientes', icon: 'users', href: '/clientes' },
    { label: 'Productos', icon: 'package', href: '/productos' },
    { label: 'Materiales', icon: 'layers', href: '/gestion/materiales' },
    { label: 'Fabricantes', icon: 'factory', href: '/gestion/fabricantes' },
  ]},
  { label: 'Informes', icon: 'bar-chart-2', href: '/informes' },
  { label: 'Tarifas', icon: 'dollar-sign', href: '/tarifas' },
  { label: 'Configuración', icon: 'settings', children: [
    { label: 'Márgenes y Config', icon: 'settings', href: '/configuracion' },
    { label: 'Logística', icon: 'truck', href: '/configuracion/logistica' },
    { label: 'Audit Log', icon: 'file-text', href: '/configuracion/audit-log' },
  ]},
]
```

---

## 10. PATRONES DE UI RECURRENTES

### Modal genérico

```javascript
function openModal({ title, body, onConfirm, confirmText = 'Confirmar', confirmClass = 'btn-primary' }) {
  const modal = document.createElement('dialog')
  modal.className = 'modal modal-open'
  modal.innerHTML = `
    <div class="modal-box">
      <h3 class="font-bold text-lg">${title}</h3>
      <div class="py-4">${body}</div>
      <div class="modal-action">
        <button class="btn btn-ghost" id="modal-cancel">Cancelar</button>
        <button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>
      </div>
    </div>
    <label class="modal-backdrop" for="modal-cancel"></label>
  `
  document.getElementById('modal-container').appendChild(modal)
  modal.querySelector('#modal-cancel').onclick = () => modal.remove()
  modal.querySelector('#modal-confirm').onclick = async () => {
    await onConfirm()
    modal.remove()
  }
}

// Modal de confirmación de borrado
function confirmDelete(message, onConfirm) {
  openModal({
    title: 'Confirmar eliminación',
    body: `<p class="text-error">${message}</p>`,
    onConfirm,
    confirmText: 'Eliminar',
    confirmClass: 'btn-error',
  })
}
```

### Tabla genérica con acciones

```javascript
function renderTable({ headers, rows, actions }) {
  return `
    <div class="overflow-x-auto">
      <table class="table table-sm w-full">
        <thead>
          <tr>
            ${headers.map(h => `<th>${h}</th>`).join('')}
            ${actions ? '<th>Acciones</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${rows.map(row => `
            <tr class="hover">
              ${row.cells.map(c => `<td>${c}</td>`).join('')}
              ${actions ? `<td class="flex gap-1">${actions(row.data)}</td>` : ''}
            </tr>
          `).join('')}
          ${rows.length === 0 ? '<tr><td colspan="99" class="text-center text-gray-400 py-6">Sin datos</td></tr>' : ''}
        </tbody>
      </table>
    </div>
  `
}
```

### Paginación

```javascript
function renderPagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return ''
  return `
    <div class="flex justify-center mt-4 gap-1">
      <button class="btn btn-sm" ${currentPage === 1 ? 'disabled' : ''} onclick="${onPageChange}(${currentPage - 1})">«</button>
      ${Array.from({length: totalPages}, (_, i) => i + 1).map(p =>
        `<button class="btn btn-sm ${p === currentPage ? 'btn-active' : ''}" onclick="${onPageChange}(${p})">${p}</button>`
      ).join('')}
      <button class="btn btn-sm" ${currentPage === totalPages ? 'disabled' : ''} onclick="${onPageChange}(${currentPage + 1})">»</button>
    </div>
  `
}
```

---

## 11. VARIABLES DE ENTORNO (`.env`)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/crm_taller"
RESEND_API_KEY="re_xxxxxxxxxxxx"
FROM_EMAIL="noreply@tuempresa.com"
PORT=3000
NODE_ENV=production
```

---

## 12. CONSIDERACIONES DE MIGRACIÓN

### Lo que cambia
- React → manipulación DOM directa o innerHTML
- Next.js App Router → Express.js routes
- SWR → fetch + estado local en módulos JS
- Recharts → Chart.js
- `useMemo`, `useState`, `useEffect` → variables, event listeners, funciones
- Componentes React → funciones que devuelven strings HTML o crean nodos DOM

### Lo que NO cambia
- Toda la base de datos PostgreSQL (schema.prisma sin tocar)
- Toda la lógica de negocio (cálculos, márgenes, confección PVC)
- Los endpoints de la API (mismas rutas, mismos payloads)
- La generación de PDF (jsPDF en Node.js backend)
- El sistema de email (Resend)
- El aspecto visual (Tailwind + DaisyUI, mismos componentes)

### Estrategia de migración recomendada

1. **Fase 1:** Crear el servidor Express con todas las rutas API (copiando lógica del backend Next.js directamente)
2. **Fase 2:** Crear el shell HTML con el router y el sidebar
3. **Fase 3:** Migrar páginas de una en una, empezando por las más simples (dashboard, clientes, productos)
4. **Fase 4:** Migrar el formulario de pedidos/presupuestos (la parte más compleja)
5. **Fase 5:** Migrar las calculadoras
6. **Fase 6:** PDF y email (ya funcionan en Node, solo conectar)

### Alternativa más gradual (si no se quiere reescribir todo)

En lugar de vanilla JS puro, considerar **htmx** + **Alpine.js**:
- **htmx**: el backend devuelve HTML directamente, htmx maneja peticiones AJAX. Sin router necesario.
- **Alpine.js**: reactivity mínima para componentes pequeños (calculadoras, formularios).
- Esto reduce enormemente la cantidad de JavaScript necesario.
- El backend pasaría a generar vistas HTML (con un motor de plantillas como **Handlebars** o **EJS**).
- Ventaja: código mucho más simple y legible que React, pero más potente que vanilla puro.

```html
<!-- Ejemplo con htmx: al hacer click, el servidor devuelve HTML -->
<button hx-delete="/api/clientes/123" 
        hx-confirm="¿Eliminar cliente?"
        hx-target="#fila-cliente-123"
        hx-swap="outerHTML">
  Eliminar
</button>
```

---

## 13. PACKAGE.JSON DEL NUEVO PROYECTO

```json
{
  "name": "crm-taller",
  "version": "1.0.0",
  "type": "commonjs",
  "scripts": {
    "start": "node server/index.js",
    "dev": "nodemon server/index.js",
    "db:push": "prisma db push",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^6.0.0",
    "express": "^4.18.0",
    "multer": "^1.4.5",
    "prisma": "^6.0.0",
    "resend": "^6.0.0",
    "jspdf": "^3.0.0",
    "jspdf-autotable": "^5.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  }
}
```

---

## 14. LISTA COMPLETA DE FUNCIONALIDADES (CHECKLIST)

### Core CRM
- [x] CRUD Clientes con búsqueda
- [x] Vista detalle cliente con stats e historial
- [x] CRUD Productos con precios por tier
- [x] CRUD Proveedores

### Ventas
- [x] Crear presupuesto con selector de cliente, margen y líneas de items
- [x] Convertir presupuesto en pedido en un clic
- [x] Editar presupuesto/pedido (reemplaza líneas)
- [x] Estados de presupuesto y pedido con badges
- [x] Numeración automática (PED-001-2026, PRES-001-2026)
- [x] Cálculo automático subtotal + IVA + total
- [x] Plantillas de presupuesto

### Compras / Stock
- [x] Crear pedido a proveedor (nacional e importación)
- [x] Seguimiento de pedidos con container, naviera, ETA
- [x] Recepción de pedido → entrada automática en stock
- [x] Movimientos de stock (entrada, salida, ajuste)
- [x] Historial de movimientos con filtros

### Calculadoras
- [x] Calculadora bandas PVC: selección material/espesor/color/confección/grapa/tacos
- [x] Modal configuración tacos con cálculo de barras necesarias
- [x] Calculadora logística: coste transporte + paletizado
- [x] Calculadora inversa: precio objetivo → coste necesario
- [x] Añadir resultado al pedido/presupuesto activo

### PDFs
- [x] Nota de trabajo del pedido (página 1)
- [x] Detalles técnicos PVC (página 2, solo si hay bandas con `detallesTecnicos`)
- [x] PDF de presupuesto
- [x] Medidas con separador de miles: "14.560 mm"
- [x] Cálculo barras de tacos en PDF

### Emails
- [x] Enviar pedido por email con PDF adjunto
- [x] Enviar presupuesto por email con PDF adjunto

### Informes
- [x] Ventas mensuales (gráfico + tabla + CSV)
- [x] Top clientes por facturación (gráfico + tabla + CSV)
- [x] Ventas por producto (tabla + CSV)

### Configuración
- [x] IVA y datos empresa
- [x] Reglas de margen por tier de cliente
- [x] Gestión de Grapas (nombre, fabricante, precio/metro)
- [x] Gestión de Tacos (tipo, altura, precio/metro)
- [x] Longitud barra de tacos
- [x] Tarifas de transporte por provincia/CP
- [x] Config costes paletizado (EUROPEO, MEDIO)

### Auditoría
- [x] Log de todas las acciones CREATE/UPDATE/DELETE
- [x] Visor con filtros por acción, entidad, fecha
- [x] Detalle de cambios (antes/después)

### UX
- [x] Búsqueda global en el header (clientes, productos, pedidos, presupuestos)
- [x] Tablón de notas en dashboard
- [x] Notificaciones toast de éxito/error
- [x] Confirmación antes de eliminar
- [x] Paginación en listas largas
- [x] Responsive (sidebar colapsable en móvil)
- [x] Iconos Lucide en toda la interfaz
- [x] Tema DaisyUI (light/dark switchable)

---

*Fin de la especificación. Este documento contiene toda la información necesaria para reconstruir el CRM desde cero sin depender de React ni Next.js.*
