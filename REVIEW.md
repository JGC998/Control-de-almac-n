# REVIEW — CRM Taller / Control de Almacén

> Generado el 2026-07-21 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## Resumen Ejecutivo

**Stack detectado:** Next.js 16 App Router · Prisma 6 · SQLite (dev) / MySQL (prod) · DaisyUI 5 · SWR v2 · Zod v4 · jsPDF 4 · Resend · ExcelJS · Tesseract.js  
**Archivos analizados:** 48  
**Total de hallazgos:** 17 (0 críticos, 2 altos, 6 medios, 9 bajos)

| Área | Score | Altos | Medios | Bajos |
|------|-------|-------|--------|-------|
| Seguridad | 8/10 | 1 | 2 | 1 |
| Bugs | 7/10 | 1 | 3 | 1 |
| Backend | 8/10 | 0 | 1 | 3 |
| API | 8/10 | 0 | 0 | 0 |
| Frontend | 8/10 | 0 | 0 | 4 |
| **Total** | | **2** | **6** | **9** |

---

## Hallazgos Altos — Acción Pronto

### SEC-01 — `costoUnitario` se filtra en el Audit Log (UPDATE y DELETE)

**Archivo:** `src/lib/audit.js` · líneas 60–85  
**Severidad:** Alta

`logCreate` aplica correctamente `sanitizeForAudit` que elimina `costoUnitario` y `costo` del log. Sin embargo, `logUpdate` y `logDelete` pasan `oldData` y `newData` directamente sin pasar por esa función:

```js
// audit.js — logUpdate (línea 61) — SIN sanitizar
export async function logUpdate(entity, entityId, oldData, newData, user) {
    return logAction({
        details: {
            oldValue: oldData,  // costoUnitario incluido si viene del objeto Prisma
            newValue: newData,  // ídem
            changes: getChanges(oldData, newData)
        },
    });
}
```

El endpoint `GET /api/audit-log` expone estos registros (paginados) a cualquier usuario de la red interna.

**Corrección:**

```js
// audit.js — aplicar sanitizeForAudit en logUpdate y logDelete
export async function logUpdate(entity, entityId, oldData, newData, user) {
    return logAction({
        action: 'UPDATE',
        entity, entityId, user,
        details: {
            oldValue: sanitizeForAudit(oldData),
            newValue: sanitizeForAudit(newData),
            changes: getChanges(sanitizeForAudit(oldData), sanitizeForAudit(newData))
        },
    });
}

export async function logDelete(entity, entityId, oldData, user) {
    return logAction({
        action: 'DELETE',
        entity, entityId, user,
        details: { oldValue: sanitizeForAudit(oldData) },
    });
}
```

---

### BUG-01 — Margen estimado siempre muestra 0% con productos del catálogo

**Archivo:** `src/componentes/pedidos/FormularioPedidoCliente.js` · línea 154  
**Severidad:** Alta

Cuando el usuario selecciona un producto desde el modal de búsqueda, el código intenta leer `product.costoUnitario`:

```js
// FormularioPedidoCliente.js — handleProductSelect (línea 154)
newItems[index].costoUnitario = parseFloat(product.costoUnitario) || 0;
```

Pero `GET /api/productos` excluye explícitamente ese campo en la respuesta:

```js
// api/productos/route.js (líneas 68 y 96)
const productosSerializados = productos.map(({ costoUnitario: _omit, ...p }) => ({ ...p, ... }));
```

Como resultado, `product.costoUnitario` es siempre `undefined` → `parseFloat(undefined) || 0` = 0, y el indicador "Margen estimado" del formulario permanece en 0% o nulo para todos los productos del catálogo.

**Corrección:** El motor de precios (`POST /api/pricing/calculate`) devuelve `unitPrice` ya con margen aplicado. Una opción limpia es exponer un campo `margenRatio` medio del producto (sin revelar el coste absoluto) o calcular el margen estimado comparando el `unitPrice` enviado frente al precio base de la regla de margen seleccionada, lo que ya tiene toda la información necesaria server-side.

---

## Seguridad

### SEC-02 — Rate limiting ausente en varios endpoints

**Archivos afectados:**
- `src/app/api/notas/route.js` (GET y POST)
- `src/app/api/movimientos/route.js` (GET)
- `src/app/api/dashboard/route.js` (GET — ejecuta 6 queries en paralelo)
- `src/app/api/presupuestos/bulk-update/route.js` (POST)
- `src/app/api/pedidos/bulk-update/route.js` (POST)
- `src/app/api/productos/export/route.js` (GET — full table scan sin límite de req)

**Severidad:** Media

El patrón ya existe en el proyecto (`checkRateLimit`). El caso más preocupante es `/api/dashboard` que ejecuta 6 consultas DB por petición sin ningún límite:

```js
// Corrección — añadir al inicio del handler en dashboard/route.js
const ip = getClientIp(request);
const rl = checkRateLimit(`dashboard:${ip}`, 30);
if (!rl.allowed) {
  return NextResponse.json(
    { message: 'Demasiadas peticiones.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
  );
}
```

Mismo patrón para los demás endpoints listados.

---

### SEC-03 — SESSION_SECRET con fallback predecible en entornos no-producción

**Archivo:** `src/app/api/auth/login/route.js` · líneas 30–35  
**Severidad:** Media

```js
const secret = process.env.SESSION_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
  return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
}
const effectiveSecret = secret || 'dev-secret-change-in-production';
```

Si `AUTH_PIN` está activo y `SESSION_SECRET` no está configurado en staging (`NODE_ENV !== 'production'`), el token HMAC se firma con `'dev-secret-change-in-production'`. Cualquiera que conozca esa cadena puede forjar una cookie `crm-auth` válida.

**Corrección:** Ampliar la comprobación a cualquier entorno con AUTH_PIN activo:

```js
const secret = process.env.SESSION_SECRET;
const authEnabled = !!process.env.AUTH_PIN;
if (!secret && authEnabled) {
  // Advertir en dev/staging, bloquear en producción
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ message: 'Error de configuración del servidor' }, { status: 500 });
  }
  console.warn('[AUTH] SESSION_SECRET no configurado; usando secret de desarrollo');
}
const effectiveSecret = secret || 'dev-secret-change-in-production';
```

---

### SEC-04 — `items: z.array(z.any())` en plantillas de presupuesto

**Archivo:** `src/app/api/presupuestos/templates/route.js` · línea 9  
**Severidad:** Baja

```js
items: z.array(z.any()).optional().default([]),
```

El campo `items` acepta cualquier estructura JSON sin validación de schema. Aunque el riesgo directo es bajo (app interna), debería validarse con el mismo schema que `PresupuestoItem` para evitar que se almacenen datos malformados que rompan el renderizado al cargar la plantilla.

---

## Bugs

### BUG-02 — Error silencioso al eliminar plantilla en TemplateManager

**Archivo:** `src/componentes/presupuestos/TemplateManager.js` · línea 60  
**Severidad:** Baja

```js
} catch (err) {
    console.error(err);   // Solo en consola, el usuario no ve nada
}
```

Si el DELETE falla (error 404, red caída), el usuario no recibe ningún feedback. La lista se refresca igualmente via `mutate`, ocultando el error completamente.

**Corrección:** Añadir estado de error local y mostrarlo en el modal.

---

### BUG-03 — `presupuestos/[id]` PUT devuelve 500 para P2025 (no encontrado)

**Archivo:** `src/app/api/presupuestos/[id]/route.js` · líneas 94–98  
**Severidad:** Media

```js
} catch (error) {
    logApiError(error, 'Error al actualizar el presupuesto');
    return NextResponse.json({ message: 'Error interno al actualizar el presupuesto.' }, { status: 500 });
}
```

Si el presupuesto no existe, Prisma lanza `P2025` y el cliente recibe un 500 en lugar de 404. Los endpoints homólogos (pedidos, clientes) usan `handlePrismaError` correctamente.

**Corrección:**

```js
} catch (error) {
    return handlePrismaError(error, { notFound: 'Presupuesto no encontrado' });
}
```

---

### BUG-04 — `pdf-taller-batch` sin límite de IDs en el body

**Archivo:** `src/app/api/pedidos/pdf-taller-batch/route.js` · líneas 11–15  
**Severidad:** Media

```js
const { ids } = await request.json();
if (!Array.isArray(ids) || ids.length === 0) {
  return NextResponse.json({ message: 'Se requiere al menos un ID' }, { status: 400 });
}
```

No existe límite superior. Un array de miles de IDs dispararía una query masiva + generación de PDF que podría agotar la memoria del proceso Node.

**Corrección:**

```js
const MAX_IDS = 100;
if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_IDS) {
  return NextResponse.json({ message: `Se permiten entre 1 y ${MAX_IDS} pedidos por lote` }, { status: 400 });
}
```

---

### BUG-05 — CSV client-side no escapa comillas dobles

**Archivo:** `src/componentes/compuestos/TablaConSeleccion.jsx` · líneas 38–42  
**Severidad:** Baja

```js
const str = v == null ? '' : String(v);
return str.includes(',') ? `"${str}"` : str;
```

Si un valor contiene `"` (p. ej., una descripción como `"Banda 5" PVC`), el CSV queda malformado. RFC 4180 exige duplicar las comillas internas.

**Corrección:**

```js
const str = v == null ? '' : String(v);
if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
}
return str;
```

---

### BUG-06 — PDF de factura hardcodea "IVA (21%)" ignorando la configuración

**Archivo:** `src/lib/pdfGenerator.js` · línea 1404  
**Severidad:** Media

```js
doc.text('IVA (21%):', ivaBoxX + 4, ivaBoxY + 15);
```

`generateFacturaPDF` no recibe la tasa de IVA como parámetro y no la lee de `Config`. Si la empresa cambia el tipo de IVA, los PDFs de facturas seguirán imprimiendo "21%". Las otras funciones del generador (`generateBudgetPDF`, `generateTallerPDF`) reciben `ivaRate` como parámetro.

**Corrección:**

```js
// Firma
export async function generateFacturaPDF(factura, ivaRate = 0.21) { ... }

// Uso
doc.text(`IVA (${Math.round(ivaRate * 100)}%):`, ivaBoxX + 4, ivaBoxY + 15);
```

Y pasar `ivaRate` desde el route de facturas al llamar a esta función.

---

## Backend

### BACK-01 — Caché de emisor en `pdfGenerator.js` sin TTL

**Archivo:** `src/lib/pdfGenerator.js` · líneas 21–39  
**Severidad:** Media

```js
let _emisorCache = null;
export function clearEmisorCache() { _emisorCache = null; }

async function getEmisorInfo() {
    if (_emisorCache) return _emisorCache;
    // Carga y cachea sin expiración automática
    _emisorCache = { address, phone };
    return _emisorCache;
}
```

El caché de dirección y teléfono del emisor nunca expira. Si el usuario actualiza `ConfiguracionEmisor` en la UI, los PDFs seguirán usando los datos anteriores hasta el siguiente reinicio del servidor. `clearEmisorCache()` existe pero no está conectado a ningún PUT de configuración.

**Corrección:** Añadir TTL o invalidar el caché desde los routes de configuración:

```js
// Opción A: TTL
let _emisorCache = null;
let _emisorCacheAt = 0;
const EMISOR_TTL_MS = 5 * 60 * 1000;

async function getEmisorInfo() {
    if (_emisorCache && (Date.now() - _emisorCacheAt) < EMISOR_TTL_MS) return _emisorCache;
    // ...carga
    _emisorCache = { address, phone };
    _emisorCacheAt = Date.now();
    return _emisorCache;
}

// Opción B: llamar clearEmisorCache() en el PUT de /api/config y /api/configuracion/...
```

---

### BACK-02 — GET /api/movimientos sin rate limiting

**Archivo:** `src/app/api/movimientos/route.js`  
**Severidad:** Baja

Devuelve hasta 500 movimientos de stock sin ningún límite de llamadas por IP. Añadir `checkRateLimit` con ~60 req/min siguiendo el patrón del proyecto.

---

### BACK-03 — GET/POST /api/notas sin rate limiting

**Archivo:** `src/app/api/notas/route.js`  
**Severidad:** Baja

GET devuelve las 20 últimas notas. POST crea una nota con solo validación Zod. Sin rate limiting.

---

### BACK-04 — Bulk-update sin rate limiting

**Archivos:** `src/app/api/presupuestos/bulk-update/route.js`, `src/app/api/pedidos/bulk-update/route.js`  
**Severidad:** Baja

Ambos POST aceptan hasta 200 IDs por llamada y ejecutan `updateMany`. Sin rate limiting es posible enviar cambios masivos de estado en bucle desde un cliente.

---

### BACK-05 — `verifactu.js` documentado en CLAUDE.md no existe

**Archivo referenciado:** `src/lib/verifactu.js` (ausente)  
**Severidad:** Informativo

CLAUDE.md documenta este archivo con la lógica del hash chain VeriFactu, pero no existe en el repositorio. La funcionalidad VeriFactu está descrita en la arquitectura pero no se ha podido revisar su implementación real. Actualizar CLAUDE.md para reflejar dónde vive realmente esa lógica.

---

## API

### Mapa de endpoints (104 rutas totales)

| Método | Ruta | RL | Zod | Notas |
|--------|------|----|-----|-------|
| POST | /api/auth/login | ✅ 5/min | ✅ | Timing-safe, cookie httpOnly |
| POST | /api/auth/logout | — | — | Limpia cookie |
| GET | /api/auth/status | — | — | Solo `{ required: bool }` |
| GET | /api/audit-log | ✅ 30/min | — | Paginado, 1000 max |
| GET | /api/busqueda | ✅ 30/min | — | q min 2, max 100 chars |
| GET | /api/config/backup | ✅ 5/min | — | Config solo, auditado |
| GET | /api/export/csv | ✅ 10/min | — | MAX_ROWS=500 |
| GET | /api/informes | ✅ 20/min | — | 7 tipos: ventas, KPIs, margen, etc. |
| GET | /api/dashboard | ❌ sin RL | — | 6 queries paralelas — SEC-02 |
| GET/POST | /api/clientes | — | ✅ | Via `crearManejadoresCRUD` |
| GET/PUT/DELETE | /api/clientes/[id] | — | ✅ | |
| GET | /api/clientes/[id]/resumen | — | — | |
| GET | /api/clientes/[id]/historial-precios | — | — | |
| GET/POST | /api/productos | — | ✅ | costoUnitario excluido en GET |
| GET/PUT/DELETE | /api/productos/[id] | — | ✅ | costoUnitario excluido en GET/PUT resp. |
| GET | /api/productos/export | ❌ sin RL | — | Full scan — SEC-02 |
| GET | /api/productos/[id]/etiqueta | — | — | |
| GET | /api/productos/[id]/historial-costos | — | — | |
| GET/POST | /api/pedidos | — | ✅ | Recalcula totales server-side |
| GET/PUT/PATCH/DELETE | /api/pedidos/[id] | — | ✅ PUT | Transacción en PUT |
| GET | /api/pedidos/[id]/pdf | — | — | param `inline` |
| GET | /api/pedidos/[id]/pdf-taller | — | — | |
| GET | /api/pedidos/[id]/email | — | — | Resend |
| POST | /api/pedidos/bulk-update | ❌ sin RL | ✅ | max 200 IDs |
| POST | /api/pedidos/from-presupuesto | — | — | TOCTOU prevenido con updateMany atómico |
| POST | /api/pedidos/pdf-taller-batch | — | — | Sin límite de IDs — BUG-04 |
| GET | /api/pedidos/export | — | — | |
| GET/POST | /api/presupuestos | — | ✅ | |
| GET/PUT/DELETE | /api/presupuestos/[id] | — | ✅ PUT | PUT devuelve 500 en P2025 — BUG-03 |
| GET | /api/presupuestos/[id]/pdf | — | — | |
| POST | /api/presupuestos/[id]/email | — | — | |
| POST | /api/presupuestos/bulk-update | ❌ sin RL | ✅ | max 200 IDs |
| GET | /api/presupuestos/export | — | — | |
| GET/POST | /api/presupuestos/templates | — | ✅ | items: z.any() — SEC-04 |
| GET/PUT/DELETE | /api/presupuestos/templates/[id] | — | ✅ | |
| POST | /api/pricing/calculate | — | — | Anti N+1: carga productos en batch |
| POST | /api/pricing/inverse-calc | — | — | |
| GET/POST | /api/pricing/margenes | — | — | |
| GET/PUT/DELETE | /api/pricing/margenes/[id] | — | — | |
| GET/POST | /api/pricing/descuentos | — | — | |
| GET/POST | /api/importaciones | — | ✅ | Fire-and-forget: grapas/materiales/tacos |
| GET/PUT/PATCH/DELETE | /api/importaciones/[id] | — | ✅ PUT | |
| GET | /api/importaciones/[id]/analisis-rentabilidad | — | — | |
| GET/POST | /api/importaciones/[id]/bobinas | — | — | |
| GET/POST | /api/importaciones/[id]/tracking | — | — | |
| POST | /api/importaciones/[id]/whatsapp | — | — | |
| GET | /api/importaciones/borrador | — | — | |
| GET | /api/importaciones/historico-bobinas | — | — | |
| GET/POST | /api/notas | ❌ sin RL | ✅ POST | |
| DELETE | /api/notas/[id] | — | — | |
| GET | /api/movimientos | ❌ sin RL | — | take ≤ 500 |
| GET/POST | /api/fabricantes | — | ✅ | |
| GET/PUT/DELETE | /api/fabricantes/[id] | — | ✅ | |
| GET/POST | /api/proveedores | — | ✅ | |
| GET/PUT/DELETE | /api/proveedores/[id] | — | — | |
| GET/POST | /api/familias | — | — | |
| GET/PUT/DELETE | /api/familias/[id] | — | — | |
| GET/POST | /api/subfamilias | — | — | |
| GET/PUT/DELETE | /api/subfamilias/[id] | — | — | |
| GET/POST | /api/materiales | — | — | |
| GET/PUT/DELETE | /api/materiales/[id] | — | ✅ | |
| GET/POST | /api/grapas | — | — | |
| GET/PUT/DELETE | /api/grapas/[id] | — | ✅ | |
| GET/POST | /api/tacos | — | — | |
| GET/PUT/DELETE | /api/tacos/[id] | — | ✅ | |
| GET/POST | /api/logistica/tarifas | — | ✅ | |
| GET/PUT/DELETE | /api/logistica/tarifas/[id] | — | ✅ | |
| POST | /api/logistica/calcular | — | ✅ | |
| GET/PUT | /api/logistica/config-paletizado | — | ✅ | |
| GET/POST | /api/modelos-grapa | — | — | |
| GET/PUT/DELETE | /api/modelos-grapa/[id] | — | — | |
| GET | /api/modelos-grapa/[id]/historial | — | — | |
| GET/PUT | /api/modelos-grapa/config-merma | — | — | |
| GET | /api/cron/refresh-positions | ✅ CRON_SECRET | — | MMSI/VesselFinder + WhatsApp |
| GET | /api/tracking/sync | — | — | |
| GET | /api/tracking/test | — | — | |
| GET | /api/tracking/uso | — | — | |
| GET/PUT | /api/config | — | — | |
| GET/POST | /api/documentos | — | — | |
| GET/PUT/DELETE | /api/documentos/[id] | — | — | |
| GET/POST | /api/catalogo | — | — | |
| GET/PUT/DELETE | /api/catalogo/[id] | — | — | |
| GET/POST | /api/notificaciones | — | — | |
| GET/PUT/DELETE | /api/notificaciones/[id] | — | — | |
| GET/POST | /api/almacen-stock | — | — | |
| GET | /api/stock-info/available-meters | — | — | |
| POST | /api/stock-management/receive-order | — | — | |
| GET/POST | /api/precios | — | — | |
| GET/PUT/DELETE | /api/precios/[id] | — | — | |
| POST | /api/precios/bulk-update | — | — | |
| GET/PUT | /api/tarifas-cliente | — | ✅ | |
| GET | /api/tarifas-material-opciones | — | — | |
| GET/POST | /api/tarifas-rollo | — | — | |
| GET/PUT/DELETE | /api/tarifas-rollo/[id] | — | — | |
| POST | /api/tarifas-rollo/sync | — | — | |
| GET/POST | /api/plantillas | — | — | |
| GET/PUT/DELETE | /api/plantillas/[id] | — | — | |
| POST | /api/herramientas/carta-porte | — | — | |
| GET/POST | /api/configuracion/referencias | — | — | |
| GET/PUT/DELETE | /api/configuracion/referencias/[id] | — | — | |
| GET/POST | /api/pedidos-proveedores-data | — | — | |
| GET/PUT/DELETE | /api/pedidos-proveedores-data/[id] | — | — | |
| GET | /api/pedidos-proveedores-data/analisis-precios | — | — | |
| GET/POST | /api/maquinaria/procesos | — | — | |

> **Leyenda:** RL = Rate Limit aplicado · Zod = validación con Zod presente

---

## Frontend

### FRONT-01 — `confirm()` nativo en TemplateManager (inconsistente con el sistema)

**Archivo:** `src/componentes/presupuestos/TemplateManager.js` · líneas 58 y 147  
**Severidad:** Baja

```js
if (!confirm('¿Seguro que quieres eliminar esta plantilla?')) return;
// ...y:
if (confirm('¿Cargar esta plantilla reemplazará los items actuales. Continuar?')) {
```

El resto de la app usa `useConfirmacion` (hook custom con `ModalConfirmacion`). Los `confirm()` nativos bloquean el hilo principal, no son estilizables y producen comportamientos inconsistentes en iOS/Safari.

**Corrección:** Migrar a `useConfirmacion` siguiendo el patrón de `TablaConSeleccion.jsx`.

---

### FRONT-02 — Bloque "sinFacturacion" comentado (código muerto)

**Archivo:** `src/componentes/pedidos/FormularioPedidoCliente.js` · líneas 442–453  
**Severidad:** Baja

```jsx
{/* VeriFactu — deshabilitado temporalmente
{formType === 'PEDIDO' && !isEditMode && (
  <div ...>
    <input type="checkbox" ... />
    ...
  </div>
)}
*/}
```

El estado `sinFacturacion` y su lógica están activos pero el control de UI está comentado indefinidamente. Si la feature no se activará pronto, limpiar también el estado y la lógica asociada, o proteger con una feature flag en `Config`.

---

### FRONT-03 — Input de búsqueda global sin `aria-label`

**Archivo:** `src/componentes/ui/BusquedaGlobal.js` · línea 124  
**Severidad:** Baja

```jsx
<input
    ref={inputRef}
    type="text"
    className="..."
    placeholder="Buscar clientes, pedidos, presupuestos, productos..."
    // Sin aria-label ni <label> asociado
/>
```

Los lectores de pantalla dependen de `aria-label` o `<label>` asociado. El `placeholder` no es suficiente según WCAG 2.1 (criterio 1.3.1 y 4.1.2).

**Corrección:** Añadir `aria-label="Búsqueda global"` al input.

---

### FRONT-04 — Error en eliminación de plantilla silenciado hacia el usuario

Ver BUG-02. El `catch` en `handleDelete` de `TemplateManager.js` solo loguea en consola del navegador.

---

## Puntos Positivos

1. **Headers de seguridad completos** en `next.config.mjs`: CSP sin `unsafe-eval` en producción, `X-Frame-Options: DENY`, HSTS en producción, `Permissions-Policy`, `Referrer-Policy`. Middleware añade HSTS en producción.
2. **Rate limiting en endpoints sensibles**: login (5/min), búsqueda (30/min), audit-log (30/min), backup (5/min), CSV export (10/min), informes (20/min). Implementación limpia con sliding-window en memoria y cleanup periódico.
3. **Comparación PIN en tiempo constante** con `crypto.timingSafeEqual` — previene timing attacks en el endpoint de login.
4. **`costoUnitario` excluido** de todas las respuestas GET y PUT de productos. Los datos de coste nunca llegan al cliente.
5. **Whitelist de tipos en `getNextNumber`** previene inyección de secuencias arbitrarias en la tabla `Sequence`.
6. **Validación Zod en todos los endpoints POST/PUT principales** (pedidos, presupuestos, clientes, importaciones, tarifas, logística, etc.).
7. **`logApiError`** nunca filtra stack traces, rutas de módulos ni queries internas de Prisma al exterior.
8. **Transacciones en actualizaciones de documentos**: el patrón delete-all-items + create-new en pedido PUT y presupuesto PUT garantiza consistencia incluso ante fallos parciales.
9. **TOCTOU prevenido** en `from-presupuesto`: uso de `updateMany` con condición atómica para marcar el presupuesto como Aceptado — evita doble-click / doble pestaña.
10. **`sanitizeForAudit` en `logCreate`** elimina costos del audit log (corrección pendiente en `logUpdate`/`logDelete` — SEC-01).
11. **Sin `dangerouslySetInnerHTML`** en ningún componente revisado.
12. **Paginación y límites** en todos los endpoints de listado (máx 500 registros en legado; `page`/`limit` disponibles en los principales).
13. **Debounce de 250ms** en `BusquedaGlobal` — reduce carga de servidor durante la escritura.
14. **Caché de logo y emisor** en `pdfGenerator.js` — una sola lectura de disco/DB por proceso (con la salvedad de TTL ausente en BACK-01).
15. **Anti N+1 en `pricing/calculate`**: todos los productos se cargan en una sola query con `id: { in: productIds }` antes de procesar los ítems.
16. **Prisma singleton con `globalThis`** en `db.js` — previene leaks de conexión en hot-reload de Next.js.
17. **`_rateLimiterInterval` en `globalThis`** — previene duplicación del cleanup interval en hot-reload.
18. **Secuencia atómica en `getNextNumber`**: `upsert` con `increment: 1` es una sola sentencia SQL sin race conditions.

---

## Plan de Acción Priorizado

| # | Hallazgo | Área | Severidad | Esfuerzo estimado |
|---|----------|------|-----------|-------------------|
| 1 | SEC-01: sanitizar oldData/newData en logUpdate y logDelete | Seguridad | Alta | 15 min |
| 2 | BUG-06: generateFacturaPDF hardcodea "IVA (21%)" | Bugs | Media | 30 min |
| 3 | BUG-03: presupuestos/[id] PUT devuelve 500 en P2025 | Bugs | Media | 10 min |
| 4 | BUG-04: pdf-taller-batch sin límite de IDs | Bugs | Media | 10 min |
| 5 | SEC-02: Añadir rate limiting en dashboard, notas, movimientos, bulk-update, productos/export | Seguridad | Media | 30 min |
| 6 | BACK-01: Añadir TTL o invalidación al _emisorCache | Backend | Media | 20 min |
| 7 | SEC-03: SESSION_SECRET requerido cuando AUTH_PIN está activo | Seguridad | Media | 15 min |
| 8 | BUG-01: Margen estimado siempre 0% con productos del catálogo | Bugs | Alta | 2–4 h (rediseño de flujo) |
| 9 | BUG-05: Escapar comillas dobles en CSV client-side | Bugs | Baja | 5 min |
| 10 | FRONT-01: Migrar confirm() en TemplateManager a useConfirmacion | Frontend | Baja | 30 min |
| 11 | BUG-02: Mostrar error al usuario cuando falla handleDelete | Bugs | Baja | 15 min |
| 12 | FRONT-02: Eliminar código muerto sinFacturacion o usar feature flag | Frontend | Baja | 15 min |
| 13 | FRONT-03: Añadir aria-label al input de BusquedaGlobal | Frontend | Baja | 5 min |
| 14 | SEC-04: Schema tipado para items en templates | Seguridad | Baja | 30 min |
| 15 | BACK-05: Actualizar CLAUDE.md — verifactu.js no existe | Docs | Info | 10 min |

---

*Este archivo fue generado automáticamente el 2026-07-21. Actualízalo después de aplicar cada corrección.*
