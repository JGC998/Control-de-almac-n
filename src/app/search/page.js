'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

function SearchResults() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const query = searchParams.get('q');

    const [results, setResults] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (query) {
            setLoading(true);
            setError(null);
            fetch(`/api/search?q=${encodeURIComponent(query)}`)
                .then(res => {
                    if (!res.ok) throw new Error('Error al realizar la búsqueda.');
                    return res.json();
                })
                .then(data => {
                    setResults(data);
                })
                .catch(err => {
                    setError(err.message);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setResults({});
        }
    }, [query]);

    const renderResultItem = (item, category) => {
        // Special rendering for 'pedidos' to link to the detail page
        if (category === 'pedidos') {
            return (
                <Link href={`/pedidos/${item.id}`} className="card-body">
                    <h3 className="card-title">Pedido ID: {item.id}</h3>
                    <p>Cliente: {item.cliente}</p>
                    <p>Fecha: {new Date(item.fecha).toLocaleDateString('es-ES')}</p>
                </Link>
            );
        }

        // Generic rendering for other categories
        return (
            <div className="card-body">
                <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(item, null, 2)}</pre>
            </div>
        );
    };

    return (
        <main className="p-4 sm:p-6 md:p-8">
            <div className="max-w-4xl mx-auto">
                <button onClick={() => router.back()} className="btn btn-ghost mb-4">Volver</button>
                <h1 className="text-3xl font-bold mb-6">Resultados de la Búsqueda para: <span className="text-primary">"{query}"</span></h1>

                {loading && <span className="loading loading-spinner loading-lg"></span>}
                {error && <p className="text-error">{error}</p>}

                {!loading && !error && Object.keys(results).length === 0 && (
                    <p>No se encontraron resultados.</p>
                )}

                <div className="space-y-6">
                    {Object.entries(results).map(([category, items]) => (
                        <div key={category}>
                            <h2 className="text-2xl font-bold mb-4 capitalize border-b-2 border-primary pb-2">Resultados en {category}</h2>
                            <div className="space-y-4">
                                {items.map((item, index) => (
                                    <div key={`${category}-${item.id || index}`} className="card bg-base-100 shadow-md hover:shadow-lg transition-shadow">
                                        {renderResultItem(item, category)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}

// Use Suspense to handle client-side rendering of search params
export default function SearchPage() {
    return (
        <Suspense fallback={<div className="p-8 flex justify-center items-center"><span className="loading loading-spinner loading-lg"></span></div>}>
            <SearchResults />
        </Suspense>
    );
}
