# 🏭 Gestión Taller y Control de Almacén

Aplicación web para la gestión de un taller especializado en la fabricación de piezas y el control de su almacén de materias primas.

## 🚀 Tecnologías

* **Frontend:** Next.js (v16) con React (v19)
* **Estilo:** Tailwind CSS y DaisyUI (Tema por defecto: `forest`)
* **Estado:** Hooks de React (`useState`, `useEffect`, `useMemo`) y `localStorage` para persistencia.
* **Exportación:** jsPDF y jspdf-autotable.

## 📋 Módulos Principales

El proyecto se compone de las siguientes secciones accesibles desde la barra de navegación:

1.  **Dashboard / Inicio:**
    * Panel de control con estadísticas de pedidos pendientes (clientes y proveedores) e inventario bajo.
    * Tabla de movimientos recientes de stock.

2.  **Tarifas:**
    * Visualización de los precios por metro cuadrado y peso de las materias primas (datos en `/public/data/precios.json`).

3.  **Calculadora de Piezas:**
    * Herramienta para calcular el coste y peso de las piezas a fabricar introduciendo dimensiones y material.
    * Permite acumular cálculos en un presupuesto y exportar el resultado a un archivo PDF.

4.  **Pedidos Clientes:**
    * Módulo para la gestión del catálogo de productos (creación, edición y eliminación de productos).
    * Registro y seguimiento de pedidos de clientes (Activo/Completado), con cálculo de totales de precio y peso.

5.  **Pedidos Proveedores:**
    * Sistema de registro y seguimiento de pedidos realizados a proveedores (Pendiente/Recibido).

## 🛠️ Procesos Adicionales

El proyecto también incluye componentes de apoyo no enlazados en el menú principal:

* `CalculadoraPVC.jsx`: Calculadora de presupuestos para bandas de PVC, incluyendo opciones de unión (vulcanizado/grapa) y tacos.
* `Procesos.jsx`: Visor de parámetros de procesos de fabricación específicos (e.g., Vulcanizado, Troquelado) basados en `/public/data/procesos.json`.