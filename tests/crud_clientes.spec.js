// tests/crud_clientes.spec.js
import { test, expect } from '@playwright/test';

const URL_BASE = 'http://localhost:3000';

// Usamos describe.serial para asegurar que las pruebas se ejecutan en orden.
test.describe.serial('Flujo CRUD de Clientes', () => {
  const testId = Date.now();
  const nombreCliente = `Cliente CRUD ${testId}`;
  const nombreClienteEditado = `Cliente CRUD Editado ${testId}`;
  let clienteId = '';

  test('1. Debería crear un nuevo cliente', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/clientes`);
    await expect(page.locator('h1:has-text("Gestión de Clientes")')).toBeVisible();

    // Abrir modal de creación
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).toBeVisible();

    // Rellenar y guardar
    await page.getByPlaceholder('Nombre').fill(nombreCliente);
    await page.getByPlaceholder('Email').fill('crud@test.com');
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Verificar que el cliente aparece en la tabla
    const filaCliente = page.locator(`tr:has-text("${nombreCliente}")`);
    await expect(filaCliente).toBeVisible();
    console.log(`
ÉXITO Test 1: Cliente "${nombreCliente}" creado.`);
  });

  test('2. Debería editar el cliente creado', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/clientes`);
    
    // Encontrar la fila y el botón de editar
    const filaCliente = page.locator(`tr:has-text("${nombreCliente}")`);
    await expect(filaCliente).toBeVisible();
    const botonEditar = filaCliente.getByRole('button', { name: 'Editar' });
    await expect(botonEditar).toBeEnabled(); // Asegurarse de que el botón es clickeable
    await botonEditar.click();

    // Verificar que el modal de edición se abre con los datos correctos
    await expect(page.getByRole('heading', { name: 'Editar Cliente' })).toBeVisible();
    await expect(page.getByPlaceholder('Nombre')).toHaveValue(nombreCliente);

    // Editar y guardar
    await page.getByPlaceholder('Nombre').fill(nombreClienteEditado);
    await page.getByRole('button', { name: 'Guardar' }).click();

    // Verificar que el nombre nuevo aparece y el viejo no
    await expect(page.getByText(nombreClienteEditado)).toBeVisible();
    await expect(page.getByText(nombreCliente)).not.toBeVisible();
    console.log(`
ÉXITO Test 2: Cliente renombrado a "${nombreClienteEditado}".`);
  });

  test('3. Debería eliminar el cliente editado', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/clientes`);

    // Aceptar el diálogo de confirmación que aparecerá
    page.on('dialog', dialog => dialog.accept());

    // Encontrar la fila y el botón de eliminar
    const filaCliente = page.locator(`tr:has-text("${nombreClienteEditado}")`);
    await expect(filaCliente).toBeVisible();
    await filaCliente.getByRole('button', { name: 'Eliminar' }).click();

    // Verificar que la fila ya no está visible
    await expect(page.getByText(nombreClienteEditado)).not.toBeVisible();
    console.log(`
ÉXITO Test 3: Cliente "${nombreClienteEditado}" eliminado.`);
  });
});
