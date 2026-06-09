// S9 — Rate limiting en memoria (Node.js, persiste dentro del proceso).
// Ventana deslizante de 1 minuto por IP.

const store = new Map(); // ip -> { count, resetAt }
const WINDOW_MS = 60_000;

// BUG-16: usar globalThis para que el interval no se duplique en hot-reload de Next.js dev
if (!globalThis.__rateLimiterInterval) {
  globalThis.__rateLimiterInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (now >= entry.resetAt) store.delete(key);
    }
  }, WINDOW_MS);
}

/**
 * @param {string} ip
 * @param {number} maxRequests - límite de peticiones por ventana (default 60)
 * @returns {{ allowed: boolean, remaining: number, retryAfter?: number }}
 */
export function checkRateLimit(ip, maxRequests = 60) {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now >= entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count += 1;
  if (entry.count > maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  return { allowed: true, remaining: maxRequests - entry.count };
}
