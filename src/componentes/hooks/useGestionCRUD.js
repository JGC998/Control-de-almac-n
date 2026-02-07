"use client";
import { useState, useCallback } from 'react';
import useSWR, { mutate } from 'swr';
import { fetcher } from '@/lib/fetcher';

/**
 * Hook useGestionCRUD - Encapsula toda la lógica CRUD para páginas de gestión
 * 
 * Elimina código duplicado en páginas como clientes, productos, proveedores, etc.
 * Maneja: fetch de datos, estados de modal, formulario, crear, editar, eliminar.
 * 
 * @param {Object} config - Configuración del hook
 * @param {string} config.recursoApi - URL base del API (ej: '/api/clientes')
 * @param {Object} config.camposIniciales - Estado inicial del formulario
 * @param {string} config.campoId - Campo que identifica el registro (default: 'id')
 * @param {function} config.transformarParaEnviar - Función para transformar datos antes de enviar
 * @param {function} config.transformarParaEditar - Función para transformar datos al abrir edición
 * 
 * @returns {Object} Objeto con datos, estados y funciones para gestionar CRUD
 * 
 * @example
 * const {
 *     datos, isLoading, error,
 *     formData, setFormData,
 *     isModalOpen, modoEdicion,
 *     abrirModalNuevo, abrirModalEditar, cerrarModal,
 *     handleChange, guardar, eliminar,
 *     guardando, errorGuardado
 * } = useGestionCRUD({
 *     recursoApi: '/api/clientes',
 *     camposIniciales: { nombre: '', email: '', telefono: '' }
 * });
 */
export function useGestionCRUD({
    recursoApi,
    camposIniciales = {},
    campoId = 'id',
    transformarParaEnviar = null,
    transformarParaEditar = null,
}) {
    // Estado de paginación
    const [pagina, setPagina] = useState(1);
    const [limite, setLimite] = useState(20);
    const [busqueda, setBusqueda] = useState('');

    // Estado del modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modoEdicion, setModoEdicion] = useState(false);
    const [entidadActual, setEntidadActual] = useState(null);

    // Estado del formulario
    const [formData, setFormData] = useState(camposIniciales);

    // Estados de operaciones
    const [guardando, setGuardando] = useState(false);
    const [errorGuardado, setErrorGuardado] = useState(null);

    // Resetear página al buscar
    const setBusquedaYResetear = useCallback((q) => {
        setBusqueda(q);
        setPagina(1);
    }, []);

    // Fetch de datos con SWR (soporta paginación y búsqueda)
    const queryParams = new URLSearchParams();
    queryParams.set('page', pagina);
    queryParams.set('limit', limite);
    if (busqueda) queryParams.set('q', busqueda);

    const {
        data: responseData,
        error,
        isLoading,
        mutate: refrescar
    } = useSWR(
        `${recursoApi}?${queryParams.toString()}`,
        fetcher,
        {
            keepPreviousData: true
        }
    );

    // Normalizar datos (soporta tanto array directo como respuesta paginada { data, meta })
    const datos = Array.isArray(responseData) ? responseData : (responseData?.data || []);
    const meta = responseData?.meta || {
        total: datos.length,
        page: pagina,
        limit: limite,
        totalPages: 1
    };

    // Resetear formulario y volver a primera página al crear
    const resetearFormulario = useCallback(() => {
        setFormData(camposIniciales);
        setEntidadActual(null);
        setErrorGuardado(null);
    }, [camposIniciales]);

    // Abrir modal para crear nuevo
    const abrirModalNuevo = useCallback(() => {
        resetearFormulario();
        setModoEdicion(false);
        setIsModalOpen(true);
    }, [resetearFormulario]);

    // Abrir modal para editar
    const abrirModalEditar = useCallback((entidad) => {
        setEntidadActual(entidad);
        setModoEdicion(true);
        setErrorGuardado(null);

        // Transformar datos si hay función personalizada
        const datosFormulario = transformarParaEditar
            ? transformarParaEditar(entidad)
            : { ...camposIniciales };

        // Mapear campos de la entidad al formulario
        Object.keys(camposIniciales).forEach(clave => {
            if (entidad[clave] !== undefined) {
                datosFormulario[clave] = entidad[clave] ?? '';
            }
        });

        setFormData(datosFormulario);
        setIsModalOpen(true);
    }, [camposIniciales, transformarParaEditar]);

    // Cerrar modal
    const cerrarModal = useCallback(() => {
        setIsModalOpen(false);
        // Pequeño delay para animación
        setTimeout(resetearFormulario, 150);
    }, [resetearFormulario]);

    // Manejar cambios en inputs
    const handleChange = useCallback((evento) => {
        const { name, value, type, checked } = evento.target;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox'
                ? checked
                : type === 'number'
                    ? (value === '' ? '' : parseFloat(value))
                    : value
        }));
    }, []);

    // Función para actualizar campo específico (útil para selects personalizados)
    const setCampo = useCallback((nombre, valor) => {
        setFormData(prev => ({ ...prev, [nombre]: valor }));
    }, []);

    // Guardar (crear o actualizar)
    const guardar = useCallback(async (evento) => {
        if (evento?.preventDefault) {
            evento.preventDefault();
        }

        setGuardando(true);
        setErrorGuardado(null);

        try {
            const esEdicion = modoEdicion && entidadActual;
            const url = esEdicion
                ? `${recursoApi}/${entidadActual[campoId]}`
                : recursoApi;
            const method = esEdicion ? 'PUT' : 'POST';

            // Transformar datos si hay función personalizada
            const datosEnviar = transformarParaEnviar
                ? transformarParaEnviar(formData, esEdicion)
                : formData;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosEnviar),
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || `Error al ${esEdicion ? 'actualizar' : 'crear'}`);
            }

            // Refrescar datos y cerrar modal
            await refrescar();
            cerrarModal();

            return { exito: true };
        } catch (err) {
            setErrorGuardado(err.message);
            return { exito: false, error: err.message };
        } finally {
            setGuardando(false);
        }
    }, [formData, modoEdicion, entidadActual, recursoApi, campoId, transformarParaEnviar, refrescar, cerrarModal]);

    // Eliminar
    const eliminar = useCallback(async (id, confirmar = true) => {
        if (confirmar && !window.confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            return { exito: false, cancelado: true };
        }

        try {
            const res = await fetch(`${recursoApi}/${id}`, { method: 'DELETE' });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al eliminar');
            }

            // Refrescar datos
            await refrescar();
            return { exito: true };
        } catch (err) {
            alert(err.message);
            return { exito: false, error: err.message };
        }
    }, [recursoApi, refrescar]);

    // Refrescar datos manualmente
    const recargar = useCallback(() => {
        return refrescar();
    }, [refrescar]);

    return {
        // Datos
        datos: datos || [],
        isLoading,
        error,

        // Estado del modal
        isModalOpen,
        modoEdicion,
        entidadActual,

        // Formulario
        formData,
        setFormData,
        handleChange,
        setCampo,

        // Acciones del modal
        abrirModalNuevo,
        abrirModalEditar,
        cerrarModal,

        // Operaciones CRUD
        guardar,
        eliminar,
        recargar,

        // Estados de operación
        guardando,
        errorGuardado,
        setErrorGuardado,
        pagina,
        setPagina,
        meta,
        busqueda,
        setBusqueda: setBusquedaYResetear,
    };
}

export default useGestionCRUD;
