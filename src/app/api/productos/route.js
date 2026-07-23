import { NextResponse } from 'next/server';
import { logApiError } from '@/lib/logger';
import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { productoSchema } from '@/lib/validations';
import { logCreate } from '@/lib/audit';

// GET /api/productos - Obtiene todos los productos con paginación opcional
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const nombre = searchParams.get('nombre');
    const q = searchParams.get('q');
    const pageParam = searchParams.get('page');
    const limitParam = searchParams.get('limit');

    const subfamiliaId = searchParams.get('subfamiliaId');
    const familiaId = searchParams.get('familiaId');
    const soloAccesorios = searchParams.get('soloAccesorios') === 'true';
    const activoParam    = searchParams.get('activo'); // 'true' | 'false' | null (todos)

    const whereClause = {};
    if (soloAccesorios) {
      whereClause.tipo = { not: 'BANDA' };
    }
    if (activoParam === 'true')  whereClause.activo = true;
    if (activoParam === 'false') whereClause.activo = false;
    if (nombre) {
      whereClause.nombre = { contains: nombre };
    }
    if (subfamiliaId) {
      whereClause.subfamiliaId = subfamiliaId;
    }
    if (familiaId) {
      whereClause.subfamilia = { familiaId };
    }

    // Búsqueda general
    if (q) {
      whereClause.OR = [
        { nombre: { contains: q } },
        { referenciaFabricante: { contains: q } },
      ];
    }

    // Comportamiento paginado si se solicitan parámetros
    if (pageParam || limitParam) {
      const page  = Math.max(1, parseInt(pageParam  || '1',  10) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(limitParam || '50', 10) || 50));
      const skip = (page - 1) * limit;

      const [productos, total] = await Promise.all([
        db.producto.findMany({
          where: whereClause,
          take: limit,
          skip: skip,
          orderBy: { nombre: 'asc' },
          include: {
            fabricante: true,
            material: true,
            subfamilia: { include: { familia: true } },
          },
        }),
        db.producto.count({ where: whereClause })
      ]);

      // Serializar para JSON (convertir Decimals a números); costoUnitario excluido (SEC-09)
      const productosSerializados = productos.map(({ costoUnitario: _omit, ...p }) => ({
        ...p,
        precioUnitario: p.precioUnitario ? Number(p.precioUnitario) : 0,
        pesoUnitario: p.pesoUnitario ? Number(p.pesoUnitario) : 0,
        espesor: p.espesor ? Number(p.espesor) : null,
        largo: p.largo ? Number(p.largo) : null,
        ancho: p.ancho ? Number(p.ancho) : null,
      }));

      return NextResponse.json({
        data: productosSerializados,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
      });
    }

    // Comportamiento legado: cap de seguridad para evitar full-table scans
    const productos = await db.producto.findMany({
      where: whereClause,
      take: 500,
      orderBy: { nombre: 'asc' },
      include: {
        fabricante: true,
        material: true,
        subfamilia: { include: { familia: true } },
      },
    });

    // Serializar para JSON; costoUnitario excluido (SEC-09)
    const productosSerializados = productos.map(({ costoUnitario: _omit, ...p }) => ({
      ...p,
      precioUnitario: p.precioUnitario ? Number(p.precioUnitario) : 0,
      pesoUnitario: p.pesoUnitario ? Number(p.pesoUnitario) : 0,
      espesor: p.espesor ? Number(p.espesor) : null,
      largo: p.largo ? Number(p.largo) : null,
      ancho: p.ancho ? Number(p.ancho) : null,
    }));

    return NextResponse.json(productosSerializados);
  } catch (error) {
    logApiError(error, 'Error al obtener productos:');
    return NextResponse.json({ message: 'Error al obtener productos' }, { status: 500 });
  }
}

// POST /api/productos - Crea un nuevo producto
export async function POST(request) {
  try {
    const data = await request.json();

    const validation = productoSchema.safeParse(data);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validación fallida', details: validation.error.issues.map(e => ({ field: e.path.join('.'), message: e.message })) },
        { status: 400 }
      );
    }

    const d = validation.data;
    const nuevoProducto = await db.producto.create({
      data: {
        nombre: d.nombre,
        tipo: d.tipo ?? 'BANDA',
        unidad: d.unidad ?? 'M2',
        activo: d.activo ?? true,
        descripcion: d.descripcion ?? null,
        referenciaFabricante: d.referenciaFabricante ?? null,
        espesor: d.espesor ?? null,
        largo: d.largo ?? null,
        ancho: d.ancho ?? null,
        precioUnitario: d.precioUnitario,
        pesoUnitario: d.pesoUnitario ?? 0,
        costoUnitario: d.costoUnitario ?? null,
        tieneTroquel: d.tieneTroquel ?? false,
        color: d.color ?? null,
        acabado: d.acabado ?? null,
        lonas: d.lonas ?? null,
        fabricanteId: d.fabricanteId ?? null,
        materialId: d.materialId ?? null,
        subfamiliaId: d.subfamiliaId ?? null,
      },
    });

    await logCreate('Producto', nuevoProducto.id, nuevoProducto, 'Admin');
    revalidatePath('/gestion/productos');
    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    logApiError(error, 'Error al crear el producto:');
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}