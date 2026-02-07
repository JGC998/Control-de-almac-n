import { db } from '@/lib/db';

/**
 * Registra una acción en el Audit Log
 * 
 * @param {Object} params
 * @param {string} params.action - Tipo de acción ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', etc.)
 * @param {string} params.entity - Nombre de la entidad ('Producto', 'Pedido', 'Tarifa')
 * @param {string|number} params.entityId - ID de la entidad afectada
 * @param {Object} params.details - Detalles adicionales (ej. datos anteriores/nuevos)
 * @param {string} params.user - Usuario responsable del cambio (opcional, default: 'System')
 * @returns {Promise<Object>} - El registro de log creado
 */
export async function logAction({ action, entity, entityId, details, user = 'System' }) {
    try {
        // Si details es un objeto, asegurarnos de que sea serializable
        const safeDetails = details ? JSON.parse(JSON.stringify(details)) : null;

        const log = await db.auditLog.create({
            data: {
                action,
                entity,
                entityId: String(entityId), // Asegurar que sea string
                details: safeDetails,
                user,
            }
        });

        return log;
    } catch (error) {
        // No queremos que un fallo en el log rompa la operación principal
        console.error('❌ Error al registrar Audit Log:', error);
        return null;
    }
}

/**
 * Helper para registrar creación
 */
export async function logCreate(entity, entityId, newData, user) {
    return logAction({
        action: 'CREATE',
        entity,
        entityId,
        details: { newValue: newData },
        user
    });
}

/**
 * Helper para registrar actualización
 */
export async function logUpdate(entity, entityId, oldData, newData, user) {
    return logAction({
        action: 'UPDATE',
        entity,
        entityId,
        details: {
            oldValue: oldData,
            newValue: newData,
            changes: getChanges(oldData, newData)
        },
        user
    });
}

/**
 * Helper para registrar eliminación
 */
export async function logDelete(entity, entityId, oldData, user) {
    return logAction({
        action: 'DELETE',
        entity,
        entityId,
        details: { oldValue: oldData },
        user
    });
}

/**
 * Obtiene solo los campos que han cambiado
 */
function getChanges(oldData, newData) {
    if (!oldData || !newData) return null;

    const changes = {};
    Object.keys(newData).forEach(key => {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
            changes[key] = {
                from: oldData[key],
                to: newData[key]
            };
        }
    });
    return Object.keys(changes).length > 0 ? changes : null;
}
