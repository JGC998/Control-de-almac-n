

// src/app/api/proveedores/route.js
import { crearManejadoresCRUD } from '@/lib/manejadores-api';

const manejadores = crearManejadoresCRUD('proveedor', {
  findMany: {
    orderBy: { nombre: 'asc' },
  }
}, '/proveedores');

export const GET = manejadores.GET;
export const POST = manejadores.POST;
