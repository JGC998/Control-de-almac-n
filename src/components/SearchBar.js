"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const router = useRouter();

  const handleSearch = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  return (
    <form onSubmit={handleSearch} className="flex-grow max-w-md">
      <div className="form-control">
        <div className="input-group">
          <input
            type="text"
            placeholder="Buscar cliente, pedido..."
            className="input input-bordered w-full"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="submit" className="btn btn-square btn-primary">
            <Search />
          </button>
        </div>
      </div>
    </form>
  );
}
