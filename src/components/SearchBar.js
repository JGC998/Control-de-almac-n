"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Package, FileText } from 'lucide-react';
import useSWR from 'swr'; // Importar SWR para la búsqueda en tiempo real
import Link from 'next/link';

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente para renderizar un solo resultado
const ResultItem = ({ item, onClick }) => {
  let icon, typeText, path;
  
  switch(item.type) {
    case 'cliente':
      icon = <User className="w-4 h-4 text-blue-500" />;
      typeText = 'Cliente';
      path = `/gestion/clientes/${item.id}`;
      break;
    case 'producto':
      icon = <Package className="w-4 h-4 text-green-500" />;
      typeText = 'Producto';
      path = `/gestion/productos`;
      break;
    case 'pedido':
      icon = <Package className="w-4 h-4 text-purple-500" />;
      typeText = `Pedido ${item.numero}`;
      path = `/pedidos/${item.id}`;
      break;
    case 'presupuesto':
      icon = <FileText className="w-4 h-4 text-yellow-500" />;
      typeText = `Presupuesto ${item.numero}`;
      path = `/presupuestos/${item.id}`;
      break;
    default:
      return null;
  }

  return (
    <li>
      <Link href={path} onClick={onClick} className="flex items-center justify-between p-2 hover:bg-base-200">
        <div className="flex items-center">
          {icon}
          <span className="ml-2 font-medium">{item.nombre || item.numero}</span>
        </div>
        <span className="badge badge-sm badge-outline">{typeText}</span>
      </Link>
    </li>
  );
};


export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef(null);

  // Llamada a la API de búsqueda: solo si la consulta tiene al menos 2 caracteres
  const queryUrl = query.trim().length >= 2 ? `/api/search?q=${encodeURIComponent(query)}` : null;
  const { data: results, isLoading } = useSWR(queryUrl, fetcher, {
      revalidateOnFocus: false,
      dedupingInterval: 500, // Prevenir llamadas repetidas
      shouldRetryOnError: false
  });
  
  // Abrir/cerrar dropdown basado en la consulta y los resultados
  useEffect(() => {
    setIsDropdownOpen(query.trim().length >= 2 && !!results && results.length > 0);
  }, [query, results]);
  
  // Cerrar el dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setIsDropdownOpen(false); // Cerrar dropdown al enviar
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };
  
  const handleItemClick = () => {
    setIsDropdownOpen(false); // Cerrar dropdown al hacer clic en un resultado
  };

  return (
    // Utilizamos el patrón 'dropdown' de DaisyUI
    <form onSubmit={handleSearchSubmit} className="dropdown dropdown-bottom dropdown-end w-full" ref={dropdownRef}>
      <div className="form-control w-full">
        <div className="input-group w-full">
          <input
            type="text"
            placeholder="Buscar cliente, pedido..."
            className="input input-bordered w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            // 'tabIndex' es necesario para que el div se comporte como el botón del dropdown
            tabIndex={0} 
          />
          <button type="submit" className="btn btn-square btn-primary">
            <Search />
          </button>
        </div>
      </div>
      
      {/* Contenido del Dropdown (Resultados) */}
      {isDropdownOpen && (
        <ul tabIndex={0} className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-full max-w-md mt-1">
          {isLoading ? (
            <div className="p-4 text-center">
              <span className="loading loading-spinner loading-sm"></span>
            </div>
          ) : (
            results?.map((item, index) => (
              <ResultItem key={index} item={item} onClick={handleItemClick} />
            ))
          )}
          {results?.length === 0 && (
             <li className="p-2 text-sm text-gray-500">No hay coincidencias.</li>
          )}
        </ul>
      )}
    </form>
  );
}
