# ROADMAP — CRM Taller

> Última actualización: 2026-06-04  
> Generado desde `ideas.txt` + sesión de planificación

---

## 🎯 Visión general

El CRM tiene la base operativa completa (pedidos, presupuestos, stock, importaciones, facturación). La siguiente iteración se centra en **inteligencia de negocio sin automatismos**: el sistema da información precisa sobre rentabilidad, costes y riesgos, pero el usuario siempre decide. A medio plazo, se añade agilidad operativa (picking tablet, portal cliente) y análisis de proveedores.

---

## 📋 Backlog completo

| ID | Tarea | Tipo | Complejidad | Estado |
|----|-------|------|-------------|--------|
| T-61 | Plantillas de contenedor reutilizables | Full stack + DB | Media | ⏳ |
| T-65 | Vincular referencias con materiales del catálogo | Full stack | Grande | ⏳ |
| N-01 | Semáforo de rentabilidad post-importación | Full stack | Media | ✅ |
| N-02 | Indicador de margen en tiempo real al crear pedido | Frontend | Media | ✅ |
| N-03 | Comparativa histórica de precios por proveedor | Full stack | Media | ✅ |
| N-04 | Reenvío de presupuestos caducados con un clic | Frontend | Pequeña | ✅ |
| N-05 | Alerta de stock mínimo configurable | Full stack | Pequeña | ✅ |
| N-06 | Dashboard ejecutivo con KPIs reales | Frontend | Media | ⏳ |
| N-07 | Portal público de cliente (link para ver presupuesto) | Full stack | Grande | ⏳ |
| N-08 | Modo picking en tablet para preparar pedidos | Full stack | Grande | ⏳ |

---

## 🗺️ Fases propuestas

### Fase 1 — Inteligencia de rentabilidad *(prioridad alta)*
> Dar al negocio visibilidad sobre si está ganando o perdiendo dinero en cada operación. Sin automatismos: toda la información es de lectura. Estimación: 3-5 días.

---

#### N-01 — Semáforo de rentabilidad post-importación
**Tipo:** Full stack · **Complejidad:** Media

Cuando se guarda o visualiza una importación, aparece una sección "Análisis de rentabilidad" que cruza el nuevo €/metro calculado con los precios de venta actuales en `tarifas-rollo`.

**Qué muestra (solo lectura, sin editar nada):**

| Referencia | Coste importación (€/m) | Precio venta actual (€/m) | Margen actual | Precio mínimo para cubrir costes |
|------------|------------------------|--------------------------|---------------|----------------------------------|
| PVC-4-BL   | 3.21 €                | 3.80 €                   | 🟢 +18.4%    | 3.53 € (×1.1 sobre coste)       |
| PVC-2-BL   | 1.48 €                | 1.40 €                   | 🔴 −5.4%     | 1.63 € (×1.1 sobre coste)       |

- **Semáforo:** 🟢 >15% margen · 🟡 5-15% · 🔴 por debajo de coste o <5%
- El "precio mínimo" se calcula como `costeImportacion × (1 + margenMinimoConfig)` donde el margen mínimo es configurable en Configuración
- No hay ningún botón de "actualizar" — el usuario ve la info y actúa manualmente si quiere

**Implementación:**
- `GET /api/importaciones/[id]/analisis-rentabilidad` → cruza bobinas de la importación con `tarifaRollo` por material+espesor+ancho
- Nueva sección en la vista de detalle de importación (botón desplegable "Ver análisis de rentabilidad")
- Margen mínimo configurable: nueva clave `margen_minimo_alerta` en tabla `Config`

---

#### N-02 — Indicador de margen en tiempo real al crear pedido
**Tipo:** Frontend · **Complejidad:** Media

En el `FormularioPedidoCliente`, debajo del resumen de totales, mostrar:

```
Subtotal coste (suma costoUnitario × cantidad):    245.00 €
Subtotal venta (con margen aplicado):              380.00 €
─────────────────────────────────────────────────────────
Margen estimado:  55.1%  |  Ganancia bruta: 135.00 €
```

- Si el margen baja del `margen_minimo_alerta`, el indicador se pone en naranja con aviso
- Si algún producto no tiene `costoUnitario`, se muestra "⚠️ X artículos sin coste registrado"
- Ningún bloqueo: el operario puede guardar igualmente, solo ve la información

**Implementación:**
- El formulario ya tiene todos los items y el margen seleccionado
- `costoUnitario` ya existe en `Producto` — solo hace falta leerlo cuando se selecciona un producto del catálogo
- Añadir al estado del item el `costoUnitario` cuando se selecciona desde el modal de búsqueda
- Cálculo 100% en cliente (sin nueva API)

---

### Fase 2 — Análisis de proveedores y seguimiento comercial
> Mejor información para comprar mejor y no perder oportunidades de venta. Estimación: 2-3 días.

---

#### N-03 — Comparativa histórica de precios por proveedor
**Tipo:** Full stack · **Complejidad:** Media

En la pantalla de pedidos a proveedor (`/proveedores`), añadir una pestaña o sección "Histórico de precios" donde, al seleccionar un material, se ve:

- Gráfico de líneas: eje X = fecha importación, eje Y = €/metro, una línea por proveedor
- Tabla resumen: proveedor / última compra / precio último / precio medio / nº de pedidos
- Filtros: material, rango de fechas

**Implementación:**
- `GET /api/pedidos-proveedores-data/analisis-precios?material=PVC` → agrupa por proveedor y fecha, devuelve histórico de `precioMetro` por bobina
- Los datos ya están en `BobinaPedido` — solo hay que consultarlos agrupados
- Frontend: Recharts `LineChart` (ya instalado en el proyecto)

---

#### N-04 — Reenvío de presupuestos caducados con un clic
**Tipo:** Frontend · **Complejidad:** Pequeña

En la pantalla de presupuestos, los que llevan más de X días en estado "Enviado" muestran un badge "Sin respuesta (N días)" y un botón "Recordar". Al hacer clic:
1. Abre un pequeño modal con asunto y mensaje pre-rellenado editable
2. Al confirmar, llama a `POST /api/presupuestos/[id]/email` (ya existe) con el cuerpo personalizado
3. El presupuesto queda marcado con `ultimoRecordatorio: Date.now()`

**Implementación:**
- Añadir campo `ultimoRecordatorio DateTime?` al modelo `Presupuesto` (migración sencilla)
- El umbral de días sin respuesta se configura en Configuración (`presupuesto_dias_caducidad`, defecto: 7)
- La lógica de detección ("sin respuesta desde hace X días") ya existe parcialmente en el informe de presupuestos sin respuesta

---

### Fase 3 — Operativa de almacén y stock
> Digitalizar la gestión física del almacén. Estimación: 2-3 días.

---

#### N-05 — Alerta de stock mínimo configurable
**Tipo:** Full stack · **Complejidad:** Pequeña

Cada material en stock puede tener un `stockMinimo` (metros mínimos antes de reordenar). Al cargar la app o al registrar una salida, si un material cae por debajo del mínimo → se crea una notificación automática en `Notificacion` (ya existe el sistema).

**Implementación:**
- Añadir `stockMinimo Float @default(0)` al modelo `Stock` (migración simple)
- En `POST /api/almacen-stock?action=salida`: después de actualizar el stock, comprobar si los metros disponibles caen por debajo de `stockMinimo` y si es así crear la notificación
- En la pantalla de stock, mostrar el umbral mínimo como campo editable por fila
- Panel de "Stock bajo mínimo" en el dashboard

---

#### T-61 — Plantillas de contenedor reutilizables
**Tipo:** Full stack + DB · **Complejidad:** Media

Botón "Guardar como plantilla" en la calculadora de contenedor. Guarda la lista de artículos (sin precios). Al abrir una nueva importación, "Cargar plantilla" rellena la tabla y deja los precios en blanco para que el usuario los introduzca.

**Implementación:**
- Nueva tabla `PlantillaContenedor` en Prisma: `id, nombre, bobinas Json, creadaEn`
- `POST /api/importaciones/plantillas` + `GET /api/importaciones/plantillas`
- Selector de plantilla en la calculadora con modal similar al de importaciones guardadas

---

### Fase 4 — Engagement y portal cliente *(futuro)*
> Reducir fricción con el cliente. Estimación: 4-6 días.

---

#### N-06 — Dashboard ejecutivo con KPIs reales
**Tipo:** Frontend · **Complejidad:** Media

Reemplazar el dashboard actual por uno con:
- **Hoy:** importe pedido, importe presupuestado, comparativa con mismo día semana anterior
- **Este mes:** ventas acumuladas vs. objetivo, margen medio, ticket medio
- **Alertas:** facturas vencidas (importes), stock bajo mínimo, presupuestos sin respuesta >7 días
- **Top 5:** productos más pedidos este mes, clientes más activos

Todo ello con datos que ya existen en la BD, sin nuevas API salvo `/api/dashboard` mejorado.

---

#### N-07 — Portal público de cliente (link para ver presupuesto)
**Tipo:** Full stack · **Complejidad:** Grande

Generar un link único y temporal (`/p/[token]`) donde el cliente puede:
- Ver el presupuesto en HTML sin descargar PDF
- Hacer clic en "Acepto este presupuesto" → cambia estado a "Aceptado" automáticamente
- Opcional: dejar un comentario o pedir cambios

**Implementación:**
- Campo `tokenPublico String? @unique` y `tokenExpira DateTime?` en `Presupuesto`
- `GET /presupuestos/p/[token]` → página pública sin auth
- `POST /api/presupuestos/p/[token]/aceptar` → actualiza estado
- Botón "Compartir enlace" en la vista de presupuesto genera y copia el token

---

#### N-08 — Modo picking en tablet para preparar pedidos
**Tipo:** Full stack · **Complejidad:** Grande

Al ver un pedido en `/tablet`, el operario ve una lista de artículos con checkboxes. Va marcando lo que saca del almacén. Al marcarlos todos como "preparado", el sistema pregunta si generar el albarán. Integra con el stock: al marcar un artículo, se descuenta automáticamente.

**Implementación:**
- Nuevo estado en `PedidoItem`: `preparado Boolean @default(false)`
- Vista tablet adaptada con ítems grandes y checkboxes táctiles
- Al completar todos → modal de confirmación + `POST /api/pedidos/[id]/albaran`

---

### T-65 — Vincular referencias con materiales del catálogo *(pendiente decisión)*
**Tipo:** Full stack · **Complejidad:** Grande

Selector opcional por fila en la calculadora de contenedor → material de `tarifas-rollo`. Permite propagar €/m calculado a `precioCompra` del material. Requiere decidir si vincular a `tarifas-rollo` (tiene `precioCompra`) o a `materiales`.

---

## ⚡ Quick wins

- [ ] **N-04** — Reenvío presupuestos caducados (~3h) — solo UI + email ya existente
- [ ] **N-05** — Stock mínimo (~2h) — campo + notificación en salida
- [ ] **N-03** — Comparativa proveedores (~4h) — query agrupada + gráfico Recharts

---

## 🚧 Dependencias y bloqueos

- **T-65** requiere decisión de diseño sobre qué tabla vincular (tarifas-rollo vs. materiales)
- **N-07** (portal cliente) requiere gestión de tokens con expiración — diseñar política de tiempo de validez
- **N-08** (picking tablet) necesita que el modelo `PedidoItem` tenga el campo `preparado`
- **N-01** y **N-02** comparten la configuración de margen mínimo → implementar en el mismo paso

---

## 💡 Ideas de la sesión de planificación — descartadas o pospuestas

- **Actualización automática de tarifas desde importación** — Descartada explícitamente por el usuario. "Hay muchas tarifas a tener en cuenta, quiero verlo yo." Reemplazada por N-01 (semáforo informativo sin escritura).
- **VeriFactu D2 — envío directo a AEAT** — Pospuesto a 2027, pendiente decisión sobre certificado FNMT.
- **Cálculo de volumen del contenedor** — Baja prioridad, sin demanda activa.

---

## ✅ Completado

- ✅ **T-64** Alerta variación precio ▲/▼ en calculadora contenedor (2026-06-04)
- ✅ **T-63** Exportar Excel 3 hojas (Artículos, Desglose, Gastos y Resumen) (2026-06-04)
- ✅ **T-58** Autocompletar referencias con datalist histórico (2026-06-04)
- ✅ **Auditoría completa** — 20 hallazgos seguridad/bugs/API corregidos (2026-06-04)
- ✅ **T-66** Editar importación guardada — PUT API + modal Actualizar (2026-06-03)
- ✅ **T-56** Proveedor, nº factura, nº contenedor — migración Prisma + API + modal (2026-06-03)
- ✅ **T-62** Estado del contenedor (PEDIDO|TRANSITO|ADUANA|RECIBIDO) + fechas (2026-06-03)
- ✅ **T-60/57/59** Filas naranja, duplicar fila, notas por artículo (2026-06-03)
- ✅ **T-55** Exportar PDF con desglose completo + @media print (2026-06-03)
- ✅ **T-52/53/54** Multi-tipo, validación Zod, selector de tipo (2026-06-03)
- ✅ **SEC-01/02 + MAINT-01/02 + PERF-01** Code-review (2026-06-03)
- ✅ Layout ancho completo, USD/M y USD/M², historial con carga, prorrateo por valor (2026-06-01/02)

---

*Para añadir nuevas ideas, escríbelas en `ideas.txt` y vuelve a ejecutar `/roadmap`.*
