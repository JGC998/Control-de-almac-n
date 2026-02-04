import React from 'react';
import { X, Ruler } from 'lucide-react';
import CalculadoraBandas from '@/componentes/calculadoras/CalculadoraBandas';

export default function ModalCalculadoraBandas({ isOpen, onClose, onAddItem }) {
    if (!isOpen) return null;

    return (
        <div className="modal modal-open z-50">
            <div className="modal-box w-11/12 max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-base-100 rounded-lg shadow-2xl">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b bg-base-200">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Ruler className="w-5 h-5 text-secondary" />
                        Configurador de Bandas PVC
                    </h3>
                    <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto flex-1 p-4 bg-base-100">
                    <div className="alert alert-info shadow-sm mb-4 text-xs">
                        <span>Calcula el precio y dimensiones de la banda. Al hacer clic en "Añadir Banda", se insertará como una línea en el pedido.</span>
                    </div>

                    <div className="flex justify-center">
                        <CalculadoraBandas
                            onAddItem={(item) => {
                                onAddItem(item);
                                onClose();
                            }}
                            className="w-full shadow-none border border-base-200"
                        />
                    </div>
                </div>

                <div className="p-4 border-t bg-base-100 flex justify-end">
                    <button className="btn" onClick={onClose}>Cancelar</button>
                </div>
            </div>
        </div>
    );
}
