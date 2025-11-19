// tests/crud_proveedores.spec.js
import { test, expect } from '@playwright/test';

const URL_BASE = 'http://localhost:3000';

test.describe.serial('Flujo CRUD de Proveedores', () => {
  const testId = Date.now();
  const nombreProveedor = `Proveedor CRUD ${testId}`;
  const nombreProveedorEditado = `Proveedor CRUD Editado ${testId}`;

  test('1. Debería crear un nuevo proveedor', async ({ page }) => {
    // La gestión de proveedores está en una sub-ruta de catálogos
    await page.goto(`${URL_BASE}/gestion/catalogos/proveedores`);
    await expect(page.locator('h1:has-text("Gestión de Proveedores")')).toBeVisible();

    // Abrir modal de creación
    await page.getByRole('button', { name: 'Nuevo' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Proveedor' })).toBeVisible();

    // Rellenar y guardar
    await page.getByPlaceholder('Nombre').fill(nombreProveedor);
    await page.getByPlaceholder('Email').fill('proveedor@test.com');
    
    // Hacer clic y esperar la respuesta de la API simultáneamente
    const [response] = await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/api/proveedores')),
      page.getByRole('button', { name: 'Guardar' }).click(),
    ]);

    // Verificar que la respuesta de la API fue exitosa
    expect([200, 201]).toContain(response.status());

    // Verificar que el proveedor aparece en la tabla
    const filaProveedor = page.locator(`tr:has-text("${nombreProveedor}")`);
    await expect(filaProveedor).toBeVisible();
    console.log(`
ÉXITO Test 1: Proveedor "${nombreProveedor}" creado.`);
  });

  test('2. Debería editar el proveedor creado', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/catalogos/proveedores`);
    
    // Encontrar la fila y el botón de editar
    const filaProveedor = page.locator(`tr:has-text("${nombreProveedor}")`);
    await expect(filaProveedor).toBeVisible();
    await filaProveedor.locator('button').first().click();

    // Verificar que el modal de edición se abre con los datos correctos
    await expect(page.getByRole('heading', { name: 'Editar Proveedor' })).toBeVisible();
    await expect(page.getByPlaceholder('Nombre')).toHaveValue(nombreProveedor);

    // Editar y guardar
    await page.getByPlaceholder('Nombre').fill(nombreProveedorEditado);
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Verificar que el nombre nuevo aparece y el viejo no
    await expect(page.getByText(nombreProveedorEditado)).toBeVisible();
    await expect(page.getByText(nombreProveedor)).not.toBeVisible();
    console.log(`
ÉXITO Test 2: Proveedor renombrado a "${nombreProveedorEditado}".`);
  });

  test('3. Debería eliminar el proveedor editado', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/catalogos/proveedores`);

    // Aceptar el diálogo de confirmación que aparecerá
    page.on('dialog', dialog => dialog.accept());

    // Encontrar la fila y el botón de eliminar
    const filaProveedor = page.locator(`tr:has-text("${nombreProveedorEditado}")`);
    await expect(filaProveedor).toBeVisible();
    await filaProveedor.locator('button').last().click();

    // Verificar que la fila ya no está visible
    await expect(page.getByText(nombreProveedorEditado)).not.toBeVisible();
    console.log(`
ÉXITO Test 3: Proveedor "${nombreProveedorEditado}" eliminado.`);
  });
});
