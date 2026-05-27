"use client";
import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

export default function FiltroBusquedaSimple({ valorInicial = '', alBuscar, placeholder = 'Buscar...' }) {
    const [valor, setValor] = useState(valorInicial);
    const timeoutRef = useRef(null);

    useEffect(() => {
        setValor(valorInicial);
    }, [valorInicial]);

    const handleChange = (e) => {
        const v = e.target.value;
        setValor(v);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => alBuscar?.(v), 400);
    };

    const limpiar = () => {
        setValor('');
        alBuscar?.('');
    };

    return (
        <div className="form-control w-full">
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
