// src/utils/helpers-matematicos.js
export const roundToTwoDecimals = (value) => {
  // Garantiza que la entrada sea numérica y maneja NaN/null
  const number = parseFloat(value) || 0;
  return parseFloat(number.toFixed(2));
};
