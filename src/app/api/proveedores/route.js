

// src/app/api/proveedores/route.js
import { crearManejadoresCRUD } from '@/lib/manejadores-api';
import { proveedorSchema } from '@/lib/validations';

const manejadores = crearManejadoresCRUD('proveedor', {
  findMany: {
    orderBy: { nombre: 'asc' },
  },
  zodSchema: proveedorSchema,
}, '/proveedores');

export const GET = manejadores.GET;
export const POST = manejadores.POST;
