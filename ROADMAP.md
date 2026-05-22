# Hoja de ruta — CRM Taller

Estado general del proyecto y plan de implementación.
- ✅ Completado  |  🔄 En progreso  |  ⏳ Pendiente  |  ❌ Descartado

---

## Fases completadas

### ✅ Fase A — Navegación y diseño
- Topnav horizontal con dropdowns JS (un solo dropdown abierto a la vez)
- Tema Corporate fijo (eliminado selector de temas por hydration mismatch)
- Hub pages: `/ventas`, `/compras`, `/almacen`, `/gestion`, `/herramientas`
- BD SQLite local para desarrollo (`prisma/dev.db`) con datos mock

### ✅ Fase B — Albaranes
- Modelos Prisma: `Albaran`, `AlbaranItem` · campo `valorado Boolean`
- API completa: GET/POST `/api/albaranes`, GET/PUT/DELETE `/api/albaranes/[id]`
- PDF de albarán (valorado: muestra precios / sin valorar: solo descripción + cantidad)
- Generación desde pedido con modal "¿Valorado / Sin valorar?"
- Páginas: `/albaranes`, `/albaranes/[id]`, `/albaranes/nuevo`

### ✅ Fase C — Facturas
- Modelos Prisma: `Factura`, `FacturaItem`
- API completa: GET/POST `/api/facturas`, GET/PUT/DELETE `/api/facturas/[id]`
- PDF de factura con desglose IVA + QR VeriFactu (cuando huella presente)
- Páginas: `/facturas`, `/facturas/[id]`, `/facturas/nuevo`
- Inmutabilidad: facturas EMITIDA/PAGADA no se pueden editar
- Anti-doble-facturación: `albaranId @unique` en modelo Factura
- Al generar factura desde albarán → pedido pasa a estado "Facturado"

### ✅ Fase D1 — VeriFactu: Hash + QR + Configuración emisor
- Campos nuevos en `Factura`: `tipoFactura`, `huella`, `huellaAnterior`, `fechaHoraGenRegistro`, `estadoEnvioAeat`, `csvAeat`
- Modelo `ConfiguracionEmisor` (NIF, nombre, dirección, entorno pruebas/producción)
- `src/lib/verifactu.js`: `getFechaHoraHusoEspana`, `calcularHuella`, `construirURLQR`, `generarXMLRegistroAlta`
- Al emitir factura: calcula huella SHA-256, encadena con anterior, genera QR en PDF
- Página `/configuracion/emisor` con selector entorno pruebas/producción

### ✅ Fase D2 — VeriFactu: Exportación XML para AEAT manual
> Flujo: emitir factura → PDF con QR → exportar XML → usuario sube al portal AEAT

- API `GET /api/facturas/exportar-aeat` — genera `RegFactuSistemaFacturacion.xml`
  - Incluye todas las facturas `estadoEnvioAeat = 'PENDIENTE'`
  - Tras generar, marca las facturas como `EXPORTADO`
- Botón "Exportar XML para AEAT" en `/facturas` (solo visible si hay PENDIENTES)
- Campo CSV de confirmación AEAT en `/facturas/[id]` (marca como CONFIRMADO)
- Badge `estadoEnvioAeat` en listado y detalle de facturas
- Fix timezone: `getFechaHoraHusoEspana` usa `en-GB` formatToParts comparando horas Madrid vs UTC directamente
- Fix `<RegistroAnterior>`: referencia correctamente la factura previa en la cadena de huellas

---

## En curso — Prioridad alta

### ✅ Fase D3 — Facturas rectificativas R1–R5
- Botón "Emitir rectificativa" desde `/facturas/[id]` (solo en EMITIDA/PAGADA, sin rectificativa activa)
- Modal con tipo (R1–R5) y modalidad (S=Sustitución / I=Diferencias) + motivo
- API `POST /api/facturas/[id]/rectificativa` — crea BORRADOR copiando ítems de la original
- XML con elemento `<FacturasRectificadas>` referenciando la factura original
- PDF muestra "FACTURA RECTIFICATIVA" + tipo + referencia a la original
- La factura original permanece inmutable; se listan sus rectificativas en su detalle

---

## Pendiente — Prioridad media

### ✅ Fase E — Cobros y vencimientos
- ✅ Badge visual en listado: vencida (rojo), próxima a vencer ≤ 7 días (naranja)
- ✅ Badge en detalle de factura junto a fecha de vencimiento
- ✅ Registro de fecha de pago real al marcar PAGADA (`fechaPago DateTime?` en schema)
- ⏳ Panel "Facturas pendientes de cobro" en dashboard

### ⏳ Fase F — Presupuesto → Pedido (revisión y mejora)
- ⏳ Revisar y pulir flujo completo: crear presupuesto → convertir a pedido → generar albarán → factura
- ⏳ Indicador visual del estado del presupuesto (aceptado, rechazado, pendiente)
- ⏳ PDF de presupuesto mejorado

---

## Pendiente — Prioridad baja

### ⏳ Fase G — Búsqueda global mejorada
- ⏳ Buscar por NIF de cliente, referencia de producto, importe exacto
- ⏳ Resultados agrupados por tipo (Clientes / Pedidos / Facturas / Productos)
- ⏳ Atajos de teclado (Ctrl+K)

### ⏳ Fase H — Filtros combinados en listas
- ⏳ Filtro por rango de fechas en pedidos, facturas, albaranes
- ⏳ Filtro por cliente en todas las listas
- ⏳ Filtro por rango de importe
- ⏳ Filtros persistentes en URL (ya existe base en estado)

### ⏳ Fase I — Acciones en bloque
- ⏳ Selección múltiple con checkbox en listados
- ⏳ Marcar varias facturas como pagadas de golpe
- ⏳ Exportar selección a Excel/PDF
- ⏳ Eliminar en bloque (con confirmación)

---

## Backlog técnico

- ⏳ Stock: descuento automático al pasar albarán a ENTREGADO
- ⏳ Email de facturas y albaranes (ya existe para pedidos)
- ⏳ Dashboard de inicio con métricas reales (facturación mes, pendientes, stock bajo)
- ✅ PDF pedidos — texto de cliente desbordando recuadro (recuadro dinámico con `splitTextToSize`)
- ✅ Calculadora de Envíos — botón "añadir al pedido" + mejoras UX implementados

---

## Decisiones de diseño VeriFactu

| Decisión | Resolución |
|---|---|
| Envío a AEAT | **XML manual**: botón "Exportar XML" → descarga → usuario sube al portal AEAT con su cert. FNMT |
| Zona horaria | **`Europe/Madrid`** via `Intl.DateTimeFormat` (resuelve DST +01:00/+02:00 automáticamente) |
| Formato números en hash | **`parseFloat(n).toString()`** — especificado en Orden HAC/1177/2024 |
| Race condition | **Descartada** — instalación mono-usuario |
| Certificado en servidor | **Descartado** — el cert. FNMT lo usa el usuario en su propio navegador |
| Scope de VeriFactu | **Solo modelo `Factura`** — pedidos, albaranes y presupuestos quedan fuera |
| Mono/multi empresa | **Mono-empresa** |
| Entorno de pruebas | **`preportal.aeat.es`** — sin enviar nada real a Hacienda |

---

## Contexto técnico

| Item | Valor |
|---|---|
| Framework | Next.js 16 App Router + React 19 |
| CSS | Tailwind CSS 4 + DaisyUI 5 |
| ORM | Prisma 6 · SQLite (dev) / MySQL (prod) |
| PDF | jsPDF + jspdf-autotable |
| Data fetching | SWR |
| Icons | Lucide React |
| Rama activa | `refactorizacion` |
| Plazo VeriFactu (usuarios IS) | 1 enero 2027 |

---

*Última actualización: mayo 2026*

---

---

# INFORME TÉCNICO — Análisis de código (mayo 2026)

## Bugs detectados

### CRÍTICOS — todos corregidos ✅

| # | Estado | Descripción |
|---|--------|-------------|
| C1 | ✅ | IVA lee de `Config` con fallback 0.21 — `api/albaranes/route.js` |
| C2 | ✅ | IVA idem en actualización albarán — `api/albaranes/[id]/route.js` |
| C3 | ✅ | IVA idem en creación facturas — `api/facturas/route.js` |
| C4 | ✅ | Pedido solo pasa a "Facturado" cuando TODOS sus albaranes tienen factura — `api/albaranes/[id]/factura/route.js` |
| C5 | ✅ | Rectificativas usan secuencia separada `rectificativa` — `api/facturas/[id]/rectificativa/route.js` |
| C6 | ✅ | Filtro `fechaHoraGenRegistro: { not: null }` en query de huella anterior — `api/facturas/[id]/route.js` |
| C7 | ✅ | `<RegistroAnterior>` solo se genera si `prevFactura` existe — `lib/verifactu.js` |
| C8 | ✅ | `calcularHuella` valida campos obligatorios antes del hash — `lib/verifactu.js` |
| C9 | ✅ | `getEmisorInfo()` lee dirección/teléfono de `ConfiguracionEmisor` — `lib/pdfGenerator.js` |
| C10 | ✅ | Falso positivo — `generateAlbaranPDF` (línea 710) y `generateFacturaPDF` (línea 513) ya estaban definidas |

### MEDIOS — todos corregidos ✅

| # | Estado | Descripción |
|---|--------|-------------|
| M1 | ✅ | Guard anti-duplicado en `api/pedidos/[id]/albaran/route.js` |
| M2 | ✅ | Items de facturas no-BORRADOR retornan 422 — `api/facturas/[id]/route.js` |
| M3 | ✅ | `fechaHoraGenRegistro: { not: null }` en exportar-aeat — `api/facturas/exportar-aeat/route.js` |
| M4 | ✅ | Bloque `<TipoRectificativa>` siempre presente en rectificativas — `lib/verifactu.js` |
| M5 | ✅ | `TipoImpositivo` calculado dinámicamente desde `tax/subtotal*100` — `lib/verifactu.js` |
| M6 | ✅ | Página filtra solo `EMITIDO`/`ENTREGADO` sin factura — `app/facturas/nuevo/page.js` |
| M7 | ✅ | `pesoUnitario` con guard `|| 0` en PDF de pedido — `lib/pdfGenerator.js` |

### LEVES — todos corregidos ✅

| # | Estado | Descripción |
|---|--------|-------------|
| L1 | ✅ | `entorno` validado como enum `['pruebas','produccion']` — `api/configuracion/emisor/route.js` |
| L2 | ✅ | Clientes sin NIF omiten bloque `<Destinatarios>` en lugar de usar ID inválido — `lib/verifactu.js` |
| L3 | ✅ | `fmtNum` usa `toFixed(2)` para precisión decimal correcta — `lib/verifactu.js` |
| L4 | ✅ | Count vencidas incluye `EMITIDA` y `PAGADA` — `app/facturas/page.js` |
| L5 | ✅ | Tarjeta de pedido con albarán muestra aviso y deshabilita botón — `app/albaranes/nuevo/page.js` |
| L6 | ✅ | Exportación AEAT limitada a lotes de 1000 registros — `api/facturas/exportar-aeat/route.js` |

---

## Funcionalidad incompleta / pendiente de construir

1. ✅ **QR en PDF de factura** — ya implementado en `generateFacturaPDF` (verificado)
2. ✅ **Campo `valorado` en albarán** — `generateAlbaranPDF` ya respeta `valorado === false` (verificado)
3. ✅ **Crear factura manual sin albarán** — `/facturas/nuevo` tiene ahora pestaña "Factura manual"
4. ✅ **Formulario de cliente sin campo NIF** — corregido en `ModalEditarCliente.js` y `clientes/page.js`
5. ✅ **IVA configurable** — centralizado en los 4 endpoints, lee de `Config` tabla con fallback 0.21
6. ✅ **Serie separada para rectificativas** — usan secuencia `rectificativa` separada

---

## Análisis de seguridad

> Contexto: aplicación en red local, sin exposición a internet. Los riesgos se valoran en ese escenario.

### CRÍTICO

| # | Estado | Solución |
|---|--------|---------|
| ✅ S1 | CORREGIDO | `middleware.js` — PIN via `AUTH_PIN` env. Sin PIN configurado = sin restricción (dev). Cookie `crm-auth` HttpOnly/SameSite=Strict, 8h. Cubre todos los endpoints y páginas |
| ✅ S2 | CORREGIDO | El middleware de S1 cubre `/api/config/backup` automáticamente |
| ✅ S3 | CORREGIDO | `AuditLog` — registro al cambiar estado de factura (`FACTURA_EMITIDA`, `FACTURA_PAGADA`, etc.) en `api/facturas/[id]/route.js` |
| ✅ S4 | CORREGIDO | `AuditLog` — registro al crear rectificativa (`RECTIFICATIVA_CREADA`) en `api/facturas/[id]/rectificativa/route.js` |

### ALTO

| # | Vulnerabilidad | Ubicación | Impacto |
|---|---------------|-----------|---------|
| ✅ S5 | ~~**Path traversal en subida de documentos**~~ — CORREGIDO: `path.basename()` + whitelist regex en `api/documentos/route.js` | — | — |
| ✅ S6 | ~~**Paginación sin límite máximo**~~ — CORREGIDO: `Math.min(limit, 500)` en albaranes, facturas y pedidos | — | — |
| ✅ S7 | ~~**Export CSV sin límite**~~ — CORREGIDO: `take: 5000` en todas las queries del CSV export | — | — |
| ✅ S8 | ~~**Informes financieros públicos**~~ — CORREGIDO: cubierto por el middleware S1 (AUTH_PIN) | — | — |

### MEDIO

| # | Estado | Solución |
|---|--------|---------|
| ✅ S9 | CORREGIDO | `src/lib/rateLimiter.js` — ventana deslizante 60s por IP. Aplicado a `/api/informes` (límite 20 req/min). Retorna `429` con `Retry-After` |
| ✅ S10 | YA ESTABA | `pedidoSchema` Zod con `estado: z.enum([...])` |
| ✅ S11 | CORREGIDO | `error.message` eliminado de 4 catch blocks que no lanzaban errores de negocio. `from-presupuesto` conserva el patrón (sus throws son mensajes seguros de usuario) |

### BAJO

| # | Vulnerabilidad | Impacto |
|---|---------------|---------|
| ✅ S12 | ~~Datos empresa hardcodeados~~ — CORREGIDO: `getEmisorInfo()` lee de `ConfiguracionEmisor` | — |
| S13 | `console.error(error)` vuelca stack traces Prisma en logs | Baja prioridad — logs de servidor locales |



# Modificaciones pendientes

## 1. PDF — Información del cliente desbordando el recuadro
El recuadro del cliente en la nota de trabajo a veces se queda pequeño cuando la dirección es larga, y el texto se sale visualmente. Hay que hacer que el contenido se adapte al recuadro (texto que se ajuste, el recuadro que crezca, o truncar con ellipsis).
- **Archivo:** `src/app/api/pedidos/[id]/pdf/route.js`

## 2. PDF — Botón "Imprimir" directo desde el pedido
En vez de (o además de) descargar el PDF, añadir un botón que abra el diálogo de impresión del navegador directamente con el PDF cargado, sin tener que descargarlo y abrirlo aparte.
- **Archivo:** `src/app/pedidos/[id]/page.js`

## 3. Pedido cliente — Quitar botón "Enviar Email"
El botón "Enviar Email" no se usa y genera ruido en la interfaz. Eliminarlo de la vista de detalle del pedido de cliente.
- **Archivo:** `src/app/pedidos/[id]/page.js`

## 4. Calculadora de Envíos — Mejoras generales
- **Resultado detallado:** Mostrar desglose tras calcular: coste de paletizado, coste de transporte, tipología seleccionada (PARCEL, HALF, LIGHT…), y por qué se eligió esa tipología.
- **Añadir al pedido directamente:** Botón para añadir el coste de envío calculado como una línea más en un pedido de cliente existente (o al crear uno nuevo).
- **Mejoras visuales / UX:** Layout más limpio, feedback en tiempo real mientras se rellena el formulario, mostrar el resultado de forma más destacada.
- **Archivos:** `src/app/calculadora/logistica/page.js`, `src/componentes/calculadoras/CalculadoraEnvios.js` (o equivalente)



Haz una revisión exhaustiva de todo el proyecto. 
Busca específicamente:
- Imports faltantes o incorrectos
- Vulnerabilidades de SQL injection
- Rutas sin manejo de errores
- Variables no declaradas
- Código duplicado o muerto
- Problemas de seguridad generales