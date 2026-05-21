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

### ⏳ Fase E — Cobros y vencimientos
- ⏳ Estado automático `VENCIDA` si `fechaVencimiento < hoy` y `estado = EMITIDA`
- ⏳ Panel "Facturas pendientes de cobro" en `/facturas` o dashboard
- ⏳ Badge visual en listado: vencida (rojo), próxima a vencer ≤ 7 días (naranja)
- ⏳ Registro de fecha de pago real al marcar PAGADA

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
- ⏳ PDF pedidos — texto de cliente desbordando recuadro
- ⏳ Calculadora de Envíos — botón "añadir al pedido", mejoras UX

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
