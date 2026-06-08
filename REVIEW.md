# REVIEW.md — CRM Taller · Revisión de código (Commit actual)

> **Fecha de revisión:** 2026-06-08
> **Revisor:** Auditoría automatizada — Claude Code
> **Alcance:** Código nuevo y modificado en el último commit. Los hallazgos de sesiones anteriores se consideran corregidos y no se reabre ninguno.

---

## 1. Resumen ejecutivo

| Área | Score | Hallazgos nuevos |
|------|-------|-----------------|
| Seguridad | 7/10 | 3 (SEC-01 medio, SEC-02 bajo, SEC-03 bajo) |
| Bugs | 6/10 | 5 (BUG-01 alto, BUG-02 medio, BUG-03 bajo, BUG-04 bajo, BUG-05 bajo) |
| Backend / Queries | 7/10 | 3 (BACK-01 medio, BACK-02 bajo, BACK-03 bajo) |
| API / Contratos | 7/10 | 2 (API-01 medio, API-02 bajo) |
| Frontend / UX | 8/10 | 3 (FRONT-01 bajo, FRONT-02 bajo, FRONT-03 bajo) |
| **Global** | **7/10** | **16 hallazgos** |

**Severidades:**
- 1 hallazgo ALTO (BUG-01)
- 3 hallazgos MEDIOS (SEC-01, BUG-02, BACK-01)
- 12 hallazgos BAJOS

No hay hallazgos CRITICOS en esta revisión. El código nuevo está bien estructurado y usa correctamente los patrones establecidos (logApiError, try-catch, SWR, fetcher). Las correcciones prioritarias son BUG-01 (notificación de stock mínimo silenciada cuando el stock se agota totalmente) y BACK-01 (N+1 queries en análisis de rentabilidad).

---

## 2. Hallazgos CRITICOS

No se han identificado hallazgos críticos en esta revisión.

---

## 3. Hallazgos de SEGURIDAD

### SEC-01 — MEDIO · Los endpoints nuevos no tienen rate limiting

**Archivos:**
- `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js`
- `src/app/api/pedidos-proveedores-data/analisis-precios/route.js`

El endpoint `analisis-rentabilidad` lanza hasta N queries a la base de datos (una por bobina en el contenedor), lo que lo convierte en un candidato natural para un ataque DoS de coste bajo: un atacante autenticado puede hacer polling intensivo forzando muchas queries simultáneas. El endpoint `analisis-precios` también carece de límite de tasa.

El módulo `src/lib/rateLimiter.js` ya existe y está en uso en otros endpoints. La firma exportada es:

```js
// src/lib/rateLimiter.js
export function checkRateLimit(ip, maxRequests = 60) {
  // Ventana deslizante de 60 segundos por IP
  // Devuelve { allowed: boolean, remaining: number, retryAfter?: number }
}
```

**Corrección sugerida** (misma pauta que `/api/informes`):

```js
// Al inicio de la función GET, antes de cualquier query:
import { checkRateLimit } from '@/lib/rateLimiter';

const ip = request.headers.get('x-forwarded-for') ?? 'local';
const rl = checkRateLimit(ip, 20); // 20 req/min para endpoints pesados
if (!rl.allowed) {
  return NextResponse.json(
    { message: 'Demasiadas peticiones. Inténtalo más tarde.' },
    { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
  );
}
```

---

### SEC-02 — BAJO · El endpoint `analisis-rentabilidad` no valida el formato del ID

**Archivo:** `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js`, líneas 12–18

El `id` del path se pasa directamente a `db.importacionContenedor.findUnique({ where: { id } })` sin validar que sea un UUID bien formado. Aunque Prisma no ejecutará SQL arbitrario gracias al ORM, un ID malformado puede generar un error no controlado en algunos dialectos (especialmente MySQL en producción).

```js
// Código actual — líneas 12-18
const { id } = await params;
// No hay validación del formato UUID aquí
const importacion = await db.importacionContenedor.findUnique({ where: { id } });
if (!importacion) {
  return NextResponse.json({ message: 'Importación no encontrada' }, { status: 404 });
}
```

**Corrección sugerida:**

```js
const { id } = await params;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(id)) {
  return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
}
```

---

### SEC-03 — BAJO · El parámetro `material` en `analisis-precios` no está limitado en longitud

**Archivo:** `src/app/api/pedidos-proveedores-data/analisis-precios/route.js`, líneas 11–13 y 25–26

El parámetro `material` se usa directamente en un `contains` de Prisma:

```js
// Líneas 25-26 — código actual
const pedidos = await db.pedidoProveedor.findMany({
  where: { material: { contains: material } },
  // ...
  take: 500,
});
```

El operador `contains` de Prisma es seguro contra inyección SQL porque usa queries parametrizadas. Sin embargo, no hay validación de longitud ni de caracteres, lo que permite buscar con strings arbitrariamente largos y puede degradar el rendimiento.

**Corrección sugerida:**

```js
const material = searchParams.get('material');
if (material && (typeof material !== 'string' || material.length > 100)) {
  return NextResponse.json({ message: 'Parámetro material inválido' }, { status: 400 });
}
```

---

## 4. Hallazgos de BUGS

### BUG-01 — ALTO · Notificación de stock mínimo nunca se genera cuando el stock se agota totalmente

**Archivo:** `src/app/api/almacen-stock/route.js`, líneas 61–113

Dentro de la transacción, cuando `newMetrosDisponibles <= 0.01`, el registro de stock se elimina de la base de datos (línea 92). Inmediatamente después de la transacción, en la línea 104, el código busca ese mismo registro para decidir si emitir la notificación de stock mínimo:

```js
// Código actual — líneas 90-113 de src/app/api/almacen-stock/route.js

// Dentro de la transacción:
if (newMetrosDisponibles <= 0.01) {
  // El registro se borra aquí
  await tx.stock.delete({ where: { id: stockId } });
} else {
  await tx.stock.update({
    where: { id: stockId },
    data: { metrosDisponibles: newMetrosDisponibles },
  });
}

// Fuera de la transacción:
// stockActualizado será null porque el registro ya fue borrado
const stockActualizado = await db.stock.findUnique({ where: { id: stockId } });
if (stockActualizado && (stockActualizado.stockMinimo || 0) > 0 && stockActualizado.metrosDisponibles < stockActualizado.stockMinimo) {
  db.notificacion.create({ ... }).catch(() => {});
}
```

La condición `if (stockActualizado && ...)` es correcta como guard de null, pero el efecto es que el agotamiento total — el caso más urgente para el responsable del almacén — **nunca genera ninguna notificación**. El `stockMinimo` queda ignorado precisamente cuando más importa.

**Corrección sugerida:** Guardar los datos del stock dentro de la transacción antes del delete:

```js
// En la transacción, capturar los datos antes de borrar:
const stockItem = await tx.stock.findUnique({ where: { id: stockId } });
// ...
const datosStock = { ...stockItem }; // capturar antes de borrar
if (newMetrosDisponibles <= 0.01) {
  await tx.stock.delete({ where: { id: stockId } });
} else {
  await tx.stock.update({
    where: { id: stockId },
    data: { metrosDisponibles: newMetrosDisponibles },
  });
}

// Fuera de la transacción, usar datosStock para la notificación:
const datosParaNotificar = newMetrosDisponibles <= 0.01
  ? { ...datosStock, metrosDisponibles: 0 }  // stock agotado
  : await db.stock.findUnique({ where: { id: stockId } });

if (datosParaNotificar && (datosParaNotificar.stockMinimo || 0) > 0 &&
    datosParaNotificar.metrosDisponibles < datosParaNotificar.stockMinimo) {
  db.notificacion.create({
    data: {
      titulo: `⚠️ Stock bajo mínimo: ${datosParaNotificar.material}`,
      mensaje: `Quedan ${datosParaNotificar.metrosDisponibles.toFixed(1)} m de ${datosParaNotificar.material}${datosParaNotificar.espesor ? ` ${datosParaNotificar.espesor}mm` : ''} (mínimo configurado: ${datosParaNotificar.stockMinimo} m).`,
      leida: false,
    },
  }).catch(() => {});
}
```

**Nota de implementación:** La variable `newMetrosDisponibles` debe ser accesible fuera del bloque `$transaction`. Actualmente está declarada dentro del callback de `db.$transaction`, por lo que será necesario moverla fuera del scope de la transacción o usar un flag/closure. El patrón más limpio es declarar `let stockParaNotificar = null` antes de `db.$transaction`, asignarlo dentro, y usarlo fuera.

---

### BUG-02 — MEDIO · `handleSendReminder` envía `...quote` directamente al endpoint PUT sin verificar res.ok

**Archivo:** `src/app/presupuestos/[id]/page.js`, líneas 210–214

```js
// Código actual — líneas 210-214
// Actualizar ultimoRecordatorio
await fetch(`/api/presupuestos/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...quote, ultimoRecordatorio: new Date().toISOString() }),
});
```

El objeto `quote` que llega del hook SWR contiene campos que NO forman parte del schema Zod del endpoint PUT (`presupuestoSchema` en `src/lib/validations.js`). El schema del PUT espera: `clienteId`, `items`, `estado`, `marginId`, `subtotal`, `tax`, `total`, `notas`. El objeto `quote` contiene además: `cliente` (objeto expandido), `pedido`, `numero`, `fechaCreacion`, `ultimoRecordatorio`, etc.

Adicionalmente, `ultimoRecordatorio` **no está en el schema Zod del PUT**, por lo que la propiedad se ignorará silenciosamente (o rechazará con 400 si el schema usa `.strict()`). Peor aún: no hay comprobación de `res.ok` en esta llamada, por lo que un fallo pasa completamente desapercibido para el usuario.

Hay dos problemas independientes:
1. La llamada `fetch` no comprueba `res.ok` — si falla, `ultimoRecordatorio` no se actualiza pero el usuario ve el mensaje de éxito del email.
2. El spread `{ ...quote }` incluye campos que el endpoint no espera.

**Corrección sugerida:** Enviar solo los campos que el endpoint PUT realmente espera y verificar el resultado:

```js
// En lugar de { ...quote, ultimoRecordatorio: ... }
const putRes = await fetch(`/api/presupuestos/${id}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clienteId: quote.clienteId,
    items: quote.items?.map(i => ({
      descripcion: i.descripcion,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      productoId: i.productoId,
      pesoUnitario: i.pesoUnitario,
    })),
    estado: quote.estado,
    marginId: quote.marginId,
    subtotal: Number(quote.subtotal),
    tax: Number(quote.tax),
    total: Number(quote.total),
    notas: quote.notas,
    ultimoRecordatorio: new Date().toISOString(),
  }),
});
if (!putRes.ok) {
  console.warn('No se pudo actualizar ultimoRecordatorio:', await putRes.text());
}
```

O, mejor aún, encapsular la actualización de `ultimoRecordatorio` en el propio endpoint de email (`POST /api/presupuestos/${id}/email`) para que se actualice en el servidor sin requerir un PUT adicional desde el cliente.

**Nota:** `ultimoRecordatorio` no aparece en el schema `presupuestoSchema` actual. Para que el fix funcione completamente, hay que añadirlo al schema Zod en `src/lib/validations.js` y al `tx.presupuesto.update()` en la ruta PUT.

---

### BUG-03 — BAJO · `setMaxQuantity` usa `prev.disponible` en lugar de `prev.disponibleMetros`

**Archivo:** `src/app/almacen/stock/page.js`, línea 83–85

```js
// Código actual — línea 83
const setMaxQuantity = () => {
  setWithdrawalData(prev => ({ ...prev, cantidad: prev.disponible.toFixed(2) }));
};
```

El estado `withdrawalData` se inicializa en `openWithdrawalModal` con la propiedad `disponibleMetros` (línea 33), no `disponible`:

```js
// Líneas 28-36 — inicialización correcta del estado
setWithdrawalData({
  stockId: item.id,
  material: item.material,
  espesor: item.espesor,
  cantidad: '',
  disponibleMetros: item.metrosDisponibles || 0,  // <-- la propiedad correcta es disponibleMetros
  referencia: `Salida para Material: ${item.material} ${item.espesor}mm`
});
```

Al llamar a `prev.disponible`, el resultado es `undefined`, y `.toFixed(2)` sobre `undefined` lanza `TypeError: Cannot read properties of undefined (reading 'toFixed')`.

El botón "Baja Total" en la línea 262 usa la referencia correcta directamente en su handler inline:
```js
// Línea 262 — inline handler correcto
onClick={() => setWithdrawalData(prev => ({ ...prev, cantidad: prev.disponibleMetros }))}
```

La función `setMaxQuantity` está definida pero actualmente no se conecta a ningún botón en el JSX. Aun así, el bug es real y romperá si se conecta en el futuro.

**Corrección:**

```js
const setMaxQuantity = () => {
  setWithdrawalData(prev => ({ ...prev, cantidad: prev.disponibleMetros.toFixed(2) }));
};
```

---

### BUG-04 — BAJO · `Promise.all` en `analisis-rentabilidad` puede silenciar errores individuales de bobinas

**Archivo:** `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js`, líneas 31–92

```js
// Código actual — líneas 31-92
const resultados = await Promise.all(
  bobs
    .filter(b => b.tipo === 'BOBINA' || !b.tipo)
    .map(async (b) => {
      // ...
      if (material && espesor) {
        tarifaActual = await db.tarifaRollo.findFirst({
          where: {
            material: { contains: material },
            espesor,
            ...(ancho ? { ancho } : {}),
          },
          orderBy: { espesor: 'asc' },
        });
      }
      // ...
    })
);
```

Si `db.tarifaRollo.findFirst(...)` lanza una excepción para una bobina concreta (p.ej. problema transitorio de BD, tipo inesperado en `espesor`), el `Promise.all` completo rechazará y el endpoint devolverá 500, aunque solo una de las 20 bobinas haya fallado. Esto penaliza innecesariamente al usuario que intenta ver el análisis de las bobinas restantes.

**Corrección sugerida:** Usar `Promise.allSettled` y manejar los rechazos por bobina:

```js
const settled = await Promise.allSettled(
  bobs
    .filter(b => b.tipo === 'BOBINA' || !b.tipo)
    .map(async (b) => { /* ... mismo código ... */ })
);

const resultados = settled.map((r, i) =>
  r.status === 'fulfilled'
    ? r.value
    : {
        referencia: `Bobina ${i + 1}`,
        semaforo: 'gris',
        error: true,
        metros: 0,
        costeRealM: 0,
        precioVentaM: null,
        margenRealPct: null,
        precioMinimo: null,
      }
);
```

---

### BUG-05 — BAJO · Item inicial de `FormularioPedidoCliente` no incluye `costoUnitario`

**Archivo:** `src/componentes/pedidos/FormularioPedidoCliente.js`, línea 41

```js
// Código actual — línea 41
|| [{ id: Date.now(), descripcion: '', quantity: 1, unitPrice: 0, productoId: null }]
```

Los items añadidos con `addItem()` más adelante en el componente incluyen `costoUnitario: 0`, pero el item por defecto al montar el componente no. Esto no provoca un crash (el useMemo defensivo usa `parseFloat(item.costoUnitario) || 0`), pero genera una inconsistencia de shape entre el primer ítem y los añadidos manualmente.

**Corrección:**

```js
|| [{ id: Date.now(), descripcion: '', quantity: 1, unitPrice: 0, costoUnitario: 0, productoId: null }]
```

---

## 5. Hallazgos de BACKEND

### BACK-01 — MEDIO · N+1 queries en `analisis-rentabilidad` (una query por bobina)

**Archivo:** `src/app/api/importaciones/[id]/analisis-rentabilidad/route.js`, líneas 54–64

El `map` async con `Promise.all` ejecuta una query `db.tarifaRollo.findFirst(...)` por cada bobina del contenedor:

```js
// Código actual — el problema está aquí, dentro del .map():
let tarifaActual = null;
if (material && espesor) {
  tarifaActual = await db.tarifaRollo.findFirst({
    where: {
      material: { contains: material },
      espesor,
      ...(ancho ? { ancho } : {}),
    },
    orderBy: { espesor: 'asc' },
  });
}
```

Un contenedor típico de 20-30 bobinas genera 20-30 queries paralelas a la tabla `tarifaRollo`. Aunque `Promise.all` las ejecuta concurrentemente, cada una es un round-trip a la BD que podría resolverse con una sola query previa.

**Corrección sugerida:** Pre-cargar todas las tarifas relevantes en una sola query antes del `map` y buscar en memoria:

```js
// Antes del Promise.all/map, obtener los espesores únicos de las bobinas
const uniqueEspesores = [
  ...new Set(
    bobs
      .filter(b => b.tipo === 'BOBINA' || !b.tipo)
      .map(b => parseFloat(b.espesor) || null)
      .filter(Boolean)
  ),
];

// Una sola query para todas las tarifas con esos espesores
const todasTarifas = uniqueEspesores.length > 0
  ? await db.tarifaRollo.findMany({
      where: { espesor: { in: uniqueEspesores } },
    })
  : [];

// Dentro del .map(), buscar en memoria en lugar de hacer una query:
const tarifaActual = (material && espesor)
  ? todasTarifas.find(t =>
      t.espesor === espesor &&
      t.material.toUpperCase().includes(material) &&
      (!ancho || t.ancho === ancho)
    ) ?? null
  : null;
```

---

### BACK-02 — BAJO · `analisis-precios` con `take: 500` sin indicador de truncamiento

**Archivo:** `src/app/api/pedidos-proveedores-data/analisis-precios/route.js`, líneas 25–35 y 75

```js
// Código actual
const pedidos = await db.pedidoProveedor.findMany({
  where: { material: { contains: material } },
  // ...
  take: 500,
});
// ...
return NextResponse.json({ material, proveedores: result });
```

Los 500 pedidos se cargan en memoria, se iteran y se devuelven todos los `puntos` en la respuesta. El límite `take: 500` está, pero no hay paginación ni cursor, y si los datos superan 500 registros los resultados quedarán truncados sin que el cliente lo sepa.

**Mejora sugerida:** Añadir un flag `truncated` en la respuesta:

```js
const total = await db.pedidoProveedor.count({
  where: { material: { contains: material } },
});
// ... findMany con take: 500 ...
return NextResponse.json({ material, proveedores: result, truncated: total > 500 });
```

---

### BACK-03 — BAJO · `Math.min(...arr)` / `Math.max(...arr)` con spread puede fallar con arrays grandes

**Archivo:** `src/app/api/pedidos-proveedores-data/analisis-precios/route.js`, líneas 70–71

```js
// Código actual
precioMin: parseFloat(Math.min(...p.puntos.map(x => x.precioMetro)).toFixed(4)),
precioMax: parseFloat(Math.max(...p.puntos.map(x => x.precioMetro)).toFixed(4)),
```

JavaScript tiene un límite en el número de argumentos de una función (`~65536` en V8). Con el `take: 500` de pedidos y múltiples bobinas por pedido, los `p.puntos` de un proveedor activo podrían exceder ese límite en el largo plazo.

**Corrección robusta:**

```js
precioMin: parseFloat(
  p.puntos.reduce((m, x) => Math.min(m, x.precioMetro), Infinity).toFixed(4)
),
precioMax: parseFloat(
  p.puntos.reduce((m, x) => Math.max(m, x.precioMetro), -Infinity).toFixed(4)
),
```

---

## 6. Hallazgos de API

### API-01 — MEDIO · `ultimoRecordatorio` no está en el schema Zod del endpoint PUT de presupuestos

**Archivo:** `src/app/api/presupuestos/[id]/route.js`, líneas 38–42

El endpoint PUT valida el body con `presupuestoSchema.safeParse(body)` y luego extrae los campos válidos:

```js
// Código actual — línea 42
const { clienteId, items, estado, marginId, subtotal, tax, total } = parsed.data;
// 'ultimoRecordatorio' no se extrae aquí y no está en el schema
```

El schema Zod no incluye `ultimoRecordatorio`, por lo que la propiedad se descarta silenciosamente. El campo tampoco se pasa al `tx.presupuesto.update()`. Esto hace que el fix de BUG-02 sea incompleto hasta que también se actualice el schema y la ruta.

**Corrección requerida para que BUG-02 funcione:**

```js
// En src/lib/validations.js — añadir al presupuestoSchema:
ultimoRecordatorio: z.string().datetime().optional().nullable(),

// En src/app/api/presupuestos/[id]/route.js — extraer y usar:
const { clienteId, items, estado, marginId, subtotal, tax, total, ultimoRecordatorio } = parsed.data;
// ...
const quote = await tx.presupuesto.update({
  where: { id },
  data: {
    clienteId,
    estado,
    marginId,
    notas: finalNotes,
    subtotal,
    tax,
    total,
    ...(ultimoRecordatorio !== undefined ? { ultimoRecordatorio } : {}),
  },
});
```

---

### API-02 — BAJO · Listado de materiales en `analisis-precios` sin límite

**Archivo:** `src/app/api/pedidos-proveedores-data/analisis-precios/route.js`, líneas 15–21

```js
// Código actual — sin take
const materiales = await db.pedidoProveedor.findMany({
  distinct: ['material'],
  select: { material: true },
  orderBy: { material: 'asc' },
});
```

No hay `take` en esta query de listado. Si hay cientos de materiales distintos en BD, se devuelven todos. Añadir `take: 200` evita payloads innecesariamente grandes.

---

## 7. Hallazgos de FRONTEND

### FRONT-01 — BAJO · `comparativa-proveedores` no muestra error cuando `listaMateriales` falla

**Archivo:** `src/app/herramientas/comparativa-proveedores/page.js`, línea 20

```js
// Código actual
const { data: listaMateriales } = useSWR('/api/pedidos-proveedores-data/analisis-precios', fetcher);
```

No se desestructura `error` de este hook. Si la carga de materiales falla (timeout, 500), el selector simplemente queda vacío sin feedback al usuario. El hook de datos para el material seleccionado sí maneja el error (línea 23-26), pero el de la lista de materiales no.

**Corrección:**

```js
const { data: listaMateriales, error: materialesError } = useSWR(
  '/api/pedidos-proveedores-data/analisis-precios', fetcher
);
// Y en el JSX:
{materialesError && (
  <div className="alert alert-warning">No se pudieron cargar los materiales disponibles.</div>
)}
```

---

### FRONT-02 — BAJO · `analisis-rentabilidad/page.js` — hook carga todas las importaciones sin filtro

**Archivo:** `src/app/herramientas/analisis-rentabilidad/page.js`, línea 22

```js
const { data: importaciones } = useSWR('/api/importaciones', fetcher);
```

El hook carga todas las importaciones sin filtro. Esto es coherente con el modelo de acceso PIN-global del proyecto (no hay roles de usuario). Se documenta porque en el futuro, si se añade multi-tenant, esta pantalla sería el primer punto a revisar.

**Sin cambio requerido** en el diseño actual. Anotación para futura escalabilidad.

---

### FRONT-03 — BAJO · El spread `Math.min(...arr)` de BACK-03 no afecta al frontend

**Archivo:** `src/app/herramientas/comparativa-proveedores/page.js`

El frontend recibe `precioMin` y `precioMax` pre-calculados en la respuesta del API y los usa directamente (`p.precioMin`, `p.precioMax`). No aplica ningún spread problemático sobre arrays. El riesgo está contenido en BACK-03.

**Sin cambio requerido en frontend.**

---

## 8. Puntos positivos — Lo que está bien hecho

1. **Try-catch correcto en todos los handlers nuevos.** Los dos endpoints nuevos (`analisis-rentabilidad/route.js` y `analisis-precios/route.js`) tienen try-catch completo con `logApiError` — siguen el patrón establecido en el proyecto.

2. **`analisis-rentabilidad` es solo lectura y lo documenta explícitamente.** El comentario `// Solo lectura — no modifica ningún dato` en la línea 9 del route y el label en la UI son buenas prácticas de comunicación. Elimina dudas de cara a auditorías o mantenedores nuevos.

3. **El fix de la transacción atómica en `almacen-stock/route.js` está bien implementado.** La transacción atómica para la operación de salida, con `e.isUserError = true` para distinguir errores de dominio de errores de servidor, es un patrón correcto y limpio. La elección de 422 (Unprocessable Entity) en lugar de 400 para "stock insuficiente" es semánticamente correcta.

4. **`analisis-precios` agrupa correctamente por proveedor y calcula estadísticas útiles.** El pipeline de agrupación (map por proveedor, cálculo de media/min/max, ordenado por precio) es legible y correcto en la lógica de negocio. El retorno de `puntos` permite al frontend construir un gráfico de evolución temporal.

5. **`FormularioPedidoCliente.js` — carga lazy de productos.** La línea 69 usa `productSearchState.isOpen` como condición del SWR para no cargar los productos en cada montaje del formulario — excelente optimización de rendimiento que evita llamadas innecesarias.

6. **`comparativa-proveedores/page.js` — el gráfico solo se renderiza cuando hay datos suficientes.** La condición `chartData.length > 1` antes de renderizar el `LineChart` de Recharts evita un gráfico con un solo punto, que sería visualmente inútil y podría generar warnings de la librería.

7. **El semáforo de rentabilidad con 4 estados (verde/amarillo/rojo/gris) es claro y configurable.** El margen mínimo se lee de la tabla `Config` (`key: 'margen_minimo_alerta'`), lo que permite ajustar el umbral de alerta sin redespliegue — buen diseño operacional.

8. **`handleWithdrawalSubmit` valida la cantidad en el cliente antes de enviar.** Las líneas 92–99 de `almacen/stock/page.js` comprueban que la cantidad sea positiva y no supere el disponible antes de hacer la llamada al servidor, evitando viajes de red innecesarios con datos inválidos.

---

## 9. Plan de acción priorizado

| Prioridad | ID | Descripción | Esfuerzo estimado |
|-----------|-----|-------------|-------------------|
| P1 — Inmediato | BUG-01 | Notificación de stock mínimo silenciada cuando el stock se agota completamente | 30 min |
| P2 — Esta semana | BUG-02 + API-01 | `handleSendReminder` envía `...quote` sin check de res.ok + schema Zod no incluye `ultimoRecordatorio` (deben corregirse juntos) | 30 min |
| P2 — Esta semana | BACK-01 | N+1 queries en `analisis-rentabilidad` — pre-cargar tarifas en una sola query | 45 min |
| P2 — Esta semana | SEC-01 | Añadir rate limiting a los dos endpoints nuevos | 15 min |
| P3 — Próximo sprint | BUG-03 | `setMaxQuantity` usa `prev.disponible` en lugar de `prev.disponibleMetros` | 5 min |
| P3 — Próximo sprint | BUG-04 | `Promise.allSettled` en lugar de `Promise.all` para robustez por bobina | 20 min |
| P3 — Próximo sprint | BUG-05 | Añadir `costoUnitario: 0` al item inicial del formulario | 5 min |
| P3 — Próximo sprint | SEC-02 | Validar formato UUID del `id` en `analisis-rentabilidad` | 10 min |
| P3 — Próximo sprint | SEC-03 | Validar longitud máxima del parámetro `material` | 10 min |
| P3 — Próximo sprint | BACK-03 | Reemplazar `Math.min/max(...arr)` con `reduce` en `analisis-precios` | 10 min |
| P4 — Backlog | BACK-02 | Añadir flag `truncated` en respuesta de `analisis-precios` | 15 min |
| P4 — Backlog | API-02 | Añadir `take: 200` al listado de materiales | 5 min |
| P4 — Backlog | FRONT-01 | Manejo de error en carga de `listaMateriales` en `comparativa-proveedores` | 10 min |

**Esfuerzo total estimado P1+P2:** ~2 horas
**Esfuerzo total estimado P3:** ~1 hora
**Esfuerzo total backlog:** ~30 minutos

---

## 10. Inventario completo de hallazgos

| ID | Severidad | Área | Archivo principal | Líneas | Estado |
|----|-----------|------|-------------------|--------|--------|
| SEC-01 | MEDIO | Seguridad | `analisis-rentabilidad/route.js`, `analisis-precios/route.js` | — | ✅ corregido 2026-06-08 |
| SEC-02 | BAJO | Seguridad | `analisis-rentabilidad/route.js` | 12 | ✅ corregido 2026-06-08 |
| SEC-03 | BAJO | Seguridad | `analisis-precios/route.js` | 11–13 | ✅ corregido 2026-06-08 |
| BUG-01 | ALTO | Bug | `almacen-stock/route.js` | 90–113 | ✅ corregido 2026-06-08 |
| BUG-02 | MEDIO | Bug | `presupuestos/[id]/page.js` | 210–214 | ✅ corregido 2026-06-08 |
| BUG-03 | BAJO | Bug | `almacen/stock/page.js` | 83–85 | ✅ corregido 2026-06-08 |
| BUG-04 | BAJO | Bug | `analisis-rentabilidad/route.js` | 31–92 | ✅ corregido 2026-06-08 |
| BUG-05 | BAJO | Bug | `FormularioPedidoCliente.js` | 41 | ✅ corregido 2026-06-08 |
| BACK-01 | MEDIO | Backend | `analisis-rentabilidad/route.js` | 54–64 | ✅ corregido 2026-06-08 |
| BACK-02 | BAJO | Backend | `analisis-precios/route.js` | 25–35 | ✅ corregido 2026-06-08 |
| BACK-03 | BAJO | Backend | `analisis-precios/route.js` | 70–71 | ✅ corregido 2026-06-08 |
| API-01 | MEDIO | API | `presupuestos/[id]/route.js` + `validations.js` | 38–42 | ✅ corregido 2026-06-08 |
| API-02 | BAJO | API | `analisis-precios/route.js` | 15–21 | ✅ corregido 2026-06-08 |
| FRONT-01 | BAJO | Frontend | `comparativa-proveedores/page.js` | 20 | ✅ corregido 2026-06-08 |
| FRONT-02 | BAJO | Frontend | `analisis-rentabilidad/page.js` | 22 | Informativo / Sin cambio requerido |
| FRONT-03 | BAJO | Frontend | `comparativa-proveedores/page.js` | — | Cerrado / No aplica |
