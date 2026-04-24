# Análisis del Proyecto — Control de Almacén
> Generado el 2026-04-23 | Rama: `feature/calculadora-pvc-v1`

---

## ÍNDICE
1. [Errores críticos (bloquean funcionalidad)](#1-errores-críticos)
2. [Errores de código ESLint](#2-errores-eslint)
3. [Bugs funcionales reportados](#3-bugs-funcionales)
4. [Ideas de mejora y rendimiento](#4-mejoras)
5. [Resumen de prioridades](#5-prioridades)

---

## 1. ERRORES CRÍTICOS

### 1.1 — `id: undefined` en APIs de email y PDF de Pedidos

**Archivo:** `src/app/api/pedidos/[id]/pdf/route.js`  
**Síntoma:** Al pulsar "Generar PDF" en un pedido, se lanza `PrismaClientValidationError` porque `id` llega como `undefined` a la query de Prisma.

```
Invalid `prisma.pedido.findUnique()` invocation: { where: { id: undefined } }
```

**Causa raíz:** El botón PDF o el componente que lo usa está pasando el `id` antes de que el dato esté disponible (render antes de cargar). La API tiene el guard `if (!id || id === 'undefined')` pero el string literal `'undefined'` puede no cubrir todos los casos.

**Solución:**
- En el componente que renderiza el botón PDF de pedido, asegurarse de que solo se muestra cuando `pedido.id` existe:
  ```jsx
  {pedido?.id && <PdfButton id={pedido.id} />}
  ```
- Reforzar la guard en la API para ser más explícita:
  ```js
  const { id } = await context.params;
  if (!id || id === 'undefined' || typeof id !== 'string') {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }
  ```

---

### 1.2 — `id: undefined` en API de email de Presupuestos

**Archivo:** `src/app/api/presupuestos/[id]/email/route.js`  
**Síntoma:** Al pulsar "Enviar Email" desde la vista de presupuesto, llega `id: undefined` a Prisma.

```
Invalid `prisma.presupuesto.findUnique()` invocation: { where: { id: undefined } }
```

**Causa raíz:** El componente `EmailButton` recibe `id` como prop desde el padre. Si la página renderiza el botón antes de que el presupuesto esté cargado, `id` es `undefined` y la URL construida es `/api/presupuestos/undefined/email`.

**Archivo del componente:** `src/componentes/presupuestos/EmailButton.js:14`

```js
const res = await fetch(`/api/presupuestos/${id}/email`, { ... });
// Si id es undefined → URL literal: /api/presupuestos/undefined/email
```

**Solución en EmailButton:**
```js
const handleSend = async () => {
    if (!id) { alert('Error: ID de presupuesto no disponible'); return; }
    // ... resto del código
};
```
**Solución en el padre:** No renderizar `<EmailButton>` hasta que el dato esté cargado.

---

### 1.3 — `applyTheme` accedida antes de ser declarada

**Archivo:** `src/componentes/ui/ProveedorTema.js:19`  
**Error ESLint:** `react-hooks/immutability` — Cannot access variable before it is declared

```js
// ❌ ACTUAL (línea 18-19): useEffect llama a applyTheme antes de declararla (línea 37)
useEffect(() => {
    if (saved) {
        applyTheme(saved);  // ← applyTheme no existe aún en este punto
    }
}, []);

const applyTheme = (theme) => { ... }; // ← declarada aquí, después del useEffect
```

**Solución:** Mover la declaración de `applyTheme` **antes** del `useEffect`, o convertirla en `useCallback` para que el compilador React pueda optimizarla:

```js
// ✅ CORRECTO: declararla primero
const applyTheme = useCallback((theme) => {
    setTheme(theme);
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
}, []);

useEffect(() => {
    if (saved) applyTheme(saved);
}, [applyTheme]);
```

---

### 1.4 — `useMemo` llamado condicionalmente

**Archivo:** `src/componentes/pedidos/ModalDetallePedidoProveedor.js:8`  
**Error ESLint:** `react-hooks/rules-of-hooks` — React Hook "useMemo" is called conditionally

**Este es un error grave.** Los hooks de React deben llamarse siempre en el mismo orden. Llamarlo dentro de un `if` o después de un `return` rompe las reglas de hooks y puede causar crashes en producción.

**Solución:** Mover el `useMemo` al inicio del componente, antes de cualquier `return` condicional. Si el valor depende de datos opcionales, que el propio `useMemo` devuelva `null` o un valor por defecto:

```js
// ✅ CORRECTO: siempre al inicio del componente
const valorCalculado = useMemo(() => {
    if (!data) return null;
    return /* cálculo */;
}, [data]);

if (!condicion) return null; // el return condicional va DESPUÉS de los hooks
```

---

## 2. ERRORES ESLINT

### 2.1 — `setState` dentro de `useEffect` (6 ocurrencias)

**Error:** `react-hooks/set-state-in-effect` — Calling setState synchronously within an effect can trigger cascading renders

| Archivo | Línea | Estado afectado |
|--------|-------|-----------------|
| `src/componentes/calculadoras/CalculadoraBandas.js` | 69 | `setSelectedEspesor` |
| `src/componentes/pedidos/FormularioPedidoCliente.js` | 20 | `setSearch` (ClienteSearchModal) |
| `src/componentes/pedidos/FormularioPedidoCliente.js` | 70 | `setSearch` (ProductSearchModal) |
| `src/componentes/pedidos/FormularioPedidoProveedor.js` | 19 | `setSearch` |
| `src/componentes/pedidos/FormularioPedidoProveedor.js` | 110 | `setSearch` |
| `src/app/gestion/documentos/page.js` | 22 | `setSearch` |
| `src/componentes/ui/BarraBusqueda.js` | 69 | `setIsDropdownOpen` |

**Patrón repetido (el mismo en casi todos):**
```js
// ❌ ACTUAL: setState dentro de useEffect
const [search, setSearch] = useState(initialSearch);
useEffect(() => { if (isOpen) setSearch(initialSearch); }, [isOpen, initialSearch]);

// ✅ SOLUCIÓN: usar `key` prop para resetear el estado al reabrir
// En el componente padre, pasar key={isOpen ? 'open' : 'closed'} al modal
// O usar initialState como función:
const [search, setSearch] = useState(() => initialSearch);
// Y cuando se necesite resetear, manejarlo en el onClose del padre
```

**Caso especial — BarraBusqueda.js:69:**
```js
// ❌ ACTUAL
useEffect(() => {
    setIsDropdownOpen(query.trim().length >= 2 && !!results && results.length > 0);
}, [query, results]);

// ✅ SOLUCIÓN: derivar como variable calculada (no necesita estado)
const isDropdownOpen = query.trim().length >= 2 && !!results && results.length > 0;
```

**Caso especial — CalculadoraBandas.js:69:**
```js
// ❌ ACTUAL
useEffect(() => { setSelectedEspesor(''); }, [selectedMaterial]);

// ✅ SOLUCIÓN: gestionar el reset en el handler de cambio de material
const handleMaterialChange = (nuevoMaterial) => {
    setSelectedMaterial(nuevoMaterial);
    setSelectedEspesor(''); // reset aquí, no en el effect
};
```

---

### 2.2 — Componente `Edit` no definido

**Archivo:** `src/app/gestion/productos/[id]/page.js:220`  
**Error:** `react/jsx-no-undef` — 'Edit' is not defined

Se usa `<Edit />` sin importarlo. Probablemente es el icono de lucide-react.

**Solución:**
```js
import { Edit } from 'lucide-react';
```

---

### 2.3 — HTML entities sin escapar (8 ocurrencias)

**Error:** `react/no-unescaped-entities` — Las comillas `"` dentro de JSX deben escaparse

| Archivo | Línea |
|--------|-------|
| `src/app/busqueda/page.js` | 65 |
| `src/app/gestion/documentos/page.js` | 83 |
| `src/componentes/modales/ModalCalculadoraBandas.js` | 25 |
| `src/componentes/pedidos/FormularioPedidoProveedor.js` | 77, 170 |

**Solución:** Reemplazar las comillas dobles dentro de texto JSX con `&quot;` o usar comillas simples en el texto:

```jsx
// ❌ ACTUAL
<p>Selecciona "material" del desplegable</p>

// ✅ OPCIÓN 1: escapar
<p>Selecciona &quot;material&quot; del desplegable</p>

// ✅ OPCIÓN 2: usar variables de texto
<p>{'Selecciona "material" del desplegable'}</p>
```

---

### 2.4 — `useCallback` con dependencias incorrectas en ModalConfirmacion

**Archivo:** `src/componentes/ui/ModalConfirmacion.jsx:142,147`  
**Error:** El compilador de React no puede preservar la memoización porque las dependencias declaradas manualmente (`[estado.resolver]`) no coinciden con las inferidas (`[estado]`).

```js
// ❌ ACTUAL: dependencia parcial
const handleConfirmar = React.useCallback(() => {
    estado.resolver?.(true);
    setEstado(prev => ({ ...prev, abierto: false }));
}, [estado.resolver]); // ← incompleto

// ✅ CORRECTO: dependencia completa
const handleConfirmar = React.useCallback(() => {
    estado.resolver?.(true);
    setEstado(prev => ({ ...prev, abierto: false }));
}, [estado]); // ← incluir el objeto completo
```

---

### 2.5 — `useEffect` con dependencia faltante

**Archivos:**
- `src/componentes/pedidos/FormularioPedidoProveedor.js:253` — falta `parseInitialData`
- `src/componentes/productos/FormularioProductoRapido.js:41` — falta `initialFormState`

**Solución:** Añadir las dependencias que indica ESLint, o si son funciones estáticas, envolverlas en `useCallback` para estabilizar su referencia.

---

### 2.6 — Uso de `<img>` en lugar de `<Image />`

**Archivo:** `src/app/fotos/page.js:144`  
**Advertencia:** Usar `<img>` nativo deshabilita la optimización automática de imágenes de Next.js (lazy loading, WebP, resize automático).

**Solución:**
```jsx
import Image from 'next/image';

// Reemplazar <img src={...} /> por:
<Image src={...} alt="..." width={800} height={600} />
```

---

## 3. BUGS FUNCIONALES

### 3.1 — Filtros de estado en Pedidos no funcionan

**Archivo:** `src/app/pedidos/page.js:40-44`

El filtro construye la query así:
```js
where.estado = {
    equals: estado,
    mode: 'insensitive',
};
```

`mode: 'insensitive'` en Prisma solo aplica a operadores de texto como `contains`, `startsWith`, `endsWith`. Para `equals`, el string debe coincidir exactamente. Si los valores en BD son `"Pendiente"` y el filtro busca `"pendiente"`, no hay match.

**Solución:** Verificar que los valores del `<FiltroEstado>` coinciden exactamente con los valores guardados en BD, o usar:
```js
where.estado = estado; // match exacto sin mode
```

---

### 3.2 — Calculadora PVC: no aparecen espesores al seleccionar material

**Archivo:** `src/componentes/calculadoras/CalculadoraBandas.js`

El `useEffect` en línea 69 hace `setSelectedEspesor('')` al cambiar el material, pero el problema es que los espesores disponibles probablemente se filtran desde una lista que depende del material seleccionado. Si la lista de tarifas no está cargada aún, o el filtro no coincide con los valores reales de la BD, el select queda vacío.

**Acciones a tomar:**
1. Verificar que el campo usado para filtrar espesores (ej: `tarifa.material`) coincide exactamente con el valor de `selectedMaterial`.
2. Logear `console.log(tarifas, selectedMaterial)` para ver qué valores llegan.
3. Eliminar el selector de material completamente (ya que siempre es PVC) y hardcodear `selectedMaterial = 'PVC'` como valor fijo.

---

### 3.3 — Calculadora PVC: no se puede seleccionar taco / no hay CRUD de tacos

**Síntoma:** El desplegable de tacos está vacío y en Configuración no existe sección para crearlos.

**Causa probable:** El modelo `Taco` existe en Prisma y hay una API `/api/tacos`, pero:
- No hay interfaz en `/configuracion` para gestionar tacos.
- El componente de la calculadora no está haciendo fetch a `/api/tacos` o la lista está vacía en BD.

**Acciones:**
1. Verificar que hay datos en la tabla `Taco` en BD (puede estar vacía).
2. Añadir una sección "Tacos" en la página de configuración usando el patrón `PaginaGestion`.
3. En la calculadora, asegurarse de que hace `fetch('/api/tacos')` al montar.

---

### 3.4 — Calculadora PVC: eliminar "Aportación", reestructurar Grapas

**Cambios requeridos en la calculadora:**
1. Eliminar el tipo de confección `'Aportación'` del selector.
2. Dejar solo `'Vulcanizado'` y `'Grapa'`.
3. Cuando se selecciona `'Grapa'`, mostrar un segundo selector con los **tipos de grapa** (cada uno con su precio por metro lineal). Estos tipos de grapa deberían ser configurables desde la BD (similar a los tacos).

**Implicaciones:**
- Nuevo modelo o tabla para tipos de grapa con precio/metro.
- API CRUD para gestionar tipos de grapa.
- Sección en configuración.
- Actualizar lógica de cálculo en la calculadora.

---

### 3.5 — Calculadora Logística: desplegable de provincias muestra solo ~10

**Archivo:** `src/componentes/calculadoras/CalculadoraLogistica.js`

El selector de destino probablemente carga las provincias desde la tabla `TarifaTransporte`, pero solo hay datos para ~10 provincias en BD, o el componente está limitando los resultados.

**Solución:**
1. Verificar cuántos registros hay en `TarifaTransporte` con `SELECT DISTINCT provincia FROM "TarifaTransporte"`.
2. Si faltan, hacer seed con las 52 provincias españolas (+ Ceuta, Melilla, etc.).
3. Convertir el select en un input con autocompletado:
```jsx
// Usar datalist de HTML (solución simple sin librería):
<input list="provincias" value={destino} onChange={...} />
<datalist id="provincias">
    {provincias.map(p => <option key={p} value={p} />)}
</datalist>
```

---

## 4. MEJORAS

### 4.1 — Rendimiento: eliminar re-renders innecesarios

Los 6 casos de `setState` en `useEffect` provocan renders en cascada. Cada vez que se abre un modal de búsqueda, hay al menos 2 renders extra. En tablas grandes esto es visible. Ver soluciones en sección 2.1.

---

### 4.2 — `isDropdownOpen` como variable derivada (no estado)

**Archivo:** `src/componentes/ui/BarraBusqueda.js:69`

`isDropdownOpen` se calcula 100% a partir de `query` y `results`, que ya son estado. No necesita ser estado propio:

```js
// Antes: estado + useEffect = 2 renders extra
const [isDropdownOpen, setIsDropdownOpen] = useState(false);
useEffect(() => {
    setIsDropdownOpen(query.trim().length >= 2 && !!results?.length);
}, [query, results]);

// Después: variable derivada = 0 renders extra
const isDropdownOpen = query.trim().length >= 2 && !!results?.length;
```

---

### 4.3 — Imágenes optimizadas con `next/image`

**Archivo:** `src/app/fotos/page.js:144`

Sustituir `<img>` por `<Image />` de Next.js activa: lazy loading automático, conversión a WebP, resize responsivo y mejora el LCP (métrica de Core Web Vitals).

---

### 4.4 — Paginación en `/api/tacos` y otras APIs sin paginar

Si la tabla de tacos o referencias crece, las APIs que devuelven `findMany()` sin `take`/`skip` devolverán todos los registros. Añadir paginación a las APIs que la puedan necesitar en el futuro.

---

### 4.5 — Validación en cliente antes de llamar APIs

En `EmailButton.js`, añadir una validación explícita del `id` antes de hacer el fetch:

```js
const handleSend = async () => {
    if (!id) { alert('Error: no se puede enviar sin ID'); return; }
    // ...
};
```
Evita llegar al servidor con datos inválidos y da feedback más claro al usuario.

---

### 4.6 — Seed de provincias para la calculadora logística

Crear o completar el seeder de `TarifaTransporte` con las 52 provincias + Ceuta y Melilla. Sin datos completos en BD, la calculadora de envíos no puede funcionar correctamente.

---

### 4.7 — Consolidar utilidades duplicadas

Hay tres archivos de utilidades:
- `src/utils/helpers-matematicos.js`
- `src/utils/utilidades.js`
- `src/utils/utils.js`

Revisar si hay funciones duplicadas y consolidarlas en un solo archivo para facilitar el mantenimiento.

---

### 4.8 — Añadir `aria-label` a botones solo con icono

Varios botones del tipo `<button><Icon /></button>` sin texto no tienen `aria-label`. Esto es importante para accesibilidad y para que herramientas de testing puedan identificarlos.

---

## 5. PRIORIDADES

| # | Tipo | Problema | Impacto | Esfuerzo |
|---|------|---------|---------|----------|
| 1 | 🔴 Bug crítico | `id: undefined` en email/PDF de pedidos | Alto | Bajo |
| 2 | 🔴 Bug crítico | `id: undefined` en email de presupuestos | Alto | Bajo |
| 3 | 🔴 Bug crítico | `useMemo` condicional en `ModalDetallePedidoProveedor` | Alto | Bajo |
| 4 | 🔴 Bug crítico | `applyTheme` antes de declaración en `ProveedorTema` | Alto | Bajo |
| 5 | 🟠 Bug funcional | Calculadora PVC: espesores no aparecen | Alto | Medio |
| 6 | 🟠 Bug funcional | Calculadora PVC: tacos sin datos / sin CRUD | Alto | Medio |
| 7 | 🟠 Bug funcional | Calculadora PVC: eliminar Aportación + nuevos tipos Grapa | Medio | Alto |
| 8 | 🟠 Bug funcional | Filtros de estado en Pedidos no funcionan | Medio | Bajo |
| 9 | 🟠 Bug funcional | Logística: desplegable provincias incompleto | Medio | Medio |
| 10 | 🟡 ESLint | `setState` en `useEffect` (6 ocurrencias) | Medio | Medio |
| 11 | 🟡 ESLint | Componente `Edit` no importado | Bajo | Bajo |
| 12 | 🟡 ESLint | HTML entities sin escapar (8 ocurrencias) | Bajo | Bajo |
| 13 | 🟡 ESLint | Dependencias faltantes en `useCallback`/`useEffect` | Bajo | Bajo |
| 14 | 🟢 Mejora | `isDropdownOpen` como variable derivada | Bajo | Bajo |
| 15 | 🟢 Mejora | `<Image />` en lugar de `<img>` en fotos | Bajo | Bajo |
| 16 | 🟢 Mejora | Seed completo de 52 provincias | Medio | Medio |
| 17 | 🟢 Mejora | Consolidar 3 archivos de utils | Bajo | Medio |

---

*Archivo generado por análisis estático + revisión de bugreport.txt + lint_errors.txt*
