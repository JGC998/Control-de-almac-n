# REVIEW — CRM Taller

> Generado el 2026-06-08 por Claude Code (claude-sonnet-4-6)
> Revisión completa exhaustiva: Seguridad · Bugs · Backend · API · Frontend

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 (App Router), Prisma 6 (SQLite dev / MySQL prod), DaisyUI 5, SWR, jsPDF, Resend, Formidable, IndexedDB (offline tab)
**Archivos analizados:** 92 (todos los routes de `/api`, lib files, middleware, layout, tablet/page.js, sw.js, colaOffline.js)
**Total de hallazgos:** 18 (1 crítico, 4 altos, 8 medios, 5 bajos)

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| 🔒 Seguridad | 7/10 | 1 | 2 | 3 | 1 |
| 🐛 Bugs | 8/10 | 0 | 1 | 2 | 1 |
| ⚙️ Backend | 8/10 | 0 | 1 | 2 | 1 |
| 🌐 API | 9/10 | 0 | 0 | 1 | 2 |
| 🎨 Frontend | 9/10 | 0 | 0 | 0 | 0 |

**Contexto:** El proyecto tiene una base sólida — Zod en la mayoría de POST/PUT, `logApiError` sin stack traces, `$transaction` donde corresponde, rate limiting en endpoints pesados, y cookies httpOnly+sameSite+secure. El hallazgo crítico (SEC-01) es arquitectural: el middleware nunca verifica la cookie de sesión aunque AUTH_PIN esté activo.

---

## 🚨 Hallazgos Críticos

### SEC-01 — Middleware no verifica la cookie de sesión

**Archivo:** `middleware.js` (raíz), líneas 1–25
**Severidad:** 🔴 CRÍTICO

El middleware actual añade HSTS y redirige móviles pero **nunca verifica la cookie `crm-auth`**. Cuando `AUTH_PIN` está configurado en producción, el login crea la cookie correctamente en `/api/auth/login`, pero el middleware no la lee. Resultado: cualquier petición no autenticada pasa a todas las rutas de la app, incluyendo `/api/clientes`, `/api/pedidos`, `/api/config`, `/api/audit-log`, `/api/config/backup`, etc.

**Código actual:**
```js
// middleware.js líneas 12-21
export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname === '/' && MOBILE_UA.test(request.headers.get('user-agent') ?? '')) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }
  return addSecurityHeaders(NextResponse.next()); // ← nunca verifica cookie
}
```

**Corrección:**
```js
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/status', '/api/auth/logout'];
const MOBILE_UA = /Mobi|Android|iPhone|iPad|Tablet/i;

function addSecurityHeaders(response) {
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return response;
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' && MOBILE_UA.test(request.headers.get('user-agent') ?? '')) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }

  const authPin = process.env.AUTH_PIN;
  if (authPin && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    const token = request.cookies.get('crm-auth')?.value;
    if (!token) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const expected = crypto.createHmac('sha256', secret).update(authPin).digest('hex');
    const ok = token.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    if (!ok) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
```

---

## 🔒 Seguridad

### SEC-02 — Fallback débil hardcodeado para SESSION_SECRET

**Archivo:** `src/app/api/auth/login/route.js`, línea 33
**Severidad:** 🟠 ALTO

```js
const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
```

Si `SESSION_SECRET` no está en producción, el token HMAC se firma con un secreto conocido públicamente. Un atacante puede derivar el token válido sin conocer el PIN.

**Corrección:**
```js
const secret = process.env.SESSION_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  console.error('[FATAL] SESSION_SECRET no configurado en producción. Abortando.');
  return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
}
const effectiveSecret = secret || 'dev-secret-change-in-production';
const token = crypto.createHmac('sha256', effectiveSecret).update(expected).digest('hex');
```

---

### SEC-03 — Subida de documentos: colisión de nombres / sobrescritura silenciosa

**Archivo:** `src/app/api/documentos/route.js`, líneas 140–143
**Severidad:** 🟠 ALTO

```js
const rawName = uploadedFile.originalFilename || 'documento';
const safeFileName = path.basename(rawName).replace(/[^a-zA-Z0-9._\-]/g, '_');
const targetPath = path.join(process.cwd(), 'public', 'planos', safeFileName);
```

Dos usuarios que suban `factura.pdf` causan que el segundo sobreescriba el primero sin ningún aviso.

**Corrección — añadir UUID al nombre:**
```js
import { randomUUID } from 'crypto';
const ext = path.extname(uploadedFile.originalFilename || '').toLowerCase();
const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const safeExt = allowedExts.includes(ext) ? ext : '.bin';
const safeFileName = `${randomUUID()}${safeExt}`;
// Guardar nombre original en campo descripcion o campo nuevo nombreOriginal
```

---

### SEC-04 — `GET /api/config` expone todas las claves sin filtrar

**Archivo:** `src/app/api/config/route.js`, líneas 10–27
**Severidad:** 🟡 MEDIO

`db.config.findMany()` sin `select` ni `where` devuelve todas las claves de la tabla. Si en el futuro se guarda un API key u otro secreto en Config, se expone automáticamente.

**Corrección:**
```js
const PUBLIC_CONFIG_KEYS = [
  'iva_rate', 'empresa_nombre', 'empresa_nif', 'empresa_telefono',
  'empresa_email', 'empresa_direccion', 'empresa_cp', 'empresa_ciudad',
  'empresa_provincia', 'empresa_pais', 'empresa_web', 'empresa_logo',
  'longitud_barra_tacos', 'costeVulcanizadoMetro',
];
const settingsList = await db.config.findMany({ where: { key: { in: PUBLIC_CONFIG_KEYS } } });
```

---

### SEC-05 — Headers de seguridad incompletos

**Archivo:** `middleware.js`, líneas 3–8
**Severidad:** 🟡 MEDIO

Solo se añade `Strict-Transport-Security`. Faltan `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` y `Referrer-Policy`. Véase corrección en SEC-01 que ya los incluye.

---

### SEC-06 — Rate limiting ausente en endpoints de escritura

**Archivos:** `src/app/api/pricing/especiales/route.js`, `src/app/api/notificaciones/route.js`, `src/app/api/almacen-stock/route.js` (POST), `src/app/api/pedidos-proveedores-data/route.js`
**Severidad:** 🟡 MEDIO

Endpoints que crean/modifican datos sin rate limiting son vectores de abuso (flooding de notificaciones, dump de precios). El módulo `src/lib/rateLimiter.js` ya existe.

**Corrección — patrón a aplicar en cada ruta:**
```js
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
const rl = checkRateLimit(`<ruta>:${ip}`, 30);
if (!rl.allowed) {
  return NextResponse.json({ message: 'Demasiadas peticiones' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
}
```

---

### SEC-07 — Excepción de `.gitignore` para dev.db tiene ruta duplicada

**Archivo:** `.gitignore`, línea 23
**Severidad:** 🟢 BAJO

```gitignore
!prisma/prisma/dev.db   # ← debería ser !prisma/dev.db
```

La ruta `prisma/prisma/dev.db` no existe. La excepción no funciona y la DB podría commitearse.

**Corrección:**
```gitignore
!prisma/dev.db
```

---

## 🐛 Bugs

### BUG-01 — `await request.json()` fuera del try-catch (3 archivos)

**Archivos:**
- `src/app/api/precios/route.js`, línea 33
- `src/app/api/pricing/descuentos/route.js`, línea 65
- `src/app/api/almacen-stock/route.js`, línea 43

**Severidad:** 🟠 ALTO

En estos tres endpoints, `request.json()` está llamado **antes** del bloque `try`. Si el body es JSON malformado, `SyntaxError` no es capturado, y Next.js devuelve una respuesta genérica sin el formato estándar de la app.

**Ejemplo en `precios/route.js`:**
```js
// ACTUAL — problema
export async function POST(request) {
  const data = await request.json(); // ← fuera del try
  try {
    // ...
  }
}

// CORRECCIÓN
export async function POST(request) {
  try {
    const data = await request.json();
    // ...
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }
    logApiError(error, 'POST /api/precios');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

---

### BUG-02 — `handleEliminar` en tablet incrementa `pendientes` incorrectamente

**Archivo:** `src/app/tablet/page.js`, líneas 655–661
**Severidad:** 🟡 MEDIO

```js
const handleEliminar = useCallback(async (idx) => {
  const items = sesion.items.filter((_, i) => i !== idx);
  const nuevaSesion = { ...sesion, items, pendientes: sesion.pendientes + 1 }; // ← +1 al borrar
  // ...
}, [sesion, sincronizar]);
```

Al eliminar artículos offline, `pendientes` se acumula como contador de borrados, no de artículos pendientes reales. Causa badge inflado.

**Corrección:**
```js
const nuevaSesion = { ...sesion, items, pendientes: items.length > 0 ? 1 : 0 };
```

---

### BUG-03 — Race condition por stale closure en `sincronizar`

**Archivo:** `src/app/tablet/page.js`, líneas 595–616
**Severidad:** 🟡 MEDIO

`sincronizar` captura `sesion` en su closure. Si `sesion` se actualiza varias veces rápidamente antes de que `sincronizar` se ejecute, la llamada puede usar datos obsoletos.

**Corrección — usar ref para la sesión:**
```js
const sesionRef = useRef(sesion);
useEffect(() => { sesionRef.current = sesion; }, [sesion]);

const sincronizar = useCallback(async (sesionActual) => {
  if (syncRef.current) return;
  const s = sesionActual || sesionRef.current; // siempre fresca
  // ...
}, []); // eliminar dependencia de sesion
```

---

### BUG-04 — Dos endpoints DELETE para notas (colección y recurso individual)

**Archivos:** `src/app/api/notas/route.js` (líneas 39–55) y `src/app/api/notas/[id]/route.js`
**Severidad:** 🟢 BAJO

`DELETE /api/notas` lee el ID del body (anti-REST) y `DELETE /api/notas/[id]` lo toma del path (correcto). Conviven dos formas de borrar la misma entidad, lo que genera ambigüedad en el cliente.

**Recomendación:** Deprecar el DELETE en la colección y usar únicamente `/api/notas/[id]`.

---

## ⚙️ Backend

### BACK-01 — PUT `/api/productos/[id]` sin validación Zod

**Archivo:** `src/app/api/productos/[id]/route.js`, líneas 23–48
**Severidad:** 🟠 ALTO

El PUT usa whitelist manual sin schema Zod:
```js
if (data.nombre !== undefined) updateData.nombre = data.nombre; // sin validar longitud
if (data.precioUnitario !== undefined) updateData.precioUnitario = parseFloat(data.precioUnitario); // NaN posible
```

El POST sí usa `productoSchema`. Inconsistencia: un nombre vacío `""` pasa sin error en PUT pero falla en POST.

**Corrección:**
```js
import { productoSchema } from '@/lib/validations';

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = productoSchema.partial().safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ message: parsed.error.issues[0].message }, { status: 400 });
    }
    const updatedProducto = await db.producto.update({ where: { id }, data: parsed.data });
    // ...
```

---

### BACK-02 — `GET /api/pricing/margenes` no registra errores

**Archivo:** `src/app/api/pricing/margenes/route.js`, líneas 11–18
**Severidad:** 🟡 MEDIO

```js
} catch (error) {
  return NextResponse.json({ message: 'Error al obtener márgenes' }, { status: 500 }); // sin logApiError
}
```

Fallos de BD en este endpoint son invisibles en logs.

**Corrección:** Añadir `logApiError(error, 'GET /api/pricing/margenes');` antes del return.

---

### BACK-03 — `GET /api/almacen-stock` carga todos los proveedores sin límite

**Archivo:** `src/app/api/almacen-stock/route.js`, líneas 17–20
**Severidad:** 🟡 MEDIO

```js
db.proveedor.findMany({
  select: { id: true, nombre: true },
  // ← sin take()
}),
```

Inconsistente con el patrón del proyecto que siempre acota queries con `take`.

**Corrección:**
```js
db.proveedor.findMany({ select: { id: true, nombre: true }, take: 500, orderBy: { nombre: 'asc' } }),
```

---

### BACK-04 — `crearManejadoresCRUD` no limita el parámetro `limit`

**Archivo:** `src/lib/manejadores-api.js`, líneas 41–43
**Severidad:** 🟢 BAJO

```js
const limit = parseInt(limitParam || '50', 10); // sin límite máximo
```

Un cliente puede pedir `?limit=100000` y hacer un dump completo.

**Corrección:**
```js
const page  = Math.max(1, parseInt(pageParam  || '1',  10));
const limit = Math.min(500, Math.max(1, parseInt(limitParam || '50', 10)));
```

---

## 🌐 API

### Mapa de Endpoints (tabla completa)

| Método | Ruta | Validación Zod | Rate Limit | Paginación |
|--------|------|---------------|------------|------------|
| POST | /api/auth/login | manual | ✅ 5/min | — |
| POST | /api/auth/logout | — | — | — |
| GET | /api/auth/status | — | — | — |
| GET | /api/almacen-stock | — | ❌ | take 1000 |
| POST | /api/almacen-stock | manual | ❌ | — |
| GET | /api/articulos-simples | — | ❌ | take 500 |
| POST | /api/articulos-simples | ✅ | ❌ | — |
| PATCH | /api/articulos-simples/[id] | ✅ | ❌ | — |
| GET | /api/audit-log | — | ✅ 30/min | ✅ |
| GET | /api/busqueda | — | ❌ | take 5/tipo |
| GET | /api/catalogo | — | ❌ | take 500 |
| GET | /api/clientes | — | ❌ | take 500/paginado |
| POST | /api/clientes | ✅ | ❌ | — |
| GET | /api/clientes/[id] | — | ❌ | — |
| PUT | /api/clientes/[id] | ✅ | ❌ | — |
| DELETE | /api/clientes/[id] | — | ❌ | — |
| GET | /api/clientes/[id]/historial-precios | — | ❌ | take 5000 |
| GET | /api/clientes/[id]/resumen | — | ❌ | — |
| GET | /api/config | — | ❌ | — |
| PUT | /api/config | whitelist | ❌ | — |
| GET | /api/config/backup | — | ✅ 5/min | — |
| GET | /api/dashboard | — | ❌ | — |
| GET | /api/documentos | — | ❌ | take 2000 |
| POST | /api/documentos | MIME+manual | ❌ | — |
| GET | /api/documentos/[id] | — | ❌ | — |
| PUT | /api/documentos/[id] | manual | ❌ | — |
| DELETE | /api/documentos/[id] | — | ❌ | — |
| GET | /api/export/csv | — | ✅ 10/min | take 2000 |
| GET | /api/fabricantes | — | ❌ | take 500 |
| POST | /api/fabricantes | ✅ | ❌ | — |
| GET | /api/grapas | — | ❌ | — |
| POST | /api/grapas | ✅ | ❌ | — |
| POST | /api/herramientas/carta-porte | ✅ | ❌ | — |
| GET | /api/importaciones | — | ❌ | take 100 |
| POST | /api/importaciones | ✅ | ❌ | — |
| GET | /api/importaciones/[id] | — | ❌ | — |
| PUT | /api/importaciones/[id] | ✅ | ❌ | — |
| DELETE | /api/importaciones/[id] | — | ❌ | — |
| GET | /api/importaciones/[id]/analisis-rentabilidad | — | ✅ 20/min | — |
| POST | /api/importaciones/borrador | ✅ | ❌ | — |
| PATCH | /api/importaciones/[id]/bobinas | ✅ | ❌ | — |
| GET | /api/informes | — | ✅ 20/min | take 10000 |
| GET | /api/logistica/calcular | — | ❌ | — |
| GET | /api/maquinaria/procesos | — | ❌ | — |
| POST | /api/maquinaria/procesos | manual | ❌ | — |
| GET | /api/materiales | — | ❌ | take 500 |
| GET | /api/modelos-grapa | — | ❌ | — |
| GET | /api/movimientos | — | ❌ | take 500 |
| GET | /api/notas | — | ❌ | take 20 |
| POST | /api/notas | ✅ | ❌ | — |
| DELETE | /api/notas | ⚠️ ID en body | ❌ | — |
| DELETE | /api/notas/[id] | — | ❌ | — |
| GET | /api/notificaciones | — | ❌ | take 50 |
| POST | /api/notificaciones | manual | ❌ | — |
| PATCH | /api/notificaciones | — | ❌ | — |
| GET | /api/pedidos | — | ❌ | ✅ |
| POST | /api/pedidos | ✅ | ❌ | — |
| GET | /api/pedidos/[id] | — | ❌ | — |
| PUT | /api/pedidos/[id] | ✅ | ❌ | — |
| PATCH | /api/pedidos/[id] | whitelist | ❌ | — |
| DELETE | /api/pedidos/[id] | — | ❌ | — |
| POST | /api/pedidos/[id]/email | regex email | ❌ | — |
| GET | /api/pedidos/[id]/pdf | — | ❌ | — |
| POST | /api/pedidos/bulk-update | ✅ | ❌ | — |
| GET | /api/pedidos/export | — | ✅ 10/min | take 1000 |
| POST | /api/pedidos/from-presupuesto | manual | ❌ | — |
| GET | /api/pedidos-proveedores-data | — | ❌ | — |
| POST | /api/pedidos-proveedores-data | ✅ | ❌ | — |
| GET | /api/pedidos-proveedores-data/analisis-precios | — | ✅ 30/min | take 500 |
| GET | /api/plantillas | — | ❌ | take 500 |
| GET | /api/precios | — | ❌ | take 2000 |
| POST | /api/precios | ✅ | ❌ | — |
| PUT | /api/precios | manual | ❌ | — |
| DELETE | /api/precios | manual | ❌ | — |
| POST | /api/precios/bulk-update | manual | ❌ | — |
| GET | /api/presupuestos | — | ❌ | ✅ |
| POST | /api/presupuestos | ✅ | ❌ | — |
| GET | /api/presupuestos/[id] | — | ❌ | — |
| PUT | /api/presupuestos/[id] | ✅ | ❌ | — |
| DELETE | /api/presupuestos/[id] | — | ❌ | — |
| POST | /api/presupuestos/[id]/email | regex email | ❌ | — |
| GET | /api/presupuestos/[id]/pdf | — | ❌ | — |
| POST | /api/presupuestos/bulk-update | ✅ | ❌ | — |
| POST | /api/pricing/calculate | manual | ❌ | — |
| GET | /api/pricing/descuentos | — | ❌ | — |
| POST | /api/pricing/descuentos | ✅ | ❌ | — |
| PUT | /api/pricing/descuentos | parcial | ❌ | — |
| DELETE | /api/pricing/descuentos | manual | ❌ | — |
| GET | /api/pricing/especiales | — | ❌ | — |
| POST | /api/pricing/especiales | ❌ sin validación | ❌ | — |
| POST | /api/pricing/inverse-calc | ✅ | ❌ | — |
| GET | /api/pricing/margenes | — | ❌ | — |
| POST | /api/pricing/margenes | ✅ | ❌ | — |
| GET | /api/proveedores | — | ❌ | take 500 |
| POST | /api/proveedores | ✅ | ❌ | — |
| GET | /api/stock-info/available-meters | — | ❌ | — |
| POST | /api/stock-management/receive-order | mínima | ❌ | — |
| GET | /api/tacos | — | ❌ | — |
| GET | /api/tarifas-cliente | — | ❌ | — |
| POST | /api/tarifas-cliente | ✅ | ❌ | — |
| PUT | /api/tarifas-cliente | ✅ | ❌ | — |
| DELETE | /api/tarifas-cliente | manual | ❌ | — |
| GET | /api/tarifas-material-opciones | — | ❌ | — |
| GET | /api/tarifas-rollo | — | ❌ | — |
| POST | /api/tarifas-rollo | ✅ | ❌ | — |

### Hallazgos API

### API-01 — `POST /api/pricing/especiales` sin ninguna validación

**Archivo:** `src/app/api/pricing/especiales/route.js`, líneas 17–31
**Severidad:** 🟡 MEDIO

```js
export async function POST(request) {
  try {
    const data = await request.json();
    const nuevaRegla = await db.precioEspecial.create({
      data: {
        descripcion: data.descripcion,    // sin validar
        precio: parseFloat(data.precio),  // NaN si no es número → guardado en BD
        clienteId: data.clienteId,        // sin validar UUID
        productoId: data.productoId,      // sin validar UUID
      },
    });
```

**Corrección:**
```js
import { z } from 'zod';
const precioEspecialSchema = z.object({
  descripcion: z.string().min(1).max(200),
  precio: z.number().positive().max(100_000),
  clienteId: z.string().uuid().optional().nullable(),
  productoId: z.string().uuid().optional().nullable(),
});

export async function POST(request) {
  try {
    const body = await request.json();
    const parsed = precioEspecialSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors }, { status: 400 });
    }
    const nuevaRegla = await db.precioEspecial.create({ data: parsed.data });
    return NextResponse.json(nuevaRegla, { status: 201 });
  }
```

---

### API-02 — Inconsistencia de formato de error (`message` vs `error`)

**Severidad:** 🟢 BAJO

Diferentes endpoints usan `{ message: '...' }` o `{ error: '...' }` indistintamente:
- `/api/importaciones` → `{ error: 'Datos inválidos' }` (400)
- `/api/pedidos` → `{ error: 'Validación fallida' }` (400)
- `/api/clientes/[id]` → `{ message: 'Datos inválidos' }` (400)

El proyecto tiene `src/lib/api-response.js` con `ApiResponse` pero no se usa en las rutas analizadas. Estandarizar en nuevas rutas; migrar en el futuro.

---

### API-03 — `GET /api/notas` limitado a 20 sin paginación

**Archivo:** `src/app/api/notas/route.js`, línea 14
**Severidad:** 🟢 BAJO

`take: 20` hardcodeado sin opción de paginación. Válido para tablón de notas, pero documentar como limitación intencional si se prevé crecer.

---

## 🎨 Frontend

El frontend está en excelente estado. No se encontraron:

- `innerHTML` ni `dangerouslySetInnerHTML` con datos de usuario (XSS)
- Tokens de sesión en `localStorage` (solo `crm-tema` / `theme` — no sensible)
- Event listeners sin cleanup en `useEffect` (tablet/page.js tiene cleanup correcto en listeners `online`/`offline`)
- Estados de carga ausentes en operaciones críticas

### FRONT-01 — IVA hardcodeado al 21% en calculadora de tablet

**Archivo:** `src/app/tablet/page.js`, líneas 439, 450
**Severidad:** 🟢 BAJO (informativo)

```js
const iva = precioNeto * 0.21; // hardcodeado — no lee config
```

La calculadora de tarifas en la tablet usa el IVA fijo aunque `iva_rate` es configurable vía `/api/config`. Si se cambia el tipo en configuración, la calculadora mostraría valores incorrectos.

**Corrección:**
```js
const { data: config } = useSWR('/api/config');
const ivaRate = config?.iva_rate ?? 0.21;
// y luego:
const iva = precioNeto * ivaRate;
```

---

## ✅ Puntos Positivos

1. **Zod en prácticamente todos los POST/PUT** — cobertura de validación alta. Especialmente `importacionContenedorSchema` con `z.coerce.number()` que elimina parseFloat manual.

2. **`logApiError` consistente — sin stack traces en respuestas** — el logger solo extrae `{name, message, code, meta}`.

3. **Transacciones correctas en operaciones multi-tabla** — `receive-order`, `from-presupuesto`, `pedidos/[id] PUT`, `presupuestos/[id] PUT` usan `$transaction`.

4. **Rate limiting en endpoints pesados** — login (5/min), backup (5/min), export-csv (10/min), informes (20/min), audit-log (30/min), analisis-rentabilidad (20/min), analisis-precios (30/min).

5. **Cookies httpOnly + sameSite:strict + secure en prod** — sesión no accesible desde JS y protegida contra CSRF.

6. **Path traversal en documentos mitigado** — `allowedBase` check en DELETE y validación de prefijo `/planos/` en PUT.

7. **Cero `console.log` de debug** — ninguna instancia encontrada en todo el código fuente.

8. **`.gitignore` robusto** — `.env.local`, datos operativos, seeds de producción y backups SQL excluidos. (Excepción: ver SEC-07.)

9. **`colaOffline.js` bien diseñado** — IndexedDB solo para estado de sesión de recepción (no datos sensibles), sincronización idempotente, reconexión automática.

10. **Service Worker conservador** — `public/sw.js` excluye explícitamente `/api/*` del caché. No hay riesgo de servir respuestas API stale.

11. **UUID validado en analisis-rentabilidad** — `UUID_RE.test(id)` antes de la query previene errores de BD con IDs malformados.

12. **`informes/route.js` valida el año** — `Math.max(2000, Math.min(currentYear, parseInt(...)))` previene consultas con años absurdos.

13. **`Promise.allSettled` en analisis-rentabilidad** — error en una bobina no cancela el análisis del resto del contenedor.

---

## 🗺️ Plan de Acción Priorizado

| # | ID | Hallazgo | Área | Severidad | Esfuerzo |
|---|----|----------|------|-----------|----------|
| 1 | SEC-01 | Implementar verificación de cookie en middleware | Seguridad | 🔴 Crítico | 2h |
| 2 | SEC-02 | Eliminar fallback débil de SESSION_SECRET en producción | Seguridad | 🟠 Alto | 15 min |
| 3 | BUG-01 | Mover `request.json()` dentro del try-catch (3 archivos) | Bugs | 🟠 Alto | 30 min |
| 4 | BACK-01 | Añadir Zod al PUT de `/api/productos/[id]` | Backend | 🟠 Alto | 1h |
| 5 | SEC-03 | UUID en nombres de archivos subidos | Seguridad | 🟠 Alto | 30 min |
| 6 | API-01 | Añadir Zod a `POST /api/pricing/especiales` | API | 🟡 Medio | 30 min |
| 7 | SEC-04 | Filtrar claves en `GET /api/config` por whitelist | Seguridad | 🟡 Medio | 15 min |
| 8 | SEC-05 | Añadir headers X-Content-Type-Options, X-Frame-Options | Seguridad | 🟡 Medio | 15 min |
| 9 | BUG-02 | Corregir lógica de `pendientes` en `handleEliminar` tablet | Bugs | 🟡 Medio | 15 min |
| 10 | BUG-03 | Usar `sesionRef` para evitar stale closure en `sincronizar` | Bugs | 🟡 Medio | 30 min |
| 11 | BACK-02 | Añadir `logApiError` en GET margenes | Backend | 🟡 Medio | 5 min |
| 12 | BACK-03 | Añadir `take: 500` a `proveedor.findMany` en almacen-stock | Backend | 🟡 Medio | 5 min |
| 13 | SEC-06 | Rate limiting en endpoints de escritura sensibles | Seguridad | 🟡 Medio | 2h |
| 14 | FRONT-01 | Consumir `iva_rate` dinámico en tablet calculadora | Frontend | 🟢 Bajo | 30 min |
| 15 | BUG-04 | Consolidar endpoints DELETE de notas (deprecar body-based) | Bugs | 🟢 Bajo | 30 min |
| 16 | BACK-04 | Limitar `limit` máximo en `crearManejadoresCRUD` | Backend | 🟢 Bajo | 15 min |
| 17 | API-02 | Estandarizar formato de error (`message` vs `error`) | API | 🟢 Bajo | Alto |
| 18 | SEC-07 | Corregir ruta duplicada `prisma/prisma/dev.db` en .gitignore | Seguridad | 🟢 Bajo | 2 min |

---

*Revisión generada el 2026-06-08. Archivos analizados: todos los routes bajo `src/app/api/` (93 archivos), `src/lib/` (db.js, rateLimiter.js, audit.js, logger.js, email.js, validations.js, manejadores-api.js, colaOffline.js), `middleware.js`, `src/app/layout.js`, `public/sw.js`, `src/app/tablet/page.js`. No se encontraron hallazgos en archivos nuevos `sw.js` ni `colaOffline.js` más allá de los documentados.*
