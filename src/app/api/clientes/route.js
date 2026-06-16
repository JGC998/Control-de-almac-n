

// src/app/api/clientes/route.js
import { crearManejadoresCRUD } from '@/lib/manejadores-api';
import { clienteSchema } from '@/lib/validations';

const manejadores = crearManejadoresCRUD('cliente', {
  zodSchema: clienteSchema,
  mapearCrear: (data) => ({
    nombre: data.nombre,
    email: data.email,
    direccion: data.direccion,
    telefono: data.telefono,
    tier: ['FABRICANTE', 'INTERMEDIARIO', 'FINAL'].includes(data.categoria) ? data.categoria : null,
    nif: data.nif ?? null,
  }),
  camposBusqueda: ['nombre', 'email', 'telefono'],
}, '/gestion/clientes');

export const GET = manejadores.GET;
export const POST = manejadores.POST;
