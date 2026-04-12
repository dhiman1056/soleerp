import React from 'react';
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useCreatePurchase } from '../../hooks/useInventory'
import { useRawMaterialsQuery } from '../../hooks/useRawMaterials'

export default function PurchaseForm({ isOpen, onClose }) {
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm({
    defaultValues: { purchase_date: new Date().toISOString().slice(0, 10), qty: '', rate: '' }
  })
  
  const createMut = useCreatePurchase()
  const { data: rmData } = useRawMaterialsQuery({ is_active: 'true', limit: 1000 })
  const rawMaterials = rmData?.data || []

  const selectedSku = watch('sku_code')
  const watchQty = watch('qty')
  const watchRate = watch('rate')
  
  const [totalValue, setTotalValue] = useState(0)

  useEffect(() => {
    if (selectedSku) {
      const rm = rawMaterials.find(r => r.sku_code === selectedSku)
      if (rm) {
        setValue('sku_description', rm.description)
        setValue('uom', rm.uom)
        // Auto-fill rate if not manually touched, or just set it
        if (!watchRate) setValue('rate', rm.rate)
      }
    }
  }, [selectedSku, rawMaterials, setValue, watchRate])

  useEffect(() => {
    const q = parseFloat(watchQty) || 0
    const r = parseFloat(watchRate) || 0
    setTotalValue(q * r)
  }, [watchQty, watchRate])

  if (!isOpen) return null

  const onSubmit = (data) => {
    createMut.mutate(data, {
      onSuccess: () => {
        toast.success('Purchase recorded successfully')
        reset()
        onClose()
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || err.message || 'Error recording purchase')
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h2 className="text-lg font-bold text-gray-900">Record New Purchase</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="purchase-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <input type="date" {...register('purchase_date', { required: 'Required' })} className="input-field w-full" />
                {errors.purchase_date && <p className="text-red-500 text-xs mt-1">{errors.purchase_date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name <span className="text-gray-400 font-normal">(Optional)</span></label>
                <input type="text" {...register('supplier_name')} placeholder="ABC Suppliers" className="input-field w-full" />
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Material SKU</label>
                <select {...register('sku_code', { required: 'Required' })} className="input-field w-full font-mono text-sm">
                  <option value="">-- Select Material --</option>
                  {rawMaterials.map(r => (
                    <option key={r.sku_code} value={r.sku_code}>{r.sku_code} - {r.description}</option>
                  ))}
                </select>
                {errors.sku_code && <p className="text-red-500 text-xs mt-1">{errors.sku_code.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <div className="relative">
                    <input type="number" step="0.001" {...register('qty', { required: 'Required', min: 0.001 })} className="input-field w-full pr-12 text-right tabular-nums font-medium text-blue-700" placeholder="0.00" />
                    <span className="absolute right-3 top-2 text-sm text-gray-500 font-mono">{watch('uom') || 'UOM'}</span>
                  </div>
                  {errors.qty && <p className="text-red-500 text-xs mt-1">Positive number required</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (₹)</label>
                  <input type="number" step="0.01" {...register('rate', { required: 'Required', min: 0.01 })} className="input-field w-full text-right tabular-nums" placeholder="0.00" />
                  {errors.rate && <p className="text-red-500 text-xs mt-1">Positive rate required</p>}
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
              <span className="text-sm font-semibold text-blue-800">Total Purchase Value</span>
              <span className="text-lg font-bold text-blue-900 tabular-nums">₹ {totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remarks / Notes</label>
              <textarea {...register('remarks')} rows="2" className="input-field w-full" placeholder="Invoice #, Delivery notes..." />
            </div>
          </form>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50/50">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" form="purchase-form" disabled={createMut.isPending} className="btn-primary">
            {createMut.isPending ? 'Saving...' : 'Record Purchase'}
          </button>
        </div>
      </div>
    </div>
  )
}
