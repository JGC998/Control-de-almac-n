# Modificaciones pendientes

---

## BUGS PENDIENTES (detectados en revisión — aún sin corregir)

### B1. Albaranes — IVA hardcodeado al 21%
Al crear un albarán, el IVA se calcula siempre al 21% fijo en lugar de leer el valor de la tabla `Config`. Si el IVA cambia en configuración, los albaranes no lo reflejarán.
- **Archivo:** `src/app/api/albaranes/route.js` línea 58

### B2. Facturas — IVA hardcodeado al 21%
Mismo problema que B1 pero en facturas.
- **Archivo:** `src/app/api/facturas/route.js` línea 59

### B3. Formulario de cliente — No muestra ni guarda campo NIF
El schema y la validación ya tienen el campo `nif`, pero el formulario de creación/edición de clientes no lo tiene. Hay que añadir el campo NIF en la UI del cliente.
- **Archivos:** formulario de cliente (modal o página de edición)

### B4. VeriFactu — Cliente sin NIF usa `NO-NIF` como ID en el XML
Si un cliente no tiene NIF, el XML generado pone `<ID>NO-NIF</ID>`, lo que puede no ser válido según la AEAT. Hay que validar o usar un tipo de identificador alternativo correcto.
- **Archivo:** `src/lib/verifactu.js` línea 112

### B5. Nueva factura — Límite de 100 albaranes al cargar
La página carga con `?limit=100`. Si hay más de 100 albaranes, los más antiguos no aparecerán.
- **Archivo:** `src/app/facturas/nuevo/page.js` línea 14

### B6. Nuevo albarán — Límite de 100 pedidos al cargar
Mismo problema que B5 para pedidos al crear un albarán.
- **Archivo:** `src/app/albaranes/nuevo/page.js`

---

## MEJORAS PENDIENTES

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
