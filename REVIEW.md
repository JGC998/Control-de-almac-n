# REVIEW.md — Control de Almacén / CRM Taller
**Auditor**: Claude Code — 2026-07-23 (revisión de bugs)
**Stack**: Next.js 16, Prisma 6, SQLite dev / MySQL prod, DaisyUI 5, SWR, jsPDF, Zod

---

## Resumen de bugs encontrados (2026-07-23)

| Severidad | Cantidad |
|-----------|---------|
| 🔴 BUG CONFIRMADO | 4 |
| 🟠 BUG PROBABLE | 4 |
| 🟡 BUG POTENCIAL | 8 |
| **Total** | **16** |

### Top 5 urgentes

| # | Bug | Archivo | Esfuerzo |
|---|-----|---------|---------|
| 1 | Búsqueda de clientes completamente rota (`camposBusqueda` vs `campoBusqueda`) | `api/clientes/route.js` | ~5 min |
| 2 | Notas de presupuesto no salen en PDF (`quote.notes` vs `quote.notas`) | `pdfGenerator.js` | ~2 min |
| 3 | Unidad de largo en etiquetas es `m` en lugar de `mm` | `pdfGenerator.js` | ~2 min |
| 4 | TypeError en `generarCodigo` si fabricante es solo espacios | `producto-utils.js` | ~2 min |
| 5 | Eliminar producto no muestra error al usuario si tiene pedidos (409 silencioso) | `gestion/productos/page.js` | ~10 min |

---

## Detalle de todos los bugs

### 🔴 BUG-01 — Notas del presupuesto nunca aparecen en el PDF
**Archivo:** `src/lib/pdfGenerator.js` · `generateBudgetPDF`
Campo incorrecto: `quote.notes` (inglés) en lugar de `quote.notas` (español). La condición siempre es `false`.
```js
// ❌  if (quote.notes) {
// ✅  if (quote.notas) {
```

### 🔴 BUG-02 — Unidad incorrecta en etiquetas: "m" en lugar de "mm" para el largo
**Archivo:** `src/lib/pdfGenerator.js` · `_drawLabelAt` y `generateEtiquetaPDF` (2 sitios)
```js
// ❌  p.largo && `${p.largo} m`
// ✅  p.largo && `${p.largo} mm`
```

### 🔴 BUG-03 — Búsqueda de clientes completamente rota
**Archivo:** `src/app/api/clientes/route.js`
Se pasa `camposBusqueda` (plural) pero `manejadores-api.js` lee `campoBusqueda` (singular). El filtro nunca se aplica.
```js
// ❌  camposBusqueda: ['nombre', 'email', 'telefono'],
// ✅  campoBusqueda: 'nombre',
```

### 🔴 BUG-04 — Eliminar producto falla silenciosamente (409 ignorado)
**Archivo:** `src/app/gestion/productos/page.js` · `eliminar()`
`fetch DELETE` no comprueba `res.ok`. Si la API devuelve 409, el usuario no ve ningún error.
```js
const res = await fetch(`/api/productos/${id}`, { method: 'DELETE' });
if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    toastError(err.message || 'No se pudo eliminar');
    return;
}
invalidarProductos();
```

### 🟠 BUG-05 — PUT de pedido no invalida caché de Next.js
**Archivo:** `src/app/api/pedidos/[id]/route.js` · handler `PUT`
Falta `revalidatePath('/pedidos')` y `revalidatePath('/pedidos/${id}')` (el PATCH sí los tiene).

### 🟠 BUG-06 — PUT presupuesto devuelve objeto sin items actualizados
**Archivo:** `src/app/api/presupuestos/[id]/route.js`
La transacción devuelve `quote` obtenido ANTES de recrear los items. El frontend recibe el presupuesto sin su lista de items.
Corrección: añadir `findUnique({ include: { items: true } })` al final de la transacción.

### 🟠 BUG-07 — Fetches de montaje sin `.catch()` en FormularioProductoInteligente
**Archivo:** `src/componentes/productos/FormularioProductoInteligente.js` · useEffect inicial
Si la red falla, los selectores de material/espesor quedan vacíos sin ningún mensaje de error. Tampoco hay cleanup del componente desmontado.

### 🟠 BUG-08 — `toggleActivo` no maneja errores del servidor
**Archivo:** `src/app/gestion/productos/page.js` · `toggleActivo()`
Igual que BUG-04: no se verifica `res.ok`. Si la API falla, el usuario cree que archivó/restauró correctamente.

### 🟡 BUG-09 — TypeError en `generarCodigo` si fabricante es solo espacios
**Archivo:** `src/lib/producto-utils.js`
`"   ".trim().split(/\s+/)` → `[""]`, y `""[0].toUpperCase()` lanza TypeError.
```js
// ✅  .filter(Boolean).map(w => w[0].toUpperCase())
```

### 🟡 BUG-10 — `.toFixed()` lanza TypeError si espesor llega como string
**Archivo:** `src/lib/producto-utils.js`
```js
// ❌  producto.espesor.toFixed(1)   (falla si espesor es "8")
// ✅  (+producto.espesor).toFixed(1)
```

### 🟡 BUG-11 — `tier` de clientes se mapea desde `data.categoria` (campo inexistente)
**Archivo:** `src/app/api/clientes/route.js` · `mapearCrear`
`data.categoria` es `undefined`; el campo `tier` nunca se persiste.
```js
// ✅  tier: data.tier ?? null,
```

### 🟡 BUG-12 — `page` y `limit` sin clampeo en API de productos
**Archivo:** `src/app/api/productos/route.js`
`parseInt('abc')` = `NaN` → Prisma recibe `take: NaN`. `page=0` → `skip=-50` (Prisma rechaza).
```js
const page  = Math.max(1, parseInt(pageParam  || '1',  10) || 1);
const limit = Math.min(500, Math.max(1, parseInt(limitParam || '50', 10) || 50));
```

### 🟡 BUG-13 — Espesor no numérico en `/api/tarifas-material-opciones` filtra por NaN
**Archivo:** `src/app/api/tarifas-material-opciones/route.js`
`parseFloat('abc')` = `NaN` → query devuelve vacío sin error ni aviso al usuario.

### 🟡 BUG-14 — Margen no encontrado aplica precio bruto sin avisar
**Archivo:** `src/app/api/pricing/calculate/route.js`
Si el `selectedMarginId` no existe, `margenAplicar` queda `null` y el precio calculado es el costo bruto sin margen. Sin advertencia.

### 🟡 BUG-15 — `nomConfig` ausente en dependencias del `useMemo` de filtrado
**Archivo:** `src/app/gestion/productos/page.js`
```js
// ❌  }, [productos, busqueda, sort]);
// ✅  }, [productos, busqueda, sort, nomConfig]);
```

### 🟡 BUG-16 — IVA hardcodeado al 21% en PDF de albarán
**Archivo:** `src/lib/pdfGenerator.js` · `generateAlbaranPDF`
La etiqueta textual siempre dice "IVA (21%)" aunque el sistema use otro tipo.

---
*Actualizado 2026-07-23*

---

## Resumen ejecutivo

| Área        | Hallazgos | Crítico | Alto | Medio | Bajo |
|-------------|-----------|---------|------|-------|------|
| Critical    | 1         | 1       | —    | —     | —    |
| Security    | 3         | —       | 1    | 1     | 1    |
| Bugs        | 5         | —       | 2    | 2     | 1    |
| Backend     | 4         | —       | —    | 3     | 1    |
| API         | 3         | —       | —    | 2     | 1    |
| Frontend    | 3         | —       | —    | 1     | 2    |
| Database    | 3         | —       | —    | 2     | 1    |
| **TOTAL**   | **22**    | **1**   | **3**| **11**| **7**|

---

## CRITICAL

### CRIT-01 — Ruta completa de descuentos rompe en runtime
**Archivo**: `src/app/api/pricing/descuentos/route.js`
**Severidad**: Critico — todos los metodos HTTP fallan al invocar

Los modelos `ReglaDescuento` y `DescuentoTier` fueron eliminados del esquema en la migración
`20260504000000_feature_calculadora_pvc`. Ambos esquemas (dev y prod) ya no los definen, pero la ruta
**no fue actualizada**. Todos sus cuatro handlers (GET, POST, PUT, DELETE) llaman a `db.reglaDescuento`
y `db.descuentoTier`, arrojando `TypeError: Cannot read properties of undefined` en cuanto se procesa
la primera request.

**Impacto**: La URL `/api/pricing/descuentos` esta completamente inoperativa.

**Fix**: Eliminar el archivo `src/app/api/pricing/descuentos/route.js` y sus referencias en el frontend,
o reemplazarlo con una logica de descuentos que use los modelos actuales. El schema `descuentoSchema`
en `src/lib/validations.js` es ahora codigo muerto — eliminarlo tambien (ver DB-03).

---

## Seguridad

### SEC-01 — Subida de archivos sin limite de tamano
**Archivo**: `src/app/api/documentos/route.js`
**Severidad**: Alto

El handler de `formidable` en el POST de `/api/documentos` no especifica `maxFileSize`. Un usuario
puede subir archivos de tamano arbitrario, causando agotamiento de disco en el servidor.

**Fix**:
```js
const form = formidable({
  uploadDir: os.tmpdir(),
  keepExtensions: true,
  maxFileSize: 20 * 1024 * 1024, // 20 MB
});
```

### SEC-02 — Endpoint WhatsApp sin rate limiting
**Archivo**: `src/app/api/importaciones/[id]/whatsapp/route.js`
**Severidad**: Medio

`POST /api/importaciones/[id]/whatsapp` no tiene rate limit. Un usuario con acceso a la aplicacion
puede disparar notificaciones WhatsApp en bucle sin restriccion, consumiendo el cupo de la API de
CallMeBot y generando spam.

**Fix**: Anadir `checkRateLimit('whatsapp', 5)` (5 req/min) al handler.

### SEC-03 — RESEND_FROM cae a direccion de demo de Resend
**Archivo**: `src/lib/email.js`
**Severidad**: Bajo

Cuando `RESEND_FROM` no esta configurado, la constante queda como `'CRM Taller <onboarding@resend.dev>'`.
Resend no permite enviar desde `onboarding@resend.dev` con claves API de produccion de cuenta propia;
los emails se rechazaran silenciosamente o llegaran sin firma DKIM propia.

**Fix**: Anadir `RESEND_FROM` al `.env.example` y validar su presencia al arranque cuando
`RESEND_API_KEY` este definido.

---

## Bugs

### BUG-01 — Referencias a columnas eliminadas en `GET /api/productos`
**Archivo**: `src/app/api/productos/route.js` — lineas ~100-102
**Severidad**: Alto

El path no-paginado serializa `p.precioVentaFab`, `p.precioVentaInt` y `p.precioVentaFin`. Estos
campos fueron eliminados del esquema via `prisma/migrate-merge-articulos.sql`. Prisma 6 retorna
`undefined` para campos inexistentes, que la guarda `? Number(p.x) : 0` convierte silenciosamente
en `0`. Los consumers de este endpoint reciben siempre `precioVentaFab: 0`, produciendo datos
incorrectos.

**Fix**: Eliminar esas tres lineas de la serializacion.

### BUG-02 — `JSON.parse(item.detallesTecnicos)` sin try-catch en `pdfGenerator.js`
**Archivo**: `src/lib/pdfGenerator.js` — lineas 294, 387, 464, 865, 1165
**Severidad**: Alto

Cinco llamadas a `JSON.parse(item.detallesTecnicos)` no estan envueltas en try-catch. Si el campo
contiene JSON invalido (corrupcion, edicion manual, truncamiento), la generacion del PDF completo
falla con una excepcion no manejada y el endpoint devuelve un 500 sin mensaje util al usuario.

**Comparacion**: `generarPDFLoteBobinas` si usa `JSON.parse` dentro de try-catch — hay inconsistencia
interna.

**Fix**:
```js
let detalles = {};
try { detalles = JSON.parse(item.detallesTecnicos || '{}'); } catch { detalles = {}; }
```

### BUG-03 — Calculo de coste de pedidos pendientes ignora `bobina.cantidad`
**Archivo**: `src/app/api/pedidos-proveedores-data/route.js`
**Severidad**: Medio

El calculo de coste prorrateado para pedidos en estado "Pendiente" usa `b.precioMetro * (b.largo || 0)`
sin multiplicar por `b.cantidad`. Cuando un pedido incluye varias bobinas del mismo tipo (`cantidad > 1`),
el coste total se muestra dividido entre `cantidad`, mostrando un valor artificialmente bajo.

**Comparacion**: `stock-management/receive-order/route.js` calcula correctamente:
`const metrosTotales = metrosPorBobina * cantidadBobinas`.

**Fix**: `b.precioMetro * (b.largo || 0) * (b.cantidad || 1)`.

### BUG-04 — `JSON.parse` sin guard en importacion de tacos/materiales/grapas
**Archivos**: handlers de importacion dentro de `src/app/api/importaciones/`
**Severidad**: Medio

Los handlers que procesan datos tecnicos de importacion hacen `JSON.parse(bovinasRaw)` sin try-catch.
Datos corruptos en la tabla bloquean toda la importacion y devuelven un 500 sin diagnostico claro.

**Fix**: Mismo patron que BUG-02 — envolver en try-catch con fallback a array vacio `[]`.

### BUG-05 — Campos `Decimal` no serializados en `GET /api/presupuestos/[id]`
**Archivo**: `src/app/api/presupuestos/[id]/route.js`
**Severidad**: Bajo en dev (SQLite Float), Medio en prod (MySQL Decimal)

`GET /api/presupuestos/[id]` devuelve directamente el objeto Prisma sin convertir los campos
`subtotal`, `tax`, `total` y `unitPrice` con `Number()` o `serializeDecimals()`. En MySQL, Prisma
retorna estos como objetos `Prisma.Decimal`, que `JSON.stringify` serializa como `{}` en lugar de
un numero. `pedidos/[id]/route.js` si serializa estos campos correctamente — hay inconsistencia.

**Fix**: Aplicar `serializeDecimals(presupuesto, ['subtotal', 'tax', 'total'])` antes de retornar.

---

## Backend

### BACK-01 — `db.config.findMany()` sin limite en cada generacion de PDF
**Archivo**: `src/app/api/pedidos/[id]/pdf/route.js` — linea 26
**Severidad**: Medio

Cada vez que se genera un PDF de pedido, el handler ejecuta `db.config.findMany()` sin `where` ni
`take`, cargando toda la tabla `Config` en memoria. Cualquier crecimiento de la tabla (bug de escritura,
migracion) impacta en cada render de PDF.

**Fix**: Usar `db.config.findMany({ where: { key: { in: ['empresa_nombre', 'empresa_nif', ...] } } })`
o consultar cada clave individualmente con `findUnique`.

### BACK-02 — `findMany()` sin `take` en sincronizacion de tarifas rollo
**Archivo**: `src/app/api/tarifas-rollo/sync/route.js`
**Severidad**: Medio

Tanto `db.tarifaRollo.findMany()` como `db.tarifaMaterial.findMany()` carecen de `take`. En catalogos
grandes, este endpoint carga todas las filas en memoria para la sincronizacion.

**Fix**: Anadir `take: 2000` como guardia de seguridad o paginar el proceso.

### BACK-03 — `take: 5000` en historial de precios por cliente
**Archivo**: `src/app/api/clientes/[id]/historial-precios/route.js`
**Severidad**: Medio

La consulta de items de pedido para el historial usa `take: 5000`. Para clientes con alto volumen
esto puede representar miles de filas con `include`, causando alta latencia y uso de memoria. No hay
paginacion ni filtro de fecha.

**Fix**: Anadir filtro de fecha (`fechaInicio`/`fechaFin`) o implementar cursor-based pagination.

### BACK-04 — `PUT /api/configuracion/referencias` sin validacion Zod
**Archivo**: `src/app/api/configuracion/referencias/route.js`
**Severidad**: Bajo

El handler PUT acepta el body sin schema Zod, confiando unicamente en Prisma para rechazar tipos
invalidos. Un campo `ancho` con string no numerico lanzara un error P2000 no manejado (500 generico).

**Fix**:
```js
const refSchema = z.object({
  id: z.string().min(1),
  referencia: z.string().min(1).max(100),
  ancho: z.number().positive(),
  lonas: z.number().int().nonnegative(),
  pesoPorMetroLineal: z.number().nonnegative(),
});
```

---

## API

### API-01 — Schemas Zod requieren campos calculados como input obligatorio
**Archivos**: `src/lib/validations.js` — `pedidoSchema`, `presupuestoSchema`
**Severidad**: Medio

`pedidoSchema` y `presupuestoSchema` incluyen `subtotal`, `tax` y `total` como campos obligatorios
con `.nonnegative()`. Sin embargo, los handlers POST inmediatamente recalculan estos valores
server-side y descartan los del cliente. El cliente debe enviar subtotales precalculados para que
la validacion pase, pero los valores son ignorados. Contrato de API enganoso.

**Fix**: Marcar esos campos como `.optional()` en los schemas, o separarlos en un schema de "input"
vs uno de "stored".

### API-02 — `GET /api/notificaciones` sin rate limit
**Archivo**: `src/app/api/notificaciones/route.js`
**Severidad**: Medio

El GET de notificaciones no tiene rate limiting. El componente `CampanaNotificaciones.js` llama este
endpoint cada 30 segundos via SWR. Multiples pestanas abiertas o un script automatizado pueden
inundar el endpoint. El POST si tiene rate limit — inconsistencia.

**Fix**: Anadir `checkRateLimit('notifs-get', 30)` al GET handler (30 req/min es suficiente para
el polling desde multiples pestanas).

### API-03 — `GET /api/productos/export` sin `take` limit
**Archivo**: `src/app/api/productos/export/route.js` — linea 21
**Severidad**: Bajo

`db.producto.findMany({ where, include: { material, subfamilia } })` no tiene `take`. El endpoint
exporta todos los productos del catalogo con sus relaciones. El rate limit (10 req/min) mitiga el
abuso pero no el consumo de memoria por request individual.

**Fix**: Anadir `take: 10000` como limite maximo documentado.

---

## Frontend

### FRONT-01 — `parseInt()` sin radix en server components de paginas
**Archivos**: `src/app/pedidos/page.js` lineas 34-35, `src/app/presupuestos/page.js`
**Severidad**: Bajo

```js
parseInt(searchParams?.page)  // sin segundo argumento
```

ESLint `radix` exige base explicita. Comportamiento implicitamente correcto para strings decimales,
pero inconsistente con el resto del proyecto.

**Fix**: `parseInt(searchParams?.page ?? '1', 10)`.

### FRONT-02 — `parseInt()` sin radix en `TablaGestionDatos.js`
**Archivo**: `src/componentes/ui/TablaGestionDatos.js` — linea 51
**Severidad**: Bajo

Misma issue que FRONT-01 en un componente de UI reutilizable empleado en todas las paginas de listado.

**Fix**: Anadir radix 10.

### FRONT-03 — Busqueda por `q` silenciosamente ignorada en handlers genericos
**Archivos**: `src/componentes/hooks/useGestionCRUD.js` + `src/lib/manejadores-api.js`
**Severidad**: Medio

`useGestionCRUD.js` annade `?q=<term>` a la URL cuando el usuario escribe en el buscador. El hook
generico `crearManejadoresCRUD` lee `searchParams.get('q')` pero no lo usa en el `where` de Prisma.
La busqueda aparenta funcionar pero no filtra nada. Afecta a todas las paginas CRUD que usan
`PaginaGestion` con handler GET generico (tarifas de materiales, modelos de grapa, etc.).

**Fix**: Implementar busqueda en el handler generico con un campo `campoBusqueda` configurable, o
eliminar el param `q` del fetch para no crear la falsa impresion de que funciona.

---

## Base de Datos

### DB-01 — Modelos core sin campo `@updatedAt`
**Archivos**: `prisma/schema.dev.prisma`, `prisma/schema.prisma`
**Severidad**: Medio

Los modelos `Pedido`, `Presupuesto`, `Albaran`, `Factura`, `Cliente`, `Producto` y `Stock` no tienen
campo `updatedAt`. Esto imposibilita cache invalidation basada en timestamp (ETags, SWR conditional
fetching) y queries de "cambios desde ultima sync" para exports incrementales.

**Fix**: Anadir `updatedAt DateTime @updatedAt` a los modelos mencionados y crear la migracion
correspondiente.

### DB-02 — `PedidoItem.quantity` es `Int` en lugar de `Float`
**Archivo**: `prisma/schema.dev.prisma`
**Severidad**: Medio

El campo `quantity Int` en `PedidoItem` impide cantidades fraccionarias. En un taller de materiales
(rollos de PVC, tacos, bobinas) es habitual vender 0.5 unidades o 2.5 metros. La constraint truncara
valores fraccionarios silenciosamente al guardarlos via Prisma.

**Fix**: Cambiar a `quantity Float @default(1)` con su correspondiente migracion. El esquema ya usa
`Float` para `precioUnitario`, por lo que el patron esta establecido.

### DB-03 — `descuentoSchema` en `validations.js` es codigo muerto
**Archivo**: `src/lib/validations.js`
**Severidad**: Bajo

El schema Zod `descuentoSchema` describe los campos de las tablas `ReglaDescuento`/`DescuentoTier`
que fueron eliminadas. Es codigo muerto que induce a confusion y puede llevar a futuros developers
a intentar usarlo.

**Fix**: Eliminar `descuentoSchema` de `validations.js` junto con CRIT-01.

---

## Mapa de endpoints

| Metodo | Ruta | RL | Zod | Notas |
|--------|------|----|-----|-------|
| POST | `/api/auth/login` | 5/min | — | timingSafeEqual, HMAC cookie 8h |
| GET | `/api/pedidos` | — | — | Paginado, take configurable |
| POST | `/api/pedidos` | — | `pedidoSchema` | Recalcula IVA server-side |
| GET | `/api/pedidos/[id]` | — | — | Serializa Decimals |
| PUT | `/api/pedidos/[id]` | — | `pedidoSchema` | $transaction item-replace |
| PATCH | `/api/pedidos/[id]` | — | inline | Solo `sinFacturacion` y `estado` |
| POST | `/api/pedidos/[id]/albaran` | — | — | Genera Albaran |
| GET | `/api/pedidos/[id]/pdf` | — | — | **BACK-01**: `config.findMany()` sin take |
| POST | `/api/pedidos/from-presupuesto` | — | — | TOCTOU guard con `updateMany` |
| POST | `/api/pedidos/bulk-update` | 20/min | inline | max 200 ids |
| GET | `/api/presupuestos` | — | — | Paginado |
| POST | `/api/presupuestos` | — | `presupuestoSchema` | |
| GET | `/api/presupuestos/[id]` | — | — | **BUG-05**: Decimals sin serializar |
| PUT | `/api/presupuestos/[id]` | — | `presupuestoSchema` | |
| DELETE | `/api/presupuestos/[id]` | — | — | |
| GET | `/api/productos` | — | — | **BUG-01**: dead field refs |
| POST | `/api/productos` | — | `productoSchema` | |
| GET | `/api/productos/[id]` | — | — | Excluye `costoUnitario` |
| PUT | `/api/productos/[id]` | — | `productoUpdateSchema` | Registra HistorialPrecioCosto |
| DELETE | `/api/productos/[id]` | — | — | |
| GET | `/api/productos/export` | 10/min | — | **API-03**: sin take |
| GET | `/api/clientes` | — | — | take: 500 |
| POST | `/api/clientes` | — | `clienteSchema` | |
| GET | `/api/clientes/[id]` | — | — | |
| PUT | `/api/clientes/[id]` | — | inline | |
| DELETE | `/api/clientes/[id]` | — | — | |
| GET | `/api/clientes/[id]/historial-precios` | — | — | **BACK-03**: take 5000 |
| GET | `/api/albaranes` | — | — | |
| GET | `/api/albaranes/[id]` | — | — | |
| PUT | `/api/albaranes/[id]` | — | — | |
| POST | `/api/albaranes/[id]/factura` | — | — | Genera Factura |
| GET | `/api/facturas` | — | — | |
| GET | `/api/facturas/[id]` | — | — | |
| PUT | `/api/facturas/[id]` | — | — | Calcula VeriFactu huella |
| GET | `/api/facturas/exportar-aeat` | — | — | take: 1000 |
| GET | `/api/importaciones` | — | — | |
| POST | `/api/importaciones` | — | `importacionContenedorSchema` | fire-and-forget precio update |
| GET | `/api/importaciones/[id]` | — | — | |
| PUT | `/api/importaciones/[id]` | — | — | |
| DELETE | `/api/importaciones/[id]` | — | — | |
| GET | `/api/importaciones/[id]/analisis-rentabilidad` | 10/min | UUID check | No N+1 |
| POST | `/api/importaciones/[id]/whatsapp` | **NINGUNO** | — | **SEC-02**: sin RL |
| GET | `/api/almacen-stock` | — | — | |
| POST | `/api/almacen-stock` | — | inline | Decremento atomico, notif minimo |
| POST | `/api/stock-management/receive-order` | — | — | Double-receive guard |
| GET | `/api/notificaciones` | **NINGUNO** | — | **API-02**: sin RL |
| POST | `/api/notificaciones` | 10/min | — | |
| GET | `/api/informes` | 20/min | — | 7 tipos, take 500-10000 |
| POST | `/api/pricing/calculate` | — | `calculoLogisticaSchema` | usa cache de margenes |
| POST | `/api/pricing/inverse-calc` | — | inline Zod | |
| GET/POST/PUT/DELETE | `/api/pricing/descuentos` | — | parcial | **CRIT-01**: crash total |
| GET | `/api/config` | — | — | Filtrado por ALLOWED_CONFIG_KEYS |
| PUT | `/api/config` | — | — | Whitelist de claves |
| GET | `/api/configuracion/referencias` | — | — | |
| POST | `/api/configuracion/referencias` | — | — | |
| DELETE | `/api/configuracion/referencias` | — | — | Lee id de body (no-RESTful) |
| PUT | `/api/configuracion/referencias` | — | **NINGUNO** | **BACK-04**: sin Zod |
| GET | `/api/documentos` | — | — | |
| POST | `/api/documentos` | — | MIME check | **SEC-01**: sin maxFileSize |
| GET | `/api/documentos/[id]` | — | — | |
| PUT | `/api/documentos/[id]` | — | path-traversal check | |
| DELETE | `/api/documentos/[id]` | — | — | Borra archivo fisico y DB |
| GET/POST/PUT/DELETE | `/api/tarifas-rollo` + `/[id]` | — | `tarifaMaterialSchema` | |
| POST | `/api/tarifas-rollo/sync` | — | — | **BACK-02**: findMany sin take |
| GET/POST/PUT/DELETE | `/api/tarifas-material` + `/[id]` | — | `tarifaMaterialSchema` | |
| GET/POST/PUT/DELETE | `/api/tarifas-cliente` + `/[id]` | — | `tarifaClienteCreateSchema` | |
| GET | `/api/pedidos-proveedores-data` | — | — | **BUG-03**: cantidad ignorada |
| GET | `/api/tracking/sync` | RL + CRON_SECRET | — | allSettled para resilencia |
| GET | `/api/cron/refresh-positions` | CRON_SECRET | — | sleep 3s entre contenedores |
| GET/POST/PUT/DELETE | `/api/model-grapa`, `/api/grapa`, `/api/taco`, etc. | varies | varies | patrones CRUD genericos |

---

## Puntos positivos

1. **Proteccion TOCTOU en `from-presupuesto`**: `updateMany` con `estado: { notIn: ['Aceptado'] }` previene
   doble conversion de presupuesto. Patron correcto.

2. **Decremento atomico de stock**: `updateMany` con `gte` en `almacen-stock/route.js` impide stock
   negativo sin necesidad de transacciones de lectura-escritura.

3. **Timing-safe PIN comparison**: `crypto.timingSafeEqual` en `/api/auth/login` evita timing attacks.

4. **CSP en produccion**: `next.config.mjs` elimina `unsafe-eval` en prod, annade `X-Frame-Options: DENY`
   y `Referrer-Policy`. Bien configurado.

5. **Singleton Prisma**: `globalThis.prisma` en `db.js` evita multiples conexiones durante hot-reload.

6. **`sanitizeForAudit`**: Elimina `costoUnitario`/`costo` de los logs de auditoria — correcto manejo de
   datos sensibles.

7. **`getMargenes()` con stale-while-revalidate**: `config-cache.js` implementa single-flight deduplication
   y TTL 5min correctamente.

8. **Secuencias anuales atomicas**: `sequence.js` usa upsert con increment=1 fuera de transacciones para
   evitar deadlocks en SQLite.

9. **`handlePrismaError`**: Mapeo consistente P2025->404, P2002->409, P2003->409 en toda la API.

10. **`escapeHtml` en emails**: Correctamente implementado en `email.js` antes de interpolar datos en
    templates HTML.

11. **CRON_SECRET en endpoints de tracking**: `tracking/sync` y `cron/refresh-positions` verifican el
    secret via query param.

12. **Rate limiter con `globalThis`**: `globalThis.__rateLimiterInterval` evita multiples setInterval
    durante hot-reload en desarrollo.

13. **Archivo fisico eliminado en DELETE**: `documentos/[id]/route.js` DELETE borra el archivo en disco
    con proteccion path-traversal. Bien implementado.

14. **`Promise.allSettled` en tracking**: Los fallos individuales de un contenedor no abortan el batch.

---

## Plan de accion priorizado

| Prioridad | ID | Esfuerzo estimado | Descripcion |
|-----------|-----|-------------------|-------------|
| P0 | CRIT-01 | 30 min | Eliminar `pricing/descuentos/route.js` y `descuentoSchema` (o reimplementar) |
| P1 | BUG-02 | 1 h | Envolver `JSON.parse(item.detallesTecnicos)` en try-catch en `pdfGenerator.js` (5 sitios) |
| P1 | SEC-01 | 30 min | Anadir `maxFileSize: 20MB` a formidable en `documentos/route.js` |
| P1 | BUG-01 | 15 min | Eliminar referencias a `precioVentaFab/Int/Fin` en `productos/route.js` |
| P1 | BUG-05 | 30 min | Serializar Decimals en `presupuestos/[id]/route.js` GET |
| P2 | BUG-03 | 30 min | Multiplicar por `b.cantidad` en `pedidos-proveedores-data` |
| P2 | BUG-04 | 1 h | Envolver JSON.parse en handlers de importacion |
| P2 | API-01 | 1 h | Marcar `subtotal/tax/total` como `.optional()` en los schemas Zod |
| P2 | API-02 | 15 min | Rate limit al GET de `/api/notificaciones` |
| P2 | SEC-02 | 15 min | Rate limit a POST `/api/importaciones/[id]/whatsapp` |
| P2 | BACK-01 | 30 min | `db.config.findMany()` -> query filtrada por claves conocidas |
| P2 | BACK-04 | 30 min | Anadir Zod al PUT de `configuracion/referencias` |
| P2 | FRONT-03 | 2 h | Implementar busqueda `q` en `crearManejadoresCRUD` o eliminar el param |
| P3 | BACK-02 | 15 min | Anadir `take: 2000` a `tarifas-rollo/sync` |
| P3 | BACK-03 | 2 h | Paginar historial de precios por cliente |
| P3 | API-03 | 15 min | Anadir `take: 10000` a `productos/export` |
| P3 | DB-01 | 2 h | Anadir `updatedAt` a modelos core + migracion |
| P3 | DB-02 | 1 h | Cambiar `PedidoItem.quantity` de `Int` a `Float` + migracion |
| P3 | DB-03 | 15 min | Eliminar `descuentoSchema` de `validations.js` |
| P3 | SEC-03 | 30 min | Documentar `RESEND_FROM` como obligatorio en `.env.example` |
| P3 | FRONT-01/02 | 30 min | `parseInt(x, 10)` en paginas y `TablaGestionDatos.js` |

---

*Fin del informe — 22 hallazgos totales.*
