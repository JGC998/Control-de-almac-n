"use client";
import React, { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { Save, Download, Trash2, Plus, FileText, X } from 'lucide-react';

const fetcher = url => fetch(url).then(r => r.json());

export default function TemplateManager({ onLoadTemplate, currentItems, currentMarginId }) {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState('load'); // 'load' or 'save'
    const [newTemplateName, setNewTemplateName] = useState('');
    const [newTemplateDesc, setNewTemplateDesc] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const { data: templates, isLoading } = useSWR('/api/presupuestos/templates', fetcher);

    const handleSave = async () => {
        if (!newTemplateName) return;
        setSaving(true);
        setError(null);

        try {
            const res = await fetch('/api/presupuestos/templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nombre: newTemplateName,
                    descripcion: newTemplateDesc,
                    items: currentItems,
                    marginId: currentMarginId
                })
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.message || 'Error al guardar');
            }

            mutate('/api/presupuestos/templates'); // Recargar lista
            setNewTemplateName('');
            setNewTemplateDesc('');
            setMode('load'); // Volver a lista

        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!confirm('¿Seguro que quieres eliminar esta plantilla?')) return;

        try {
            await fetch(`/api/presupuestos/templates/${id}`, { method: 'DELETE' });
            mutate('/api/presupuestos/templates');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <>
            <div className="dropdown dropdown-end">
                <div tabIndex={0} role="button" className="btn btn-sm btn-outline gap-2" onClick={() => setIsOpen(true)}>
                    <FileText size={16} /> Plantillas
                </div>
            </div>

            {isOpen && (
                <dialog className="modal modal-open">
                    <div className="modal-box w-11/12 max-w-3xl">
                        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={() => setIsOpen(false)}>
                            <X size={20} />
                        </button>

                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <FileText className="text-primary" /> Gestión de Plantillas
                        </h3>

                        {/* Tabs */}
                        <div className="tabs tabs-boxed mb-4">
                            <a className={`tab ${mode === 'load' ? 'tab-active' : ''}`} onClick={() => setMode('load')}>
                                <Download size={16} className="mr-2" /> Cargar Plantilla
                            </a>
                            <a className={`tab ${mode === 'save' ? 'tab-active' : ''}`} onClick={() => setMode('save')}>
                                <Save size={16} className="mr-2" /> Guardar Actual
                            </a>
                        </div>

                        {mode === 'save' && (
                            <div className="space-y-4 animate-in fade-in">
                                <div className="alert alert-info text-sm">
                                    <Save size={16} />
                                    <span>Se guardarán los <strong>{currentItems?.length || 0} items</strong> actuales como una nueva plantilla.</span>
                                </div>

                                <div className="form-control">
                                    <label className="label">Nombre de la Plantilla</label>
                                    <input
                                        type="text"
                                        className="input input-bordered w-full"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        placeholder="Ej: Presupuesto Estándar Nave Industrial"
                                    />
                                </div>

                                <div className="form-control">
                                    <label className="label">Descripción (Opcional)</label>
                                    <textarea
                                        className="textarea textarea-bordered w-full"
                                        value={newTemplateDesc}
                                        onChange={(e) => setNewTemplateDesc(e.target.value)}
                                        placeholder="Detalles sobre lo que incluye..."
                                    ></textarea>
                                </div>

                                {error && <div className="text-error text-sm">{error}</div>}

                                <button
                                    className="btn btn-primary w-full"
                                    onClick={handleSave}
                                    disabled={!newTemplateName || saving}
                                >
                                    {saving ? 'Guardando...' : 'Guardar Plantilla'}
                                </button>
                            </div>
                        )}

                        {mode === 'load' && (
                            <div className="space-y-4 animate-in fade-in">
                                {isLoading ? (
                                    <div className="flex justify-center p-8"><span className="loading loading-spinner"></span></div>
                                ) : templates?.length === 0 ? (
                                    <div className="text-center p-8 text-gray-500">
                                        No hay plantillas guardadas. Guarda el presupuesto actual para crear una.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {templates.map(t => (
                                            <div key={t.id} className="card bg-base-200 hover:bg-base-300 transition-colors border border-base-300 cursor-pointer group"
                                                onClick={() => {
                                                    if (confirm('¿Cargar esta plantilla reemplazará los items actuales. Continuar?')) {
                                                        onLoadTemplate(t);
                                                        setIsOpen(false);
                                                    }
                                                }}
                                            >
                                                <div className="card-body p-4">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className="font-bold">{t.nombre}</h4>
                                                        <button
                                                            className="btn btn-ghost btn-xs text-error opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={(e) => handleDelete(t.id, e)}
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                    {t.descripcion && <p className="text-xs text-gray-500 line-clamp-2">{t.descripcion}</p>}
                                                    <div className="mt-2 text-xs badge badge-ghost">
                                                        {t.items?.length || 0} items
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </dialog>
            )}
        </>
    );
}
