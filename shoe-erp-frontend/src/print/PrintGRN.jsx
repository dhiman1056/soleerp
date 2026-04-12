import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server'
import { printHTML } from '../utils/printUtils'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

const GRNPrintLayout = ({ grn, settings }) => {
  const companyName = settings?.company_name || 'ShoeERP Manufacturing'
  const companyGstin = settings?.company_gstin ? ` | GSTIN: ${settings.company_gstin}` : ''
  const companyLogo = settings?.logo_url || null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
         {companyLogo && <img src={companyLogo} alt="Logo" style={{ maxHeight: '50px', marginRight: '15px' }} />}
         <h1 style={{ margin: 0 }}>{companyName} &mdash; Goods Receipt Note</h1>
      </div>
      {settings?.company_address && <div className="text-center text-xs mb-4 text-gray-600">{settings.company_address}{companyGstin}</div>}

      <div className="header-grid">
        <div className="header-card">
          <div className="mb-2"><strong>GRN Number:</strong> {grn.grn_number || grn.transaction_id || grn.id || 'N/A'}</div>
          <div className="mb-2"><strong>Receipt Date:</strong> {formatDate(grn.receipt_date || grn.transaction_date)}</div>
          <div className="mb-2"><strong>PO Reference:</strong> {grn.po_number}</div>
        </div>
        <div className="header-card">
          <div className="mb-2"><strong>Supplier:</strong> {grn.supplier_name}</div>
          <div className="mb-2"><strong>Challan / Invoice No:</strong> {grn.challan_no || 'N/A'}</div>
          <div className="mb-2"><strong>Status:</strong> RECEIVED</div>
        </div>
      </div>

      <h3 className="mb-2 border-bottom">Received Items</h3>
      <table>
        <thead>
          <tr>
            <th className="text-center">Sr. No</th>
            <th>SKU Code</th>
            <th>Description</th>
            <th className="text-center">UOM</th>
            <th className="text-right">Order Qty</th>
            <th className="text-right">Received Qty</th>
            <th className="text-right">Accepted Qty</th>
          </tr>
        </thead>
        <tbody>
           {grn.lines?.map((line, idx) => (
             <tr key={idx}>
               <td className="text-center">{idx + 1}</td>
               <td>{line.sku_code}</td>
               <td>{line.sku_description}</td>
               <td className="text-center">{line.uom}</td>
               <td className="text-right">{parseFloat(line.order_qty || 0).toFixed(2)}</td>
               <td className="text-right">{parseFloat(line.received_qty || line.qty_in).toFixed(2)}</td>
               <td className="text-right font-bold">{parseFloat(line.accepted_qty || line.qty_in).toFixed(2)}</td>
             </tr>
           ))}
        </tbody>
      </table>

      {grn.remarks && (
         <div className="mt-4 text-xs">
           <strong>Remarks:</strong>
           <p>{grn.remarks}</p>
         </div>
      )}

      <div className="sign-grid mt-8">
        <div>
          <div className="sign-line">Received By</div>
        </div>
        <div>
          <div className="sign-line">Store Incharge</div>
        </div>
        <div>
          <div className="sign-line">Quality Check</div>
        </div>
        <div>
          <div className="sign-line">Accounts</div>
        </div>
      </div>
    </div>
  )
}

export const printGRN = (grn, settings = {}) => {
  const html = renderToStaticMarkup(<GRNPrintLayout grn={grn} settings={settings} />)
  printHTML(html, `GRN_${grn.po_number || grn.id}`)
}
