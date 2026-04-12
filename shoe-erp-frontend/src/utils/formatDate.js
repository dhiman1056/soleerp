/** Format ISO date string → '15 Jan 2024' */
export const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

/** Format date to YYYY-MM-DD for <input type="date"> */
export const toInputDate = (dateStr) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toISOString().slice(0, 10)
}

/** Today as YYYY-MM-DD */
export const today = () => new Date().toISOString().slice(0, 10)
