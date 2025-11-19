import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';

// Formatea un número como moneda (Euros en este caso)
export function formatCurrency(amount) {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Formatea un número como peso (kilogramos)
export function formatWeight(amount) {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'unit',
    unit: 'kilogram',
    unitDisplay: 'short',
  }).format(amount);
}

export const manejarErrorApi = (error) => {
  // 400 Bad Request: Errores de validación de datos (p. ej., campos requeridos faltantes)
  if (error instanceof Prisma.PrismaClientValidationError) {
    console.error("Validation Error:", error.message);
    return NextResponse.json({ error: "Datos de entrada inválidos." }, { status: 400 });
  }
  // 409 Conflict: Duplicados (p. ej., Unique Constraint)
  if (error.code === 'P2002') { 
    return NextResponse.json({ error: "El registro ya existe (valor único duplicado)." }, { status: 409 });
  }
  // 404 Not Found (ej. intentar actualizar un registro inexistente)
  if (error.code === 'P2025') {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  // 500 Internal Server Error (otros errores no controlados)
  console.error("Unhandled API Error:", error);
  return NextResponse.json({ error: "Error interno del servidor. Consulte logs." }, { status: 500 });
};