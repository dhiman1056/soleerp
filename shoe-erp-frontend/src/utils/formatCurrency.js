/**
 * Format a number as Indian Rupee currency.
 * e.g. 100000 → ₹1,00,000.00
 */
export const formatCurrency = (amount, decimals = 2) => {
  const num = parseFloat(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    style:                 'currency',
    currency:              'INR',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Format a number with Indian comma grouping (no symbol).
 * e.g. 100000 → 1,00,000.00
 */
export const formatNumber = (amount, decimals = 2) => {
  const num = parseFloat(amount) || 0
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}
