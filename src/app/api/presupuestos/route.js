
import { NextResponse } from 'next/server';
import { readData, writeData } from '@/utils/dataManager';
import { v4 as uuidv4 } from 'uuid';

/**
 * Maneja las solicitudes GET para obtener todos los presupuestos.
 */
export async function GET() {
  try {
    const quotes = await readData('presupuestos.json');
    return NextResponse.json(quotes);
  } catch (error) {
    console.error('Error al leer los presupuestos:', error);
    return NextResponse.json({ message: 'Error interno al leer los datos de presupuestos.' }, { status: 500 });
  }
}

/**
 * Maneja las solicitudes POST para crear un nuevo presupuesto.
 */
export async function POST(request) {
  try {
    const quoteData = await request.json();

    // Validacion basica
    if (!quoteData.clienteId || !quoteData.items || quoteData.items.length === 0) {
      return NextResponse.json({ message: 'Datos incompletos. Se requiere clienteId y al menos un item.' }, { status: 400 });
    }

    const newQuote = {
      ...quoteData,
      id: uuidv4(),
      numero: `PRE-${Date.now()}`, // Numero de presupuesto simple
      fechaCreacion: new Date().toISOString(),
      estado: 'Borrador', // Estado inicial por defecto
    };

    const allQuotes = await readData('presupuestos.json');
    allQuotes.push(newQuote);
    await writeData('presupuestos.json', allQuotes);

    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error('Error al crear el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al guardar el nuevo presupuesto.' }, { status: 500 });
  }
}
