import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { calcularHuella, getFechaHoraHusoEspana, formatFechaQR } from '@/lib/verifactu';

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const factura = await db.factura.findUnique({
      where: { id },
      include: {
        cliente: true,
        albaran: { select: { id: true, numero: true, estado: true } },
        pedido:  { select: { id: true, numero: true, estado: true } },
        items:   { include: { producto: true } },
        facturaOriginal: { select: { id: true, numero: true, fechaHoraGenRegistro: true, fechaCreacion: true } },
        rectificativas:  { select: { id: true, numero: true, estado: true, tipoFactura: true, fechaCreacion: true }, orderBy: { fechaCreacion: 'asc' } },
      },
    });

    if (!factura) return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });

    return NextResponse.json(factura);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener factura' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { estado, notas, fechaVencimiento, estadoEnvioAeat, csvAeat, items } = body;

    const existing = await db.factura.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });

    // Actualizar ítems de una factura en BORRADOR
    if (items && existing.estado === 'BORRADOR') {
      if (!items.length) {
        return NextResponse.json({ message: 'Se requiere al menos un ítem' }, { status: 400 });
      }
      const subtotal = items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0);
      const tax      = subtotal * 0.21;
      const total    = subtotal + tax;

      await db.$transaction([
        db.facturaItem.deleteMany({ where: { facturaId: id } }),
        db.factura.update({
          where: { id },
          data: {
            subtotal, tax, total,
            ...(notas !== undefined && { notas }),
            items: {
              create: items.map(i => ({
                descripcion:      i.descripcion,
                quantity:         Number(i.quantity),
                unitPrice:        Number(i.unitPrice),
                pesoUnitario:     i.pesoUnitario || 0,
                detallesTecnicos: i.detallesTecnicos || null,
                ...(i.productoId && { producto: { connect: { id: i.productoId } } }),
              })),
            },
          },
        }),
      ]);

      const updated = await db.factura.findUnique({
        where: { id },
        include: {
          items: true, cliente: true, albaran: true, pedido: true,
          facturaOriginal: { select: { id: true, numero: true, fechaHoraGenRegistro: true, fechaCreacion: true } },
          rectificativas:  { select: { id: true, numero: true, estado: true, tipoFactura: true, fechaCreacion: true } },
        },
      });
      revalidatePath('/facturas');
      revalidatePath(`/facturas/${id}`);
      return NextResponse.json(updated);
    }

    // Permitir actualizar estadoEnvioAeat/csvAeat sin cambiar el estado principal
    const soloAeat = !estado && (estadoEnvioAeat || csvAeat !== undefined);

    if (!soloAeat) {
      if (['EMITIDA', 'PAGADA'].includes(existing.estado) && estado !== existing.estado) {
        if (!['PAGADA', 'CANCELADA'].includes(estado)) {
          return NextResponse.json(
            { message: `No se puede modificar una factura en estado ${existing.estado}` },
            { status: 422 }
          );
        }
      }
      if (existing.estado === 'CANCELADA') {
        return NextResponse.json(
          { message: 'No se puede modificar una factura cancelada' },
          { status: 422 }
        );
      }
    }

    const updateData = {
      ...(notas !== undefined       && { notas }),
      ...(fechaVencimiento          && { fechaVencimiento: new Date(fechaVencimiento) }),
      ...(estadoEnvioAeat           && { estadoEnvioAeat }),
      ...(csvAeat !== undefined     && { csvAeat }),
    };

    // Al emitir (BORRADOR → EMITIDA): calcular hash VeriFactu
    if (estado === 'EMITIDA' && existing.estado === 'BORRADOR') {
      const emisor = await db.configuracionEmisor.findUnique({ where: { id: 1 } });

      if (!emisor?.nif) {
        return NextResponse.json(
          { message: 'Configura el NIF del emisor en Configuración → Emisor VeriFactu antes de emitir facturas.' },
          { status: 422 }
        );
      }

      // Obtener huella de la última factura emitida (la más reciente por fecha de generación)
      const ultimaFactura = await db.factura.findFirst({
        where: {
          id:      { not: id },
          huella:  { not: null },
          estado:  { in: ['EMITIDA', 'PAGADA'] },
        },
        orderBy: { fechaHoraGenRegistro: 'desc' },
        select:  { huella: true },
      });

      const ahora = new Date();
      const fechaHoraGenRegistro = getFechaHoraHusoEspana(ahora);
      const fechaExp = formatFechaQR(ahora);
      const huellaAnterior = ultimaFactura?.huella || '';

      const huella = calcularHuella({
        IDEmisorFactura:          emisor.nif,
        NumSerieFactura:          existing.numero,
        FechaExpedicionFactura:   fechaExp,
        TipoFactura:              existing.tipoFactura || 'F1',
        CuotaTotal:               existing.tax,
        ImporteTotal:             existing.total,
        HuellaAnterior:           huellaAnterior,
        FechaHoraHusoGenRegistro: fechaHoraGenRegistro,
      });

      updateData.estado                = 'EMITIDA';
      updateData.huella                = huella;
      updateData.huellaAnterior        = huellaAnterior;
      updateData.fechaHoraGenRegistro  = ahora;
      updateData.estadoEnvioAeat       = 'PENDIENTE';
    } else if (estado) {
      updateData.estado = estado;
    }

    const factura = await db.factura.update({
      where: { id },
      data: updateData,
      include: { items: true, cliente: true, albaran: true, pedido: true },
    });

    revalidatePath('/facturas');
    revalidatePath(`/facturas/${id}`);
    return NextResponse.json(factura);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al actualizar factura' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const existing = await db.factura.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ message: 'Factura no encontrada' }, { status: 404 });

    if (['EMITIDA', 'PAGADA'].includes(existing.estado)) {
      return NextResponse.json(
        { message: 'No se puede eliminar una factura emitida o pagada. Cancélala primero.' },
        { status: 422 }
      );
    }

    await db.factura.delete({ where: { id } });
    revalidatePath('/facturas');
    return NextResponse.json({ message: 'Factura eliminada' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al eliminar factura' }, { status: 500 });
  }
}
