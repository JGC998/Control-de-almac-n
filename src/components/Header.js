import Link from "next/link";
import { FaWarehouse, FaTruck, FaClipboardList, FaEuroSign, FaHome, FaBars, FaRocket, FaClock, FaCalendarAlt, FaBalanceScale, FaCogs } from 'react-icons/fa';

function Header() {
    return (
        <header className="navbar bg-base-300 shadow-lg sticky top-0 z-50">
            <div className="flex-1">
                <Link href="/" className="btn btn-ghost text-xl">
                    <FaHome className="mr-2" />
                    Gestión Taller
                </Link>
            </div>
            <div className="flex-none gap-4">

                {/* Menú para pantallas grandes */}
                <div className="hidden md:flex">
                    <ul className="menu menu-horizontal px-1">
                        <li><Link href="/tarifas"><FaEuroSign /> Tarifas</Link></li>
                        <li><Link href="/calculadora"><FaRocket /> Calculadora</Link></li>
                        <li><Link href="/clientes"><FaClipboardList /> Pedidos Clientes</Link></li>
                        <li><Link href="/proveedores"><FaTruck /> Pedidos Proveedores</Link></li>
                    </ul>
                </div>

                {/* Menú desplegable para móviles */}
                <div className="dropdown dropdown-end md:hidden">
                    <div tabIndex={0} role="button" className="btn btn-ghost">
                        <FaBars className="h-6 w-6" />
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-1 p-2 shadow bg-base-100 rounded-box w-52">
                        <li><Link href="/tarifas"><FaEuroSign /> Tarifas</Link></li>
                        <li><Link href="/calculadora"><FaRocket /> Calculadora</Link></li>
                        <li><Link href="/clientes"><FaClipboardList /> Pedidos Clientes</Link></li>
                        <li><Link href="/proveedores"><FaTruck /> Pedidos Proveedores</Link></li>
                    </ul>
                </div>
            </div>
        </header>
    );
}

export default Header;