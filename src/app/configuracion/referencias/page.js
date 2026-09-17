"use client";
import { PaginaGestion } from '@/componentes/patrones';
import { Link2 } from 'lucide-react';

const columnas = [
  { clave: 'referencia',          etiqueta: 'Referencia' },
  { clave: 'ancho',               etiqueta: 'Ancho (mm)' },
  { clave: 'lonas',               etiqueta: 'Lonas' },
  { clave: 'pesoPorMetroLineal',  etiqueta: 'Peso (kg/m)' },
];

const campos = [
  { clave: 'referencia',          etiqueta: 'Referencia / Código', requerido: true, placeholder: 'Ej: EP315/3' },
  { clave: 'ancho',               etiqueta: 'Ancho (mm)',         tipo: 'numero', requerido: true, placeholder: 'Ej: 1000', min: 1, step: '1' },
  { clave: 'lonas',               etiqueta: 'Nº de lonas',        tipo: 'numero', requerido: false, placeholder: 'Ej: 3', min: 1, step: '1' },
  { clave: 'pesoPorMetroLineal',  etiqueta: 'Peso (kg/m lineal)', tipo: 'numero', requerido: false, placeholder: 'Ej: 4.2', min: 0, step: '0.001' },
];

export default function ReferenciasPage() {
  return (
    <PaginaGestion
      titulo="Referencias de bobina"
      icono={Link2}
      recursoApi="/api/configuracion/referencias"
      columnas={columnas}
      campos={campos}
      tituloNuevo="Nueva referencia"
      tituloEditar="Editar referencia"
    />
  );
}
