"use client";
import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

export default function FiltroBusqueda({ placeholder = 'Buscar...', param = 'busqueda' }) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [valor, setValor] = useState(searchParams.get(param) || '');
    const timeoutRef = useRef(null);

    useEffect(() => {
        setValor(searchParams.get(param) || '');
    }, [searchParams, param]);

    const aplicar = (texto) => {
        const params = new URLSearchParams(searchParams);
        if (texto) {
            params.set(param, texto);
        } else {
            params.delete(param);
        }
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    };

    useEffect(() => {
        return () => clearTimeout(timeoutRef.current);
    }, []);

    const handleChange = (e) => {
        const v = e.target.value;
        setValor(v);
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => aplicar(v), 400);
    };

    const limpiar = () => {
        setValor('');
        aplicar('');
    };

    return (
        <div className="form-control w-full">
            <div className="relative">
                <input
                    type="text"
                    placeholder={placeholder}
                    aria-label={placeholder}
                    className="input input-bordered w-full pr-10"
                    value={valor}
                    onChange={handleChange}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {valor ? (
                        <button onClick={limpiar} className="btn btn-ghost btn-xs btn-circle">
                            <X className="w-4 h-4 text-base-content/50" />
                        </button>
                    ) : (
                        <Search className="w-4 h-4 text-base-content/50" />
                    )}
                </div>
            </div>
        </div>
    );
}
