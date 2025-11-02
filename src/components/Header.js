import Link from "next/link";
import { FaHome, FaBars } from 'react-icons/fa';
import SearchBar from './SearchBar';

function Header({ toggleSidebar }) { // Accept toggleSidebar prop
    return (
        <header className="navbar bg-base-300 shadow-lg sticky top-0 z-50">
            <div className="navbar-start">
                <Link href="/" className="btn btn-ghost text-xl">
                    <FaHome className="mr-2" />
                    Gestión Taller
                </Link>
            </div>
            <div className="navbar-center">
                <SearchBar />
            </div>
            <div className="navbar-end md:hidden"> {/* Container for the toggle button, hidden on md and above */}
                <button onClick={toggleSidebar} className="btn btn-ghost btn-circle">
                    <FaBars className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}

export default Header;