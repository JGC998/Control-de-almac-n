'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function GuiaDetailPage() {
  const { id } = useParams();
  const [guia, setGuia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;

    async function fetchGuia() {
      try {
        const response = await fetch('/api/guias');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const guias = await response.json();
        const foundGuia = guias.find((g) => g.id === id);
        if (foundGuia) {
          setGuia(foundGuia);
        } else {
          setError('Guía no encontrada');
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchGuia();
  }, [id]);

  if (loading) {
    return <div className="container mx-auto p-4 text-center">Cargando guía...</div>;
  }

  if (error) {
    return <div className="container mx-auto p-4 text-center text-error">Error: {error}</div>;
  }

  if (!guia) {
    return <div className="container mx-auto p-4 text-center">Guía no encontrada.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <Link href="/guias" className="btn btn-ghost mb-4">← Volver a Guías</Link>
      <div className="card bg-base-100 shadow-xl p-6">
        <h1 className="text-4xl font-bold mb-4">{guia.title}</h1>
        <p className="text-sm text-gray-500 mb-6">Categoría: {guia.category}</p>
        <div
          className="prose max-w-none mb-8"
          dangerouslySetInnerHTML={{ __html: guia.htmlContent }}
        />

        {guia.attachments && guia.attachments.length > 0 && (
          <div className="mt-6">
            <h2 className="text-2xl font-semibold mb-3">Archivos Adjuntos</h2>
            <ul className="list-disc list-inside">
              {guia.attachments.map((attachment, index) => (
                <li key={index}>
                  <a
                    href={attachment}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link link-primary"
                  >
                    {attachment.split('/').pop()} {/* Display file name */}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
