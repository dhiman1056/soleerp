import { useEffect } from 'react'

export function useKeyboardShortcuts({
  onSearch,
  onNew,
  onEscape,
  onPrint
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // CMD+K or CTRL+K for Global Search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        if (onSearch) {
          e.preventDefault()
          onSearch()
        }
      }
      
      // CMD+N or CTRL+N for New Element overlay
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        if (onNew) {
          e.preventDefault()
          onNew()
        }
      }

      // CMD+P or CTRL+P for printing current context
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
         if (onPrint) {
           e.preventDefault();
           onPrint();
         }
      }

      // Esc
      if (e.key === 'Escape') {
        if (onEscape) {
          e.preventDefault()
          onEscape()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSearch, onNew, onEscape, onPrint])
}
