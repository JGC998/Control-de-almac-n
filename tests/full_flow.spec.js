import { test, expect } from '@playwright/test';

// Usaremos 'test.describe.serial' para forzar que los tests se ejecuten en orden,
// ya que uno depende de los datos creados por el anterior.
test.describe.serial('Prueba de Flujo Completo E2E', () => {
  
  const URL_BASE = 'http://localhost:3000';
  
  // Variables para compartir datos entre tests
  const testId = Date.now();
  const nuevoClienteNombre = `Cliente E2E ${testId}`;
  const nuevoProductoNombre = `Producto E2E ${testId}`;
  const nuevoMaterialStock = `Material E2E ${testId}`;
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
    await page.getByPlaceholder('Modelo').fill('Test Model');
    
    // Esperar a que los selectores carguen sus datos
    await expect(page.getByRole('combobox').nth(0).locator('option').nth(1)).toBeEnabled({ timeout: 10000 });
    await expect(page.getByRole('combobox').nth(1).locator('option').nth(1)).toBeEnabled({ timeout: 10000 });
    
    await page.getByRole('combobox').nth(0).selectOption({ index: 1 }); // Fabricante
    await page.getByRole('combobox').nth(1).selectOption({ index: 1 }); // Material
    await page.getByPlaceholder('Precio Unitario').fill('150');
    await page.getByPlaceholder('Peso Unitario').fill('10');
    
    await page.getByRole('button', { name: 'Guardar' }).click();
    
    // Verificar que aparece en la tabla
    await expect(page.getByText(nuevoProductoNombre)).toBeVisible();
    console.log(`\nÉXITO Test 2: Producto "${nuevoProductoNombre}" creado.\n`);
  });

  test('3. Crear Presupuesto y Convertir a Pedido', async ({ page }) => {
    await page.goto(`${URL_BASE}/presupuestos/nuevo`);

    // --- CORRECCIÓN ---
    // Esperar a que la página cargue, aumentando el timeout
    await expect(page.locator('h1:has-text("Crear Nuevo Presupuesto")')).toBeVisible({ timeout: 10000 });

    // esperamos a que el *texto* del cliente (creado en Test 1) aparezca en la página.
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible({ timeout: 10000 });

    // Ahora que sabemos que los datos están, seleccionamos el cliente
    const clienteSelect = page.getByRole('combobox').first();
    await clienteSelect.selectOption({ label: nuevoClienteNombre });
    
    // Añadir item
    await page.getByRole('button', { name: 'Añadir Item' }).click();
    const itemRow = page.getByRole('row').last();
    
    // Esperar a que el selector de plantilla esté listo y seleccionar el producto
    const plantillaSelect = itemRow.getByRole('combobox');
    await expect(plantillaSelect).toBeVisible();
    // Esperamos a que el producto (creado en Test 2) esté en las opciones
    await expect(itemRow.getByText(nuevoProductoNombre)).toBeVisible({ timeout: 10000 });
    await plantillaSelect.selectOption({ label: nuevoProductoNombre });
    
    // Verificar que la descripción se autocompletó
    await expect(itemRow.getByDisplayValue(nuevoProductoNombre)).toBeVisible();
    
    // Guardar presupuesto
    await page.getByRole('button', { name: 'Guardar Presupuesto' }).click();

    // Estamos en la página de "Ver Presupuesto"
    await expect(page.getByText('Presupuesto ')).toBeVisible({ timeout: 10000 }); // Espera extra
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    await expect(page.getByText(nuevoProductoNombre)).toBeVisible();

    // Obtener el número de presupuesto
    const presupuestoTitulo = await page.locator('h1').first().innerText(); // "Presupuesto 2025-001"
    nuevoPresupuestoNumero = presupuestoTitulo.split(' ')[1];
    console.log(`\nÉXITO Test 3a: Presupuesto "${nuevoPresupuestoNumero}" creado.`);

    // Convertir a Pedido
    page.on('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Convertir a Pedido' }).click();

    // Verificar que fuimos redirigidos a la página de Pedido
    await expect(page.getByText('Pedido PED-')).toBeVisible({ timeout: 10000 }); // Espera extra
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    await expect(page.getByText(nuevoProductoNombre)).toBeVisible();
    
    const pedidoTitulo = await page.locator('h1').first().innerText();
    nuevoPedidoNumero = pedidoTitulo.split(' ')[1];
    console.log(`\nÉXITO Test 3b: Pedido "${nuevoPedidoNumero}" creado desde ${nuevoPresupuestoNumero}.\n`);
  });

  test('4. Recibir Stock de Proveedor', async ({ page }) => {
    await page.goto(`${URL_BASE}/proveedores`);
    
    // Esperar a que la página termine de cargar
    await expect(page.locator('h1:has-text("Pedidos a Proveedores")')).toBeVisible({ timeout: 10000 });
    
    await page.getByRole('button', { name: 'Nuevo Pedido a Proveedor' }).click();
    
    // Rellenar modal
    await expect(page.getByRole('heading', { name: 'Nuevo Pedido a Proveedor' })).toBeVisible();
    await page.getByPlaceholder('Proveedor').fill('Proveedor Test E2E');
    await page.getByPlaceholder('Material').fill(nuevoMaterialStock);
    await page.getByPlaceholder('Longitud (m)').fill('100');
    
    await page.getByRole('button', { name: 'Crear Pedido' }).click();
    
    // Verificar que el pedido aparece
    await expect(page.getByText('Proveedor Test E2E')).toBeVisible();
    await expect(page.getByText(nuevoMaterialStock)).toBeVisible();

    // Encontrar el nuevo pedido y recibirlo
    const pedidoCard = page.locator('.card', { hasText: nuevoMaterialStock }).first();
    
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
    await expect(page.getByText(nuevoMaterialStock)).toBeVisible();
    await expect(page.locator('td', { hasText: nuevoMaterialStock }).first().locator('..').getByText('100.00 m')).toBeVisible();
    console.log(`\nÉXITO Test 4b: Stock de "${nuevoMaterialStock}" verificado en almacén.\n`);
  });

  test('5. Probar Búsqueda', async ({ page }) => {
    await page.goto(`${URL_BASE}/`);
    
    // Esperar a que el Dashboard cargue
    await expect(page.getByText('Total Pedidos')).toBeVisible({ timeout: 10000 });
    
    // Buscar el cliente
    await page.getByPlaceholder('Buscar cliente, pedido...').fill(nuevoClienteNombre);
    await page.getByRole('button', { name: 'Search' }).click(); 
    
    // Verificar resultado
    await expect(page.getByText(nuevoClienteNombre)).toBeVisible();
    await expect(page.getByText('cliente')).toBeVisible();
    console.log(`\nÉXITO Test 5: Búsqueda de cliente funciona.\n`);
  });
});
