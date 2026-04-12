import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import Loader from './Loader.jsx';

export default function Table({
  columns,
  data = [],
  loading = false,
  empty = 'No records found.',
  pagination = null,
  onRowClick = null,
  stickyHeader = true,
  enableExport = true,
  enableColumnToggle = true,
  filename = 'export.csv' // export filename
}) {
  const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };
  
  // State for column visibility
  const [visibleColumns, setVisibleColumns] = useState(
    columns.reduce((acc, col) => ({ ...acc, [col.key]: true }), {})
  );
  const [showColMenu, setShowColMenu] = useState(false);

  const toggleColumn = (key) => {
    setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleExportCSV = () => {
    if (!data || !data.length) return;
    
    const activeCols = columns.filter(c => visibleColumns[c.key]);
    const headers = activeCols.map(c => `"${c.label.replace(/"/g, '""')}"`).join(',');
    
    const rows = data.map(row => {
      return activeCols.map(col => {
        let val = row[col.key];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'string') val = val.replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    });

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="card overflow-hidden flex flex-col relative w-full">
      {/* Table Toolbar */}
      {(enableExport || enableColumnToggle) && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-end gap-3 bg-gray-50/50">
          {enableExport && (
             <button 
                onClick={handleExportCSV}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded text-gray-600 bg-white hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
             >
               <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
               Export CSV
             </button>
          )}
          
          {enableColumnToggle && (
            <div className="relative">
              <button 
                onClick={() => setShowColMenu(!showColMenu)}
                className="text-xs px-3 py-1.5 border border-gray-200 rounded text-gray-600 bg-white hover:bg-gray-50 transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>
                Columns
              </button>
              {showColMenu && (
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 p-2">
                  <div className="text-xs font-semibold text-gray-500 mb-2 px-2 uppercase tracking-wide">Visible Columns</div>
                  <div className="max-h-60 overflow-y-auto">
                    {columns.map(col => (
                      <label key={col.key} className="flex items-center px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                          checked={visibleColumns[col.key]} 
                          onChange={() => toggleColumn(col.key)} 
                        />
                        <span className="ml-2 text-sm text-gray-700">{col.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showColMenu && <div className="fixed inset-0 z-40" onClick={() => setShowColMenu(false)}></div>}

      <div className="overflow-x-auto w-full relative">
        <table className="w-full text-sm">
          <thead>
            <tr className={`border-b border-gray-100 bg-gray-50 ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
              {columns.map((col, idx) => {
                if (!visibleColumns[col.key]) return null;
                const isStickyFirstCol = idx === 0 ? 'sticky left-0 bg-gray-50 z-20 shadow-[1px_0_0_#f3f4f6]' : '';
                return (
                  <th
                    key={col.key}
                    className={`px-4 py-3 font-semibold text-xs text-gray-500 uppercase tracking-wider whitespace-nowrap
                      ${alignClass[col.align || 'left']} ${col.className || ''} ${isStickyFirstCol}`}
                  >
                    {col.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.filter(c => visibleColumns[c.key]).length} className="py-12 text-center">
                  <Loader />
                </td>
              </tr>
            ) : !data.length ? (
              <tr>
                <td colSpan={columns.filter(c => visibleColumns[c.key]).length} className="py-12 text-center text-gray-400 text-sm">
                  {empty}
                </td>
              </tr>
            ) : (
              data.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-50 transition-colors
                    ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                    ${onRowClick ? 'cursor-pointer hover:bg-blue-50/50' : 'hover:bg-gray-50'}`}
                >
                  {columns.map((col, idx) => {
                    if (!visibleColumns[col.key]) return null;
                    const isStickyFirstCol = idx === 0 
                      ? `sticky left-0 z-10 shadow-[1px_0_0_#f3f4f6] ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}` 
                      : '';
                    return (
                      <td
                        key={col.key}
                        className={`px-4 py-3 text-gray-700 ${alignClass[col.align || 'left']} ${col.className || ''} ${isStickyFirstCol}`}
                      >
                        {col.render ? col.render(row, i) : row[col.key] ?? '—'}
                      </td>
                    )
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between bg-white mt-auto">
          <span className="text-xs text-gray-500">
            Showing {((pagination.page - 1) * pagination.limit) + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </span>
          <div className="flex gap-1">
            <button
              disabled={pagination.page <= 1}
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              ‹ Prev
            </button>
            {Array.from({ length: Math.min(pagination.pages, 7) }, (_, i) => {
              const p = i + 1
              return (
                <button
                  key={p}
                  onClick={() => pagination.onPageChange(p)}
                  className={`px-3 py-1.5 text-xs rounded-md border transition-colors
                    ${p === pagination.page
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  {p}
                </button>
              )
            })}
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              className="px-3 py-1.5 text-xs rounded-md border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
