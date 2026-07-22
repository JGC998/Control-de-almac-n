'use client';
import { useState, useRef, useEffect } from 'react';
import { mutate } from 'swr';
import { Plus, Loader2 } from 'lucide-react';

/**
 * Combobox para seleccionar o crear un fabricante.
 * - Filtra la lista mientras el usuario escribe.
 * - Si el texto no coincide con ninguno existente, ofrece crear uno nuevo
 *   (POST /api/fabricantes) y lo asigna automáticamente.
 * @param {{ fabricantes: {id:string,nombre:string}[], value: string|null, onChange: (id:string|null)=>void }} props
 */
export default function SelectorFabricante({ fabricantes = [], value, onChange }) {
    const [input, setInput]       = useState('');
    const [abierto, setAbierto]   = useState(false);
    const [creando, setCreando]   = useState(false);
    const contenedor              = useRef(null);

    // Sincronizar el texto visible cuando el valor externo cambia (p.ej. al editar un producto)
    useEffect(() => {
        if (value) {
            const fab = fabricantes.find(f => f.id === value);
            setInput(fab ? fab.nombre : '');
        } else {
            setInput('');
        }
    }, [value, fabricantes]);

    // Cerrar al hacer clic fuera
    useEffect(() => {
        function handler(e) {
            if (contenedor.current && !contenedor.current.contains(e.target)) {
                setAbierto(false);
                // Si el texto no corresponde al fabricante seleccionado, limpiar
                if (value) {
                    const fab = fabricantes.find(f => f.id === value);
                    setInput(fab ? fab.nombre : '');
                } else {
                    setInput('');
                }
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [value, fabricantes]);

    const inputNorm = input.trim().toUpperCase();

    const filtrados = fabricantes.filter(f =>
        f.nombre.toUpperCase().includes(inputNorm)
    );

    const coincideExacto = fabricantes.some(f => f.nombre.toUpperCase() === inputNorm);
    const puedeCrear     = inputNorm.length > 0 && !coincideExacto;

    function seleccionar(fab) {
        onChange(fab.id);
        setInput(fab.nombre);
        setAbierto(false);
    }

    function limpiar() {
        onChange(null);
        setInput('');
        setAbierto(false);
    }

    async function crearNuevo() {
        if (!puedeCrear || creando) return;
        setCreando(true);
        try {
            const res = await fetch('/api/fabricantes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: inputNorm }),
            });
            if (!res.ok) throw new Error();
            const nuevo = await res.json();
            await mutate('/api/fabricantes');
            onChange(nuevo.id);
            setInput(nuevo.nombre);
            setAbierto(false);
        } catch {
            // No hacer nada; el campo sigue editable
        } finally {
            setCreando(false);
        }
    }

    return (
        <div ref={contenedor} className="relative">
            <div className="join w-full">
                <input
                    type="text"
                    className="input input-bordered join-item flex-1"
                    placeholder="Buscar o crear fabricante…"
                    value={input}
                    onFocus={() => setAbierto(true)}
                    onChange={e => {
                        setInput(e.target.value);
                        setAbierto(true);
                        if (!e.target.value) onChange(null);
                    }}
                    onKeyDown={e => {
                        if (e.key === 'Escape') { setAbierto(false); }
                        if (e.key === 'Enter' && puedeCrear) { e.preventDefault(); crearNuevo(); }
                    }}
                />
                {value && (
                    <button
                        type="button"
                        className="btn btn-bordered join-item px-3 text-base-content/40 hover:text-base-content"
                        onClick={limpiar}
                        title="Quitar fabricante"
                    >
                        ×
                    </button>
                )}
            </div>

            {abierto && (filtrados.length > 0 || puedeCrear) && (
                <ul className="absolute z-50 mt-1 w-full max-h-56 overflow-y-auto rounded-box border border-base-300 bg-base-100 shadow-lg text-sm">
                    {filtrados.map(f => (
                        <li key={f.id}>
                            <button
                                type="button"
                                className={`w-full text-left px-3 py-2 hover:bg-base-200 font-mono tracking-wide ${f.id === value ? 'bg-primary/10 font-bold' : ''}`}
                                onMouseDown={e => { e.preventDefault(); seleccionar(f); }}
                            >
                                {f.nombre}
                            </button>
                        </li>
                    ))}
                    {puedeCrear && (
                        <li className="border-t border-base-200">
                            <button
                                type="button"
                                className="w-full text-left px-3 py-2 hover:bg-primary/10 flex items-center gap-2 text-primary"
                                onMouseDown={e => { e.preventDefault(); crearNuevo(); }}
                                disabled={creando}
                            >
                                {creando
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : <Plus className="w-3.5 h-3.5" />
                                }
                                Crear «{inputNorm}»
                            </button>
                        </li>
                    )}
                </ul>
            )}
        </div>
    );
}
