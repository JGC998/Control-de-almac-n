import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';

// Schema mínimo para borradores — sin campos financieros obligatorios
const borradorSchema = z.object({
  numContenedor: z.string().max(100).optional().nullable(),
  numFactura:    z.string().max(200).optional().nullable(),
  descripcion:   z.string().max(200).optional().nullable(),
  proveedorId:   z.string().uuid().optional().nullable(),
  bobinas:       z.string().min(2, 'Artículos requeridos'),
});

// POST /api/importaciones/borrador
// Crea una importación en estado BORRADOR con datos parciales.
// No requiere tipo de cambio ni gastos — se rellenarán desde la calculadora.
export async function POST(request) {
  try {
    const body   = await request.json();
    const parsed = borradorSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }
    const { numContenedor, numFactura, descripcion, proveedorId, bobinas } = parsed.data;

    const registro = await db.importacionContenedor.create({
      data: {
        estado:      'BORRADOR',
        bobinas,
        descripcion: descripcion?.trim() || null,
        numContenedor: numContenedor?.trim() || null,
        numFactura:    numFactura?.trim()    || null,
        proveedorId:   proveedorId           || null,
        // Campos financieros en cero — se completarán desde la calculadora
        tasaCambio:          0,
        totalBobinasUSD:     0,
        totalBobinasEUR:     0,
        totalMetros:         0,
        suplidos:            0,
        exentos:             0,
        sujetos:             0,
        gastosRepercutibles: 0,
        costeProducto:       0,
        totalDesembolso:     0,
      },
    });

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/importaciones/borrador');
    return NextResponse.json({ error: 'Error al crear el borrador' }, { status: 500 });
  }
}
