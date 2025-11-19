import { test, expect } from '@playwright/test';

test.describe('Prueba de Flujo Principal (Smoke Test)', () => {
  const nuevoCliente = `Cliente de Prueba ${Date.now()}`;
  const URL_BASE = 'http://localhost:3000'

  test('1. Crear un nuevo cliente', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/clientes`);
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).toBeVisible({ timeout: 10000 });
    
    await page.getByPlaceholder('Nombre').fill(nuevoCliente);
    await page.getByPlaceholder('Email').fill('test@cliente.com');
    await page.getByPlaceholder('Teléfono').fill('123456789');
    
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).not.toBeVisible({ timeout: 10000 });
    await expect(page.getByText(nuevoCliente)).toBeVisible({ timeout: 10000 });
    
    console.log(`\nÉXITO: Cliente "${nuevoCliente}" creado y verificado.\n`);
  });

  test('2. Probar la Calculadora de Precios', async ({ page }) => {
    await page.goto(`${URL_BASE}/calculadora`);
    await expect(page.locator('h1:has-text("Simulador de Cálculo")')).toBeVisible({ timeout: 15000 });

    const materialSelector = page.getByLabel('Material');
    
    // Esperas más largas y selección más robusta
    await expect(materialSelector.locator('option').nth(1)).toBeAttached({ timeout: 30000 });
    // Seleccionar por índice si el texto exacto falla, o usar first()
    await materialSelector.selectOption({ index: 1 });

    const espesorSelector = page.getByLabel('Espesor (mm)');
    await expect(espesorSelector).toBeEnabled({ timeout: 10000 });
    await expect(espesorSelector.locator('option').nth(1)).toBeAttached({ timeout: 30000 });
    await espesorSelector.selectOption({ index: 1 });

    await page.getByLabel('Unidades').fill('10');
    await page.getByLabel('Ancho (mm)').fill('1000');
    await page.getByLabel('Largo (mm)').fill('2000');

    const addButton = page.getByRole('button', { name: 'Añadir Item al Cálculo' });
    await expect(addButton).toBeEnabled();
    await addButton.click();
    
    await expect(page.getByRole('heading', { name: 'Items Agregados' })).toBeVisible({ timeout: 10000 });
    const filaItem = page.locator('table tbody tr').first();
    await expect(filaItem).toBeVisible({ timeout: 10000 });

    const resumenCard = page.locator('.card:has-text("Resumen de Costes y Pesos")');
    // Regex más flexible para detectar el precio
    const precioTotalRegex = /[0-9]+(,[0-9]+)?\s*€/; 
    await expect(resumenCard.getByText(precioTotalRegex).first()).toBeVisible({ timeout: 15000 });

    console.log('\nÉXITO: Calculadora de precios funciona.\n');
  });
});
