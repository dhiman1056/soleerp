import React, { useState, useRef, useEffect, useMemo } from 'react'

/**
 * SearchableSelect
 * A high-performance, rock-solid searchable select dropdown.
 * Uses in-flow relative/absolute anchoring with zero-coordinate latency.
 * Eliminates top-left detached rendering, coordinate jumping, and portal desync.
 */
export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '— Select —',
  searchPlaceholder = 'Type to search...',
  disabled = false,
  error = false,
  className = '',
  isClearable = true,
  id,
  name
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [openUpward, setOpenUpward] = useState(false)

  const containerRef = useRef(null)
  const searchInputRef = useRef(null)
  const listRef = useRef(null)

  // Normalize options into { value, label, subLabel, badge, searchKey }
  const normalizedOptions = useMemo(() => {
    return options.map(opt => {
      if (typeof opt === 'string' || typeof opt === 'number') {
        return {
          value: opt,
          label: String(opt),
          searchKey: String(opt).toLowerCase()
        }
      }
      return {
        value: opt.value,
        label: opt.label ?? String(opt.value),
        subLabel: opt.subLabel ?? null,
        badge: opt.badge ?? null,
        searchKey: (
          `${opt.label || ''} ${opt.subLabel || ''} ${opt.badge || ''} ${opt.searchKey || ''}`
        ).toLowerCase()
      }
    })
  }, [options])

  // Selected option object
  const selectedOption = useMemo(() => {
    if (value === undefined || value === null || value === '') return null
    return normalizedOptions.find(opt => String(opt.value) === String(value)) || null
  }, [value, normalizedOptions])

  // Filtered list based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions
    const q = search.trim().toLowerCase()
    return normalizedOptions.filter(opt => opt.searchKey.includes(q))
  }, [normalizedOptions, search])

  // Reset highlight index when filtered list changes
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions])

  // Toggle open and detect upward/downward direction
  const handleToggle = () => {
    if (disabled) return
    if (!isOpen) {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        // If space below is less than 240px and space above is larger, open upward
        setOpenUpward(spaceBelow < 240 && rect.top > spaceBelow)
      }
      setIsOpen(true)
    } else {
      setIsOpen(false)
    }
  }

  // Autofocus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus()
      }, 30)
      return () => clearTimeout(timer)
    } else {
      setSearch('')
    }
  }, [isOpen])

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const el = listRef.current.children[highlightedIndex]
      if (el) {
        el.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [highlightedIndex, isOpen])

  const handleSelect = (val) => {
    if (onChange) {
      onChange(val)
    }
    setIsOpen(false)
    setSearch('')
  }

  const handleClear = (e) => {
    e.stopPropagation()
    if (onChange) {
      onChange('')
    }
    setSearch('')
  }

  const handleKeyDown = (e) => {
    if (disabled) return

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        handleToggle()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredOptions[highlightedIndex]) {
        handleSelect(filteredOptions[highlightedIndex].value)
      }
    } else if (e.key === 'Escape' || e.key === 'Tab') {
      setIsOpen(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${isOpen ? 'z-40' : 'z-10'} ${className}`}
      onKeyDown={handleKeyDown}
      id={id ? `${id}-container` : undefined}
    >
      {/* Hidden input for form integrations */}
      {name && (
        <input
          type="hidden"
          name={name}
          value={value ?? ''}
          id={id}
        />
      )}

      {/* Main trigger bar */}
      <div
        tabIndex={disabled ? -1 : 0}
        onClick={handleToggle}
        className={`w-full min-h-[40px] px-3 py-2 bg-white rounded-lg border text-sm flex items-center justify-between gap-2 cursor-pointer transition-all duration-150 ${
          disabled
            ? 'bg-slate-100/70 border-slate-200 text-slate-400 cursor-not-allowed'
            : isOpen
              ? 'border-indigo-600 ring-2 ring-indigo-500/15 shadow-xs'
              : error
                ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-400/20'
                : 'border-slate-200 hover:border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/15'
        }`}
      >
        <div className="flex-1 truncate">
          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-slate-800 truncate">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-xs text-slate-400 font-normal truncate">
                  ({selectedOption.subLabel})
                </span>
              )}
              {selectedOption.badge && (
                <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400 text-sm font-normal">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-400 flex-shrink-0">
          {isClearable && selectedOption && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
              title="Clear selection"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}

          <svg
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* In-flow Dropdown Panel */}
      {isOpen && !disabled && (
        <div
          className={`absolute left-0 right-0 z-50 bg-white rounded-xl shadow-2xl border border-slate-200/90 overflow-hidden flex flex-col max-h-72 animate-in fade-in duration-100 ${
            openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          onClick={e => e.stopPropagation()}
        >
          {/* Live Search input */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/70 flex-shrink-0">
            <div className="relative">
              <svg
                className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 placeholder-slate-400 transition-colors"
                onKeyDown={handleKeyDown}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                >
                  ×
                </button>
              )}
            </div>
            {search.trim() && (
              <div className="flex justify-between items-center px-1 pt-1.5 text-[11px] text-slate-400">
                <span>{filteredOptions.length} matching result{filteredOptions.length === 1 ? '' : 's'}</span>
                {filteredOptions.length > 0 && <span>Press Enter to select</span>}
              </div>
            )}
          </div>

          {/* Options list */}
          <div
            ref={listRef}
            className="overflow-y-auto p-1 divide-y divide-slate-50/70 flex-1 min-h-0"
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center">
                <p className="text-xs font-semibold text-slate-600">No results found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Try searching with a different keyword</p>
              </div>
            ) : (
              filteredOptions.map((opt, idx) => {
                const isSelected = selectedOption && String(selectedOption.value) === String(opt.value)
                const isHighlighted = idx === highlightedIndex

                return (
                  <div
                    key={`${opt.value}-${idx}`}
                    onClick={() => handleSelect(opt.value)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`px-3 py-2 rounded-lg text-xs cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                      isSelected
                        ? 'bg-indigo-50/90 text-indigo-900 font-semibold'
                        : isHighlighted
                          ? 'bg-slate-100/90 text-slate-900 font-medium'
                          : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-1 truncate">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="truncate">{opt.label}</span>
                        {opt.subLabel && (
                          <span className={`text-[11px] font-normal truncate ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`}>
                            ({opt.subLabel})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {opt.badge && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                          {opt.badge}
                        </span>
                      )}
                      {isSelected && (
                        <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
