#!/bin/bash

# --- Rutas de las API a restaurar ---
CLIENTES_ROUTE="src/app/api/clientes/route.js"
PRODUCTOS_ROUTE="src/app/api/productos/route.js"
FABRICANTES_ROUTE="src/app/api/fabricantes/route.js"
MATERIALES_ROUTE="src/app/api/materiales/route.js"
PRECIOS_ROUTE="src/app/api/precios/route.js"
MARGENES_ROUTE="src/app/api/pricing/margenes/route.js"
ALMACEN_API_ROUTE="src/app/api/almacen-stock/route.js"
MOVIMIENTOS_ROUTE="src/app/api/movimientos/route.js"
DASHBOARD_ROUTE="src/app/api/dashboard/route.js"

echo "--- RESTAURANDO ARCHIVOS DE RUTA CRUCIALES (FIX 404 GENERAL) ---"

# -------------------------------------
# 1. /api/clientes/route.js (Con fix 'tier')
# -------------------------------------
cat > $CLIENTES_ROUTE <<'CLIENTES_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 

// GET /api/clientes - Obtiene todos los clientes
export async function GET() {
  try {
    const clientes = await db.cliente.findMany();
    return NextResponse.json(clientes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener clientes' }, { status: 500 });
  }
}

// POST /api/clientes - Crea un nuevo cliente
export async function POST(request) {
  try {
    const data = await request.json();

    const nuevoCliente = await db.cliente.create({
      data: {
        nombre: data.nombre,
        email: data.email,
        direccion: data.direccion,
        telefono: data.telefono,
        tier: data.categoria, // Mapea 'categoria' del frontend a 'tier' de Prisma
      },
    });
    
    return NextResponse.json(nuevoCliente, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') {
        return NextResponse.json({ message: 'Ya existe un cliente con este nombre' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear el cliente' }, { status: 500 });
  }
}
CLIENTES_ROUTE_EOF
echo "✅ Restaurado: /api/clientes/route.js"

# -------------------------------------
# 2. /api/productos/route.js
# -------------------------------------
cat > $PRODUCTOS_ROUTE <<'PRODUCTOS_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

async function calculateCostAndWeight(materialId, espesor, largo, ancho) {
    if (!materialId || !espesor || !largo || !ancho || largo <= 0 || ancho <= 0) {
        return { costo: 0, peso: 0 };
    }

    const material = await db.material.findUnique({
      where: { id: materialId },
      select: { nombre: true }
    });

    if (!material) {
        return { costo: 0, peso: 0 };
    }

    const tarifa = await db.tarifaMaterial.findUnique({
        where: { 
            material_espesor: { 
                material: material.nombre,
                espesor: espesor
            }
        },
    });

    if (!tarifa || tarifa.precio <= 0) {
        return { costo: 0, peso: 0 };
    }

    const areaM2 = (ancho / 1000) * (largo / 1000);
    const costo = areaM2 * tarifa.precio;
    const peso = areaM2 * tarifa.peso;

    return { costo: parseFloat(costo.toFixed(2)), peso: parseFloat(peso.toFixed(2)) };
}

// GET /api/productos - Obtiene todos los productos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clienteId = searchParams.get('clienteId');

    const whereClause = {};
    if (clienteId) {
      whereClause.clienteId = clienteId; 
    }

    const productos = await db.producto.findMany({
      where: whereClause,
      include: {
        fabricante: true,
        material: true,
        cliente: true,
      },
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(productos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/productos - Crea un nuevo producto
export async function POST(request) {
  try {
    const data = await request.json();
    
    const fabricante = await db.fabricante.findUnique({
      where: { nombre: data.fabricante },
    });
    const material = await db.material.findUnique({
      where: { nombre: data.material },
    });

    if (!fabricante) {
      return NextResponse.json({ message: `Fabricante "${data.fabricante}" no encontrado.` }, { status: 400 });
    }
    if (!material) {
      return NextResponse.json({ message: `Material "${data.material}" no encontrado.` }, { status: 400 });
    }
    
    const { costo: calculatedCosto, peso: calculatedPeso } = await calculateCostAndWeight(
        material.id, 
        parseFloat(data.espesor), 
        parseFloat(data.largo), 
        parseFloat(data.ancho)
    );

    const nuevoProducto = await db.producto.create({
      data: {
        nombre: data.nombre,
        referenciaFabricante: data.modelo,
        espesor: parseFloat(data.espesor) || 0,
        largo: parseFloat(data.largo) || 0,
        ancho: parseFloat(data.ancho) || 0,
        precioUnitario: parseFloat(data.precioUnitario),
        pesoUnitario: calculatedPeso, 
        costoUnitario: calculatedCosto, 
        fabricanteId: fabricante.id, 
        materialId: material.id,
        clienteId: data.clienteId || null,
        tieneTroquel: data.tieneTroquel || false,
      },
    });

    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}
PRODUCTOS_ROUTE_EOF
echo "✅ Restaurado: /api/productos/route.js"

# -------------------------------------
# 3. /api/fabricantes/route.js
# -------------------------------------
cat > $FABRICANTES_ROUTE <<'FABRICANTES_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/fabricantes - Obtiene todos los fabricantes
export async function GET() {
  try {
    const fabricantes = await db.fabricante.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(fabricantes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener fabricantes' }, { status: 500 });
  }
}

// POST /api/fabricantes - Añade un nuevo fabricante
export async function POST(request) {
  try {
    const data = await request.json();
    if (!data.nombre) {
      return NextResponse.json({ message: 'El nombre es requerido' }, { status: 400 });
    }

    const nuevoFabricante = await db.fabricante.create({
      data: {
        nombre: data.nombre,
      },
    });
    return NextResponse.json(nuevoFabricante, { status: 201 });
  } catch (error) {
    if (error.code === 'P2002') { 
      return NextResponse.json({ message: 'El fabricante ya existe' }, { status: 409 });
    }
    console.error(error);
    return NextResponse.json({ message: 'Error al crear fabricante' }, { status: 500 });
  }
}
FABRICANTES_ROUTE_EOF
echo "✅ Restaurado: /api/fabricantes/route.js"

# -------------------------------------
# 4. /api/materiales/route.js
# -------------------------------------
cat > $MATERIALES_ROUTE <<'MATERIALES_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 

export async function GET() {
  try {
    const materiales = await db.material.findMany({
      orderBy: { nombre: 'asc' },
    });
    return NextResponse.json(materiales);
  } catch (error) {
    console.error('Error fetching materiales:', error);
    return NextResponse.json({ error: 'Error fetching materiales' }, { status: 500 });
  }
}

export async function POST(request) {
  const data = await request.json();
  try {
    if (!data.nombre) {
      return NextResponse.json({ error: 'El nombre del material es requerido.' }, { status: 400 });
    }
    const newMaterial = await db.material.create({
      data: {
        nombre: data.nombre,
      },
    });
    return NextResponse.json(newMaterial, { status: 201 });
  } catch (error) {
    console.error('Error creating material:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe un material con ese nombre.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear el material.' }, { status: 500 });
  }
}
MATERIALES_ROUTE_EOF
echo "✅ Restaurado: /api/materiales/route.js"

# -------------------------------------
# 5. /api/precios/route.js (Tarifas Base)
# -------------------------------------
cat > $PRECIOS_ROUTE <<'PRECIOS_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Función para obtener un número de forma segura o null si es inválido/vacío
const getSafeFloat = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

// GET /api/precios - Obtiene todas las tarifas
export async function GET() {
  try {
    const tarifas = await db.tarifaMaterial.findMany({
      orderBy: [{ material: 'asc' }, { espesor: 'asc' }],
    });
    return NextResponse.json(tarifas);
  } catch (error) {
    console.error('Error fetching tarifas:', error);
    return NextResponse.json({ error: 'Error al obtener tarifas' }, { status: 500 });
  }
}

// POST /api/precios - Crea una nueva tarifa
export async function POST(request) {
  const data = await request.json();
  try {
    if (!data.material || getSafeFloat(data.espesor) === null || getSafeFloat(data.precio) === null || getSafeFloat(data.peso) === null) {
      return NextResponse.json({ error: 'Faltan campos requeridos (material, espesor, precio, peso).' }, { status: 400 });
    }

    const materialExists = await db.material.findFirst({ where: { nombre: data.material } });
    if (!materialExists) {
        return NextResponse.json({ error: `El material "${data.material}" no existe. Debe crearlo primero.` }, { status: 400 });
    }

    const newTarifa = await db.tarifaMaterial.create({
      data: {
        material: data.material,
        espesor: getSafeFloat(data.espesor),
        precio: getSafeFloat(data.precio),
        peso: getSafeFloat(data.peso),
      },
    });
    return NextResponse.json(newTarifa, { status: 201 });
  } catch (error) {
    console.error('Error creating tarifa:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe una tarifa para este Material y Espesor.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear la tarifa.' }, { status: 500 });
  }
}
PRECIOS_ROUTE_EOF
echo "✅ Restaurado: /api/precios/route.js"

# -------------------------------------
# 6. /api/pricing/margenes/route.js
# -------------------------------------
cat > $MARGENES_ROUTE <<'MARGENES_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pricing/margenes - Obtiene todas las reglas de margen
export async function GET() {
  try {
    const data = await db.reglaMargen.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener márgenes' }, { status: 500 });
  }
}

// POST /api/pricing/margenes - Crea una nueva regla de margen
export async function POST(request) {
  try {
    const data = await request.json();
    const { descripcion, tipo, valor, categoria, tierCliente } = data; 

    const parsedValor = parseFloat(valor);

    if (!descripcion || !tipo || isNaN(parsedValor) || parsedValor <= 0) {
      return NextResponse.json(
        { message: 'Datos de margen incompletos o inválidos. Se requiere descripción, tipo y un valor numérico positivo.' }, 
        { status: 400 }
      );
    }

    const nuevaRegla = await db.reglaMargen.create({
      data: {
        descripcion: descripcion,
        tipo: tipo,
        multiplicador: parsedValor,
        categoria: categoria,
        tierCliente: tierCliente, 
        base: 'CUSTOM-' + descripcion.toUpperCase().replace(/\s/g, '_').slice(0, 10), // Generar una base única
      },
    });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear margen' }, { status: 500 });
  }
}
MARGENES_ROUTE_EOF
echo "✅ Restaurado: /api/pricing/margenes/route.js"

# -------------------------------------
# 7. /api/almacen-stock/route.js (Combinada)
# -------------------------------------
cat > $ALMACEN_API_ROUTE <<'ALMACEN_API_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/almacen-stock - Obtiene todo el stock
export async function GET() {
  try {
    const stockItems = await db.stock.findMany({
      orderBy: { fechaEntrada: 'desc' },
    });
    return NextResponse.json(stockItems);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener stock' }, { status: 500 });
  }
}

// POST /api/almacen-stock?action=[entrada|salida] - Maneja ambas operaciones
export async function POST(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const data = await request.json();

  try {
    if (action === 'salida') {
        // --- Lógica de SALIDA (Baja de Stock) ---
        const { stockId, cantidad, referencia } = data;
        const cantidadFloat = parseFloat(cantidad);

        if (!stockId || !cantidad || cantidadFloat <= 0) {
            return NextResponse.json({ message: 'Se requiere stockId, cantidad y una cantidad positiva para la salida.' }, { status: 400 });
        }

        await db.$transaction(async (tx) => {
            const stockItem = await tx.stock.findUnique({ where: { id: stockId } });
            if (!stockItem) {
                throw new Error('Item de stock no encontrado.');
            }
            
            const newMetros = stockItem.metrosDisponibles - cantidadFloat;
            if (newMetros < -0.001) { 
                throw new Error(`Stock insuficiente. Solo quedan ${stockItem.metrosDisponibles.toFixed(2)}m disponibles.`);
            }

            // 1. Crear movimiento de salida
            await tx.movimientoStock.create({
                data: {
                    tipo: "Salida",
                    cantidad: cantidadFloat,
                    referencia: referencia || `Baja Manual - ID: ${stockId}`,
                    stockId: stockId,
                },
            });

            // 2. Actualizar o Eliminar el registro de Stock
            if (newMetros <= 0.001) { 
                await tx.stock.delete({ where: { id: stockId } });
            } else {
                await tx.stock.update({
                    where: { id: stockId },
                    data: { metrosDisponibles: newMetros },
                });
            }
        });
        
        return NextResponse.json({ message: 'Salida de stock procesada correctamente.' }, { status: 200 });

    } else {
        // --- Lógica de ENTRADA (Añadir Stock Manual) ---
        
        const newStockItem = await db.stock.create({
            data: {
                material: data.material,
                espesor: data.espesor,
                metrosDisponibles: parseFloat(data.metrosDisponibles),
                proveedor: data.proveedor,
                ubicacion: data.ubicacion,
                stockMinimo: parseFloat(data.stockMinimo) || null
            },
        });

        // Crear movimiento de entrada
        await db.movimientoStock.create({
            data: {
                tipo: "Entrada Manual",
                cantidad: parseFloat(data.metrosDisponibles),
                referencia: `Stock ID: ${newStockItem.id}`,
                stockId: newStockItem.id
            }
        });
        return NextResponse.json(newStockItem, { status: 201 });
    }

  } catch (error) {
    console.error('Error en POST /api/almacen-stock:', error);
    return NextResponse.json({ message: error.message || 'Error interno al crear/procesar stock.' }, { status: 500 });
  }
}
ALMACEN_API_EOF
echo "✅ Restaurado: /api/almacen-stock/route.js (Combinada)."

# -------------------------------------
# 8. /api/movimientos/route.js
# -------------------------------------
cat > $MOVIMIENTOS_ROUTE <<'MOVIMIENTOS_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/movimientos - Obtiene los últimos movimientos
export async function GET() {
  try {
    const movimientos = await db.movimientoStock.findMany({
      orderBy: { fecha: 'desc' },
      take: 50, // Limita a los últimos 50
      include: {
        stockItem: {
          select: {
            material: true,
          }
        }
      }
    });
    return NextResponse.json(movimientos);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener movimientos' }, { status: 500 });
  }
}
MOVIMIENTOS_ROUTE_EOF
echo "✅ Restaurado: /api/movimientos/route.js"

# -------------------------------------
# 9. /api/dashboard/route.js
# -------------------------------------
cat > $DASHBOARD_ROUTE <<'DASHBOARD_ROUTE_EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [
      totalPedidos, 
      totalPresupuestos, 
      pedidosProveedorPorLlegarCount,
      productosBajoStock,
      movimientosRecientes
    ] = await db.$transaction([
      db.pedido.count(),
      db.presupuesto.count(),
      db.pedidoProveedor.count({ 
        where: { estado: { not: 'Recibido' } }
      }),
      db.stock.findMany({
        where: {
          metrosDisponibles: { lt: 100 },
          stockMinimo: { gt: 0 }
        },
        select: {
          id: true, material: true, metrosDisponibles: true, stockMinimo: true, espesor: true,
        },
        orderBy: { metrosDisponibles: 'asc' },
        take: 10, 
      }),
      db.movimientoStock.findMany({
        orderBy: { fecha: 'desc' },
        include: {
          stockItem: { select: { material: true } }
        },
        take: 10, 
      })
    ]);

    const kpiData = [
      { title: "Total Pedidos Cliente", value: totalPedidos, icon: "Package", href: "/pedidos" },
      { title: "Total Presupuestos", value: totalPresupuestos, icon: "FileText", href: "/presupuestos" },
      { title: "Pedidos Proveedor Pendientes", value: pedidosProveedorPorLlegarCount, icon: "Truck", href: "/proveedores" },
    ];

    return NextResponse.json({
      kpiData,
      nivelesStock: productosBajoStock.map(item => ({ 
          id: item.id, 
          material: item.material, 
          metrosDisponibles: item.metrosDisponibles, 
          stockMinimo: item.stockMinimo, 
          espesor: item.espesor 
      })),
      movimientosRecientes: movimientosRecientes.map(mov => ({ 
          ...mov, 
          materialNombre: mov.stockItem?.material 
      })),
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ message: "Error fetching dashboard data" }, { status: 500 });
  }
}
DASHBOARD_ROUTE_EOF
echo "✅ Restaurado: /api/dashboard/route.js"


