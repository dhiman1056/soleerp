import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server'
import { printHTML } from '../utils/printUtils'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

const POPrintLayout = ({ po, settings }) => {
  const companyName = settings?.company_name || 'ShoeERP Manufacturing'
  const companyGstin = settings?.company_gstin ? ` | GSTIN: ${settings.company_gstin}` : ''
  const companyLogo = settings?.logo_url || null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        {companyLogo && <img src={companyLogo} alt="Logo" style={{ maxHeight: '50px', marginRight: '15px' }} />}
        <h1 style={{ margin: 0 }}>{companyName} &mdash; Purchase Order</h1>
      </div>
      {settings?.company_address && <div className="text-center text-xs mb-4 text-gray-600">{settings.company_address}{companyGstin}</div>}

      <div className="header-grid">
        <div className="header-card">
          <div className="mb-2"><strong>PO Number:</strong> {po.po_number}</div>
          <div className="mb-2"><strong>PO Date:</strong> {formatDate(po.po_date)}</div>
          <div className="mb-2"><strong>Status:</strong> {po.status}</div>
          <div className="text-red-700"><strong>Expected Delivery Data:</strong> {formatDate(po.expected_delivery_date)}</div>
        </div>
        <div className="header-card">
          <div className="mb-2"><strong>Supplier:</strong> {po.supplier_name}</div>
          <div className="mb-2"><strong>Address:</strong> {po.supplier_address || 'N/A'}</div>
          <div className="mb-2"><strong>Email:</strong> {po.supplier_email || 'N/A'}</div>
          <div className="mb-2"><strong>Phone:</strong> {po.supplier_phone || 'N/A'}</div>
        </div>
      </div>

      <h3 className="mb-2 border-bottom">Line Items</h3>
      <table>
        <thead>
          <tr>
            <th className="text-center">Sr. No</th>
            <th>SKU Code</th>
            <th>Description</th>
            <th className="text-center">UOM</th>
            <th className="text-right">Qty</th>
            <th className="text-right">Rate (₹)</th>
            <th className="text-right">Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          {po.lines?.map((line, idx) => (
            <tr key={idx}>
              <td className="text-center">{idx + 1}</td>
              <td>{line.sku_code}</td>
              <td>{line.sku_description || line.description}</td>
              <td className="text-center">{line.uom}</td>
              <td className="text-right">{parseFloat(line.order_qty).toFixed(2)}</td>
              <td className="text-right">{formatCurrency(line.rate)}</td>
              <td className="text-right">{formatCurrency(line.line_total)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan="6" className="text-right font-bold">Total Value:</td>
            <td className="text-right font-bold">{formatCurrency(po.total_value)}</td>
          </tr>
        </tbody>
      </table>

      {po.payment_terms && (
        <div className="mt-4 text-xs">
          <strong>Terms & Conditions:</strong>
          <p style={{ whiteSpace: 'pre-wrap' }}>{po.payment_terms}</p>
        </div>
      )}

      <div className="mt-8 text-xs text-center text-gray-500 italic">This is a computer generated document</div>

      <div className="sign-grid">
        <div style={{ flex: 1 }}></div>
        <div style={{ flex: 1, textAlign: 'right' }}>
           <div className="sign-line" style={{ display: 'inline-block', width: '200px' }}>Authorised Signatory</div>
        </div>
      </div>
    </div>
  )
}

export const printPurchaseOrder = (po, settings = {}) => {
  const html = renderToStaticMarkup(<POPrintLayout po={po} settings={settings} />)
  printHTML(html, `PO_${po.po_number}`)
}
