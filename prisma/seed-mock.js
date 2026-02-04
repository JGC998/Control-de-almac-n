const { PrismaClient } = require('@prisma/client');
const { faker } = require('@faker-js/faker');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding mock data...');

    // 1. Limpieza opcional (desactivar FK para limpieza rapida o deleteMany en orden)
    // Usamos deleteMany para respetar FK
    await prisma.pedidoItem.deleteMany();
    await prisma.presupuestoItem.deleteMany();
    await prisma.pedido.deleteMany();
    await prisma.presupuesto.deleteMany();
    await prisma.producto.deleteMany(); // Nuevos productos
    await prisma.cliente.deleteMany();

    console.log('Base de datos limpiada.');

    // 2. Generar Clientes (50)
    const clientes = [];
    for (let i = 0; i < 50; i++) {
        clientes.push(
            await prisma.cliente.create({
                data: {
                    nombre: faker.company.name(), // O faker.person.fullName() dependiendo de si son empresas o personas
                    email: faker.internet.email(),
                    telefono: faker.phone.number(),
                    direccion: faker.location.streetAddress(),
                    tier: faker.helpers.arrayElement(['Standard', 'Premium', 'VIP']),
                },
            })
        );
    }
    console.log(`Creados ${clientes.length} clientes.`);

    // 3. Generar Productos (100)
    const categorias = ['PVC', 'Lonas', 'Vinilos', 'Rígidos'];
    const productos = [];
    for (let i = 0; i < 100; i++) {
        const precioBase = parseFloat(faker.commerce.price({ min: 10, max: 500, dec: 2 }));
        productos.push(
            await prisma.producto.create({
                data: {
                    nombre: faker.commerce.productName(),
                    descripcion: faker.commerce.productDescription(),
                    precio: precioBase,
                    stock: faker.number.int({ min: 0, max: 500 }),
                    categoria: faker.helpers.arrayElement(categorias),
                },
            })
        );
    }
    console.log(`Creados ${productos.length} productos.`);

    // 4. Historial (Presupuestos y Pedidos)
    let presupuestosCount = 0;
    let pedidosCount = 0;

    for (const cliente of clientes) {
        const numPresupuestos = faker.number.int({ min: 1, max: 5 });

        for (let j = 0; j < numPresupuestos; j++) {
            const isPedido = faker.datatype.boolean(); // 50% de probabilidad
            const estado = isPedido
                ? faker.helpers.arrayElement(['Pendiente', 'Completado', 'Cancelado'])
                : 'Borrador'; // Si no es pedido, se queda como presupuesto borrador o pendiente

            const fecha = faker.date.recent({ days: 180 }); // Últimos 6 meses

            // Generar Items
            const numItems = faker.number.int({ min: 1, max: 5 });
            const itemsData = [];
            let subtotal = 0;

            for (let k = 0; k < numItems; k++) {
                const producto = faker.helpers.arrayElement(productos);
                const cantidad = faker.number.int({ min: 1, max: 10 });
                const precioUnitario = parseFloat(producto.precio); // Usamos precio base por ahora

                const totalItem = precioUnitario * cantidad;
                subtotal += totalItem;

                itemsData.push({
                    descripcion: producto.nombre,
                    quantity: cantidad,
                    unitPrice: precioUnitario,
                    productoId: producto.id,
                    pesoUnitario: 0, // Mock
                });
            }

            const tax = subtotal * 0.21;
            const total = subtotal + tax;

            // Crear Presupuesto
            const presupuesto = await prisma.presupuesto.create({
                data: {
                    numero: `PRE-${faker.string.alphanumeric(6).toUpperCase()}`,
                    fechaCreacion: fecha,
                    estado: isPedido ? 'Aceptado' : estado, // Si se convierte a pedido, el presupuesto suele estar aceptado
                    subtotal: parseFloat(subtotal.toFixed(2)),
                    tax: parseFloat(tax.toFixed(2)),
                    total: parseFloat(total.toFixed(2)),
                    clienteId: cliente.id,
                    marginId: null, // Opcional
                    items: {
                        create: itemsData,
                    },
                },
            });
            presupuestosCount++;

            // Convertir a Pedido si corresponde
            if (isPedido) {
                await prisma.pedido.create({
                    data: {
                        numero: `PED-${faker.string.alphanumeric(6).toUpperCase()}`,
                        fechaCreacion: fecha, // Misma fecha o un poco después
                        estado: estado,
                        subtotal: parseFloat(subtotal.toFixed(2)),
                        tax: parseFloat(tax.toFixed(2)),
                        total: parseFloat(total.toFixed(2)),
                        clienteId: cliente.id,
                        presupuestoId: presupuesto.id,
                        marginId: null,
                        items: {
                            create: itemsData.map(item => ({
                                descripcion: item.descripcion,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                productoId: item.productoId,
                                pesoUnitario: 0
                            })),
                        },
                    },
                });
                pedidosCount++;
            }
        }
    }

    console.log(`Creados ${presupuestosCount} presupuestos y ${pedidosCount} pedidos.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
