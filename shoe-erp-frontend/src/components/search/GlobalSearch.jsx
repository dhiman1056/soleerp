import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import * as api from '../../api/searchApi'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts'

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef(null)
  const navigate = useNavigate()

  useKeyboardShortcuts({
    onSearch: () => { inputRef.current?.focus(); setIsOpen(true) },
    onEscape: () => setIsOpen(false)
  })

  // Debounce input logic
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300)
    return () => clearTimeout(timer)
  }, [query])

  const { data, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => api.fetchGlobalSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2,
    staleTime: 60000
  })

  const results = data?.data || []

  // Ensure dropdown closes if click outside
  useEffect(() => {
    const clickOutside = (e) => {
       if (isOpen && !e.target.closest('#global-search-container')) setIsOpen(false)
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [isOpen])

  const handleSelect = (r) => {
    setIsOpen(false)
    setQuery('')
    if (r.type === 'inventory/stock') {
      navigate(`/inventory/stock?search=${r.queryKey}`)
    } else {
      navigate(`/${r.type.replace('_', '-')}/${r.target_id}`)
    }
  }

  return (
    <div id="global-search-container" className="relative w-full max-w-md">
      <div className="relative flex items-center w-full">
        <svg className="w-4 h-4 absolute left-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        <input 
          ref={inputRef}
          type="text" 
          placeholder="Search BOMs, Orders, Suppliers (Cmd+K)" 
          className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setIsOpen(true) }}
          onFocus={() => setIsOpen(true)}
        />
      </div>

      {isOpen && query.length >= 2 && (
        <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-xl border border-gray-100 max-h-96 overflow-y-auto z-50">
          {isLoading && <div className="p-4 text-center text-xs text-gray-500">Searching global registry...</div>}
          
          {!isLoading && results.length === 0 && (
             <div className="p-4 text-center text-xs text-gray-500">No results matched "{query}"</div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="py-2">
              {results.map((r, i) => (
                <button 
                  key={i} 
                  onClick={() => handleSelect(r)}
                  className="w-full text-left px-4 py-2 hover:bg-blue-50 focus:bg-blue-50 outline-none flex flex-col transition-colors border-b border-gray-50 last:border-0"
                >
                  <span className="text-sm font-bold text-gray-900">{r.title}</span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-[10px] text-gray-500">{r.subtitle}</span>
                    <span className="text-[9px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{r.type.replace('_',' ')}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
