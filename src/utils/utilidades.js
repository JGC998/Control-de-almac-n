import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { logApiError } from '@/lib/logger';

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
    logApiError(error, 'manejarErrorApi:validation');
    return NextResponse.json({ error: "Datos de entrada inválidos." }, { status: 400 });
  }
  if (error.code === 'P2002') {
    return NextResponse.json({ error: "El registro ya existe (valor único duplicado)." }, { status: 409 });
  }
  if (error.code === 'P2025') {
    return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  }

  logApiError(error, 'manejarErrorApi:unhandled');
  return NextResponse.json({ error: "Error interno del servidor." }, { status: 500 });
};