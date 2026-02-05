"use client";
import React from 'react';
import { AlertTriangle, Trash2, CheckCircle } from 'lucide-react';
import { Boton } from '../primitivos';

/**
 * Componente ModalConfirmacion - Modal para confirmar acciones destructivas
 * 
 * Reemplaza los confirm() nativos con un modal estilizado y accesible.
 * 
 * @param {Object} props
 * @param {boolean} abierto - Si el modal está visible
 * @param {string} titulo - Título del modal
 * @param {string} mensaje - Mensaje de confirmación
 * @param {string} variante - Variante visual: 'peligro', 'advertencia', 'exito'
 * @param {string} textoConfirmar - Texto del botón confirmar
 * @param {string} textoCancelar - Texto del botón cancelar
 * @param {function} alConfirmar - Callback al confirmar
 * @param {function} alCancelar - Callback al cancelar
 * @param {boolean} cargando - Si está procesando
 * 
 * @example
 * <ModalConfirmacion
 *     abierto={mostrarConfirmacion}
 *     titulo="¿Eliminar cliente?"
 *     mensaje="Esta acción no se puede deshacer."
 *     variante="peligro"
 *     alConfirmar={handleEliminar}
 *     alCancelar={() => setMostrarConfirmacion(false)}
 * />
 */
export default function ModalConfirmacion({
    abierto,
    titulo = '¿Estás seguro?',
    mensaje = 'Esta acción no se puede deshacer.',
    variante = 'peligro',
    textoConfirmar = 'Confirmar',
    textoCancelar = 'Cancelar',
    alConfirmar,
    alCancelar,
    cargando = false,
}) {
    if (!abierto) return null;

    const configuracionVariantes = {
        peligro: {
            icono: Trash2,
            colorIcono: 'text-error',
            fondoIcono: 'bg-error/10',
            botonVariante: 'peligro',
        },
        advertencia: {
            icono: AlertTriangle,
            colorIcono: 'text-warning',
            fondoIcono: 'bg-warning/10',
            botonVariante: 'advertencia',
        },
        exito: {
            icono: CheckCircle,
            colorIcono: 'text-success',
            fondoIcono: 'bg-success/10',
            botonVariante: 'primario',
        },
    };

    const config = configuracionVariantes[variante] || configuracionVariantes.peligro;
    const Icono = config.icono;

    const handleConfirmar = async () => {
        if (alConfirmar) {
            await alConfirmar();
        }
    };

    return (
        <div className="modal modal-open bg-black/50 backdrop-blur-sm">
            <div className="modal-box max-w-md">
                {/* Icono */}
                <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${config.fondoIcono} flex items-center justify-center`}>
                    <Icono className={`w-8 h-8 ${config.colorIcono}`} />
                </div>

                {/* Título */}
                <h3 className="font-bold text-lg text-center mb-2">{titulo}</h3>

                {/* Mensaje */}
                <p className="text-center text-base-content/70 mb-6">{mensaje}</p>

                {/* Acciones */}
                <div className="modal-action justify-center gap-3">
                    <Boton
                        variant="fantasma"
                        onClick={alCancelar}
                        deshabilitado={cargando}
                    >
                        {textoCancelar}
                    </Boton>
                    <Boton
                        variant={config.botonVariante}
                        onClick={handleConfirmar}
                        cargando={cargando}
                    >
                        {textoConfirmar}
                    </Boton>
                </div>
            </div>

            {/* Click fuera para cerrar */}
            <div className="modal-backdrop" onClick={alCancelar} />
        </div>
    );
}

/**
 * Hook para usar ModalConfirmacion más fácilmente
 */
export function useConfirmacion() {
    const [estado, setEstado] = React.useState({
        abierto: false,
        titulo: '',
        mensaje: '',
        variante: 'peligro',
        resolver: null,
    });

    const confirmar = React.useCallback(({
        titulo = '¿Estás seguro?',
        mensaje = 'Esta acción no se puede deshacer.',
        variante = 'peligro'
    } = {}) => {
        return new Promise((resolve) => {
            setEstado({
                abierto: true,
                titulo,
                mensaje,
                variante,
                resolver: resolve,
            });
        });
    }, []);

    const { resolver } = estado;

    const handleConfirmar = React.useCallback(() => {
        resolver?.(true);
        setEstado(prev => ({ ...prev, abierto: false }));
    }, [resolver]);

    const handleCancelar = React.useCallback(() => {
        resolver?.(false);
        setEstado(prev => ({ ...prev, abierto: false }));
    }, [resolver]);

    const ModalConfirmacionConectado = React.useCallback(() => (
        <ModalConfirmacion
            abierto={estado.abierto}
            titulo={estado.titulo}
            mensaje={estado.mensaje}
            variante={estado.variante}
            alConfirmar={handleConfirmar}
            alCancelar={handleCancelar}
        />
    ), [estado, handleConfirmar, handleCancelar]);

    return { confirmar, ModalConfirmacion: ModalConfirmacionConectado };
}
