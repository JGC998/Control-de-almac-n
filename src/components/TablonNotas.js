"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { MessageSquare, Send } from 'lucide-react';

const fetcher = (url) => fetch(url).then((res) => res.json());

export default function TablonNotas() {
  const [newNote, setNewNote] = useState('');
  const [error, setError] = useState(null);
  
  const { data: notas, error: notasError, isLoading } = useSWR('/api/notas', fetcher);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setError(null);
    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar la nota');
      }
      setNewNote('');
      mutate('/api/notas'); // Revalida
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">Tablón de Notas Rápidas</h2>
        <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
          <input 
            type="text" 
            placeholder="Escribe una nota rápida..." 
            className="input input-bordered w-full"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button type="submit" className="btn btn-primary">
            <Send className="w-4 h-4" />
          </button>
        </form>
        {error && <p className="text-red-500 text-xs">{error}</p>}
        <div className="overflow-y-auto max-h-60 space-y-2">
          {isLoading && <span className="loading loading-spinner"></span>}
          {notasError && <p className="text-red-500">Error al cargar notas.</p>}
          {notas?.map(nota => (
            <div key={nota.id} className="chat chat-start">
              <div className="chat-bubble">
                <p>{nota.content}</p>
                <time className="text-xs opacity-50">{new Date(nota.fecha).toLocaleString()}</time>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
