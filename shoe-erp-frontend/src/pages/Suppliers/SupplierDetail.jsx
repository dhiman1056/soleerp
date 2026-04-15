import React, { useState, useEffect, useCallback, useMemo, useRef, useContext } from "react";
import { useParams, useNavigate } from 'react-router-dom'
import { useSupplierQuery, useSupplierLedgerQuery, useRecordPayment } from '../../hooks/useSuppliers'
import { usePOsQuery } from '../../hooks/usePurchaseOrders'
import { formatCurrency } from '../../utils/formatCurrency'
import { formatDate } from '../../utils/formatDate'
import Loader from '../../components/common/Loader'
import toast from 'react-hot-toast'

export default function SupplierDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('POs')
  const [showPayModal, setShowPayModal] = useState(false)

  const { data: supData, isLoading: supLoading } = useSupplierQuery(id)
  const { data: posData } = usePOsQuery({ supplier_id: id })
  const { data: ledgerData } = useSupplierLedgerQuery(id, {})

  // Hooks return data directly (already unwrapped in queryFn)
  const supplier = supData ?? null
  const pos      = Array.isArray(posData)            ? posData             : []
  // useSupplierLedger returns { opening_balance, transactions } — backend wraps in data.data
  const ledger   = Array.isArray(ledgerData?.transactions) ? ledgerData.transactions : []

  if (supLoading) return <Loader />
  if (!supplier) return <div className="p-8">Supplier not found.</div>

  const outstanding = parseFloat(supplier.summary.outstanding_balance || 0)

  return (
    <div className="space-y-6">
       <button onClick={() => navigate('/suppliers')} className="text-sm text-gray-500 hover:text-gray-800 font-medium flex items-center gap-2">
         &larr; Back to Suppliers
       </button>

       {/* Header Card */}
       <div className="card p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-white shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold text-gray-900">{supplier.supplier_name}</h1>
              <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-gray-100 text-gray-600">{supplier.supplier_code}</span>
              {!supplier.is_active && <span className="px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700">INACTIVE</span>}
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
               <div><p className="text-gray-500 text-xs">Contact Person</p><p className="font-medium">{supplier.contact_person || '-'}</p></div>
               <div><p className="text-gray-500 text-xs">Phone & Email</p><p className="font-medium">{supplier.phone || '-'} <br/> {supplier.email || '-'}</p></div>
               <div><p className="text-gray-500 text-xs">Address</p><p className="font-medium line-clamp-2">{supplier.address || '-'} {supplier.city}</p></div>
               <div><p className="text-gray-500 text-xs">GSTIN</p><p className="font-medium">{supplier.gstin || '-'}</p></div>
               <div><p className="text-gray-500 text-xs">Payment Terms</p><p className="font-medium">{supplier.payment_terms || '-'}</p></div>
            </div>
          </div>

          <div className="md:border-l md:border-gray-100 md:pl-6 flex flex-col justify-center">
             <div className="grid grid-cols-2 gap-4">
               <div className="bg-gray-50 rounded p-4 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Purchased</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(supplier.summary.total_purchased)}</p>
               </div>
               <div className="bg-gray-50 rounded p-4 text-center">
                  <p className="text-xs text-gray-500 font-bold uppercase mb-1">Total Paid</p>
                  <p className="text-xl font-bold text-gray-800">{formatCurrency(supplier.summary.total_paid)}</p>
               </div>
             </div>
             
             <div className={`mt-4 rounded p-4 text-center border ${outstanding > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                <p className={`text-xs font-bold uppercase mb-1 ${outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>Outstanding Balance</p>
                <p className={`text-3xl font-black ${outstanding > 0 ? 'text-red-700' : 'text-green-700'}`}>{formatCurrency(outstanding)}</p>
             </div>
             
             <button onClick={() => setShowPayModal(true)} className="mt-4 btn-primary w-full" disabled={outstanding <= 0}>
               Record Payment
             </button>
          </div>
       </div>

       {/* Tabs section */}
       <div className="card overflow-hidden">
         <div className="flex border-b border-gray-100 bg-gray-50/50">
           {['POs', 'Ledger'].map(tab => (
             <button 
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={`px-6 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'border-gray-900 text-gray-900 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
             >
               {tab === 'POs' ? 'Purchase Orders' : 'Supplier Ledger'}
             </button>
           ))}
         </div>

         <div className="p-0">
           {activeTab === 'POs' && (
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 uppercase text-xs font-semibold">
                 <tr>
                   <th className="px-5 py-3">PO Date</th>
                   <th className="px-5 py-3">PO No</th>
                   <th className="px-5 py-3">Del. Expected</th>
                   <th className="px-5 py-3 text-center">Status</th>
                   <th className="px-5 py-3 text-right">Total Value</th>
                   <th className="px-5 py-3 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {pos.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-gray-500">No Purchase Orders</td></tr> : null}
                 {pos.map(po => (
                   <tr key={po.id} className="hover:bg-gray-50/50">
                     <td className="px-5 py-3">{formatDate(po.po_date)}</td>
                     <td className="px-5 py-3 font-mono font-medium">{po.po_no}</td>
                     <td className="px-5 py-3">{formatDate(po.expected_delivery_date) || '-'}</td>
                     <td className="px-5 py-3 text-center">
                       <span className={`px-2 py-0.5 rounded text-xs font-medium ${po.status === 'RECEIVED' ? 'bg-green-100 text-green-700' : po.status === 'CANCELLED' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                         {po.status}
                       </span>
                     </td>
                     <td className="px-5 py-3 text-right font-medium">{formatCurrency(po.total_value)}</td>
                     <td className="px-5 py-3 text-right">
                       <button onClick={() => navigate(`/purchase-orders/${po.id}`)} className="text-blue-600 hover:text-blue-800 text-xs font-semibold">View</button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}

           {activeTab === 'Ledger' && (
             <table className="w-full text-sm text-left">
               <thead className="bg-gray-50 border-b border-gray-100 text-gray-600 uppercase text-xs font-semibold">
                 <tr>
                   <th className="px-5 py-3">Date</th>
                   <th className="px-5 py-3">Type</th>
                   <th className="px-5 py-3">Ref No / Remarks</th>
                   <th className="px-5 py-3 text-right">Debit (Paid)</th>
                   <th className="px-5 py-3 text-right">Credit (Bill)</th>
                   <th className="px-5 py-3 text-right border-l border-gray-200">Balance</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-gray-100">
                 {ledger.length === 0 ? <tr><td colSpan="6" className="p-8 text-center text-gray-500">No Ledger Entries</td></tr> : null}
                 {ledger.map(tx => (
                   <tr key={tx.id} className="hover:bg-gray-50/50">
                     <td className="px-5 py-3 whitespace-nowrap">{formatDate(tx.transaction_date)}</td>
                     <td className="px-5 py-3">
                       <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${tx.transaction_type === 'PAYMENT' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                         {tx.transaction_type}
                       </span>
                     </td>
                     <td className="px-5 py-3">
                       <div className="font-mono text-xs">{tx.reference_no}</div>
                       <div className="text-xs text-gray-500">{tx.remarks}</div>
                     </td>
                     <td className="px-5 py-3 text-right text-green-700 font-medium">{parseFloat(tx.debit) > 0 ? formatCurrency(tx.debit) : '-'}</td>
                     <td className="px-5 py-3 text-right text-gray-800 font-medium">{parseFloat(tx.credit) > 0 ? formatCurrency(tx.credit) : '-'}</td>
                     <td className="px-5 py-3 text-right border-l border-gray-100 font-bold bg-gray-50/30">
                       <span className={parseFloat(tx.running_balance) > 0 ? 'text-red-600' : 'text-gray-900'}>{formatCurrency(tx.running_balance)}</span>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
           )}
         </div>
       </div>

       {showPayModal && (
         <PaymentModal 
           supplierId={id} 
           outstanding={outstanding} 
           onClose={() => setShowPayModal(false)} 
         />
       )}
    </div>
  )
}

function PaymentModal({ supplierId, outstanding, onClose }) {
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], amount: outstanding, ref_no: '', remarks: '' })
  const payMut = useRecordPayment()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (form.amount <= 0 || form.amount > outstanding) return toast.error('Check amount limits.')
    payMut.mutate({ id: supplierId, data: { payment_date: form.date, amount: form.amount, reference_no: form.ref_no, remarks: form.remarks } }, {
      onSuccess: () => { toast.success('Payment recorded'); onClose(); }
    })
  }

  return (
    <div className="fixed inset-0 bg-black/50 overflow-y-auto w-full h-full flex justify-center items-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 m-4 relative">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Record Payment</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
           <div>
             <label className="text-xs font-semibold text-gray-600 block mb-1">Payment Date</label>
             <input type="date" required className="input-field" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
           </div>
           <div>
             <label className="text-xs font-semibold text-gray-600 block mb-1">Amount (Max {formatCurrency(outstanding)})</label>
             <input type="number" step="0.01" max={outstanding} required className="input-field text-xl font-bold text-gray-900 py-3" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} />
           </div>
           <div>
             <label className="text-xs font-semibold text-gray-600 block mb-1">Reference No (Cheque / UTR)</label>
             <input type="text" required className="input-field" value={form.ref_no} onChange={e => setForm({...form, ref_no: e.target.value})} />
           </div>
           <div>
             <label className="text-xs font-semibold text-gray-600 block mb-1">Remarks</label>
             <input type="text" className="input-field" value={form.remarks} onChange={e => setForm({...form, remarks: e.target.value})} />
           </div>

           <div className="flex justify-end gap-3 pt-4">
             <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
             <button type="submit" disabled={payMut.isPending} className="btn-primary" style={{backgroundColor: '#10B981'}}>
               {payMut.isPending ? 'Recording...' : 'Confirm Payment'}
             </button>
           </div>
        </form>
      </div>
    </div>
  )
}
