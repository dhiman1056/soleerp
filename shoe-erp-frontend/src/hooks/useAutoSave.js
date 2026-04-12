import { useEffect, useCallback } from 'react'

export function useAutoSave(key, data, interval = 30000) {
  const saveData = useCallback(() => {
    if (Object.keys(data || {}).length > 0) {
       localStorage.setItem(`draft_${key}`, JSON.stringify(data))
    }
  }, [key, data])

  useEffect(() => {
    const timer = setInterval(() => {
      saveData()
    }, interval)

    return () => clearInterval(timer)
  }, [saveData, interval])

  const clearDraft = useCallback(() => {
    localStorage.removeItem(`draft_${key}`)
  }, [key])

  const getDraft = useCallback(() => {
    const d = localStorage.getItem(`draft_${key}`)
    return d ? JSON.parse(d) : null
  }, [key])

  return { getDraft, clearDraft, forceSave: saveData }
}
