import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logApiError } from '@/lib/logger';

// POST /api/tarifas-rollo/generar-productos
// Para cada TarifaRollo genera o actualiza el Producto correspondiente en el catálogo.
// Nombre generado: "{MATERIAL} {ESPESOR}mm ROLLO {ANCHO}mm"
// Regla de precio: solo actualiza si el nuevo precio es MAYOR (nunca baja el precio).
export async function POST() {
  try {
    const [rollos, materialesDB] = await Promise.all([
      db.tarifaRollo.findMany({ take: 2000 }),
      db.material.findMany({ select: { id: true, nombre: true } }),
    ]);

    const materialMap = Object.fromEntries(materialesDB.map(m => [m.nombre, m.id]));

    let creados = 0;
    let actualizados = 0;
    let sinPrecio = 0;

    for (const rollo of rollos) {
      if (!rollo.ancho) continue;

      const precioRollo = rollo.precioBase;
      if (!precioRollo || precioRollo <= 0) { sinPrecio++; continue; }

      const nombreBase = `${rollo.material} ${rollo.espesor}mm ROLLO ${rollo.ancho}mm`;
      const nombre = rollo.color ? `${nombreBase} ${rollo.color}` : nombreBase;

      const materialId = materialMap[rollo.material] ?? null;

      const existente = await db.producto.findFirst({
        where: { nombre },
        select: { id: true, precioUnitario: true },
      });

      if (!existente) {
        await db.producto.create({
          data: {
            nombre,
            tipo:           'BANDA',
            unidad:         'M2',
            activo:         true,
            materialId,
            espesor:        rollo.espesor,
            ancho:          rollo.ancho,
            largo:          rollo.metrajeMinimo * 1000, // metros → mm
            color:          rollo.color ?? null,
            precioUnitario: precioRollo,
            pesoUnitario:   rollo.peso,
            costoUnitario:  0,
          },
        });
        creados++;
      } else if (precioRollo > existente.precioUnitario) {
        await db.producto.update({
          where: { id: existente.id },
          data: { precioUnitario: precioRollo },
        });
        actualizados++;
      }
    }

    return NextResponse.json({ creados, actualizados, sinPrecio });
  } catch (error) {
    logApiError(error, 'POST /api/tarifas-rollo/generar-productos');
    return NextResponse.json({ message: 'Error al generar productos' }, { status: 500 });
  }
}
