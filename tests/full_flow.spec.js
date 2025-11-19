import { test, expect } from '@playwright/test';

// Usaremos 'test.describe.serial' para forzar que los tests se ejecuten en orden,
// ya que uno depende de los datos creados por el anterior.
test.describe.serial('Prueba de Flujo Completo E2E', () => {
  
  const URL_BASE = 'http://localhost:3000';
  
  // Variables para compartir datos entre tests
  const testId = Date.now();
  const nuevoClienteNombre = `Cliente E2E ${testId}`;
  const nuevoProductoRef = `E2E-REF-${testId}`;
  const nuevoProductoNombre = `${nuevoProductoRef} - PVC - Esbelt`;

  test('1. Crear Cliente', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/clientes`);

    // Esperar a que la página termine de cargar (que aparezca el título)
    // Usamos un selector que busca un h1 QUE CONTIENE el texto.
    await expect(page.locator('h1:has-text("Gestión de Clientes")')).toBeVisible({ timeout: 10000 });

    // Ahora sí, hacemos clic
    await page.getByRole('button', { name: 'Nuevo Cliente' }).click();
    
    await expect(page.getByRole('heading', { name: 'Nuevo Cliente' })).toBeVisible();
    await page.getByPlaceholder('Nombre').fill(nuevoClienteNombre);
    await page.getByPlaceholder('Email').fill('e2e@test.com');
    await page.getByRole('button', { name: 'Guardar' }).click();
    
    // Verificar que aparece en la tabla
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    console.log(`\nÉXITO Test 1: Cliente "${nuevoClienteNombre}" creado.\n`);
  });

  test('2. Crear Producto', async ({ page }) => {
    await page.goto(`${URL_BASE}/gestion/productos`);

    // Esperar a que la página termine de cargar
    await expect(page.locator('h1:has-text("Gestión de Productos")')).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: 'Nuevo Producto' }).click();
    
    await expect(page.getByRole('heading', { name: 'Nuevo Producto' })).toBeVisible();
    
    // Rellenar formulario con la nueva lógica
    await page.getByPlaceholder('Referencia Fabricante').fill(nuevoProductoRef);
    
    await page.locator('select[name="fabricante"]').selectOption({ label: 'Esbelt' });
    await page.locator('select[name="material"]').selectOption({ label: 'PVC' });

    const espesorSelector = page.locator('select[name="espesor"]');
    await expect(espesorSelector).toBeEnabled({ timeout: 10000 });
    await espesorSelector.selectOption({ index: 1 });

    await page.getByPlaceholder('Largo (mm)').fill('1000');
    await page.getByPlaceholder('Ancho (mm)').fill('1000');
    
    await page.getByRole('button', { name: 'Guardar' }).click();
    
    // Verificar que aparece en la tabla con el nombre autogenerado
    await expect(page.getByText(nuevoProductoNombre)).toBeVisible();
    console.log(`\nÉXITO Test 2: Producto "${nuevoProductoNombre}" creado.\n`);
  });

  test('3. Crear Presupuesto y Convertir a Pedido', async ({ page }) => {
    await page.goto(`${URL_BASE}/presupuestos/nuevo`);

    // Esperar a que la página cargue
    await expect(page.locator('h1:has-text("Crear Nuevo Presupuesto")')).toBeVisible({ timeout: 10000 });

    // Seleccionar cliente
    await page.getByPlaceholder('Buscar o introducir cliente...').fill(nuevoClienteNombre);
    await page.getByRole('listitem').locator('a', { hasText: nuevoClienteNombre }).click();
    
    // Seleccionar margen
    await page.getByLabel('Regla de Margen / Tier').selectOption({ label: 'CLIENTE FINAL (x1.5)' });

    // Añadir item y seleccionar el producto creado en el paso anterior
    const itemRow = page.locator('tbody tr').first();
    await itemRow.getByPlaceholder('Buscar producto...').fill(nuevoProductoRef);
    await page.getByRole('listitem').locator(`a:has-text("${nuevoProductoNombre}")`).click();
    
    // Verificar que el input se autocompleta con el nombre correcto
    await expect(itemRow.getByPlaceholder('Buscar producto...')).toHaveValue(nuevoProductoNombre);
    
    // Guardar presupuesto
    await page.getByRole('button', { name: 'Guardar Documento' }).click();

    // Estamos en la página de "Ver Presupuesto"
    await page.waitForURL('**/presupuestos/**');
    await expect(page.locator('h1:has-text("Presupuesto")')).toBeVisible();
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    
    // Verificar que el item aparece en la tabla del presupuesto
    await expect(page.locator('table').getByText(nuevoProductoNombre)).toBeVisible();

    // Obtener el número de presupuesto
    const presupuestoTitulo = await page.locator('h1').first().innerText();
    nuevoPresupuestoNumero = presupuestoTitulo.split(' ')[1];
    console.log(`\nÉXITO Test 3a: Presupuesto "${nuevoPresupuestoNumero}" creado.`);

    // Convertir a Pedido
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Crear Pedido' }).click();

    // Verificar que fuimos redirigidos a la página de Pedido
    await page.waitForURL('**/pedidos/**');
    await expect(page.locator('h1:has-text("Pedido")')).toBeVisible();
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    await expect(page.locator('table').getByText(nuevoProductoNombre)).toBeVisible();
    
    const pedidoTitulo = await page.locator('h1').first().innerText();
    nuevoPedidoNumero = pedidoTitulo.split(' ')[1];
    console.log(`\nÉXITO Test 3b: Pedido "${nuevoPedidoNumero}" creado desde ${nuevoPresupuestoNumero}.\n`);
  });

  test('4. Recibir Stock de Proveedor', async ({ page }) => {
    await page.goto(`${URL_BASE}/proveedores`);
    
    // Esperar a que la página termine de cargar
    await expect(page.locator('h1:has-text("Pedidos a Proveedores")')).toBeVisible({ timeout: 10000 });
    
    // CORREGIDO: Clic en el botón específico "Nuevo Pedido Nacional"
    await page.getByRole('link', { name: 'Nuevo Pedido Nacional' }).click();
    
    // Rellenar el nuevo formulario
    await expect(page.locator('h1:has-text("Nuevo Pedido Nacional")')).toBeVisible();
    
    // Buscar y seleccionar proveedor (usamos uno de los migrados)
    await page.getByPlaceholder('Escribe para buscar o crea uno nuevo...').fill('Proveedor Global');
    // Esperar a que la opción aparezca (SWR)
    await expect(page.getByRole('listitem').locator('a', { hasText: 'Proveedor Global' })).toBeVisible({ timeout: 10000 });
    await page.getByText('Proveedor Global').click();

    // Seleccionar material (usamos el material existente)
    await page.getByRole('combobox', { name: 'material' }).selectOption({ label: materialExistente });
    
    // Añadir bobina
    await page.getByRole('button', { name: 'Añadir Bobina' }).click();
    const bobinaRow = page.getByRole('row').last();
    
    await bobinaRow.getByPlaceholder('Buscar Ref.').fill('Ref-Test-E2E');
    await bobinaRow.getByPlaceholder('Ancho (mm)').fill('1500');
    await bobinaRow.getByPlaceholder('Largo (m)').fill('100'); // Esto irá al stock
    // Esperar a que las opciones de espesor se carguen
    await expect(bobinaRow.getByRole('option', { name: '6 mm' })).toBeAttached({ timeout: 10000 });
    await bobinaRow.getByRole('combobox').selectOption({ label: '6 mm' }); // Espesor para GOMA
    await bobinaRow.getByPlaceholder('Precio/m').fill('50');

    // Guardar Pedido
    await page.getByRole('button', { name: 'Guardar Pedido' }).click();
    
    // Verificar que el pedido aparece en la lista de /proveedores
    await expect(page.locator('h1:has-text("Pedidos a Proveedores")')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Proveedor Global')).toBeVisible();
    await expect(page.getByText(materialExistente)).toBeVisible();

    // Encontrar el nuevo pedido y recibirlo
    const pedidoCard = page.locator('.card', { hasText: materialExistente }).first();
    
    page.on('dialog', dialog => dialog.accept());
    await pedidoCard.getByRole('button', { name: 'Marcar como Recibido' }).click();
    
    // Verificar que el estado cambia
    await expect(pedidoCard.getByText('Recibido')).toBeVisible();
    console.log(`\nÉXITO Test 4a: Pedido a proveedor recibido.`);

    // Ir a Almacén a verificar
    await page.goto(`${URL_BASE}/almacen`);
    
    // Esperar a que cargue
    await expect(page.locator('h1:has-text("Gestión de Almacén")')).toBeVisible({ timeout: 10000 });

    // Verificar que el nuevo material está en la tabla de inventario
    await expect(page.getByText(materialExistente).first()).toBeVisible();
    await expect(page.locator('td', { hasText: materialExistente }).first().locator('..').getByText('100.00 m')).toBeVisible();
    console.log(`\nÉXITO Test 4b: Stock de "${materialExistente}" verificado en almacén.\n`);
  });


  test('5. Probar Búsqueda', async ({ page }) => {
    await page.goto(`${URL_BASE}/`);
    
    // Esperar a que el Dashboard cargue
    await expect(page.getByText('Total Pedidos Cliente')).toBeVisible({ timeout: 10000 });
    
    // Buscar el cliente
    await page.getByPlaceholder('Buscar cliente, pedido...').fill(nuevoClienteNombre);
    
    // Verificar que el dropdown aparece
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    await expect(page.getByText('Cliente', { exact: true })).toBeVisible();
    
    // Clic en el resultado
    await page.getByRole('link', { name: new RegExp(nuevoClienteNombre) }).click();
    
    // Verificar resultado (que navegamos a la página del cliente)
    await expect(page.locator('h1:has-text("Gestión de Clientes")')).not.toBeVisible();
    await expect(page.locator(`h1:has-text("${nuevoClienteNombre}")`)).toBeVisible();
    
    console.log(`\nÉXITO Test 5: Búsqueda de cliente funciona.\n`);
  });
});
