import { test, expect } from '@playwright/test';

// Usaremos 'test.describe.serial' para forzar que los tests se ejecuten en orden,
// ya que uno depende de los datos creados por el anterior.
test.describe.serial('Prueba de Flujo Completo E2E', () => {
  
  const URL_BASE = 'http://localhost:3000';
  
  // Variables para compartir datos entre tests
  const testId = Date.now();
  const nuevoClienteNombre = `Cliente E2E ${testId}`;
  const nuevoProductoNombre = `Producto E2E ${testId}`;
  
  // CORREGIDO: Usaremos un material existente para Test 4
  const materialExistente = `GOMA`; 
  
  let nuevoPresupuestoNumero = '';
  let nuevoPedidoNumero = '';

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
    
    // Rellenar formulario
    await page.getByPlaceholder('Nombre').fill(nuevoProductoNombre);
    await page.getByPlaceholder('Referencia Fabricante').fill('Test Model');
    
    // ---
    // CORRECCIÓN DE ESPERA:
    // Esperamos a que la opción esté "adjunta" (en el DOM), no "visible" (en pantalla).
    // ---
    await expect(page.getByRole('option', { name: 'Esbelt' })).toBeAttached({ timeout: 10000 });
    const fabricanteSelect = page.getByRole('combobox', { name: 'Fabricante' });
    await fabricanteSelect.selectOption({ label: 'Esbelt' });
    
    await expect(page.getByRole('option', { name: 'PVC' })).toBeAttached({ timeout: 10000 });
    const materialSelect = page.getByRole('combobox', { name: 'Material' });
    await materialSelect.selectOption({ label: 'PVC' });
    // --- FIN CORRECCIÓN ---
    
    await page.getByPlaceholder('Precio Unitario (€)').fill('150');
    await page.getByPlaceholder('Peso Unitario (kg)').fill('10');
    
    await page.getByRole('button', { name: 'Guardar' }).click();
    
    // Verificar que aparece en la tabla
    await expect(page.getByText(nuevoProductoNombre)).toBeVisible();
    console.log(`\nÉXITO Test 2: Producto "${nuevoProductoNombre}" creado.\n`);
  });

  test('3. Crear Presupuesto y Convertir a Pedido', async ({ page }) => {
    await page.goto(`${URL_BASE}/presupuestos/nuevo`);

    // Esperar a que la página cargue
    await expect(page.locator('h1:has-text("Crear Nuevo Presupuesto")')).toBeVisible({ timeout: 10000 });

    // esperamos a que el cliente (creado en Test 1) aparezca en las opciones.
    await page.getByPlaceholder('Escribe para buscar un cliente existente...').fill(nuevoClienteNombre);
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible({ timeout: 10000 });
    
    // Clic en el cliente en el dropdown
    await page.getByRole('listitem').locator('a', { hasText: nuevoClienteNombre }).click();
    
    // Añadir item
    await page.getByRole('button', { name: 'Añadir Item Manual' }).click();
    const itemRow = page.getByRole('row').last();
    
    // Esperar a que el selector de plantilla esté listo y seleccionar el producto
    const plantillaSelect = itemRow.getByRole('combobox').first();
    await expect(plantillaSelect).toBeVisible();
    
    // Esperamos a que el producto (creado en Test 2) esté en las opciones
    await expect(itemRow.getByRole('option', { name: nuevoProductoNombre })).toBeAttached({ timeout: 10000 });
    await plantillaSelect.selectOption({ label: nuevoProductoNombre });
    
    // ---
    // CORRECCIÓN DE SYNTAX (TypeError):
    // Verificamos que el input de texto (rol 'textbox') dentro de la fila
    // tenga el valor autocompletado.
    // ---
    await expect(itemRow.getByRole('textbox')).toHaveValue(nuevoProductoNombre);
    
    // Guardar presupuesto
    await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();

    // Estamos en la página de "Ver Presupuesto"
    await expect(page.locator('h1:has-text("Presupuesto ")')).toBeVisible({ timeout: 10000 }); // Espera extra
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    
    // ---
    // CORRECCIÓN DE AMBIGÜEDAD (Strict Mode Violation):
    // El nombre del producto aparece en la tabla de items, pero también
    // en la lista de filtros de producto. Debemos ser más específicos.
    // Buscamos el nombre del producto DENTRO de la tabla de items.
    // ---
    await expect(page.locator('table').getByText(nuevoProductoNombre)).toBeVisible();

    // Obtener el número de presupuesto
    const presupuestoTitulo = await page.locator('h1').first().innerText(); // "Presupuesto 2025-001"
    nuevoPresupuestoNumero = presupuestoTitulo.split(' ')[1];
    console.log(`\nÉXITO Test 3a: Presupuesto "${nuevoPresupuestoNumero}" creado.`);

    // Convertir a Pedido
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Convertir a Pedido' }).click();

    // Verificar que fuimos redirigidos a la página de Pedido
    await expect(page.locator('h1:has-text("Pedido PED-")')).toBeVisible({ timeout: 10000 }); // Espera extra
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
