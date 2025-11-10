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

export async function PUT(request) {
  const { id, ...data } = await request.json();
  try {
    if (!id || !data.nombre) {
      return NextResponse.json({ error: 'ID y Nombre del Material son requeridos para actualizar.' }, { status: 400 });
    }
    
    // El ID es un string (UUID)
    const updatedMaterial = await db.material.update({
      where: { id: id },
      data: {
        nombre: data.nombre,
      },
    });
    return NextResponse.json(updatedMaterial);
  } catch (error) {
    console.error('Error updating material:', error);
    if (error.code === 'P2002') {
        return NextResponse.json({ error: 'Ya existe un material con ese nombre.' }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Material no encontrado.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar el material.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { id } = await request.json();
  try {
    if (!id) {
      return NextResponse.json({ error: 'ID del Material es requerido para eliminar.' }, { status: 400 });
    }
    
    // 1. ELIMINACIÓN CASCADA LÓGICA (Tarifas): Eliminamos todas las tarifas asociadas
    const materialToDelete = await db.material.findUnique({ where: { id: id } });
    if (materialToDelete) {
        await db.tarifaMaterial.deleteMany({
            where: { material: materialToDelete.nombre }
        });
    }

    // 2. ELIMINACIÓN DEL REGISTRO PRINCIPAL
    await db.material.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Material eliminado.' });
  } catch (error) {
    console.error('Error deleting material:', error);
    // P2003 (Clave foránea): Si llega aquí, es porque está enlazado a un Producto.
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: 'No se puede eliminar el material porque está enlazado a uno o varios productos. Elimine los productos dependientes de este material en "Gestión de Productos" y vuelva a intentarlo.', 
        details: error.message 
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al eliminar el material.' }, { status: 500 });
  }
}
