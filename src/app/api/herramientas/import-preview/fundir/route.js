import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { productoId, pvpNuevo, udsNuevas, accion } = body;

    if (accion === 'actualizar') {
      if (!productoId) return NextResponse.json({ error: 'productoId requerido' }, { status: 400 });

      const data = {};
      if (pvpNuevo != null && pvpNuevo > 0) data.precioVenta = Number(pvpNuevo);
      if (udsNuevas != null) data.unidadesVendidas = Math.round(Number(udsNuevas));

      const producto = await prisma.producto.update({
        where: { id: productoId },
        data,
        select: { id: true, nombre: true, precioVenta: true, unidadesVendidas: true },
      });

      return NextResponse.json({ ok: true, producto });
    }

    if (accion === 'crear') {
      const { nombre, espesor, ancho, largo, lonas, materialNombre, fabricanteNombre } = body;
      if (!nombre) return NextResponse.json({ error: 'nombre requerido' }, { status: 400 });

      // Buscar materialId y fabricanteId por nombre (opcional)
      let materialId = null;
      let fabricanteId = null;

      if (materialNombre) {
        const mat = await prisma.material.findFirst({
          where: { nombre: { contains: materialNombre } },
          select: { id: true },
        });
        if (mat) materialId = mat.id;
      }

      if (fabricanteNombre) {
        const fab = await prisma.fabricante.findFirst({
          where: { nombre: { contains: fabricanteNombre } },
          select: { id: true },
        });
        if (fab) fabricanteId = fab.id;
      }

      const data = {
        nombre,
        precioVenta: pvpNuevo != null ? Number(pvpNuevo) : 0,
        unidadesVendidas: udsNuevas != null ? Math.round(Number(udsNuevas)) : 0,
      };
      if (espesor != null) data.espesor = Number(espesor);
      if (ancho   != null) data.ancho   = Number(ancho);
      if (largo   != null) data.largo   = Number(largo);
      if (lonas   != null) data.lonas   = Number(lonas);
      if (materialId)  data.materialId  = materialId;
      if (fabricanteId) data.fabricanteId = fabricanteId;

      const producto = await prisma.producto.create({
        data,
        select: { id: true, nombre: true, precioVenta: true, unidadesVendidas: true },
      });

      return NextResponse.json({ ok: true, producto, creado: true });
    }

    return NextResponse.json({ error: 'accion no reconocida' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
