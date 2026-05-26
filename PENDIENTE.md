# Modificaciones pendientes

---

## BUGS PENDIENTES (detectados en revisión — aún sin corregir)

### B1. Albaranes — IVA hardcodeado al 21% ✅ CORREGIDO
~~Al crear un albarán, el IVA se calcula siempre al 21% fijo en lugar de leer el valor de la tabla `Config`.~~
- **Archivos corregidos:** `src/app/api/albaranes/route.js`, `src/app/api/albaranes/[id]/route.js`

### B2. Facturas — IVA hardcodeado al 21% ✅ CORREGIDO
~~Mismo problema que B1 pero en facturas.~~
- **Archivos corregidos:** `src/app/api/facturas/route.js`, `src/app/api/facturas/[id]/route.js`

### B3. Formulario de cliente — No muestra ni guarda campo NIF ✅ CORREGIDO
~~El formulario de creación/edición de clientes no tiene el campo NIF.~~
- **Archivos corregidos:** `src/componentes/modales/ModalEditarCliente.js`, `src/app/gestion/clientes/page.js`

### B4. VeriFactu — Cliente sin NIF usa `NO-NIF` como ID en el XML ✅ CORREGIDO
~~Si un cliente no tiene NIF, el XML generado pone `<ID>NO-NIF</ID>`.~~
- **Archivo corregido:** `src/lib/verifactu.js` — Si no hay NIF, el bloque `<Destinatarios>` se omite.

### B5. Nueva factura — Límite de 100 albaranes al cargar ✅ CORREGIDO
~~La página carga con `?limit=100`. Si hay más de 100 albaranes, los más antiguos no aparecerán.~~
- **Archivo corregido:** `src/app/facturas/nuevo/page.js` — Cambiado a `?estado=EMITIDO&limit=500`

### B6. Nuevo albarán — Límite de 100 pedidos al cargar ✅ CORREGIDO
~~Mismo problema que B5 para pedidos al crear un albarán.~~
- **Archivo corregido:** `src/app/albaranes/nuevo/page.js` — Cambiado a `?limit=500`

---

## BUGS ADICIONALES CORREGIDOS (análisis ROADMAP)

- **C4** — Pedido marcado como Facturado aunque tuviese más albaranes sin factura → `api/albaranes/[id]/factura/route.js`
- **C5** — Rectificativas usaban secuencia de facturas normales → `api/facturas/[id]/rectificativa/route.js`
- **C6/M3** — Ordenar por `fechaHoraGenRegistro` con valores null rompía la query → `api/facturas/[id]/route.js`, `api/facturas/exportar-aeat/route.js`
- **C7/C8** — VeriFactu: hash sin validación de nulos, `<RegistroAnterior>` con campos vacíos → `src/lib/verifactu.js`
- **C9** — Dirección y teléfono de empresa hardcodeados en PDFs → `src/lib/pdfGenerator.js`
- **M1** — Pedido podía generar albaranes duplicados → `api/pedidos/[id]/albaran/route.js`
- **M2** — Items de facturas no-BORRADOR podían ser enviados sin error → `api/facturas/[id]/route.js`
- **M4/M5** — VeriFactu: rectificativas sin bloque correcto, TipoImpositivo hardcodeado → `src/lib/verifactu.js`
- **L1** — Entorno del emisor aceptaba cualquier string → `api/configuracion/emisor/route.js`
- **L2/L3** — VeriFactu: IDType incorrecto para clientes sin NIF, precisión decimal → `src/lib/verifactu.js`
- **L4** — Count de facturas vencidas solo miraba EMITIDA → `src/app/facturas/page.js`
- **L5** — Página nuevo albarán no indicaba si el pedido ya tenía albarán → `src/app/albaranes/nuevo/page.js`
- **L6** — Exportación AEAT sin límite de registros por lote → `api/facturas/exportar-aeat/route.js`

---

## FASE E — COBROS Y VENCIMIENTOS (mayo 2026)

### E1. Badges VENCIDA / PRÓXIMA en listado y detalle de facturas ✅ HECHO
- Listado `/facturas`: columna vencimiento muestra badge rojo "VENCIDA" o naranja "PRÓXIMA" según estado
- Detalle `/facturas/[id]`: badge junto a la fecha de vencimiento, en rojo/naranja según corresponda
- Condición próxima: ≤ 7 días hasta el vencimiento y estado EMITIDA
- **Archivos:** `src/app/facturas/page.js`, `src/app/facturas/[id]/page.js`

### E2. Registro de fecha de pago ✅ HECHO
- Nuevo campo `fechaPago DateTime?` en modelo `Factura`
- Al marcar como PAGADA desde la API PUT, se graba `fechaPago = new Date()` automáticamente
- El detalle muestra "Pagada DD/MM/AAAA" junto a la fecha de vencimiento
- **Archivos:** `prisma/schema.dev.prisma`, `src/app/api/facturas/[id]/route.js`, `src/app/facturas/[id]/page.js`

---

## FUNCIONALIDAD NUEVA (mayo 2026)

### F1. Crear factura manual sin albarán ✅ HECHO
- La página `/facturas/nuevo` ahora tiene dos pestañas: "Desde albarán" y "Factura manual"
- El formulario manual permite: cliente (opcional), líneas con descripción/cantidad/precio, fecha de vencimiento y notas
- Preview de totales en tiempo real (base + IVA + total)
- El POST `/api/facturas` ya soportaba esto; solo faltaba la UI
- **Archivo:** `src/app/facturas/nuevo/page.js`

---

## SEGURIDAD (mayo 2026)

### S5. Path traversal en subida de documentos ✅ CORREGIDO
- Se sanitiza `originalFilename` con `path.basename()` + regex `/[^a-zA-Z0-9._\-]/g → '_'`
- Evita que nombres como `../../../.env.local` sobreescriban archivos del servidor
- **Archivo:** `src/app/api/documentos/route.js`

### S6. Límite máximo en parámetro `limit` ✅ CORREGIDO
- Cambiado a `Math.min(parseInt(limit), 500)` en los tres listados principales
- Evita queries de full-table scan por `?limit=9999999`
- **Archivos:** `src/app/api/albaranes/route.js`, `src/app/api/facturas/route.js`, `src/app/api/pedidos/route.js`

### S10. Estado de pedido validado con enum ✅ YA ESTABA (Zod)
- `pedidoSchema` en `src/lib/validations.js` ya tenía `estado: z.enum([...])` — no requería cambio

---

## MEJORAS COMPLETADAS

## 1. PDF — Información del cliente desbordando el recuadro ✅ CORREGIDO
~~El recuadro del cliente en la nota de trabajo se quedaba pequeño cuando la dirección era larga.~~
- Recuadro ahora de altura dinámica: crece automáticamente con el contenido. Texto dividido en líneas con `splitTextToSize`. `startY` de la tabla se calcula dinámicamente.
- **Archivos:** `src/lib/pdfGenerator.js`

## 2. PDF — Botón "Imprimir" directo desde el pedido ✅ HECHO
Añadido botón "Imprimir PDF" que abre el PDF en una nueva pestaña con `Content-Disposition: inline`, usando el visor PDF nativo del navegador.
- **Archivos:** `src/app/pedidos/[id]/page.js`, `src/app/api/pedidos/[id]/pdf/route.js`

## 3. Pedido cliente — Quitar botón "Enviar Email" ✅ HECHO
Botón eliminado de la vista de detalle del presupuesto (donde estaba realmente).
- **Archivo:** `src/app/presupuestos/[id]/page.js`

## 4. Calculadora de Envíos — Mejoras generales ✅ HECHO
- Muestra por qué se eligió la tipología (criterios de peso y altura en la tarjeta de resultado).
- Botón "Añadir a pedido" abre un modal buscador de pedidos activos; al seleccionar uno, añade el coste de envío como línea nueva con feedback de éxito.
- Validación de PUT de pedidos ya no requiere clienteId obligatorio.
- **Archivos:** `src/componentes/calculadoras/CalculadoraLogistica.js`, `src/app/calculadora/logistica/page.js`, `src/app/api/pedidos/[id]/route.js`
