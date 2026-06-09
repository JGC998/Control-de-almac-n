import { NextResponse } from 'next/server';
import { z } from 'zod';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { enviarWhatsApp } from '@/lib/tracking';

// Schema para borradores — usado tanto desde la recepción tablet como desde el nuevo rastreador
const borradorSchema = z.object({
  numContenedor:  z.string().max(100).optional().nullable(),
  numFactura:     z.string().max(200).optional().nullable(),
  descripcion:    z.string().max(200).optional().nullable(),
  proveedorId:    z.string().uuid().optional().nullable(),
  bobinas:        z.string().min(2).default('[]'),
  // Tracking
  blNumber:       z.string().max(200).optional().nullable(),
  trackingActivo: z.boolean().optional().default(false),
  // Estado: BORRADOR para recepciones tablet, PEDIDO/TRANSITO/ADUANA para rastreadores
  estado:         z.enum(['BORRADOR', 'PEDIDO', 'TRANSITO', 'ADUANA']).default('BORRADOR'),
});

// POST /api/importaciones/borrador
// Crea una importación parcial sin datos financieros.
// Usada por: tablet offline reception + formulario "Nuevo rastreador".
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
    const {
      numContenedor, numFactura, descripcion, proveedorId,
      bobinas, blNumber, trackingActivo, estado,
    } = parsed.data;

    const registro = await db.importacionContenedor.create({
      data: {
        estado,
        bobinas,
        descripcion:    descripcion?.trim()    || null,
        numContenedor:  numContenedor?.trim()   || null,
        numFactura:     numFactura?.trim()      || null,
        proveedorId:    proveedorId             || null,
        blNumber:       blNumber?.trim()        || null,
        trackingActivo: trackingActivo ?? false,
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
      include: { proveedor: { select: { id: true, nombre: true } } },
    });

    // WhatsApp de confirmación cuando el tracking está activo (fire-and-forget)
    if (registro.trackingActivo) {
      const ESTADO_LABEL = { PEDIDO: 'Pedido', TRANSITO: 'En tránsito', ADUANA: 'En aduana', BORRADOR: 'Borrador' };
      const trackingNum = registro.numContenedor || registro.blNumber;
      const tipoTracking = registro.numContenedor ? 'Contenedor' : 'BL';
      const fecha = new Date(registro.creadaEn).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

      const lineas = [
        `✅ *Rastreador dado de alta*`,
        registro.descripcion || registro.numFactura || 'Sin descripción',
        trackingNum ? `🔢 ${tipoTracking}: ${trackingNum}` : null,
        registro.proveedor?.nombre ? `🏭 ${registro.proveedor.nombre}` : null,
        `📊 Estado: ${ESTADO_LABEL[registro.estado] ?? registro.estado}`,
        `📅 ${fecha}`,
        `\nRecibirás avisos automáticos cuando haya cambios.`,
      ].filter(Boolean).join('\n');

      enviarWhatsApp(lineas).catch(e => logApiError(e, 'WhatsApp alta rastreador'));
    }

    return NextResponse.json(registro, { status: 201 });
  } catch (error) {
    logApiError(error, 'POST /api/importaciones/borrador');
    return NextResponse.json({ error: 'Error al crear el borrador' }, { status: 500 });
  }
}
