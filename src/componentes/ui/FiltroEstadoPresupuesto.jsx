"use client";
import React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function FiltroEstadoPresupuesto() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const estadoActual = searchParams?.get('estado') || '';

    const handleEstadoChange = (e) => {
        const nuevoEstado = e.target.value;
        const params = new URLSearchParams(searchParams?.toString());

        if (nuevoEstado) {
            params.set('estado', nuevoEstado);
        } else {
            params.delete('estado');
        }

        // Reset to page 1 when filtering
        params.set('page', '1');

        router.push(`?${params.toString()}`);
    };

    return (
        <select
            className="select select-bordered select-sm w-full max-w-xs"
            value={estadoActual}
            onChange={handleEstadoChange}
        >
            <option value="">Todos los estados</option>
            <option value="Borrador">Borrador</option>
            <option value="Aceptado">Aceptado</option>
            <option value="Rechazado">Rechazado</option>
        </select>
    );
}
