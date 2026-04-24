# 🏭 Gestión de Taller y Control de Almacén

Aplicación web para la gestión de un taller especializado en la fabricación de piezas y el control de su almacén de materias primas.

## 🚀 Tecnologías

*   **Framework:** Next.js con React.
*   **Estilo:** Tailwind CSS y DaisyUI (Tema por defecto: `forest`).
*   **Gestión de Estado:** Hooks de React (`useState`, `useEffect`, `useMemo`) y `localStorage` para persistencia de datos en el cliente.
*   **Exportación a PDF:** jsPDF y jspdf-autotable.

## Entorno de Desarrollo

Para ejecutar este proyecto de forma local, es necesario configurar las variables de entorno:
1. Copia el archivo `.env.example` y renómbralo a `.env.local`.
2. Completa las credenciales de la variable `DATABASE_URL` para conectar tu base de datos PostgreSQL.

## 📋 Módulos Principales

El proyecto se compone de las siguientes secciones accesibles desde la barra de navegación:

1.  **🏠 Dashboard / Inicio:**
    *   Panel de control con estadísticas de pedidos pendientes (clientes y proveedores) e inventario bajo.
    *   Tabla de movimientos recientes de stock.

2.  **💰 Tarifas:**
    *   Visualización de los precios por metro cuadrado y peso de las materias primas.
    *   Los datos se obtienen de `/public/data/precios.json`.

3.  **🧮 Calculadora de Piezas:**
    *   Herramienta para calcular el coste y peso de las piezas a fabricar introduciendo dimensiones y material.
    *   Permite acumular cálculos en un presupuesto y exportar el resultado a un archivo PDF.

4.  **📦 Pedidos de Clientes:**
    *   Módulo para la gestión del catálogo de productos (CRUD: Crear, Leer, Actualizar, Eliminar).
    *   Registro y seguimiento de pedidos de clientes con estados (Activo/Completado).
    *   Cálculo automático de totales de precio y peso por pedido.

5.  **🚚 Pedidos a Proveedores:**
    *   Sistema de registro y seguimiento de pedidos realizados a proveedores con estados (Pendiente/Recibido).

## 🛠️ Componentes de Apoyo

El proyecto también incluye componentes de apoyo que no están enlazados directamente en el menú de navegación principal:

*   **`CalculadoraPVC.jsx`**: Una calculadora específica para presupuestar bandas de PVC, incluyendo opciones de unión (vulcanizado/grapa) y la adición de tacos.
*   **`Procesos.jsx`**: Un visor que muestra los parámetros para procesos de fabricación específicos (ej. Vulcanizado, Troquelado), cargando la información desde `/public/data/procesos.json`.