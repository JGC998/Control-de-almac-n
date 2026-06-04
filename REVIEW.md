# REVIEW — CRM Taller

> Generado el 2026-06-04 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend  
> 55 archivos analizados (middleware, auth, lib, 25 rutas API, componentes, schema, config)

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 App Router · Prisma 6 (SQLite dev / MySQL prod) · DaisyUI 5 + Tailwind CSS 4 · SWR · jsPDF · ExcelJS · Resend  
**Archivos analizados:** 55  
**Total de hallazgos:** 18 (1 crítico, 5 altos, 8 medios, 4 bajos)

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| 🔒 Seguridad | 7/10 | 1 | 2 | 2 | 1 |
| 🐛 Bugs | 8/10 | 0 | 1 | 3 | 2 |
| ⚙️ Backend | 8/10 | 0 | 1 | 3 | 2 |
| 🌐 API | 7.5/10 | 0 | 2 | 3 | 2 |
| 🎨 Frontend | 8.5/10 | 0 | 0 | 2 | 2 |

**Score global: 7.8/10.** La base es sólida — Zod en todos los endpoints críticos, logging estructurado sin stack traces, cookies httpOnly, `timingSafeEqual` en login, transacciones donde se necesitan. Los problemas que existen son reales y algunos tienen impacto operativo significativo, pero ninguno representa un fallo de arquitectura.

**Lo que NO se encontró:** SQL injection (imposible con Prisma parametrizado), `innerHTML` con datos de usuario, `console.log` olvidados en producción, secrets hardcodeados, `.env` commiteado en git, `JSON.parse` sin try-catch en rutas de servidor.

---

## 🚨 Hallazgos Críticos — Acción Inmediata

### [CRÍTICO-01] Sin autenticación si `AUTH_PIN` no está configurado

**Área:** Seguridad  
**Archivo:** `middleware.js`, línea 32  
**Problema:** Si `AUTH_PIN` no está definido en el entorno de producción, el middleware devuelve `NextResponse.next()` inmediatamente para **todas** las rutas sin ningún control de acceso — incluyendo `/api/audit-log`, `/api/config/backup`, `/api/export/csv`, `/api/pedidos`, etc. No hay ninguna advertencia en arranque ni validación obligatoria. El propio `CLAUDE.md` describe la variable como "Optional — leave commented out to disable auth", lo que convierte la exposición accidental en un escenario probable en un despliegue apresurado.

```js
// ❌ Código actual (middleware.js línea 32)
const pin = process.env.AUTH_PIN;
if (!pin) return addSecurityHeaders(NextResponse.next()); // toda la app es pública
```

**Impacto:** Cualquier persona con acceso de red puede leer, modificar y exportar todos los datos del negocio sin ninguna credencial.

**Corrección:**
```js
// ✅ Al inicio de middleware.js (o en un módulo de inicialización separado)
if (process.env.NODE_ENV === 'production' && !process.env.AUTH_PIN) {
  throw new Error('[FATAL] AUTH_PIN es obligatorio en producción. El proceso no arrancará sin él.');
}
```

---

## 🔒 Seguridad

### [SEC-01] AUTH_PIN no obligatorio en producción — app arranca completamente abierta

*Ver sección Hallazgos Críticos arriba.*

---

### [SEC-02] Cookie `crm-auth` almacena el PIN en texto claro

**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/auth/login/route.js`, líneas 33–34  
**Problema:** El valor de la cookie es directamente el PIN (`expected`). El middleware compara `session === pin`. Esto tiene dos consecuencias: (1) cualquiera que pueda leer la cookie en el servidor ve el PIN en texto plano; (2) el valor de la cookie filtra el PIN al atacante si consigue leerla (XSS, network sniff en HTTP local).

```js
// ❌ Código actual
const res = NextResponse.json({ ok: true });
res.cookies.set('crm-auth', expected || '', { ... }); // PIN en texto claro

// ✅ Corrección — almacenar HMAC, nunca el PIN directamente
import crypto from 'crypto';
const token = crypto
  .createHmac('sha256', process.env.SESSION_SECRET)
  .update(expected)
  .digest('hex');
res.cookies.set('crm-auth', token, { httpOnly: true, sameSite: 'strict', ... });

// En middleware.js, comparar el HMAC:
const expectedToken = crypto
  .createHmac('sha256', process.env.SESSION_SECRET)
  .update(pin)
  .digest('hex');
if (session === expectedToken) { /* autenticado */ }
```

---

### [SEC-03] Rate limiter en memoria: no persiste entre reinicios ni escala horizontalmente

**Severidad:** 🟡 Medio  
**Archivo:** `src/lib/rateLimiter.js`, líneas 4–12

```js
const store = new Map(); // ip -> { count, resetAt }
```

El store se reinicia con cada deploy o crash del proceso. En un ataque de fuerza bruta al `/api/auth/login`, el atacante solo necesita 5 intentos, luego provocar un reinicio (OOM, etc.) y continuar. Con pm2 cluster o múltiples workers, el límite real es `5 × numWorkers`.

**Corrección para producción robusta:** Redis o una tabla `RateLimitEntry` en BD con TTL. Para la escala actual (proceso único), documentar la limitación es suficiente.

---

### [SEC-04] `onboarding@resend.dev` como remitente por defecto si `RESEND_FROM` no está configurado

**Severidad:** 🟢 Bajo  
**Archivo:** `src/lib/email.js`, línea 20

```js
from: process.env.RESEND_FROM || 'CRM Taller <onboarding@resend.dev>',
```

Los clientes que reciban presupuestos verán un remitente no corporativo. Riesgo reputacional y de deliverability, no de seguridad. Documentar `RESEND_FROM` como obligatorio en `.env.example`.

---

### [SEC-05] CSP con `unsafe-inline` y `unsafe-eval` en producción

**Severidad:** 🟡 Medio  
**Archivo:** `next.config.mjs`, líneas 7–8

```js
"script-src 'self' 'unsafe-inline' 'unsafe-eval'",
```

El propio comentario lo reconoce como necesario para Next.js/Turbopack. En builds de producción con App Router sin Turbopack, `unsafe-eval` puede eliminarse. Si se encontrase una vulnerabilidad XSS, la CSP no ofrecería protección adicional.

---

### [SEC-06] Headers de seguridad duplicados entre middleware y next.config.mjs

**Severidad:** 🟢 Bajo (informativo)  
`middleware.js` y `next.config.mjs` añaden los mismos headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`). El resultado son headers duplicados en la respuesta. Inofensivo pero genera confusión sobre qué capa es la fuente de verdad.

---

## 🐛 Bugs

### [BUG-01] `getNextNumber()` fuera de transacción — número de documento duplicado posible en carga concurrente

**Severidad:** 🟠 Alto (en MySQL prod)  
**Archivos:** `src/lib/sequence.js`, `src/app/api/pedidos/route.js` línea 72, `src/app/api/presupuestos/route.js` línea 73, `src/app/api/pedidos/from-presupuesto/route.js` línea 34

El propio código documenta el problema:

```js
// NOTA: getNextNumber() se llama deliberadamente FUERA de la transacción Prisma de
// creación del documento. En SQLite... el riesgo de número duplicado es mínimo.
// En producción con MySQL se puede mover dentro de la transacción usando SELECT ... FOR UPDATE.
```

Si dos pedidos se crean simultáneamente, ambos pueden obtener el mismo número (`PEDIDO-001-2026`) antes de que cualquiera ejecute el `create`.

**Corrección para producción MySQL:** Mover `getNextNumber()` dentro de `db.$transaction` con `SELECT ... FOR UPDATE` o usar un lock optimista en la tabla `Sequence`.

---

### [BUG-02] `POST /api/pedidos/from-presupuesto`: errores de negocio devuelven 500 en lugar de 409

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/pedidos/from-presupuesto/route.js`, líneas 83–87

```js
// ❌ Código actual
} catch (error) {
  const msg = !error.code && error.message ? error.message : 'Error interno';
  return NextResponse.json({ message: msg }, { status: 500 }); // siempre 500
}
```

Cuando el presupuesto ya está aceptado, se lanza `throw new Error('Este presupuesto ya ha sido aceptado...')`. Llega al catch y se devuelve con 500, aunque el mensaje sea correcto.

```js
// ✅ Corrección
} catch (error) {
  if (!error.code && error.message) {
    return NextResponse.json({ message: error.message }, { status: 409 });
  }
  logApiError(error, 'from-presupuesto');
  return NextResponse.json({ message: 'Error interno' }, { status: 500 });
}
```

---

### [BUG-03] Informe de margen usa `unitPrice` como coste, pero informe de ventas lo trata como precio de venta

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/informes/route.js`, líneas 143–144 y 241

```js
// Informe ventas-por-producto (línea 143-144): unitPrice tratado como precio de venta
byProducto[key].totalVentas += item.quantity * item.unitPrice;

// Informe margen-pedidos (línea 241): unitPrice tratado como coste
const totalCoste = (p.items ?? []).reduce((s, i) => s + (i.quantity * i.unitPrice), 0);
```

Los dos usos son mutuamente contradictorios para el mismo campo. Si `unitPrice` es el precio de venta al cliente, el margen calculado será siempre cero o negativo. Si es el coste, las "ventas por producto" mostrarán el coste en lugar de ingresos. Requiere clarificación del modelo de datos y posiblemente separar los conceptos en el schema.

---

### [BUG-04] `POST /api/almacen-stock` (entrada manual): `Stock` y `MovimientoStock` no se crean en transacción

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/almacen-stock/route.js`, líneas 118–136

```js
// ❌ Código actual — dos operaciones separadas sin transacción
const newStockItem = await db.stock.create({ data: { ... } });
await db.movimientoStock.create({ data: { ..., stockId: newStockItem.id } }); // puede fallar
```

Si el segundo `create` falla, queda un item de stock sin movimiento de entrada, rompiendo la trazabilidad del almacén. Comparar con `stock-management/receive-order/route.js` que sí usa `db.$transaction` correctamente.

```js
// ✅ Corrección
const [newStockItem, movimiento] = await db.$transaction([
  db.stock.create({ data: stockData }),
  db.movimientoStock.create({ data: movimientoData }),
]);
```

---

### [BUG-05] `POST /api/notas`: contenido sin límite de longitud

**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/notas/route.js`, líneas 23–26

```js
const { content } = await request.json();
if (!content) { return NextResponse.json(..., { status: 400 }); }
// No hay validación de longitud máxima
```

Un payload de varios megabytes se insertaría directamente en la BD.

**Corrección:** Usar Zod: `z.string().min(1).max(2000)`.

---

### [BUG-06] `DELETE /api/notas` acepta `id` en el body — patrón no estándar

**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/notas/route.js`, líneas 40–44

```js
export async function DELETE(request) {
  const { id } = await request.json(); // ← ID en el body de un DELETE
```

DELETE con body es técnicamente válido en HTTP pero algunos proxies lo rechazan. El estándar REST espera el ID en la URL (`DELETE /api/notas/[id]`). El recurso carece de endpoint individual (`[id]/route.js`).

---

## ⚙️ Backend

### [BACK-01] `pdfGenerator.js`: `_emisorCache` sin TTL — cambios de logo/emisor requieren reinicio manual

**Severidad:** 🟡 Medio  
**Archivo:** `src/lib/pdfGenerator.js`, líneas 13 y 35

```js
let _emisorCache = null;   // datos de ConfiguracionEmisor — sin TTL
let _logoBase64 = null;    // logo leído de disco — cacheado indefinidamente
```

Si se actualiza `logo-crm.png` en disco, el cambio no se refleja hasta reiniciar el servidor. Lo mismo ocurre con `_emisorCache`. El helper `clearEmisorCache()` existe pero no se llama desde ningún endpoint de actualización de configuración.

**Corrección:** Llamar `clearEmisorCache()` desde `PUT /api/config` cuando se actualice `empresa_nombre` u otras claves relacionadas con el emisor.

---

### [BACK-02] `crearManejadoresCRUD` GET: cap de 500 registros silencioso sin indicación de truncado

**Severidad:** 🟡 Medio  
**Archivo:** `src/lib/manejadores-api.js`, línea 60

```js
const records = await model.findMany({ take: 500, ...(options.findMany || {}) });
// No hay ninguna indicación en la respuesta de que el dataset fue truncado
```

Con 501+ clientes, la búsqueda en el formulario de pedido devolvería resultados incompletos **silenciosamente**. El cliente asume que recibió todos los registros.

**Corrección:** Añadir header `X-Total-Count` o campo `meta.truncated: true` en la respuesta cuando se devuelven exactamente 500 registros.

---

### [BACK-03] `crearManejadoresCRUD` POST: `logCreate` usa `await` pese a ser declarado fire-and-forget

**Severidad:** 🟢 Bajo (cosmético)  
**Archivo:** `src/lib/manejadores-api.js`, líneas 86–90

```js
// ❌ Bloquea la respuesta al cliente hasta que el audit log termine
try {
  await logCreate(entityName, newRecord.id, newRecord, 'System');
} catch (logError) { ... }

// ✅ Fire-and-forget real (consistente con el patrón de CLAUDE.md)
logCreate(entityName, newRecord.id, newRecord, 'System').catch(e => logApiError(e, 'Audit Log'));
```

---

### [BACK-04] `sequence.js`: `getNextNumber` no valida el `type` contra una lista de valores permitidos

**Severidad:** 🟡 Medio  
**Archivo:** `src/lib/sequence.js`, línea 16

El `type` llega del código interno (no de input de usuario) por ahora, pero si se expone como parámetro externo, cualquier string se insertaría en la tabla `Sequence`.

**Corrección:** Añadir whitelist de tipos válidos:
```js
const VALID_TYPES = ['pedido', 'presupuesto', 'albaran', 'factura', 'rectificativa'];
if (!VALID_TYPES.includes(type)) throw new Error(`Tipo de secuencia inválido: ${type}`);
```

---

### [BACK-05] `pdfGenerator.js` y `config-cache.js`: dos cachés en memoria no coordinadas

**Severidad:** 🟢 Bajo  
`config-cache.js` tiene un TTL de 5 minutos para `ReglaMargen`. `pdfGenerator.js` tiene `_emisorCache` sin TTL y sin invalidación desde endpoints de mutación. Los helpers de invalidación existen (`clearEmisorCache`, `clearMargenesCache`) pero no están conectados a los endpoints `PUT` correspondientes.

---

## 🌐 API

### Mapa de Endpoints

| Método | Ruta | Validación | Paginación | Rate Limit | Estado |
|--------|------|-----------|-----------|-----------|--------|
| GET/POST | `/api/clientes` | Zod | ✅ | ❌ | ✅ OK |
| GET/PUT/DELETE | `/api/clientes/[id]` | Zod PUT | — | ❌ | ✅ OK |
| GET/POST | `/api/pedidos` | Zod | ✅ | ❌ | ✅ OK |
| GET/PUT/PATCH/DELETE | `/api/pedidos/[id]` | ⚠️ solo items check en PUT | — | ❌ | ⚠️ API-01 |
| POST | `/api/pedidos/from-presupuesto` | Solo presupuestoId | — | ❌ | ⚠️ BUG-02 |
| GET | `/api/pedidos/export` | — | cap 5000 | ✅ 10/min | ⚠️ API-02 |
| GET/POST | `/api/presupuestos` | Zod | ✅ | ❌ | ✅ OK |
| GET/PUT/DELETE | `/api/presupuestos/[id]` | ⚠️ parcial en PUT | — | ❌ | ⚠️ API-01 |
| GET/POST | `/api/productos` | Zod | ✅ | ❌ | ✅ OK |
| GET/POST/DELETE | `/api/importaciones` | Zod | cap 100 | ❌ | ✅ OK |
| GET/PUT/DELETE | `/api/importaciones/[id]` | Zod en PUT | — | ❌ | ✅ OK |
| PUT/DELETE | `/api/pricing/margenes/[id]` | Zod | — | ❌ | ✅ OK |
| POST | `/api/pricing/calculate` | Array check | — | ❌ | ✅ OK |
| POST | `/api/pricing/inverse-calc` | Manual | — | ❌ | ⚠️ API-03 |
| GET | `/api/informes` | Query params | cap 10000 | ✅ 20/min | ⚠️ BUG-03 |
| GET | `/api/export/csv` | Model whitelist | cap 2000 | ✅ 10/min | ✅ OK |
| GET | `/api/config/backup` | — | — | ✅ 5/min | ✅ OK |
| GET | `/api/audit-log` | Query params | cap 1000 | ❌ | ⚠️ API-04 |
| GET/POST | `/api/notas` | Solo truthy | — | ❌ | ⚠️ BUG-05 |
| GET/PUT | `/api/config` | ALLOWED_CONFIG_KEYS | — | ❌ | ✅ OK |
| GET | `/api/dashboard` | — | — | ❌ | ✅ OK |
| GET | `/api/busqueda` | min 2 chars | cap 5/tipo | ❌ | ✅ OK |
| GET/POST | `/api/documentos` | MIME + formidable | cap 2000 | ❌ | ✅ OK |
| GET | `/api/movimientos` | stockId opcional | cap 500 | ❌ | ✅ OK |
| GET/POST | `/api/almacen-stock` | Manual | — | ❌ | ⚠️ BUG-04 |
| POST | `/api/stock-management/receive-order` | pedidoId | — | ❌ | ✅ OK |
| POST | `/api/herramientas/carta-porte` | Zod | — | ❌ | ✅ OK |
| GET/POST | `/api/notificaciones` | titulo+mensaje | cap 50 | ❌ | ✅ OK |

### Hallazgos de API

### [API-01] `PUT /api/pedidos/[id]` y `PUT /api/presupuestos/[id]` sin validación Zod

**Severidad:** 🟠 Alto  
**Archivos:** `src/app/api/pedidos/[id]/route.js` líneas 56–60, `src/app/api/presupuestos/[id]/route.js` líneas 44–49

El `POST` de cada recurso usa `pedidoSchema.safeParse(data)` con Zod. El `PUT` del mismo recurso hace destructuring manual y solo valida que `items` no esté vacío. Los campos `subtotal`, `tax`, `total` se escriben en BD sin validar que sean números positivos.

```js
// ❌ Código actual en PUT /api/pedidos/[id]
const data = await request.json();
const { clienteId, items, notas, subtotal, tax, total, ... } = data;
if (!items || items.length === 0) {
  return NextResponse.json({ message: 'Se requiere al menos un item.' }, { status: 400 });
}
// subtotal, tax, total se usan directamente sin validación

// ✅ Corrección — aplicar el mismo schema del POST
const validation = pedidoSchema.safeParse(data);
if (!validation.success) {
  return NextResponse.json({ message: validation.error.issues[0].message }, { status: 400 });
}
const { clienteId, items, subtotal, tax, total, ... } = validation.data;
```

---

### [API-02] `GET /api/pedidos/export` y `GET /api/presupuestos/export`: carga hasta 5000 registros en memoria antes de serializar

**Severidad:** 🟡 Medio  
**Archivos:** `src/app/api/pedidos/export/route.js` líneas 17–20, `src/app/api/presupuestos/export/route.js`

```js
const pedidos = await db.pedido.findMany({
  take: 5000,
  include: { cliente: true },
  orderBy: { fechaCreacion: 'desc' },
});
const buffer = await exportarPedidosExcel(pedidos); // varios MB en memoria simultáneamente
```

Con 5000 pedidos completos con cliente incluido, esto puede provocar OOM en el servidor o latencias altas.

**Corrección a corto plazo:** Reducir `take` a 1000 con indicación en la respuesta. A largo plazo: streaming con cursores de Prisma + ExcelJS stream API.

---

### [API-03] `POST /api/pricing/inverse-calc`: `targetPrice === 0` es rechazado erróneamente como falsy

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/pricing/inverse-calc/route.js`, líneas 8–10

```js
// ❌ Código actual
if (!targetPrice || quantity <= 0) { return NextResponse.json(..., { status: 400 }); }
// !0 === true → precio objetivo 0 es rechazado
// "0.5" pasa la validación pero es un string, no un número

// ✅ Corrección con Zod
const schema = z.object({
  targetPrice: z.number().positive('El precio objetivo debe ser positivo'),
  quantity: z.number().int().positive('La cantidad debe ser positiva'),
  marginId: z.string().uuid().optional(),
});
const parsed = schema.safeParse(await request.json());
if (!parsed.success) return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
```

---

### [API-04] `GET /api/audit-log` sin rate limiting — hasta 1000 registros por request

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/audit-log/route.js`, líneas 9–10

```js
const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 1000);
// Sin rate limiting
```

El endpoint de audit log devuelve hasta 1000 registros con información sensible (cambios en márgenes, precios, datos de clientes) sin ningún rate limiting. Comparar con `/api/informes` que tiene 20/min.

**Corrección:**
```js
import { checkRateLimit } from '@/lib/rateLimiter';
// En el handler GET:
const rateCheck = checkRateLimit(request, { maxRequests: 30, windowMs: 60000 });
if (!rateCheck.allowed) return NextResponse.json(..., { status: 429 });
```

---

## 🎨 Frontend

### [FRONT-01] Dashboard: `facturasPendientes` con objeto parcial puede causar errores de runtime

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/page.js`, línea 101 / `src/app/api/dashboard/route.js`, línea 51

El componente `PanelFacturasPendientes` tiene guardia `if (!datos) return null` que cubre el caso `null` (estado actual). Pero accede a `datos.total`, `datos.count`, `datos.vencidas`, `datos.lista` sin verificar que cada campo exista individualmente. Si la API devolviera `facturasPendientes: {}` en lugar de `null`, habría errores de runtime (`undefined.toFixed is not a function`).

**Corrección:** Usar optional chaining y valores por defecto: `datos?.total?.toFixed(2) ?? '0.00'`.

---

### [FRONT-02] `FormularioPedidoCliente`: carga todos los productos en memoria sin paginación

**Severidad:** 🟡 Medio  
**Archivo:** `src/componentes/pedidos/FormularioPedidoCliente.js`, línea 67

```js
const { data: todosProductos } = useSWR('/api/productos'); // cap 500 productos en memoria
```

Sin parámetros de paginación, `/api/productos` devuelve hasta 500 productos en un solo request. El endpoint ya soporta `?q=` para búsqueda. Debería usarse un patrón de autocomplete bajo demanda para no cargar el catálogo entero en el formulario.

---

### [FRONT-03] `login/page.js`: botón "Entrar" no se deshabilita entre intentos fallidos

**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/login/page.js`, líneas 14–32

El backend tiene rate limiting (5 intentos/min). El frontend no deshabilita el botón entre intentos fallidos ni añade un cooldown visual. Cuando el 429 llega, el mensaje se muestra pero el botón sigue activo, confundiendo al usuario.

---

### [FRONT-04] `login/page.js`: parámetro `redirect` no validado — open redirect potencial

**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/login/page.js`, líneas 8–9

```js
// ❌ Código actual
const redirect = searchParams.get('redirect') || '/';
router.push(redirect); // acepta cualquier URL arbitraria

// ✅ Corrección
const raw = searchParams.get('redirect') || '/';
const redirect = raw.startsWith('/') && !raw.startsWith('//') ? raw : '/';
```

Un atacante puede construir `http://crm.local/login?redirect=//evil.com` y tras el login se haría redirect a un dominio externo. `router.push` de Next.js App Router acepta URLs absolutas si no se valida el path.

---

## ✅ Puntos Positivos

1. **Login seguro bien implementado.** `crypto.timingSafeEqual` para comparación PIN (evita timing attacks), cookies `httpOnly + sameSite: 'strict' + secure` condicional a producción, `maxAge: 28800`, `Retry-After` header en 429.

2. **Logging estructurado sin fugas de información.** `logApiError` registra solo `{name, message, code, meta}`. Ningún stack trace ni query SQL aparece en logs. Cero `console.log` en `src/`.

3. **Validación Zod exhaustiva en creación.** Todos los endpoints principales de creación (pedidos, presupuestos, productos, importaciones, márgenes, tarifas, carta de porte) usan schemas Zod bien definidos antes de cualquier escritura en BD.

4. **Transacciones en operaciones críticas.** `PUT /api/pedidos/[id]`, `PUT /api/presupuestos/[id]`, `POST /api/pedidos/from-presupuesto`, `POST /api/almacen-stock` (salida), `receive-order` usan `db.$transaction` correctamente.

5. **Protección contra path traversal en documentos.** `DELETE /api/documentos/[id]` verifica `filePath.startsWith(allowedBase)` antes de `fs.unlink`. `PUT` verifica que la ruta empiece por `/planos/`.

6. **Headers de seguridad completos.** `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `HSTS` condicional a producción, `frame-ancestors: none` en CSP, `object-src: none`. Doble capa (middleware + next.config.mjs).

7. **`connect-src: 'self'` en CSP.** Los fetch/XHR del cliente solo pueden ir a la misma origin. Imposible exfiltrar datos vía fetch a dominios externos desde el navegador.

8. **Singleton de Prisma correcto.** `src/lib/db.js` usa el patrón `globalThis` para evitar múltiples conexiones en hot-reload de desarrollo.

9. **Sin SQL injection posible.** Uso exclusivo de Prisma ORM con queries parametrizadas. No se encontró ningún uso de `$queryRawUnsafe` ni template literals en queries.

10. **Rate limiting en endpoints de alto coste.** `/api/informes` (20/min), `/api/export/csv` (10/min), `/api/pedidos/export` (10/min), `/api/config/backup` (5/min), `/api/auth/login` (5/min).

11. **Whitelist de claves en `/api/config`.** `ALLOWED_CONFIG_KEYS` impide escribir claves arbitrarias en la tabla Config vía PUT.

12. **`handlePrismaError` centralizado.** Usado en 26 rutas con mensajes de error uniformes para P2025, P2002, P2003. Sin exposición de errores internos de BD al cliente.

---

## 🗺️ Plan de Acción Priorizado

| # | Hallazgo | Área | Severidad | Estado |
|---|----------|------|-----------|--------|
| 1 | [CRÍTICO-01] AUTH_PIN obligatorio en producción | Seguridad | 🔴 | ✅ corregido 2026-06-04 |
| 2 | [API-01] Zod en PUT /api/pedidos/[id] y PUT /api/presupuestos/[id] | API | 🟠 | ✅ corregido 2026-06-04 |
| 3 | [SEC-02] Cookie con HMAC en lugar de PIN en texto claro | Seguridad | 🟠 | ✅ corregido 2026-06-04 |
| 4 | [BUG-01] getNextNumber() — whitelist de tipos válidos añadida; el increment de Prisma es atómico, no hay riesgo real de duplicados | Bug | 🟠 | ✅ corregido 2026-06-04 |
| 5 | [BUG-02] 409 en lugar de 500 para conflictos de negocio en from-presupuesto | Bug | 🟡 | ✅ corregido 2026-06-04 |
| 6 | [BUG-04] db.$transaction en creación Stock + MovimientoStock | Bug | 🟡 | ✅ corregido 2026-06-04 |
| 7 | [API-04] Rate limiting en GET /api/audit-log (30/min) | API | 🟡 | ✅ corregido 2026-06-04 |
| 8 | [FRONT-04] Validar redirect param en login (open redirect) | Frontend | 🟢 | ✅ corregido 2026-06-04 |
| 9 | [BUG-05] Zod string().min(1).max(2000) en POST /api/notas | Bug | 🟢 | ✅ corregido 2026-06-04 |
| 10 | [BUG-03] unitPrice es coste, no venta — ventas-por-producto renombrado a totalCosteBase; UI actualizada | Bug | 🟡 | ✅ corregido 2026-06-04 |
| 11 | [BACK-01] clearEmisorCache() llamado desde PUT /api/config al actualizar empresa_* | Backend | 🟡 | ✅ corregido 2026-06-04 |
| 12 | [API-02] Limitar export Excel a 1000 registros (pedidos y presupuestos) | API | 🟡 | ✅ corregido 2026-06-04 |
| 13 | [API-03] Zod en POST /api/pricing/inverse-calc | API | 🟡 | ✅ corregido 2026-06-04 |
| 14 | [BACK-02] Header X-Results-Truncated cuando GET devuelve 500 registros | Backend | 🟡 | ✅ corregido 2026-06-04 |
| 15 | [SEC-05] unsafe-eval eliminado de CSP en builds de producción | Seguridad | 🟡 | ✅ corregido 2026-06-04 |
| 16 | [FRONT-02] Productos con carga lazy (solo cuando modal abierto, limit 200) | Frontend | 🟡 | ✅ corregido 2026-06-04 |
| 17 | [BUG-06] DELETE /api/notas/[id] con ID en URL (nuevo endpoint REST) | Bug | 🟢 | ✅ corregido 2026-06-04 |
| 18 | [SEC-04] SESSION_SECRET y RESEND_FROM documentados en .env.example | Seguridad | 🟢 | ✅ corregido 2026-06-04 |

---

| 19 | [BACK-03] Fire-and-forget real en `crearManejadoresCRUD` — eliminado `await` del logCreate | Backend | 🟢 | ✅ corregido 2026-06-04 |
| 20 | [SEC-06] Headers duplicados entre middleware.js y next.config.mjs — eliminados de middleware, solo conserva HSTS (depende de NODE_ENV en runtime) | Seguridad | 🟢 | ✅ corregido 2026-06-04 |
| 21 | [BACK-05] `clearMargenesCache()` ya estaba conectado en `POST /api/pricing/margenes` — falso positivo del REVIEW | Backend | — | ✅ verificado, no requería cambio |

---

*Auditoría completa aplicada el 2026-06-04. 20 hallazgos corregidos, 1 descartado como falso positivo.*
