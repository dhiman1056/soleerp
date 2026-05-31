import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import api from '../../api/axiosInstance'
import toast from 'react-hot-toast'

export default function ImportModal({ isOpen, onClose, masterName, templateColumns, importUrl, onSuccess }) {
  if (!isOpen) return null

  const [step, setStep] = useState(1) // 1: Upload & Preview, 2: Results
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState([])
  const [previewRows, setPreviewRows] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [results, setResults] = useState(null) // { imported, skipped, errors }

  const fileInputRef = useRef(null)

  // ─── Step 1: Dynamic Sample Template CSV Download ──────────────────────────
  const downloadSampleTemplate = () => {
    // Build CSV header row
    const headers = templateColumns.map(col => `"${col.label.replace(/"/g, '""')}"`).join(',')
    
    // Build 2 example rows
    const exampleRows = []
    const row1 = templateColumns.map(col => {
      const val = col.example || ''
      return `"${val.replace(/"/g, '""')}"`
    }).join(',')
    
    const row2 = templateColumns.map(col => {
      // Create a slightly altered variation for second example row
      const val = col.example ? `${col.example} 2` : ''
      return `"${val.replace(/"/g, '""')}"`
    }).join(',')
    
    exampleRows.push(row1, row2)
    
    const csvContent = [headers, ...exampleRows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `sample_${masterName.toLowerCase().replace(/\s+/g, '_')}_template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('Sample template downloaded')
  }

  // ─── Step 2: Mapping columns from CSV/Excel to keys ────────────────────────
  const mapParsedRows = (rawRows) => {
    return rawRows.map(row => {
      const mapped = {}
      templateColumns.forEach(col => {
        const possibleKeys = [col.label, col.key]
        let value = undefined
        
        for (const k of possibleKeys) {
          // Try exact match first
          if (row[k] !== undefined) {
            value = row[k]
            break
          }
          // Try case-insensitive and trimmed key matching
          const foundKey = Object.keys(row).find(
            rk => rk.toLowerCase().trim() === k.toLowerCase().trim()
          )
          if (foundKey !== undefined) {
            value = row[foundKey]
            break
          }
        }
        mapped[col.key] = value !== undefined && value !== null ? String(value).trim() : ''
      })
      return mapped
    })
  }

  // ─── Step 3: Handle uploaded files ─────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    setFileName(file.name)
    const fileExtension = file.name.split('.').pop().toLowerCase()

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (results) => {
          if (results.errors.length > 0) {
            toast.error('Error parsing CSV file')
            return
          }
          const mapped = mapParsedRows(results.data)
          setParsedRows(mapped)
          setPreviewRows(results.data.slice(0, 5))
        }
      })
    } else if (['xlsx', 'xls'].includes(fileExtension)) {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const data = new Uint8Array(evt.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
          
          const mapped = mapParsedRows(rawJson)
          setParsedRows(mapped)
          setPreviewRows(rawJson.slice(0, 5))
        } catch (err) {
          toast.error('Error reading Excel spreadsheet')
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Unsupported file format. Please upload .csv or .xlsx')
    }
  }

  // ─── Step 4: Import execution ──────────────────────────────────────────────
  const handleImportSubmit = async () => {
    if (parsedRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setIsImporting(true)
    try {
      const res = await api.post(importUrl, { rows: parsedRows })
      if (res.data.success) {
        setResults({
          imported: res.data.imported || 0,
          skipped: res.data.skipped || 0,
          errors: res.data.errors || []
        })
        setStep(2)
        toast.success('Import completed successfully')
      } else {
        toast.error(res.data.message || 'Import failed')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Server error occurred during import')
    } finally {
      setIsImporting(false)
    }
  }

  const resetModal = () => {
    setStep(1)
    setFileName('')
    setParsedRows([])
    setPreviewRows([])
    setResults(null)
    setIsImporting(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-gray-100 transform scale-100 flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex-shrink-0">
          <div>
            <h3 className="text-lg font-bold">Import Data - {masterName}</h3>
            <p className="text-xs text-blue-100 mt-0.5">Upload CSV or Excel templates directly to database</p>
          </div>
          <button
            onClick={() => { resetModal(); onClose() }}
            className="p-1.5 rounded-lg text-blue-100 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {step === 1 ? (
          <div className="p-6 overflow-y-auto space-y-5 flex-1 flex flex-col min-h-0">
            
            {/* Step 1: Download Sample template */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-blue-900">Step 1: Download Sample CSV Template</h4>
                <p className="text-xs text-blue-700 mt-0.5">Get a pre-formatted structure with instructions and examples.</p>
              </div>
              <button
                type="button"
                onClick={downloadSampleTemplate}
                className="btn-primary py-2 px-4 text-xs flex items-center gap-2 whitespace-nowrap bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download Sample
              </button>
            </div>

            {/* Step 2: Upload zone */}
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-gray-800">Step 2: Upload CSV or Excel file</h4>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-blue-500 rounded-2xl p-6 text-center cursor-pointer transition-all bg-gray-50/50 hover:bg-blue-50/20 group"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .xlsx, .xls"
                  className="hidden"
                />
                
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 group-hover:text-blue-500 mx-auto transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-bold text-gray-700 mt-2">
                  {fileName ? `Selected file: ${fileName}` : 'Click to select file'}
                </p>
                <p className="text-xs text-gray-400 mt-1">Supports CSV, XLSX or XLS formats</p>
              </div>
            </div>

            {/* Step 3: Raw Preview Table */}
            {previewRows.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <h4 className="text-sm font-bold text-gray-800">Step 3: Preview Parsed Rows (First 5 records)</h4>
                <div className="overflow-auto border border-gray-100 rounded-xl flex-1 max-h-[220px]">
                  <table className="w-full text-xs text-left bg-white">
                    <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 uppercase font-semibold">
                      <tr>
                        <th className="px-4 py-2 border-r border-gray-100 text-center w-12">#</th>
                        {templateColumns.map(col => (
                          <th key={col.key} className="px-4 py-2 whitespace-nowrap">{col.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {previewRows.map((row, idx) => {
                        const mappedRow = mapParsedRows([row])[0]
                        return (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="px-4 py-2 border-r border-gray-100 text-center font-mono text-gray-400 font-semibold">{idx + 1}</td>
                            {templateColumns.map(col => (
                              <td key={col.key} className="px-4 py-2 truncate max-w-[200px]" title={mappedRow[col.key]}>
                                {mappedRow[col.key] || <span className="text-gray-300 italic">empty</span>}
                              </td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => { resetModal(); onClose() }}
                className="btn-secondary"
                disabled={isImporting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportSubmit}
                className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2 whitespace-nowrap"
                disabled={isImporting || parsedRows.length === 0}
              >
                {isImporting ? 'Importing…' : `Start Import (${parsedRows.length} rows)`}
              </button>
            </div>

          </div>
        ) : (
          <div className="p-6 overflow-y-auto space-y-6 flex-1 flex flex-col min-h-0">
            
            {/* Import results summary boxes */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl text-center">
                <span className="text-2xl">✅</span>
                <p className="text-2xl font-black text-green-700 mt-1">{results?.imported || 0}</p>
                <p className="text-xs text-green-600 font-bold uppercase tracking-wider mt-0.5">Imported</p>
              </div>
              
              <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-center">
                <span className="text-2xl">⚠️</span>
                <p className="text-2xl font-black text-amber-700 mt-1">{results?.skipped || 0}</p>
                <p className="text-xs text-amber-600 font-bold uppercase tracking-wider mt-0.5">Skipped (Dup)</p>
              </div>
              
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-center">
                <span className="text-2xl">❌</span>
                <p className="text-2xl font-black text-red-700 mt-1">{results?.errors?.length || 0}</p>
                <p className="text-xs text-red-600 font-bold uppercase tracking-wider mt-0.5">Errors</p>
              </div>
            </div>

            {/* Error detail listing table */}
            {results?.errors?.length > 0 && (
              <div className="flex-1 flex flex-col min-h-0 space-y-2">
                <h4 className="text-sm font-bold text-gray-800">Validation Errors Log</h4>
                <div className="overflow-auto border border-red-100 rounded-xl bg-red-50/20 max-h-[250px] flex-1">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-red-100/60 border-b border-red-200 text-red-700 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-2 text-center w-20">Row No.</th>
                        <th className="px-4 py-2">Failure Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100/60 text-red-900 font-medium">
                      {results.errors.map((err, idx) => (
                        <tr key={idx} className="hover:bg-red-50/30">
                          <td className="px-4 py-2 text-center font-mono font-bold">{err.row}</td>
                          <td className="px-4 py-2">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-end pt-4 border-t border-gray-100 flex-shrink-0">
              <button
                type="button"
                onClick={() => {
                  resetModal()
                  onSuccess()
                }}
                className="btn-primary bg-gradient-to-r from-blue-600 to-indigo-600"
              >
                Close & Refresh
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
