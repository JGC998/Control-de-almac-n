'use client';

import { useState, useEffect } from 'react';
import { FaTrash } from 'react-icons/fa';

export default function TablonNotas() {
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, saving, error

  useEffect(() => {
    setStatus('loading');
    fetch('/api/notas')
      .then(res => res.json())
      .then(data => {
        setNotes(data);
        setStatus('idle');
      })
      .catch(() => setStatus('error'));
  }, []);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setStatus('saving');
    try {
      const response = await fetch('/api/notas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNote }),
      });
      if (!response.ok) throw new Error('Failed to add note');
      const addedNote = await response.json();
      setNotes([...notes, addedNote]);
      setNewNote('');
      setStatus('idle');
    } catch (error) {
      setStatus('error');
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      const response = await fetch(`/api/notas?id=${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete note');
      setNotes(notes.filter(note => note.id !== id));
    } catch (error) {
      // Optionally handle error display for individual deletion
      console.error("Failed to delete note:", error);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-accent">Tablón de Notas</h2>
        
        {/* Form to add a new note */}
        <div className="form-control">
          <textarea
            className="textarea textarea-bordered w-full resize-none"
            placeholder="Escribe una nueva nota..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          ></textarea>
          <button 
              className={`btn btn-primary mt-2 ${status === 'saving' ? 'loading' : ''}`}
              onClick={handleAddNote}
              disabled={status === 'saving'}
          >
              {status === 'saving' ? 'Añadiendo...' : 'Añadir Nota'}
          </button>
        </div>

        <div className="divider">NOTAS GUARDADAS</div>

        {/* List of saved notes */}
        {status === 'loading' && <span className="loading loading-spinner loading-md self-center"></span>}
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {notes.length > 0 ? (
            notes.slice().reverse().map(note => (
              <div key={note.id} className="card bg-base-200">
                <div className="card-body p-4">
                  <p className="whitespace-pre-wrap">{note.content}</p>
                  <div className="card-actions justify-end">
                    <button 
                      className="btn btn-ghost btn-xs text-error" 
                      onClick={() => handleDeleteNote(note.id)}
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            status === 'idle' && <p className="text-center text-base-content/60">No hay notas guardadas.</p>
          )}
        </div>
        {status === 'error' && <p className="text-error text-sm mt-2">Error al cargar o guardar las notas.</p>}
      </div>
    </div>
  );
}