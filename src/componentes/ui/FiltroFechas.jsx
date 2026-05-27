"use client";
import { useRouter, useSearchParams } from 'next/navigation';

export default function FiltroFechas() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const desde = searchParams.get('desde') || '';
    const hasta = searchParams.get('hasta') || '';

    const actualizar = (clave, valor) => {
        const params = new URLSearchParams(searchParams);
        if (valor) {
            params.set(clave, valor);
        } else {
            params.delete(clave);
        }
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    };

    const limpiar = () => {
        const params = new URLSearchParams(searchParams);
        params.delete('desde');
        params.delete('hasta');
        params.set('page', '1');
        router.push(`?${params.toString()}`);
    };

    const hayFiltro = desde || hasta;

    return (
        <div className="flex items-center gap-2">
            <input
                type="date"
                className="input input-bordered input-sm"
                value={desde}
                onChange={e => actualizar('desde', e.target.value)}
                title="Desde"
            />
            <span className="text-base-content/40 text-sm">—</span>
            <input
                type="date"
                className="input input-bordered input-sm"
                value={hasta}
                onChange={e => actualizar('hasta', e.target.value)}
                title="Hasta"
            />
            {hayFiltro && (
                <button onClick={limpiar} className="btn btn-ghost btn-sm btn-square" title="Limpiar fechas">
                    ✕
                </button>
            )}
        </div>
    );
}
