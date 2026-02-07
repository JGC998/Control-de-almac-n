"use client";
import React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import Paginacion from './Paginacion';

export default function PaginacionServidor({ meta }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const alCambiarPagina = (nuevaPagina) => {
        const params = new URLSearchParams(searchParams);
        params.set('page', nuevaPagina.toString());
        router.push(`${pathname}?${params.toString()}`);
    };

    return (
        <Paginacion
            paginaActual={meta.page}
            totalPaginas={meta.totalPages}
            totalRegistros={meta.total}
            tamanioPagina={meta.limit}
            alCambiarPagina={alCambiarPagina}
        />
    );
}
