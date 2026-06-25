"use client";
import { useRouter, useSearchParams } from 'next/navigation';

export default function FiltroEstado() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const estadoActual = searchParams.get('estado') || '';

    const handleChange = (e) => {
        const nuevoEstado = e.target.value;
        const params = new URLSearchParams(searchParams);
        params.set('estado', nuevoEstado);
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    };

    return (
        <select
            className="select select-bordered w-full max-w-xs"
            value={estadoActual || 'Pendiente'}
            onChange={handleChange}
        >
            <option value="todos">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Facturado">Facturado</option>
            <option value="Cancelado">Cancelado</option>
        </select>
    );
}
