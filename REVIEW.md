# REVIEW — Control de Almacén (CRM)

> Generado el 2026-07-16 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 App Router · Prisma 6 (SQLite dev / MySQL prod) · DaisyUI 5 + Tailwind CSS 4 · SWR v2 · Zod 4 · jsPDF · Resend · React 19  
**Archivos analizados:** ~60 rutas API + middleware + componentes clave  
**Total de hallazgos:** 8 (1 crítico, 2 altos, 3 medios, 2 bajos)

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| 🔒 Seguridad | 5/10 | 1 | 0 | 1 | 0 |
| 🐛 Bugs | 7/10 | 0 | 2 | 1 | 1 |
| ⚙️ Backend | 8/10 | 0 | 0 | 1 | 1 |
| 🌐 API | 6/10 | 0 | 0 | 1 | 0 |
| 🎨 Frontend | 9/10 | 0 | 0 | 0 | 0 |

---

## 🚨 Hallazgos Críticos — Acción Inmediata

### [CRÍTICO-01] Sistema de autenticación completamente inoperativo

**Área:** Seguridad  
**Archivo:** `middleware.js` línea 15–24  
**Problema:** El middleware nunca verifica la cookie `crm-auth`. Solo redirige móviles a `/tablet` y añade headers de seguridad. Si `AUTH_PIN` está configurado en `.env`, el usuario puede hacer login y recibir la cookie, pero esa cookie nunca se comprueba en ninguna ruta — cualquiera puede acceder a `/gestion`, `/pedidos`, `/configuracion`, etc. sin autenticarse.  
**Impacto:** Toda la aplicación es pública en red local independientemente de si `AUTH_PIN` está definido. Cualquier persona con acceso a la red puede ver clientes, pedidos, presupuestos, precios y datos de stock.

```js
// ❌ Código actual — no hay verificación de auth
export function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname === '/' && MOBILE_UA.test(request.headers.get('user-agent') ?? '')) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }
  return addSecurityHeaders(NextResponse.next()); // ← nunca comprueba cookie
}

// ✅ Corrección
export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (pathname === '/' && MOBILE_UA.test(request.headers.get('user-agent') ?? '')) {
    return NextResponse.redirect(new URL('/tablet', request.url));
  }

  // Solo bloquear si AUTH_PIN está configurado
  if (process.env.AUTH_PIN) {
    const authCookie = request.cookies.get('crm-auth');
    const isPublicRoute =
      pathname.startsWith('/login') ||
      pathname.startsWith('/api/auth/') ||
      pathname.startsWith('/api/cron/');

    if (!isPublicRoute && authCookie?.value !== process.env.AUTH_PIN) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return addSecurityHeaders(NextResponse.next());
}
```

> **Nota:** La cookie actualmente guarda el PIN en texto plano. Para producción, debería guardarse un hash o token de sesión — pero para uso en red local cerrada es aceptable como solución inmediata.

---

## 🔒 Seguridad

### [SEC-01] Ver CRÍTICO-01 — Middleware no verifica auth

### [SEC-02] Endpoint cron completamente abierto si `CRON_SECRET` no está definido
**Severidad:** 🟡 Medio  
**Archivo:** `src/app/api/cron/refresh-positions/route.js` línea 11  
**Problema:** La guarda `if (process.env.CRON_SECRET && secret !== ...)` solo protege el endpoint cuando la variable de entorno existe. Si no está definida (configuración por defecto), el endpoint ejecuta el proceso de tracking para todos los contenedores activos sin ninguna autenticación.

```js
// ❌ Código actual
if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}

// ✅ Corrección — bloquear si no hay secreto configurado
if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
}
```

---

## 🐛 Bugs

### [BUG-01] `detallesTecnicos` no se copia al convertir presupuesto a pedido
**Severidad:** 🔴 Confirmado  
**Archivo:** `src/app/api/pedidos/from-presupuesto/route.js` líneas 62–69  
**Problema:** Al crear un pedido desde un presupuesto, los items se copian sin el campo `detallesTecnicos`. Este campo almacena las especificaciones técnicas de bandas PVC (dimensiones, tipo de confección, tacos, etc.) que luego se usan para generar la nota de trabajo del taller.  
**Cómo se dispara:** Siempre que se convierte un presupuesto a pedido. La nota de trabajo (`/pedidos/[id]/nota-trabajo`) mostrará los items sin datos técnicos.

```js
// ❌ Código actual
items: {
  create: quote.items.map(item => ({
    descripcion: item.descripcion,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    pesoUnitario: item.pesoUnitario,
    productoId: item.productoId,
    // detallesTecnicos: MISSING
  })),
},

// ✅ Corrección
items: {
  create: quote.items.map(item => ({
    descripcion: item.descripcion,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    pesoUnitario: item.pesoUnitario,
    productoId: item.productoId,
    detallesTecnicos: item.detallesTecnicos ?? null,
  })),
},
```

### [BUG-02] Stock creado con 0 metros si `bobina.largo` es null
**Severidad:** 🟠 Probable  
**Archivo:** `src/app/api/stock-management/receive-order/route.js` línea 33  
**Problema:** `parseFloat(null) || 0` produce `0` cuando `bobina.largo` no tiene valor. Se crea una entrada de stock con `metrosDisponibles: 0`, contaminando el inventario sin que el usuario reciba ningún aviso de error.  
**Cómo se dispara:** Si una bobina en el pedido de proveedor no tiene `largo` registrado y el usuario pulsa "Recibir pedido".

```js
// ❌ Código actual
const metrosPorBobina = parseFloat(bobina.largo) || 0;

// ✅ Corrección — detectar y avisar en lugar de silenciar
const metrosPorBobina = parseFloat(bobina.largo);
if (isNaN(metrosPorBobina) || metrosPorBobina <= 0) {
  throw new Error(`Bobina sin largo válido (ref: ${bobina.referencia?.codigo ?? bobina.id}). Completa los datos antes de recibir.`);
}
```

### [BUG-03] `filtrados` no reacciona al estado `soloSinClasificar`
**Severidad:** 🟡 Potencial  
**Archivo:** `src/app/gestion/productos/page.js` línea 134–150  
**Problema:** El array de dependencias del `useMemo` que calcula `filtrados` no incluye `soloSinClasificar`. En React con compilador (React 19 + Next.js 16) esto se autocorrige en la mayoría de los casos, pero en modo estricto sin compilador el filtro "Sin clasificar" puede quedar desactualizado si React decide no recalcular el memo.

```js
// ❌ Código actual
}, [productos, busqueda, filtroFamilia, sort]); // soloSinClasificar falta

// ✅ Corrección
}, [productos, busqueda, filtroFamilia, soloSinClasificar, sort]);
```

---

## ⚙️ Backend

### [BACK-01] `getNextNumber` documentado como llamada fuera de transacción, pero sin validación de retorno
**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/pedidos/from-presupuesto/route.js` línea 18  
**Problema:** El número de pedido se obtiene antes de la transacción (correcto para evitar deadlocks), pero si la transacción falla, el número se consume igualmente, creando huecos en la secuencia (`PED-007-2026` existe pero `PED-006-2026` saltado). No es un bug funcional, pero en contextos de facturación (VeriFactu) los huecos pueden generar preguntas.  
**Evaluación:** Aceptable para el nivel actual del proyecto. A monitorizar si el sistema VeriFactu requiere numeración continua sin huecos.

### [BACK-02] `console.log` de debug en producción
**Severidad:** 🟢 Bajo  
**Buscar con:** `grep -r "console\.log" src/app/api --include="*.js"`  
**Problema:** Varios archivos de API tienen `console.log` directos en lugar de usar `logApiError`. Esto expone información de debug en los logs del servidor de producción.  
**Corrección:** Reemplazar por `logApiError(error, 'contexto')` o eliminar si no aportan valor.

---

## 🌐 API

### Mapa de endpoints principales

| Método | Ruta | Auth | Validación | Estado |
|--------|------|------|------------|--------|
| POST | /api/auth/login | ❌ público | ✅ | ✅ OK |
| GET | /api/productos | ❌ sin auth | ✅ | ✅ OK |
| POST | /api/productos | ❌ sin auth | ✅ Zod | ✅ OK |
| GET/PUT/DELETE | /api/productos/[id] | ❌ sin auth | ✅ | ✅ OK |
| GET/POST | /api/pedidos | ❌ sin auth | ✅ Zod | ✅ OK |
| PUT/DELETE | /api/pedidos/[id] | ❌ sin auth | ✅ | ✅ OK |
| POST | /api/pedidos/from-presupuesto | ❌ sin auth | ⚠️ mínima | ⚠️ BUG-01 |
| GET/POST | /api/presupuestos | ❌ sin auth | ✅ Zod | ✅ OK |
| GET | /api/config/backup | ❌ sin auth | — | ⚠️ Revisar |
| GET | /api/export/csv | ❌ sin auth | — | ⚠️ Revisar |
| GET | /api/informes | ❌ sin auth | ✅ rate limit | ✅ OK |
| POST | /api/notificaciones | ❌ sin auth | ⚠️ sin max len | 🟡 Medio |
| POST | /api/cron/refresh-positions | ⚠️ condicional | — | ⚠️ SEC-02 |
| POST | /api/stock-management/receive-order | ❌ sin auth | ⚠️ mínima | ⚠️ BUG-02 |
| GET | /api/busqueda | ❌ sin auth | ✅ rate limit | ✅ OK |

> **Nota global:** Todos los endpoints aparecen como "sin auth" porque el middleware no verifica la cookie (CRÍTICO-01). Si se corrige el middleware, la columna Auth pasaría a ✅ para todos.

### [API-01] GET `/api/productos` sin paginación no devuelve subfamilia/familia
**Severidad:** 🟡 Medio  
**Endpoint:** `GET /api/productos` (sin `?page=`)  
**Problema:** La ruta legada (línea 80–88) hace `include: { fabricante: true, material: true }` pero omite `subfamilia: { include: { familia: true } }`. Si algún componente usa la versión sin paginar, `p.subfamilia` llega como `undefined` y los filtros/ordenación por subfamilia fallan silenciosamente.  
**Corrección:** Añadir `subfamilia: { include: { familia: true } }` al `include` del path legado, o eliminar ese path si todos los consumidores usan `?page=1&limit=500`.

```js
// ✅ En src/app/api/productos/route.js línea 80
const productos = await db.producto.findMany({
  where: whereClause,
  take: 500,
  orderBy: { nombre: 'asc' },
  include: {
    fabricante: true,
    material: true,
    subfamilia: { include: { familia: true } }, // ← añadir
  },
});
```

### [API-02] POST `/api/notificaciones` sin límite de longitud en titulo/mensaje
**Severidad:** 🟢 Bajo  
**Archivo:** `src/app/api/notificaciones/route.js` línea 31  
**Problema:** Solo se valida que `titulo` y `mensaje` no sean vacíos. Un payload con strings de varios MB pasa la validación y se persiste en DB.  
**Corrección:**
```js
if (!titulo || titulo.length > 200 || !mensaje || mensaje.length > 1000) {
  return NextResponse.json({ message: 'titulo (max 200) y mensaje (max 1000) requeridos' }, { status: 400 });
}
```

---

## 🎨 Frontend

El frontend está bien construido. Los componentes usan SWR con estados de carga y error, los formularios tienen validación, y los modales de confirmación protegen acciones destructivas. No se encontraron issues significativos de UX, XSS ni accesibilidad.

**Puntos positivos del frontend:**
- Estados de carga y error presentes en todas las tablas con `ContenedorCargando`
- Confirmación con modal para eliminar (useConfirmacion hook)
- No hay `innerHTML` con datos de usuario
- Datos sensibles (costoUnitario) excluidos de respuestas API

---

## ✅ Puntos Positivos

- **Logging seguro**: uso consistente de `logApiError` que filtra stack traces y query internals
- **Audit trail**: `logCreate/logUpdate/logDelete` en operaciones sensibles
- **Prisma como ORM**: todas las queries usan Prisma → no hay SQL injection posible
- **Zod en todos los POST/PUT**: validación de entrada en rutas de escritura
- **costoUnitario excluido**: el precio de coste nunca sale en las respuestas de listado
- **Race conditions evitadas**: uso de `updateMany` atómico en `from-presupuesto` y `receive-order` para evitar doble ejecución
- **getNextNumber fuera de transacción**: patrón correcto para evitar deadlocks en MySQL
- **Sin concatenación de strings en queries**: ORM usado correctamente en todos los archivos revisados
- **Headers de seguridad**: X-Frame-Options, X-Content-Type-Options, HSTS (solo producción)

---

## 🗺️ Plan de Acción Priorizado

| # | Hallazgo | Área | Severidad | Esfuerzo estimado |
|---|----------|------|-----------|-------------------|
| 1 | [CRÍTICO-01] Middleware no verifica auth | Seguridad | 🔴 | ~30 min |
| 2 | [BUG-01] `detallesTecnicos` perdido al convertir presupuesto→pedido | Backend | 🟠 | ~5 min |
| 3 | [BUG-02] Stock con 0 metros si `bobina.largo` es null | Backend | 🟠 | ~10 min |
| 4 | [SEC-02] Cron abierto sin `CRON_SECRET` | Seguridad | 🟡 | ~5 min |
| 5 | [API-01] GET productos sin paginación omite subfamilia | API | 🟡 | ~5 min |
| 6 | [BUG-03] `soloSinClasificar` falta en deps de `useMemo` | Frontend | 🟡 | ~2 min |
| 7 | [API-02] Sin límite de longitud en notificaciones | API | 🟢 | ~5 min |
| 8 | [BACK-02] Console.logs en API | Backend | 🟢 | ~15 min |

---

*Generado el 2026-07-16. Actualiza este archivo marcando los hallazgos como ✅ corregidos conforme se vayan resolviendo.*
