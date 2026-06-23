"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { MessageSquare, Send, X } from 'lucide-react';

export default function TablonNotas() {
  const [newNote, setNewNote]     = useState('');
  const [error, setError]         = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // FE-01: sustituir confirm() nativo por confirmación inline
  const [confirmDelete, setConfirmDelete] = useState(null); // id de la nota pendiente

  const { data: notas, error: notasError, isLoading } = useSWR('/api/notas');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setError(null);
    const noteContent = newNote.trim();
    setNewNote('');
    try {
      const res = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: noteContent }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al guardar la nota');
      }
      const newNoteFromServer = await res.json();
      mutate('/api/notas', [newNoteFromServer, ...(notas || [])], false);
    } catch (err) {
      setError(err.message);
      setNewNote(noteContent);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDelete) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/notas/${confirmDelete}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Error al eliminar la nota');
      }
      mutate('/api/notas');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleting(false);
      setConfirmDelete(null);
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
            aria-label="Nueva nota"
            className="input input-bordered w-full"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading || isDeleting} aria-label="Añadir nota">
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* FE-12: text-error en lugar de text-red-500 */}
        {error && <p className="text-error text-xs">{error}</p>}

        {/* Confirmación inline de borrado */}
        {confirmDelete && (
          <div className="alert alert-warning text-sm py-2 gap-2">
            <span>¿Eliminar esta nota?</span>
            <div className="flex gap-1 ml-auto">
              <button className="btn btn-xs btn-error" onClick={handleDeleteConfirm} disabled={isDeleting}>Eliminar</button>
              <button className="btn btn-xs btn-ghost" onClick={() => setConfirmDelete(null)}>Cancelar</button>
            </div>
          </div>
        )}

        <div className="overflow-y-auto max-h-60 space-y-2">
          {isLoading && <span className="loading loading-spinner" />}
          {/* FE-12: text-error */}
          {notasError && <p className="text-error text-sm">Error al cargar notas.</p>}
          {notas?.map(nota => (
            <div key={nota.id} className="chat chat-start relative">
              <div className="chat-bubble pr-8">
                <p>{nota.content}</p>
                <time className="text-xs opacity-50">{new Date(nota.fecha).toLocaleString()}</time>
              </div>
              <button
                className="absolute right-0 top-0 btn btn-xs btn-circle btn-ghost"
                onClick={() => setConfirmDelete(nota.id)}
                disabled={isDeleting}
                aria-label="Eliminar nota"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
