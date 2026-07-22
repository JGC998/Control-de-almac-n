

// src/app/api/fabricantes/route.js
import { crearManejadoresCRUD } from '@/lib/manejadores-api';
import { fabricanteSchema } from '@/lib/validations';

const manejadores = crearManejadoresCRUD('fabricante', {
  findMany: {
    orderBy: { nombre: 'asc' },
  },
  zodSchema: fabricanteSchema,
  mapearCrear: (data) => ({ ...data, nombre: data.nombre.trim().toUpperCase() }),
}, '/configuracion');

export const GET = manejadores.GET;
export const POST = manejadores.POST;