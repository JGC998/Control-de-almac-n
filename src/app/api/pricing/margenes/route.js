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
