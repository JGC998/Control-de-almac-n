// Formatea un número como moneda (Euros en este caso)
export function formatCurrency(amount) {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Formatea un número como peso (kilogramos)
export function formatWeight(amount) {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('es-ES', {
    style: 'unit',
    unit: 'kilogram',
    unitDisplay: 'short',
  }).format(amount);
}