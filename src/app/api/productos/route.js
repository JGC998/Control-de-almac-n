import { NextResponse } from 'next/server';
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

    const whereClause = {};
    if (nombre) {
      whereClause.nombre = { contains: nombre, mode: 'insensitive' };
    }

    // Búsqueda general
    if (q) {
      whereClause.OR = [
        { nombre: { contains: q, mode: 'insensitive' } },
        { referenciaFabricante: { contains: q, mode: 'insensitive' } },
      ];
    }

    // Comportamiento paginado si se solicitan parámetros
    if (pageParam || limitParam) {
      const page = parseInt(pageParam || '1');
      const limit = parseInt(limitParam || '50');
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
          },
        }),
        db.producto.count({ where: whereClause })
      ]);

      // Serializar para JSON (convertir Decimals a números)
      const productosSerializados = productos.map(p => ({
        ...p,
        precioUnitario: p.precioUnitario ? Number(p.precioUnitario) : 0,
        pesoUnitario: p.pesoUnitario ? Number(p.pesoUnitario) : 0,
        costoUnitario: p.costoUnitario ? Number(p.costoUnitario) : 0,
        precioVentaFab: p.precioVentaFab ? Number(p.precioVentaFab) : 0,
        precioVentaInt: p.precioVentaInt ? Number(p.precioVentaInt) : 0,
        precioVentaFin: p.precioVentaFin ? Number(p.precioVentaFin) : 0,
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
      },
    });

    // Serializar para JSON
    const productosSerializados = productos.map(p => ({
      ...p,
      precioUnitario: p.precioUnitario ? Number(p.precioUnitario) : 0,
      pesoUnitario: p.pesoUnitario ? Number(p.pesoUnitario) : 0,
      costoUnitario: p.costoUnitario ? Number(p.costoUnitario) : 0,
      precioVentaFab: p.precioVentaFab ? Number(p.precioVentaFab) : 0,
      precioVentaInt: p.precioVentaInt ? Number(p.precioVentaInt) : 0,
      precioVentaFin: p.precioVentaFin ? Number(p.precioVentaFin) : 0,
      espesor: p.espesor ? Number(p.espesor) : null,
      largo: p.largo ? Number(p.largo) : null,
      ancho: p.ancho ? Number(p.ancho) : null,
    }));

    return NextResponse.json(productosSerializados);
  } catch (error) {
    console.error('Error al obtener productos:', error);
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
        referenciaFabricante: d.referenciaFabricante ?? null,
        espesor: d.espesor ?? null,
        largo: d.largo ?? null,
        ancho: d.ancho ?? null,
        precioUnitario: d.precioUnitario,
        pesoUnitario: d.pesoUnitario ?? 0,
        costoUnitario: d.costoUnitario ?? null,
        tieneTroquel: d.tieneTroquel ?? false,
        color: d.color ?? null,
        fabricanteId: d.fabricanteId ?? null,
        materialId: d.materialId ?? null,
        precioVentaFab: d.precioVentaFab ?? 0,
        precioVentaInt: d.precioVentaInt ?? 0,
        precioVentaFin: d.precioVentaFin ?? 0,
      },
    });

    await logCreate('Producto', nuevoProducto.id, nuevoProducto, 'Admin');
    revalidatePath('/gestion/productos');
    return NextResponse.json(nuevoProducto, { status: 201 });
  } catch (error) {
    console.error('Error al crear el producto:', error);
    return NextResponse.json({ message: 'Error al crear el producto' }, { status: 500 });
  }
}