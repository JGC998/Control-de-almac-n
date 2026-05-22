// S13 — Logging de errores API sin stack trace completo.
// Solo registra code + message + meta. No vuelca el objeto Error completo
// (que contiene rutas de módulos, queries Prisma, etc.).

export function logApiError(error, context = '') {
  const prefix = context ? `[${context}]` : '[API]';
  console.error(prefix, {
    name:    error?.name    || 'Error',
    message: error?.message || 'Error desconocido',
    code:    error?.code    || undefined,
    meta:    error?.meta    || undefined,
  });
}
