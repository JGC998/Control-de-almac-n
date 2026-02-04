"use client";
import React, { forwardRef } from 'react';

/**
 * Componente AreaTexto - Textarea reutilizable
 * 
 * @param {Object} props
 * @param {'xs'|'sm'|'md'|'lg'} size - Tamaño
 * @param {boolean} bordered - Con borde
 * @param {string} error - Mensaje de error
 * @param {number} filas - Número de filas visibles
 */

const sizeMap = {
    xs: 'textarea-xs',
    sm: 'textarea-sm',
    md: '',
    lg: 'textarea-lg',
};

const AreaTexto = forwardRef(function AreaTexto(
    {
        size = 'md',
        bordered = true,
        error = null,
        filas = 3,
        disabled = false,
        className = '',
        value,
        onChange,
        placeholder,
        name,
        id,
        required = false,
        maxLength,
        ...props
    },
    ref
) {
    const clases = [
        'textarea',
        bordered && 'textarea-bordered',
        sizeMap[size] || '',
        error && 'textarea-error',
        'w-full',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <textarea
            ref={ref}
            name={name}
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            rows={filas}
            maxLength={maxLength}
            className={clases}
            {...props}
        />
    );
});

export default AreaTexto;
