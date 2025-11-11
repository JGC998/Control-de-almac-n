#!/bin/bash

# --- Rutas de Archivos ---
API_ID_FILE="src/app/api/pricing/margenes/[id]/route.js"
API_ROOT_FILE="src/app/api/pricing/margenes/route.js"

echo "--- 🛠️ FIX FINAL: Solucionando Promise en params y sincronizando campos ---"

# --- 1. Corregir [id]/route.js (PUT y DELETE) ---
cat > "$API_ID_FILE" << 'API_ID_ROUTE_JS'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/pricing/margenes/[id] - Actualiza una regla de margen
export async function PUT(request, { params }) {
  try {
    // FIX CRÍTICO: Usamos await para desestructurar 'id'
    const { id } = await params; 
    const data = await request.json();
    // Usamos 'multiplicador' y 'gastoFijo'
    const { descripcion, tipo, multiplicador, categoria, tierCliente, gastoFijo } = data; 

    const parsedMultiplicador = parseFloat(multiplicador);

    // Validación de datos
    if (!descripcion || !tipo || isNaN(parsedMultiplicador) || parsedMultiplicador <= 0) {
      return NextResponse.json(
        { message: 'Datos de margen incompletos o inválidos. Se requiere descripción, tipo y un multiplicador numérico positivo.' }, 
        { status: 400 }
      );
    }
    
    const updatedRegla = await db.reglaMargen.update({
      where: { id: id },
      data: {
        descripcion: descripcion,
        tipo: tipo,
        multiplicador: parsedMultiplicador,
        gastoFijo: parseFloat(gastoFijo) || 0,
        categoria: categoria,
        tierCliente: tierCliente, 
      },
    });

    return NextResponse.json(updatedRegla);
  } catch (error) {
    console.error('Error al actualizar margen:', error);
    if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Regla de margen no encontrada' }, { status: 404 });
    }
    if (error.code === 'P2002') { 
      return NextResponse.json({ message: 'Ya existe una regla con este identificador base' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al actualizar margen' }, { status: 500 });
  }
}

// DELETE /api/pricing/margenes/[id] - Elimina una regla de margen
export async function DELETE(request, { params }) {
  try {
    // FIX CRÍTICO: Usamos await para desestructurar 'id'
    const { id } = await params;

    await db.reglaMargen.delete({
      where: { id: id },
    });

    return NextResponse.json({ message: 'Regla de margen eliminada' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar margen:', error);
    if (error.code === 'P2025') {
        return NextResponse.json({ message: 'Regla de margen no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar margen' }, { status: 500 });
  }
}
API_ID_ROUTE_JS
echo "✅ 1/2: Archivo API con ID ($API_ID_FILE) corregido."

# --- 2. Corregir route.js (POST) ---
cat > "$API_ROOT_FILE" << 'API_ROOT_ROUTE_JS'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pricing/margenes - Obtiene todas las reglas de margen
export async function GET() {
  try {
    const data = await db.reglaMargen.findMany();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ message: 'Error al obtener márgenes' }, { status: 500 });
  }
}

// POST /api/pricing/margenes - Crea una nueva regla de margen
export async function POST(request) {
  try {
    const data = await request.json();
    // Ahora esperamos 'multiplicador' y 'gastoFijo'
    const { descripcion, tipo, multiplicador, categoria, tierCliente, base, gastoFijo } = data;

    const parsedMultiplicador = parseFloat(multiplicador);

    // Validación explícita de campos obligatorios
    if (!descripcion || !tipo || isNaN(parsedMultiplicador) || parsedMultiplicador <= 0) {
      return NextResponse.json(
        { message: 'Datos de margen incompletos o inválidos. Se requiere descripción, tipo y un multiplicador numérico positivo.' }, 
        { status: 400 }
      );
    }
    
    const nuevaRegla = await db.reglaMargen.create({
      data: {
        descripcion: descripcion,
        tipo: tipo,
        base: base || descripcion, // Si no se proporciona base, usa la descripción
        multiplicador: parsedMultiplicador,
        gastoFijo: parseFloat(gastoFijo) || 0,
        categoria: categoria,
        tierCliente: tierCliente, 
      },
    });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    console.error(error);
    if (error.code === 'P2002') { 
        return NextResponse.json({ message: 'Ya existe una regla con este identificador base' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Error al crear margen' }, { status: 500 });
  }
}
API_ROOT_ROUTE_JS
echo "✅ 2/2: Archivo API raíz ($API_ROOT_FILE) corregido."

echo "--- 🎉 ¡ACTUALIZACIÓN FINALIZADA! ---"
echo "Por favor, **reinicia tu servidor Next.js** para aplicar los cambios. La edición de márgenes ahora debe funcionar correctamente."