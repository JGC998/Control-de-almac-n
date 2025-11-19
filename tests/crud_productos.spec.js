// tests/crud_productos.spec.js
import { test, expect } from '@playwright/test';

const URL_BASE = 'http://localhost:3000';

test.describe.serial('Flujo CRUD de Productos', () => {
  const testId = Date.now();
  const nombreProducto = `Producto CRUD ${testId}`;
  const refFabricante = `REF-CRUD-${testId}`;

  // Datos que asumimos que existen por las migraciones/semillas
  const FABRICANTE_EXISTENTE = 'Esbelt';
  const MATERIAL_EXISTENTE = 'PVC';

  test('1. Debería crear un nuevo producto', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/productos`);
    await expect(page.locator('h1:has-text("Gestión de Productos")')).toBeVisible();

    // Abrir modal
    await page.getByRole('button', { name: 'Nuevo Producto' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Producto' })).toBeVisible();

    // Rellenar formulario
    await page.getByPlaceholder('Referencia Fabricante').fill(refFabricante);
    
    // Seleccionar de catálogos existentes
    const fabricanteSelector = page.locator('select[name="fabricante"]');
    await expect(fabricanteSelector.locator(`option:has-text("${FABRICANTE_EXISTENTE}")`)).toBeAttached({ timeout: 15000 });
    await fabricanteSelector.selectOption({ label: FABRICANTE_EXISTENTE });

    const materialSelector = page.locator('select[name="material"]');
    await expect(materialSelector.locator(`option:has-text("${MATERIAL_EXISTENTE}")`)).toBeAttached({ timeout: 15000 });
    await materialSelector.selectOption({ label: MATERIAL_EXISTENTE });

    // Esperar a que los espesores se carguen para el material seleccionado
    const espesorSelector = page.getByLabel('Espesor (mm)');
    await expect(espesorSelector).toBeEnabled({ timeout: 10000 });
    await expect(page.getByRole('option', { name: '2 mm' })).toBeAttached();
    await espesorSelector.selectOption({ label: '2 mm' });

    // Rellenar dimensiones
    await page.getByPlaceholder('Largo (mm)').fill('1000');
    await page.getByPlaceholder('Ancho (mm)').fill('500');

    // Guardar
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Verificar que el producto aparece en la tabla
    // El nombre se autogenera, así que buscamos por la referencia única.
    const filaProducto = page.locator(`tr:has-text("${refFabricante}")`);
    await expect(filaProducto).toBeVisible();
    
    // Verificar que el precio se calculó y no es 0
    const celdaPrecio = filaProducto.locator('td').nth(3); // La cuarta columna es P. Unitario
    await expect(celdaPrecio).not.toHaveText('0.00 €');
    
    console.log(`\nÉXITO Test 1: Producto con ref "${refFabricante}" creado y precio calculado.`);
  });

  test('2. Debería eliminar el producto creado', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/productos`);

    // Aceptar el diálogo de confirmación
    page.on('dialog', dialog => dialog.accept());

    // Encontrar la fila y el botón de eliminar
    const filaProducto = page.locator(`tr:has-text("${refFabricante}")`);
    await expect(filaProducto).toBeVisible();
    await filaProducto.getByRole('button', { name: 'Eliminar' }).click();

    // Verificar que la fila ya no está visible
    await expect(page.locator('tr', { hasText: refFabricante })).not.toBeVisible();
    console.log(`\nÉXITO Test 2: Producto con ref "${refFabricante}" eliminado.`);
  });
});
