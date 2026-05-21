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
