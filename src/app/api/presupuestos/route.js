import { NextResponse } from 'next/server';
import { db } from '@/lib/db'; 
import { v4 as uuidv4 } from 'uuid';
import { revalidatePath } from 'next/cache';
// Se mantiene la importación de calculateTotalsBackend por si se usa en otra lógica, aunque se elimina su uso en POST.
import { calculateTotalsBackend } from '@/lib/pricing-utils';



/**
 * Genera el siguiente número secuencial para un presupuesto (ej. 2025-001)
 * de forma concurrente y segura para MySQL.
 */
async function getNextPresupuestoNumber() {
  const sequenceName = 'presupuesto';

  try {
    // Usamos una transacción para garantizar que la lectura, incremento y escritura
    // de la secuencia sean una operación atómica, evitando race conditions.
    const newNumber = await db.$transaction(async (tx) => {
      // 1. Obtener el registro de la secuencia.
      const sequence = await tx.sequence.findUnique({
        where: { name: sequenceName },
      });

      if (!sequence) {
        // Fallback: si la secuencia no existe, la creamos y empezamos en 1.
        // Esto hace que el seeder no sea estrictamente necesario, pero es una buena práctica tenerlo.
        await tx.sequence.create({
          data: { name: sequenceName, value: 1 },
        });
        return 1;
      }

      // 2. Incrementar el valor.
      const nextValue = sequence.value + 1;

      // 3. Actualizar el valor en la base de datos.
      await tx.sequence.update({
        where: { name: sequenceName },
        data: { value: nextValue },
      });

      return nextValue;
    });

    const year = new Date().getFullYear();
    // NOTA: El número de presupuesto se reinicia cada año? Si no, se puede quitar el año.
    // Por ahora, se mantiene la lógica original.
    const prefix = `${year}-`; 
    const nextNumberPadded = String(newNumber).padStart(3, '0');

    return `${prefix}${nextNumberPadded}`;
  } catch (error) {
    console.error('Error al generar el número de presupuesto:', error);
    // Lanzamos el error para que el endpoint que llama lo capture y devuelva una respuesta 500.
    throw new Error('No se pudo generar el número de presupuesto.');
  }
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
        return NextResponse.json({ message: `El item "${item.descripcion}" tiene valores no numéricos para cantidad o precio.` }, { status: 400 });
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
            descripcion: item.descripcion,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            productoId: item.productoId,
            pesoUnitario: item.pesoUnitario,
          })),
        },
      },
    });

    revalidatePath('/presupuestos'); // Invalidate cache for the list page
    return NextResponse.json(newQuote, { status: 201 });
  } catch (error) {
    console.error('Error al crear el presupuesto:', error);
    return NextResponse.json({ message: 'Error interno al guardar el nuevo presupuesto.' }, { status: 500 });
  }
}