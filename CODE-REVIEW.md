# Code Review — CRM Taller / Control de Almacén
> 2026-06-01 · Backend · Lógica · Bugs · Calidad · 84 archivos nuevos/modificados analizados

## Resumen
**Archivos analizados:** 84 (pull del 2026-06-01)  
**Hallazgos:** 13 total (2 confirmados, 4 probables, 4 potenciales, 3 calidad)

| Categoría | 🔴 Confirmado | 🟠 Probable | 🟡 Potencial | 🟢 OK |
|-----------|--------------|-------------|--------------|-------|
| Bugs lógica | 2 | 1 | 0 | — |
| Manejo errores | 0 | 3 | 2 | — |
| Validación input | 0 | 1 | 1 | — |
| Arquitectura/Calidad | 0 | 0 | 3 | — |

---

## 🔴 Bugs Confirmados

### [BUG-01] `FormularioProductoInteligente` — error de notificación enmascara guardado exitoso
**Archivo:** `src/componentes/productos/FormularioProductoInteligente.js` líneas 134–148  
**Problema:** La creación de producto y la notificación están en el mismo bloque `try`. Si el `await fetch('/api/notificaciones', ...)` lanza un error de red, el `catch` exterior muestra "Error al guardar" — pero el producto **ya fue guardado exitosamente**. El padre (`onGuardado`) nunca se invoca y el usuario cree que el producto no se creó.  
**Se dispara cuando:** La red falla puntualmente al crear la notificación pero el servidor de productos ya respondió 201.  
**Corrección:**
```js
// ❌ Actual — misma try para producto y notificación
const saved = await res.json();
if (!tarifaEncontrada && form.material) {
  await fetch('/api/notificaciones', { ... }); // si esto falla → catch dice "Error al guardar"
}
if (onGuardado) onGuardado(saved);

// ✅ Corrección — aislar la notificación
const saved = await res.json();
if (!tarifaEncontrada && form.material) {
  fetch('/api/notificaciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  }).catch(() => {}); // fire-and-forget: no bloquea ni enmascara el guardado
}
if (onGuardado) onGuardado(saved);
```

---

### [BUG-02] `FormularioProductoInteligente` — UI atascada en "cargando" si falla el fetch de opciones
**Archivo:** `src/componentes/productos/FormularioProductoInteligente.js` líneas 56–73 y 78–94  
**Problema:** `handleMaterialChange` y `handleEspesorChange` llaman a `setCargando(true)` pero no tienen `try/catch`. Si el `fetch('/api/tarifas-material-opciones?...')` lanza (timeout, red caída), `setCargando(false)` nunca se ejecuta — el spinner gira indefinidamente y los selectores de espesor/color quedan bloqueados.  
**Se dispara cuando:** La red está lenta o el servidor no responde al cambiar el material o espesor en el formulario.  
**Corrección:**
```js
// ❌ Actual — sin try/catch
const handleMaterialChange = useCallback(async (material) => {
  // ...
  setCargando(true);
  const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(material)}`);
  const d = await r.json();
  setOpciones(prev => ({ ...prev, espesores: d.espesores ?? [] }));
  setCargando(false); // ← nunca llega si fetch lanza
}, []);

// ✅ Corrección
const handleMaterialChange = useCallback(async (material) => {
  // ...
  setCargando(true);
  try {
    const r = await fetch(`/api/tarifas-material-opciones?material=${encodeURIComponent(material)}`);
    const d = await r.json();
    setOpciones(prev => ({ ...prev, espesores: d.espesores ?? [] }));
  } catch {
    // red caída — simplemente no hay espesores
  } finally {
    setCargando(false);
  }
}, []);
```
Aplicar el mismo patrón a `handleEspesorChange`.

---

## 🟠 Bugs Probables

### [BUG-03] `historico-bobinas` — división por cero produce `NaN` en `variacionPct`
**Archivo:** `src/app/api/importaciones/historico-bobinas/route.js` línea 77  
**Problema:** Si `datos[0].usdPorMetro === 0` (primera importación con precio cero), la expresión `(... / datos[0].usdPorMetro * 100)` produce `Infinity`, `NaN.toFixed(1)` devuelve `"NaN"`, y `parseFloat("NaN")` → `NaN`. `JSON.stringify` convierte `NaN` a `null` silenciosamente — el frontend recibe `variacionPct: null` sin saber por qué.  
**Corrección:**
```js
// ❌ Actual
variacionPct: datos.length >= 2
  ? parseFloat(((datos[datos.length - 1].usdPorMetro - datos[0].usdPorMetro) / datos[0].usdPorMetro * 100).toFixed(1))
  : 0,

// ✅ Corrección
variacionPct: (() => {
  if (datos.length < 2 || datos[0].usdPorMetro === 0) return 0;
  return parseFloat(((datos[datos.length - 1].usdPorMetro - datos[0].usdPorMetro) / datos[0].usdPorMetro * 100).toFixed(1));
})(),
```

---

### [BUG-04] `DELETE /api/tarifas-cliente` — cuerpo en petición DELETE puede ser eliminado por proxies
**Archivo:** `src/app/api/tarifas-cliente/route.js` línea 85  
**Problema:** `const { id } = await request.json()` en un handler DELETE lee el cuerpo de la petición. El RFC 7231 permite cuerpo en DELETE, pero muchos proxies corporativos, balanceadores y CDNs lo descartan. Si el cuerpo llega vacío, `request.json()` lanza, el catch devuelve 500 en lugar de 400, y la tarifa no se borra.  
**Corrección:**
```js
// ❌ Actual — body en DELETE
export async function DELETE(request) {
  const { id } = await request.json();
  // ...
}

// ✅ Corrección — mover el id a query param
// Cliente llama: DELETE /api/tarifas-cliente?id=xxx
export async function DELETE(request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  // ...
}
```

---

### [BUG-05] `CampanaNotificaciones` — acciones sin verificar `res.ok` → fallos silenciosos
**Archivo:** `src/componentes/ui/CampanaNotificaciones.js` líneas 38–46  
**Problema:** `marcarLeida`, `marcarTodasLeidas` y `eliminar` llaman `await fetch(...)` y luego `mutate(...)` sin comprobar si la petición tuvo éxito. Si el servidor devuelve 500 o la red falla, el componente refresca los datos como si todo fuera bien — el badge de no leídas puede mostrar datos incorrectos.  
**Corrección:**
```js
// ❌ Actual
async function marcarLeida(id) {
  await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
  mutate('/api/notificaciones');
}

// ✅ Corrección
async function marcarLeida(id) {
  const res = await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
  if (res.ok) mutate('/api/notificaciones');
}
```
Aplicar el mismo patrón a `marcarTodasLeidas` y `eliminar`.

---

### [BUG-06] `carta-porte/route.js` — POST sin validación de entrada
**Archivo:** `src/app/api/herramientas/carta-porte/route.js` línea 7  
**Problema:** `const datos = await request.json()` se pasa directamente a `generarCartaPortePDF(datos)` sin ningún schema Zod. Si `datos` llega con campos faltantes o tipos incorrectos, el generador PDF lanza un error interno que puede exponer stack traces. Además, no hay límite de tamaño en el input.  
**Corrección:**
```js
// Añadir validación mínima antes de generar el PDF
const cartaPorteSchema = z.object({
  expedidor: z.object({ nombre: z.string().min(1), direccion: z.string() }).passthrough(),
  destinatario: z.object({ nombre: z.string().min(1) }).passthrough(),
  mercancias: z.array(z.object({ descripcion: z.string().min(1) })).min(1),
  detalles: z.object({}).passthrough().optional(),
  pales: z.array(z.object({})).optional(),
});
const parsed = cartaPorteSchema.safeParse(datos);
if (!parsed.success) return NextResponse.json({ message: 'Datos inválidos' }, { status: 400 });
```

---

## 🟡 Bugs Potenciales / Casos Borde

### [BUG-07] Múltiples `fetcher` locales sin `res.ok` — errores de API tratados como datos válidos
**Archivos:**
- `src/app/gestion/clientes/[id]/page.js` línea 10
- `src/app/herramientas/calculadora-contenedor/page.js` línea 6
- `src/app/herramientas/carta-porte/page.js` línea 8
- `src/componentes/admin/LogViewer.js` línea 11
- `src/componentes/presupuestos/TemplateManager.js` línea 6

**Problema:** Todos usan `const fetcher = url => fetch(url).then(r => r.json())` — si la API devuelve un 500 con `{ error: "..." }`, SWR trata ese objeto como datos válidos en lugar de lanzar. La pantalla puede mostrar `{ error: "..." }` como si fuera el contenido real.  
**Corrección:** Importar el fetcher global que ya existe:
```js
// ❌ Actual — fetcher local sin check de res.ok
const fetcher = url => fetch(url).then(r => r.json());

// ✅ Corrección — usar el fetcher global
import { fetcher } from '@/lib/fetcher';
```

---

### [BUG-08] `TablaConSeleccion` — `<a>` de descarga CSV no se añade al DOM (falla en Firefox)
**Archivo:** `src/componentes/compuestos/TablaConSeleccion.jsx` líneas 34–42  
**Problema:** Se crea un `<a>` con `document.createElement('a')` y se llama a `a.click()` sin añadirlo al DOM. En Chrome funciona, en Firefox requiere que el elemento esté adjunto al `document` para disparar el click programático.  
**Corrección:**
```js
// ✅ Corrección — añadir al DOM antes del click
const a = document.createElement('a');
a.href = url;
a.download = `${nombre}-${new Date().toISOString().slice(0, 10)}.csv`;
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
URL.revokeObjectURL(url);
```

---

### [BUG-09] `handleCargarImportacion` — `catch {}` vacío oculta fallos de parseo silenciosamente
**Archivo:** `src/app/herramientas/calculadora-contenedor/page.js` línea 254  
**Problema:** El `try { ... } catch {}` vacío significa que si `JSON.parse(imp.bobinas)` falla (datos corruptos en DB), o si algún `setState` lanza, el usuario pulsa "Cargar" y no pasa absolutamente nada — sin error, sin feedback.  
**Corrección:**
```js
// ❌ Actual
const handleCargarImportacion = (imp) => {
  try {
    const bobs = JSON.parse(imp.bobinas);
    setBobinas(bobs.map((b, i) => ({ ...b, id: i + 1 })));
    // ...
  } catch {}
};

// ✅ Corrección
const handleCargarImportacion = (imp) => {
  try {
    const bobs = typeof imp.bobinas === 'string' ? JSON.parse(imp.bobinas) : imp.bobinas;
    if (!Array.isArray(bobs)) throw new Error('Formato de bobinas inválido');
    setBobinas(bobs.map((b, i) => ({ ...b, id: i + 1 })));
    setTasaCambio(String(imp.tasaCambio));
    setSuplidos(String(imp.suplidos));
    setExentos(String(imp.exentos));
    setSujetos(String(imp.sujetos));
  } catch (e) {
    alert('No se pudieron cargar los datos de esta importación.');
  }
};
```

---

## ⚙️ Arquitectura y Calidad

### [CODE-01] `FormularioProductoInteligente.js` — 200+ líneas mezclando cascada UI + API + submit + notificaciones
**Severidad:** Medio  
**Archivo:** `src/componentes/productos/FormularioProductoInteligente.js`  
**Problema:** El componente hace cuatro cosas a la vez: (1) cascada de selectores material→espesor→color con fetch en cada paso, (2) cálculo de precio por área, (3) submit al API de productos, (4) creación de notificación. Cada responsabilidad debería estar separada para poder testear y mantener individualmente.  
**Mejora propuesta:** Extraer la lógica de cascada a un custom hook `useTarifaCascade(material, espesor)` que devuelva `{ espesores, colores, tarifa, cargando }`.

---

### [CODE-02] `GET /api/articulos-simples` — findMany sin `take` limit
**Severidad:** Bajo  
**Archivo:** `src/app/api/articulos-simples/route.js` línea 14  
**Problema:** `db.articuloSimple.findMany({ where: ... })` sin `take`. Si la tabla crece, una petición devuelve todos los registros sin límite — inconsistente con el patrón del resto de endpoints del proyecto.  
**Mejora:**
```js
// ❌ Actual
const articulos = await db.articuloSimple.findMany({ where: { ... }, orderBy: [...] });

// ✅ Corrección
const articulos = await db.articuloSimple.findMany({ where: { ... }, orderBy: [...], take: 500 });
```

---

### [CODE-03] `BusquedaGlobal.js` — `flatResults` recalculado en cada render sin `useMemo`
**Severidad:** Bajo  
**Archivo:** `src/componentes/ui/BusquedaGlobal.js` línea 43  
**Problema:** `const flatResults = results.map(r => ({ ...r, path: ... })).filter(...)` se recalcula en cada render. `flatResults` está en la dependency array del `useEffect` del teclado — cada render recrea el array (nueva referencia), lo que hace que el efecto se re-suscriba al teclado en cada render del modal de búsqueda.  
**Mejora:**
```js
// ❌ Actual — recalculado en cada render
const flatResults = results.map(r => ({ ...r, path: TYPE_CONFIG[r.type]?.getPath(r) })).filter(r => r.path);

// ✅ Corrección
const flatResults = useMemo(
  () => (results ?? []).map(r => ({ ...r, path: TYPE_CONFIG[r.type]?.getPath(r) })).filter(r => r.path),
  [results]
);
```

---

## 🗺️ Hoja de Ruta de Correcciones

| Prioridad | ID | Descripción | Esfuerzo | Hacer antes de |
|-----------|-----|-------------|----------|----------------|
| 1 | BUG-01 | Aislar notificación de producto con fire-and-forget | ~10min | deploy |
| 2 | BUG-02 | try/finally en handleMaterialChange y handleEspesorChange | ~15min | deploy |
| 3 | BUG-04 | DELETE tarifas-cliente → mover id a query param | ~20min | deploy |
| 4 | BUG-03 | Guard división por cero en variacionPct | ~5min | — |
| 5 | BUG-05 | Check res.ok en CampanaNotificaciones | ~10min | — |
| 6 | BUG-06 | Zod básico en carta-porte POST | ~30min | — |
| 7 | BUG-07 | Reemplazar fetchers locales con @/lib/fetcher | ~20min | — |
| 8 | BUG-08 | appendChild/removeChild en exportarCSV | ~5min | — |
| 9 | BUG-09 | Feedback visual en handleCargarImportacion | ~10min | — |
| 10 | CODE-02 | take: 500 en articuloSimples GET | ~5min | — |
| 11 | CODE-03 | useMemo para flatResults en BusquedaGlobal | ~5min | — |
| 12 | CODE-01 | Extraer useTarifaCascade hook | ~45min | (refactor) |

**Secuencia recomendada:**  
Corrige primero BUG-01 y BUG-02 (ambos en `FormularioProductoInteligente.js`, mismo archivo — un solo commit). Luego BUG-04 (requiere cambio coordinado en el frontend que llama al DELETE). BUG-03 es una sola línea, hacerlo junto con BUG-04. BUG-07 (fetchers locales) se puede hacer en un único commit de limpieza que toque los 5 archivos.
