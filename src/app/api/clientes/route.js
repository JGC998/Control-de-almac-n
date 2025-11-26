

// src/app/api/clientes/route.js
import { crearManejadoresCRUD } from '@/lib/manejadores-api';

const manejadores = crearManejadoresCRUD('cliente', {
  // Opción para mapear datos en la creación
  mapearCrear: (data) => ({
    nombre: data.nombre,
    email: data.email,
    direccion: data.direccion,
    telefono: data.telefono,
    tier: data.categoria, // Mapea 'categoria' del frontend a 'tier' del modelo
  }),
}, '/gestion/clientes');

export const GET = manejadores.GET;
export const POST = manejadores.POST;
