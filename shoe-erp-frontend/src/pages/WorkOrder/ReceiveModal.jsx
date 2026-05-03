import React, { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '../../components/common/Modal.jsx'
import { useReceiveWorkOrder } from '../../hooks/useWorkOrders.js'
import { useLocations } from '../../hooks/useLocations.js'
import { today } from '../../utils/formatDate.js'
import api from '../../api/axiosInstance.js'
import toast from 'react-hot-toast'

const SIZE_CHART_SIZES = {
  INFANT: ['2','3','5','6','7','8','9','10','11','12'],
  KIDS: ['6','7','8','9','10','11','11.5','12','12.5','13','1','2','3','4','5','6'],
  LADIES: ['3','4','5','6','7','8','9'],
  MEN: ['6','7','8','9','10','11','12'],
}

export default function ReceiveModal({ isOpen, onClose, wo }) {
  const receiveWO = useReceiveWorkOrder()

  const { data: locRaw } = useLocations()
  const allLocations = Array.isArray(locRaw) ? locRaw : []

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { receipt_date: today(), remarks: '' },
  })

  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId,   setToLocationId]   = useState('')

  const [sizeChart, setSizeChart] = useState(wo?.size_chart || wo?.product_size_chart || null)
  
  useEffect(() => {
    if (isOpen && wo?.output_sku && !sizeChart) {
      api.get(`/products/${wo.output_sku}`)
        .then(res => {
          if (res.data?.data?.size_chart) {
            setSizeChart(res.data.data.size_chart)
          }
        })
        .catch(console.error)
    }
  }, [isOpen, wo?.output_sku, sizeChart])

  const sizes = useMemo(() => SIZE_CHART_SIZES[sizeChart] || [], [sizeChart])

  const [sizeBreakup, setSizeBreakup] = useState([])

  useEffect(() => {
    if (isOpen && wo?.id) {
      api.get(`/work-orders/${wo.id}/size-breakup`)
        .then(res => setSizeBreakup(res.data?.data ?? []))
        .catch(() => setSizeBreakup([]))
    }
  }, [isOpen, wo?.id])

  const [receiveMap, setReceiveMap] = useState({})
  const [rejectionMap, setRejectionMap] = useState({})
  const [rejectionReasonMap, setRejectionReasonMap] = useState({})

  useEffect(() => {
    if (sizeBreakup.length > 0) {
      const initReceive = {}
      sizeBreakup.forEach(s => {
        const wip = (s.planned_qty||0) - (s.received_qty||0)
        if (wip > 0) initReceive[s.size_code] = ''
      })
      setReceiveMap(initReceive)
      setRejectionMap({})
      setRejectionReasonMap({})
    }
  }, [sizeBreakup])

  const WO_TYPE_RECEIVE_LOCATIONS = {
    RM_TO_SF: { from: 'SF-WIP Store',          to: 'Semi-Finished Store' },
    SF_TO_FG: { from: 'FG-WIP Store',          to: 'Finished Goods Warehouse' },
    RM_TO_FG: { from: 'FG-WIP Store',          to: 'Finished Goods Warehouse' },
  }

  useEffect(() => {
    if (isOpen) {
      reset({ receipt_date: today(), remarks: '' })
      if (wo?.wo_type && allLocations.length > 0) {
        const locMap = WO_TYPE_RECEIVE_LOCATIONS[wo.wo_type]
        if (locMap) {
          const fl = allLocations.find(l => l.location_name === locMap.from)
          const tl = allLocations.find(l => l.location_name === locMap.to)
          setFromLocationId(fl ? String(fl.id) : '')
          setToLocationId(tl   ? String(tl.id) : '')
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, wo?.wo_type, allLocations.length])

  const validate = () => {
    const totalRcv = Object.values(receiveMap).reduce((s,v) => s+(parseInt(v)||0), 0)
    
    if (totalRcv <= 0) {
      toast.error('Enter at least one size quantity to receive.')
      return false
    }
    
    const missingReasons = Object.entries(rejectionMap)
      .filter(([size, qty]) => parseInt(qty) > 0 && !rejectionReasonMap[size])
    
    if (missingReasons.length > 0) {
      toast.error('Please select rejection reason for all rejected sizes.')
      return false
    }
    
    return true
  }

  const onSubmit = (values) => {
    if (!validate()) return

    const totalReceived = Object.values(receiveMap).reduce((s,v) => s+(parseInt(v)||0), 0)
    const totalRejected = Object.values(rejectionMap).reduce((s,v) => s+(parseInt(v)||0), 0)
    const totalGood = Math.max(0, totalReceived - totalRejected)

    const size_receipts = sizeBreakup
      .filter(s => parseInt(receiveMap[s.size_code]) > 0)
      .map(s => ({
        size_code: s.size_code,
        receive_qty: parseInt(receiveMap[s.size_code]) || 0,
        rejection_qty: parseInt(rejectionMap[s.size_code]) || 0,
        rejection_reason: rejectionReasonMap[s.size_code] || null,
      }))

    const fromLoc = allLocations.find(l => String(l.id) === String(fromLocationId))
    const toLoc   = allLocations.find(l => String(l.id) === String(toLocationId))

    receiveWO.mutate(
      {
        id:               wo.id,
        received_qty:     totalReceived,
        rejection_qty:    totalRejected,
        receipt_date:     values.receipt_date,
        remarks:          values.remarks || null,
        from_location_id: fromLocationId ? parseInt(fromLocationId) : undefined,
        to_location_id:   toLocationId   ? parseInt(toLocationId)   : undefined,
        from_store:       fromLoc?.location_name || undefined,
        to_store:         toLoc?.location_name   || undefined,
        size_receipts,
        total_good:       totalGood,
        total_received:   totalReceived,
        total_rejected:   totalRejected
      },
      {
        onSuccess: (res) => {
          const rcptNo = res?.data?.data?.receipt_no
          toast.success(rcptNo ? `Receipt ${rcptNo} recorded! Good: ${totalGood}, Rejected: ${totalRejected}` : `Receipt recorded! Good: ${totalGood}`)
          onClose()
        },
      }
    )
  }

  const totalPlannedWO = parseFloat(wo?.planned_qty || 0)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Size-Wise Receipt"
      size="3xl"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary" disabled={receiveWO.isPending}>
            Cancel
          </button>
          <button type="submit" form="receive-form" className="btn-primary" disabled={receiveWO.isPending}>
            {receiveWO.isPending ? 'Saving…' : 'Confirm Receipt'}
          </button>
        </>
      }
    >
      <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm">
        <p className="text-xs font-bold text-amber-800 uppercase tracking-wide mb-3">Work Order Summary</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-y-3 text-sm mb-4">
          <div>
            <p className="text-gray-500 text-xs uppercase">WO Number</p>
            <p className="font-semibold text-gray-900 font-mono">{wo?.wo_number}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">Output Product</p>
            <p className="font-semibold text-gray-900 truncate" title={wo?.product_name}>{wo?.product_name || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">BOM Code</p>
            <p className="font-semibold text-gray-900 font-mono">{wo?.bom_code || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase">Total Planned Qty</p>
            <p className="font-bold text-gray-900 tabular-nums">{totalPlannedWO.toFixed(2)}</p>
          </div>
        </div>

        {sizeBreakup.length > 0 && (
          <div className="mt-3 overflow-x-auto bg-white rounded-lg border border-amber-200 shadow-sm">
            <table className="w-full text-xs">
              <thead className="bg-amber-100 border-b border-amber-200">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-amber-900">Size (UK)</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-900">Planned</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-900">WO-Received Qty</th>
                  <th className="px-3 py-2 text-right font-bold text-amber-900">WIP</th>
                </tr>
              </thead>
              <tbody>
                {sizeBreakup.map(s => {
                  const p = parseInt(s.planned_qty) || 0
                  const r = parseInt(s.received_qty) || 0
                  const w = Math.max(0, p - r)
                  return (
                    <tr key={s.size_code} className="border-b border-amber-100/50 last:border-0 hover:bg-amber-50/30">
                      <td className="px-3 py-1.5 font-bold text-gray-800">UK {s.size_code}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-gray-600">{p}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums text-green-700 font-semibold">{r}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-bold text-amber-700">{w}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="bg-amber-50 border-t-2 border-amber-300">
                <tr>
                  <td className="px-3 py-2 font-bold text-gray-800">Total</td>
                  <td className="px-3 py-2 text-right font-bold text-gray-800 tabular-nums">
                    {sizeBreakup.reduce((s,r) => s + (parseInt(r.planned_qty)||0), 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-green-700 tabular-nums">
                    {sizeBreakup.reduce((s,r) => s + (parseInt(r.received_qty)||0), 0)}
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-amber-700 tabular-nums">
                    {sizeBreakup.reduce((s,r) => s + Math.max(0, (parseInt(r.planned_qty)||0) - (parseInt(r.received_qty)||0)), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <form id="receive-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-3">Record Quantities</p>
          
          {sizes.length === 0 ? (
            <p className="py-8 text-center text-xs text-gray-400">No size chart configured for this product.</p>
          ) : (
            <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-bold text-gray-600 uppercase">Size</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-gray-600 uppercase">Planned</th>
                    <th className="px-3 py-2 text-right text-xs font-bold text-amber-700 uppercase">WIP</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-blue-700 uppercase">Receive Qty</th>
                    <th className="px-3 py-2 text-center text-xs font-bold text-red-600 uppercase">Rejection</th>
                    <th className="px-3 py-2 text-left text-xs font-bold text-red-600 uppercase">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeBreakup.map(s => {
                    const p = parseInt(s.planned_qty) || 0
                    const r = parseInt(s.received_qty) || 0
                    const wipForSize = Math.max(0, p - r)
                    const rejQty = parseInt(rejectionMap[s.size_code]) || 0
                    const needsReason = rejQty > 0 && !rejectionReasonMap[s.size_code]
                    
                    if (wipForSize <= 0) return (
                      <tr key={s.size_code} className="border-t border-gray-100 opacity-50 bg-gray-50">
                        <td className="px-3 py-2 font-mono font-bold text-gray-500">UK {s.size_code}</td>
                        <td className="px-3 py-2 text-right text-gray-500 tabular-nums">{p}</td>
                        <td className="px-3 py-2 text-right text-gray-400 font-semibold italic">Complete</td>
                        <td colSpan={3} className="px-3 py-2 text-center text-gray-400 text-xs italic">
                          Already received
                        </td>
                      </tr>
                    )
                    
                    return (
                      <tr key={s.size_code} className="border-t border-gray-100 hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2 font-mono font-bold text-gray-800">UK {s.size_code}</td>
                        <td className="px-3 py-2 text-right text-gray-600 tabular-nums">{p}</td>
                        <td className="px-3 py-2 text-right font-bold text-amber-700 tabular-nums text-base">{wipForSize}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min="0" max={wipForSize} step="1"
                            value={receiveMap[s.size_code] || ''}
                            onChange={e => {
                              let v = parseInt(e.target.value)
                              if (v > wipForSize) v = wipForSize
                              if (isNaN(v) || v < 0) v = ''
                              setReceiveMap(p => ({...p, [s.size_code]: v === '' ? '' : String(v)}))
                            }}
                            className="w-16 px-2 py-1.5 mx-auto block text-center border border-blue-200 rounded font-bold text-blue-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number" min="0" 
                            max={parseInt(receiveMap[s.size_code]) || 0}
                            step="1"
                            value={rejectionMap[s.size_code] || ''}
                            onChange={e => {
                              let v = parseInt(e.target.value)
                              const maxRej = parseInt(receiveMap[s.size_code]) || 0
                              if (v > maxRej) v = maxRej
                              if (isNaN(v) || v < 0) v = ''
                              setRejectionMap(p => ({...p, [s.size_code]: v === '' ? '' : String(v)}))
                            }}
                            className={`w-16 px-2 py-1.5 mx-auto block text-center border rounded font-bold outline-none ${
                              rejQty > 0 ? 'border-red-400 bg-red-50 text-red-700 focus:ring-red-500' : 'border-gray-200 focus:ring-red-500 focus:border-red-500'
                            }`}
                            placeholder="0"
                          />
                        </td>
                        <td className="px-3 py-2">
                          {rejQty > 0 ? (
                            <select
                              value={rejectionReasonMap[s.size_code] || ''}
                              onChange={e => setRejectionReasonMap(p => ({
                                ...p, [s.size_code]: e.target.value
                              }))}
                              className={`text-xs border rounded px-2 py-1.5 w-full outline-none ${
                                needsReason ? 'border-red-500 bg-red-50 text-red-800 shadow-sm' : 'border-gray-200 text-gray-700 focus:border-red-500 focus:ring-1 focus:ring-red-500'
                              }`}
                            >
                              <option value="">Select reason *</option>
                              <option value="Quality Issue">Quality Issue</option>
                              <option value="Size Mismatch">Size Mismatch</option>
                              <option value="Damaged">Damaged</option>
                              <option value="Other">Other</option>
                            </select>
                          ) : (
                            <span className="text-gray-300 italic px-2">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                  <tr>
                    <td colSpan={3} className="px-3 py-3 font-bold text-gray-700 text-right uppercase text-xs">
                      Session Total:
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-blue-700 text-base tabular-nums">
                      {Object.values(receiveMap).reduce((s,v) => s+(parseInt(v)||0), 0)}
                    </td>
                    <td className="px-3 py-3 text-center font-bold text-red-600 text-base tabular-nums">
                      {Object.values(rejectionMap).reduce((s,v) => s+(parseInt(v)||0), 0)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* ── Locations & Logistics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="label">From Location</label>
            <select value={fromLocationId} onChange={e => setFromLocationId(e.target.value)} className="input-field shadow-sm">
              <option value="">— Select —</option>
              {allLocations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">To Location</label>
            <select value={toLocationId} onChange={e => setToLocationId(e.target.value)} className="input-field shadow-sm">
              <option value="">— Select —</option>
              {allLocations.map(l => <option key={l.id} value={l.id}>{l.location_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Receipt Date *</label>
            <input type="date" {...register('receipt_date', { required: 'Required' })} className={`input-field shadow-sm ${errors.receipt_date ? 'input-error' : ''}`} />
          </div>
          <div>
            <label className="label">Remarks</label>
            <input {...register('remarks')} placeholder="Notes..." className="input-field shadow-sm" />
          </div>
        </div>
      </form>
    </Modal>
  )
}
