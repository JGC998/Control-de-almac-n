"use client";
import React, { forwardRef } from 'react';

/**
 * Componente Selector - Select/dropdown reutilizable
 * 
 * @param {Object} props
 * @param {Array<{valor: string, etiqueta: string}>} opciones - Lista de opciones
 * @param {string} placeholder - Texto placeholder (primera opción vacía)
 * @param {'xs'|'sm'|'md'|'lg'} size - Tamaño
 * @param {boolean} bordered - Con borde
 * @param {string} error - Mensaje de error
 */

const sizeMap = {
    xs: 'select-xs',
    sm: 'select-sm',
    md: '',
    lg: 'select-lg',
};

const Selector = forwardRef(function Selector(
    {
        opciones = [],
        placeholder = 'Selecciona una opción...',
        size = 'md',
        bordered = true,
        error = null,
        disabled = false,
        className = '',
        value,
        onChange,
        name,
        id,
        required = false,
        ...props
    },
    ref
) {
    const clases = [
        'select',
        bordered && 'select-bordered',
        sizeMap[size] || '',
        error && 'select-error',
        'w-full',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <select
            ref={ref}
            name={name}
            id={id}
            value={value}
            onChange={onChange}
            disabled={disabled}
            required={required}
            className={clases}
            {...props}
        >
            {placeholder && (
                <option value="" disabled={required}>
                    {placeholder}
                </option>
            )}
            {opciones.map((opcion) => (
                <option
                    key={opcion.valor ?? opcion.value ?? opcion.id}
                    value={opcion.valor ?? opcion.value ?? opcion.id}
                >
                    {opcion.etiqueta ?? opcion.label ?? opcion.nombre ?? opcion.name}
                </option>
            ))}
        </select>
    );
});

export default Selector;
