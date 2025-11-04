"use client";
import { useSearchParams, notFound } from 'next/navigation';
import useSWR from 'swr';
import Link from 'next/link';
import { User, Package, FileText } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

const ResultItem = ({ item }) => {
  let icon, title, path;
  
  switch(item.type) {
    case 'cliente':
      icon = <User className="w-5 h-5 text-blue-500" />;
      title = item.nombre;
      path = `/gestion/clientes/${item.id}`;
      break;
    case 'producto':
      icon = <Package className="w-5 h-5 text-green-500" />;
      title = item.nombre;
      path = `/gestion/productos`; // Los productos no tienen página de detalle aún
      break;
    case 'pedido':
      icon = <Package className="w-5 h-5 text-purple-500" />;
      title = item.numero;
      path = `/pedidos/${item.id}`;
      break;
    case 'presupuesto':
      icon = <FileText className="w-5 h-5 text-yellow-500" />;
      title = item.numero;
      path = `/presupuestos/${item.id}`;
      break;
    default:
      return null;
  }

  return (
    <li className="mb-2">
      <Link href={path} className="flex items-center p-3 bg-base-100 hover:bg-base-200 rounded-lg shadow">
        {icon}
        <span className="ml-3 font-medium">{title}</span>
        <span className="ml-auto badge badge-outline">{item.type}</span>
      </Link>
    </li>
  );
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q');

  const { data: results, error, isLoading } = useSWR(query ? `/api/search?q=${encodeURIComponent(query)}` : null, fetcher);

  if (!query) {
    return notFound();
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">
        Resultados de búsqueda para: <span className="text-primary">"{query}"</span>
      </h1>

      {isLoading && <div className="flex justify-center items-center h-64"><span className="loading loading-spinner loading-lg"></span></div>}
      {error && <div className="alert alert-error">Error al realizar la búsqueda.</div>}
      
      {results && (
        <div>
          {results.length === 0 ? (
            <p className="text-center text-gray-500">No se encontraron resultados.</p>
          ) : (
            <ul className="max-w-2xl mx-auto">
              {results.map((item) => (
                <ResultItem key={`${item.type}-${item.id}`} item={item} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
