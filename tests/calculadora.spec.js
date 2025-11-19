// tests/calculadora.spec.js
import { test, expect } from '@playwright/test';

const URL_BASE = 'http://localhost:3000';

test.describe('Pruebas de la Calculadora de Simulación', () => {

  test('Debería calcular el precio y peso de un item y añadirlo a la lista', async ({ page }) => {
    await page.goto(`${URL_BASE}/calculadora`);
    await expect(page.locator('h1:has-text("Simulador de Cálculo")')).toBeVisible();

    // --- 1. Rellenar el formulario del item ---
    // Esperar a que los catálogos carguen
    await expect(page.getByRole('option', { name: 'PVC' })).toBeAttached({ timeout: 15000 });

    // Seleccionar Material
    await page.getByLabel('Material').selectOption({ label: 'PVC' });

    // Esperar a que los espesores para PVC se carguen
    const espesorSelector = page.getByLabel('Espesor (mm)');
    await expect(espesorSelector).toBeEnabled();
    await expect(page.getByRole('option', { name: '2 mm' })).toBeAttached();
    await espesorSelector.selectOption({ label: '2 mm' });

    // Seleccionar Margen
    const margenSelector = page.getByLabel('Margen Aplicable');
    await expect(margenSelector).toBeEnabled();
    await expect(margenSelector.locator('option', { hasText: 'CLIENTE FINAL' })).toBeAttached({ timeout: 10000 });
    await margenSelector.selectOption({ label: 'CLIENTE FINAL (x1.5)' });

    // Rellenar dimensiones
    await page.getByLabel('Unidades').fill('10');
    await page.getByLabel('Ancho (mm)').fill('1000');
    await page.getByLabel('Largo (mm)').fill('2000');

    // --- 2. Verificar la previsualización ---
    const previsualizacion = page.locator('.alert:has-text("Previsualización")');
    await expect(previsualizacion).toBeVisible();
    // Verificamos que el precio unitario no sea 0
    await expect(previsualizacion.getByText(/Precio Unitario: [1-9][0-9]*\.\d{2} €/)).toBeVisible();
    
    // --- 3. Añadir el item ---
    const addButton = page.getByRole('button', { name: 'Añadir Item al Cálculo' });
    await expect(addButton).toBeEnabled();
    await addButton.click();

    // --- 4. Verificar que el item está en la tabla ---
    const tablaItems = page.locator('table:has-text("Items Agregados")');
    const filaItem = tablaItems.locator('tbody tr').first();
    
    await expect(filaItem).toBeVisible();
    await expect(filaItem.getByText('PVC (2mm)')).toBeVisible();
    await expect(filaItem.getByText('1000 mm x 2000 mm')).toBeVisible();
    await expect(filaItem.getByText('10')).toBeVisible();

    // --- 5. Verificar que los totales se han actualizado ---
    const resumenCard = page.locator('.card:has-text("Resumen de Costes y Pesos")');
    // Usamos una expresión regular para verificar que el valor no es "0,00 €"
    const precioTotalRegex = /[1-9][0-9]*,\d{2} €/;
    await expect(resumenCard.getByText(precioTotalRegex).first()).toBeVisible();
    
    console.log(`\nÉXITO: La calculadora funciona y añade items correctamente.`);
  });

  test('Debería exportar un PDF con los resultados', async ({ page }) => {
    await page.goto(`${URL_BASE}/calculadora`);
    await expect(page.locator('h1:has-text("Simulador de Cálculo")')).toBeVisible();

    // Rellenar un item (similar al test anterior)
    await expect(page.getByRole('option', { name: 'PVC' })).toBeAttached({ timeout: 15000 });
    await page.getByLabel('Material').selectOption({ label: 'PVC' });
    await expect(page.getByLabel('Espesor (mm)')).toBeEnabled();
    await page.getByLabel('Espesor (mm)').selectOption({ label: '2 mm' });

    // Añadida la selección de margen que faltaba
    const margenSelector = page.getByLabel('Margen Aplicable');
    await expect(margenSelector).toBeEnabled();
    await expect(margenSelector.locator('option', { hasText: 'CLIENTE FINAL' })).toBeAttached({ timeout: 10000 });
    await margenSelector.selectOption({ label: 'CLIENTE FINAL (x1.5)' });

    await page.getByLabel('Unidades').fill('5');
    await page.getByLabel('Ancho (mm)').fill('500');
    await page.getByLabel('Largo (mm)').fill('500');
    await page.getByRole('button', { name: 'Añadir Item al Cálculo' }).click();
    await expect(page.locator('table:has-text("Items Agregados") tbody tr').first()).toBeVisible();

    // Iniciar la espera de la descarga ANTES de hacer clic
    const downloadPromise = page.waitForEvent('download');
    
    // Hacer clic en el botón de exportar
    await page.getByRole('button', { name: 'Exportar PDF' }).click();
    
    // Esperar a que la descarga se complete
    const download = await downloadPromise;

    // Verificar que el nombre del archivo es correcto
    expect(download.suggestedFilename()).toMatch(/simulacion-calculo-.*\.pdf/);
    
    console.log(`\nÉXITO: La exportación a PDF se ha iniciado con el nombre: ${download.suggestedFilename()}`);
  });
});
