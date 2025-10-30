import Link from 'next/link';
import { FaClipboardList, FaTruck, FaWarehouse, FaCamera, FaShip, FaEuroSign, FaCalculator, FaWrench } from 'react-icons/fa'; // Removed FaBars

const Sidebar = () => { // Removed toggleSidebar and isSidebarOpen props
  return (
    <aside className="w-64 bg-gray-800 text-white p-4 h-screen sticky top-0 flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Menú</h2>
      </div>
      <nav className="flex flex-col space-y-2 flex-grow">
        <Link href="/tarifas" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaEuroSign className="mr-2" /> Tarifas
        </Link>
        <Link href="/calculadora" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaCalculator className="mr-2" /> Calculadora
        </Link>
        <Link href="/clientes" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaClipboardList className="mr-2" /> Pedidos Clientes
        </Link>
        <Link href="/proveedores" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaTruck className="mr-2" /> Pedidos Proveedores
        </Link>
        <Link href="/almacen" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaWarehouse className="mr-2" /> Visualización Almacén
        </Link>
        <Link href="/fotos" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaCamera className="mr-2" /> Gestión de Fotos
        </Link>
        <Link href="/contenedores" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaShip className="mr-2" /> Seguimiento Contenedores
        </Link>
        <Link href="/gestion-json" className="hover:bg-gray-700 p-2 rounded flex items-center">
          <FaWrench className="mr-2" /> Gestión JSON
        </Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
