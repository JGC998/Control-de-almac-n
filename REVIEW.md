# REVIEW — CRM Taller (Control de Almacén)

> Generado el 2026-06-09 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 (App Router) · React 19 · Prisma 6 (SQLite dev / MySQL prod) · DaisyUI 5 + Tailwind 4 · SWR · Zod · jsPDF · Resend · Ship24  
**Archivos analizados:** ~120 (49 páginas, 89+ API routes, 81 componentes, 17 librerías)  
**Total hallazgos abiertos:** 19 (2 críticos, 5 altos, 8 medios, 4 bajos)  
**Hallazgos corregidos en esta sesión:** 17

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| 🔒 Seguridad | 6/10 | 1 | 2 | 1 | 1 |
| 🐛 Bugs | 8/10 | 0 | 2 | 2 | 0 |
| ⚙️ Backend | 7/10 | 1 | 1 | 3 | 1 |
| 🌐 API | 7/10 | 0 | 1 | 2 | 1 |
| 🎨 Frontend | 9/10 | 0 | 0 | 1 | 1 |

> **Nota de contexto:** La app es una herramienta interna de LAN. `AUTH_PIN` es **opcional** — sin él la app es intencionalmente pública. Los hallazgos de "falta de auth" solo aplican cuando `AUTH_PIN` está configurado.

---

## 🚨 Hallazgos Críticos — Acción Inmediata

### [CRÍTICO-01] AUTH_PIN configurado pero las APIs no están protegidas

**Área:** Seguridad  
**Archivo:** `middleware.js`  
**Problema:** El middleware solo redirige móviles y añade headers de seguridad. Si el operador configura `AUTH_PIN` esperando proteger la app, cualquier petición directa a la API (`curl`, Postman) saltará la autenticación por completo — el middleware nunca verifica la cookie `crm-auth`.  
**Impacto:** Con `AUTH_PIN` configurado, todos los endpoints `/api/*` son accesibles sin sesión. Clientes, pedidos, facturas, márgenes, backup de configuración — todo expuesto.  
**Corrección:**

```js
// middleware.js — añadir verificación de cookie cuando AUTH_PIN está activo
import crypto from 'crypto';

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const pin = process.env.AUTH_PIN;

  if (pathname === '/' && MOBILE_UA.test(request.headers.get('user-agent') ?? '')) {
    return addSecurityHeaders(NextResponse.redirect(new URL('/tablet', request.url)));
  }

  if (!pin) return addSecurityHeaders(NextResponse.next());

  const PUBLIC = ['/login', '/api/auth/'];
  if (PUBLIC.some(p => pathname.startsWith(p))) {
    return addSecurityHeaders(NextResponse.next());
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) return addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));

  const expected = crypto.createHmac('sha256', secret).update(pin).digest('hex');
  const token = request.cookies.get('crm-auth')?.value ?? '';
  let valid = false;
  if (token.length === expected.length) {
    try { valid = crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected)); } catch {}
  }

  if (!valid) {
    return pathname.startsWith('/api/')
      ? addSecurityHeaders(NextResponse.json({ message: 'No autorizado' }, { status: 401 }))
      : addSecurityHeaders(NextResponse.redirect(new URL('/login', request.url)));
  }
  return addSecurityHeaders(NextResponse.next());
}
```

---

### [CRÍTICO-02] `PUT /api/config` sin autenticación — cualquiera puede cambiar el NIF y datos fiscales

**Área:** Backend  
**Archivo:** `src/app/api/config/route.js` línea 37  
**Problema:** El endpoint `PUT /api/config` permite modificar `empresa_nif`, `empresa_nombre`, `empresa_direccion` y otros datos fiscales sin ninguna comprobación de sesión. Estos datos se estampan en todas las facturas, incluidas las de VeriFactu.  
**Impacto:** Un atacante en la misma red puede cambiar el NIF de la empresa emitido en facturas legales.  
**Corrección:**

```js
// src/app/api/config/route.js
export async function PUT(request) {
  // Verificar AUTH_PIN si está activo
  const pin = process.env.AUTH_PIN;
  if (pin) {
    const secret = process.env.SESSION_SECRET || 'dev-secret-change-in-production';
    const expected = crypto.createHmac('sha256', secret).update(pin).digest('hex');
    const token = request.cookies.get('crm-auth')?.value ?? '';
    if (token !== expected) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }
  }
  // ... resto del handler
}
```

---

## 🔒 Seguridad

### [SEC-01] — Ver CRÍTICO-01

### [SEC-02] SESSION_SECRET con fallback conocido en el código fuente

**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/auth/login/route.js` línea 34  
**Problema:**

```js
// ❌ Código actual
const effectiveSecret = secret || 'dev-secret-change-in-production';
```

El secreto fallback es público en el repositorio. Si `SESSION_SECRET` no está en `.env`, un atacante puede calcular offline el token HMAC válido y falsificar una cookie `crm-auth` sin conocer el PIN.

**Corrección:**

```js
// ✅ Fallar duro cuando AUTH_PIN activo pero SESSION_SECRET ausente
const secret = process.env.SESSION_SECRET;
if (!secret && expected) {
  console.error('[auth] SESSION_SECRET obligatorio cuando AUTH_PIN está activo');
  return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
}
const effectiveSecret = secret || 'dev-secret-no-auth';
```

### [SEC-03] CSP con `unsafe-inline` en `script-src` en producción

**Severidad:** 🟡 Medio  
**Archivo:** `next.config.mjs` línea 8  
**Problema:**

```js
// ❌ Código actual
const scriptSrc = isProd ? "script-src 'self' 'unsafe-inline'" : ...
```

`unsafe-inline` permite cualquier `<script>` inline, anulando parcialmente la protección XSS de la CSP.  
**Corrección:** Migrar a nonces (requiere trabajo en el App Router) o documentar que se acepta conscientemente este trade-off.

### [SEC-04] `/api/tracking/sync` sin autenticación ni rate limiting

**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/tracking/sync/route.js`  
**Problema:** Cualquiera puede llamar masivamente a este endpoint, agotando el cupo gratuito mensual de Ship24 (50 consultas/mes) o disparando notificaciones WhatsApp no deseadas.

**Corrección:**

```js
// Añadir al inicio de POST():
const ip = getClientIp(request);
const rl = checkRateLimit(`tracking-sync:${ip}`, 3);
if (!rl.allowed) return NextResponse.json({ message: 'Rate limit' }, { status: 429 });
```

---

## 🐛 Bugs

### [BUG-01] `new Date(null)` retorna epoch (1970) en lugar de null

**Severidad:** 🟠 Probable  
**Archivo:** `src/app/api/presupuestos/[id]/route.js` ~línea 48  
**Problema:**

```js
// ❌ Código actual
...(ultimoRecordatorio !== undefined ? {
  ultimoRecordatorio: new Date(ultimoRecordatorio)  // new Date(null) = 1970-01-01
} : {})
```

Si el cliente envía `"ultimoRecordatorio": null`, `new Date(null)` devuelve `1970-01-01T00:00:00.000Z`. El presupuesto queda con una fecha de recordatorio de 1970 en BD.

**Cómo se dispara:** `PATCH /api/presupuestos/:id` con `ultimoRecordatorio: null`.

**Corrección:**

```js
// ✅ Corrección
...(ultimoRecordatorio !== undefined
  ? { ultimoRecordatorio: ultimoRecordatorio ? new Date(ultimoRecordatorio) : null }
  : {})
```

### [BUG-02] Fechas de filtro sin validar en `/api/informes`

**Severidad:** 🟠 Probable  
**Archivo:** `src/app/api/informes/route.js` línea 163  
**Problema:**

```js
// ❌ Código actual
if (desde) where.fechaCreacion.gte = new Date(desde); // new Date("xyz") = Invalid Date
```

`new Date("cadena_invalida")` devuelve `Invalid Date`. Prisma recibe ese valor y puede lanzar un error interno o hacer una consulta que devuelva resultados inesperados.

**Cómo se dispara:** `GET /api/informes?tipo=ventas-por-cliente&desde=no-es-una-fecha`

**Corrección:**

```js
// ✅ Corrección
const parseFecha = (str) => {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
};
const fechaDesde = parseFecha(desde);
const fechaHasta = parseFecha(hasta);
if (desde && !fechaDesde) return NextResponse.json({ message: 'Fecha "desde" inválida' }, { status: 400 });
```

### [BUG-03] Búsqueda global sin límite de longitud en query

**Severidad:** 🟡 Potencial  
**Archivo:** `src/app/api/busqueda/route.js` línea 13  
**Problema:** Solo se valida `query.length >= 2`, sin límite superior. Una query de 10.000 caracteres ejecuta cuatro `LIKE '%...%'` paralelos en MySQL.

**Corrección:**

```js
// ✅ Corrección
if (!query || query.length < 2 || query.length > 100) {
  return NextResponse.json([]);
}
```

### [BUG-04] Upserts concurrentes en `/api/config` sin transacción

**Severidad:** 🟡 Potencial  
**Archivo:** `src/app/api/config/route.js` línea 50  
**Problema:**

```js
// ❌ Código actual
await Promise.all(
  entries.map(([key, value]) => db.config.upsert(...))
);
```

Dos peticiones simultáneas sobre las mismas claves pueden crear condiciones de carrera en MySQL.

**Corrección:**

```js
// ✅ Corrección
await db.$transaction(
  entries.map(([key, value]) =>
    db.config.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
  )
);
```

---

## ⚙️ Backend

### [BACK-01] — Ver CRÍTICO-02 (`PUT /api/config` sin auth)

### [BACK-02] `crearManejadoresCRUD` genera handlers completamente públicos

**Severidad:** 🟠 Alto  
**Archivo:** `src/lib/manejadores-api.js` línea 34  
**Problema:** La función `crearManejadoresCRUD` genera handlers `GET` y `POST` sin ninguna comprobación de autenticación. Todos los modelos que la usan (clientes, productos, fabricantes, materiales, proveedores, grapas, tacos) son accesibles públicamente cuando `AUTH_PIN` está activo.

**Corrección:** Añadir verificación de sesión en el generador:

```js
// ✅ En crearManejadoresCRUD, inicio de GET y POST:
const GET = async (request) => {
  if (process.env.AUTH_PIN) {
    const { verifyAuth } = await import('@/lib/auth');
    const err = verifyAuth(request);
    if (err) return NextResponse.json({ message: err.message }, { status: err.status });
  }
  // ... resto
};
```

### [BACK-03] N+1 potencial en dashboard con movimientos recientes

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/dashboard/route.js` ~línea 40  
**Problema:** Si `stockItem` es null para algún movimiento (movimiento manual), `mov.stockItem?.material` devuelve `undefined` sin error visible pero con dato incorrecto en la UI.

**Corrección:**

```js
// ✅ Corrección
materialNombre: mov.stockItem?.material?.nombre ?? 'Movimiento manual'
```

### [BACK-04] Items manuales en pricing/calculate con `unitPrice` 0 sin aviso

**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/pricing/calculate/route.js` línea 39  
**Problema:**

```js
// ❌ Código actual — item.unitPrice=null se convierte silenciosamente en 0
calculatedItems.push({ ...item, unitPrice: item.unitPrice || 0, finalPrice: item.unitPrice || 0 });
```

Un ítem manual sin precio queda con precio 0 en el presupuesto sin ningún aviso.

**Corrección:**

```js
// ✅ Corrección
if (!item.productId && (item.unitPrice == null || Number(item.unitPrice) < 0)) {
  return NextResponse.json(
    { message: `Item "${item.descripcion}" requiere un unitPrice válido` },
    { status: 400 }
  );
}
```

### [BACK-05] `/api/tracking/sync` sin protección de acceso

**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/tracking/sync/route.js`  
Ver SEC-04 para la corrección.

---

## 🌐 API

### Mapa de endpoints (representativo de los 89+ totales)

| Método | Ruta | Auth activa | Validación | Estado |
|--------|------|------------|------------|--------|
| GET | /api/auth/status | ❌ público | ❌ | ✅ OK por diseño |
| POST | /api/auth/login | ❌ público | ✅ | ✅ + rate limit 5/min |
| POST | /api/auth/logout | ❌ público | ❌ | ✅ OK |
| GET | /api/clientes | ❌ | ❌ | ⚠️ Sin auth efectiva |
| POST | /api/clientes | ❌ | ✅ clienteSchema | ⚠️ Sin auth efectiva |
| GET/PUT/DELETE | /api/clientes/[id] | ❌ | ✅ parcial | ⚠️ Sin auth efectiva |
| GET | /api/productos | ❌ | ❌ | ⚠️ Expone costoUnitario |
| POST | /api/productos | ❌ | ✅ productoSchema | ⚠️ Sin auth efectiva |
| GET/PUT/DELETE | /api/productos/[id] | ❌ | ✅ parcial | ⚠️ Sin auth efectiva |
| GET | /api/pedidos | ❌ | ❌ | ⚠️ Sin auth efectiva |
| POST | /api/pedidos | ❌ | ✅ pedidoSchema | ⚠️ Sin auth efectiva |
| GET/PUT/DELETE | /api/pedidos/[id] | ❌ | ✅ parcial | ⚠️ Sin auth efectiva |
| GET | /api/presupuestos | ❌ | ❌ | ⚠️ Sin auth efectiva |
| POST | /api/presupuestos | ❌ | ✅ presupuestoSchema | ⚠️ Sin auth efectiva |
| POST | /api/presupuestos/[id]/email | ❌ | ✅ regex email | ⚠️ Sin auth efectiva |
| GET | /api/config | ❌ | ✅ key whitelist | ✅ Solo claves permitidas |
| PUT | /api/config | ❌ | ✅ key whitelist | 🔴 Sin auth — datos fiscales |
| GET | /api/config/backup | ❌ | ❌ | ⚠️ Rate limit 5/min |
| GET | /api/export/csv | ❌ | ❌ | ⚠️ Rate limit 10/min |
| GET | /api/informes | ❌ | ❌ | ⚠️ Rate limit 20/min |
| GET | /api/audit-log | ❌ | ❌ | ⚠️ Rate limit 30/min |
| GET | /api/busqueda | ❌ | ❌ | ⚠️ Rate limit 30/min |
| POST | /api/pricing/calculate | ❌ | ✅ array check | ⚠️ Sin auth efectiva |
| POST | /api/tracking/sync | ❌ | ❌ | ⚠️ Sin auth ni rate limit |
| GET | /api/dashboard | ❌ | ❌ | ⚠️ Sin auth efectiva |

> La columna "Auth activa" refleja que no hay verificación a nivel de código independientemente de `AUTH_PIN`. Cuando la app se usa sin PIN en LAN privada, esto es correcto por diseño.

### Hallazgos de API

### [API-01] `GET /api/productos` expone `costoUnitario`

**Severidad:** 🟠 Alto  
**Endpoint:** `GET /api/productos`  
**Problema:** La respuesta incluye `costoUnitario` (precio de coste de compra al proveedor). En un contexto con múltiples usuarios o acceso externo, clientes podrían calcular el margen del negocio.  
**Corrección:** Añadir `select` explícito que excluya `costoUnitario` en el listado público, o usar un endpoint separado para uso interno.

### [API-02] Bulk-update de pedidos sin verificación de propiedad

**Severidad:** 🟡 Medio  
**Endpoint:** `POST /api/pedidos/bulk-update`  
**Problema:** Acepta hasta 200 IDs sin verificar que pertenezcan al mismo cliente o que el operador tenga permiso. En un sistema multiusuario futuro, un usuario podría modificar pedidos de otro.  
**Corrección:** Si se añaden roles, filtrar los IDs por pertenencia antes del update.

### [API-03] Búsqueda sin `totalCount` ni paginación real

**Severidad:** 🟡 Medio  
**Endpoint:** `GET /api/busqueda`  
**Problema:** Devuelve hasta 5 resultados por tipo sin `totalCount`. Los endpoints de catálogo usan `take: 500` como límite implícito sin informar si hay más resultados.  
**Corrección:** Añadir header `X-Total-Count` o campo `total` en la respuesta para que el frontend pueda mostrar "hay más resultados".

### [API-04] `/api/tracking/sync` sin control de acceso

**Severidad:** 🟢 Bajo  
Ver SEC-04.

---

## 🎨 Frontend

### [FRONT-01] Dos implementaciones de tema compiten entre sí

**Severidad:** 🟡 Medio  
**Archivos:** `src/componentes/layout/ThemeSwitcher.js`, `src/componentes/ui/ProveedorTema.js`  
**Problema:** Ambos componentes escriben en `localStorage` con claves diferentes (`crm-tema` vs `theme`). Si los dos están activos simultáneamente, el tema puede no persistir correctamente entre recargas o flickear al cargar.  
**Corrección:** Unificar en una sola clave de `localStorage` y eliminar uno de los dos componentes.

### [FRONT-02] Botones solo-icono sin `aria-label` en páginas de detalle

**Severidad:** 🟢 Bajo  
**Archivos:** Varios componentes de pedidos y presupuestos  
**Problema:** Botones que solo muestran un icono (sin texto visible) no tienen `aria-label`, lo que impide que los lectores de pantalla los describan.

**Corrección:**

```jsx
// ❌ Código actual
<button onClick={handleEliminar}><Trash2 className="w-4 h-4" /></button>

// ✅ Corrección
<button onClick={handleEliminar} aria-label="Eliminar pedido">
  <Trash2 className="w-4 h-4" />
</button>
```

---

## ✅ Hallazgos corregidos en esta sesión

| ID | Descripción | Área | Commit |
|----|-------------|------|--------|
| FIX-01 | Boton.jsx: props `deshabilitado`/`cargando` ignoradas — botones no se deshabilitaban | Frontend | ccb2bbf |
| FIX-02 | Modal.jsx: sin `role="dialog"`, `aria-modal`, `aria-labelledby` ni focus trap | Frontend | ccb2bbf |
| FIX-03 | useGestionCRUD: `alert()` nativo en errores → `toastError()` | Frontend | ccb2bbf |
| FIX-04 | useGestionCRUD: `window.confirm` nativo → modal de confirmación | Frontend | ccb2bbf |
| FIX-05 | useGestionCRUD: timeout de `cerrarModal` sin cleanup → useRef | Bug | ccb2bbf |
| FIX-06 | FiltroBusquedaSimple: debounce sin cleanup → setState en componente desmontado | Bug | ccb2bbf |
| FIX-07 | Dashboard: `total.toFixed(2)` lanza TypeError si `total` es null | Bug | ccb2bbf |
| FIX-08 | layout.js: `"use client"` en root layout bloqueaba RSC y metadata → providers.js | Backend | ccb2bbf |
| FIX-09 | globals.css: `themes: all` cargaba 30+ temas DaisyUI innecesariamente | Frontend | ccb2bbf |
| FIX-10 | rateLimiter: `x-forwarded-for` forjable → `getClientIp()` usa x-real-ip | Seguridad | ccb2bbf |
| FIX-11 | email.js: HTML injection en template de presupuesto → `escapeHtml()` | Seguridad | ccb2bbf |
| FIX-12 | next.config.mjs: `X-XSS-Protection` obsoleto eliminado; `Permissions-Policy` añadido | Seguridad | ccb2bbf |
| FIX-13 | .gitignore: excepción `!prisma/dev.db` podía commitear la base de datos | Seguridad | ccb2bbf |
| FIX-14 | Encabezado.js: `aria-expanded` ausente en dropdowns; hamburguesa sin aria-label dinámico | Frontend | ccb2bbf |
| FIX-15 | TablaDatos.jsx: `<th>` sin `scope="col"` | Frontend | ccb2bbf |
| FIX-16 | Paginacion.jsx: botones solo-icono sin `aria-label`, sin `aria-current="page"` | Frontend | ccb2bbf |
| FIX-17 | tracking.js: endpoint Ship24 incorrecto (`/search` → `/track`), parsing erróneo | Bug | 4e0a61d |

---

## ✅ Puntos positivos

- **Sin SQL injection**: Uso exclusivo de Prisma ORM con queries parametrizadas.
- **Validación con Zod**: Todos los endpoints POST/PUT validan el body contra schema Zod antes de tocar la base de datos.
- **Logging seguro**: `logApiError` registra solo `{name, message, code, meta}` — nunca stack traces con rutas internas o queries Prisma.
- **Rate limiting en auth**: `/api/auth/login` limita a 5 intentos/min con comparación HMAC en tiempo constante (protección timing attack).
- **Cookies seguras**: `httpOnly`, `sameSite: 'strict'`, `secure` en producción.
- **HSTS en producción**: `Strict-Transport-Security` activo.
- **CSP configurada**: Content Security Policy con `frame-ancestors: none` y `object-src: none`.
- **Permissions-Policy**: Restricción de cámara, micrófono, geolocalización y pagos.
- **VeriFactu implementado**: Hash chain SHA-256 para conformidad fiscal española (obligatorio antes del 01/01/2027).
- **Transacciones en operaciones críticas**: `db.$transaction()` en actualizaciones de pedidos (delete+create de ítems atómico).
- **Auditoría de cambios**: Fire-and-forget en todas las operaciones CRUD.
- **PWA funcional**: manifest.json, service worker, shortcuts configurados.
- **Arquitectura limpia**: Separación clara — Zod para validación, Prisma para DB, `api-response.js` para respuestas consistentes.

---

## 🗺️ Plan de Acción Priorizado

| # | Hallazgo | Área | Severidad | Esfuerzo est. |
|---|----------|------|-----------|---------------|
| 1 | [CRÍTICO-01] Restaurar auth en middleware cuando AUTH_PIN activo | Seguridad | 🔴 | ~1 h |
| 2 | [CRÍTICO-02] Añadir auth check en `PUT /api/config` | Backend | 🔴 | ~15 min |
| 3 | [SEC-02] SESSION_SECRET: fallar duro si AUTH_PIN activo y SECRET ausente | Seguridad | 🟠 | ~10 min |
| 4 | [BUG-01] Fix `new Date(null)` → epoch en presupuestos/[id] | Bug | 🟠 | ~10 min |
| 5 | [BUG-02] Validar fechas con `isNaN()` antes de `new Date()` en informes | Bug | 🟠 | ~15 min |
| 6 | [BACK-02] Añadir verificación de sesión en `crearManejadoresCRUD` | Backend | 🟠 | ~1 h |
| 7 | [API-01] Excluir `costoUnitario` del listado público de productos | API | 🟠 | ~15 min |
| 8 | [BUG-03] Limitar longitud de query en `/api/busqueda` (max 100 chars) | Bug | 🟡 | ~5 min |
| 9 | [BUG-04] Envolver upserts de config en `db.$transaction()` | Bug | 🟡 | ~10 min |
| 10 | [BACK-04] Validar `unitPrice > 0` en ítems manuales de pricing | Backend | 🟡 | ~15 min |
| 11 | [FRONT-01] Unificar ThemeSwitcher + ProveedorTema en una implementación | Frontend | 🟡 | ~30 min |
| 12 | [SEC-04] Añadir rate limit a `/api/tracking/sync` | Seguridad | 🟢 | ~10 min |
| 13 | [FRONT-02] Añadir `aria-label` en botones solo-icono de páginas de detalle | Frontend | 🟢 | ~30 min |
| 14 | [SEC-03] Migrar CSP de `unsafe-inline` a nonces | Seguridad | 🟡 | ~4 h |

---

*Generado automáticamente el 2026-06-09. Marca cada fila con ✅ al aplicar la corrección.*
