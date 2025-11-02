'use client';

import { useState, useEffect } from 'react';

// Componente de formulario dinámico para editar una regla
export default function RuleEditorModal({ isOpen, onClose, onSave, rule, ruleType }) {
    const [formData, setFormData] = useState(rule);

    useEffect(() => {
        // Actualizar el estado del formulario si la regla a editar cambia
        setFormData(rule);
    }, [rule]);

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
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
                        <InputField name="valor" label="Valor (ej. 1.5 para 50% de margen)" type="number" value={formData.valor} onChange={handleChange} />
                        <InputField name="tipo" label="Tipo (ej. general, categoria)" value={formData.tipo} onChange={handleChange} />
                        {formData.tipo === 'categoria' && <InputField name="categoria" label="Categoría" value={formData.categoria} onChange={handleChange} />}
                    </>
                );
            case 'discounts':
                return (
                    <>
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} />
                        <InputField name="tipo" label="Tipo (ej. categoria, volumen, cliente)" value={formData.tipo} onChange={handleChange} />
                        <InputField name="descuento" label="Descuento (ej. 0.1 para 10%)" type="number" value={formData.descuento} onChange={handleChange} />
                        {formData.tipo === 'categoria' && <InputField name="categoria" label="Categoría" value={formData.categoria} onChange={handleChange} />}
                        {formData.tipo === 'cliente' && <InputField name="tierCliente" label="Tier de Cliente (ej. GOLD)" value={formData.tierCliente} onChange={handleChange} />}
                        {formData.tipo === 'volumen' && (
                            <div>
                                <h4 className="font-bold mt-4">Tiers de Volumen</h4>
                                {(formData.tiers || []).map((tier, index) => (
                                    <div key={index} className="grid grid-cols-2 gap-2 my-2 p-2 border rounded">
                                        <InputField name={`tier-qty-${index}`} label="Cantidad Mínima" type="number" value={tier.cantidadMinima} onChange={e => handleTierChange(index, 'cantidadMinima', e.target.value)} />
                                        <InputField name={`tier-dsc-${index}`} label="Descuento (0.1 = 10%)" type="number" value={tier.descuento} onChange={e => handleTierChange(index, 'descuento', e.target.value)} />
                                    </div>
                                ))}
                                <button type="button" onClick={addTier} className="btn btn-xs btn-outline mt-2">+ Añadir Tier</button>
                            </div>
                        )}
                        <InputField name="fechaInicio" label="Fecha Inicio (opcional)" type="date" value={formData.fechaInicio} onChange={handleChange} />
                        <InputField name="fechaFin" label="Fecha Fin (opcional)" type="date" value={formData.fechaFin} onChange={handleChange} />
                    </>
                );
            case 'specialPrices':
                return (
                    <>
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} />
                        <InputField name="clienteId" label="ID del Cliente" value={formData.clienteId} onChange={handleChange} />
                        <InputField name="productoId" label="ID del Producto" value={formData.productoId} onChange={handleChange} />
                        <InputField name="precio" label="Precio Especial" type="number" value={formData.precio} onChange={handleChange} />
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
                <div className="modal-action">
                    <button onClick={onClose} className="btn">Cancelar</button>
                    <button onClick={() => onSave(formData)} className="btn btn-primary">Guardar</button>
                </div>
            </div>
        </div>
    );
}

// Pequeño componente para simplificar los campos del formulario
const InputField = ({ name, label, value, onChange, type = 'text' }) => (
    <div className="form-control">
        <label className="label"><span className="label-text">{label}</span></label>
        <input name={name} type={type} value={value || ''} onChange={onChange} className="input input-bordered" />
    </div>
);
