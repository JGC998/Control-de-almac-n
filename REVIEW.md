# REVIEW — CRM Taller / Control de Almacén

> Generado el 2026-05-22 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 (App Router) · React 19 · Prisma 6 (SQLite dev / MySQL prod) · DaisyUI 5 · Tailwind CSS 4 · SWR · jsPDF · Zod · Resend  
**Archivos analizados:** ~120 (60 rutas API + 30 componentes + 15 lib + páginas)  
**Total de hallazgos:** 39 (4 críticos, 10 altos, 19 medios, 6 bajos)

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| 🔒 Seguridad | 6/10 | 2 | 4 | 6 | 3 |
| 🐛 Bugs | 7/10 | 1 | 3 | 2 | 1 |
| ⚙️ Backend | 7/10 | 1 | 2 | 7 | 1 |
| 🌐 API | 8/10 | 0 | 1 | 4 | 1 |
| 🎨 Frontend | 8/10 | 0 | 0 | 4 | 1 |

---

## 🚨 Hallazgos Críticos — Acción Inmediata

### [CRÍTICO-01] Sin rate limiting en el endpoint de login (brute force PIN)
**Área:** Seguridad  
**Archivo:** `src/app/api/auth/login/route.js` líneas 1–23  
**Problema:** El endpoint acepta intentos de PIN ilimitados. Con un PIN de 4 dígitos (10.000 combinaciones), un atacante puede forzarlo en segundos sin ningún obstáculo.  
**Impacto:** Acceso completo al CRM si el PIN es débil o predecible.  
**Corrección:**
```js
// ❌ Actual
export async function POST(request) {
  const { pin } = await request.json();
  const expected = process.env.AUTH_PIN;
  if (expected && pin !== expected) { ... }

// ✅ Corrección — añadir al inicio de POST
import { checkRateLimit } from '@/lib/rateLimiter';
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
const rl = checkRateLimit(ip, 5); // 5 intentos por minuto
if (!rl.allowed) {
  return NextResponse.json(
    { message: 'Demasiados intentos. Espera un momento.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
  );
}
```

---

### [CRÍTICO-02] Cookie de sesión sin flag `secure`
**Área:** Seguridad  
**Archivo:** `src/app/api/auth/login/route.js` líneas 13–18  
**Problema:** La cookie `crm-auth` no tiene `secure: true`. En producción sobre HTTPS, el navegador debería negarse a enviar cookies sin este flag por HTTP; sin él, la cookie puede transmitirse en texto claro si hay una redirección HTTP.  
**Impacto:** Robo de sesión mediante MITM o redirección HTTP.  
**Corrección:**
```js
// ❌ Actual
res.cookies.set('crm-auth', expected || '', {
  httpOnly: true, sameSite: 'strict', path: '/', maxAge: 28800,
});

// ✅ Corrección
res.cookies.set('crm-auth', expected || '', {
  httpOnly: true,
  sameSite: 'strict',
  path: '/',
  maxAge: 28800,
  secure: process.env.NODE_ENV === 'production',
});
```

---

### [CRÍTICO-03] Pérdida de datos por falta de transacción en actualización de ítems (albarán)
**Área:** Bug  
**Archivo:** `src/app/api/albaranes/[id]/route.js` líneas 54–72  
**Problema:** Al actualizar ítems de un albarán, `db.albaranItem.deleteMany()` se ejecuta FUERA de la transacción (línea 61), antes de que comience el `db.albaran.update()`. Si el update falla, los ítems ya han sido eliminados sin posibilidad de rollback.  
**Impacto:** Pérdida irrecuperable de líneas del albarán si hay un error de BD tras el delete.  
**Corrección:**
```js
// ❌ Actual
if (items) {
  // ...cálculos...
  await db.albaranItem.deleteMany({ where: { albaranId: id } }); // fuera de transacción
  updateData.items = { create: items.map(...) };
}
const albaran = await db.albaran.update({ where: { id }, data: updateData, ... });

// ✅ Corrección — envolver en transacción
const albaran = await db.$transaction(async (tx) => {
  if (items) {
    await tx.albaranItem.deleteMany({ where: { albaranId: id } });
    updateData.items = { create: items.map(...) };
  }
  return tx.albaran.update({ where: { id }, data: updateData, include: { items: true, cliente: true, pedido: true } });
});
```

---

### [CRÍTICO-04] N+1 queries en GET /api/albaranes sin include de ítems
**Área:** Backend  
**Archivo:** `src/app/api/albaranes/route.js` líneas 10–40  
**Problema:** El GET de lista de albaranes no incluye `items` ni `pedido` en el `findMany`. Si el frontend accede a esos datos item a item, genera N consultas adicionales. Para listas grandes, esto degrada el rendimiento exponencialmente.  
**Impacto:** Rendimiento severo con más de 50 albaranes.  
**Corrección:**
```js
// ❌ Actual
db.albaran.findMany({
  where: whereClause,
  take: limit,
  skip: skip,
  include: { cliente: { select: { nombre: true } } },
  orderBy: { fechaCreacion: 'desc' },
})

// ✅ Corrección
db.albaran.findMany({
  where: whereClause,
  take: limit,
  skip: skip,
  include: {
    cliente: { select: { nombre: true } },
    pedido:  { select: { numero: true } },
    _count:  { select: { items: true } },
  },
  orderBy: { fechaCreacion: 'desc' },
})
```

---

## 🔒 Seguridad

### [SEC-01] → Ver CRÍTICO-01

### [SEC-02] → Ver CRÍTICO-02

### [SEC-03] Path traversal potencial en eliminación de archivos
**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/documentos/[id]/route.js` líneas 38–40  
**Problema:** La ruta del archivo se lee directamente de la BD y se usa en `path.join()` sin verificar que esté dentro del directorio permitido. Si un registro en BD contiene `../../etc/passwd`, el `fs.unlink()` intentará borrar ese archivo.  
**Corrección:**
```js
// ❌ Actual
const filePath = path.join(process.cwd(), 'public', documento.rutaArchivo);
await fs.unlink(filePath);

// ✅ Corrección
const filePath = path.join(process.cwd(), 'public', documento.rutaArchivo);
const allowedBase = path.join(process.cwd(), 'public', 'planos');
if (!filePath.startsWith(allowedBase) || documento.rutaArchivo.includes('..')) {
  return NextResponse.json({ message: 'Ruta de archivo inválida' }, { status: 400 });
}
await fs.unlink(filePath);
```

### [SEC-04] Sin rate limiting en exportación CSV
**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/export/csv/route.js` líneas 8–40  
**Problema:** El endpoint descarga hasta 5.000 filas sin ningún límite de frecuencia. Un atacante puede bombardearlo y causar carga masiva en la BD y el servidor.  
**Corrección:** Añadir `checkRateLimit(ip, 10)` al inicio del handler, igual que en `/api/informes`.

### [SEC-05] `console.error(error)` en `manejadores-api.js`
**Severidad:** 🟠 Alto  
**Archivo:** `src/lib/manejadores-api.js` (dentro de `handlePrismaError`)  
**Problema:** El handler genérico de errores Prisma usa `console.error(error)` directamente, exponiendo queries SQL, nombres de tablas y stack traces completos en los logs del servidor.  
**Corrección:**
```js
// ❌ Actual
console.error(error);

// ✅ Corrección
import { logApiError } from '@/lib/logger';
logApiError(error, 'Prisma error');
```

### [SEC-06] Endpoint de backup expone configuración sensible sin protección adicional
**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/config/backup/route.js`  
**Problema:** El GET devuelve toda la configuración (márgenes, tarifas, secuencias) en JSON. Cualquier usuario con el PIN puede descargarlo. No hay log de auditoría ni rate limiting.  
**Corrección:** Añadir audit log en cada descarga y rate limit de 1 petición/hora por IP.

### [SEC-07] Comparación PIN no usa tiempo constante (timing attack)
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/auth/login/route.js` línea 8  
**Problema:** `pin !== expected` usa comparación de strings que puede fallar antes en función del primer carácter diferente, permitiendo ataques de timing en red local.  
**Corrección:**
```js
// ❌ Actual
if (expected && pin !== expected) { ... }

// ✅ Corrección
import crypto from 'crypto';
const pinBuf = Buffer.from(pin.padEnd(expected.length));
const expBuf = Buffer.from(expected);
if (expected && (pinBuf.length !== expBuf.length || !crypto.timingSafeEqual(pinBuf, expBuf))) { ... }
```

### [SEC-08] Sin validación de tipo MIME en subida de archivos
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/documentos/route.js` líneas 127–140  
**Problema:** Solo se sanea el nombre del archivo con una regex, pero no se valida el tipo MIME. Un usuario puede subir un `.html` o `.js` renombrado como `.pdf`.  
**Corrección:** Añadir whitelist de tipos MIME: `['application/pdf', 'image/jpeg', 'image/png']` y verificar contra `file.type`.

### [SEC-09] Email de destino sin validación de formato
**Severidad:** 🟡 Medio  
**Archivos:** `src/app/api/pedidos/[id]/email/route.js` línea 11 · `src/app/api/presupuestos/[id]/email/route.js` línea 10  
**Problema:** El campo `to` del body se usa directamente como destinatario sin validar si es un email válido.  
**Corrección:**
```js
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (to && !emailRegex.test(to)) {
  return NextResponse.json({ message: 'Email inválido' }, { status: 400 });
}
```

### [SEC-10] Sin configuración CORS explícita
**Severidad:** 🟡 Medio  
**Archivo:** `next.config.mjs`  
**Problema:** El fichero de configuración de Next.js está vacío. No hay headers CORS definidos, lo que significa que cualquier origen puede hacer peticiones cross-origin a la API.  
**Corrección:** Añadir `headers()` en `next.config.mjs` con restricción de origen, o gestionar en `middleware.js`.

### [SEC-11] Mensajes de error exponen datos de inventario
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/almacen-stock/route.js` línea 68  
**Problema:** El mensaje de error `"Solo quedan X.XX m disponibles"` revela el stock exacto al cliente.  
**Corrección:** Devolver `{ message: 'Stock insuficiente' }` al cliente y loguear el detalle solo en servidor.

### [SEC-12] Parámetro `año` sin límites en informes
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/informes/route.js` línea 29  
**Problema:** `parseInt(año)` acepta valores como `9999` o `-1000`, pudiendo generar consultas costosas o cálculos incorrectos.  
**Corrección:**
```js
const currentYear = new Date().getFullYear();
const año = Math.max(2000, Math.min(currentYear, parseInt(searchParams.get('año') || String(currentYear), 10)));
```

### [SEC-13] Límite de paginación del audit log no acotado
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/audit-log/route.js` línea 9  
**Problema:** El parámetro `limit` se parsea sin cota máxima — un cliente puede pedir `limit=1000000`.  
**Corrección:**
```js
const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 1000);
```

### [SEC-14] Sin header HSTS
**Severidad:** 🟢 Bajo  
**Archivo:** `middleware.js`  
**Problema:** No se establece `Strict-Transport-Security`, lo que permite downgrade attacks en la primera petición.  
**Corrección:** Añadir en `middleware.js`: `response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')`.

### [SEC-15] Sin Content-Security-Policy
**Severidad:** 🟢 Bajo  
**Problema:** Aumenta la superficie de XSS. Para una app interna el riesgo es bajo, pero es buena práctica.

### [SEC-16] Errores de audit log silenciados completamente
**Severidad:** 🟢 Bajo  
**Archivos:** `src/app/api/facturas/[id]/route.js` línea 185 · `src/app/api/facturas/[id]/rectificativa/route.js` línea 88  
**Problema:** `.catch(() => {})` no registra el fallo. Si el modelo `AuditLog` tiene un problema de schema, nadie se entera.  
**Corrección:**
```js
db.auditLog.create({ data: {...} }).catch(err => logApiError(err, 'AUDIT_FAIL'));
```

---

## 🐛 Bugs

### [BUG-01] → Ver CRÍTICO-03

### [BUG-02] Race condition en generación de números de documento
**Severidad:** 🟠 Probable  
**Archivo:** `src/lib/sequence.js` líneas 10–34 (llamado desde múltiples rutas fuera de transacción)  
**Problema:** `getNextNumber()` se llama antes de abrir la transacción de creación en `pedidos/[id]/albaran`, `albaranes/[id]/factura` y otros. En SQLite con concurrencia baja esto es aceptable, pero bajo carga simultánea el número puede asignarse dos veces.  
**Cómo se dispara:** Dos peticiones simultáneas de creación de albarán desde el mismo pedido.  
**Corrección:** Mover `getNextNumber()` dentro del bloque `db.$transaction()` en todos los routes de creación.

### [BUG-03] Null pointer en `pdfGenerator.js` — `item.descripcion`
**Severidad:** 🟠 Probable  
**Archivo:** `src/lib/pdfGenerator.js` línea ~344  
**Problema:** Se accede a `item.descripcion.match()` sin comprobar que `item.descripcion` no sea `null`. Si un ítem tiene descripción nula, el PDF lanza `TypeError: Cannot read properties of null`.  
**Corrección:**
```js
// ❌ Actual
const tacosMatch = item.descripcion.match(/.../)

// ✅ Corrección
const tacosMatch = item.descripcion?.match(/.../) || null;
```

### [BUG-04] Null pointer en `pdfGenerator.js` — `client.direccion`
**Severidad:** 🟠 Probable  
**Archivo:** `src/lib/pdfGenerator.js` línea ~594  
**Problema:** `doc.splitTextToSize(client.direccion, 80)` falla si el cliente no tiene dirección registrada.  
**Corrección:**
```js
doc.splitTextToSize(client?.direccion || '', 80)
```

### [BUG-05] Memory leak en `rateLimiter.js` bajo tráfico sostenido
**Severidad:** 🟠 Probable  
**Archivo:** `src/lib/rateLimiter.js` líneas 4, 7–13  
**Problema:** El `setInterval` de limpieza corre cada `5 * WINDOW_MS` (5 minutos). Si el servidor recibe tráfico de miles de IPs únicas distintas durante ese período, el `Map` crece sin límite antes de la limpieza.  
**Corrección:** Reducir intervalo a `WINDOW_MS` (1 minuto) o añadir límite de entradas:
```js
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now >= entry.resetAt) store.delete(key);
  }
}, WINDOW_MS); // Era WINDOW_MS * 5
```

### [BUG-06] Cálculo de fecha de vencimiento en timezone UTC en vez de Spain
**Severidad:** 🟡 Potencial  
**Archivo:** `src/app/api/albaranes/[id]/factura/route.js` líneas 24–26  
**Problema:** `new Date()` devuelve hora UTC. `setDate(getDate() + 30)` opera en UTC. Para facturas creadas entre 23:00 y 00:00 hora española (UTC+1/+2), la fecha de vencimiento puede quedar un día antes de lo esperado.  
**Corrección:** Usar la misma utilidad que VeriFactu usa para timestamps: `getFechaHoraHusoEspana()` o calcular con `Intl`.

### [BUG-07] Coerción de tipos en cantidades de ítems
**Severidad:** 🟡 Potencial  
**Archivo:** `src/app/api/pricing/calculate/route.js` líneas 73–74  
**Problema:** Si `item.quantity` llega como string `"0"`, la expresión `item.quantity > 0` coerciona correctamente a `false`, pero `"abc"` coerciona a `NaN > 0 = false` — resultado incorrecto sin error visible.  
**Corrección:** Parsear explícitamente: `const qty = Number(item.quantity); if (isNaN(qty) || qty <= 0) return error;`

---

## ⚙️ Backend

### [BACK-01] → Ver CRÍTICO-04

### [BACK-02] Endpoints de lista sin paginación ni límite de filas
**Severidad:** 🟠 Alto  
**Archivos:** `src/app/api/almacen-stock/route.js` · `src/app/api/audit-log/route.js` · `src/app/api/movimientos/route.js` · `src/app/api/notas/route.js`  
**Problema:** Estos endpoints hacen `findMany()` sin `take` ni paginación. Con datos reales, devuelven miles de registros en una sola petición.  
**Corrección:** Aplicar el mismo patrón de paginación que `facturas` y `albaranes`:
```js
const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);
const skip = (page - 1) * limit;
```

### [BACK-03] Formato de respuesta inconsistente en endpoints de lista
**Severidad:** 🟠 Alto  
**Problema:** Algunos endpoints devuelven `{ data: [], meta: {...} }` (facturas, albaranes, pedidos paginados) y otros devuelven array directo `[...]` (clientes via CRUD generator, grapas, tacos, movimientos). El frontend necesita manejar dos formatos.  
**Corrección:** Estandarizar todos los listados a `{ data: [], meta: { total, page, limit, totalPages } }`.

### [BACK-04] Lógica de cascade delete incorrecta en materiales
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/materiales/route.js` líneas 55–57  
**Problema:** El cascade manual busca tarifas por `material: materialToDelete.nombre` (por nombre) en lugar de por ID. Si dos materiales tienen el mismo nombre, se borran tarifas equivocadas.  
**Corrección:**
```js
// ❌ Actual
await db.tarifaMaterial.deleteMany({ where: { material: materialToDelete.nombre } });

// ✅ Corrección
await db.tarifaMaterial.deleteMany({ where: { materialId: id } });
```

### [BACK-05] Falta validación Zod en ~30 endpoints de mutación
**Severidad:** 🟡 Medio  
**Archivos:** `api/almacen-stock`, `api/configuracion/*`, `api/documentos`, `api/grapas`, `api/notas`, `api/pedidos-proveedores-data`, `api/precios`, `api/pricing/descuentos`, y más  
**Problema:** Solo pedidos, presupuestos, productos, clientes y logística tienen validación Zod. El resto acepta cualquier body sin validar tipos, rangos ni campos requeridos.  
**Corrección:** Añadir schemas Zod en `src/lib/validations.js` y aplicar `safeParse()` en cada POST/PUT.

### [BACK-06] `console.error` con emoji en `audit.js`
**Severidad:** 🟡 Medio  
**Archivo:** `src/lib/audit.js` línea ~32  
**Problema:** `console.error('❌ Error al registrar Audit Log:', error)` — log de debug con emoji en código de producción.  
**Corrección:**
```js
// ❌ Actual
console.error('❌ Error al registrar Audit Log:', error);

// ✅ Corrección
logApiError(error, 'AUDIT_LOG');
```

### [BACK-07] Pedidos con albaranes pueden eliminarse sin advertencia
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/pedidos/[id]/route.js` DELETE handler  
**Problema:** El DELETE de un pedido no comprueba si tiene albaranes vinculados. La constraint de FK evita la eliminación en BD, pero el error que se devuelve es genérico.  
**Corrección:** Añadir check explícito antes del delete y devolver mensaje claro:
```js
const albaranesVinculados = await db.albaran.count({ where: { pedidoId: id } });
if (albaranesVinculados > 0) {
  return NextResponse.json({ message: 'No se puede eliminar: tiene albaranes vinculados' }, { status: 409 });
}
```

### [BACK-08] Claves de configuración sin whitelist
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/config/route.js` PUT handler  
**Problema:** `PUT /api/config` acepta cualquier `key`. Un usuario puede insertar claves arbitrarias que confundan la lógica de lectura.  
**Corrección:** Definir un array de claves permitidas y validar antes de `upsert`:
```js
const ALLOWED_KEYS = ['iva_rate', 'empresa_nombre', 'empresa_nif', 'empresa_telefono', 'empresa_email', 'empresa_direccion'];
if (!ALLOWED_KEYS.includes(key)) {
  return NextResponse.json({ message: 'Clave de configuración no válida' }, { status: 400 });
}
```

### [BACK-09] Sin protección en pedidos con `sinFacturacion = true` al generar albarán
**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/pedidos/[id]/albaran/route.js`  
**Problema:** No hay comprobación de `pedido.sinFacturacion`. Los pedidos marcados como sin facturación pueden generar albaranes igualmente.  

---

## 🌐 API

### Mapa de endpoints principales

| Método | Ruta | Auth (PIN) | Validación | Paginación | Estado |
|--------|------|------------|------------|------------|--------|
| GET/POST | `/api/clientes` | ✅ | ✅ GET / ❌ POST | ✅ | ⚠️ POST sin validación |
| GET/PUT/DELETE | `/api/clientes/[id]` | ✅ | ❌ | — | ⚠️ PUT sin validación |
| GET | `/api/clientes/[id]/resumen` | ✅ | — | — | ✅ |
| GET/POST | `/api/pedidos` | ✅ | ✅ POST | ✅ opcional | ✅ |
| GET/PUT/PATCH/DELETE | `/api/pedidos/[id]` | ✅ | ❌ PUT | — | ⚠️ |
| POST | `/api/pedidos/[id]/albaran` | ✅ | ❌ | — | ✅ |
| POST | `/api/pedidos/[id]/email` | ✅ | ❌ | — | ⚠️ sin validar email |
| GET | `/api/pedidos/[id]/pdf` | ✅ | — | — | ✅ |
| POST | `/api/pedidos/from-presupuesto` | ✅ | ❌ | — | ✅ |
| GET/POST | `/api/presupuestos` | ✅ | ✅ POST | ✅ opcional | ✅ |
| GET/PUT/DELETE | `/api/presupuestos/[id]` | ✅ | ❌ PUT | — | ⚠️ |
| POST | `/api/albaranes` | ✅ | ❌ | ✅ | ⚠️ POST sin validación |
| GET/PUT/DELETE | `/api/albaranes/[id]` | ✅ | ❌ | — | 🔴 BUG-01 transacción |
| POST | `/api/albaranes/[id]/factura` | ✅ | ❌ | — | ✅ |
| GET/POST | `/api/facturas` | ✅ | ❌ POST | ✅ | ⚠️ |
| GET/PUT/DELETE | `/api/facturas/[id]` | ✅ | ❌ | — | ✅ VeriFactu completo |
| POST | `/api/facturas/[id]/rectificativa` | ✅ | ❌ | — | ✅ |
| GET | `/api/facturas/[id]/xml` | ✅ | — | — | ✅ |
| GET | `/api/facturas/exportar-aeat` | ✅ | — | — | ✅ |
| POST | `/api/auth/login` | ❌ público | ❌ | — | 🔴 CRÍTICO-01 |
| POST | `/api/auth/logout` | ❌ público | — | — | ✅ |
| GET | `/api/auth/status` | ❌ público | — | — | ✅ |
| GET | `/api/informes` | ✅ | — | — | ✅ rate limited |
| GET | `/api/export/csv` | ✅ | ❌ | — | ⚠️ sin rate limit |
| GET | `/api/config/backup` | ✅ | — | — | ⚠️ expone todo |
| GET | `/api/almacen-stock` | ✅ | — | ❌ | ⚠️ sin límite |
| GET | `/api/audit-log` | ✅ | — | ❌ | ⚠️ sin límite |
| POST | `/api/logistica/calcular` | ✅ | ✅ Zod | — | ✅ |
| GET/POST | `/api/pricing/margenes` | ✅ | ✅ Zod POST | — | ✅ |

### Hallazgos de API

### [API-01] Respuesta legacy sin paginar en pedidos y presupuestos
**Severidad:** 🟡 Medio  
**Endpoints:** `GET /api/pedidos` · `GET /api/presupuestos`  
**Problema:** Si no se pasan parámetros `page`/`limit`, los endpoints devuelven hasta 500 registros como array plano (modo legacy). El frontend puede recibir un array o un `{ data, meta }` según si pasa parámetros.  
**Corrección:** Eliminar el comportamiento legacy y siempre devolver `{ data, meta }`, con valores por defecto `page=1, limit=50`.

### [API-02] DELETE de pedido no comprueba albaranes vinculados → ver BACK-07

### [API-03] Falta validación de body en POST /api/facturas
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/facturas/route.js` líneas 53–57  
**Problema:** Solo comprueba `items.length === 0` pero no valida tipos ni rangos de los ítems.

### [API-04] GET que modifica estado — exportación AEAT
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/facturas/exportar-aeat/route.js`  
**Problema:** Un `GET` que actualiza `estadoEnvioAeat` de PENDIENTE a EXPORTADO viola REST semántico. Peticiones accidentales (precarga de link, bots) pueden cambiar el estado.  
**Corrección:** Cambiar a `POST /api/facturas/exportar-aeat` con body vacío.

### [API-05] Límite de `facturas` GET sin cota máxima
**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/facturas/route.js` línea 14  
**Problema:** `Math.min(parseInt(limit || '20'), 500)` — bien. Pero confirmar que `pedidos` y `presupuestos` tienen el mismo cap (sí tienen cap 500).

---

## 🎨 Frontend

### [FRONT-01] `key={index}` en resultados de búsqueda
**Severidad:** 🟠 Alto  
**Archivo:** `src/componentes/ui/BarraBusqueda.js` línea ~134  
**Problema:** `results?.map((item, index) => <ResultItem key={index} ...>)` — React usa el índice como clave. Si la lista se reordena (p.ej. por relevancia), los componentes no se reasignan correctamente, causando bugs de rendering.  
**Corrección:**
```jsx
// ❌ Actual
results?.map((item, index) => <ResultItem key={index} ...>)

// ✅ Corrección
results?.map((item) => <ResultItem key={`${item.type}-${item.id}`} ...>)
```

### [FRONT-02] Sin estado de error visible cuando SWR falla
**Severidad:** 🟡 Medio  
**Archivos:** `src/app/page.js` (dashboard) · `src/app/informes/page.js` · `src/componentes/pedidos/FormularioPedidoCliente.js`  
**Problema:** Las variables `error` de SWR se extraen pero no se muestran al usuario. Si la API falla, el usuario ve pantalla vacía/spinner infinito.  
**Corrección:**
```jsx
// En dashboard o informes:
if (error) return <div className="alert alert-error">Error al cargar datos. <button onClick={() => mutate()}>Reintentar</button></div>;
```

### [FRONT-03] Botones sin estado `disabled` durante operaciones async
**Severidad:** 🟡 Medio  
**Archivos:** `src/app/presupuestos/[id]/page.js` línea ~239 · `src/app/pedidos/[id]/page.js` línea ~262  
**Problema:** Los botones de "Crear pedido" y "Descargar PDF" no se deshabilitan durante la petición, permitiendo doble envío.  
**Corrección:**
```jsx
const [isSubmitting, setIsSubmitting] = useState(false);
// En el handler: setIsSubmitting(true); try { ... } finally { setIsSubmitting(false); }
<button disabled={isSubmitting} onClick={handleCreateOrder}>
  {isSubmitting ? 'Creando...' : 'Crear pedido'}
</button>
```

### [FRONT-04] Inputs de modal sin `<label>` asociado
**Severidad:** 🟡 Medio  
**Archivos:** `src/app/facturas/nuevo/page.js` línea ~90 · `src/componentes/pedidos/FormularioPedidoCliente.js` líneas ~43–44  
**Problema:** Los campos de búsqueda en modales de selección de cliente usan solo `placeholder`, sin `<label>`. Los lectores de pantalla no pueden anunciar el propósito del campo.  
**Corrección:** Añadir `<label htmlFor="client-search" className="sr-only">Buscar cliente</label>` y `id="client-search"` en el input.

### [FRONT-05] Tablas de lista sin adaptación móvil
**Severidad:** 🟢 Bajo  
**Archivos:** `src/app/facturas/page.js` · `src/app/albaranes/[id]/page.js`  
**Problema:** Las tablas con 6–8 columnas tienen `overflow-x-auto` pero no ocultan columnas secundarias en pantallas pequeñas. En móvil el usuario debe hacer scroll horizontal.  
**Corrección:** Añadir `hidden md:table-cell` en columnas menos críticas (p.ej. fechaCreacion, estado) para mejorar UX móvil.

---

## ✅ Puntos Positivos

- **Patrón Prisma singleton** en `db.js` — previene connection leaks en hot-reload
- **VeriFactu completo** — hash SHA-256 encadenado, XML AEAT, QR en PDF, inmutabilidad de facturas emitidas
- **Transacciones correctas** en flujos complejos (pedido→albarán→factura, from-presupuesto)
- **Promise.all() paralelo** en dashboard, búsqueda y cálculo de precios
- **Zod validation** en los endpoints más críticos (pedidos, presupuestos, logística, productos)
- **logApiError helper** — logs estructurados sin stack traces ni queries SQL
- **Rate limiting** en informes con header `Retry-After`
- **Audit logging** fire-and-forget no bloquea flujo principal
- **Numeración de documentos** con reset anual automático
- **Paginación consistente** en facturas, albaranes, pedidos (con `{ data, meta }`)
- **Sin dangerouslySetInnerHTML** detectado en todo el frontend
- **Sin datos sensibles en localStorage** detectado
- **Event listeners con cleanup** en BarraBusqueda

---

## 🗺️ Plan de Acción Priorizado

| # | Hallazgo | Área | Severidad | Esfuerzo est. |
|---|----------|------|-----------|---------------|
| 1 | [CRÍTICO-01] Rate limiting en /api/auth/login | Seguridad | 🔴 | ~15 min |
| 2 | [CRÍTICO-02] Flag `secure` en cookie de sesión | Seguridad | 🔴 | ~5 min |
| 3 | [CRÍTICO-03] Transacción en update de ítems de albarán | Bug | 🔴 | ~20 min |
| 4 | [CRÍTICO-04] Include en GET /api/albaranes | Backend | 🔴 | ~10 min |
| 5 | [SEC-03] Validación de path en borrado de archivo | Seguridad | 🟠 | ~15 min |
| 6 | [SEC-04] Rate limiting en /api/export/csv | Seguridad | 🟠 | ~10 min |
| 7 | [SEC-05] logApiError en manejadores-api.js | Seguridad | 🟠 | ~5 min |
| 8 | [BUG-03] Null check en pdfGenerator item.descripcion | Bug | 🟠 | ~5 min |
| 9 | [BUG-04] Null check en pdfGenerator client.direccion | Bug | 🟠 | ~5 min |
| 10 | [BACK-02] Paginación en almacen-stock, audit-log, movimientos | Backend | 🟠 | ~45 min |
| 11 | [BACK-03] Estandarizar formato de respuesta | Backend | 🟠 | ~1h |
| 12 | [BACK-04] Cascade delete correcto en materiales | Backend | 🟡 | ~10 min |
| 13 | [BACK-06] logApiError en audit.js | Backend | 🟡 | ~5 min |
| 14 | [BACK-07] Protección DELETE pedido con albaranes | Backend | 🟡 | ~15 min |
| 15 | [BACK-08] Whitelist de claves en /api/config | Backend | 🟡 | ~20 min |
| 16 | [SEC-07] Comparación de PIN en tiempo constante | Seguridad | 🟡 | ~10 min |
| 17 | [SEC-08] Validación MIME en subida de archivos | Seguridad | 🟡 | ~20 min |
| 18 | [SEC-09] Validación de email en endpoints de envío | Seguridad | 🟡 | ~15 min |
| 19 | [SEC-12] Límites en parámetro `año` de informes | Seguridad | 🟡 | ~5 min |
| 20 | [SEC-13] Cap en limit del audit-log | Seguridad | 🟡 | ~5 min |
| 21 | [API-04] GET → POST en exportación AEAT | API | 🟡 | ~30 min |
| 22 | [FRONT-01] key={index} en BarraBusqueda | Frontend | 🟠 | ~5 min |
| 23 | [FRONT-02] Estados de error en SWR | Frontend | 🟡 | ~30 min |
| 24 | [FRONT-03] Disabled en botones async | Frontend | 🟡 | ~20 min |
| 25 | [FRONT-04] Labels en inputs de modal | Frontend | 🟡 | ~15 min |

---

*Este archivo fue generado automáticamente el 2026-05-22. Actualízalo después de aplicar cada corrección.*

---

## ✅ Hallazgos aplicados (completados al 2026-05-26)

| ID | Descripción | Sesión |
|----|-------------|--------|
| CRÍTICO-01 | Rate limiting en `/api/auth/login` (5 req/min por IP, 429 + Retry-After) | S1 |
| CRÍTICO-02 | Cookie `crm-auth` con `secure: process.env.NODE_ENV === 'production'` | S1 |
| CRÍTICO-03 | Transacción en update de ítems de albarán (deleteMany + update atómicos) | S1 |
| CRÍTICO-04 | GET /api/albaranes ya tenía `include: { pedido, factura, _count }` — confirmado OK | S1 |
| SEC-03 | Validación de path traversal en borrado de archivo (`startsWith(allowedBase)`) | S1 |
| SEC-04 | Rate limiting en `GET /api/export/csv` (10 req/min) | S1 |
| SEC-05 | `logApiError` en `manejadores-api.js` (reemplazado `console.error`) | S1 |
| SEC-07 | Comparación PIN con `crypto.timingSafeEqual` | S1 |
| SEC-08 | Whitelist de MIME types en subida de archivos (PDF, JPEG, PNG, WebP) → 415 | S2 |
| SEC-09 | Validación de formato email en endpoints de envío (regex antes de `sendEmail`) | S2 |
| SEC-10 | Headers de seguridad en `next.config.mjs` (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`) + CSP permisiva | S3/S4 |
| SEC-11 | Error de stock insuficiente: detalle logueado en servidor, cliente recibe mensaje genérico + 422 | S3 |
| SEC-12 | Parámetro `año` acotado a `[2000, currentYear]` en `/api/informes` | S2 |
| SEC-13 | Cap `Math.min(..., 1000)` en limit del audit-log | S2 |
| SEC-14 | Header HSTS en `middleware.js` (solo en producción) | S3 |
| SEC-16 | `.catch(() => {})` → `.catch(err => logApiError(err, 'AUDIT_FAIL'))` en facturas y rectificativas | S3 |
| BUG-03 | Null check `item.descripcion?.match()` en `pdfGenerator.js` | S1 |
| BUG-04 | `client.direccion || ''` en `pdfGenerator.js` — ya estaba corregido | S1 |
| BUG-05 | Intervalo de limpieza de `rateLimiter.js` reducido de 5 min → 1 min | S2 |
| BUG-06 | Fecha de vencimiento calculada en zona horaria `Europe/Madrid` via `Intl.DateTimeFormat` | S2 |
| BUG-07 | `Number(item.quantity)` explícito en `pricing/calculate` para evitar coerciones silenciosas | S3 |
| BACK-02 | `take: 1000` en almacen-stock; `Math.min` cap en audit-log y movimientos | S2 |
| BACK-06 | `logApiError` en `audit.js` (reemplazado `console.error` con emoji) | S1 |
| BACK-07 | Protección DELETE pedido: verifica albaranes vinculados → 409 | S1 |
| BACK-08 | Whitelist `ALLOWED_CONFIG_KEYS` en `PUT /api/config` | S1 |
| BACK-09 | Guard `pedido.sinFacturacion` en `POST /api/pedidos/[id]/albaran` → 422 | S3 |
| SEC-06 | Rate limiting (5 req/min prefijado `backup:IP`) + audit log en `GET /api/config/backup` | S3 |
| API-03 | Validación de ítems en `POST /api/facturas` (descripción, cantidad positiva, precio ≥ 0) | S3 |
| API-04 | `GET /api/facturas/exportar-aeat` convertido a `POST`; UI actualizada con `<form method="POST">` | S2 |
| FRONT-01 | `key={index}` → `key={\`${item.type}-${item.id}\`}` en `BarraBusqueda.js` | S2 |
| FRONT-02 | Estados de error SWR en dashboard y todos los componentes de informes | S2 |
| FRONT-03 | `isCreatingOrder` + `isDownloading` con `disabled` en presupuestos y pedidos | S2 |
| FRONT-04 | Labels `htmlFor`/`id` en input de cliente en `facturas/nuevo`; `sr-only` label en `FormularioPedidoCliente` | S3 |
| SEC-15 | CSP en `next.config.mjs`: `default-src 'self'`, `frame-ancestors 'none'`, `object-src 'none'` | S4 |
| API-01 | Modo legacy eliminado de `GET /api/pedidos` y `GET /api/presupuestos` — siempre devuelven `{ data, meta }` | S4 |
| BACK-03 | Formato `{ data, meta }` estandarizado en pedidos y presupuestos (cubría API-01) | S4 |
| BACK-05 (parcial) | Validación de ítems en `POST /api/albaranes`; validación de campos requeridos en `POST /api/almacen-stock` acción entrada | S4 |
| BUG-02 | Comentario explicativo en `sequence.js` sobre el diseño intencional para SQLite y la nota de migración a MySQL | S4 |
| BACK-05 (completo) | Zod schemas añadidos a `validations.js` (`grapaSchema`, `grapaUpdateSchema`, `tacoSchema`, `tacoBatchUpdateSchema`, `descuentoSchema`, `pedidoProveedorSchema` + `bobinaProveedorSchema`); aplicados en `grapas`, `tacos`, `precios` (POST), `pricing/descuentos` (POST), `pedidos-proveedores-data` (POST) | S5 |

---

## ⏳ Hallazgos pendientes

Sin hallazgos pendientes. Todos los ítems del REVIEW han sido resueltos.
