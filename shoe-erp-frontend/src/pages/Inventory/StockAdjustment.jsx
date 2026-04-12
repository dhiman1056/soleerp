import React from 'react';
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useCreateAdjustment, useStockSummaryQuery } from '../../hooks/useInventory'

export default function StockAdjustment({ isOpen, onClose }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { adj_date: new Date().toISOString().slice(0, 10), adjustment_type: 'IN', qty: '', rate: '' }
  })
  
  const createMut = useCreateAdjustment()
  const { data: stockData } = useStockSummaryQuery()
  const stockSummary = stockData?.data || []

  const selectedSku = watch('sku_code')
  const adjType = watch('adjustment_type')
  const watchQty = watch('qty')
  
  const [currentStock, setCurrentStock] = useState(0)

  useEffect(() => {
    if (selectedSku) {
      const s = stockSummary.find(r => r.sku_code === selectedSku)
      if (s) {
        setCurrentStock(parseFloat(s.current_qty))
        if(adjType === 'IN' && !watch('rate')) {
           setValue('rate', s.avg_rate)
        } else if (adjType === 'OUT') {
           setValue('rate', s.avg_rate)
        }
      } else {
        setCurrentStock(0)
      }
    }
  }, [selectedSku, stockSummary, adjType, setValue])

  if (!isOpen) return null

  const onSubmit = (data) => {
    if (data.adjustment_type === 'OUT' && parseFloat(data.qty) > currentStock) {
       toast.error(`Cannot adjust out more than current stock (${currentStock})`)
       return
    }

    createMut.mutate(data, {
      onSuccess: () => {
        toast.success('Adjustment successful')
        reset()
        onClose()
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || err.message || 'Error adjusting stock')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900">Manual Stock Adjustment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            ✕
          </button>
        </div>

        <div className="p-6">
          <form id="adj-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Date</label>
              <input type="date" {...register('adj_date', { required: 'Required' })} className="input-field w-full" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material SKU</label>
              <select {...register('sku_code', { required: 'Required' })} className="input-field w-full font-mono text-sm">
                <option value="">-- Select Material / Product --</option>
                {stockSummary.map(r => (
                  <option key={r.sku_code} value={r.sku_code}>{r.sku_code} - {r.sku_description}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select {...register('adjustment_type')} className={`input-field w-full font-bold ${adjType === 'IN' ? 'text-teal-700 bg-teal-50' : 'text-red-700 bg-red-50'}`}>
                  <option value="IN">ADD (+)</option>
                  <option value="OUT">DEDUCT (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" step="0.001" {...register('qty', { required: 'Required', min: 0.001 })} className="input-field w-full text-right bg-blue-50/50" placeholder="0" />
              </div>
            </div>

            {selectedSku && (
              <div className="text-xs flex justify-between px-2 py-1 bg-gray-50 rounded">
                <span className="text-gray-500">Current Stock:</span>
                <span className={`font-bold tabular-nums ${adjType === 'OUT' && watchQty > currentStock ? 'text-red-600' : 'text-gray-800'}`}>
                  {currentStock.toFixed(3)}
                </span>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rate / Cost (₹)</label>
              <input type="number" step="0.01" {...register('rate', { required: 'Required', min: 0 })} readOnly={adjType === 'OUT'} className={`input-field w-full text-right ${adjType === 'OUT' ? 'bg-gray-100 text-gray-500' : ''}`} />
              {adjType === 'OUT' && <span className="text-xs text-gray-400">Locked to average cost for deductions.</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea {...register('reason', { required: 'Reason is strictly required' })} rows="2" className="input-field w-full" placeholder="Physical audit mismatch..." />
              {errors.reason && <p className="text-red-500 text-xs mt-1">{errors.reason.message}</p>}
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="adj-form" disabled={createMut.isPending} className={`btn-primary ${adjType === 'IN' ? 'bg-teal-600 hover:bg-teal-700' : 'bg-red-600 hover:bg-red-700'}`}>
            {createMut.isPending ? 'Processing...' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}
