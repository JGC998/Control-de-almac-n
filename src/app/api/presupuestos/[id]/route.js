
import { NextResponse } from 'next/server';
import { readData, writeData } from '@/utils/dataManager';

// GET: Obtener un presupuesto específico por ID
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const quotes = await readData('presupuestos.json');
    const quote = quotes.find(q => q.id === id);

    if (!quote) {
      return NextResponse.json({ message: 'Presupuesto no encontrado' }, { status: 404 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    console.error('Error al leer el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al leer los datos' }, { status: 500 });
  }
}

// PUT: Actualizar un presupuesto existente
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const updatedQuoteData = await request.json();

    if (!updatedQuoteData) {
      return NextResponse.json({ message: 'Datos de actualización no proporcionados' }, { status: 400 });
    }

    const quotes = await readData('presupuestos.json');
    const quoteIndex = quotes.findIndex(q => q.id === id);

    if (quoteIndex === -1) {
      return NextResponse.json({ message: 'Presupuesto no encontrado para actualizar' }, { status: 404 });
    }

    // Mantener datos originales que no se deberían sobreescribir desde el cliente
    const originalQuote = quotes[quoteIndex];
    const updatedQuote = {
      ...originalQuote,
      ...updatedQuoteData,
      id: originalQuote.id, // Asegurar que el ID no cambie
      numero: originalQuote.numero, // Asegurar que el número de presupuesto no cambie
      fechaModificacion: new Date().toISOString(), // Añadir fecha de modificación
    };

    quotes[quoteIndex] = updatedQuote;
    await writeData('presupuestos.json', quotes);

    return NextResponse.json(updatedQuote, { status: 200 });
  } catch (error) {
    console.error('Error al actualizar el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al actualizar los datos' }, { status: 500 });
  }
}

// DELETE: Eliminar un presupuesto
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const quotes = await readData('presupuestos.json');
    const filteredQuotes = quotes.filter(q => q.id !== id);

    if (quotes.length === filteredQuotes.length) {
      return NextResponse.json({ message: 'Presupuesto no encontrado para eliminar' }, { status: 404 });
    }

    await writeData('presupuestos.json', filteredQuotes);

    return NextResponse.json({ message: 'Presupuesto eliminado correctamente' }, { status: 200 });
  } catch (error) {
    console.error('Error al eliminar el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al eliminar los datos' }, { status: 500 });
  }
}
