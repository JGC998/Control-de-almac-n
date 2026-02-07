"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function FiltroBusqueda({ valorInicial = '', alBuscar, placeholder = 'Buscar...' }) {
    const [valor, setValor] = useState(valorInicial);
    const timeoutRef = useRef(null);

    const handleChange = (e) => {
        const nuevoValor = e.target.value;
        setValor(nuevoValor);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            alBuscar(nuevoValor);
        }, 500); // Debounce de 500ms
    };

    const limpiar = () => {
        setValor('');
        alBuscar('');
    };

    return (
        <div className="form-control w-full max-w-xs">
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder}
                    className="input input-bordered w-full pr-10"
                    value={valor}
                    onChange={handleChange}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {valor ? (
                        <button onClick={limpiar} className="btn btn-ghost btn-xs btn-circle">
                            <X className="w-4 h-4 text-gray-500" />
                        </button>
                    ) : (
                        <Search className="w-4 h-4 text-gray-500" />
                    )}
                </div>
            </div>
        </div>
    );
}
