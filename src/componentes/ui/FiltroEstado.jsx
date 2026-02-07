"use client";
import { useRouter, useSearchParams } from 'next/navigation';

export default function FiltroEstado() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const estadoActual = searchParams.get('estado') || '';

    const handleChange = (e) => {
        const nuevoEstado = e.target.value;
        const params = new URLSearchParams(searchParams);

        if (nuevoEstado) {
            params.set('estado', nuevoEstado);
        } else {
            params.delete('estado');
        }

        // Reset page to 1 when filter changes
        params.set('page', '1');

        router.push(`?${params.toString()}`);
    };

    return (
        <select
            className="select select-bordered w-full max-w-xs"
            value={estadoActual}
            onChange={handleChange}
        >
            <option value="">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Completado">Completado</option>
            <option value="Enviado">Enviado</option>
            <option value="Cancelado">Cancelado</option>
        </select>
    );
}
