"use client";
import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Paginacion({
    paginaActual,
    totalPaginas,
    alCambiarPagina,
    totalRegistros,
    tamanioPagina
}) {
    if (totalPaginas <= 1) return null;

    // Calcular rango de registros mostrados
    const inicio = (paginaActual - 1) * tamanioPagina + 1;
    const fin = Math.min(paginaActual * tamanioPagina, totalRegistros);

    // Generar array de páginas a mostrar (máximo 5)
    let paginas = [];
    if (totalPaginas <= 5) {
        paginas = Array.from({ length: totalPaginas }, (_, i) => i + 1);
    } else {
        if (paginaActual <= 3) {
            paginas = [1, 2, 3, 4, 5];
        } else if (paginaActual >= totalPaginas - 2) {
            paginas = [totalPaginas - 4, totalPaginas - 3, totalPaginas - 2, totalPaginas - 1, totalPaginas];
        } else {
            paginas = [paginaActual - 2, paginaActual - 1, paginaActual, paginaActual + 1, paginaActual + 2];
        }
    }

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-4 text-sm">
            <div className="text-base-content/70">
                Mostrando <span className="font-semibold">{inicio}-{fin}</span> de <span className="font-semibold">{totalRegistros}</span> resultados
            </div>

            <div className="join">
                <button
                    className="join-item btn btn-sm"
                    disabled={paginaActual === 1}
                    onClick={() => alCambiarPagina(1)}
                    title="Primera página"
                >
                    <ChevronsLeft className="w-4 h-4" />
                </button>
                <button
                    className="join-item btn btn-sm"
                    disabled={paginaActual === 1}
                    onClick={() => alCambiarPagina(paginaActual - 1)}
                    title="Anterior"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {paginas.map(p => (
                    <button
                        key={p}
                        className={`join-item btn btn-sm ${paginaActual === p ? 'btn-active btn-primary' : ''}`}
                        onClick={() => alCambiarPagina(p)}
                    >
                        {p}
                    </button>
                ))}

                <button
                    className="join-item btn btn-sm"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => alCambiarPagina(paginaActual + 1)}
                    title="Siguiente"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button
                    className="join-item btn btn-sm"
                    disabled={paginaActual === totalPaginas}
                    onClick={() => alCambiarPagina(totalPaginas)}
                    title="Última página"
                >
                    <ChevronsRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
