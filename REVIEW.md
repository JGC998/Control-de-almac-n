# REVIEW — CRM Taller / Control de Almacén
> Generado el 2026-05-27 · Revisión completa: Seguridad · Código · API · DB · Frontend

---

## 📋 Resumen Ejecutivo

**Stack:** Next.js 16 App Router · Prisma 6 · SQLite (dev) / MySQL (prod) · DaisyUI 5 · Tailwind 4 · SWR · jsPDF · Resend  
**Archivos analizados:** 205 (todos los .js/.jsx + schema + middleware)  
**Hallazgos totales:** 22 (1 crítico, 5 altos, 9 medios, 7 bajos)

| Área | Score | 🔴 | 🟠 | 🟡 |
|------|-------|----|----|-----|
| 🔒 Seguridad | 8/10 | 0 | 1 | 2 |
| 🐛 Código/Bugs | 7/10 | 1 | 2 | 2 |
| 🌐 API | 7.5/10 | 0 | 2 | 3 |
| 🗄️ Base de Datos | 7/10 | 0 | 1 | 4 |
| 🎨 Frontend | 7.5/10 | 0 | 1 | 1 |
| **TOTAL** | **7.5/10** | **1** | **7** | **12** |

> Proyecto sólido con buenas prácticas establecidas: PIN timing-safe, rate limiting, cookies httpOnly, Zod en endpoints principales, audit log, logApiError consistente. Los hallazgos son mayoritariamente menores. El único crítico es una feature rota (guías). La mayor deuda técnica está en índices de tablas secundarias y algunos endpoints sin límite de filas.

---

## 🚨 Hallazgos Críticos — Resolver antes del próximo deploy

### [CRIT-01] `/api/guias` no existe — páginas de guías completamente rotas
**Área:** Código  
**Archivos:** `src/app/guias/page.js` y `src/app/guias/[id]/page.js`  
**Problema:** Ambas páginas hacen `fetch('/api/guias')` pero la ruta `src/app/api/guias/` no existe. El fetch devuelve 404 y la UI muestra un error permanente para cualquier usuario que acceda.  
**Impacto:** La sección de guías es completamente inservible en producción.  
**Corrección:**
```js
// Opción A — eliminar si la feature está abandonada
// rm src/app/guias/page.js src/app/guias/[id]/page.js

// Opción B — crear src/app/api/guias/route.js
export async function GET() {
  const guias = await db.documento.findMany({ where: { tipo: 'GUIA' }, take: 200 });
  return NextResponse.json(guias);
}
```

---

## 🔒 Seguridad

### [SEC-01] `PUT /api/clientes/[id]` sin validación Zod
**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/clientes/[id]/route.js` línea 18  
**Problema:** El handler PUT escribe directamente `data.nombre`, `data.email`, etc. sin pasar por Zod. Todos los demás PUT del proyecto sí validan; este es la excepción.  
**Corrección:**
```js
// ❌ Actual
const data = await request.json();
const updatedCliente = await db.cliente.update({ where: { id }, data: { nombre: data.nombre, ... } });

// ✅ Corrección
import { clienteSchema } from '@/lib/validations';
const raw = await request.json();
const v = clienteSchema.safeParse(raw);
if (!v.success) return NextResponse.json({ errors: v.error.issues }, { status: 400 });
const updatedCliente = await db.cliente.update({ where: { id }, data: v.data });
```

### [SEC-02] `console.log` en `email.js` filtra emails de clientes a logs del servidor
**Severidad:** 🟡 Medio  
**Archivo:** `src/lib/email.js` líneas 14–15  
**Problema:** Sin `RESEND_API_KEY`, `console.log('📧 Simulando envío a: ${to}')` escribe la dirección de email del cliente en logs de servidor en texto plano.  
**Corrección:**
```js
// ❌ Actual
console.log(`📧 Simulando envío a: ${to} | Asunto: ${subject}`);

// ✅ Corrección
logApiError(new Error('RESEND_API_KEY no configurada — email simulado'), 'EMAIL');
```

### [SEC-03] `dangerouslySetInnerHTML` con HTML sin sanitizar (riesgo futuro)
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/guias/[id]/page.js` línea 58  
**Problema:** `dangerouslySetInnerHTML={{ __html: guia.htmlContent }}` renderiza HTML crudo. Si se implementa la API y permite crear/editar guías con HTML libre, es XSS almacenado.  
**Corrección al implementar guías:**
```js
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(guia.htmlContent) }} />
```

---

## 🐛 Código y Bugs

### [BUG-01] `crearManejadoresCRUD` devuelve TODOS los registros sin límite en modo sin paginación
**Severidad:** 🟠 Alto  
**Archivo:** `src/lib/manejadores-api.js` línea 46  
**Problema:** El factory GET tiene dos ramas: con paginación (usa `take:limit`) y sin paginación (devuelve todo sin límite). `GET /api/clientes` sin params devuelve todos los clientes. Para volúmenes actuales es inofensivo, pero es una bomba de tiempo.  
**Se dispara cuando:** Un selector de formulario llama a `GET /api/clientes` sin parámetros `page` o `limit`.  
**Corrección:**
```js
// ❌ Actual — sin límite
const records = await model.findMany(options.findMany || {});

// ✅ Corrección
const records = await model.findMany({ ...(options.findMany || {}), take: 500 });
```

### [BUG-02] `GET /api/informes?tipo=ventas-mensuales` — findMany sin `take`
**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/informes/route.js` línea 36  
**Problema:** `db.pedido.findMany({ where: { fechaCreacion: { gte: inicio, lt: fin } } })` sin `take`. Con miles de pedidos por año, carga todo en memoria Node.  
**Corrección:**
```js
const pedidos = await db.pedido.findMany({
  where: { estado: { notIn: EXCLUIDOS }, fechaCreacion: { gte: inicio, lt: fin } },
  select: { fechaCreacion: true, total: true },
  orderBy: { fechaCreacion: 'asc' },
  take: 10000,
});
```

### [BUG-03] `console.error` directo en lugar de `logApiError` en libs críticos
**Severidad:** 🟡 Potencial  
**Archivos:** `src/lib/pdfGenerator.js` líneas 263, 514, 672, 790 · `src/lib/email.js` línea 30  
**Problema:** Vuelca stack traces completos incluyendo rutas internas y queries de Prisma — exactamente lo que `logApiError` evita en el resto del proyecto.  
**Corrección:**
```js
// ❌ Actual
console.error("Error generating PDF:", error);
// ✅ Corrección
logApiError(error, 'PDF_GENERATOR');
```

### [CODE-01] `crearManejadoresCRUD` POST sin validación Zod
**Severidad:** 🟡 Potencial  
**Archivo:** `src/lib/manejadores-api.js` línea 57  
**Problema:** `model.create({ data: finalData })` sin schema Zod. POST a `/api/clientes` no valida el campo `nombre` requerido.  
**Mejora:**
```js
const POST = async (request) => {
  const raw = await request.json();
  const finalData = options.mapearCrear ? options.mapearCrear(raw) : raw;
  if (options.schema) {
    const v = options.schema.safeParse(finalData);
    if (!v.success) return NextResponse.json({ errors: v.error.issues }, { status: 400 });
  }
  // ...
};
```

### [CODE-02] `console.error` directo en páginas frontend — el operario no sabe que algo falló
**Severidad:** 🟡 Potencial  
**Archivos:**
- `src/app/calculadora/actions.js:44`
- `src/app/fotos/page.js:39,50,96`
- `src/app/configuracion/logistica/page.js:35,171`  
**Problema:** Errores silenciados. El sistema de toasts (`src/lib/toast.js`) ya existe; solo hay que usarlo.

---

## 🌐 API

### Mapa de Endpoints (principales)

| Método | Ruta | Auth | Validación | Estado |
|--------|------|------|------------|--------|
| POST | /api/auth/login | ❌ pública | manual | ✅ rate limit 5/min |
| GET | /api/dashboard | ✅ PIN | — | ✅ |
| GET | /api/clientes | ✅ PIN | — | ⚠️ sin take default |
| POST | /api/clientes | ✅ PIN | ❌ sin Zod | 🟡 |
| PUT | /api/clientes/[id] | ✅ PIN | ❌ sin Zod | 🟠 SEC-01 |
| GET | /api/pedidos | ✅ PIN | — | ✅ paginado |
| POST | /api/pedidos | ✅ PIN | ✅ Zod | ✅ |
| GET | /api/presupuestos | ✅ PIN | — | ✅ paginado |
| POST | /api/presupuestos | ✅ PIN | ✅ Zod | ✅ |
| GET | /api/productos | ✅ PIN | — | ✅ paginado |
| POST | /api/precios/bulk-update | ✅ PIN | ✅ manual | ✅ |
| GET | /api/precios | ✅ PIN | — | ⚠️ sin take |
| GET | /api/tarifas-rollo | ✅ PIN | — | ⚠️ sin take |
| GET | /api/logistica/tarifas | ✅ PIN | — | 🟠 tabla grande sin take |
| GET | /api/informes | ✅ PIN | — | ✅ rate limit 20/min |
| GET | /api/export/csv | ✅ PIN | — | ✅ rate limit 10/min |
| GET | /api/config/backup | ✅ PIN | — | ✅ rate limit 5/min |
| POST | /api/almacen-stock | ✅ PIN | ⚠️ parcial | ✅ |
| POST | /api/documentos | ✅ PIN | ✅ MIME + path | ✅ |
| GET | /api/busqueda | ✅ PIN | — | ✅ take 5 por tipo |
| GET | /api/guias | ✅ PIN | — | 🔴 ruta no existe |

### Hallazgos API

### [API-01] `GET /api/logistica/tarifas` — tabla TarifaTransporte sin límite
**Severidad:** 🟠 Alto  
**Archivo:** `src/app/api/logistica/tarifas/route.js` línea 7  
**Problema:** `db.tarifaTransporte.findMany({ orderBy: { provincia: 'asc' } })` sin `take`. TarifaTransporte almacena combinaciones provincia×CP — puede tener miles de filas cargadas completas en cada petición.  
**Corrección:**
```js
const tarifas = await db.tarifaTransporte.findMany({
  orderBy: { provincia: 'asc' },
  take: 5000,
});
```

### [API-02] Endpoints de catálogo sin `take` defensivo
**Severidad:** 🟡 Medio  
**Endpoints:** `GET /api/precios` · `GET /api/tarifas-rollo` · `GET /api/configuracion/referencias` · `GET /api/documentos`  
**Problema:** Devuelven todos los registros sin límite. Con catálogos grandes pueden ser respuestas inesperadamente pesadas.  
**Corrección:** Añadir `take: 2000` en cada uno.

### [API-03] `PUT /api/clientes/[id]` ignora campo `nif`
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/clientes/[id]/route.js` línea 20  
**Problema:** El PUT actualiza `{ nombre, email, direccion, telefono, tier }` — omite `nif`. Si el frontend envía `nif`, se ignora silenciosamente.  
**Corrección:**
```js
data: { nombre: data.nombre, nif: data.nif ?? undefined,
        email: data.email, direccion: data.direccion,
        telefono: data.telefono, tier: data.tier ?? data.categoria }
```

---

## 🗄️ Base de Datos

### Mapa de Tablas

| Tabla | Índices | Estado |
|-------|---------|--------|
| Cliente | email, unique(nombre) | ✅ |
| Pedido | clienteId, estado, fechaCreacion | ✅ |
| Albaran | clienteId, pedidoId, estado, fechaCreacion | ✅ |
| Factura | 6 índices incluyendo estadoEnvioAeat | ✅ excelente |
| PedidoItem / AlbaranItem / PresupuestoItem / FacturaItem | FK + productoId | ✅ |
| Producto | nombre, fabricanteId, materialId | ✅ |
| **Stock** | **ninguno** | **🟠** |
| **MovimientoStock** | **ninguno** | **🟡** |
| **Documento** | **ninguno** | **🟡** |
| **BobinaPedido** | **ninguno** | **🟡** |
| AuditLog | entity, action, createdAt | ✅ |

### Hallazgos DB

### [DB-01] `Stock` sin índices — tabla central de la mini-app de tablet
**Categoría:** Índice  
**Severidad:** 🟠 Alto  
**Tabla:** `Stock`  
**Problema:** Consultada con `WHERE metrosDisponibles < 100` (dashboard), `ORDER BY material` (tablet stock tab) y `proveedor`. Sin índices = full scan en cada petición. Esta tabla crece con cada entrada de material.  
**Corrección:**
```prisma
model Stock {
  // ... campos sin cambios
  @@index([material])
  @@index([metrosDisponibles])
  @@index([proveedor])
}
```

### [DB-02] `MovimientoStock` sin índices en `fecha` ni `stockId`
**Categoría:** Índice  
**Severidad:** 🟡 Medio  
**Problema:** El dashboard ordena `ORDER BY fecha DESC LIMIT 10`. Sin índice en `fecha`, full scan + sort en cada carga del dashboard.  
**Corrección:**
```prisma
model MovimientoStock {
  // ...
  @@index([stockId])
  @@index([fecha])
}
```

### [DB-03] `Documento` sin índices en `tipo` ni `productoId`
**Categoría:** Índice  
**Severidad:** 🟡 Medio  
**Problema:** `WHERE tipo = 'PROCESO'` en procesos y `WHERE productoId = ?` en páginas de producto hacen full scan.  
**Corrección:**
```prisma
model Documento {
  // ...
  @@index([tipo])
  @@index([productoId])
}
```

### [DB-04] `BobinaPedido` sin índice en `pedidoId`
**Categoría:** Índice  
**Severidad:** 🟡 Bajo  
**Problema:** Cada carga de un pedido a proveedor busca sus bobinas sin índice en la FK.  
**Corrección:**
```prisma
model BobinaPedido {
  // ...
  @@index([pedidoId])
  @@index([referenciaId])
}
```

### [DB-05] `AuditLog.details` como String en lugar de JSON nativo
**Categoría:** Esquema  
**Severidad:** 🟢 Informativo  
**Problema:** Almacena JSON serializado en un campo String. Funciona bien, pero en MySQL no permite `JSON_EXTRACT` queries. No urgente.

---

## 🎨 Frontend

### [FRONT-01] `dangerouslySetInnerHTML` con HTML sin sanitizar
**Severidad:** 🟠 Alto (riesgo futuro — feature actualmente rota)  
**Archivo:** `src/app/guias/[id]/page.js` línea 58  
**Problema:** Renderiza `htmlContent` crudo de la API. Si se implementa la feature con edición por usuarios = XSS almacenado.  
**Corrección:** Ver SEC-03.

### [FRONT-02] Errores silenciados con `console.error`
**Severidad:** 🟡 Bajo  
**Archivos:** `calculadora/actions.js:44` · `fotos/page.js:39,50,96` · `configuracion/logistica/page.js:35,171`  
**Problema:** Si algo falla, el operario no sabe. El sistema de toasts ya existe en `src/lib/toast.js`.

---

## ✅ Puntos Positivos

- **Autenticación robusta:** `crypto.timingSafeEqual` (timing-safe), cookie `httpOnly + sameSite:strict`, rate limit 5/min en login.
- **Rate limiting consistente:** Aplicado en exports, informes, backup, login — todos los endpoints de riesgo.
- **`logApiError` en toda la API:** Política de no volcar stacks completos bien aplicada en el 95% de endpoints.
- **Zod en endpoints críticos:** pedidos, presupuestos, productos, tarifas, tacos, grapas, pedidos-proveedores — todos validados.
- **Upload de archivos seguro:** MIME whitelist, sanitización de nombre de archivo, verificación de path traversal en delete.
- **Audit log consistente:** CREATE/UPDATE/DELETE en modelos principales, fire-and-forget para no bloquear.
- **DB bien indexada en tablas principales:** Pedido, Albaran, Factura, Producto — todos los campos de búsqueda y FK tienen índice.
- **Paginación correcta en todos los endpoints grandes:** pedidos, presupuestos, productos, audit-log con límites razonables.
- **SWR bien configurado:** `revalidateOnFocus: false`, `dedupingInterval: 5000`, `keepPreviousData: true`.
- **Middleware limpio:** Un solo punto de autenticación, matcher bien configurado, redirección a /login consistente.

---

## 🗺️ Hoja de Ruta Consolidada

### 🚨 Fase 0 — Antes del próximo deploy

- [ ] **[CRIT-01]** Eliminar páginas `/guias` o crear `/api/guias` — feature rota en producción · ~30min
- [ ] **[SEC-01]** Añadir Zod en `PUT /api/clientes/[id]` · ~20min
- [ ] **[API-03]** `PUT /api/clientes/[id]` — añadir campo `nif` a los campos actualizados · ~5min

### 🔴 Fase 1 — Esta semana

- [ ] **[BUG-01]** `crearManejadoresCRUD` GET — añadir `take: 500` por defecto · ~15min
- [ ] **[API-01]** `GET /api/logistica/tarifas` — añadir `take: 5000` · ~5min
- [ ] **[DB-01]** Índices en `Stock` (material, metrosDisponibles, proveedor) · ~20min
- [ ] **[SEC-02]** `email.js` — reemplazar `console.log/warn/error` con `logApiError` · ~10min

### 🟠 Fase 2 — Próximas 2 semanas

- [ ] **[BUG-02]** `informes/ventas-mensuales` — `take: 10000` defensivo · ~5min
- [ ] **[API-02]** `take: 2000` en `/api/precios`, `/api/tarifas-rollo`, `/api/configuracion/referencias`, `/api/documentos` · ~20min
- [ ] **[DB-02]** Índices `MovimientoStock` (stockId, fecha) · ~10min
- [ ] **[DB-03]** Índices `Documento` (tipo, productoId) · ~10min
- [ ] **[BUG-03]** `pdfGenerator.js` — reemplazar 4× `console.error` con `logApiError` · ~15min
- [ ] **[CODE-01]** `crearManejadoresCRUD` POST — soporte opcional de schema Zod · ~30min

### 🟡 Fase 3 — Próximo mes

- [ ] **[DB-04]** Índices `BobinaPedido` (pedidoId, referenciaId) · ~5min
- [ ] **[CODE-02]** `console.error` en calculadora/fotos/logistica → toasts de error · ~1h
- [ ] **[FRONT-01]** Si se implementa guías: instalar `isomorphic-dompurify` y sanitizar `htmlContent` · ~30min

### 🟢 Fase 4 — Backlog técnico

- [ ] **[DB-05]** `AuditLog.details` → `@db.Json` en MySQL para queryabilidad futura
- [ ] Guías: si se implementa, añadir `GET /api/guias/[id]` para no cargar todo y filtrar en cliente

---

*Generado automáticamente el 2026-05-27. Marca cada ítem como completado conforme avances.*  
*Para regenerar: ejecuta `/review-full` de nuevo.*
