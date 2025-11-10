#!/bin/bash
set -e

MARGINES_ROUTE_FILE="src/app/api/pricing/margenes/route.js"
MARGINES_ID_ROUTE_FILE="src/app/api/pricing/margenes/[id]/route.js"

echo "--- 1. Corrigiendo API POST /api/pricing/margenes: Mapeo de FABRICANTE y validación ---"

cat > "$MARGINES_ROUTE_FILE" <<'EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/pricing/margenes - Obtiene todas las reglas de margen
export async function GET() {
  try {
    const data = await db.reglaMargen.findMany();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error al obtener márgenes:', error);
    return NextResponse.json({ message: 'Error al obtener márgenes' }, { status: 500 });
  }
}

// POST /api/pricing/margenes - Crea una nueva regla de margen
export async function POST(request) {
  let receivedData;
  try {
    receivedData = await request.json(); // Leer los datos
    
    // 1. Normalizar y validar entradas del formulario
    const descripcion = receivedData.descripcion?.trim();
    let tipo = receivedData.tipo?.trim() || 'General'; // Usar General como fallback
    const valorFloat = parseFloat(receivedData.valor);
    const gastoFijoFloat = parseFloat(receivedData.gastoFijo) || 0;

    if (!descripcion || isNaN(valorFloat)) {
        return NextResponse.json({ message: 'La descripción y el multiplicador son obligatorios.' }, { status: 400 });
    }
    
    let categoria = receivedData.categoria?.trim() || null;
    
    // LÓGICA DE CORRECCIÓN: Si el usuario escribió una categoría donde va el 'tipo'
    if (tipo.toUpperCase() !== 'GENERAL' && tipo.toUpperCase() !== 'CATEGORIA' && tipo.toUpperCase() !== 'CLIENTE') {
         categoria = tipo; // Mover el valor del campo 'tipo' a 'categoria'
         tipo = 'Categoria'; // Establecer el tipo real como 'Categoria'
    }

    // 2. Construir el objeto de inserción usando las CLAVES DE LA BASE DE DATOS
    const createData = {
      descripcion: descripcion,
      tipo: tipo,
      
      // Clave: multiplicador (nombre de columna)
      multiplicador: valorFloat, 
      
      gastoFijo: gastoFijoFloat,
      
      // Clave: tipo_categoria (nombre de columna)
      tipo_categoria: categoria, 
      
      base: null, // Campo 'base' no usado
    };

    const nuevaRegla = await db.reglaMargen.create({
      data: createData,
    });

    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    console.error('Error al crear margen:', error);
    if (error.code) {
        return NextResponse.json({ message: `Error de BD (${error.code}): ${error.meta?.target || error.message}` }, { status: 500 });
    }
    // Devolvemos 400 si es un error de formato genérico no capturado
    return NextResponse.json({ message: error.message || 'Error al guardar el registro.' }, { status: 400 });
  }
}
EOF

echo "--- 2. Corrigiendo API PUT /api/pricing/margenes/[id]/route.js: Aplicando la misma lógica ---"

cat > "$MARGINES_ID_ROUTE_FILE" <<'EOF'
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUT /api/pricing/margenes/[id] - Actualiza una regla de margen
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    let tipo = data.tipo?.trim() || 'General';
    const valorFloat = parseFloat(data.valor);
    const gastoFijoFloat = parseFloat(data.gastoFijo) || 0;
    
    let categoria = data.categoria?.trim() || null;
    
    // LÓGICA DE CORRECCIÓN para la edición
    if (tipo.toUpperCase() !== 'GENERAL' && tipo.toUpperCase() !== 'CATEGORIA' && tipo.toUpperCase() !== 'CLIENTE') {
         categoria = tipo; // Mover el valor del campo 'tipo' a 'categoria'
         tipo = 'Categoria'; // Establecer el tipo real como 'Categoria'
    }
    
    // Usamos las CLAVES DE LA BASE DE DATOS
    const updateData = {
      descripcion: data.descripcion?.trim(),
      tipo: tipo,
      
      multiplicador: valorFloat, 
      
      gastoFijo: gastoFijoFloat,
      tipo_categoria: categoria, 
      base: data.base?.trim() || null, 
    };
    
    const updatedRegla = await db.reglaMargen.update({
      where: { id: id },
      data: updateData,
    });
    return NextResponse.json(updatedRegla);
  } catch (error) {
    console.error('Error al actualizar margen:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Regla no encontrada' }, { status: 404 });
    }
    if (error.code) {
        return NextResponse.json({ message: `Error de BD (${error.code}): ${error.meta?.target || error.message}` }, { status: 500 });
    }
    return NextResponse.json({ message: error.message || 'Error al actualizar margen' }, { status: 500 });
  }
}

// DELETE /api/pricing/margenes/[id] - Elimina una regla de margen
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await db.reglaMargen.delete({
      where: { id: id },
    });
    return NextResponse.json({ message: 'Regla eliminada' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar margen:', error);
    if (error.code === 'P2025') {
      return NextResponse.json({ message: 'Regla no encontrada' }, { status: 404 });
    }
    return NextResponse.json({ message: 'Error al eliminar margen' }, { status: 500 });
  }
}
EOF

echo "--- ✅ Corregida la ambigüedad en la API y el error 400. ---"
echo "El servidor ahora mapeará 'FABRICANTE' a una categoría correctamente."
echo "--- ⚠️ ACCIÓN REQUERIDA: Prueba Final ---"
echo "1. **Reinicie el servidor**."
echo "2. Vuelva a Configuración -> Márgenes e intente crear la regla. Esto debería funcionar."
