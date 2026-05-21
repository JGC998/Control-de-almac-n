"use client";
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, User, Package, FileText } from 'lucide-react';
import useSWR from 'swr'; // Importar SWR para la búsqueda en tiempo real
import Link from 'next/link';


// Componente para renderizar un solo resultado
const ResultItem = ({ item, onClick }) => {
  let icon, typeText, path;

  switch (item.type) {
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
      typeText = 'Pedido';
      path = `/pedidos/${item.id}`;
      break;
    case 'presupuesto':
      icon = <FileText className="w-4 h-4 text-yellow-500" />;
      typeText = 'Presupuesto';
      path = `/presupuestos/${item.id}`;
      break;
    default:
      return null;
  }

  return (
    <li>
      <Link href={path} onClick={onClick} className="flex items-center justify-between p-2 hover:bg-base-200 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <div className="min-w-0">
            <div className="font-medium truncate">{item.nombre || item.numero}</div>
            {item.clienteNombre && (
              <div className="text-xs text-base-content/50 truncate">{item.clienteNombre}</div>
            )}
          </div>
        </div>
        <span className="badge badge-sm badge-outline shrink-0">{typeText}</span>
      </Link>
    </li>
  );
};


export default function BarraBusqueda() {
  const [query, setQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const router = useRouter();
  const dropdownRef = useRef(null);

  // Llamada a la API de búsqueda: solo si la consulta tiene al menos 2 caracteres
  const queryUrl = query.trim().length >= 2 ? `/api/busqueda?q=${encodeURIComponent(query)}` : null;
  const { data: results, isLoading } = useSWR(queryUrl, {
    revalidateOnFocus: false,
    dedupingInterval: 500,
    shouldRetryOnError: false,
    onSuccess: (data) => {
      if (data && data.length > 0 && query.trim().length >= 2) {
        setIsDropdownOpen(true);
      }
    }
  });

  // useEffect(() => { ... }) eliminado para evitar set-state-in-effect

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

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    if (val.trim().length < 2) {
      setIsDropdownOpen(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      setIsDropdownOpen(false); // Cerrar dropdown al enviar
      router.push(`/busqueda?q=${encodeURIComponent(query)}`);
    }
  };

  const handleItemClick = () => {
    setIsDropdownOpen(false); // Cerrar dropdown al hacer clic en un resultado
  };

  return (
    <form onSubmit={handleSearchSubmit} className="relative w-full" ref={dropdownRef}>
      <div className="join w-full">
        <input
          type="text"
          placeholder="Buscar cliente, pedido..."
          className="input input-bordered input-sm join-item w-full"
          value={query}
          onChange={handleSearchChange}
          tabIndex={0}
        />
        <button type="submit" className="btn btn-sm btn-primary join-item px-3">
          <Search className="w-4 h-4" />
        </button>
      </div>

      {isDropdownOpen && (
        <ul className="absolute top-full left-0 right-0 z-50 mt-1 bg-base-100 border border-base-300 rounded-box shadow-xl p-1 min-w-72">
          {isLoading ? (
            <li className="p-4 text-center">
              <span className="loading loading-spinner loading-sm" />
            </li>
          ) : results?.length === 0 ? (
            <li className="p-3 text-sm text-base-content/50 text-center">Sin resultados para &quot;{query}&quot;</li>
          ) : (
            results?.map((item, index) => (
              <ResultItem key={index} item={item} onClick={handleItemClick} />
            ))
          )}
        </ul>
      )}
    </form>
  );
}
