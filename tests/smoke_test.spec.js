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

    // ---
    // CORRECCIÓN DE SELECTOR:
    // Usamos 'getByLabel' que es más robusto que el selector de atributos.
    // ---
    const clienteSelector = page.getByLabel('Cliente (Requerido para precios)');
    const materialSelector = page.getByLabel('Material');
    const productoSelector = page.getByLabel('Producto (Plantilla)');
    
    // ---
    // CORRECCIÓN DE ESPERA:
    // Esperamos a que la opción esté "adjunta" (en el DOM), no "visible".
    // ---
    await expect(page.getByRole('option', { name: 'Industrias Zeta' })).toBeAttached({ timeout: 10000 });
    await expect(clienteSelector).toBeVisible();

    // 3. Seleccionar el primer cliente (índice 1 para saltar "Selecciona...")
    await clienteSelector.selectOption({ index: 1 });
    
    // 4. Seleccionar el material "PVC" por su etiqueta (label)
    await expect(page.getByRole('option', { name: 'PVC' })).toBeAttached({ timeout: 10000 });
    await expect(materialSelector).toBeEnabled();
    // ---
    // CORRECCIÓN DE LÓGICA:
    // Seleccionamos por etiqueta 'PVC' en lugar de índice 1 (que era 'FIELTRO')
    // ---
    await materialSelector.selectOption({ label: 'PVC' }); 

    // 5. Seleccionar el primer producto
    // ---
    // CORRECCIÓN DE AMBIGÜEDAD (Strict Mode):
    // Eliminamos la comprobación ambigua y seleccionamos por la etiqueta exacta.
    // ---
    await expect(productoSelector).toBeEnabled();
    await productoSelector.selectOption({ label: 'Banda PVC 3mm Reforzada' }); 

    // 6. Clic en "Añadir Item al Cálculo"
    const addButton = page.getByRole('button', { name: 'Añadir Item al Cálculo' });
    await addButton.click();

    // ---
    // CORRECCIÓN DE ASINCRONÍA:
    // Esperamos a que el botón se vuelva a habilitar, lo que significa
    // que la llamada a la API 'handleAddItem' ha terminado.
    // ---
    await expect(addButton).toBeEnabled({ timeout: 10000 });
    
    // 7. Verificar que la tabla de resultados se actualiza
    await expect(page.getByRole('heading', { name: 'Items Agregados' })).toBeVisible();
    await expect(page.getByText('Precio Total General')).toBeVisible();
    
    // ---
    // CORRECCIÓN DE ASERCIÓN:
    // Ahora que /api/precios funciona, verificamos tanto el precio como el peso.
    // ---
    const precioTotalRegex = new RegExp('[1-9][0-9]*\\.[0-9]{2} €');
    const pesoTotalRegex = new RegExp('[0-9]*\\.[0-9]{2} kg'); // Permitir 0.00 si el cálculo de peso es 0, pero debe existir
    
    await expect(page.getByText(precioTotalRegex).first()).toBeVisible({ timeout: 10000 });
    // Verificamos que el peso total también se renderiza
    await expect(page.getByText(pesoTotalRegex).first()).toBeVisible({ timeout: 10000 });

    console.log('\nÉXITO: Calculadora de precios funciona.\n');
  });
});
