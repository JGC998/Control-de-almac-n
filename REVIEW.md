# REVIEW — Control de Almacén (CRM Taller)

> Generado el 2026-05-27 por Claude Code  
> Revisión completa: Seguridad · Bugs · Backend · API · Frontend

---

## Resumen Ejecutivo

**Stack detectado:** Next.js 16 · Prisma 6 · MySQL/SQLite · DaisyUI 5 · SWR · Zod · jsPDF · ExcelJS · Resend  
**Archivos analizados:** 78  
**Total de hallazgos:** 22 (1 crítico, 4 altos, 9 medios, 8 bajos)

| Área | Score | Críticos | Altos | Medios | Bajos |
|------|-------|----------|-------|--------|-------|
| Seguridad | 6/10 | 1 | 2 | 1 | 1 |
| Bugs | 7/10 | 0 | 1 | 3 | 2 |
| Backend | 8/10 | 0 | 1 | 3 | 2 |
| API | 8/10 | 0 | 0 | 1 | 2 |
| Frontend | 7/10 | 0 | 0 | 1 | 1 |

---

## Hallazgos Críticos — Acción Inmediata

### [CRITICO-01] SQL Injection directa en bulk-update de precios

**Severidad:** CRITICO  
**Archivo:** `src/app/api/precios/bulk-update/route.js:28`  
**Problema:** La variable `material` recibida del cliente se interpola literalmente dentro de una cadena SQL ejecutada con `$executeRawUnsafe`. Un atacante puede enviar `'; DROP TABLE TarifaMaterial; --` como valor de `material` y destruir datos de la base de datos. La variable `factor` también se interpola directamente sin un límite de rango verificado.

```js
// CÓDIGO ACTUAL (PELIGROSO)
result = await db.$executeRawUnsafe(
  `UPDATE TarifaMaterial SET precio = precio * ${factor} WHERE material = '${material}'`
);
```

**Corrección — Opción A (ORM, recomendada):**

```js
// src/app/api/precios/bulk-update/route.js
export async function POST(request) {
  try {
    const { percentage, material } = await request.json();
    if (percentage === undefined || percentage === null) {
      return NextResponse.json({ message: 'El porcentaje es requerido' }, { status: 400 });
    }
    const parsedPct = parseFloat(percentage);
    if (isNaN(parsedPct) || parsedPct < -99 || parsedPct > 1000) {
      return NextResponse.json({ message: 'Porcentaje fuera de rango permitido (-99 a 1000)' }, { status: 400 });
    }
    const factor = 1 + (parsedPct / 100);
    const whereClause = (!material || material === 'TODOS') ? {} : { material: String(material) };

    const tarifas = await db.tarifaMaterial.findMany({ where: whereClause, select: { id: true, precio: true } });
    const updates = tarifas.map(t =>
      db.tarifaMaterial.update({ where: { id: t.id }, data: { precio: Number((t.precio * factor).toFixed(4)) } })
    );
    await db.$transaction(updates);
    return NextResponse.json({ message: 'Precios actualizados correctamente', count: tarifas.length });
  } catch (error) {
    logApiError(error, 'Error en bulk-update:');
    return NextResponse.json({ message: 'Error interno' }, { status: 500 });
  }
}
```

**Corrección — Opción B (tagged template, parametrizado):**

```js
// Tagged template — Prisma parametriza automáticamente, seguro contra SQL injection
result = await db.$executeRaw`UPDATE TarifaMaterial SET precio = precio * ${factor} WHERE material = ${material}`;
```

---

## Seguridad

### [SEC-01] Cookie de autenticación almacena el PIN en texto plano

**Severidad:** ALTO  
**Archivo:** `src/app/api/auth/login/route.js:33` · `middleware.js:20`  
**Problema:** La cookie `crm-auth` se establece con el valor literal del PIN: `res.cookies.set('crm-auth', expected || '', ...)`. El middleware compara `session === pin`. Quien obtenga la cookie por cualquier medio (logs de acceso, backups de sesión, herramientas de desarrollo del navegador) obtiene el PIN en texto plano.

**Corrección:** Almacenar un token HMAC firmado en la cookie:

```js
// src/app/api/auth/login/route.js — tras validar el PIN correctamente:
import { randomBytes, createHmac } from 'crypto';

const secret = process.env.SESSION_SECRET || process.env.AUTH_PIN;
const nonce = randomBytes(16).toString('hex');
const sig = createHmac('sha256', secret).update(nonce).digest('hex');
const sessionToken = `${nonce}.${sig}`;

res.cookies.set('crm-auth', sessionToken, {
  httpOnly: true, sameSite: 'strict', path: '/', maxAge: 28800,
  secure: process.env.NODE_ENV === 'production',
});

// middleware.js — reemplazar la comparación directa:
import crypto from 'crypto';
function isValidSession(token, secret) {
  if (!token || !token.includes('.')) return false;
  const [nonce, sig] = token.split('.');
  const expected = createHmac('sha256', secret).update(nonce).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch { return false; }
}
// En middleware: if (isValidSession(session, pin)) return addSecurityHeaders(NextResponse.next());
```

---

### [SEC-02] `dangerouslySetInnerHTML` con contenido no sanitizado en guías

**Severidad:** ALTO  
**Archivo:** `src/app/guias/[id]/page.js:58`  
**Problema:** El contenido `guia.htmlContent` se inserta directamente en el DOM sin sanitización. Cualquier `<script>` o atributo `onerror`/`onload` en el contenido ejecutaría JavaScript en el contexto del usuario autenticado (XSS almacenado).

```jsx
// CÓDIGO ACTUAL (PELIGROSO)
<div dangerouslySetInnerHTML={{ __html: guia.htmlContent }} />
```

**Corrección:**

```bash
npm install isomorphic-dompurify
```

```jsx
import DOMPurify from 'isomorphic-dompurify';

const safeHtml = DOMPurify.sanitize(guia.htmlContent, {
  ALLOWED_TAGS: ['p','h1','h2','h3','ul','ol','li','strong','em','a','br','pre','code','table','thead','tbody','tr','th','td'],
  ALLOWED_ATTR: ['href','target','rel','class'],
});

<div className="prose max-w-none mb-8" dangerouslySetInnerHTML={{ __html: safeHtml }} />
```

---

### [SEC-03] Dirección de email remitente hardcodeada (dominio de pruebas)

**Severidad:** MEDIO  
**Archivo:** `src/lib/email.js:22`  
**Problema:** El campo `from` está hardcodeado como `'CRM Taller <onboarding@resend.dev>'`. Es el dominio de pruebas de Resend — los emails enviados desde él a destinatarios reales irán a spam o serán rechazados por los servidores de correo de los clientes.

**Corrección:**

```bash
# .env.local
RESEND_FROM="CRM Taller <no-reply@tudominio.com>"
```

```js
// src/lib/email.js:22
from: process.env.RESEND_FROM || 'CRM Taller <onboarding@resend.dev>',
```

---

### [SEC-04] Rate limiting ausente en endpoints de exportación Excel

**Severidad:** BAJO  
**Archivos:** `src/app/api/pedidos/export/route.js`, `src/app/api/presupuestos/export/route.js`  
**Problema:** Estos dos endpoints generan archivos Excel descargando toda la tabla sin límite de peticiones. El endpoint `/api/export/csv` sí tiene rate limit (10/min), pero los de Excel no. Un atacante puede generar carga de BD continua.

**Corrección:** Añadir el mismo patrón ya usado en otros endpoints:

```js
import { checkRateLimit } from '@/lib/rateLimiter';

export async function GET(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '127.0.0.1';
  const rl = checkRateLimit(`export:${ip}`, 10);
  if (!rl.allowed) {
    return NextResponse.json({ message: 'Demasiadas peticiones' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } });
  }
  // ... resto del handler sin cambios
```

---

## Bugs

### [BUG-01] `receive-order` usa campos que no existen en el schema de producción

**Severidad:** ALTO  
**Archivo:** `src/app/api/stock-management/receive-order/route.js:63-84`  
**Problema:** Al crear registros `Stock`, el handler usa los campos `fechaEntrada`, `ubicacion` y `metrosInicialesPorBobina` que no existen en el modelo `Stock` de `prisma/schema.prisma`. Del mismo modo, `MovimientoStock.create` pasa el campo `referencia` que tampoco existe en el schema de producción. En producción MySQL con migraciones estrictas esto lanzará `PrismaClientValidationError: Unknown field` y la recepción de pedidos fallará completamente.

```js
// CÓDIGO ACTUAL — campos que no existen en prisma/schema.prisma
await tx.stock.create({
  data: {
    // ...
    fechaEntrada: new Date(),        // campo inexistente
    ubicacion: 'Recepción',          // campo inexistente
    metrosInicialesPorBobina: ...,   // campo inexistente
    movimientos: {
      create: {
        tipo: 'ENTRADA',
        cantidad: metrosTotales,
        referencia: `Recepción Pedido ${pedido.id.slice(0,8)}`,  // campo inexistente
        fecha: new Date()
      }
    }
  }
});
```

**Corrección — Opción A (eliminar campos extras):**

```js
await tx.stock.create({
  data: {
    material: materialNombre,
    espesor: bobina.espesor,
    metrosDisponibles: metrosTotales,
    proveedor: pedido.proveedorId,
    costoMetro: costoMetroFinal,
    cantidadBobinas: cantidadBobinas,
    movimientos: {
      create: { tipo: 'ENTRADA', cantidad: metrosTotales }
    }
  }
});
```

**Corrección — Opción B (añadir los campos al schema):**

```prisma
model Stock {
  // campos existentes...
  fechaEntrada              DateTime?
  ubicacion                 String?
  metrosInicialesPorBobina  Float?
}
model MovimientoStock {
  // campos existentes...
  referencia  String?
}
```

---

### [BUG-02] Race condition en generación de números de secuencia bajo concurrencia

**Severidad:** MEDIO  
**Archivo:** `src/lib/sequence.js:10-14` (comentario del propio código)  
**Problema:** `getNextNumber()` se llama intencionalmente fuera de la transacción de creación del documento para evitar `SQLITE_BUSY`. Esto significa que dos peticiones simultáneas pueden llamar `upsert` en la tabla `Sequence` y obtener el mismo valor antes de que el incremento del otro haya completado. En producción MySQL con alta concurrencia, esto generará pedidos con el mismo `numero` y fallará con `P2002` en la segunda petición (campo `@unique`).

**Corrección para MySQL producción:** Mover el `upsert` de secuencia dentro de la transacción usando el cliente transaccional:

```js
// src/lib/sequence.js — añadir función para uso en transacciones
export async function getNextNumberTx(type, tx) {
  const currentYear = new Date().getFullYear();
  const sequence = await tx.sequence.upsert({
    where: { name_year: { name: type, year: currentYear } },
    update: { value: { increment: 1 } },
    create: { name: type, year: currentYear, value: 1 }
  });
  return `${type.toUpperCase()}-${String(sequence.value).padStart(3, '0')}-${currentYear}`;
}

// src/app/api/pedidos/route.js — dentro de $transaction:
const newOrder = await db.$transaction(async (tx) => {
  const numero = await getNextNumberTx('pedido', tx);
  return tx.pedido.create({ data: { numero, ...restOfData } });
});
```

---

### [BUG-03] `DELETE /api/documentos` exporta un handler que siempre devuelve 405

**Severidad:** MEDIO  
**Archivo:** `src/app/api/documentos/route.js:175-191`  
**Problema:** El archivo exporta un handler `DELETE` que después de parsear el body devuelve `{ status: 405 }` con un mensaje explicativo. Este patrón es incorrecto — un 405 debería venir de no exportar el handler (lo que Next.js hace automáticamente), no de un handler que acepta la petición y luego la rechaza. Además parsea el body antes de decidir rechazar, lo que consume recursos innecesariamente.

**Corrección:** Eliminar completamente las líneas 175-191 del archivo. Next.js devuelve 405 automáticamente cuando el método no tiene handler exportado.

---

### [BUG-04] `fotos/page.js` llama a `/api/fotos` que no existe en el proyecto

**Severidad:** MEDIO  
**Archivo:** `src/app/fotos/page.js:32,83`  
**Problema:** La página de fotos llama `fetch('/api/fotos')` y `fetch('/api/fotos', { method: 'POST' })` pero no existe ningún archivo `src/app/api/fotos/route.js`. Las llamadas siempre fallan con 404 y la funcionalidad está completamente rota.

**Corrección (Opción A — crear la ruta mínima):**

```js
// src/app/api/fotos/route.js
import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { logApiError } from '@/lib/logger';

const FOTOS_DIR = path.join(process.cwd(), 'public', 'fotos');

export async function GET() {
  try {
    await fs.mkdir(FOTOS_DIR, { recursive: true });
    const files = await fs.readdir(FOTOS_DIR);
    const jpgs = files.filter(f => /\.(jpe?g|png|webp)$/i.test(f));
    return NextResponse.json(jpgs.map(f => ({ path: `/fotos/${f}` })));
  } catch (error) {
    logApiError(error, 'GET /api/fotos');
    return NextResponse.json([], { status: 200 });
  }
}

export async function POST(request) {
  try {
    const { image } = await request.json();
    if (!image || !image.startsWith('data:image/')) {
      return NextResponse.json({ message: 'Imagen inválida' }, { status: 400 });
    }
    const base64 = image.replace(/^data:image\/\w+;base64,/, '');
    const filename = `foto-${Date.now()}.jpg`;
    const filePath = path.join(FOTOS_DIR, filename);
    await fs.mkdir(FOTOS_DIR, { recursive: true });
    await fs.writeFile(filePath, Buffer.from(base64, 'base64'));
    return NextResponse.json({ path: `/fotos/${filename}` }, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/fotos');
    return NextResponse.json({ message: 'Error al guardar foto' }, { status: 500 });
  }
}
```

**Corrección (Opción B):** Eliminar `src/app/fotos/page.js` y el enlace en la barra lateral si la funcionalidad está descartada.

---

### [BUG-05] `maquinaria/procesos/route.js` usa campo `version` inexistente en el schema

**Severidad:** BAJO  
**Archivo:** `src/app/api/maquinaria/procesos/route.js:57`  
**Problema:** Al crear un proceso, se pasa `version: '1.0'` al modelo `Documento`, pero este campo no existe en `prisma/schema.prisma`. En producción MySQL con migraciones estrictas, Prisma lanzará `PrismaClientValidationError`.

**Corrección:**

```js
// Eliminar el campo 'version' de la creación:
const nuevoProceso = await db.documento.create({
  data: {
    tipo: 'PROCESO',
    referencia: titulo,
    descripcion: descripcion,
    rutaArchivo: `INTERNAL_NOTE_${Date.now()}`,
    // version: '1.0',  ← ELIMINAR esta línea
    maquinaUbicacion: maquina,
  },
});
```

---

### [BUG-06] `logistica/config-paletizado/route.js` usa `NextResponse` y `db` sin importarlos

**Severidad:** BAJO  
**Archivo:** `src/app/api/logistica/config-paletizado/route.js`  
**Problema:** El archivo exporta handlers `GET` y `PUT` que usan `NextResponse`, `db` y `logApiError` sin ningún `import` statement. En runtime esto lanza `ReferenceError: NextResponse is not defined` en cualquier petición al endpoint de configuración de paletizado.

**Corrección:** Añadir los imports necesarios al inicio del archivo:

```js
// Añadir al inicio de src/app/api/logistica/config-paletizado/route.js:
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';
import { logUpdate } from '@/lib/audit';

// Y restaurar la función GET completa (actualmente comentada/omitida):
export async function GET() {
  try {
    const configs = await db.configPaletizado.findMany();
    return NextResponse.json(configs);
  } catch (error) {
    logApiError(error, 'Error fetching config paletizado:');
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
```

---

## Backend

### [BACK-01] `manejarErrorApi` en `utilidades.js` expone stack trace completo

**Severidad:** ALTO  
**Archivo:** `src/utils/utilidades.js:39`  
**Problema:** La función `manejarErrorApi`, usada por `crearManejadoresCRUD` para los errores no controlados de clientes y fabricantes, llama `console.error("Unhandled API Error:", error)` volcando el objeto `Error` completo — con stack trace, rutas de módulos internos y posibles queries Prisma — al log del servidor. El patrón correcto del proyecto es usar `logApiError` que filtra solo `name, message, code, meta`.

**Corrección:**

```js
// src/utils/utilidades.js — líneas 26 y 39
import { logApiError } from '@/lib/logger';

export const manejarErrorApi = (error) => {
  if (error instanceof Prisma.PrismaClientValidationError) {
    logApiError(error, 'manejarErrorApi:validation');      // Reemplaza console.error
    return NextResponse.json({ error: "Datos de entrada inválidos." }, { status: 400 });
  }
  if (error.code === 'P2002') {
    return NextResponse.json({ error: "El registro ya existe." }, { status: 409 });
  }
  if (error.code === 'P2025') {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }
  logApiError(error, 'manejarErrorApi:unhandled');         // Reemplaza console.error
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
};
```

---

### [BACK-02] `DELETE /api/pedidos-proveedores-data/[id]` no puede revertir el stock (campo `referencia` y tipo `'Entrada'` incorrectos)

**Severidad:** MEDIO  
**Archivo:** `src/app/api/pedidos-proveedores-data/[id]/route.js:108-118`  
**Problema:** El DELETE busca movimientos de stock con `referencia: { startsWith: 'Pedido Prov: ${id}' }` y `tipo: 'Entrada'` (E mayúscula), pero:
1. `MovimientoStock` no tiene campo `referencia` en el schema de producción.
2. El tipo de movimiento en el resto del código se crea como `'ENTRADA'` (todo mayúsculas).
3. `receive-order` crea movimientos con `referencia: 'Recepción Pedido ...'` (no `'Pedido Prov: ...'`).

El resultado es que `movimientos` siempre devuelve `[]` y el stock nunca se limpia al eliminar un pedido recibido. La operación de rollback queda silenciosamente inoperativa.

**Corrección a corto plazo:** Advertir al usuario en la respuesta:

```js
return NextResponse.json({
  message: 'Pedido de proveedor eliminado. AVISO: Si el pedido estaba Recibido, el stock NO se ha revertido automáticamente. Ajústalo manualmente en /almacen.',
}, { status: 200 });
```

**Corrección definitiva:** Añadir `pedidoProveedorId` al modelo `Stock` para rastrear el origen y poder hacer el rollback limpiamente. Ver también BUG-01.

---

### [BACK-03] Exportación Excel sin límite de filas puede causar OOM en producción

**Severidad:** MEDIO  
**Archivos:** `src/app/api/pedidos/export/route.js:10`, `src/app/api/presupuestos/export/route.js:10`  
**Problema:** Ambos endpoints llaman `db.pedido.findMany({ include: { cliente: true }, ... })` sin `take`. Con 10.000+ pedidos, ExcelJS construye el workbook entero en RAM antes de escribir el buffer, lo que puede consumir cientos de MB y causar OOM o timeout en el servidor.

**Corrección inmediata:**

```js
const pedidos = await db.pedido.findMany({
  take: 5000,  // cap de seguridad
  include: { cliente: true },
  orderBy: { fechaCreacion: 'desc' }
});
```

**Corrección definitiva:** Implementar streaming con `exceljs` `WorkbookWriter` + cursor de paginación para datasets grandes.

---

### [BACK-04] `maquinaria/procesos` lee `src/data/procesos.json` que está excluido del repositorio

**Severidad:** BAJO  
**Archivo:** `src/app/api/maquinaria/procesos/route.js:18`  
**Problema:** El directorio `src/data/` está en `.gitignore` (línea `src/data/`), por lo que `procesos.json` no existe en deployments frescos. El catch genérico devuelve 500 sin distinguir "archivo no encontrado" de otros errores.

**Corrección:**

```js
let staticProcesos = [];
try {
  const jsonPath = path.join(process.cwd(), 'src', 'data', 'procesos.json');
  const staticData = await fs.readFile(jsonPath, 'utf-8');
  staticProcesos = JSON.parse(staticData);
} catch (fileError) {
  logApiError(fileError, 'procesos.json no encontrado — usando array vacío');
  // No relanzar: el endpoint sigue funcionando con solo los dinámicos
}
```

---

### [BACK-05] `PUT /api/pedidos-proveedores-data/[id]` sin validación Zod

**Severidad:** BAJO  
**Archivo:** `src/app/api/pedidos-proveedores-data/[id]/route.js:41`  
**Problema:** El `POST` de la ruta colección usa `pedidoProveedorSchema`, pero el `PUT` del recurso individual acepta cualquier cuerpo JSON sin validar. Campos como `tasaCambio: "abc"` causarán que `parseFloat("abc")` devuelva `NaN`, y Prisma lanzará un error de tipo en lugar de una respuesta 400 controlada.

**Corrección:**

```js
// Al inicio del handler PUT, antes de acceder a data.bobinas:
const validation = validateData(pedidoProveedorSchema, data);
if (!validation.success) {
  return NextResponse.json({ message: 'Datos inválidos', errors: validation.errors }, { status: 400 });
}
const { bobinas, ...pedidoData } = validation.data;
```

---

## API

### Mapa de Endpoints

| Método | Ruta | Auth PIN | Validación Zod | Estado |
|--------|------|----------|----------------|--------|
| GET | /api/auth/status | No | — | OK |
| POST | /api/auth/login | No | Manual + timingSafeEqual | OK |
| POST | /api/auth/logout | No | — | OK |
| GET | /api/dashboard | Si | — | OK |
| GET | /api/informes?tipo= | Si | — | OK (rate limit) |
| GET | /api/productos | Si | — | OK |
| POST | /api/productos | Si | productoSchema | OK |
| GET/PUT/DELETE | /api/productos/[id] | Si | Manual en PUT | OK |
| GET | /api/pedidos | Si | — | OK |
| POST | /api/pedidos | Si | pedidoSchema | OK |
| GET | /api/pedidos/[id] | Si | — | OK |
| PUT | /api/pedidos/[id] | Si | Manual | OK |
| PATCH | /api/pedidos/[id] | Si | Manual | OK |
| DELETE | /api/pedidos/[id] | Si | — | OK |
| GET | /api/pedidos/[id]/pdf | Si | — | OK |
| POST | /api/pedidos/[id]/email | Si | Manual | OK |
| GET | /api/pedidos/export | Si | — | Sin rate limit (SEC-04) |
| POST | /api/pedidos/from-presupuesto | Si | Manual | OK |
| GET | /api/presupuestos | Si | — | OK |
| POST | /api/presupuestos | Si | presupuestoSchema | OK |
| GET/PUT/DELETE | /api/presupuestos/[id] | Si | Manual en PUT | OK |
| GET | /api/presupuestos/[id]/pdf | Si | — | OK |
| POST | /api/presupuestos/[id]/email | Si | Manual | OK |
| GET | /api/presupuestos/export | Si | — | Sin rate limit (SEC-04) |
| GET/POST/PUT/DELETE | /api/presupuestos/templates | Si | Manual | OK |
| GET/PUT/DELETE | /api/presupuestos/templates/[id] | Si | Manual | OK |
| GET/POST | /api/clientes | Si | Sin Zod en POST CRUD genérico | Medio |
| GET/PUT/DELETE | /api/clientes/[id] | Si | Manual | OK |
| GET | /api/clientes/[id]/resumen | Si | — | OK |
| GET/POST | /api/proveedores | Si | Sin Zod en POST CRUD genérico | Medio |
| PUT/DELETE | /api/proveedores/[id] | Si | Manual | OK |
| GET | /api/almacen-stock | Si | — | OK |
| POST | /api/almacen-stock?action= | Si | Manual | OK |
| GET | /api/movimientos | Si | — | OK |
| GET | /api/stock-info/available-meters | Si | — | OK |
| POST | /api/stock-management/receive-order | Si | Manual | BUG-01 |
| GET/POST | /api/pedidos-proveedores-data | Si | pedidoProveedorSchema | OK |
| GET/PUT/DELETE | /api/pedidos-proveedores-data/[id] | Si | Solo POST | Parcial (BACK-05) |
| GET/POST/PUT/DELETE | /api/configuracion/referencias | Si | Manual | OK |
| GET/POST | /api/fabricantes | Si | Sin Zod en POST CRUD genérico | Medio |
| PUT/DELETE | /api/fabricantes/[id] | Si | Manual | OK |
| GET/POST/PUT/DELETE | /api/materiales | Si | Manual | OK |
| PUT/DELETE | /api/materiales/[id] | Si | Manual | OK |
| GET/POST/PUT/DELETE | /api/precios | Si | tarifaMaterialSchema (solo POST) | Parcial |
| PUT/DELETE | /api/precios/[id] | Si | Manual | OK |
| POST | /api/precios/bulk-update | Si | Manual | CRITICO-01 SQL injection |
| GET/POST | /api/pricing/margenes | Si | Manual | OK |
| PUT/DELETE | /api/pricing/margenes/[id] | Si | Manual | OK |
| POST | /api/pricing/calculate | Si | Manual | OK |
| POST | /api/pricing/inverse-calc | Si | Manual | OK |
| GET/POST/PUT/DELETE | /api/pricing/descuentos | Si | descuentoSchema (solo POST) | Parcial |
| GET/POST | /api/pricing/especiales | Si | Sin validación | API-02 |
| GET/POST | /api/tarifas-rollo | Si | Manual | OK |
| PUT/DELETE | /api/tarifas-rollo/[id] | Si | Manual | OK |
| GET | /api/logistica/tarifas | Si | — | OK |
| PUT | /api/logistica/tarifas/[id] | Si | Manual | OK |
| POST | /api/logistica/calcular | Si | calculoLogisticaSchema | OK |
| GET/PUT | /api/logistica/config-paletizado | Si | Manual | BUG-06 (imports) |
| GET/POST/PUT | /api/tacos | Si | tacoSchema / tacoBatchUpdateSchema | OK |
| DELETE | /api/tacos/[id] | Si | — | OK |
| GET/POST/PUT | /api/grapas | Si | grapaSchema / grapaUpdateSchema | OK |
| PATCH/DELETE | /api/grapas/[id] | Si | Manual | OK |
| GET/POST/DELETE | /api/notas | Si | Manual | OK |
| GET/POST | /api/documentos | Si | Manual | BUG-03 (DELETE falso) |
| GET/PUT/DELETE | /api/documentos/[id] | Si | Manual | OK |
| GET | /api/audit-log | Si | — | OK |
| GET | /api/config | Si | — | OK |
| PUT | /api/config | Si | Allowlist de claves | OK |
| GET | /api/config/backup | Si | — | OK (rate limit) |
| GET | /api/busqueda?q= | Si | — | OK |
| GET | /api/export/csv?model= | Si | — | OK (rate limit) |
| GET/POST | /api/maquinaria/procesos | Si | Manual | BUG-04/05 |
| GET | /api/catalogo | Si | — | API-03 (vacío) |
| GET | /api/catalogo/[id] | Si | — | API-03 (vacío) |
| GET | /api/plantillas | Si | — | OK (alias productos) |
| GET | /api/plantillas/[id] | Si | Manual | API-01 (parseInt uuid) |

---

### Hallazgos API

### [API-01] `GET /api/plantillas/[id]` usa `parseInt(id)` sobre un UUID

**Severidad:** MEDIO  
**Archivo:** `src/app/api/plantillas/[id]/route.js:11-12`  
**Problema:** El handler llama `const pId = parseInt(id)` donde `id` es un UUID como `"3f8a2b1c-4d5e-..."`. `parseInt("3f8a2b1c-...")` devuelve `3` (parsea solo los dígitos iniciales si los hay, o `NaN`). Para UUIDs que empiezan por letra, retorna `NaN` → la validación `isNaN(pId)` devuelve 400. Para los que empiezan por número, busca un producto con `id = 3` (int) en lugar del UUID. El handler nunca funciona correctamente.

**Corrección:**

```js
// src/app/api/plantillas/[id]/route.js — reemplazar parseInt por validación de string
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    // Producto usa UUID string, no número entero
    if (!id || typeof id !== 'string' || id.length < 10) {
      return NextResponse.json({ message: 'ID inválido' }, { status: 400 });
    }
    const producto = await db.producto.findUnique({ where: { id } });
    if (!producto) return NextResponse.json({ message: 'Producto no encontrado' }, { status: 404 });
    return NextResponse.json(producto);
  } catch (error) {
    return handlePrismaError(error);
  }
}
```

---

### [API-02] `GET /api/pricing/especiales` usa modelo `PrecioEspecial` que no existe en el schema

**Severidad:** BAJO  
**Archivo:** `src/app/api/pricing/especiales/route.js`  
**Problema:** El handler llama `db.precioEspecial.findMany(...)` y `db.precioEspecial.create(...)`, pero el modelo `PrecioEspecial` no está definido en `prisma/schema.prisma`. Todas las peticiones a este endpoint fallarán con `TypeError: Cannot read properties of undefined (reading 'findMany')`. Adicionalmente el `catch` no usa `logApiError`.

**Corrección:** Añadir el modelo al schema o marcar el endpoint como no implementado:

```prisma
// Añadir a prisma/schema.prisma si se necesita la funcionalidad:
model PrecioEspecial {
  id          String   @id @default(uuid())
  descripcion String
  precio      Float
  clienteId   String?
  productoId  String?
  cliente     Cliente?  @relation(fields: [clienteId], references: [id])
  producto    Producto? @relation(fields: [productoId], references: [id])
}
```

---

### [API-03] Endpoints `/api/catalogo` y `/api/catalogo/[id]` están vacíos

**Severidad:** BAJO  
**Archivos:** `src/app/api/catalogo/route.js`, `src/app/api/catalogo/[id]/route.js`  
**Problema:** Ambos archivos tienen exactamente 1 línea en blanco (sin exports). Next.js devolverá 405 para cualquier petición. Si algún componente los llama, fallará. El nombre sugiere que deberían ser endpoints del catálogo de productos.

**Corrección:** Implementar los handlers o redirigir a `/api/productos`. A corto plazo, eliminar los archivos si no se usan.

---

## Frontend

### [FRONT-01] `guias/[id]/page.js` descarga todas las guías para mostrar una sola (ineficiente + API inexistente)

**Severidad:** MEDIO  
**Archivo:** `src/app/guias/[id]/page.js:18-24`  
**Problema:** La página carga `fetch('/api/guias')` (toda la colección) y filtra en cliente. Dos problemas: 1) No existe `/api/guias/route.js` en el proyecto, por lo que la petición falla con 404. 2) Aunque existiera, descargar toda la colección para mostrar un registro es ineficiente.

**Corrección:**

```js
// Reemplazar en useEffect:
const response = await fetch(`/api/guias/${id}`);
if (!response.ok) {
  setError(response.status === 404 ? 'Guía no encontrada' : `Error ${response.status}`);
  return;
}
const foundGuia = await response.json();
setGuia(foundGuia);
```

Y crear `src/app/api/guias/[id]/route.js` con el handler correspondiente.

---

### [FRONT-02] `fotos/page.js` tiene dependencia incorrecta en `useEffect` que detiene la cámara al iniciar

**Severidad:** BAJO  
**Archivo:** `src/app/fotos/page.js:14-28`  
**Problema:** El `useEffect` incluye `stream` en su array de dependencias. Cuando `stream` cambia de `null` a un `MediaStream` (al iniciar la cámara), React ejecuta el cleanup del efecto anterior que llama `stream.getTracks().forEach(track => track.stop())` — deteniendo el stream recién creado. La cámara se detiene inmediatamente.

**Corrección:**

```js
// Separar en dos efectos:
useEffect(() => {
  const userAgent = navigator?.userAgent || '';
  setIsMobile(Boolean(userAgent.match(/Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i)));
  fetchPhotos();
}, []); // Solo al montar — sin 'stream' en dependencias

// Cleanup del stream en un efecto separado:
useEffect(() => {
  return () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
  };
}, [stream]);
```

---

## Puntos Positivos

- **Rate limiting en todos los endpoints sensibles**: login (5/min), informes (20/min), backup config (5/min), CSV export (10/min).
- **Comparación en tiempo constante** para el PIN con `crypto.timingSafeEqual` — protege contra timing attacks.
- **Zod validations** en todos los POST críticos: pedidos, presupuestos, productos, tacos, grapas, logística, pedidos-proveedor.
- **`logApiError` centralizado** — sin stack traces ni internals de Prisma en respuestas ni logs verbosos.
- **Path traversal bloqueado** explícitamente en `DELETE /api/documentos/[id]` con verificación de ruta base.
- **Transacciones Prisma** en todas las operaciones multi-tabla (pedidos, presupuestos, stock, bobinas, descuentos).
- **Paginación** consistente en listados con `meta.total/page/limit/totalPages`.
- **`handlePrismaError` centralizado** para errores P2002/P2025/P2003 con mensajes de negocio claros.
- **Singleton Prisma** en `db.js` previene leaks de conexión en hot-reload.
- **HSTS en producción** en `addSecurityHeaders` del middleware.
- **Cookies httpOnly + sameSite:strict + secure:production** en el token de sesión.
- **Validación de MIME type** en subida de documentos (solo PDF, JPEG, PNG, WebP).
- **Sanitización de nombre de archivo** antes de guardar en disco.
- **Audit log** fire-and-forget en operaciones críticas (crear/editar tarifas, márgenes, config).
- **`crearManejadoresCRUD`** reduce duplicación — proveedores, fabricantes, materiales en 8 líneas cada uno.
- **Cap de seguridad** en queries no paginados (`take: 500` en productos, `take: 1000` en stock).
- **`.gitignore` correcto**: `.env`, `.env.local`, `*.db`, `data/configuracion/`, `src/data/` excluidos.
- **Allowlist de claves** en `PUT /api/config` — solo 12 claves permitidas, rechaza el resto con 400.

---

## Plan de Acción Priorizado

| # | Hallazgo | Área | Severidad | Esfuerzo estimado |
|---|----------|------|-----------|-------------------|
| 1 | CRITICO-01 — SQL Injection en `bulk-update` | Seguridad | CRITICO | 30 min |
| 2 | SEC-01 — PIN en texto plano en cookie de sesión | Seguridad | ALTO | 2 h |
| 3 | SEC-02 — XSS en guías (dangerouslySetInnerHTML sin sanitizar) | Seguridad | ALTO | 1 h |
| 4 | BUG-01 — Campos inexistentes en `receive-order` (rompe en producción) | Bugs | ALTO | 1 h |
| 5 | BUG-06 — Imports faltantes en `config-paletizado` (ReferenceError) | Bugs | BAJO | 15 min |
| 6 | BACK-01 — Stack trace completo en `manejarErrorApi` | Backend | ALTO | 15 min |
| 7 | API-01 — `parseInt(uuid)` en `/api/plantillas/[id]` (siempre 404) | API | MEDIO | 15 min |
| 8 | BUG-04 — `/api/fotos` inexistente (funcionalidad completamente rota) | Bugs | MEDIO | 2 h |
| 9 | SEC-03 — Remitente email hardcodeado en dominio de pruebas | Seguridad | MEDIO | 15 min |
| 10 | BUG-02 — Race condition en secuencias bajo concurrencia MySQL | Bugs | MEDIO | 2 h |
| 11 | BACK-02 — Rollback de stock silenciosamente inoperativo en DELETE pedido-proveedor | Backend | MEDIO | 3 h |
| 12 | BACK-03 — Export Excel sin límite de filas (riesgo OOM) | Backend | MEDIO | 30 min |
| 13 | SEC-04 — Sin rate limit en exports Excel | Seguridad | BAJO | 30 min |
| 14 | FRONT-01 — Guía carga toda la colección para mostrar un registro | Frontend | MEDIO | 1 h |
| 15 | BUG-03 — Handler DELETE falso en documentos devuelve 405 | Bugs | MEDIO | 15 min |
| 16 | API-02 — `pricing/especiales` usa modelo inexistente en schema | API | BAJO | 1 h |
| 17 | BUG-05 — Campo `version` inexistente en `maquinaria/procesos` | Bugs | BAJO | 10 min |
| 18 | BACK-04 — `procesos.json` no existe en repo (src/data en .gitignore) | Backend | BAJO | 30 min |
| 19 | BACK-05 — `PUT /api/pedidos-proveedores-data/[id]` sin Zod | Backend | BAJO | 30 min |
| 20 | API-03 — Archivos `/api/catalogo` vacíos | API | BAJO | 30 min |
| 21 | FRONT-02 — useEffect con dependencia incorrecta detiene cámara | Frontend | BAJO | 15 min |

---

*Este archivo fue generado automáticamente el 2026-05-27. Actualízalo después de aplicar cada corrección.*
