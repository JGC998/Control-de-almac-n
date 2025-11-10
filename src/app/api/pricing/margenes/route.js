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
    const { descripcion, tipo, valor, categoria, tierCliente } = data; // Añadido tierCliente

    const parsedValor = parseFloat(valor);

    // Validación explícita de campos obligatorios
    if (!descripcion || !tipo || isNaN(parsedValor) || parsedValor <= 0) {
      return NextResponse.json(
        { message: 'Datos de margen incompletos o inválidos. Se requiere descripción, tipo y un valor numérico positivo.' }, 
        { status: 400 }
      );
    }

    const nuevaRegla = await db.reglaMargen.create({
      data: {
        descripcion: descripcion,
        tipo: tipo,
        categoria: categoria,
        valor: parsedValor,
        tierCliente: tierCliente, // Guardar el nuevo campo
      },
    });
    return NextResponse.json(nuevaRegla, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al crear margen' }, { status: 500 });
  }
}
