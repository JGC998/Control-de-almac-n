"use client";
import { useState, useEffect } from 'react';
import useSWR from 'swr';

/**
 * Dropdown en cascada Familia → Subfamilia.
 * Props:
 *   value      — subfamiliaId (string UUID | null)
 *   onChange   — (subfamiliaId: string | null) => void
 *   required   — boolean
 *   className  — clases adicionales para el wrapper
 */
export default function SelectorFamiliaSubfamilia({ value, onChange, required = false, className = '' }) {
  const { data: familias = [], isLoading } = useSWR('/api/familias');

  // familia seleccionada en el primer select (puede ser diferente a la de value si el usuario
  // acaba de cambiar de familia sin elegir subfamilia todavía)
  const [familiaId, setFamiliaId] = useState('');

  // Sincronizar familiaId cuando llega el value externo (modo edición)
  useEffect(() => {
    if (!value || !familias.length) {
      if (!value) setFamiliaId('');
      return;
    }
    const fam = familias.find(f => f.subfamilias?.some(s => s.id === value));
    if (fam) setFamiliaId(fam.id);
  }, [value, familias]);

  const subfamilias = familias.find(f => f.id === familiaId)?.subfamilias ?? [];

  function handleFamiliaChange(id) {
    setFamiliaId(id);
    onChange(null); // limpiar subfamilia al cambiar familia
  }

  function handleSubfamiliaChange(id) {
    onChange(id || null);
  }

  if (isLoading) {
    return <div className={`flex gap-2 ${className}`}><span className="loading loading-spinner loading-sm" /></div>;
  }

  return (
    <div className={`flex gap-2 ${className}`}>
      {/* Select familia */}
      <select
        className="select select-bordered flex-1"
        value={familiaId}
        onChange={e => handleFamiliaChange(e.target.value)}
      >
        <option value="">— Familia —</option>
        {familias.map(f => (
          <option key={f.id} value={f.id}>{f.nombre}</option>
        ))}
      </select>

      {/* Select subfamilia (solo visible cuando hay familia seleccionada) */}
      {familiaId && (
        <select
          className="select select-bordered flex-1"
          value={value ?? ''}
          onChange={e => handleSubfamiliaChange(e.target.value)}
          required={required}
        >
          <option value="">— Subfamilia —</option>
          {subfamilias.map(s => (
            <option key={s.id} value={s.id}>{s.nombre}</option>
          ))}
        </select>
      )}
    </div>
  );
}
