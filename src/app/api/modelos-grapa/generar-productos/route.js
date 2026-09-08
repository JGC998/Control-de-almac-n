import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

// POST /api/modelos-grapa/generar-productos
// Por cada ModeloGrapa × ancho disponible genera o actualiza el Producto correspondiente.
// Nombre: "GRAPA {modelo} {ancho}mm"  |  unidad: PAR  |  precio: (ancho/100) × precioPor100mm
// Solo sube el precio, nunca lo baja (misma regla que tarifas-rollo/generar-productos).
export async function POST() {
  try {
    const modelos = await db.modeloGrapa.findMany({ where: { activo: true } });

    let creados = 0;
    let actualizados = 0;
    let omitidos = 0;

    for (const modelo of modelos) {
      const anchos = Array.isArray(modelo.anchosDisponibles) && modelo.anchosDisponibles.length > 0
        ? modelo.anchosDisponibles
        : [];

      if (anchos.length === 0) { omitidos++; continue; }

      for (const ancho of anchos) {
        const precio = parseFloat(((ancho / 100) * modelo.precioPor100mm).toFixed(4));
        if (precio <= 0) { omitidos++; continue; }

        const nombre = `GRAPA ${modelo.nombre} ${ancho}mm`;

        const existente = await db.producto.findFirst({
          where: { nombre, referenciaFabricante: null },
          select: { id: true, precioUnitario: true },
        });

        if (!existente) {
          await db.producto.create({
            data: {
              nombre,
              tipo:           'GRAPA',
              unidad:         'PAR',
              activo:         true,
              ancho,
              precioUnitario: precio,
              pesoUnitario:   0,
              costoUnitario:  0,
            },
          });
          creados++;
        } else if (precio > existente.precioUnitario) {
          await db.producto.update({
            where: { id: existente.id },
            data:  { precioUnitario: precio },
          });
          actualizados++;
        }
      }
    }

    return NextResponse.json({ creados, actualizados, omitidos });
  } catch (error) {
    logApiError(error, 'POST /api/modelos-grapa/generar-productos');
    return NextResponse.json({ message: 'Error al generar productos de grapa' }, { status: 500 });
  }
}
