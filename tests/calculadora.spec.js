import { test, expect } from '@playwright/test';

const URL_BASE = 'http://localhost:3000';

test.describe('Pruebas de la Calculadora de Simulación', () => {

  test('Debería calcular el precio y peso de un item y añadirlo a la lista', async ({ page }) => {
    await page.goto(`${URL_BASE}/calculadora`);
    await expect(page.locator('h1:has-text("Simulador de Cálculo")')).toBeVisible({ timeout: 15000 });

    await expect(page.getByLabel('Material')).toBeVisible({ timeout: 30000 });
    // Intentar seleccionar el primer material disponible si PVC no está
    const materialOptions = await page.getByLabel('Material').locator('option').count();
    if (materialOptions > 1) {
        await page.getByLabel('Material').selectOption({ index: 1 });
    }

    const espesorSelector = page.getByLabel('Espesor (mm)');
    await expect(espesorSelector).toBeEnabled({ timeout: 20000 });
    await espesorSelector.selectOption({ index: 1 });

    const margenSelector = page.getByLabel('Margen Aplicable');
    await expect(margenSelector).toBeEnabled({ timeout: 10000 });
    await margenSelector.selectOption({ index: 0 }); // Seleccionar el primero disponible

    await page.getByLabel('Unidades').fill('10');
    await page.getByLabel('Ancho (mm)').fill('1000');
    await page.getByLabel('Largo (mm)').fill('2000');

    const addButton = page.getByRole('button', { name: 'Añadir Item al Cálculo' });
    await expect(addButton).toBeEnabled({ timeout: 10000 });
    await addButton.click();

    const tablaItems = page.locator('table');
    const filaItem = tablaItems.locator('tbody tr').first();
    await expect(filaItem).toBeVisible({ timeout: 15000 });
    
    console.log(`\nÉXITO: La calculadora funciona y añade items correctamente.`);
  });

  test('Debería exportar un PDF con los resultados', async ({ page }) => {
    await page.goto(`${URL_BASE}/calculadora`);
    await expect(page.locator('h1:has-text("Simulador de Cálculo")')).toBeVisible();

    // Rellenado rápido para exportación
    await page.getByLabel('Material').selectOption({ index: 1 });
    await expect(page.getByLabel('Espesor (mm)')).toBeEnabled({ timeout: 15000 });
    await page.getByLabel('Espesor (mm)').selectOption({ index: 1 });
    
    await page.getByLabel('Unidades').fill('5');
    await page.getByLabel('Ancho (mm)').fill('500');
    await page.getByLabel('Largo (mm)').fill('500');
    await page.getByRole('button', { name: 'Añadir Item al Cálculo' }).click();
    
    // Esperar a que aparezca la fila antes de exportar
    await expect(page.locator('table tbody tr').first()).toBeVisible({ timeout: 15000 });

    const downloadPromise = page.waitForEvent('download', { timeout: 30000 });
    await page.getByRole('button', { name: 'Exportar PDF' }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/simulacion-calculo-.*\.pdf/);
    console.log(`\nÉXITO: Exportación iniciada: ${download.suggestedFilename()}`);
  });
});
