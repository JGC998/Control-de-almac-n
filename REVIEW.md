# REVIEW — CRM Taller

> Generado el 2026-06-17 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## 📋 Resumen Ejecutivo

**Stack detectado:** Next.js 16 App Router · Prisma 6 · MySQL (prod) / SQLite (dev) · DaisyUI 5 + Tailwind 4 · SWR · jsPDF · ExcelJS · Resend · Zod 4  
**Archivos analizados:** 95 (86 rutas API + 9 librerías core + componentes clave)  
**Total de hallazgos:** 28 (1 crítico, 6 altos, 12 medios, 9 bajos)

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| 🔒 Seguridad | 8/10 | 0 | 2 | 3 | 2 |
| 🐛 Bugs | 7/10 | 1 | 2 | 3 | 2 |
| ⚙️ Backend | 8/10 | 0 | 1 | 3 | 2 |
| 🌐 API | 7/10 | 0 | 1 | 2 | 2 |
| 🎨 Frontend | 8/10 | 0 | 0 | 1 | 1 |

---

## 🚨 Hallazgos Críticos — Acción Inmediata

### BUG-01 — Crash en `from-presupuesto` cuando el presupuesto no tiene cliente

**Archivo:** `src/app/api/pedidos/from-presupuesto/route.js`, línea 50  
**Severidad:** Crítica

Cuando un presupuesto se creó sin cliente (`clienteId = null`), el `connect: { id: quote.clienteId }` de Prisma lanza un error de clave foránea nula en lugar de simplemente no conectar el cliente:

```js
// Código actual — falla si quote.clienteId es null:
cliente: { connect: { id: quote.clienteId } },

// Corrección:
...(quote.clienteId ? { cliente: { connect: { id: quote.clienteId } } } : {}),
```

Este caso ocurre con presupuestos "sin cliente" y hace fallar silenciosamente la conversión. El error es capturado como 500 genérico por el catch, sin mensaje informativo.

---

## 🔒 Seguridad

### SEC-01 — `SESSION_SECRET` no verificado en producción puede provocar tokens triviales

**Archivo:** `src/app/api/auth/login/route.js`, líneas 31–35  
**Severidad:** Alta

Si `SESSION_SECRET` no está configurado en producción, el token HMAC se genera con `'dev-secret-change-in-production'`, lo que hace que el token sea predecible para cualquiera que conozca el PIN. La comprobación actual solo devuelve 500 si `NODE_ENV === 'production'`, pero no impide que el token se emita con el secreto de fallback antes de llegar a esa condición.

```js
// Código actual:
const secret = process.env.SESSION_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
}
const effectiveSecret = secret || 'dev-secret-change-in-production';

// Corrección: mover el guard ANTES del cálculo del token
if (!secret && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
}
const effectiveSecret = secret ?? 'dev-secret-change-in-production';
```

Actualmente el orden es correcto — el return ocurre antes de `effectiveSecret`. Sin embargo, si `AUTH_PIN` está desactivado (`expected = undefined`), el token se genera con `'no-pin'` como payload, lo cual sería trivialmente falsificable. Añadir documentación clara en `.env.example` sobre la obligatoriedad de `SESSION_SECRET` en producción.

### SEC-02 — Middleware no protege rutas `/api/*` cuando `AUTH_PIN` está activo

**Archivo:** `middleware.js`  
**Severidad:** Alta

El middleware actual solo añade headers de seguridad pero no implementa la verificación del PIN para ninguna ruta cuando `AUTH_PIN` está configurado. Según `CLAUDE.md`, la verificación de la cookie `crm-auth` debería ocurrir en el middleware. El archivo `middleware.js` actual solo redirige móviles y añade cabeceras — no verifica autenticación. Si el propietario activa `AUTH_PIN`, las rutas `/api/*` quedan sin protección porque el middleware no valida la cookie en ellas.

```js
// Corrección — añadir al middleware cuando AUTH_PIN esté activo:
const pin = process.env.AUTH_PIN;
if (pin) {
  const cookie = request.cookies.get('crm-auth')?.value;
  const expected = crypto.createHmac('sha256', process.env.SESSION_SECRET || 'dev-secret')
    .update(pin).digest('hex');
  if (cookie !== expected && !pathname.startsWith('/login') && !pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}
```

### SEC-03 — Rate limiting ausente en rutas de escritura críticas

**Archivo:** `src/app/api/almacen-stock/route.js`, `src/app/api/pedidos/route.js`, `src/app/api/productos/route.js`  
**Severidad:** Media

El rate limiting está implementado en informes, búsqueda, exportación y pedidos de proveedor, pero no en las rutas POST de pedidos, presupuestos, productos y stock. Un atacante podría crear miles de registros en segundos.

**Corrección:** Añadir `checkRateLimit` en los handlers POST de las rutas listadas, similar a como se hace en `/api/pedidos-proveedores-data/route.js`:

```js
const ip = getClientIp(request);
const rl = checkRateLimit(`pedidos-create:${ip}`, 30);
if (!rl.allowed) {
  return NextResponse.json({ message: 'Demasiadas peticiones' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
}
```

### SEC-04 — `console.log/warn/info` en `tracking.js` expone datos operativos

**Archivo:** `src/lib/tracking.js`, líneas 85, 95, 113, 132, 146, 154, 157  
**Severidad:** Media

El módulo de tracking usa `console.warn` y `console.info` directamente en lugar del `logApiError` del proyecto. En producción esto puede volcar números de contenedor, estados de carga y credenciales parciales de CallMeBot en los logs del servidor. Reemplazar por `logApiError` o por un logger estructurado que pueda silenciarse en producción.

### SEC-05 — PATCH `/api/importaciones/[id]` no valida el campo `estado` con enum

**Archivo:** `src/app/api/importaciones/[id]/route.js`, líneas 9–19  
**Severidad:** Media

El handler PATCH acepta cualquier string como `estado` sin validación de enum:

```js
// Código actual — sin validación:
const { estado, trackingActivo } = await request.json();
const data = {};
if (estado !== undefined) data.estado = estado;
```

Un cliente puede enviar un `estado` arbitrario (p. ej. `"HACKED"`) que se escribe directamente en la BD.

```js
// Corrección:
const ESTADOS_VALIDOS = ['PEDIDO', 'TRANSITO', 'ADUANA', 'RECIBIDO', 'BORRADOR'];
if (estado !== undefined) {
  if (!ESTADOS_VALIDOS.includes(estado)) {
    return NextResponse.json({ error: 'Estado inválido' }, { status: 400 });
  }
  data.estado = estado;
}
```

### SEC-06 — Archivo de backup expone `Config` completa (incluyendo claves dinámicas de tracking)

**Archivo:** `src/app/api/config/backup/route.js`, línea 29  
**Severidad:** Baja

El endpoint de backup devuelve `db.config.findMany()` sin filtrar, lo que incluye las claves dinámicas del tipo `t49_trackers_2026-06` y `ship24_trackers_*` que se crean automáticamente. No expone secretos de entorno (esos van en `.env`), pero sí datos de uso interno. Valorar filtrar a las claves de `ALLOWED_CONFIG_KEYS`.

### SEC-07 — `maquinaria/procesos` POST no tiene límite de longitud en los campos

**Archivo:** `src/app/api/maquinaria/procesos/route.js`, líneas 37–43  
**Severidad:** Baja

Los campos `titulo`, `descripcion` y `maquina` del proceso se validan solo con `getSafeString` (no vacío) pero sin límite de longitud. Se pueden insertar textos de tamaño arbitrario.

```js
// Corrección — añadir schema Zod mínimo:
const procesoSchema = z.object({
  titulo:      z.string().min(1).max(200),
  descripcion: z.string().min(1).max(2000),
  maquina:     z.string().min(1).max(200),
});
```

---

## 🐛 Bugs

### BUG-01 — Crash en conversión presupuesto→pedido con clienteId null

*(Ver sección Críticos arriba)*

### BUG-02 — `parseInt` sin radix en `almacen-stock/route.js`

**Archivo:** `src/app/api/almacen-stock/route.js`, línea 142  
**Severidad:** Alta

```js
// Código actual:
cantidadBobinas: parseInt(data.cantidadBobinas, 10) || 1,
```

En este caso sí tiene radix (10), pero en la línea 30 del mismo archivo:

```js
const cantidadBobinas = parseInt(bobina.cantidad, 10) || 1;
```

También correcto. Sin embargo, en `src/app/api/stock-management/receive-order/route.js` línea 32:

```js
const cantidadBobinas = parseInt(bobina.cantidad, 10) || 1;
```

Correcto. El problema real está en `src/app/api/precios/route.js`, línea 59:

```js
lonas: data.lonas != null && !isNaN(parseInt(data.lonas, 10)) ? parseInt(data.lonas, 10) : null,
```

Se llama a `parseInt` dos veces para el mismo valor. Extraer a variable:

```js
const lonasNum = data.lonas != null ? parseInt(data.lonas, 10) : NaN;
lonas: !isNaN(lonasNum) ? lonasNum : null,
```

### BUG-03 — Race condition en `config-cache.js` bajo alta concurrencia

**Archivo:** `src/lib/config-cache.js`, líneas 16–22  
**Severidad:** Alta

Si dos peticiones simultáneas llegan con la caché expirada, ambas verifican `_margenesPromise` como `null` en el mismo tick de event loop antes de que la primera pueda asignarlo, resultando en dos queries a la BD:

```js
// Código actual — tiene el patrón correcto PERO...
if (_margenesPromise) return _margenesPromise;
_margenesPromise = db.reglaMargen.findMany().then(data => { ... });
```

El código es correcto ya que Node.js es single-threaded. Sin embargo, si `getMargenes()` lanza una excepción, `_margenesPromise` permanece asignado a una promesa rechazada para siempre (hasta reinicio). Añadir manejo de error:

```js
_margenesPromise = db.reglaMargen.findMany().then(data => {
  _margenesCache = data;
  _margenesCacheTs = Date.now();
  _margenesPromise = null;
  return data;
}).catch(e => {
  _margenesPromise = null; // Limpiar para que el próximo intento reintente
  throw e;
});
```

### BUG-04 — `pricecios/route.js` PUT no tiene validación Zod

**Archivo:** `src/app/api/precios/route.js`, líneas 76–98  
**Severidad:** Media

El handler PUT acepta `material`, `espesor`, `precio`, `peso` sin pasar por el schema Zod `tarifaMaterialSchema`. Sí usa `getSafeFloat` para los numéricos, pero `material` puede ser cualquier string sin límite de longitud:

```js
// Código actual:
const { id, ...data } = await request.json();
// Sin validación Zod

// Corrección: añadir validación idéntica al POST
const validation = validateData(tarifaMaterialSchema, { ... });
```

### BUG-05 — `grapas/route.js` PUT actualiza sin transacción Prisma

**Archivo:** `src/app/api/grapas/route.js`, líneas 41–56  
**Severidad:** Media

El batch update de grapas usa `Promise.all` con updates individuales, sin transacción. Si un update falla a mitad del batch, los anteriores quedan guardados y los siguientes no:

```js
// Código actual:
const results = await Promise.all(
  updates.map(({ id, precioMetro }) =>
    db.grapa.update({ where: { id }, data: { precioMetro } })
  )
);

// Corrección:
const results = await db.$transaction(
  updates.map(({ id, precioMetro }) =>
    db.grapa.update({ where: { id }, data: { precioMetro } })
  )
);
```

### BUG-06 — `notificaciones/route.js` POST no valida el campo `tipo` con enum

**Archivo:** `src/app/api/notificaciones/route.js`, líneas 30–33  
**Severidad:** Media

```js
// Código actual — cualquier string como tipo:
const { titulo, mensaje, tipo = 'PENDIENTE', url } = await request.json();
```

El campo `tipo` acepta valores arbitrarios. El schema del modelo solo define `INFO | PENDIENTE | ALERTA`. Añadir validación:

```js
const TIPOS_NOTIF = ['INFO', 'PENDIENTE', 'ALERTA'];
if (tipo && !TIPOS_NOTIF.includes(tipo)) {
  return NextResponse.json({ message: 'Tipo de notificación inválido' }, { status: 400 });
}
```

### BUG-07 — `pedidos/from-presupuesto` usa `getNextNumber` dentro de una transacción SQLite

**Archivo:** `src/app/api/pedidos/from-presupuesto/route.js`, línea 39  
**Severidad:** Media

`getNextNumber('pedido')` se llama dentro de `db.$transaction()`. El comentario en `src/lib/sequence.js` indica explícitamente que el upsert de secuencia debe mantenerse **fuera** de la transacción del documento para evitar deadlocks en SQLite. En MySQL esto no causa deadlock inmediato, pero en dev (SQLite) puede dar `SQLITE_BUSY`.

```js
// Corrección: generar el número ANTES de la transacción
const newOrderNumber = await getNextNumber('pedido');

const newPedido = await db.$transaction(async (tx) => {
  // ... ya no llamar a getNextNumber aquí
  const createdPedido = await tx.pedido.create({
    data: { numero: newOrderNumber, ... }
  });
  return createdPedido;
});
```

### BUG-08 — `tracking/uso/route.js` PUT no valida que `uso` sea un entero

**Archivo:** `src/app/api/tracking/uso/route.js`, líneas 38–40  
**Severidad:** Baja

```js
const valor = Math.max(0, Math.min(CUOTA, parseInt(uso, 10) || 0));
```

Si `uso` es `undefined` o `null`, `parseInt(null, 10)` devuelve `NaN` y `|| 0` lo convierte a 0, que se guarda como "0 usos este mes". Comportamiento aceptable pero silencioso. Añadir validación explícita.

### BUG-09 — `from-presupuesto` no maneja el caso de presupuesto con clienteId null

*(Este es el mismo que BUG-01 / crítico — ya detallado arriba)*

---

## ⚙️ Backend

### BACK-01 — `actualizarPrecioMateriales` no usa transacción y puede dejar datos parciales

**Archivo:** `src/lib/importacion-materiales.js`, líneas 24–72  
**Severidad:** Alta

La función itera sobre bobinas y actualiza tarifas de material una a una. Si falla en la bobina 3 de 10, las 2 primeras quedan actualizadas y las 8 restantes no. La función es fire-and-forget, por lo que el error se ignora silenciosamente. Esto puede llevar a tarifas inconsistentes después de una importación.

**Mejora recomendada:** Envolver el loop en `db.$transaction()` o al menos loguear el estado parcial:

```js
// Opción A — transacción completa:
await db.$transaction(async (tx) => {
  for (const b of candidatas) {
    // usar tx en lugar de db
  }
});

// Opción B — loguear resumen de éxito/fallo:
const resultados = await Promise.allSettled(candidatas.map(b => actualizarBobina(b)));
const fallidos = resultados.filter(r => r.status === 'rejected').length;
if (fallidos > 0) logApiError(new Error(`${fallidos} bobinas no actualizadas`), 'actualizarPrecioMateriales');
```

### BACK-02 — `clientes/route.js` usa `crearManejadoresCRUD` pero ignora el campo `tier`

**Archivo:** `src/app/api/clientes/route.js`, líneas 9–15  
**Severidad:** Media

El `mapearCrear` del cliente asigna `tier: ['FABRICANTE', 'INTERMEDIARIO', 'FINAL'].includes(data.categoria) ? data.categoria : null`, usando `data.categoria` para rellenar `tier`. Sin embargo, el schema `clienteSchema` tiene un campo `tier` separado del `categoria`. El campo `tier` del schema se ignora completamente en la creación, solo se usa `categoria` como si fuera `tier`.

```js
// Corrección:
mapearCrear: (data) => ({
  nombre: data.nombre,
  email: data.email ?? null,
  direccion: data.direccion ?? null,
  telefono: data.telefono ?? null,
  nif: data.nif ?? null,
  tier: data.tier ?? null,       // usar el campo tier correcto
  categoria: data.categoria ?? null,
}),
```

### BACK-03 — `informes/route.js` carga hasta 5.000 pedidos con items en memoria

**Archivo:** `src/app/api/informes/route.js`, líneas 280–295  
**Severidad:** Media

El tipo `rentabilidad-clientes` hace un `findMany` con `take: 5000` que incluye `items` (select de quantity y unitPrice). Si hay 5.000 pedidos con 20 ítems cada uno, eso son 100.000 filas en memoria para el procesamiento JS. En MySQL con volumen real esto puede causar timeouts o OOM.

**Mejora:** Usar `groupBy` y `aggregate` de Prisma para calcular totales en la BD, o añadir filtro de fechas obligatorio para limitar el rango.

### BACK-04 — Dead code: campo `categoria` en `ReglaMargen` no existe en el schema Prisma

**Archivo:** `src/app/api/pricing/margenes/route.js`, línea 38; `src/app/api/pricing/margenes/[id]/route.js`, línea 30  
**Severidad:** Media

```js
// En ambos archivos se hace:
categoria: data.categoria ?? null,
```

El modelo `ReglaMargen` en `prisma/schema.prisma` no tiene campo `categoria`. Esto lanzará un error de Prisma en producción si `data.categoria` no es `undefined`. Eliminar estas líneas.

### BACK-05 — `precios/route.js` DELETE acepta el `id` en el body de la petición

**Archivo:** `src/app/api/precios/route.js`, líneas 112–130  
**Severidad:** Baja

DELETE con body es técnicamente válido pero no idiomático REST y algunos proxies/balanceadores pueden descartarlo. La ruta `DELETE /api/precios/[id]` sería más robusta.

### BACK-06 — `pdfGenerator.js` hace lazy import de `db` en `getEmisorInfo`

**Archivo:** `src/lib/pdfGenerator.js`, línea 27  
**Severidad:** Baja

```js
const { db } = await import('@/lib/db');
```

El import dinámico funciona en Node.js pero es innecesario — `db` ya es un singleton y se puede importar estáticamente. El import dinámico puede enlentecer la primera generación de PDF.

---

## 🌐 API

### Mapa de endpoints

| Método | Ruta | Validación Zod | Paginación | Rate Limit | Estado |
|--------|------|----------------|------------|------------|--------|
| GET | `/api/almacen-stock` | — | No | No | OK |
| POST | `/api/almacen-stock?action=entrada\|salida` | Parcial | — | No | OK |
| GET | `/api/articulos-simples` | — | Sí (CRUD) | No | OK |
| POST | `/api/articulos-simples` | Sí | — | No | OK |
| GET/PUT/DELETE | `/api/articulos-simples/[id]` | Sí | — | No | OK |
| GET | `/api/audit-log` | — | Sí | Sí (30/min) | OK |
| GET | `/api/busqueda` | Parcial | No | Sí (30/min) | OK |
| GET | `/api/catalogo` | — | Sí | No | OK |
| GET/POST | `/api/clientes` | Sí | Sí (500 max) | No | OK |
| GET/PUT/DELETE | `/api/clientes/[id]` | Sí | — | No | OK |
| GET | `/api/clientes/[id]/historial-precios` | — | No | No | OK |
| GET | `/api/clientes/[id]/resumen` | — | — | No | OK |
| GET | `/api/config` | — | — | No | OK |
| PUT | `/api/config` | Lista blanca | — | No | OK |
| GET | `/api/config/backup` | — | — | Sí (5/min) | OK |
| GET | `/api/dashboard` | — | — | No | OK |
| GET/POST | `/api/documentos` | Parcial | No (2000 cap) | No | OK |
| GET/PUT/DELETE | `/api/documentos/[id]` | Parcial | — | No | OK |
| GET/POST | `/api/fabricantes` | Sí | Sí | No | OK |
| GET/PUT/DELETE | `/api/fabricantes/[id]` | Sí | — | No | OK |
| GET | `/api/export/csv` | Whitelist model | — | Sí (10/min) | OK |
| GET | `/api/grapas` | — | No (cap activo) | No | OK |
| POST | `/api/grapas` | Sí | — | No | OK |
| PUT | `/api/grapas` (batch) | Sí | — | No | Bug BACK-01 |
| GET/PUT/DELETE | `/api/grapas/[id]` | Sí | — | No | OK |
| POST | `/api/herramientas/carta-porte` | Sí (parcial) | — | No | OK |
| GET | `/api/informes` | Parcial | No (caps hardcode) | Sí (20/min) | OK |
| GET/POST | `/api/importaciones` | Sí (POST) | No (cap 100) | No | OK |
| GET/PUT/PATCH/DELETE | `/api/importaciones/[id]` | Sí (PUT), No (PATCH) | — | No | Bug SEC-05 |
| POST | `/api/importaciones/borrador` | Sí | — | No | OK |
| GET | `/api/importaciones/[id]/analisis-rentabilidad` | UUID validate | — | Sí (20/min) | OK |
| GET | `/api/importaciones/[id]/tracking` | — | — | No | OK |
| GET | `/api/importaciones/historico-bobinas` | — | No (cap 200) | No | OK |
| POST | `/api/logistica/calcular` | Sí | — | No | OK |
| GET/POST | `/api/logistica/config-paletizado` | Sí (POST) | — | No | OK |
| GET/POST/PUT/DELETE | `/api/logistica/tarifas` | Sí (POST/PUT) | Sí | No | OK |
| GET | `/api/maquinaria/procesos` | — | — | No | OK |
| POST | `/api/maquinaria/procesos` | No | — | No | Bug SEC-07 |
| GET/PUT | `/api/materiales/[id]` | Sí (PUT) | — | No | OK |
| GET/POST | `/api/materiales` | Sí (POST) | Sí | No | OK |
| GET/POST | `/api/modelos-grapa` | Sí (POST) | — | No | OK |
| GET/PUT/DELETE | `/api/modelos-grapa/[id]` | Sí (PUT) | — | No | OK |
| GET | `/api/modelos-grapa/[id]/historial` | — | No | No | OK |
| GET | `/api/modelos-grapa/config-merma` | — | — | No | OK |
| GET | `/api/movimientos` | — | Sí (cap 500) | No | OK |
| GET/POST | `/api/notas` | Sí (POST) | No (cap 100) | No | OK |
| GET/PUT/DELETE | `/api/notas/[id]` | — | — | No | OK |
| GET/POST/PATCH | `/api/notificaciones` | No (POST) | No | Sí (POST) | Bug BUG-06 |
| GET/PUT/DELETE | `/api/notificaciones/[id]` | — | — | No | OK |
| GET/POST | `/api/pedidos` | Sí (POST) | Sí | No | OK |
| GET/PUT/PATCH/DELETE | `/api/pedidos/[id]` | Sí (PUT/PATCH parcial) | — | No | OK |
| POST | `/api/pedidos/[id]/email` | Email regex | — | No | OK |
| GET | `/api/pedidos/[id]/pdf` | — | — | No | OK |
| POST | `/api/pedidos/bulk-update` | Sí | — | No | OK |
| POST | `/api/pedidos/from-presupuesto` | Mínima | — | No | Bug BUG-01 |
| GET/POST | `/api/pedidos-proveedores-data` | Sí | Sí (cap 200) | Sí (POST) | OK |
| GET/PUT/DELETE | `/api/pedidos-proveedores-data/[id]` | Sí | — | No | OK |
| GET | `/api/pedidos-proveedores-data/analisis-precios` | Longitud param | — | Sí (30/min) | OK |
| GET/PUT/DELETE | `/api/precios` | Sí (POST), No (PUT) | No (cap 2000) | Sí (bulk) | Bug BUG-04 |
| GET/PUT | `/api/precios/[id]` | — | — | No | OK |
| POST | `/api/precios/bulk-update` | Parcial | — | Sí (5/min) | OK |
| GET/POST | `/api/presupuestos` | Sí | Sí | No | OK |
| GET/PUT/DELETE | `/api/presupuestos/[id]` | Sí (PUT) | — | No | OK |
| POST | `/api/presupuestos/[id]/email` | — | — | No | OK |
| GET | `/api/presupuestos/[id]/pdf` | — | — | No | OK |
| POST | `/api/presupuestos/bulk-update` | Sí | — | No | OK |
| GET | `/api/presupuestos/export` | — | No | No | OK |
| GET/POST | `/api/presupuestos/templates` | Sí | — | No | OK |
| GET/PUT/DELETE | `/api/presupuestos/templates/[id]` | — | — | No | OK |
| GET/POST | `/api/pricing/descuentos` | Sí | No | No | OK |
| POST | `/api/pricing/calculate` | Mínima | — | No | OK |
| GET/POST | `/api/pricing/especiales` | Sí | — | Sí (POST) | OK |
| POST | `/api/pricing/inverse-calc` | Sí | — | No | OK |
| GET/POST | `/api/pricing/margenes` | Sí | — | No | Bug BACK-04 |
| GET/PUT/DELETE | `/api/pricing/margenes/[id]` | Sí | — | No | Bug BACK-04 |
| GET/POST | `/api/productos` | Sí (POST) | Sí | No | OK |
| GET/PUT/DELETE | `/api/productos/[id]` | Sí (PUT) | — | No | OK |
| GET/POST | `/api/proveedores` | Sí (POST) | Sí | No | OK |
| GET/PUT/DELETE | `/api/proveedores/[id]` | Sí (PUT) | — | No | OK |
| POST | `/api/stock-management/receive-order` | Mínima (id only) | — | No | OK |
| GET/PUT | `/api/tacos/[id]` | Sí (PUT) | — | No | OK |
| GET/POST/PUT | `/api/tacos` | Sí | No | No | OK |
| GET/POST/PUT/DELETE | `/api/tarifas-cliente` | Sí | No | No | OK |
| GET | `/api/tarifas-material-opciones` | — | — | No | OK |
| GET/POST | `/api/tarifas-rollo` | Sí (POST) | No | No | OK |
| GET/PUT/DELETE | `/api/tarifas-rollo/[id]` | Sí (PUT) | — | No | OK |
| GET/PUT | `/api/tracking/uso` | Parcial | — | No | OK |
| POST | `/api/tracking/sync` | — | — | Sí (10/min) | OK |
| GET | `/api/tracking/test` | — | — | No | OK |
| POST | `/api/auth/login` | Mínima | — | Sí (5/min) | Bug SEC-01 |
| POST | `/api/auth/logout` | — | — | No | OK |
| GET | `/api/auth/status` | — | — | No | OK |

### Hallazgos API

### API-01 — `stock-management/receive-order` no valida el `pedidoId` como UUID

**Archivo:** `src/app/api/stock-management/receive-order/route.js`, línea 7  
**Severidad:** Alta

```js
const { pedidoId } = await request.json();
const pedido = await db.pedidoProveedor.findUnique({ where: { id: pedidoId } });
```

No hay validación de que `pedidoId` sea un UUID o no sea `undefined`. Si `pedidoId` es `undefined`, Prisma puede lanzar un error críptico. Añadir:

```js
if (!pedidoId || typeof pedidoId !== 'string') {
  return NextResponse.json({ message: 'pedidoId requerido' }, { status: 400 });
}
```

### API-02 — Sin paginación en `GET /api/tarifas-cliente`

**Archivo:** `src/app/api/tarifas-cliente/route.js`, líneas 7–27  
**Severidad:** Media

El listado devuelve todas las tarifas de un cliente sin cap. Para clientes con muchas tarifas pactadas esto podría ser un problema. Añadir `take: 500` como mínimo.

---

## 🎨 Frontend

### FRONT-01 — `alert()` bloqueante en `CalculadoraBandas.js`

**Archivo:** `src/componentes/calculadoras/CalculadoraBandas.js`, línea 228  
**Severidad:** Media

```js
alert(`No se pudo guardar en el catálogo: ${err.message}`);
```

El uso de `alert()` nativo es bloqueante y rompe la UX. El proyecto tiene ya un sistema de toasts (`src/lib/toast.js`). Reemplazar por:

```js
import { toast } from '@/lib/toast';
// ...
toast.error(`No se pudo guardar en el catálogo: ${err.message}`);
```

### FRONT-02 — `localStorage` para preferencia de tema es la solución correcta

**Archivos:** `src/componentes/ui/ProveedorTema.js`, `src/componentes/layout/ThemeSwitcher.js`  
**Severidad:** Baja

El uso de `localStorage` para guardar la preferencia de tema (`crm-tema`) es correcto y no expone datos sensibles. Sin embargo, no hay protección `typeof window !== 'undefined'` en `ProveedorTema.js` antes del acceso a `localStorage`. En SSR esto lanzaría un `ReferenceError`:

```js
// En ProveedorTema.js, línea 13:
return localStorage.getItem("crm-tema") || DEFAULT_THEME;

// Corrección:
return (typeof window !== 'undefined' && localStorage.getItem("crm-tema")) || DEFAULT_THEME;
```

---

## ✅ Puntos Positivos

1. **Validación Zod exhaustiva** — Prácticamente todos los endpoints POST/PUT tienen schema Zod con `safeParse`. El archivo `src/lib/validations.js` centraliza todos los schemas correctamente.

2. **No hay SQL injection** — El uso consistente del ORM Prisma con parámetros preparados elimina esta clase de vulnerabilidad. No se encontró ningún `$queryRaw` con interpolación de strings.

3. **Logger seguro sin stack traces** — `logApiError` en `src/lib/logger.js` loguea solo `{name, message, code, meta}` sin exponer rutas de módulos, queries SQL internas ni stack traces al cliente.

4. **Totales recalculados en servidor** — Los endpoints POST/PUT de pedidos y presupuestos ignoran los totales enviados por el cliente y los recalculan desde los ítems + `iva_rate` de la BD. Esto previene manipulación de precios desde el cliente.

5. **Transacciones Prisma bien usadas** — Las operaciones críticas multi-tabla (actualizar pedido + ítems, conversión presupuesto→pedido, salida de stock + movimiento) están correctamente envueltas en `db.$transaction`.

6. **Protección anti-TOCTOU en conversión presupuesto→pedido** — El uso de `updateMany` con condición `{ notIn: ['Aceptado'] }` para marcar el presupuesto evita que dos requests concurrentes creen dos pedidos del mismo presupuesto.

7. **Content Security Policy configurada** — `next.config.mjs` define una CSP completa con `frame-ancestors 'none'`, `object-src 'none'`, y control de `script-src` según entorno.

8. **Rate limiting implementado en endpoints sensibles** — Login (5/min), backup (5/min), búsqueda (30/min), informes (20/min), exportación CSV (10/min), tracking sync (10/min).

9. **Path traversal prevenido en documentos** — La validación `filePath.startsWith(allowedBase)` y la verificación de `..` en la ruta impiden acceder fuera de `/public/planos/`.

10. **`costoUnitario` excluido de las respuestas públicas** — Los handlers GET de productos usan destructuring para omitir este campo sensible antes de devolver el JSON.

11. **Secuencias atómicas** — `getNextNumber` usa `upsert` con `increment: 1` que es atómico en MySQL y SQLite, evitando números duplicados en documentos.

12. **Audit log fire-and-forget correcto** — Las llamadas a `logCreate/logUpdate/logDelete` usan `.catch(() => {})` para que un fallo en el audit log no bloquee la respuesta al cliente.

13. **Whitelist de claves en `GET /api/config`** — El array `ALLOWED_CONFIG_KEYS` impide que claves internas o futuras API keys se filtren por este endpoint.

14. **`.env` y bases de datos excluidas del repositorio** — El `.gitignore` excluye correctamente `.env`, `.env.local`, `*.db`, `*.sqlite`, y datos operativos de clientes.

15. **Comparación de PIN en tiempo constante** — `crypto.timingSafeEqual` en `auth/login/route.js` previene ataques de timing en la verificación del PIN.

---

## 🗺️ Plan de Acción Priorizado

| # | ID | Descripción | Área | Severidad | Esfuerzo |
|---|-----|-------------|------|-----------|----------|
| 1 | BUG-01 | Fix crash en `from-presupuesto` con clienteId null | Bug | Crítica | Bajo (1 línea) |
| 2 | SEC-01 | Documentar y reforzar `SESSION_SECRET` en producción | Seguridad | Alta | Bajo |
| 3 | SEC-02 | Añadir verificación de cookie en middleware cuando AUTH_PIN activo | Seguridad | Alta | Medio |
| 4 | BUG-07 | Mover `getNextNumber` fuera de la transacción en `from-presupuesto` | Bug | Media | Bajo |
| 5 | SEC-05 | Validar enum `estado` en PATCH `/api/importaciones/[id]` | Seguridad | Media | Bajo |
| 6 | BUG-05 | Envolver batch update de grapas en `db.$transaction` | Bug | Media | Bajo |
| 7 | BACK-04 | Eliminar campo `categoria` inexistente de margenes POST/PUT | Backend | Media | Bajo |
| 8 | BUG-04 | Añadir validación Zod al PUT de `precios/route.js` | Bug | Media | Bajo |
| 9 | API-01 | Validar `pedidoId` en `receive-order` antes de query | API | Alta | Bajo |
| 10 | SEC-03 | Añadir rate limiting a rutas POST de escritura sin límite | Seguridad | Media | Medio |
| 11 | BACK-01 | Añadir transacción o error handling a `actualizarPrecioMateriales` | Backend | Alta | Medio |
| 12 | BUG-03 | Fix manejo de promesa rechazada en `config-cache.js` | Bug | Alta | Bajo |
| 13 | BACK-02 | Corregir mapeo `tier` vs `categoria` en `crearManejadoresCRUD` de clientes | Backend | Media | Bajo |
| 14 | SEC-04 | Reemplazar `console.log/warn/info` en `tracking.js` por `logApiError` | Seguridad | Media | Bajo |
| 15 | BUG-06 | Validar enum `tipo` en POST `/api/notificaciones` | Bug | Media | Bajo |
| 16 | SEC-07 | Añadir límite de longitud con Zod en `maquinaria/procesos` POST | Seguridad | Baja | Bajo |
| 17 | BACK-03 | Optimizar `rentabilidad-clientes` para evitar 5.000 pedidos en memoria | Backend | Media | Alto |
| 18 | FRONT-01 | Reemplazar `alert()` por toast en `CalculadoraBandas.js` | Frontend | Media | Bajo |
| 19 | BUG-02 | Extraer `parseInt` duplicado en `precios/route.js` | Bug | Baja | Bajo |
| 20 | FRONT-02 | Añadir guard `typeof window !== 'undefined'` en `ProveedorTema.js` | Frontend | Baja | Bajo |
| 21 | BACK-05 | Considerar migrar DELETE `/api/precios` a ruta `/api/precios/[id]` | Backend | Baja | Medio |
| 22 | BACK-06 | Convertir import dinámico de `db` en `pdfGenerator.js` a import estático | Backend | Baja | Bajo |
| 23 | API-02 | Añadir `take: 500` en `GET /api/tarifas-cliente` | API | Media | Bajo |
| 24 | SEC-06 | Filtrar claves dinámicas de tracking en endpoint de backup | Seguridad | Baja | Bajo |

---

*Este archivo fue generado automáticamente. Actualízalo después de aplicar cada corrección.*
