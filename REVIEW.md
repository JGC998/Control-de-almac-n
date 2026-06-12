# REVIEW — Sistema de Gestión Almacén (CRM Taller)

> Generado el 2026-06-12 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 (App Router) · React 19 · Prisma 6 ORM (SQLite dev / MySQL prod) · DaisyUI 5 + Tailwind CSS 4 · SWR · Zod 4 · jsPDF 4 · ExcelJS · Resend · Tesseract.js · QRCode · Recharts  
**Archivos analizados:** 254 (92 rutas API + 17 módulos lib + 145 componentes/páginas)  
**Total hallazgos abiertos:** 24 (2 críticos, 6 altos, 10 medios, 6 bajos)  
**Hallazgos corregidos en sesiones anteriores:** 17

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| 🔒 Seguridad | 6/10 | 1 | 3 | 3 | 1 |
| 🐛 Bugs | 8/10 | 1 | 1 | 2 | 2 |
| ⚙️ Backend | 7/10 | 0 | 1 | 3 | 2 |
| 🌐 API | 7/10 | 0 | 1 | 2 | 1 |
| 🎨 Frontend | 9/10 | 0 | 0 | 1 | 1 |

> **Nota de contexto:** La app es una herramienta interna de LAN. `AUTH_PIN` es **opcional** — sin él la app es intencionalmente pública. Los hallazgos de seguridad relacionados con auth aplican principalmente cuando `AUTH_PIN` está configurado, pero hay hallazgos que impactan independientemente del PIN.

---

## 🚨 Hallazgos Críticos — Acción Inmediata

### [CRÍTICO-01] AUTH_PIN configurado pero las APIs no están protegidas por el middleware

**Área:** Seguridad  
**Archivo:** `middleware.js`  
**Problema:** El middleware actual únicamente redirige móviles y añade cabeceras de seguridad. Si el operador configura `AUTH_PIN` esperando proteger la app, cualquier petición directa a la API (`curl`, Postman, script externo) saltará la autenticación — el middleware nunca verifica la cookie `crm-auth`. Todos los endpoints `/api/*` son accesibles sin sesión: pedidos, presupuestos, clientes, márgenes, backup de configuración, exportaciones Excel/CSV, audit log.  
**Impacto:** Violación RGPD/LOPDGDD si se almacenan datos de personas (nombre, NIF, email de clientes). Exposición de márgenes comerciales, precios de coste y datos fiscales.  
**Corrección:**

```js
// middleware.js — restaurar verificación de cookie cuando AUTH_PIN está activo
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

### [CRÍTICO-02] `DELETE /api/pedidos/[id]` — referencia a `db.albaran` que no existe en el schema

**Área:** Bugs  
**Archivo:** `src/app/api/pedidos/[id]/route.js` línea 160  
**Problema:** La función DELETE comprueba `db.albaran.count({ where: { pedidoId: id } })` pero el modelo `Albaran` no existe en `prisma/schema.prisma` ni en `prisma/schema.dev.prisma`. Esta llamada lanza `TypeError: db.albaran is not a function` en runtime, haciendo que TODOS los intentos de eliminar un pedido devuelvan un 500.  
**Impacto:** Funcionalidad de borrado de pedidos completamente rota. Los usuarios reciben un error 500 genérico sin explicación.  
**Corrección:**

```js
// ❌ Código actual — modelo que no existe en el schema
const albaranesVinculados = await db.albaran.count({ where: { pedidoId: id } });
if (albaranesVinculados > 0) { ... }
await db.pedido.delete({ where: { id } });

// ✅ Corrección — eliminar la comprobación (o añadir el modelo Albaran al schema si se necesita)
await db.pedido.delete({ where: { id } });
revalidatePath('/pedidos');
return NextResponse.json({ message: 'Pedido eliminado correctamente' });
```

---

## 🔒 Seguridad

### [SEC-01] 🔴 Crítica — Middleware sin protección de rutas (ver CRÍTICO-01)

### [SEC-02] 🟠 Alta — SESSION_SECRET con fallback hardcoded público en el repositorio
**Archivo:** `src/app/api/auth/login/route.js` línea 34  
**Problema:**
```js
// ❌ Código actual — fallback literal conocido por cualquiera con acceso al repo
const effectiveSecret = secret || 'dev-secret-change-in-production';
```
Si `SESSION_SECRET` no está configurado en producción, un atacante puede calcular offline `HMAC-SHA256('dev-secret-change-in-production', AUTH_PIN)` y forjar la cookie `crm-auth`. El default PIN documentado en `CLAUDE.md` es `1234`, reduciendo el ataque a un único cálculo.  
**Corrección:**
```js
// ✅ Fallar explícitamente si SESSION_SECRET está ausente en producción
const secret = process.env.SESSION_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
}
const effectiveSecret = secret || crypto.randomBytes(32).toString('hex'); // Solo dev
```

### [SEC-03] 🟠 Alta — Rate limiting inconsistente: 7 endpoints usan IP spoofable + escrituras críticas sin límite
**Archivos afectados (IP spoofable):** `src/app/api/pricing/especiales/route.js`, `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js`, `src/app/api/presupuestos/export/route.js`, `src/app/api/notificaciones/route.js`, `src/app/api/pedidos-proveedores-data/route.js`, `src/app/api/pedidos/export/route.js`, `src/app/api/pedidos-proveedores-data/analisis-precios/route.js`  
**Problema:** Estos endpoints extraen la IP con `.split(',')[0]` (el primer valor, controlado por el cliente), mientras el helper `getClientIp` del proyecto usa `.at(-1)` (el valor añadido por el proxy, más seguro). Además, `POST /api/precios/bulk-update` (modifica todos los precios de la tarifa) carece de rate limiting.
```js
// ❌ Patrón inseguro — toma [0], que el cliente puede forjar
const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';

// ✅ Usar siempre el helper centralizado
import { getClientIp } from '@/lib/rateLimiter';
const ip = getClientIp(request);
```

### [SEC-04] 🟠 Alta — Archivos subidos en `public/planos/` servidos sin autenticación
**Archivo:** `src/app/api/documentos/route.js` líneas 146-153  
**Problema:** Los documentos (PDFs, planos, imágenes) se guardan en `public/planos/` y Next.js los sirve estáticamente. El middleware excluye `_next/static` y assets estáticos, por lo que los archivos en `/public` se sirven sin verificar la cookie `crm-auth`. Aunque los nombres son UUIDs (lo que dificulta la enumeración), cualquier persona con la URL puede descargar el documento.  
**Corrección:** Mover los archivos fuera de `public/` y servirlos a través de una ruta API autenticada que verifique la sesión antes de enviar el archivo con `fs.readFile`.

### [SEC-05] 🟡 Media — `POST /api/tracking/sync` sin autenticación ni rate limiting
**Archivo:** `src/app/api/tracking/sync/route.js`  
**Problema:** Endpoint ejecuta consultas a Yang Ming API y puede disparar mensajes WhatsApp. Sin protección, un atacante puede agotarlo.  
**Corrección:** Proteger con `CRON_SECRET` en header `Authorization: Bearer <secret>` o añadir rate limiting estricto.

### [SEC-06] 🟡 Media — CSP con `unsafe-inline` en `script-src` en producción
**Archivo:** `next.config.mjs` línea 8  
**Problema:** `script-src 'self' 'unsafe-inline'` en producción permite scripts inline arbitrarios, anulando la protección XSS de la CSP si se explotara una vulnerabilidad de inyección de HTML.  
**Corrección:** Migrar a nonces o documentar explícitamente este trade-off aceptado.

### [SEC-07] 🟡 Media — `GET /api/audit-log` expone historial completo sin control de acceso por roles
**Archivo:** `src/app/api/audit-log/route.js`  
**Problema:** El audit log contiene datos históricos completos (valores anteriores/nuevos de cualquier entidad). Solo el rate limiting lo protege (30 req/min). Sin autenticación activa y sin roles, cualquier operador autenticado puede ver el histórico completo de cambios.

### [SEC-08] 🟢 Baja — Secreto de fallback documentado en CLAUDE.md
**Archivo:** `CLAUDE.md` sección Environment  
**Problema:** El PIN por defecto `1234` está documentado en el archivo de contexto del repo. Aunque es un entorno interno, facilitar los valores de secretos en documentación de código incrementa la superficie de riesgo.

---

## 🐛 Bugs

### [BUG-01] 🔴 Crítico — `DELETE /api/pedidos/[id]` roto (ver CRÍTICO-02)

### [BUG-02] 🟠 Alta — `POST /api/pedidos` falla si `clienteId` es `null` (pedido sin cliente)
**Archivo:** `src/app/api/pedidos/route.js` líneas 78-80  
**Problema:** El schema Zod acepta `clienteId` como opcional (`nullable()`), pero la creación siempre intenta `cliente: { connect: { id: clienteId } }` sin comprobar si es null. Prisma lanza error al intentar conectar `null`.
```js
// ❌ Código actual — siempre intenta conectar aunque clienteId sea null
cliente: { connect: { id: clienteId } },

// ✅ Corrección
...(clienteId ? { cliente: { connect: { id: clienteId } } } : {}),
```

### [BUG-03] 🟡 Media — `new Date(null)` retorna epoch (1970) en presupuestos
**Archivo:** `src/app/api/presupuestos/[id]/route.js`  
**Problema:** Si el cliente envía `ultimoRecordatorio: null`, `new Date(null)` devuelve `1970-01-01T00:00:00.000Z`. El presupuesto queda con fecha de recordatorio del año 1970 en BD.  
**Corrección:** `ultimoRecordatorio ? new Date(ultimoRecordatorio) : null`

### [BUG-04] 🟡 Media — `JSON.parse(item.detallesTecnicos)` en `pdfGenerator.js` sin try-catch
**Archivo:** `src/lib/pdfGenerator.js` líneas 192 y 423  
**Problema:** Un solo item con `detallesTecnicos` malformado bloquea la generación de PDF para todo el pedido/presupuesto.
```js
// ❌ Código actual — sin manejo de errores
return { quantity: item.quantity, dt: JSON.parse(item.detallesTecnicos) };

// ✅ Corrección
let dt = null;
try { dt = item.detallesTecnicos ? JSON.parse(item.detallesTecnicos) : null; } catch { dt = null; }
return { quantity: item.quantity, dt };
```

### [BUG-05] 🟡 Media — Fechas de filtro sin validar en `/api/informes`
**Archivo:** `src/app/api/informes/route.js` línea 163  
**Problema:** `new Date("cadena_invalida")` devuelve `Invalid Date`, que Prisma puede manejar erroneamente.
```js
// ✅ Corrección
const parseFecha = (str) => { if (!str) return null; const d = new Date(str); return isNaN(d.getTime()) ? null : d; };
if (desde && !parseFecha(desde)) return NextResponse.json({ message: 'Fecha inválida' }, { status: 400 });
```

### [BUG-06] 🟢 Baja — Búsqueda global sin límite de longitud de query
**Archivo:** `src/app/api/busqueda/route.js` línea 13  
**Problema:** Sin límite superior, una query de miles de caracteres ejecuta 4 `LIKE '%...%'` paralelos.
```js
// ✅ Corrección
if (!query || query.length < 2 || query.length > 100) return NextResponse.json([]);
```

### [BUG-07] 🟢 Baja — Endpoint deprecated `DELETE /api/notas` (ID en body) aún activo
**Archivo:** `src/app/api/notas/route.js` línea 39  
**Problema:** El handler deprecated sigue activo y el frontend (`TablonNotas.js`) lo sigue usando. Viola REST.  
**Corrección:** Migrar `TablonNotas.js` a `DELETE /api/notas/[id]` y eliminar el handler.

---

## ⚙️ Backend

### [BACK-01] 🟠 Alta — Totales de pedidos/presupuestos aceptados del cliente sin recalcular en servidor
**Archivos:** `src/app/api/pedidos/route.js` línea 69, `src/app/api/presupuestos/route.js` línea 70  
**Problema:** Los campos `subtotal`, `tax` y `total` se reciben del cliente y se almacenan directamente sin verificar que coincidan con la suma real de los ítems. Un actor malintencionado puede crear pedidos con totales manipulados.
```js
// ✅ Corrección — recalcular en servidor
import { calculateTotalsBackend } from '@/lib/utilidades-precios';
const { subtotal, tax, total } = await calculateTotalsBackend(items);
```

### [BACK-02] 🟡 Media — `crearManejadoresCRUD` genera handlers sin auth efectiva cuando AUTH_PIN activo
**Archivo:** `src/lib/manejadores-api.js` línea 34  
**Problema:** Los modelos gestionados via este helper (clientes, fabricantes, materiales, proveedores, grapas, tacos) carecen de verificación de sesión independiente del middleware.

### [BACK-03] 🟡 Media — `mapearCrear` en clientes pierde el campo `nif`
**Archivo:** `src/app/api/clientes/route.js` línea 9  
**Problema:**
```js
// ❌ Código actual — nif nunca se guarda en POST /api/clientes
mapearCrear: (data) => ({
  nombre: data.nombre, email: data.email, direccion: data.direccion,
  telefono: data.telefono, tier: data.categoria,  // ← nif ausente
}),

// ✅ Corrección
mapearCrear: (data) => ({
  nombre: data.nombre, nif: data.nif ?? null, email: data.email,
  direccion: data.direccion, telefono: data.telefono, tier: data.tier ?? data.categoria ?? null,
}),
```

### [BACK-04] 🟡 Media — Upserts concurrentes en `PUT /api/config` sin transacción
**Archivo:** `src/app/api/config/route.js` línea 50  
**Problema:** `Promise.all` sobre múltiples `upsert` puede crear condiciones de carrera en MySQL con peticiones simultáneas sobre las mismas claves.
```js
// ✅ Corrección
await db.$transaction(entries.map(([key, value]) => db.config.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })));
```

### [BACK-05] 🟢 Baja — Caché en memoria sin invalidación cross-instancia
**Archivos:** `src/lib/config-cache.js`, `src/lib/pdfGenerator.js`  
**Problema:** En entornos multi-instancia, un cambio de configuración solo invalida el caché en la instancia que recibió la petición. Otras instancias sirven datos obsoletos hasta que expira el TTL (5 min).

### [BACK-06] 🟢 Baja — `ConfiguracionEmisor` consultado en pdfGenerator pero puede faltar en schema de producción
**Archivo:** `src/lib/pdfGenerator.js` línea 29  
**Problema:** `db.configuracionEmisor` se consulta pero este modelo no aparece en `prisma/schema.prisma`. Si no existe en el schema de producción MySQL, la generación de PDFs fallará.  
**Corrección:** Verificar que `ConfiguracionEmisor` está en `prisma/schema.prisma` y sincronizar ambos schemas.

---

## 🌐 API

### Mapa de endpoints

| Método | Ruta | Auth | Validación | Observaciones |
|--------|------|------|------------|---------------|
| GET | `/api/auth/status` | Pública | — | Correcto por diseño |
| POST | `/api/auth/login` | Pública | manual | Rate limit 5/min · timingSafeEqual ✓ |
| POST | `/api/auth/logout` | Pública | — | Elimina cookie |
| GET | `/api/dashboard` | ⚠️ middleware | — | |
| GET | `/api/pedidos` | ⚠️ middleware | — | Paginación ✓ |
| POST | `/api/pedidos` | ⚠️ middleware | Zod ✓ | Totales del cliente sin verificar |
| GET/PUT/PATCH | `/api/pedidos/[id]` | ⚠️ middleware | Zod ✓ | presupuestoId sin validar en PUT |
| DELETE | `/api/pedidos/[id]` | ⚠️ middleware | — | **ROTO: db.albaran no existe** |
| POST | `/api/pedidos/from-presupuesto` | ⚠️ middleware | manual | TOCTOU resuelto ✓ |
| POST | `/api/pedidos/bulk-update` | ⚠️ middleware | Zod ✓ | Sin rate limit |
| GET | `/api/pedidos/export` | ⚠️ middleware | — | Rate limit 10/min · IP spoofable |
| GET | `/api/pedidos/[id]/pdf` | ⚠️ middleware | — | |
| POST | `/api/pedidos/[id]/email` | ⚠️ middleware | regex email ✓ | |
| GET | `/api/presupuestos` | ⚠️ middleware | — | Paginación ✓ |
| POST | `/api/presupuestos` | ⚠️ middleware | Zod ✓ | Totales del cliente sin verificar |
| GET/PUT/DELETE | `/api/presupuestos/[id]` | ⚠️ middleware | Zod ✓ | new Date(null)=1970 en PUT |
| GET | `/api/presupuestos/export` | ⚠️ middleware | — | Rate limit · IP spoofable |
| POST | `/api/presupuestos/bulk-update` | ⚠️ middleware | Zod ✓ | |
| GET | `/api/clientes` | ⚠️ middleware | — | Cap 500 ✓ |
| POST | `/api/clientes` | ⚠️ middleware | Zod ✓ | nif se pierde (BACK-03) |
| GET/PUT/DELETE | `/api/clientes/[id]` | ⚠️ middleware | Zod ✓ | |
| GET | `/api/productos` | ⚠️ middleware | — | Expone costoUnitario |
| POST | `/api/productos` | ⚠️ middleware | Zod ✓ | |
| GET/PUT/DELETE | `/api/productos/[id]` | ⚠️ middleware | Zod ✓ | |
| GET | `/api/config` | ⚠️ middleware | whitelist ✓ | |
| PUT | `/api/config` | ⚠️ middleware | whitelist ✓ | Upserts sin transacción |
| GET | `/api/config/backup` | ⚠️ middleware | — | Rate limit 5/min ✓ |
| GET | `/api/informes` | ⚠️ middleware | param tipo | Rate limit 20/min · fechas sin validar |
| GET | `/api/busqueda` | ⚠️ middleware | min 2 chars | Rate limit 30/min · sin límite max |
| POST | `/api/almacen-stock` | ⚠️ middleware | manual | Sin rate limit |
| GET | `/api/almacen-stock` | ⚠️ middleware | — | Cap 1000 ✓ |
| POST | `/api/pricing/calculate` | ⚠️ middleware | manual | Sin rate limit |
| POST | `/api/pricing/inverse-calc` | ⚠️ middleware | Zod ✓ | |
| GET/POST | `/api/pricing/margenes` | ⚠️ middleware | Zod ✓ | |
| GET/PUT/DELETE | `/api/pricing/descuentos` | ⚠️ middleware | Zod ✓ | |
| POST | `/api/precios/bulk-update` | ⚠️ middleware | rango -99/1000 | Sin rate limit — masivo |
| GET | `/api/importaciones` | ⚠️ middleware | — | Cap 100 ✓ |
| POST | `/api/importaciones` | ⚠️ middleware | Zod ✓ | |
| GET | `/api/importaciones/[id]/tracking` | ⚠️ middleware | — | Fetch externo Yang Ming |
| GET | `/api/importaciones/[id]/analisis-rentabilidad` | ⚠️ middleware | UUID+RL ✓ | IP spoofable |
| POST | `/api/importaciones/borrador` | ⚠️ middleware | Zod ✓ | |
| PATCH | `/api/importaciones/[id]/bobinas` | ⚠️ middleware | Zod ✓ | |
| GET | `/api/audit-log` | ⚠️ middleware | — | Rate limit 30/min ✓ |
| POST | `/api/tracking/sync` | ⚠️ **Sin protección** | — | Sin auth ni rate limit (SEC-05) |
| GET | `/api/documentos` | ⚠️ middleware | — | Cap 2000 |
| POST | `/api/documentos` | ⚠️ middleware | MIME ✓ · UUID ✓ | Archivo en public/ sin auth |
| GET/POST | `/api/notas` | ⚠️ middleware | Zod ✓ | DELETE deprecated aún activo |
| GET/POST/PATCH | `/api/notificaciones` | ⚠️ middleware | manual | Rate limit · IP spoofable |
| POST | `/api/logistica/calcular` | ⚠️ middleware | Zod ✓ | |
| GET | `/api/export/csv` | ⚠️ middleware | whitelist ✓ | Rate limit 10/min ✓ |
| POST | `/api/herramientas/carta-porte` | ⚠️ middleware | Zod ✓ | |
| GET/PUT | `/api/tracking/uso` | ⚠️ middleware | — | |
| POST | `/api/stock-management/receive-order` | ⚠️ middleware | — | Sin validación Zod |

> ⚠️ middleware = protegido solo si el middleware restaura la verificación de sesión (CRÍTICO-01). Actualmente todos estos endpoints son públicos.

### Hallazgos de API

### [API-01] 🟠 Alta — `POST /api/precios/bulk-update` puede llevar todos los precios a cero sin autenticación
**Archivo:** `src/app/api/precios/bulk-update/route.js`  
**Problema:** Sin rate limiting y sin autenticación efectiva, una petición `POST /api/precios/bulk-update` con `{ percentage: -99, material: "TODOS" }` lleva todos los precios de la tarifa de materiales a prácticamente cero en una sola llamada.  
**Corrección:** Añadir rate limiting estricto (3 req/min), campo de confirmación explícito, y restaurar autenticación (CRÍTICO-01).

### [API-02] 🟡 Media — `GET /api/productos` expone `costoUnitario` (precio de coste al proveedor)
**Problema:** La respuesta incluye el precio de compra al proveedor. Cualquier usuario autenticado puede calcular el margen del negocio.  
**Corrección:** Añadir `select` explícito que excluya `costoUnitario` en el listado público.

### [API-03] 🟡 Media — Inconsistencia en formato de errores: `{ error }` vs `{ message }`
**Problema:** Endpoints como importaciones/tracking usan `{ error: '...' }` mientras pedidos/presupuestos/clientes usan `{ message: '...' }`. El frontend debe manejar ambos formatos.  
**Corrección:** Estandarizar usando `ApiResponse` de `src/lib/api-response.js` en todos los endpoints.

### [API-04] 🟢 Baja — `POST /api/stock-management/receive-order` sin validación Zod
**Problema:** Endpoint de alto impacto (crea stock, cambia estado de pedido) solo valida que `pedidoId` existe. Los cálculos de coste usan campos sin validar de la BD.

---

## 🎨 Frontend

### [FRONT-01] 🟡 Media — Dos implementaciones de tema compiten en localStorage
**Archivos:** `src/componentes/layout/ThemeSwitcher.js` (clave `crm-tema`), `src/componentes/ui/ProveedorTema.js` (clave `theme`)  
**Problema:** Ambos escriben en localStorage con claves distintas. El tema puede no persistir o flickear al cargar.  
**Corrección:** Unificar en una sola clave y eliminar uno de los dos componentes.

### [FRONT-02] 🟢 Baja — console.error con objeto Error completo en componentes de UI
**Archivos:** `src/componentes/ui/TablaGestionDatos.js` l.88/114, `src/componentes/presupuestos/EmailButton.js` l.29, `src/componentes/calculadoras/CalculadoraInversa.js` l.42, `src/componentes/calculadoras/CalculadoraLogistica.js` l.59  
**Problema:** `console.error(error)` expone el objeto error completo en la consola del navegador, incluyendo potenciales mensajes de red o stack traces.  
**Corrección:** `console.error('[Componente]', error?.message ?? 'Error desconocido')`

---

## ✅ Hallazgos corregidos en sesiones anteriores

| ID | Descripción | Área | Commit |
|----|-------------|------|--------|
| FIX-01 | Boton.jsx: props `deshabilitado`/`cargando` ignoradas | Frontend | ccb2bbf |
| FIX-02 | Modal.jsx: sin `role="dialog"`, `aria-modal`, focus trap | Frontend | ccb2bbf |
| FIX-03 | useGestionCRUD: `alert()` nativo → `toastError()` | Frontend | ccb2bbf |
| FIX-04 | useGestionCRUD: `window.confirm` → modal de confirmación | Frontend | ccb2bbf |
| FIX-05 | useGestionCRUD: timeout sin cleanup → useRef | Bug | ccb2bbf |
| FIX-06 | FiltroBusquedaSimple: debounce sin cleanup | Bug | ccb2bbf |
| FIX-07 | Dashboard: `total.toFixed(2)` TypeError si null | Bug | ccb2bbf |
| FIX-08 | layout.js: `"use client"` en root layout bloqueaba RSC | Backend | ccb2bbf |
| FIX-09 | globals.css: `themes: all` cargaba 30+ temas innecesarios | Frontend | ccb2bbf |
| FIX-10 | rateLimiter: `x-forwarded-for` spoofable → `getClientIp()` | Seguridad | ccb2bbf |
| FIX-11 | email.js: HTML injection en template → `escapeHtml()` | Seguridad | ccb2bbf |
| FIX-12 | next.config.mjs: `X-XSS-Protection` eliminado; `Permissions-Policy` añadido | Seguridad | ccb2bbf |
| FIX-13 | .gitignore: excepción `!prisma/dev.db` podía commitear la BD | Seguridad | ccb2bbf |
| FIX-14 | Encabezado.js: `aria-expanded` ausente; hamburguesa sin aria-label | Frontend | ccb2bbf |
| FIX-15 | TablaDatos.jsx: `<th>` sin `scope="col"` | Frontend | ccb2bbf |
| FIX-16 | Paginacion.jsx: botones sin `aria-label`, sin `aria-current="page"` | Frontend | ccb2bbf |
| FIX-17 | tracking.js: endpoint Yang Ming incorrecto, parsing erróneo | Bug | 4e0a61d |

---

## ✅ Puntos Positivos

- **Sin SQL injection**: Uso exclusivo de Prisma ORM con queries parametrizadas.
- **Validación Zod exhaustiva**: Prácticamente todos los endpoints POST/PUT usan schemas centralizados en `src/lib/validations.js` con `safeParse()`.
- **Logging seguro**: `logApiError` registra solo `{name, message, code, meta}` — nunca stack traces ni queries Prisma.
- **Login robusto**: `POST /api/auth/login` usa `crypto.timingSafeEqual`, rate limiting 5/min, cookies `httpOnly` + `sameSite:strict` + `secure` en prod.
- **Headers de seguridad completos**: CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS en producción.
- **Subida de archivos segura**: MIME check + nombres UUID + validación de extensión.
- **Prevención de race conditions**: `updateMany` atómico en conversión presupuesto→pedido; `db.$transaction()` en operaciones complejas de stock.
- **Paginación implementada**: Todos los listados principales tienen paginación con límites máximos.
- **Audit log integrado**: Fire-and-forget en CRUD de todas las entidades principales.
- **Caché en memoria eficiente**: TTL de 5 min para márgenes, singleton de Prisma con `globalThis`.
- **VeriFactu implementado**: Hash chain SHA-256 para conformidad fiscal española (obligatorio antes 01/01/2027).
- **Cola offline para tablet**: `colaOffline.js` con IndexedDB bien implementada (SSR-safe, manejo de errores, `navigator.onLine`).
- **Whitelist de claves de configuración**: `GET/PUT /api/config` solo opera sobre claves permitidas.
- **Arquitectura de capas clara**: Zod → validación, Prisma → DB, `api-response.js` → respuestas, `logger.js` → logging.

---

## 🗺️ Plan de Acción Priorizado

| # | Hallazgo | Área | Severidad | Esfuerzo estimado |
|---|----------|------|-----------|-------------------|
| 1 | CRÍTICO-01: Restaurar auth en middleware cuando AUTH_PIN activo | Seguridad | 🔴 | ~1 h |
| 2 | CRÍTICO-02: Arreglar `db.albaran` inexistente en DELETE pedido | Bugs | 🔴 | 15 min |
| 3 | SEC-02: Eliminar fallback de secreto hardcoded en auth/login | Seguridad | 🟠 | 15 min |
| 4 | BUG-02: Condicionar `cliente: connect` cuando `clienteId` es null | Bugs | 🟠 | 15 min |
| 5 | BACK-01: Recalcular totales en servidor en POST pedidos/presupuestos | Backend | 🟠 | 2-3 h |
| 6 | SEC-03: Usar `getClientIp()` en 7 endpoints con IP spoofable | Seguridad | 🟠 | 1 h |
| 7 | API-01: Rate limiting estricto en `POST /api/precios/bulk-update` | API | 🟠 | 30 min |
| 8 | SEC-04: Proteger `/api/tracking/sync` con CRON_SECRET | Seguridad | 🟡 | 30 min |
| 9 | BACK-03: Corregir `mapearCrear` en clientes para incluir `nif` | Backend | 🟡 | 15 min |
| 10 | BUG-03: Fix `new Date(null)` → epoch en presupuestos/[id] | Bugs | 🟡 | 10 min |
| 11 | BUG-04: Wrap `JSON.parse(detallesTecnicos)` en try-catch | Bugs | 🟡 | 15 min |
| 12 | BUG-05: Validar fechas con `isNaN()` en `/api/informes` | Bugs | 🟡 | 15 min |
| 13 | BACK-04: Envolver upserts de config en `db.$transaction()` | Backend | 🟡 | 10 min |
| 14 | API-02: Excluir `costoUnitario` del listado de productos | API | 🟡 | 15 min |
| 15 | API-03: Estandarizar `{ message }` vs `{ error }` en respuestas | API | 🟡 | 3-4 h |
| 16 | FRONT-01: Unificar ThemeSwitcher + ProveedorTema | Frontend | 🟡 | 30 min |
| 17 | SEC-04: Añadir rate limit a `POST /api/stock-management/receive-order` | Seguridad | 🟡 | 30 min |
| 18 | BACK-06: Verificar `ConfiguracionEmisor` en schema de producción MySQL | Backend | 🟡 | 30 min |
| 19 | BUG-06: Limitar longitud de query en `/api/busqueda` (max 100) | Bugs | 🟢 | 5 min |
| 20 | BUG-07: Migrar `DELETE /api/notas` al patrón REST | Bugs | 🟢 | 1 h |
| 21 | BACK-05: Documentar limitación de caché multi-instancia | Backend | 🟢 | 30 min |
| 22 | SEC-06: Migrar CSP de `unsafe-inline` a nonces | Seguridad | 🟡 | 4+ h |
| 23 | FRONT-02: Limpiar `console.error(error)` en componentes | Frontend | 🟢 | 1 h |
| 24 | SEC-08: Eliminar valores de secretos de CLAUDE.md | Seguridad | 🟢 | 10 min |

---

*Este archivo fue generado automáticamente por Claude Code el 2026-06-12. Marca cada fila con ✅ al aplicar la corrección.*
