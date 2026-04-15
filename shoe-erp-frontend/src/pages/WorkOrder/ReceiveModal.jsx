import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '../../components/common/Modal.jsx'
import { useReceiveWorkOrder } from '../../hooks/useWorkOrders.js'
import { today } from '../../utils/formatDate.js'
import { STORE_OPTIONS } from '../../utils/constants.js'

/**
 * Modal for recording a receipt against a Work Order.
 * Props: isOpen, onClose, wo (the work order object)
 */
export default function ReceiveModal({ isOpen, onClose, wo }) {
  const receiveWO = useReceiveWorkOrder()

  const wipQty  = parseFloat(wo?.planned_qty  || 0) - parseFloat(wo?.received_qty || 0)
  const hasSizes = wo?.sizeBreakup?.length > 0

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { received_qty: '', receipt_date: today(), remarks: '' },
  })

  const [receiptsMap, setReceiptsMap] = useState({})
  const [fromStore,   setFromStore]   = useState(wo?.from_store || '')
  const [toStore,     setToStore]     = useState(wo?.to_store   || '')

  useEffect(() => {
    if (isOpen) {
      reset({ received_qty: '', receipt_date: today(), remarks: '' })
      setFromStore(wo?.from_store || '')
      setToStore(wo?.to_store   || '')
      if (hasSizes) {
        const init = {}
        wo.sizeBreakup.forEach(s => { init[s.size_code] = '' })
        setReceiptsMap(init)
      } else {
        setReceiptsMap({})
      }
    }
  }, [isOpen, reset, hasSizes, wo])

  const onSubmit = (values) => {
    let finalReceipts = []
    let totalReceived = 0

    if (hasSizes) {
      Object.entries(receiptsMap).forEach(([sizeCode, qty]) => {
        const num = parseInt(qty)
        if (num > 0) {
          finalReceipts.push({ sizeCode, receivedQty: num })
          totalReceived += num
        }
      })
    } else {
      totalReceived = parseFloat(values.received_qty)
    }

    if (totalReceived <= 0) {
      alert('Total received quantity must be greater than 0.')
      return
    }

    receiveWO.mutate(
      {
        id:           wo.id,
        received_qty: totalReceived,
        receipts:     hasSizes ? finalReceipts : undefined,
        receipt_date: values.receipt_date,
        remarks:      values.remarks || null,
        from_store:   fromStore || undefined,
        to_store:     toStore   || undefined,
      },
      { onSuccess: onClose },
    )
  }

  const sizeTotal = Object.values(receiptsMap).reduce((s, v) => s + (parseInt(v) || 0), 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Receipt"
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={receiveWO.isPending}>Cancel</button>
          <button type="submit" form="receive-form" className="btn-primary" disabled={receiveWO.isPending}>
            {receiveWO.isPending ? 'Saving…' : 'Record Receipt'}
          </button>
        </>
      }
    >
      {/* WO Summary */}
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide">Work Order Summary</p>
        <div className="grid grid-cols-2 gap-1 mt-2 text-sm">
          <span className="text-gray-500">WO Number</span>
          <span className="font-semibold text-gray-900 font-mono">{wo?.wo_number}</span>
          <span className="text-gray-500">Output Product</span>
          <span className="font-semibold text-gray-900">{wo?.product_name || '—'}</span>
          <span className="text-gray-500">BOM Code</span>
          <span className="font-semibold text-gray-900 font-mono">{wo?.bom_code || '—'}</span>
          <span className="text-gray-500">Planned Qty</span>
          <span className="font-semibold text-gray-900">{parseFloat(wo?.planned_qty || 0).toFixed(2)}</span>
          <span className="text-gray-500">Received So Far</span>
          <span className="font-semibold text-green-700">{parseFloat(wo?.received_qty || 0).toFixed(2)}</span>
          <span className="text-gray-500">WIP Qty (Max)</span>
          <span className="font-bold text-amber-700">{wipQty.toFixed(2)}</span>
        </div>
      </div>

      <form id="receive-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Qty section */}
        {!hasSizes ? (
          <div>
            <label className="label">Received Qty * <span className="text-gray-400 font-normal">(max {wipQty.toFixed(2)})</span></label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={wipQty}
              {...register('received_qty', {
                required: 'Received qty is required',
                min:      { value: 0.01,  message: 'Must be > 0' },
                max:      { value: wipQty, message: `Cannot exceed WIP qty (${wipQty.toFixed(2)})` },
                valueAsNumber: true,
              })}
              className={`input-field text-right tabular-nums ${errors.received_qty ? 'input-error' : ''}`}
              autoFocus
            />
            {errors.received_qty && <p className="text-red-500 text-xs mt-1">{errors.received_qty.message}</p>}
          </div>
        ) : (
          <div>
            <label className="label mb-2">
              Receive Quantities by Size
              <span className="ml-2 text-xs text-blue-600 font-bold">Total: {sizeTotal}</span>
            </label>
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden text-sm">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-600">Size</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600">WIP</th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-600 w-32">Receive Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {wo.sizeBreakup.map(sb => {
                    const sWip = parseInt(sb.wip_qty || 0)
                    return (
                      <tr key={sb.size_code} className="border-b border-gray-50 last:border-none">
                        <td className="px-3 py-2 font-mono text-gray-800">{sb.size_code}</td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{sWip}</td>
                        <td className="px-3 py-2 text-right">
                          {sWip > 0 ? (
                            <input
                              type="number" min="0" max={sWip} step="1"
                              value={receiptsMap[sb.size_code] || ''}
                              onChange={e => {
                                let v = parseInt(e.target.value)
                                if (v > sWip) v = sWip
                                if (v < 0 || isNaN(v)) v = ''
                                setReceiptsMap(p => ({ ...p, [sb.size_code]: v }))
                              }}
                              className="input-field py-1 px-2 text-xs text-center border-dashed focus:border-solid hover:border-gray-400 font-bold tabular-nums"
                            />
                          ) : (
                            <span className="text-xs text-gray-400 italic">Complete</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={2} className="px-3 py-2 text-right font-bold text-gray-600">Total Receive:</td>
                    <td className="px-3 py-2 text-center text-blue-700 font-bold tabular-nums text-base">{sizeTotal}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* From / To Location */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">From Location</label>
            <select
              value={fromStore}
              onChange={e => setFromStore(e.target.value)}
              className="input-field"
            >
              <option value="">— Select —</option>
              {STORE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label">To Location</label>
            <select
              value={toStore}
              onChange={e => setToStore(e.target.value)}
              className="input-field"
            >
              <option value="">— Select —</option>
              {STORE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Receipt Date */}
        <div>
          <label className="label">Receipt Date *</label>
          <input
            type="date"
            {...register('receipt_date', { required: 'Date is required' })}
            className={`input-field ${errors.receipt_date ? 'input-error' : ''}`}
          />
          {errors.receipt_date && <p className="text-red-500 text-xs mt-1">{errors.receipt_date.message}</p>}
        </div>

        {/* Remarks */}
        <div>
          <label className="label">Remarks</label>
          <input {...register('remarks')} placeholder="Optional QC notes, batch info…" className="input-field" />
        </div>

      </form>
    </Modal>
  )
}
