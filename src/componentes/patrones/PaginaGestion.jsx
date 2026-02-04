"use client";
import React from 'react';
import Link from 'next/link';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';

import { useGestionCRUD } from '../hooks';
import { FormularioModal } from '../compuestos/FormularioEntidad';
import TablaDatos from '../compuestos/TablaDatos';
import { ContenedorCargando } from '../ui';
import { useConfirmacion } from '../ui/ModalConfirmacion';

/**
 * Componente PaginaGestion - Patrón completo para páginas CRUD
 * 
 * Integra todos los componentes y hooks para crear una página de gestión
 * completa con solo ~30 líneas de configuración.
 * 
 * @param {Object} props
 * @param {string} titulo - Título de la página
 * @param {React.ElementType} icono - Icono para el título
 * @param {string} recursoApi - URL base del API (ej: '/api/clientes')
 * @param {Array<ColumnaDef>} columnas - Definición de columnas para la tabla
 * @param {Array<CampoDef>} campos - Definición de campos para el formulario
 * @param {Object} camposIniciales - Estado inicial del formulario (opcional, se genera de campos)
 * @param {string} rutaDetalle - Ruta base para ver detalle (ej: '/gestion/clientes')
 * @param {string} tituloNuevo - Título del modal para crear nuevo
 * @param {string} tituloEditar - Título del modal para editar
 * @param {boolean} mostrarBotonNuevo - Mostrar botón de nuevo registro
 * @param {boolean} mostrarAccionesTabla - Mostrar columna de acciones en tabla
 * @param {function} transformarParaEnviar - Transformar datos antes de enviar
 * @param {function} transformarParaEditar - Transformar datos al abrir edición
 * @param {React.ReactNode} accionesExtra - Botones adicionales en el header
 * @param {React.ReactNode} filtrosExtra - Componentes de filtros adicionales
 * 
 * ColumnaDef = {
 *   clave: string,          // Campo del objeto (soporta anidados: "cliente.nombre")
 *   etiqueta: string,       // Header de la columna
 *   formato?: 'moneda'|'fecha'|'insignia',  // Formato especial
 *   insigniaConfig?: { [valor]: variante }  // Config para formato 'insignia'
 * }
 * 
 * CampoDef = {
 *   clave: string,              // Nombre del campo (name)
 *   etiqueta?: string,          // Label
 *   tipo?: 'texto'|'numero'|'email'|'password'|'selector'|'textarea'|'checkbox',
 *   requerido?: boolean,        // Si es obligatorio
 *   opciones?: Array,           // Para tipo 'selector'
 *   ... (ver FormularioEntidad)
 * }
 * 
 * @example
 * import PaginaGestion from '@/componentes/patrones/PaginaGestion';
 * import { User } from 'lucide-react';
 * 
 * const columnas = [
 *     { clave: 'nombre', etiqueta: 'Nombre' },
 *     { clave: 'email', etiqueta: 'Email' },
 * ];
 * 
 * const campos = [
 *     { clave: 'nombre', requerido: true },
 *     { clave: 'email', tipo: 'email' },
 * ];
 * 
 * export default function ClientesPage() {
 *     return (
 *         <PaginaGestion
 *             titulo="Clientes"
 *             icono={User}
 *             recursoApi="/api/clientes"
 *             columnas={columnas}
 *             campos={campos}
 *             rutaDetalle="/gestion/clientes"
 *         />
 *     );
 * }
 */
export default function PaginaGestion({
    titulo,
    icono: Icono = null,
    recursoApi,
    columnas = [],
    campos = [],
    camposIniciales = null,
    rutaDetalle = null,
    tituloNuevo = null,
    tituloEditar = null,
    mostrarBotonNuevo = true,
    mostrarAccionesTabla = true,
    transformarParaEnviar = null,
    transformarParaEditar = null,
    accionesExtra = null,
    filtrosExtra = null,
    className = '',
}) {
    // Generar campos iniciales automáticamente si no se proporcionan
    const camposInicialesGenerados = camposIniciales || campos.reduce((acc, campo) => {
        acc[campo.clave] = campo.valorInicial ?? '';
        return acc;
    }, {});

    // Hook de gestión CRUD
    const {
        datos,
        isLoading,
        error,
        formData,
        handleChange,
        isModalOpen,
        modoEdicion,
        abrirModalNuevo,
        abrirModalEditar,
        cerrarModal,
        guardar,
        eliminar,
        guardando,
        errorGuardado,
        recargar,
    } = useGestionCRUD({
        recursoApi,
        camposIniciales: camposInicialesGenerados,
        transformarParaEnviar,
        transformarParaEditar,
    });

    // Hook de confirmación para eliminar
    const { confirmar, ModalConfirmacion } = useConfirmacion();

    // Manejar eliminación con confirmación
    const handleEliminar = async (id) => {
        const confirmado = await confirmar({
            titulo: '¿Eliminar registro?',
            mensaje: 'Esta acción no se puede deshacer.',
            variante: 'peligro',
        });

        if (confirmado) {
            await eliminar(id, false); // false = ya confirmado
        }
    };

    // Columnas con acciones de editar/eliminar
    const columnasConAcciones = mostrarAccionesTabla
        ? [
            ...columnas,
            {
                clave: '_acciones',
                etiqueta: 'Acciones',
                render: (fila) => (
                    <div className="flex gap-1">
                        <button
                            onClick={() => abrirModalEditar(fila)}
                            className="btn btn-sm btn-ghost text-info"
                            title="Editar"
                        >
                            <Edit className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => handleEliminar(fila.id)}
                            className="btn btn-sm btn-ghost text-error"
                            title="Eliminar"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                ),
            },
        ]
        : columnas;

    // Títulos por defecto
    const tituloModalNuevo = tituloNuevo || `Nuevo ${titulo?.replace(/s$/, '') || 'Registro'}`;
    const tituloModalEditar = tituloEditar || `Editar ${titulo?.replace(/s$/, '') || 'Registro'}`;

    return (
        <div className={`container mx-auto p-4 ${className}`}>
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    {Icono && <Icono className="w-8 h-8" />}
                    {titulo}
                </h1>
                <div className="flex gap-2">
                    {accionesExtra}
                    {mostrarBotonNuevo && (
                        <button onClick={abrirModalNuevo} className="btn btn-primary">
                            <PlusCircle className="w-4 h-4" />
                            Nuevo
                        </button>
                    )}
                </div>
            </div>

            {/* Filtros extra */}
            {filtrosExtra && (
                <div className="mb-4">
                    {filtrosExtra}
                </div>
            )}

            {/* Contenido principal */}
            <ContenedorCargando
                isLoading={isLoading}
                error={error}
                alReintentar={recargar}
            >
                <div className="card bg-base-100 shadow-xl">
                    <div className="overflow-x-auto">
                        <TablaDatos
                            datos={datos}
                            columnas={columnasConAcciones}
                            rutaBase={rutaDetalle}
                            mostrarAccionVer={!!rutaDetalle}
                        />
                    </div>
                </div>
            </ContenedorCargando>

            {/* Modal de formulario */}
            <FormularioModal
                abierto={isModalOpen}
                titulo={modoEdicion ? tituloModalEditar : tituloModalNuevo}
                campos={campos}
                valores={formData}
                alCambiar={handleChange}
                alEnviar={guardar}
                alCerrar={cerrarModal}
                cargando={guardando}
                error={errorGuardado}
            />

            {/* Modal de confirmación */}
            <ModalConfirmacion />
        </div>
    );
}
