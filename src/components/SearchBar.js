'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaSearch } from 'react-icons/fa';

export default function SearchBar() {
    const [query, setQuery] = useState('');
    const router = useRouter();

    const handleSearch = (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        router.push(`/search?q=${encodeURIComponent(query)}`);
    };

    return (
        <form onSubmit={handleSearch} className="join">
            <input
                className="input input-bordered join-item"
                placeholder="Buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="btn join-item btn-primary">
                <FaSearch />
            </button>
        </form>
    );
}
