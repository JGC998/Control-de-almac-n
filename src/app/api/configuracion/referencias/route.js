import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 

export const dynamic = 'force-dynamic';

// Función para obtener un número de forma segura o null si es inválido/vacío
const getSafeNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return null;
    }
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
};

export async function GET() {
  try {
    const referencias = await db.referenciaBobina.findMany({
      orderBy: { referencia: 'asc' }, 
    });
    return NextResponse.json(referencias);
  } catch (error) {
    console.error('Error fetching referencias bobina:', error);
    return NextResponse.json({ error: 'Error fetching referencias bobina' }, { status: 500 });
  }
}

export async function POST(request) {
  const data = await request.json();
  try {
    // CORRECCIÓN: Usar data.nombre (lo que envía el formulario)
    if (!data.nombre) {
      return NextResponse.json({ error: 'El nombre de la Referencia de Bobina es requerido.' }, { status: 400 });
    }

    const newRef = await db.referenciaBobina.create({
      data: {
        // MAPEAR: 'nombre' del form a 'referencia' del modelo
        referencia: data.nombre, 
        ancho: getSafeNumber(data.ancho),
        lonas: getSafeNumber(data.lonas),
        pesoPorMetroLineal: getSafeNumber(data.pesoPorMetroLineal),
      },
    });
    return NextResponse.json(newRef, { status: 201 });
  } catch (error) {
    console.error('Error creating referencia bobina:', error);
    // P2002 para Clave Compuesta
    if (error.code === 'P2002') {
        return NextResponse.json({ 
            error: 'Ya existe una referencia con esa combinación de Nombre, Ancho y Lonas.' 
        }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al crear la referencia de bobina.' }, { status: 500 });
  }
}

export async function PUT(request) {
  const { id, ...data } = await request.json();
  try {
    if (!id) {
      return NextResponse.json({ error: 'ID de Referencia de Bobina requerido para actualizar.' }, { status: 400 });
    }

    const updatedRef = await db.referenciaBobina.update({
      where: { id: id },
      data: {
        referencia: data.referencia, 
        ancho: getSafeNumber(data.ancho),
        lonas: getSafeNumber(data.lonas),
        pesoPorMetroLineal: getSafeNumber(data.pesoPorMetroLineal),
      },
    });
    return NextResponse.json(updatedRef);
  } catch (error) {
    console.error('Error updating referencia bobina:', error);
    // CORRECCIÓN CLAVE: Capturar P2002 para las actualizaciones
    if (error.code === 'P2002') {
        return NextResponse.json({ 
            error: 'La combinación de Nombre, Ancho y Lonas ya existe en otro registro.' 
        }, { status: 409 });
    }
    if (error.code === 'P2025') {
        return NextResponse.json({ error: 'Referencia de Bobina no encontrada.' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Error al actualizar la referencia de bobina.' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { id } = await request.json();
  try {
    if (!id) {
      return NextResponse.json({ error: 'ID de Referencia de Bobina requerido para eliminar.' }, { status: 400 });
    }
    
    await db.referenciaBobina.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Referencia de Bobina eliminada.' });
  } catch (error) {
    console.error('Error deleting referencia bobina:', error);
    if (error.code === 'P2003') {
      return NextResponse.json({ 
        error: 'No se puede eliminar esta referencia porque está siendo utilizada en un pedido de proveedor (FK Constraint). Debe eliminar o modificar el pedido de proveedor primero.', 
        details: error.message 
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Error al eliminar la referencia de bobina.' }, { status: 500 });
  }
}