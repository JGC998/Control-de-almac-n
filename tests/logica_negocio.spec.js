// tests/logica_negocio.spec.js
import { test, expect } from '@playwright/test';

const URL_BASE = 'http://localhost:3000';

test.describe('Flujo de Lógica de Negocio: Presupuesto a Pedido', () => {
  const testId = Date.now();
  const nombreCliente = `Cliente Flujo ${testId}`;
  const refProducto = `PROD-FLUJO-${testId}`;
  let page; // Hacemos la página accesible en el hook 'afterAll'

  // --- Hooks para crear y limpiar datos ---
  let clienteId, productoId, presupuestoId, pedidoId;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    // 1. Crear Cliente vía API
    const clienteRes = await page.request.post(`${URL_BASE}/api/clientes`, {
      data: { nombre: nombreCliente, categoria: 'CLIENTE FINAL' }
    });
    const clienteData = await clienteRes.json();
    clienteId = clienteData.id;
    expect(clienteRes.ok()).toBeTruthy();
    console.log(`\nSETUP: Cliente creado con ID: ${clienteId}`);

    // 2. Crear Producto vía API
    const productoRes = await page.request.post(`${URL_BASE}/api/productos`, {
      data: {
        modelo: refProducto,
        fabricante: 'Esbelt', // Asumimos que existe
        material: 'PVC',     // Asumimos que existe
        espesor: 2,
        largo: 1000,
        ancho: 1000,
      }
    });
    const productoData = await productoRes.json();
    productoId = productoData.id;
    expect(productoRes.ok()).toBeTruthy();
    console.log(`SETUP: Producto creado con ID: ${productoId}`);
  });

  test.afterAll(async () => {
    // Limpieza en orden inverso para respetar las dependencias
    if (pedidoId) await page.request.delete(`${URL_BASE}/api/pedidos/${pedidoId}`);
    if (presupuestoId) await page.request.delete(`${URL_BASE}/api/presupuestos/${presupuestoId}`);
    if (productoId) await page.request.delete(`${URL_BASE}/api/productos/${productoId}`);
    if (clienteId) await page.request.delete(`${URL_BASE}/api/clientes/${clienteId}`);
    console.log(`\nCLEANUP: Datos de prueba eliminados.`);
    await page.close();
  });
  // --- Fin de Hooks ---


  test('Debería crear un presupuesto, convertirlo a pedido y verificar los datos', async () => {
    await page.goto(`${URL_BASE}/presupuestos/nuevo`);
    await expect(page.locator('h1:has-text("Crear Nuevo Presupuesto")')).toBeVisible();

    // --- 1. Rellenar Presupuesto ---
    // Seleccionar cliente
    await page.getByPlaceholder('Buscar o introducir cliente...').fill(nombreCliente);
    await page.getByRole('listitem').locator(`a:has-text('${nombreCliente}')`).click();
    await expect(page.getByPlaceholder('Buscar o introducir cliente...')).toHaveValue(nombreCliente);

    // Seleccionar margen
    await page.getByLabel('Regla de Margen / Tier').selectOption({ label: 'CLIENTE FINAL (x1.5)' });

    // Añadir item y seleccionar producto
    const itemRow = page.locator('tbody tr').first();
    await itemRow.getByPlaceholder('Buscar producto...').fill(refProducto);
    await page.getByRole('listitem').locator(`a:has-text("${refProducto}")`).click();
    
    // Cambiar cantidad
    await itemRow.getByRole('spinbutton', { name: 'Cantidad' }).fill('10');

    // Verificar que el precio se calcula
    await expect(itemRow.locator('td').nth(4)).not.toHaveText('0.00 €'); // Total (Costo)

    // Guardar presupuesto
    await page.getByRole('button', { name: 'Guardar Documento' }).click();

    // --- 2. Verificar Página de Presupuesto ---
    await page.waitForURL('**/presupuestos/**');
    await expect(page.locator('h1:has-text("Presupuesto")')).toBeVisible();
    
    // Guardar el ID para la limpieza
    presupuestoId = page.url().split('/').pop();

    await expect(page.getByText(nombreCliente)).toBeVisible();
    await expect(page.getByText(refProducto)).toBeVisible();
    await expect(page.getByText('Borrador')).toBeVisible();
    console.log(`\nÉXITO: Presupuesto ${presupuestoId} creado.`);

    // --- 3. Convertir a Pedido ---
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Crear Pedido' }).click();

    // --- 4. Verificar Página de Pedido ---
    await page.waitForURL('**/pedidos/**');
    await expect(page.locator('h1:has-text("Pedido")')).toBeVisible();
    
    // Guardar el ID para la limpieza
    pedidoId = page.url().split('/').pop();

    await expect(page.getByText(nombreCliente)).toBeVisible();
    await expect(page.getByText(refProducto)).toBeVisible();
    await expect(page.getByText('Pendiente')).toBeVisible(); // El estado inicial de un pedido
    console.log(`\nÉXITO: Pedido ${pedidoId} creado desde el presupuesto.`);
    
    // --- 5. Verificar que el presupuesto original ahora está "Aceptado" ---
    await page.goto(`${URL_BASE}/presupuestos/${presupuestoId}`);
    await expect(page.getByText('Aceptado')).toBeVisible();
    console.log(`\nÉXITO: Estado del presupuesto actualizado a "Aceptado".`);
  });
});
