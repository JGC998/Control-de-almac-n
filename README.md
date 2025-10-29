# 🚀 Componentes de Cohetes y Misiones Espaciales

Proyecto en Next.js y DaisyUI que simula una interfaz para la gestión y visualización de misiones espaciales.

## Componentes Principales

Se han utilizado varios componentes de DaisyUI y librerías externas para construir la interfaz:

*   **Navegación:** `Navbar`, `Menu` y `Drawer` para la estructura principal y la navegación móvil.
*   **Selección de Tema:** `Select` de DaisyUI para cambiar la apariencia de la aplicación.
*   **Comparador Visual (`Diff`):** Componente de DaisyUI para comparar dos imágenes con un deslizador.
*   **Selector de Fechas (`MyDatePicker`):** Implementado con `react-day-picker` para la planificación.
*   **Carrusel de Imágenes (`CarouselCard`):** Un carrusel avanzado creado con `Glide.js` para mostrar hardware.

## Estructura de Páginas

*   **/ (Inicio):** Página principal de la aplicación.
*   **/pagina1:** Registro de lanzamiento.
*   **/pagina2:** Reloj de Misión.
*   **/pagina3:** Planificador de Fechas de misión (usando `MyDatePicker`).
*   **/pagina4:** Comparativa de Cohetes (usando `Diff` para mostrar `cuhete.png` vs `cuhete_transformer.png`).
*   **/pagina5:** Vistas del Hardware de la misión (usando el carrusel `Glide.js`).

## Listado de Componentes Utilizados

A continuación se detallan los 13 componentes principales identificados en el proyecto:

### Componentes Propios

1.  **`Header`**: `src/components/Header.js` - Barra de navegación principal.
2.  **`ThemeSelect`**: `src/components/ThemeSelect.js` - Selector de temas.
3.  **`Diff`**: `src/components/Diff.js` - Comparador de imágenes.
4.  **`MyDatePicker`**: `src/components/MyDatePicker.js` - Selector de fechas.
5.  **`AutoCarousel`**: `src/components/AutoCarousel.js` - Carrusel de imágenes.
6.  **`CountDown`**: `src/components/CountDown.js` - Reloj de cuenta atrás.
7.  **`SortedTable`**: `src/components/SortedTable.js` - Tabla de datos ordenable.
8.  **`RadialProgress`**: `src/components/RadialProgress.js` - Indicador de progreso circular.

### Componentes de Librerías Externas

9.  **`Link`** (de `next/link`) - Para la navegación entre páginas.
10. **`Image`** (de `next/image`) - Para la optimización de imágenes.
11. **`DayPicker`** (de `react-day-picker`) - El calendario base para `MyDatePicker`.
12. **`Home`** (`src/app/page.js`) - Componente principal de la página de inicio.
13. **`Page4`** (`src/app/pagina4/page.js`) - Componente principal de la página de comparación.
# Control-de-almac-n
