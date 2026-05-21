const subs = new Set();

export function toast(msg, type = 'success', duration = 3500) {
  if (typeof window === 'undefined') return;
  const id = `${Date.now()}-${Math.random()}`;
  subs.forEach(fn => fn({ id, msg, type, duration }));
}

export const toastError = (msg) => toast(msg, 'error');
export const toastInfo  = (msg) => toast(msg, 'info');

export function subscribeToasts(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}
