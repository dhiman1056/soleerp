import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useSearchParams } from 'react-router-dom'
import Table from '../../components/common/Table'
import { useStockLedgerQuery } from '../../hooks/useInventory'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'

const TX_COLORS = {
  PURCHASE:       'bg-green-100 text-green-700',
  WO_ISSUE:       'bg-amber-100 text-amber-700',
  WO_RECEIPT:     'bg-blue-100 text-blue-700',
  ADJUSTMENT_IN:  'bg-teal-100 text-teal-700',
  ADJUSTMENT_OUT: 'bg-red-100 text-red-700',
  OPENING_STOCK:  'bg-gray-100 text-gray-700',
}

export default function StockLedger() {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSku = searchParams.get('sku') || ''
  
  const [skuCode, setSkuCode] = useState(initialSku)
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [txType, setTxType] = useState('')

  const params = useMemo(() => {
    const p = {}
    if (skuCode) p.sku_code = skuCode
    if (fromDate) p.from_date = fromDate
    if (toDate) p.to_date = toDate
    if (txType) p.transaction_type = txType
    return p
  }, [skuCode, fromDate, toDate, txType])

  const { data, isLoading } = useStockLedgerQuery(params)
  const records = data?.data || []

  // Aggregate totals
  const totals = records.reduce((acc, r) => {
    acc.qty_in += parseFloat(r.qty_in)
    acc.qty_out += parseFloat(r.qty_out)
    acc.value_in += parseFloat(r.value_in)
    acc.value_out += parseFloat(r.value_out)
    return acc
  }, { qty_in: 0, qty_out: 0, value_in: 0, value_out: 0 })

  const columns = [
    { key: 'transaction_date', label: 'Date', render: r => formatDate(r.transaction_date) },
    { key: 'sku_code', label: 'SKU', className: 'font-mono text-xs font-semibold' },
    { key: 'sku_description', label: 'Description', render: r => <span className="truncate max-w-[150px] block">{r.sku_description}</span> },
    { key: 'transaction_type', label: 'Type', render: r => <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TX_COLORS[r.transaction_type] || 'bg-gray-100'}`}>{r.transaction_type.replace('_', ' ')}</span> },
    { key: 'reference_no', label: 'Ref No', className: 'font-mono text-xs' },
    { key: 'qty_in', label: 'Qty In', align: 'right', render: r => <span className="tabular-nums text-green-700 font-semibold">{parseFloat(r.qty_in) > 0 ? parseFloat(r.qty_in).toFixed(3) : '-'}</span> },
    { key: 'qty_out', label: 'Qty Out', align: 'right', render: r => <span className="tabular-nums text-red-700 font-semibold">{parseFloat(r.qty_out) > 0 ? parseFloat(r.qty_out).toFixed(3) : '-'}</span> },
    { key: 'rate', label: 'Rate (₹)', align: 'right', render: r => <span className="tabular-nums">{formatCurrency(r.rate)}</span> },
    { key: 'value_in', label: 'Value In', align: 'right', render: r => <span className="tabular-nums text-green-700">{parseFloat(r.value_in) > 0 ? formatCurrency(r.value_in) : '-'}</span> },
    { key: 'value_out', label: 'Value Out', align: 'right', render: r => <span className="tabular-nums text-red-700">{parseFloat(r.value_out) > 0 ? formatCurrency(r.value_out) : '-'}</span> },
    { key: 'running_balance', label: 'Running Bal', align: 'right', render: r => <span className="tabular-nums font-bold">{parseFloat(r.running_balance).toFixed(3)}</span> },
    { key: 'remarks', label: 'Remarks', render: r => <span className="text-xs text-gray-500">{r.remarks}</span> }
  ]

  // Reverse records because query limits to 500 desc but for ledger view sometimes ascending makes more sense
  // We keep it desc but can inject totals row at bottom
  
  return (
    <div className="space-y-4">
      <div className="card p-4 flex items-end gap-4 flex-wrap bg-white shadow-sm border border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">SKU Code</label>
          <input type="text" value={skuCode} onChange={e => { setSkuCode(e.target.value); setSearchParams({ sku: e.target.value }) }} className="input-field" placeholder="Search SKU..." />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">From Date</label>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">To Date</label>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="input-field" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
          <select value={txType} onChange={e => setTxType(e.target.value)} className="input-field">
            <option value="">All Types</option>
            {Object.keys(TX_COLORS).map(k => <option key={k} value={k}>{k}</option>)}
          </select>
        </div>
      </div>

      <div className="card overflow-hidden">
        <Table 
          columns={columns} 
          data={records} 
          loading={isLoading} 
          empty="No ledger transactions found." 
        />
        {!isLoading && records.length > 0 && (
          <div className="bg-gray-50 border-t border-gray-200 p-4">
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-right"><span className="text-gray-500 font-semibold mr-2">Total Qty In:</span><span className="font-bold text-green-700">{totals.qty_in.toFixed(3)}</span></div>
              <div className="text-right"><span className="text-gray-500 font-semibold mr-2">Total Value In:</span><span className="font-bold text-green-700">{formatCurrency(totals.value_in)}</span></div>
              <div className="text-right"><span className="text-gray-500 font-semibold mr-2">Total Qty Out:</span><span className="font-bold text-red-700">{totals.qty_out.toFixed(3)}</span></div>
              <div className="text-right"><span className="text-gray-500 font-semibold mr-2">Total Value Out:</span><span className="font-bold text-red-700">{formatCurrency(totals.value_out)}</span></div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
