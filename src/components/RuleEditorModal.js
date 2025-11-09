'use client';

import { useState, useEffect } from 'react';
import useSWR, { mutate } from 'swr'; 
import { Trash2, Plus } from 'lucide-react'; // Importar Plus

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente para simplificar los campos del formulario
const InputField = ({ name, label, value, onChange, type = 'text', step = 'any', required = true, placeholder }) => (
    <div className="form-control">
        <label className="label"><span className="label-text">{label}</span></label>
        {type === 'checkbox' ? (
            <input 
              type="checkbox"
              name={name}
              className="checkbox checkbox-primary"
              checked={!!value}
              onChange={(e) => onChange({ target: { name, value: e.target.checked }})}
            />
        ) : (
            <input 
                name={name} 
                type={type} 
                value={value === null || value === undefined ? '' : value} 
                onChange={onChange} 
                placeholder={placeholder}
                className="input input-bordered w-full" 
                step={step}
                required={required}
            />
        )}
    </div>
);


// Componente de formulario dinámico para editar una regla
export default function RuleEditorModal({ isOpen, onClose, onSave, rule, ruleType, apiError }) {
    const [formData, setFormData] = useState(rule);

    // Cargar datos para selectores en precios especiales
    const { data: clientes } = useSWR(ruleType === 'specialPrices' ? '/api/clientes' : null, fetcher);
    const { data: productos } = useSWR(ruleType === 'specialPrices' ? '/api/productos' : null, fetcher);
    const { data: materiales } = useSWR(ruleType === 'descuentos' ? '/api/materiales' : null, fetcher);


    useEffect(() => {
        // Inicializa tiers como array vacío si es null o undefined (solo para descuentos)
        if (ruleType === 'descuentos' && (!rule.tiers || !Array.isArray(rule.tiers))) {
            setFormData({ ...rule, tiers: [] });
        } else {
             // Asegurar que las fechas son strings ISO válidos para inputs de tipo date
             const cleanRule = { ...rule };
             if (cleanRule.fechaInicio) cleanRule.fechaInicio = new Date(cleanRule.fechaInicio).toISOString().split('T')[0];
             if (cleanRule.fechaFin) cleanRule.fechaFin = new Date(cleanRule.fechaFin).toISOString().split('T')[0];
             
             setFormData(cleanRule);
        }
    }, [rule, ruleType]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTierChange = (index, key, value) => {
        const newTiers = [...formData.tiers];
        // Convertir a número antes de guardar en el estado
        const numericValue = key === 'cantidadMinima' ? parseInt(value) || 0 : parseFloat(value) || 0;
        newTiers[index][key] = numericValue;
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const addTier = () => {
        // Usamos Date.now() como ID temporal para la key de React si no tiene ID real
        const newTiers = [...(formData.tiers || []), { id: Date.now(), cantidadMinima: 1, descuento: 0.05 }];
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };
    
    const removeTier = (idToRemove) => {
        setFormData(prev => ({ 
            ...prev, 
            // Filtramos usando el ID temporal/real para eliminar
            tiers: prev.tiers.filter(t => t.id !== idToRemove) 
        }));
    };

    const handleInternalSave = () => {
        // Transformar fechas de vuelta a formato ISO para la API
        const dataToSave = { ...formData };
        if (dataToSave.fechaInicio) {
            dataToSave.fechaInicio = new Date(dataToSave.fechaInicio).toISOString();
        }
        if (dataToSave.fechaFin) {
            dataToSave.fechaFin = new Date(dataToSave.fechaFin).toISOString();
        }

        // Si no es volumen, asegurarse de que tiers es nulo o vacío
        if (dataToSave.tipo !== 'volumen') {
            dataToSave.tiers = [];
        } else {
             // Si es volumen, asegurar que el campo 'descuento' principal no se envíe (si la API lo permite)
             delete dataToSave.descuento;
        }

        onSave(dataToSave);
    };

    const renderFormFields = () => {
        switch (ruleType) {
            case 'margenes':
                return (
                    <>
                        <InputField name="base" label="Tipo de Tarifa (Única)" value={formData.base} onChange={handleChange} required />
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} required />
                        <InputField name="multiplicador" label="Multiplicador (ej. 1.5)" type="number" step="0.01" value={formData.multiplicador} onChange={handleChange} required />
                        <InputField name="gastoFijo" label="Gasto Fijo (€) (Opcional)" type="number" step="0.01" value={formData.gastoFijo} onChange={handleChange} required={false} />
                        {/* Legacy fields */}
                        <InputField name="tipo" label="Tipo (Legacy)" value={formData.tipo} onChange={handleChange} required={false} placeholder="General" />
                        <InputField name="categoria" label="Categoría (Legacy)" value={formData.categoria} onChange={handleChange} required={false} placeholder="General" />
                    </>
                );
            case 'descuentos':
                // Nota: Usamos formData.descuento y formData.tierCliente como campos opcionales en el formulario
                return (
                    <>
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} required />
                        
                        <label className="form-control w-full">
                            <div className="label"><span className="label-text">Tipo de Regla</span></div>
                            <select name="tipo" value={formData.tipo || 'categoria'} onChange={handleChange} className="select select-bordered" required>
                                <option value="categoria">Categoría</option>
                                <option value="volumen">Volumen (Tiers)</option>
                                <option value="cliente">Tier Cliente (GOLD/SILVER)</option>
                            </select>
                        </label>
                        
                        {(formData.tipo === 'categoria') && (
                            <label className="form-control w-full">
                                <div className="label"><span className="label-text">Material/Categoría</span></div>
                                <select name="categoria" value={formData.categoria || ''} onChange={handleChange} className="select select-bordered" required>
                                     <option value="">Selecciona Material</option>
                                     {materiales?.map(m => <option key={m.id} value={m.nombre}>{m.nombre}</option>)}
                                </select>
                            </label>
                        )}
                        {(formData.tipo === 'cliente') && <InputField name="tierCliente" label="Tier Cliente (ej. GOLD)" value={formData.tierCliente} onChange={handleChange} required />}

                        {/* Descuento Fijo (se aplica si no es por volumen) */}
                        {formData.tipo !== 'volumen' && (
                           <InputField name="descuento" label="Descuento (ej. 0.1 para 10%)" type="number" step="0.01" value={formData.descuento} onChange={handleChange} required />
                        )}
                        
                        {/* Tiers de Volumen (si el tipo es volumen) */}
                        {formData.tipo === 'volumen' && (
                            <div className="border p-4 rounded-lg space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-bold">Tiers de Volumen</h4>
                                    <button type="button" onClick={addTier} className="btn btn-xs btn-primary"><Plus className="w-4 h-4" /> Añadir Tier</button>
                                </div>
                                {(formData.tiers || []).map((tier, index) => (
                                    // Usamos tier.id o index para la key
                                    <div key={tier.id || index} className="grid grid-cols-4 gap-2 border-b pb-2">
                                        <div className="col-span-1">
                                            <InputField name={`qty-${index}`} label="Cantidad Mínima" type="number" value={tier.cantidadMinima} onChange={e => handleTierChange(index, 'cantidadMinima', e.target.value)} />
                                        </div>
                                        <div className="col-span-2">
                                            <InputField name={`dsc-${index}`} label="Descuento (0.1 = 10%)" type="number" step="0.01" value={tier.descuento} onChange={e => handleTierChange(index, 'descuento', e.target.value)} />
                                        </div>
                                        <div className="col-span-1 flex items-end justify-end">
                                            <button type="button" onClick={() => removeTier(tier.id || index)} className="btn btn-ghost btn-circle btn-sm text-error mb-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Fechas de Validez */}
                        <div className="grid grid-cols-2 gap-4">
                            <InputField name="fechaInicio" label="Fecha Inicio (opcional)" type="date" value={formData.fechaInicio} onChange={handleChange} required={false} />
                            <InputField name="fechaFin" label="Fecha Fin (opcional)" type="date" value={formData.fechaFin} onChange={handleChange} required={false} />
                        </div>
                    </>
                );
            case 'specialPrices':
                return (
                    <>
                         <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} />
                        
                        <label className="form-control w-full">
                          <div className="label"><span className="label-text">Cliente</span></div>
                          <select name="clienteId" value={formData.clienteId} onChange={handleChange} className="select select-bordered" required>
                            <option value="">Selecciona Cliente</option>
                            {clientes?.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                          </select>
                        </label>
                        
                        <label className="form-control w-full">
                          <div className="label"><span className="label-text">Producto</span></div>
                          <select name="productoId" value={formData.productoId} onChange={handleChange} className="select select-bordered" required>
                            <option value="">Selecciona Producto</option>
                            {productos?.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                          </select>
                        </label>

                        <InputField name="precio" label="Precio Especial" type="number" step="0.01" value={formData.precio} onChange={handleChange} />
                    </>
                );
            default:
                return <p>Tipo de regla no reconocido.</p>;
        }
    };

    return (
        <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-2xl">
                <h3 className="font-bold text-lg">{rule.id ? 'Editar' : 'Crear'} Regla de {ruleType}</h3>
                <div className="py-4 space-y-4">
                    {renderFormFields()}
                </div>
                {apiError && <div className="alert alert-error text-sm">{apiError}</div>}
                <div className="modal-action">
                    <button onClick={onClose} className="btn">Cancelar</button>
                    <button onClick={handleInternalSave} className="btn btn-primary">Guardar</button>
                </div>
            </div>
        </div>
    );
}
