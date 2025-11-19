// Este es el script de prueba que Playwright ejecutará
import { test, expect } from '@playwright/test';

// Agrupamos las pruebas
test.describe('Prueba de Flujo Principal (Smoke Test)', () => {

  // Definimos una variable para el nombre del cliente
  const nuevoCliente = `Cliente de Prueba ${Date.now()}`;
  const URL_BASE = 'http://localhost:3000'

  test('1. Crear un nuevo cliente', async ({ page }) => {
    // 1. Ir a la página de Gestión de Clientes
    await page.goto(`${URL_BASE}/gestion/clientes`);
    
    // 2. Clic en "Nuevo Cliente"
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    
    // 3. Rellenar el formulario (esperar a que el modal sea visible)
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).toBeVisible();
    await page.getByPlaceholder('Nombre').fill(nuevoCliente);
    await page.getByPlaceholder('Email').fill('test@cliente.com');
    await page.getByPlaceholder('Teléfono').fill('123456789');
    
    // 4. Guardar
    await page.getByRole('button', { name: 'Guardar' }).click();
    
    // 5. Verificar que el modal se cerró
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).not.toBeVisible();
    
    // 6. Verificar que el nuevo cliente aparece en la tabla
    // (Esperamos a que SWR actualice la UI)
    await expect(page.getByText(nuevoCliente)).toBeVisible();
    
    console.log(`\nÉXITO: Cliente "${nuevoCliente}" creado y verificado.\n`);
  });

  test('2. Probar la Calculadora de Precios', async ({ page }) => {
    // 1. Ir a la página de la Calculadora
    await page.goto(`${URL_BASE}/calculadora`);
    await expect(page.locator('h1:has-text("Simulador de Cálculo")')).toBeVisible();

    const materialSelector = page.getByLabel('Material');
    
    // ---
    // CORRECCIÓN DE ESPERA Y SELECCIÓN:
    // Hacemos el test más robusto esperando a que los selectores se carguen
    // y seleccionando la primera opción disponible en lugar de nombres fijos.
    // ---
    
    // 2. Seleccionar Material
    await expect(materialSelector.locator('option', { hasText: 'PVC' })).toBeAttached({ timeout: 15000 });
    await materialSelector.selectOption({ label: 'PVC' });

    // 3. Seleccionar Espesor
    const espesorSelector = page.getByLabel('Espesor (mm)');
    await expect(espesorSelector).toBeEnabled();
    await expect(espesorSelector.locator('option').nth(1)).toBeVisible({ timeout: 10000 });
    await espesorSelector.selectOption({ index: 1 });

    // 4. Rellenar dimensiones
    await page.getByLabel('Unidades').fill('10');
    await page.getByLabel('Ancho (mm)').fill('1000');
    await page.getByLabel('Largo (mm)').fill('2000');

    // 5. Añadir al cálculo
    const addButton = page.getByRole('button', { name: 'Añadir Item al Cálculo' });
    await expect(addButton).toBeEnabled();
    await addButton.click();
    
    // 6. Verificar que la tabla de resultados se actualiza
    await expect(page.getByRole('heading', { name: 'Items Agregados' })).toBeVisible();
    const filaItem = page.locator('table:has-text("Items Agregados") tbody tr').first();
    await expect(filaItem).toBeVisible();

    // 7. Verificar que los totales se han actualizado y no son cero
    const resumenCard = page.locator('.card:has-text("Resumen de Costes y Pesos")');
    const precioTotalRegex = /[1-9][0-9]*,\d{2} €/;
    await expect(resumenCard.getByText(precioTotalRegex).first()).toBeVisible();

    console.log('\nÉXITO: Calculadora de precios funciona.\n');
  });
});
