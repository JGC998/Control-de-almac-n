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

    // 2. Esperar a que carguen los selectores (los combobox)
    // CORRECCIÓN: Buscamos los 'combobox' (elementos <select>) en lugar del texto de la opción.
    const clienteSelector = page.getByRole('combobox').first();
    const productoSelector = page.getByRole('combobox').last();
    
    await expect(clienteSelector).toBeVisible();
    await expect(productoSelector).toBeVisible();

    // 3. Seleccionar el primer cliente (índice 1 para saltar "Selecciona...")
    await clienteSelector.selectOption({ index: 1 });
    
    // 4. Seleccionar el primer producto
    await productoSelector.selectOption({ index: 1 });

    // 5. Clic en "Calcular Precios"
    await page.getByRole('button', { name: 'Calcular Precios' }).click();

    // 6. Verificar que la tabla de resultados aparece
    await expect(page.getByRole('heading', { name: 'Resultados' })).toBeVisible();
    await expect(page.getByText('Precio Unit. Calculado')).toBeVisible();

    console.log('\nÉXITO: Calculadora de precios funciona.\n');
  });
});
