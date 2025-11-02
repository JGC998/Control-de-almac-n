import Link from 'next/link';
import { FaClipboardList, FaTruck, FaWarehouse, FaCamera, FaShip, FaEuroSign, FaCalculator, FaWrench, FaFileInvoice, FaCogs, FaTimes } from 'react-icons/fa';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  return (
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-gray-800 text-white p-4 h-screen flex flex-col transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out md:static md:shadow-lg`}>
      <div className="flex justify-between items-center mb-4 md:hidden"> {/* Only visible on mobile */}
        <h2 className="text-xl font-bold">Menú</h2>
        <button onClick={toggleSidebar} className="btn btn-ghost btn-circle">
          <FaTimes className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-col space-y-2 flex-grow">
        <Link href="/tarifas" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaEuroSign className="mr-2" /> Tarifas
        </Link>
        <Link href="/calculadora" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaCalculator className="mr-2" /> Calculadora
        </Link>
        <Link href="/presupuestos" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaFileInvoice className="mr-2" /> Presupuestos
        </Link>
        <Link href="/pedidos" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaClipboardList className="mr-2" /> Pedidos Clientes
        </Link>
        <Link href="/proveedores" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaTruck className="mr-2" /> Pedidos Proveedores
        </Link>
        <Link href="/almacen" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaWarehouse className="mr-2" /> Visualización Almacén
        </Link>
        <Link href="/fotos" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaCamera className="mr-2" /> Gestión de Fotos
        </Link>
        <Link href="/contenedores" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaShip className="mr-2" /> Seguimiento Contenedores
        </Link>
        <Link href="/guias" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaCogs className="mr-2" /> Manuales y Guías
        </Link>
        <Link href="/gestion-json" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaWrench className="mr-2" /> Gestión JSON
        </Link>
        <Link href="/ajustes/precios" className="hover:bg-gray-700 p-2 rounded flex items-center" onClick={toggleSidebar}>
          <FaCogs className="mr-2" /> Ajustes de Precios
        </Link>
      </nav>
    </aside>
  );
};
export default Sidebar;
