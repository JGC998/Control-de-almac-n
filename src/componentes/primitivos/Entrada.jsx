"use client";
import React, { forwardRef } from 'react';

/**
 * Componente Entrada - Input reutilizable con estilos DaisyUI
 * 
 * @param {Object} props
 * @param {'texto'|'numero'|'email'|'password'|'busqueda'|'telefono'|'url'} tipo - Tipo de input
 * @param {'xs'|'sm'|'md'|'lg'} size - Tamaño del input
 * @param {string} error - Mensaje de error (cambia estilos)
 * @param {React.ReactNode} iconoIzquierda - Icono al inicio
 * @param {React.ReactNode} iconoDerecha - Icono al final
 * @param {boolean} bordered - Con borde
 * @param {string} className - Clases CSS adicionales
 */

const tipoMap = {
    texto: 'text',
    numero: 'number',
    email: 'email',
    password: 'password',
    busqueda: 'search',
    telefono: 'tel',
    url: 'url',
};

const sizeMap = {
    xs: 'input-xs',
    sm: 'input-sm',
    md: '',
    lg: 'input-lg',
};

const Entrada = forwardRef(function Entrada(
    {
        tipo = 'texto',
        size = 'md',
        error = null,
        iconoIzquierda: IconoIzquierda = null,
        iconoDerecha: IconoDerecha = null,
        bordered = true,
        disabled = false,
        className = '',
        value,
        onChange,
        placeholder,
        name,
        id,
        required = false,
        step,
        min,
        max,
        autoComplete,
        ...props
    },
    ref
) {
    const tipoHTML = tipoMap[tipo] || tipo;

    const clases = [
        'input',
        bordered && 'input-bordered',
        sizeMap[size] || '',
        error && 'input-error',
        'w-full',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    const inputElement = (
        <input
            ref={ref}
            type={tipoHTML}
            name={name}
            id={id}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            step={step}
            min={min}
            max={max}
            autoComplete={autoComplete}
            className={clases}
            {...props}
        />
    );

    // Si tiene iconos, envolver en label con iconos
    if (IconoIzquierda || IconoDerecha) {
        return (
            <label className="input input-bordered flex items-center gap-2">
                {IconoIzquierda && <IconoIzquierda className="w-4 h-4 opacity-70" />}
                <input
                    ref={ref}
                    type={tipoHTML}
                    name={name}
                    id={id}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    required={required}
                    step={step}
                    min={min}
                    max={max}
                    autoComplete={autoComplete}
                    className="grow"
                    {...props}
                />
                {IconoDerecha && <IconoDerecha className="w-4 h-4 opacity-70" />}
            </label>
        );
    }

    return inputElement;
});

export default Entrada;

// Exportaciones específicas
export const EntradaNumero = (props) => <Entrada tipo="numero" {...props} />;
export const EntradaBusqueda = (props) => <Entrada tipo="busqueda" {...props} />;
export const EntradaEmail = (props) => <Entrada tipo="email" {...props} />;
export const EntradaPassword = (props) => <Entrada tipo="password" {...props} />;
