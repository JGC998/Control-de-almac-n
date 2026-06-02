"use client";
import { AlignJustify } from 'lucide-react';
import { PaginaGestion } from '@/componentes/patrones';

const TIPOS = [
  { valor: 'RECTO',     etiqueta: 'Recto' },
  { valor: 'INCLINADO', etiqueta: 'Inclinado' },
];

const columnas = [
  { clave: 'tipo',        etiqueta: 'Tipo', render: r => TIPOS.find(t => t.valor === r.tipo)?.etiqueta ?? r.tipo },
  { clave: 'altura',      etiqueta: 'Altura (mm)' },
  { clave: 'precioMetro', etiqueta: '€/metro', formato: 'moneda' },
  {
    clave: 'activo',
    etiqueta: 'Estado',
    formato: 'insignia',
    insigniaConfig: { true: 'success', false: 'ghost' },
    render: r => (r.activo === true || r.activo === 'true') ? 'Activo' : 'Inactivo',
  },
];

const campos = [
  {
    clave: 'tipo',
    etiqueta: 'Tipo',
    tipo: 'selector',
    requerido: true,
    opciones: TIPOS.map(t => ({ valor: t.valor, etiqueta: t.etiqueta })),
  },
  {
    clave: 'altura',
    etiqueta: 'Altura (mm)',
    tipo: 'numero',
    requerido: true,
    placeholder: 'Ej: 10, 20, 40...',
    min: 1,
    step: '1',
  },
  {
    clave: 'precioMetro',
    etiqueta: 'Precio (€/metro)',
    tipo: 'numero',
    requerido: true,
    placeholder: '0.00',
    min: 0,
    step: '0.01',
  },
];

const camposIniciales = { tipo: 'RECTO', altura: '', precioMetro: '' };

export default function TacosPage() {
  return (
    <PaginaGestion
      titulo="Tacos"
      icono={AlignJustify}
      recursoApi="/api/tacos"
      columnas={columnas}
      campos={campos}
      camposIniciales={camposIniciales}
      tituloNuevo="Nuevo taco"
      tituloEditar="Editar taco"
      transformarParaEnviar={data => ({
        ...data,
        altura: parseInt(data.altura) || 0,
        precioMetro: parseFloat(data.precioMetro) || 0,
      })}
    />
  );
}
