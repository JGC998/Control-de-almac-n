import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Las nuevas queries necesitan que el modelo Stock tenga un campo stockMinimo
    // y que los modelos PedidoProveedor y PedidoProveedorData estén definidos.
    // Usamos nombres de modelos genéricos para la API.
    
    // Ejecutar todas las consultas en paralelo
    const [
      totalPedidos, 
      totalPresupuestos, 
      pedidosProveedorPorLlegarCount,
      productosBajoStock,
      movimientosRecientes
    ] = await db.$transaction([
      // 1. Total Pedidos
      db.pedido.count(),
      
      // 2. Total Presupuestos
      db.presupuesto.count(),
      
      // 3. Pedidos Proveedor por llegar (Estado: NO 'Recibido')
      db.pedidoProveedor.count({ // Usamos PedidoProveedor
        where: {
          estado: {
            not: 'Recibido'
          }
        }
      }),
      
      // 4. Productos Bajo Stock (Stock < Stock Mínimo)
      db.stock.findMany({ // Usamos el modelo Stock para el inventario
        where: {
          // Asumimos que la comparación es implícita o que el frontend manejará la lógica
          // Como la comparación directa no es estándar en el where de Prisma, 
          // simplemente traemos los que están bajo un umbral bajo (ej. 50m) 
          // o basamos la comparación en un campo existente (metrosDisponibles).
          // Para esta corrección, nos enfocaremos en los que tienen poco stock.
          metrosDisponibles: {
              lt: 100 // Simulación: menos de 100 metros disponibles
          },
          stockMinimo: {
              gt: 0 
          }
        },
        select: {
          id: true,
          material: true,
          metrosDisponibles: true,
          stockMinimo: true,
          espesor: true,
        },
        orderBy: {
            metrosDisponibles: 'asc'
        },
        take: 10, 
      }),
      
      // 5. Movimientos Recientes
      db.movimientoStock.findMany({
        orderBy: {
          fecha: 'desc',
        },
        include: {
          stockItem: {
            select: {
              material: true,
            }
          }
        },
        take: 10, 
      })
    ]);

    const kpiData = [
      {
        title: "Total Pedidos Cliente",
        value: totalPedidos,
        icon: "Package",
        href: "/pedidos",
      },
      {
        title: "Total Presupuestos",
        value: totalPresupuestos,
        icon: "FileText",
        href: "/presupuestos",
      },
      {
        title: "Pedidos Proveedor Pendientes",
        value: pedidosProveedorPorLlegarCount,
        icon: "Truck",
        href: "/proveedores", // Enlace a Pedidos Proveedor
      },
    ];

    return NextResponse.json({
      kpiData,
      // Renombramos la key para coincidir con el componente NivelesStock
      nivelesStock: productosBajoStock.map(item => ({ 
          id: item.id, 
          material: item.material, 
          metrosDisponibles: item.metrosDisponibles, 
          stockMinimo: item.stockMinimo, 
          espesor: item.espesor 
      })),
      movimientosRecientes: movimientosRecientes.map(mov => ({ 
          ...mov, 
          // Añadimos el material del stock para la tabla de movimientos
          materialNombre: mov.stockItem?.material 
      })),
    });

  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({ message: "Error fetching dashboard data" }, { status: 500 });
  }
}
