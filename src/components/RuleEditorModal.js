'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr'; // Para cargar clientes y productos

const fetcher = (url) => fetch(url).then((res) => res.json());

// Componente de formulario dinámico para editar una regla
export default function RuleEditorModal({ isOpen, onClose, onSave, rule, ruleType, apiError }) {
    const [formData, setFormData] = useState(rule);

    // Cargar datos para selectores en precios especiales
    const { data: clientes } = useSWR(ruleType === 'specialPrices' ? '/api/clientes' : null, fetcher);
    const { data: productos } = useSWR(ruleType === 'specialPrices' ? '/api/productos' : null, fetcher);

    useEffect(() => {
        // Actualizar el estado del formulario si la regla a editar cambia
        setFormData(rule);
    }, [rule]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        
        // Lógica de reseteo para asegurar consistencia
        if (name === 'tipo' && value !== 'categoria') {
             setFormData(prev => ({ ...prev, [name]: value, categoria: null }));
        } else {
             setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleTierChange = (index, key, value) => {
        const newTiers = [...formData.tiers];
        newTiers[index][key] = value;
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const addTier = () => {
        const newTiers = [...(formData.tiers || []), { cantidadMinima: 0, descuento: 0 }];
        setFormData(prev => ({ ...prev, tiers: newTiers }));
    };

    const renderFormFields = () => {
        switch (ruleType) {
            case 'margins':
                return (
                    <>
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} />
                        
                        {/* Tipo de Regla (Select en lugar de Input libre) */}
                        <label className="form-control w-full">
                          <div className="label"><span className="label-text">Tipo de Regla de Margen</span></div>
                          <select name="tipo" value={formData.tipo || 'General'} onChange={handleChange} className="select select-bordered" required>
                            <option value="General">General (Aplica a todo)</option>
                            <option value="Categoria">Por Categoría (Material, Cliente, Fabricante, etc.)</option>
                          </select>
                        </label>
                        
                        {/* Campo de Categoría (Condicional) */}
                        {formData.tipo === 'Categoria' && (
                            <InputField 
                                name="categoria" 
                                label="Nombre de Categoría/Target (ej: PVC, GOLD, FABRICANTE)" 
                                value={formData.categoria} 
                                onChange={handleChange} 
                                required={true}
                            />
                        )}

                        <InputField name="valor" label="Multiplicador (ej. 1.5 para 50% de margen)" type="number" step="0.01" value={formData.valor} onChange={handleChange} />
                        <InputField name="gastoFijo" label="Gasto Fijo (€) (Costo fijo adicional por unidad)" type="number" step="0.01" value={formData.gastoFijo} onChange={handleChange} />
                    </>
                );
            case 'discounts':
                return (
                    <>
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} />
                        <InputField name="tipo" label="Tipo (ej. categoria, volumen, cliente)" value={formData.tipo} onChange={handleChange} />
                        <InputField name="descuento" label="Descuento (ej. 0.1 para 10%)" type="number" step="0.01" value={formData.descuento} onChange={handleChange} />
                        {formData.tipo === 'categoria' && <InputField name="categoria" label="Categoría" value={formData.categoria} onChange={handleChange} />}
                        {formData.tipo === 'cliente' && <InputField name="tierCliente" label="Tier de Cliente (ej. GOLD)" value={formData.tierCliente} onChange={handleChange} />}
                        {formData.tipo === 'volumen' && (
                            <div>
                                <h4 className="font-bold mt-4">Tiers de Volumen</h4>
                                {(formData.tiers || []).map((tier, index) => (
                                    <div key={index} className="grid grid-cols-2 gap-2 my-2 p-2 border rounded">
                                        <InputField name={`tier-qty-${index}`} label="Cantidad Mínima" type="number" value={tier.cantidadMinima} onChange={e => handleTierChange(index, 'cantidadMinima', e.target.value)} />
                                        <InputField name={`tier-dsc-${index}`} label="Descuento (0.1 = 10%)" type="number" step="0.01" value={tier.descuento} onChange={e => handleTierChange(index, 'descuento', e.target.value)} />
                                    </div>
                                ))}
                                <button type="button" onClick={addTier} className="btn btn-xs btn-outline mt-2">+ Añadir Tier</button>
                            </div>
                        )}
                        <InputField name="fechaInicio" label="Fecha Inicio (opcional)" type="date" value={formData.fechaInicio ? new Date(formData.fechaInicio).toISOString().split('T')[0] : ''} onChange={handleChange} />
                        <InputField name="fechaFin" label="Fecha Fin (opcional)" type="date" value={formData.fechaFin ? new Date(formData.fechaFin).toISOString().split('T')[0] : ''} onChange={handleChange} />
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
                <h3 className="font-bold text-lg">{rule.id ? 'Editar' : 'Crear'} Regla</h3>
                <div className="py-4 space-y-4">
                    {renderFormFields()}
                </div>
                {apiError && <div className="alert alert-error text-sm">{apiError}</div>}
                <div className="modal-action">
                    <button onClick={onClose} className="btn">Cancelar</button>
                    <button onClick={() => onSave(formData)} className="btn btn-primary">Guardar</button>
                </div>
            </div>
        </div>
    );
}

// Pequeño componente para simplificar los campos del formulario
const InputField = ({ name, label, value, onChange, type = 'text', step = 'any', required = false }) => (
    <div className="form-control">
        <label className="label"><span className="label-text">{label}</span></label>
        <input name={name} type={type} value={value || ''} onChange={onChange} className="input input-bordered" step={step} required={required} />
    </div>
);
