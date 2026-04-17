import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '../../components/common/Modal.jsx'
import { useReceiveWorkOrder } from '../../hooks/useWorkOrders.js'
import { useLocations } from '../../hooks/useLocations.js'
import { useSizesQuery } from '../../hooks/useSizes.js'
import { today } from '../../utils/formatDate.js'
import toast from 'react-hot-toast'

/**
 * Modal for recording a receipt against a Work Order.
 * Props: isOpen, onClose, wo (the work order object)
 */
export default function ReceiveModal({ isOpen, onClose, wo }) {
  const receiveWO = useReceiveWorkOrder()

  // ── Locations from API ────────────────────────────────────────────────────────
  const { data: locRaw } = useLocations()
  const allLocations = Array.isArray(locRaw) ? locRaw : []

  // ── Sizes from master (for manual size-breakup mode) ─────────────────────────
  const { data: sizesRaw } = useSizesQuery({ is_active: 'true' })
  const activeSizes = Array.isArray(sizesRaw) ? sizesRaw : []

  // ── WIP qty shortcut ──────────────────────────────────────────────────────────
  const wipQty = parseFloat(wo?.planned_qty || 0) - parseFloat(wo?.received_qty || 0)

  // ── Form ──────────────────────────────────────────────────────────────────────
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { received_qty: '', receipt_date: today(), remarks: '' },
  })

  // ── Local state ───────────────────────────────────────────────────────────────
  const [useSizeBreakup, setUseSizeBreakup] = useState(false)
  const [sizeMap,        setSizeMap]        = useState({})  // size_code → qty string
  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId,   setToLocationId]   = useState('')
  const [rejectionQty,   setRejectionQty]   = useState(0)

  // ── WO Type → Receive Location auto-mapping ──────────────────────────────────────
  const WO_TYPE_RECEIVE_LOCATIONS = {
    RM_TO_SF: { from: 'SF-WIP Store',          to: 'Semi-Finished Store' },
    SF_TO_FG: { from: 'FG-WIP Store',          to: 'Finished Goods Warehouse' },
    RM_TO_FG: { from: 'FG-WIP Store',          to: 'Finished Goods Warehouse' },
  }

  // Pre-fill location from WO when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({ received_qty: '', receipt_date: today(), remarks: '' })
      setUseSizeBreakup(false)
      setSizeMap({})
      setRejectionQty(0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, reset])

  // Auto-set receive locations based on wo_type
  useEffect(() => {
    if (wo?.wo_type && allLocations.length > 0) {
      const locMap = WO_TYPE_RECEIVE_LOCATIONS[wo.wo_type]
      if (locMap) {
        const fromLoc = allLocations.find(l => l.location_name === locMap.from)
        const toLoc   = allLocations.find(l => l.location_name === locMap.to)
        if (fromLoc) setFromLocationId(String(fromLoc.id))
        if (toLoc)   setToLocationId(String(toLoc.id))
      } else {
        // Fallback: try to match by stored store name on the WO
        const fl = allLocations.find(l => l.location_name === wo?.from_store)
        const tl = allLocations.find(l => l.location_name === wo?.to_store)
        setFromLocationId(fl ? String(fl.id) : '')
        setToLocationId(tl   ? String(tl.id) : '')
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wo?.wo_type, allLocations.length])

  // ── Derived totals ────────────────────────────────────────────────────────────
  const sizeTotal = Object.values(sizeMap).reduce((s, v) => s + (parseInt(v) || 0), 0)

  // ── Submit ────────────────────────────────────────────────────────────────────
  const onSubmit = (values) => {
    let totalReceived = 0
    let sizeBreakupPayload = null

    if (useSizeBreakup) {
      const entries = Object.entries(sizeMap).filter(([, v]) => parseInt(v) > 0)
      if (entries.length === 0) {
        alert('Enter at least one size quantity.')
        return
      }
      sizeBreakupPayload = Object.fromEntries(entries.map(([k, v]) => [k, parseInt(v)]))
      totalReceived = sizeTotal
    } else {
      totalReceived = parseFloat(values.received_qty)
    }

    if (totalReceived <= 0) {
      alert('Total received quantity must be greater than 0.')
      return
    }

    if (totalReceived > wipQty) {
      alert(`Cannot exceed WIP qty (${wipQty.toFixed(2)}).`)
      return
    }

    const fromLoc = allLocations.find(l => String(l.id) === String(fromLocationId))
    const toLoc   = allLocations.find(l => String(l.id) === String(toLocationId))

    receiveWO.mutate(
      {
        id:              wo.id,
        received_qty:    totalReceived,
        rejection_qty:   rejectionQty,
        receipt_date:    values.receipt_date,
        remarks:         values.remarks || null,
        from_location_id: fromLocationId ? parseInt(fromLocationId) : undefined,
        to_location_id:   toLocationId   ? parseInt(toLocationId)   : undefined,
        from_store:       fromLoc?.location_name || undefined,
        to_store:         toLoc?.location_name   || undefined,
        size_breakup:     sizeBreakupPayload,
      },
      {
        onSuccess: (res) => {
          const rcptNo = res?.data?.data?.receipt_no
          if (rcptNo) {
            toast.success(`Receipt recorded! Receipt No: ${rcptNo}`)
          } else {
            toast.success('Work Order receipt recorded!')
          }
          onClose()
        },
      },
    )
  }

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Receipt"
      size="md"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={receiveWO.isPending}>
            Cancel
          </button>
          <button type="submit" form="receive-form" className="btn-primary" disabled={receiveWO.isPending}>
            {receiveWO.isPending ? 'Saving…' : 'Record Receipt'}
          </button>
        </>
      }
    >
      {/* ── WO Summary ── */}
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-2">Work Order Summary</p>
        <div className="grid grid-cols-2 gap-y-1 text-sm">
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

        {/* ── Qty Mode Toggle ── */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">Receipt Quantity</label>
            {activeSizes.length > 0 && (
              <div className="flex items-center gap-1 bg-white rounded-md p-1 shadow-sm border border-gray-200">
                <button
                  type="button"
                  onClick={() => setUseSizeBreakup(false)}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                    !useSizeBreakup ? 'bg-gray-800 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Total Qty
                </button>
                <button
                  type="button"
                  onClick={() => setUseSizeBreakup(true)}
                  className={`px-3 py-1 text-xs font-semibold rounded transition-colors ${
                    useSizeBreakup ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Size Breakup
                </button>
              </div>
            )}
          </div>

          {/* Total Qty mode */}
          {!useSizeBreakup && (
            <div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={wipQty}
                {...register('received_qty', {
                  required:      'Received qty is required',
                  min:           { value: 0.01,   message: 'Must be > 0' },
                  max:           { value: wipQty, message: `Cannot exceed WIP qty (${wipQty.toFixed(2)})` },
                  valueAsNumber: true,
                })}
                className={`input-field text-right tabular-nums text-lg font-bold ${errors.received_qty ? 'input-error' : ''}`}
                placeholder={`Max ${wipQty.toFixed(2)}`}
                autoFocus
              />
              {errors.received_qty && (
                <p className="text-red-500 text-xs mt-1">{errors.received_qty.message}</p>
              )}
            </div>
          )}

          {/* Size Breakup mode */}
          {useSizeBreakup && (
            <div>
              <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {activeSizes.map(s => (
                        <th key={s.size_code} className="px-2 py-2 text-center text-xs text-gray-600 font-bold uppercase">
                          {s.size_code}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-xs bg-blue-50 text-blue-700 font-bold uppercase">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      {activeSizes.map(s => (
                        <td key={s.size_code} className="px-2 py-2 border-r border-gray-100 last:border-0">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            placeholder="0"
                            value={sizeMap[s.size_code] || ''}
                            onChange={e => {
                              const v = parseInt(e.target.value)
                              setSizeMap(p => ({ ...p, [s.size_code]: isNaN(v) || v < 0 ? '' : String(v) }))
                            }}
                            className="w-full px-1 py-1 text-xs text-center border-b-2 border-transparent focus:border-blue-500 focus:outline-none transition-colors font-bold tabular-nums"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right font-bold text-blue-700 bg-blue-50 tabular-nums text-base">
                        {sizeTotal}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {sizeTotal > wipQty && (
                <p className="text-red-500 text-xs mt-1">
                  Total ({sizeTotal}) exceeds WIP qty ({wipQty.toFixed(2)})
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── From / To Location ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">From Location</label>
            <select
              value={fromLocationId}
              onChange={e => setFromLocationId(e.target.value)}
              className="input-field"
            >
              <option value="">— Select —</option>
              {allLocations.map(l => (
                <option key={l.id} value={l.id}>{l.location_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">To Location</label>
            <select
              value={toLocationId}
              onChange={e => setToLocationId(e.target.value)}
              className="input-field"
            >
              <option value="">— Select —</option>
              {allLocations.map(l => (
                <option key={l.id} value={l.id}>{l.location_name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Rejection Qty ── */}
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <label className="text-xs font-bold text-red-700 uppercase tracking-wide block mb-2">
            Rejection Qty <span className="font-normal text-red-400">(if any)</span>
          </label>
          <input
            type="number"
            min="0"
            max={wipQty}
            step="0.01"
            value={rejectionQty}
            onChange={e => setRejectionQty(parseFloat(e.target.value) || 0)}
            placeholder="0"
            className="input-field text-right tabular-nums"
          />
          <p className="text-xs text-gray-400 mt-1">
            Rejected qty will be recorded but <strong>not</strong> added to stock.
          </p>
          {rejectionQty > 0 && (() => {
            const displayReceived = useSizeBreakup ? sizeTotal : 0
            const goodQty = Math.max(0, displayReceived - rejectionQty)
            const rejPct  = displayReceived > 0
              ? ((rejectionQty / displayReceived) * 100).toFixed(1)
              : '—'
            return (
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Good Qty (to stock)</p>
                  <p className="font-bold text-green-700 tabular-nums text-base">
                    {useSizeBreakup ? goodQty.toFixed(2) : '(enter qty above)'}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-xs text-gray-500">Rejection %</p>
                  <p className="font-bold text-red-600 tabular-nums text-base">
                    {useSizeBreakup && sizeTotal > 0 ? `${rejPct}%` : '—'}
                  </p>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ── Receipt Date ── */}
        <div>
          <label className="label">Receipt Date *</label>
          <input
            type="date"
            {...register('receipt_date', { required: 'Date is required' })}
            className={`input-field ${errors.receipt_date ? 'input-error' : ''}`}
          />
          {errors.receipt_date && (
            <p className="text-red-500 text-xs mt-1">{errors.receipt_date.message}</p>
          )}
        </div>

        {/* ── Remarks ── */}
        <div>
          <label className="label">Remarks</label>
          <input
            {...register('remarks')}
            placeholder="Optional QC notes, batch info…"
            className="input-field"
          />
        </div>

      </form>
    </Modal>
  )
}
