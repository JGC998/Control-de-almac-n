/**
 * Fetcher global para SWR
 * Maneja errores y retorna JSON automáticamente
 * 
 * @example
 * import { fetcher } from '@/lib/fetcher';
 * const { data } = useSWR('/api/clientes', fetcher);
 */
export const fetcher = async (url) => {
    const res = await fetch(url);

    if (!res.ok) {
        const error = new Error('Error al cargar datos');
        error.info = await res.json().catch(() => ({}));
        error.status = res.status;
        throw error;
    }

    return res.json();
};

/**
 * Versión del fetcher con opciones adicionales
 */
export const fetcherConOpciones = async ([url, opciones]) => {
    const res = await fetch(url, opciones);

    if (!res.ok) {
        const error = new Error('Error en la petición');
        error.info = await res.json().catch(() => ({}));
        error.status = res.status;
        throw error;
    }

    return res.json();
};

export default fetcher;
