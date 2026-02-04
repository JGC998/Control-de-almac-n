"use client";
import React from 'react';
import { Trash2, Copy, Search, GripVertical } from 'lucide-react';
import Entrada from '../primitivos/Entrada';
import Boton from '../primitivos/Boton';

/**
 * Componente EditorItem - Fila de item para pedidos/presupuestos
 * 
 * Usado para editar líneas de items con:
 * - Descripción, cantidad, precio, peso
 * - Botones de acción (buscar, duplicar, eliminar)
 * 
 * @param {Object} props
 * @param {Object} item - Datos del item
 * @param {number} indice - Índice en el array
 * @param {function} alCambiar - Callback (indice, campo, valor)
 * @param {function} alEliminar - Callback (itemId)
 * @param {function} alDuplicar - Callback (itemId)
 * @param {function} alBuscarProducto - Callback (indice)
 * @param {Array<CampoDef>} campos - Configuración de campos a mostrar
 * @param {boolean} mostrarAcciones - Mostrar botones de acción
 * @param {boolean} esUltimo - Es el último item (no mostrar eliminar)
 * 
 * CampoDef = {
 *   clave: string,          // Nombre del campo
 *   etiqueta: string,       // Placeholder
 *   tipo: 'texto'|'numero', // Tipo de input
 *   ancho?: string,         // Clase CSS de ancho (ej: 'w-24')
 *   step?: string,          // Step para números
 *   min?: number,           // Mínimo para números
 * }
 */

const camposDefault = [
    { clave: 'descripcion', etiqueta: 'Descripción del producto', tipo: 'texto', ancho: 'flex-1' },
    { clave: 'quantity', etiqueta: 'Cant.', tipo: 'numero', ancho: 'w-20', min: 1 },
    { clave: 'unitPrice', etiqueta: 'Precio €', tipo: 'numero', ancho: 'w-28', step: '0.01', min: 0 },
    { clave: 'pesoUnitario', etiqueta: 'Peso kg', tipo: 'numero', ancho: 'w-24', step: '0.01', min: 0 },
];

export default function EditorItem({
    item,
    indice,
    alCambiar,
    alEliminar,
    alDuplicar = null,
    alBuscarProducto = null,
    campos = camposDefault,
    mostrarAcciones = true,
    esUltimo = false,
}) {
    const handleCambio = (campo, valor) => {
        alCambiar?.(indice, campo, valor);
    };

    // Calcular subtotal si tiene quantity y unitPrice
    const subtotal = item.quantity && item.unitPrice
        ? (Number(item.quantity) * Number(item.unitPrice)).toFixed(2)
        : null;

    return (
        <div className="flex items-center gap-2 p-2 bg-base-200 rounded-lg mb-2 group hover:bg-base-300 transition-colors">
            {/* Handle de arrastre (futuro) */}
            <div className="opacity-30 group-hover:opacity-60 cursor-grab">
                <GripVertical className="w-4 h-4" />
            </div>

            {/* Campos */}
            <div className="flex-1 flex flex-wrap gap-2 items-center">
                {campos.map((campo) => (
                    <div key={campo.clave} className={campo.ancho || 'flex-1'}>
                        <Entrada
                            tipo={campo.tipo || 'texto'}
                            placeholder={campo.etiqueta}
                            value={item[campo.clave] ?? ''}
                            onChange={(e) => handleCambio(campo.clave, e.target.value)}
                            step={campo.step}
                            min={campo.min}
                            size="sm"
                        />
                    </div>
                ))}

                {/* Subtotal (si aplica) */}
                {subtotal && (
                    <div className="w-24 text-right font-semibold text-primary">
                        {subtotal} €
                    </div>
                )}
            </div>

            {/* Acciones */}
            {mostrarAcciones && (
                <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                    {alBuscarProducto && (
                        <Boton
                            variant="fantasma"
                            size="xs"
                            icono={Search}
                            onClick={() => alBuscarProducto(indice)}
                            title="Buscar producto"
                        />
                    )}
                    {alDuplicar && (
                        <Boton
                            variant="fantasma"
                            size="xs"
                            icono={Copy}
                            onClick={() => alDuplicar(item.id)}
                            title="Duplicar"
                        />
                    )}
                    {alEliminar && !esUltimo && (
                        <Boton
                            variant="peligro"
                            size="xs"
                            icono={Trash2}
                            onClick={() => alEliminar(item.id)}
                            title="Eliminar"
                        />
                    )}
                </div>
            )}
        </div>
    );
}

// Componente para el header de la lista de items
export function EditorItemsHeader({ campos = camposDefault }) {
    return (
        <div className="flex items-center gap-2 px-2 py-1 text-sm font-medium text-base-content/70 border-b border-base-200 mb-2">
            <div className="w-4" /> {/* Espacio para grip */}
            <div className="flex-1 flex gap-2">
                {campos.map((campo) => (
                    <div key={campo.clave} className={campo.ancho || 'flex-1'}>
                        {campo.etiqueta}
                    </div>
                ))}
                <div className="w-24 text-right">Subtotal</div>
            </div>
            <div className="w-20" /> {/* Espacio para acciones */}
        </div>
    );
}
