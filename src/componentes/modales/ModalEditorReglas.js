'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';

const TIER_OPTIONS = ['FABRICANTE', 'INTERMEDIARIO', 'CLIENTE FINAL'];

// FE-13: tipos válidos como listas cerradas para evitar typos que rompen la lógica condicional
const TIPOS_MARGEN    = ['General', 'Categoria', 'Cliente'];
const TIPOS_DESCUENTO = ['categoria', 'volumen', 'cliente'];

export default function RuleEditorModal({ isOpen, onClose, onSave, rule, ruleType, apiError }) {
    const [formData, setFormData] = useState(rule);
    // FE-05: estado de guardado para evitar doble submit
    const [guardando, setGuardando] = useState(false);

    const { data: clientes }  = useSWR(ruleType === 'specialPrices' ? '/api/clientes'  : null);
    const { data: productos } = useSWR(ruleType === 'specialPrices' ? '/api/productos' : null);

    useEffect(() => { setFormData(rule); }, [rule]);
    useEffect(() => { if (isOpen) setGuardando(false); }, [isOpen]);

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

    const handleSave = async () => {
        if (guardando) return;
        setGuardando(true);
        try {
            await onSave(formData);
        } finally {
            setGuardando(false);
        }
    };

    const renderFormFields = () => {
        switch (ruleType) {
            case 'margins':
                return (
                    <>
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} />
                        <InputField name="valor" label="Valor (ej. 1.5 para 50% de margen)" type="number" step="0.01" value={formData.valor} onChange={handleChange} />
                        {/* FE-13: select en lugar de input libre para evitar typos */}
                        <div className="form-control">
                            <label className="label" htmlFor="tipo-margen"><span className="label-text">Tipo</span></label>
                            <select id="tipo-margen" name="tipo" value={formData.tipo || ''} onChange={handleChange} className="select select-bordered">
                                <option value="">Selecciona tipo</option>
                                {TIPOS_MARGEN.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        {formData.tipo === 'Categoria' && <InputField name="categoria" label="Categoría" value={formData.categoria} onChange={handleChange} />}
                        {formData.tipo === 'Cliente' && (
                            <label className="form-control w-full">
                                <div className="label"><span className="label-text">Tier de Cliente</span></div>
                                <select name="tierCliente" value={formData.tierCliente || ''} onChange={handleChange} className="select select-bordered" required>
                                    <option value="">Selecciona Tier</option>
                                    {TIER_OPTIONS.map(tier => <option key={tier} value={tier}>{tier}</option>)}
                                </select>
                            </label>
                        )}
                    </>
                );
            case 'discounts':
                return (
                    <>
                        <InputField name="descripcion" label="Descripción" value={formData.descripcion} onChange={handleChange} />
                        {/* FE-13: select para tipos de descuento */}
                        <div className="form-control">
                            <label className="label" htmlFor="tipo-descuento"><span className="label-text">Tipo</span></label>
                            <select id="tipo-descuento" name="tipo" value={formData.tipo || ''} onChange={handleChange} className="select select-bordered">
                                <option value="">Selecciona tipo</option>
                                {TIPOS_DESCUENTO.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <InputField name="descuento" label="Descuento (ej. 0.1 para 10%)" type="number" step="0.01" value={formData.descuento} onChange={handleChange} />
                        {formData.tipo === 'categoria' && <InputField name="categoria" label="Categoría" value={formData.categoria} onChange={handleChange} />}
                        {formData.tipo === 'cliente'   && <InputField name="tierCliente" label="Tier de Cliente" value={formData.tierCliente} onChange={handleChange} />}
                        {formData.tipo === 'volumen'   && (
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
                        <InputField name="fechaFin"    label="Fecha Fin (opcional)"   type="date" value={formData.fechaFin    ? new Date(formData.fechaFin).toISOString().split('T')[0]    : ''} onChange={handleChange} />
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
                    <button onClick={onClose} className="btn" disabled={guardando}>Cancelar</button>
                    <button onClick={handleSave} className="btn btn-primary" disabled={guardando}>
                        {guardando && <span className="loading loading-spinner loading-xs mr-1" />}
                        Guardar
                    </button>
                </div>
            </div>
        </div>
    );
}

const InputField = ({ name, label, value, onChange, type = 'text', step = 'any' }) => (
    <div className="form-control">
        <label className="label" htmlFor={`ruleField-${name}`}>
            <span className="label-text">{label}</span>
        </label>
        <input id={`ruleField-${name}`} name={name} type={type} value={value || ''} onChange={onChange} className="input input-bordered" step={step} />
    </div>
);
