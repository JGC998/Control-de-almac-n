import Link from "next/link";
import { FaHome, FaBars } from 'react-icons/fa'; // FaBars will be used for the toggle button

function Header({ toggleSidebar }) { // Accept toggleSidebar prop
    return (
        <header className="navbar bg-base-300 shadow-lg sticky top-0 z-50">
            <div className="flex-1">
                <Link href="/" className="btn btn-ghost text-xl">
                    <FaHome className="mr-2" />
                    Gestión Taller
                </Link>
            </div>
            <div className="flex-none"> {/* Container for the toggle button */}
                <button onClick={toggleSidebar} className="btn btn-ghost btn-circle">
                    <FaBars className="h-5 w-5" />
                </button>
            </div>
        </header>
    );
}

export default Header;