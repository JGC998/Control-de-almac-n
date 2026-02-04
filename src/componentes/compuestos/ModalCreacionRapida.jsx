"use client";
import React, { useState, useEffect } from 'react';
import { mutate } from 'swr';
import Modal from '../primitivos/Modal';
import Boton from '../primitivos/Boton';
import CampoFormulario from '../primitivos/CampoFormulario';
import Entrada from '../primitivos/Entrada';
import Selector from '../primitivos/Selector';
import AreaTexto from '../primitivos/AreaTexto';
import Alerta from '../primitivos/Alerta';

/**
 * Componente ModalCreacionRapida - Modal para crear entidades rápidamente
 * 
 * Versión mejorada del BaseQuickCreateModal existente
 * 
 * @param {Object} props
 * @param {boolean} abierto - Estado de visibilidad
 * @param {function} alCerrar - Callback al cerrar
 * @param {function} alCrear - Callback con el nuevo item creado
 * @param {string} titulo - Título del modal
 * @param {string} endpoint - URL del API para POST
 * @param {string} cacheKey - Key de SWR para revalidar
 * @param {Array<CampoCreacion>} campos - Definición de campos
 * @param {Object} valoresIniciales - Valores iniciales del form
 * 
 * CampoCreacion = {
 *   nombre: string,
 *   etiqueta: string,
 *   tipo: 'texto'|'numero'|'email'|'textarea'|'select',
 *   requerido?: boolean,
 *   placeholder?: string,
 *   opciones?: Array,  // Para select
 *   step?: string,     // Para número
 * }
 */

export default function ModalCreacionRapida({
    abierto = false,
    alCerrar,
    alCrear,
    titulo = 'Nuevo',
    endpoint,
    cacheKey,
    campos = [],
    valoresIniciales = {},
}) {
    const [formData, setFormData] = useState({});
    const [error, setError] = useState(null);
    const [guardando, setGuardando] = useState(false);

    // Inicializar formulario cuando se abre
    useEffect(() => {
        if (abierto) {
            const inicial = campos.reduce((acc, campo) => {
                acc[campo.nombre] = valoresIniciales[campo.nombre] ?? '';
                return acc;
            }, {});
            setFormData(inicial);
            setError(null);
        }
    }, [abierto, campos, valoresIniciales]);

    const handleChange = (nombre, valor) => {
        setFormData(prev => ({ ...prev, [nombre]: valor }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setGuardando(true);

        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.message || `Error al crear ${titulo}`);
            }

            const nuevoItem = await res.json();

            // Revalidar cache de SWR
            if (cacheKey) {
                mutate(cacheKey);
            }

            alCrear?.(nuevoItem);
            alCerrar?.();
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    };

    const renderCampo = (campo) => {
        const valor = formData[campo.nombre] ?? '';
        const props = {
            value: valor,
            onChange: (e) => handleChange(campo.nombre, e.target.value),
            placeholder: campo.placeholder,
            required: campo.requerido,
            disabled: guardando,
        };

        switch (campo.tipo) {
            case 'textarea':
                return <AreaTexto {...props} filas={3} />;

            case 'select':
                return (
                    <Selector
                        {...props}
                        opciones={campo.opciones || []}
                        placeholder={campo.placeholder || 'Selecciona...'}
                    />
                );

            case 'numero':
                return <Entrada {...props} tipo="numero" step={campo.step} min={campo.min} />;

            case 'email':
                return <Entrada {...props} tipo="email" />;

            default:
                return <Entrada {...props} tipo="texto" />;
        }
    };

    return (
        <Modal
            abierto={abierto}
            alCerrar={alCerrar}
            titulo={`Nuevo ${titulo}`}
            size="md"
            acciones={
                <>
                    <Boton variant="fantasma" onClick={alCerrar} disabled={guardando}>
                        Cancelar
                    </Boton>
                    <Boton
                        variant="primario"
                        type="submit"
                        form="form-creacion-rapida"
                        loading={guardando}
                    >
                        Guardar
                    </Boton>
                </>
            }
        >
            <form id="form-creacion-rapida" onSubmit={handleSubmit} className="space-y-4">
                {campos.map((campo) => (
                    <CampoFormulario
                        key={campo.nombre}
                        etiqueta={campo.etiqueta}
                        requerido={campo.requerido}
                    >
                        {renderCampo(campo)}
                    </CampoFormulario>
                ))}

                {error && (
                    <Alerta tipo="error">
                        {error}
                    </Alerta>
                )}
            </form>
        </Modal>
    );
}
