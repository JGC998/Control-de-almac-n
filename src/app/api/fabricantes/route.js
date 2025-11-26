

// src/app/api/fabricantes/route.js
import { crearManejadoresCRUD } from '@/lib/manejadores-api';

const manejadores = crearManejadoresCRUD('fabricante', {
  findMany: {
    orderBy: { nombre: 'asc' },
  }
}, '/configuracion');

export const GET = manejadores.GET;
export const POST = manejadores.POST;