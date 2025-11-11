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
