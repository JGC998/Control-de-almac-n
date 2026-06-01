# Performance Review — CRM Taller / Control de Almacén
> 2026-06-01 · Análisis de rendimiento

## Resumen
**Hallazgos:** 10 (3 alto impacto, 4 medio, 3 bajo)

| Tipo | Cantidad | Impacto bajo carga |
|------|----------|--------------------|
| Queries DB evitables (caché/paralelo) | 4 | 🔴 Latencia acumulada por request |
| Async en serie → paralelo | 2 | 🟠 +100–300ms por llamada |
| Algoritmos ineficientes | 2 | 🟡 Riesgo con volumen grande |
| Frontend sin memoización | 2 | 🟡 Re-renders innecesarios |

---

## 🔴 Alto Impacto

### [OPT-01] `getEmisorInfo()` hace 2 queries DB en cada generación de PDF — sin caché
**Tipo:** Queries DB evitables  
**Archivo:** `src/lib/pdfGenerator.js` líneas 12–27  
**Problema:** `getEmisorInfo()` consulta `ConfiguracionEmisor` y `Config[empresa_telefono]` en cada llamada. Es invocada desde los cuatro generadores de PDF: `generateBudgetPDF`, `generateOrderPDF`, `generateFacturaPDF`, `generateAlbaranPDF`. El logo tiene caché en módulo (`_logoBase64`) pero la info de emisor no.  
**En producción:** Cada PDF generado = 2 queries extra a tablas de configuración que nunca cambian durante la sesión del servidor.  
**Ganancia estimada:** −2 queries por PDF, datos que cambian <1 vez/semana.

```js
// ❌ Actual — 2 queries en cada PDF
async function getEmisorInfo() {
  const [emisor, phoneConfig] = await Promise.all([
    db.configuracionEmisor.findUnique({ where: { id: 1 } }),
    db.config.findUnique({ where: { key: 'empresa_telefono' } }),
  ]);
  return { ... };
}

// ✅ Corrección — caché en módulo (igual que el logo)
let _emisorCache = null;
async function getEmisorInfo() {
  if (_emisorCache) return _emisorCache;
  try {
    const { db } = await import('@/lib/db');
    const [emisor, phoneConfig] = await Promise.all([
      db.configuracionEmisor.findUnique({ where: { id: 1 } }),
      db.config.findUnique({ where: { key: 'empresa_telefono' } }),
    ]);
    _emisorCache = {
      address: emisor?.direccion || '',
      phone:   phoneConfig?.value || '',
    };
    return _emisorCache;
  } catch {
    return { address: '', phone: '' };
  }
}
// Invalidar caché cuando se guarda configuración:
// En PUT /api/config → importar y llamar a clearEmisorCache() exportado desde pdfGenerator
```

---

### [OPT-02] `ventas-mensuales` con `comparar=true` — 2 queries anuales en serie
**Tipo:** Async en serie  
**Archivo:** `src/app/api/informes/route.js` líneas 52–59  
**Problema:** Cuando el usuario activa la comparativa de año anterior, `fetchYear(año)` y `fetchYear(año-1)` se ejecutan secuencialmente. Cada una lee hasta 10.000 pedidos del año. Son independientes y pueden ir en paralelo.  
**En producción:** 2× latencia de la query más lenta. Con 5.000 pedidos/año ≈ +200ms extra por request.  
**Ganancia estimada:** −50% del tiempo de respuesta cuando `comparar=true`.

```js
// ❌ Actual — en serie
const actual = await fetchYear(año);
if (comparar) {
  const anterior = await fetchYear(año - 1);
  // ...
}

// ✅ Corrección — en paralelo
const [actual, anterior] = comparar
  ? await Promise.all([fetchYear(año), fetchYear(año - 1)])
  : [await fetchYear(año), null];

if (comparar && anterior) {
  const anteriorMap = Object.fromEntries(anterior.map(d => [d.mes, d]));
  const merged = actual.map(d => ({ ...d, totalVentasAnterior: anteriorMap[d.mes]?.totalVentas ?? 0 }));
  return NextResponse.json({ data: merged, año, añoAnterior: año - 1 });
}
return NextResponse.json({ data: actual, año });
```

---

### [OPT-03] `logistica/calcular` — `configPaletizado` y `tarifaTransporte` en serie
**Tipo:** Async en serie  
**Archivo:** `src/app/api/logistica/calcular/route.js` líneas 78–109  
**Problema:** Las dos queries son independientes — la segunda no depende del resultado de la primera — pero se ejecutan secuencialmente. Además, `configPaletizado` tiene solo 2 registros (EUROPEO/MEDIO) y `tarifaTransporte` es la tabla de provincias. Ambas son candidatas a caché en módulo para el endpoint de cálculo que se llama en tiempo real.  
**En producción:** Cada cálculo logístico acumula latencias de 2 roundtrips DB. Con la calculadora de logística usada interactivamente por el operario, cada tecleado de provincia espera las 2 queries.  
**Ganancia estimada:** −50% tiempo de respuesta del endpoint (~50–100ms).

```js
// ❌ Actual — en serie
const configPale = await db.configPaletizado.findUnique({ where: { tipo: tipoPale } });
if (!configPale) { return 404; }
// ...
const tarifa = await db.tarifaTransporte.findFirst({ where: { provincia: provincia.toUpperCase() } });

// ✅ Corrección — en paralelo
const [configPale, tarifa] = await Promise.all([
  db.configPaletizado.findUnique({ where: { tipo: tipoPale } }),
  db.tarifaTransporte.findFirst({ where: { provincia: provincia.toUpperCase() } }),
]);
if (!configPale) return NextResponse.json({ error: `...` }, { status: 404 });
if (!tarifa) return NextResponse.json({ error: `...` }, { status: 404 });
```

---

## 🟠 Medio Impacto

### [OPT-04] Búsqueda global sin debounce — una petición por cada tecla
**Tipo:** Peticiones redundantes al servidor  
**Archivo:** `src/componentes/ui/BusquedaGlobal.js` líneas 33–39  
**Problema:** `queryUrl` se recalcula en cada render del componente. SWR hace una petición por cada URL única — es decir, por cada carácter tecleado que supere 2 caracteres. Para "aluminio" → 6 peticiones (al→alu→alum→alumi→alumin→alumini→aluminio). El `dedupingInterval: 300` solo deduplica la misma URL, no distintas.  
**En producción:** Una búsqueda de 8 caracteres genera 6 peticiones al servidor, las primeras 5 con resultados que nadie ve.  
**Ganancia estimada:** −70% de peticiones a `/api/busqueda`.

```js
// ❌ Actual — sin debounce
const queryUrl = query.trim().length >= 2 ? `/api/busqueda?q=${encodeURIComponent(query.trim())}` : null;
const { data: results = [] } = useSWR(queryUrl, { ... });

// ✅ Corrección — debounce de 250ms en el query
const [debouncedQuery, setDebouncedQuery] = useState('');
useEffect(() => {
  const t = setTimeout(() => setDebouncedQuery(query), 250);
  return () => clearTimeout(t);
}, [query]);
const queryUrl = debouncedQuery.trim().length >= 2
  ? `/api/busqueda?q=${encodeURIComponent(debouncedQuery.trim())}`
  : null;
const { data: results = [] } = useSWR(queryUrl, { ... });
```

---

### [OPT-05] `Math.min(...sorted)` / `Math.max(...sorted)` con spread en array potencialmente grande
**Tipo:** Algoritmo ineficiente — riesgo stack overflow  
**Archivo:** `src/app/api/clientes/[id]/historial-precios/route.js` líneas 47–48  
**Problema:** `Math.min(...sorted)` y `Math.max(...sorted)` usan spread para pasar el array como argumentos de función. Con arrays de miles de elementos (un cliente con historial largo), esto puede lanzar `RangeError: Maximum call stack size exceeded` porque los argumentos de función tienen un límite de pila.  
**En producción:** Un cliente con 5.000 pedidos y 50 líneas cada uno → `sorted` puede tener 250.000 entradas para un producto muy vendido. Crash silencioso.  
**Ganancia estimada:** Elimina riesgo de crash; `.reduce()` es también más eficiente para arrays grandes.

```js
// ❌ Actual — spread en array de tamaño desconocido
const min = Math.min(...sorted);
const max = Math.max(...sorted);

// ✅ Corrección — reduce() sin límite de pila
const min = sorted.reduce((m, v) => (v < m ? v : m), sorted[0]);
const max = sorted.reduce((m, v) => (v > m ? v : m), sorted[0]);
```

---

### [OPT-06] `presupuestos-sin-respuesta` sin `take` — puede devolver cientos de registros
**Tipo:** Query sin límite  
**Archivo:** `src/app/api/informes/route.js` líneas 193–207  
**Problema:** `db.presupuesto.findMany({ where: { estado: 'Enviado', fechaCreacion: { lte: limite } } })` sin `take`. Con el tiempo, un CRM con muchos presupuestos sin respuesta puede devolver cientos o miles de filas al dashboard.  
**En producción:** Con 500 presupuestos sin respuesta → 500 registros completos en memoria + transferencia al cliente.

```js
// ❌ Actual — sin take
const presupuestos = await db.presupuesto.findMany({
  where: { estado: 'Enviado', fechaCreacion: { lte: limite } },
  select: { id: true, numero: true, total: true, fechaCreacion: true, cliente: ... },
  orderBy: { fechaCreacion: 'asc' },
});

// ✅ Corrección
const presupuestos = await db.presupuesto.findMany({
  where: { estado: 'Enviado', fechaCreacion: { lte: limite } },
  select: { id: true, numero: true, total: true, fechaCreacion: true, cliente: { select: { id: true, nombre: true } } },
  orderBy: { fechaCreacion: 'asc' },
  take: 100, // los 100 más antiguos sin respuesta son suficientes para el dashboard
});
```

---

### [OPT-07] `gestion/productos/page.js` — filtrado de 200 productos sin `useMemo`
**Tipo:** Cálculo repetido en cada render  
**Archivo:** `src/app/gestion/productos/page.js` línea 18  
**Problema:** `const filtrados = productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()))` se recalcula en cada render del componente. Cuando se abre un modal, se actualiza cualquier estado, etc., se filtra el array de 200 productos de nuevo aunque ni `productos` ni `busqueda` hayan cambiado.  
**En producción:** Con 200 productos y renders frecuentes (apertura de modal, scroll, hover), el filtrado se ejecuta decenas de veces innecesariamente.  
**Ganancia estimada:** Cero recálculos cuando los inputs no cambian.

```js
// ❌ Actual — se recalcula en cada render
const filtrados = productos.filter(p =>
  p.nombre.toLowerCase().includes(busqueda.toLowerCase())
);

// ✅ Corrección — memoizado
const filtrados = useMemo(
  () => productos.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase())),
  [productos, busqueda]
);
```

---

## 🟢 Bajo Impacto

### [OPT-08] `reglaMargen.findMany()` repetido en 5+ endpoints sin caché
**Tipo:** Queries repetitivas en datos estáticos  
**Archivos:**
- `src/app/api/pricing/calculate/route.js` línea 19
- `src/app/api/clientes/[id]/resumen/route.js` línea 23
- `src/app/api/presupuestos/[id]/pdf/route.js` línea 24
- `src/app/api/presupuestos/[id]/email/route.js` línea 32
- `src/app/api/pricing/margenes/route.js` línea 11

**Problema:** Las reglas de margen son datos de configuración que cambian raramente. Cada request a pricing/calculate, generación de PDF o email lee todos los márgenes de la DB.  
**Ganancia estimada:** −1 query por cada llamada al motor de precios, PDF o email. Con alto volumen de presupuestos/PDFs, puede suponer decenas de queries evitadas.

```js
// Añadir en src/lib/db.js o en un nuevo src/lib/config-cache.js
let _margenesCache = null;
let _margenesCacheTs = 0;
const MARGENES_TTL = 5 * 60 * 1000; // 5 minutos

export async function getMargenes() {
  const now = Date.now();
  if (_margenesCache && now - _margenesCacheTs < MARGENES_TTL) return _margenesCache;
  _margenesCache = await db.reglaMargen.findMany();
  _margenesCacheTs = now;
  return _margenesCache;
}
// Invalidar al PUT /api/pricing/margenes: _margenesCache = null
```

---

### [OPT-09] `receive-order` — N inserciones de stock secuenciales en loop
**Tipo:** Async en serie dentro de transacción  
**Archivo:** `src/app/api/stock-management/receive-order/route.js` líneas 29–55  
**Problema:** El loop `for (const bobina of pedido.bobinas) { await tx.stock.create(...) }` crea un item de stock por bobina en serie. Un pedido con 20 bobinas hace 20 operaciones DB secuenciales dentro de la transacción.  
**En producción:** Con 20 bobinas = 20 roundtrips secuenciales. En MySQL (prod) esto es ~100ms adicionales frente a operaciones en paralelo.  
**Nota:** `createMany` no soporta relaciones anidadas (`movimientos: { create: ... }`), por lo que habría que separar en dos pasos o usar `Promise.all` dentro de la transacción (seguro en MySQL).

```js
// ❌ Actual — en serie
for (const bobina of pedido.bobinas) {
  await tx.stock.create({ data: { ..., movimientos: { create: { tipo: 'ENTRADA', ... } } } });
}

// ✅ Corrección — en paralelo (seguro en MySQL, NO usar en SQLite dev)
await Promise.all(pedido.bobinas.map(bobina =>
  tx.stock.create({ data: { ..., movimientos: { create: { tipo: 'ENTRADA', ... } } } })
));
```

---

### [OPT-10] `CampanaNotificaciones` — polling cada 30 segundos aunque no haya cambios
**Tipo:** Peticiones innecesarias  
**Archivo:** `src/componentes/ui/CampanaNotificaciones.js` línea 23  
**Problema:** `refreshInterval: 30000` hace una petición a `/api/notificaciones` cada 30 segundos para todos los usuarios con el CRM abierto. Si hay 5 usuarios en el CRM → 10 peticiones/minuto constantes.  
**Ganancia estimada:** Con `refreshWhenHidden: false`, el polling se detiene cuando la pestaña está en segundo plano, reduciendo peticiones a la mitad como mínimo.

```js
// ❌ Actual
const { data } = useSWR('/api/notificaciones', { refreshInterval: 30000 });

// ✅ Corrección — detener polling cuando la pestaña está oculta
const { data } = useSWR('/api/notificaciones', {
  refreshInterval: 30000,
  refreshWhenHidden: false,
  refreshWhenOffline: false,
});
```

---

## 🗺️ Hoja de Ruta

### Fase 1 — Máximo impacto (1–2h total)
- [ ] **OPT-01** — Caché en módulo para `getEmisorInfo()` · ~20min · −2 queries por cada PDF generado
- [ ] **OPT-02** — `fetchYear` en paralelo cuando `comparar=true` · ~10min · −50% latencia en informe comparativo
- [ ] **OPT-03** — `configPaletizado + tarifaTransporte` en paralelo · ~10min · −50% latencia en calculadora logística
- [ ] **OPT-04** — Debounce 250ms en `BusquedaGlobal` · ~20min · −70% peticiones a `/api/busqueda`

### Fase 2 — Mejoras medias (1h total)
- [ ] **OPT-05** — `Math.min/max` con `.reduce()` en historial-precios · ~10min · elimina riesgo crash con clientes grandes
- [ ] **OPT-06** — `take: 100` en presupuestos-sin-respuesta · ~5min · evita carga completa de la tabla
- [ ] **OPT-07** — `useMemo` en filtrado de productos · ~10min · cero recálculos innecesarios

### Fase 3 — Optimizaciones menores (1h total)
- [ ] **OPT-08** — Caché TTL 5min para `reglaMargen.findMany()` · ~30min · −1 query por PDF/email/cálculo
- [ ] **OPT-09** — `Promise.all` en receive-order para bobinas (solo MySQL prod) · ~20min · −N roundtrips por bobina
- [ ] **OPT-10** — `refreshWhenHidden: false` en CampanaNotificaciones · ~5min · −50% peticiones de polling

**Medir antes y después:** para OPT-01 a OPT-03, registrar el tiempo de respuesta de `/api/pedidos/[id]/pdf`, `/api/informes?tipo=ventas-mensuales&comparar=true` y `/api/logistica/calcular` antes y después del cambio.
