"use client";
import { Link2 } from 'lucide-react';
import { PaginaGestion } from '@/componentes/patrones';

const columnas = [
  { clave: 'nombre',      etiqueta: 'Nombre' },
  { clave: 'fabricante',  etiqueta: 'Fabricante' },
  { clave: 'descripcion', etiqueta: 'Descripción' },
  { clave: 'precioMetro', etiqueta: '€/metro', formato: 'moneda' },
];

const campos = [
  { clave: 'nombre',      etiqueta: 'Nombre',       tipo: 'texto',   requerido: true, placeholder: 'Ej: Flexco R2 1/2"' },
  { clave: 'fabricante',  etiqueta: 'Fabricante',   tipo: 'texto',   placeholder: 'Ej: Flexco, MLT, Alligator' },
  { clave: 'descripcion', etiqueta: 'Descripción',  tipo: 'textarea', placeholder: 'Características, aplicaciones...' },
  { clave: 'precioMetro', etiqueta: 'Precio (€/m)', tipo: 'numero',  requerido: true, placeholder: '0.00' },
];

const camposIniciales = { nombre: '', fabricante: '', descripcion: '', precioMetro: '' };

export default function GrapasPage() {
  return (
    <PaginaGestion
      titulo="Grapas"
      icono={Link2}
      recursoApi="/api/grapas"
      columnas={columnas}
      campos={campos}
      camposIniciales={camposIniciales}
      tituloNuevo="Nueva grapa"
      tituloEditar="Editar grapa"
      transformarParaEnviar={data => ({
        ...data,
        precioMetro: parseFloat(data.precioMetro) || 0,
      })}
    />
  );
}
