"use client";
import React from 'react';
import { Entrada, Selector, AreaTexto, CampoFormulario, Boton } from '../primitivos';
import { Alerta } from '../primitivos';

/**
 * Componente FormularioEntidad - Genera formularios dinámicos basados en configuración
 * 
 * Elimina código duplicado de formularios modales en páginas de gestión.
 * Genera campos automáticamente basándose en la definición de campos.
 * 
 * @param {Object} props
 * @param {string} titulo - Título del formulario (ej: "Nuevo Cliente")
 * @param {Array<CampoDef>} campos - Definición de campos del formulario
 * @param {Object} valores - Valores actuales del formulario
 * @param {function} alCambiar - Callback onChange (recibe evento o {nombre, valor})
 * @param {function} alEnviar - Callback onSubmit
 * @param {function} alCancelar - Callback para cancelar
 * @param {boolean} cargando - Si está guardando
 * @param {string} error - Error general del formulario
 * @param {Object} erroresCampos - Errores específicos por campo { campo: mensaje }
 * @param {string} textoGuardar - Texto del botón guardar
 * @param {string} textoCancelar - Texto del botón cancelar
 * @param {boolean} mostrarAcciones - Mostrar botones de acción
 * @param {'vertical'|'horizontal'|'grid'} layout - Layout del formulario
 * @param {number} columnas - Número de columnas (si layout es 'grid')
 * 
 * CampoDef = {
 *   clave: string,              // Nombre del campo (name)
 *   etiqueta?: string,          // Label (si no se pone, usa clave capitalizada)
 *   tipo?: 'texto'|'numero'|'email'|'password'|'telefono'|'selector'|'textarea'|'checkbox',
 *   placeholder?: string,       // Placeholder
 *   requerido?: boolean,        // Si es obligatorio
 *   opciones?: Array,           // Para tipo 'selector' - [{valor, etiqueta}] o ['string']
 *   filas?: number,             // Para tipo 'textarea'
 *   min?: number,               // Para tipo 'numero'
 *   max?: number,               // Para tipo 'numero'
 *   step?: string,              // Para tipo 'numero' (ej: '0.01')
 *   ayuda?: string,             // Texto de ayuda bajo el campo
 *   ancho?: 'full'|'half'|'third', // Ancho del campo en grid
 *   deshabilitado?: boolean,    // Si está deshabilitado
 *   oculto?: boolean,           // Si no debe mostrarse
 * }
 * 
 * @example
 * <FormularioEntidad
 *     titulo="Nuevo Cliente"
 *     campos={[
 *         { clave: 'nombre', requerido: true },
 *         { clave: 'email', tipo: 'email' },
 *         { clave: 'categoria', tipo: 'selector', opciones: ['A', 'B', 'C'] },
 *     ]}
 *     valores={formData}
 *     alCambiar={handleChange}
 *     alEnviar={handleSubmit}
 *     cargando={guardando}
 *     error={errorGuardado}
 * />
 */
export default function FormularioEntidad({
    titulo = null,
    campos = [],
    valores = {},
    alCambiar,
    alEnviar,
    alCancelar = null,
    cargando = false,
    error = null,
    erroresCampos = {},
    textoGuardar = 'Guardar',
    textoCancelar = 'Cancelar',
    mostrarAcciones = true,
    layout = 'vertical',
    columnas = 2,
    className = '',
}) {
    // Manejar cambio de campo
    const handleCambioCampo = (campo, evento) => {
        if (!alCambiar) return;

        // Si es un evento nativo de input
        if (evento?.target) {
            alCambiar(evento);
        } else {
            // Si es un valor directo (para componentes personalizados)
            alCambiar({ target: { name: campo.clave, value: evento } });
        }
    };

    // Normalizar opciones de selector
    const normalizarOpciones = (opciones) => {
        if (!Array.isArray(opciones)) return [];

        return opciones.map(opcion => {
            if (typeof opcion === 'string') {
                return { valor: opcion, etiqueta: opcion };
            }
            return {
                valor: opcion.valor ?? opcion.value ?? opcion.id,
                etiqueta: opcion.etiqueta ?? opcion.label ?? opcion.nombre ?? opcion.name,
            };
        });
    };

    // Generar etiqueta automática desde la clave
    const generarEtiqueta = (clave) => {
        return clave
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    };

    // Renderizar un campo según su tipo
    const renderizarCampo = (campo) => {
        if (campo.oculto) return null;

        const {
            clave,
            etiqueta = generarEtiqueta(clave),
            tipo = 'texto',
            placeholder = '',
            requerido = false,
            opciones = [],
            filas = 3,
            min,
            max,
            step,
            ayuda,
            deshabilitado = false,
        } = campo;

        const valor = valores[clave] ?? '';
        const errorCampo = erroresCampos[clave];

        const propsComunes = {
            name: clave,
            id: clave,
            value: valor,
            onChange: (e) => handleCambioCampo(campo, e),
            disabled: deshabilitado || cargando,
            required: requerido,
            error: errorCampo,
        };

        let inputElement;

        switch (tipo) {
            case 'selector':
                inputElement = (
                    <Selector
                        {...propsComunes}
                        opciones={normalizarOpciones(opciones)}
                        placeholder={placeholder || `Selecciona ${etiqueta.toLowerCase()}...`}
                    />
                );
                break;

            case 'textarea':
                inputElement = (
                    <AreaTexto
                        {...propsComunes}
                        placeholder={placeholder}
                        filas={filas}
                    />
                );
                break;

            case 'checkbox':
                return (
                    <div className="form-control">
                        <label className="label cursor-pointer justify-start gap-3">
                            <input
                                type="checkbox"
                                name={clave}
                                id={clave}
                                checked={!!valor}
                                onChange={(e) => handleCambioCampo(campo, { target: { name: clave, value: e.target.checked } })}
                                disabled={deshabilitado || cargando}
                                className="checkbox checkbox-primary"
                            />
                            <span className="label-text">
                                {etiqueta}
                                {requerido && <span className="text-error ml-1">*</span>}
                            </span>
                        </label>
                        {ayuda && <span className="text-xs text-base-content/60 ml-7">{ayuda}</span>}
                        {errorCampo && <span className="text-xs text-error ml-7">{errorCampo}</span>}
                    </div>
                );

            case 'numero':
                inputElement = (
                    <Entrada
                        {...propsComunes}
                        tipo="numero"
                        placeholder={placeholder}
                        min={min}
                        max={max}
                        step={step}
                    />
                );
                break;

            default:
                inputElement = (
                    <Entrada
                        {...propsComunes}
                        tipo={tipo}
                        placeholder={placeholder}
                    />
                );
        }

        return (
            <CampoFormulario
                key={clave}
                etiqueta={etiqueta}
                requerido={requerido}
                error={errorCampo}
                ayuda={ayuda}
            >
                {inputElement}
            </CampoFormulario>
        );
    };

    // Calcular clases de layout
    const getLayoutClasses = () => {
        switch (layout) {
            case 'grid':
                return `grid gap-4 grid-cols-1 md:grid-cols-${columnas}`;
            case 'horizontal':
                return 'space-y-2';
            default:
                return 'space-y-4';
        }
    };

    // Calcular clase de ancho para campo
    const getClaseAncho = (ancho) => {
        switch (ancho) {
            case 'full':
                return 'col-span-full';
            case 'half':
                return 'col-span-1';
            case 'third':
                return 'col-span-1';
            default:
                return '';
        }
    };

    return (
        <form onSubmit={alEnviar} className={`flex flex-col gap-4 ${className}`}>
            {/* Título */}
            {titulo && (
                <h3 className="font-bold text-lg border-b border-base-200 pb-2">{titulo}</h3>
            )}

            {/* Campos */}
            <div className={getLayoutClasses()}>
                {campos.map((campo) => {
                    const elemento = renderizarCampo(campo);
                    if (!elemento) return null;

                    return layout === 'grid' ? (
                        <div key={campo.clave} className={getClaseAncho(campo.ancho)}>
                            {elemento}
                        </div>
                    ) : (
                        <React.Fragment key={campo.clave}>{elemento}</React.Fragment>
                    );
                })}
            </div>

            {/* Error general */}
            {error && (
                <div className="alert alert-error shadow-lg">
                    <span>{error}</span>
                </div>
            )}

            {/* Acciones */}
            {mostrarAcciones && (
                <div className="flex justify-end gap-3 pt-2 border-t border-base-200">
                    {alCancelar && (
                        <Boton
                            type="button"
                            variant="fantasma"
                            onClick={alCancelar}
                            deshabilitado={cargando}
                        >
                            {textoCancelar}
                        </Boton>
                    )}
                    <Boton
                        type="submit"
                        variant="primario"
                        cargando={cargando}
                    >
                        {textoGuardar}
                    </Boton>
                </div>
            )}
        </form>
    );
}

/**
 * Versión para usar dentro de un Modal
 */
export function FormularioModal({
    abierto,
    titulo,
    campos,
    valores,
    alCambiar,
    alEnviar,
    alCerrar,
    cargando,
    error,
    ...props
}) {
    if (!abierto) return null;

    return (
        <div className="modal modal-open bg-black/50 backdrop-blur-sm">
            <div className="modal-box w-11/12 max-w-2xl relative">
                <button
                    type="button"
                    onClick={alCerrar}
                    className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2"
                    disabled={cargando}
                >
                    ✕
                </button>

                <FormularioEntidad
                    titulo={titulo}
                    campos={campos}
                    valores={valores}
                    alCambiar={alCambiar}
                    alEnviar={alEnviar}
                    alCancelar={alCerrar}
                    cargando={cargando}
                    error={error}
                    {...props}
                />
            </div>
            <div className="modal-backdrop" onClick={!cargando ? alCerrar : undefined} />
        </div>
    );
}
