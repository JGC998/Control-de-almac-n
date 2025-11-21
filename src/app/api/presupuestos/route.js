import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import { v4 as uuidv4 } from 'uuid';
// Se mantiene la importación de calculateTotalsBackend por si se usa en otra lógica, aunque se elimina su uso en POST.
import { calculateTotalsBackend } from '@/lib/pricing-utils';

/**
 * Genera el siguiente número secuencial para un presupuesto (ej. 2025-001)
 * Replicando la lógica de dataManager.js
 */
async function getNextPresupuestoNumber() {
  const year = new Date().getFullYear();
  const prefix = `${year}-`;

  const lastPresupuesto = await db.presupuesto.findFirst({
    where: { numero: { startsWith: prefix } },
    orderBy: { numero: 'desc' },
  });

  let nextNum = 1;
  if (lastPresupuesto) {
    const numberPart = lastPresupuesto.numero.split('-')[1];
    nextNum = parseInt(numberPart, 10) + 1;
  }
  
  return `${year}-${String(nextNum).padStart(3, '0')}`;
}

// GET /api/presupuestos - Obtiene todos los presupuestos
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const clientId = searchParams.get('clientId');

    const whereClause = {};
    if (clientId) {
      whereClause.clienteId = clientId;
    }

    const quotes = await db.presupuesto.findMany({
      where: whereClause,
      // Hacemos JOIN con la tabla de clientes para obtener el nombre
      include: {
        cliente: {
          select: { nombre: true }, // Solo traemos el nombre
        },
      },
      orderBy: { fechaCreacion: 'desc' },
    });
    
    return NextResponse.json(quotes);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: 'Error al obtener presupuestos' }, { status: 500 });
  }
}

// POST /api/presupuestos - Crea un nuevo presupuesto
export async function POST(request) {
  try {
    const data = await request.json();
    // FIX: Aceptamos 'notas', 'observaciones' o 'notes' para máxima compatibilidad.
    const { clienteId, items, estado, marginId, subtotal, tax, total, notes, notas, observaciones } = data; 
    const finalNotes = notes || notas || observaciones || null; // Coalesce para obtener el valor correcto

    if (!clienteId || !items || items.length === 0) {
      return NextResponse.json({ message: 'Datos incompletos. Se requiere clienteId y al menos un item.' }, { status: 400 });
    }

    // VALIDACIÓN DE TIPOS NUMÉRICOS
    for (const item of items) {
      if (typeof item.quantity !== 'number' || typeof item.unitPrice !== 'number') {
        return NextResponse.json({ message: `El item "${item.description}" tiene valores no numéricos para cantidad o precio.` }, { status: 400 });
      }
    }

    const newQuoteNumber = await getNextPresupuestoNumber();

    const newQuote = await db.presupuesto.create({
      data: {
        id: uuidv4(), 
        numero: newQuoteNumber,
        fechaCreacion: new Date().toISOString(),
        estado: estado || 'Borrador',
        
        cliente: { connect: { id: clienteId } },
        marginId: marginId,
        
        notas: finalNotes, // Usamos el valor coalesced
        subtotal: subtotal,
        tax: tax,
        total: total,
        
        items: {
          create: items.map(item => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productoId: item.productId,
            pesoUnitario: item.pesoUnitario,
          })),
        },
      },
    });

    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error('Error al crear el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al guardar el nuevo presupuesto.' }, { status: 500 });
  }
}