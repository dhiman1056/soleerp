import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server'
import { printHTML } from '../utils/printUtils'
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate } from '../utils/formatDate'

const WorkOrderPrintLayout = ({ wo, settings }) => {
  const wipQty = parseFloat(wo.planned_qty || 0) - parseFloat(wo.received_qty || 0)
  const companyName = settings?.company_name || 'ShoeERP Manufacturing'
  const companyGstin = settings?.company_gstin ? ` | GSTIN: ${settings.company_gstin}` : ''
  const companyLogo = settings?.logo_url || null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        {companyLogo && <img src={companyLogo} alt="Logo" style={{ maxHeight: '50px', marginRight: '15px' }} />}
        <h1 style={{ margin: 0 }}>{companyName} &mdash; Work Order</h1>
      </div>
      {settings?.company_address && <div className="text-center text-xs mb-2 text-gray-600">{settings.company_address}{companyGstin}</div>}
      <div className="text-right text-xs mb-4">WO Date: {formatDate(wo.wo_date)}</div>

      <div className="header-grid">
        <div className="header-card">
          <div className="mb-2"><strong>WO No:</strong> {wo.wo_number}</div>
          <div className="mb-2"><strong>BOM Code:</strong> {wo.bom_code}</div>
          <div className="mb-2"><strong>WO Type:</strong> {wo.wo_type}</div>
          <div className="mb-2"><strong>From Store:</strong> {wo.from_store}</div>
          <div><strong>To Store:</strong> {wo.to_store}</div>
        </div>
        <div className="header-card">
          <div className="mb-2"><strong>Status:</strong> {wo.status}</div>
          <div className="mb-2"><strong>Planned Qty:</strong> {parseFloat(wo.planned_qty).toFixed(2)}</div>
          <div className="mb-2"><strong>Received Qty:</strong> {parseFloat(wo.received_qty).toFixed(2)}</div>
          <div className="mb-2"><strong>WIP Qty:</strong> {wipQty.toFixed(2)}</div>
          <div><strong>WIP Value:</strong> {formatCurrency(wo.wip_value)}</div>
        </div>
      </div>

      <h3 className="mb-2 border-bottom">Material Consumption</h3>
      <table>
        <thead>
          <tr>
            <th className="text-center">Sr. No</th>
            <th>SKU Code</th>
            <th>Material Description</th>
            <th className="text-right">Qty/Pair</th>
            <th className="text-right">Total Qty</th>
            <th className="text-center">UOM</th>
            <th className="text-right">Rate (₹)</th>
            <th className="text-right">Total Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          {wo.bom_lines?.map((line, idx) => {
             const totalQty = parseFloat(line.consume_qty) * parseFloat(wo.planned_qty)
             const totalVal = totalQty * parseFloat(line.rate_at_bom)
             return (
               <tr key={idx}>
                 <td className="text-center">{idx + 1}</td>
                 <td>{line.input_sku}</td>
                 <td>{line.input_description}</td>
                 <td className="text-right">{parseFloat(line.consume_qty).toFixed(4)}</td>
                 <td className="text-right">{totalQty.toFixed(4)}</td>
                 <td className="text-center">{line.uom}</td>
                 <td className="text-right">{formatCurrency(line.rate_at_bom)}</td>
                 <td className="text-right">{formatCurrency(totalVal)}</td>
               </tr>
             )
          })}
          <tr>
            <td colSpan="7" className="text-right font-bold">Total Material Value:</td>
            <td className="text-right font-bold text-xs">{formatCurrency((wo.total_bom_cost_per_unit || 0) * parseFloat(wo.planned_qty))}</td>
          </tr>
        </tbody>
      </table>

      <div className="sign-grid">
        <div>
          <div className="sign-line">Prepared By</div>
        </div>
        <div>
          <div className="sign-line">Approved By</div>
        </div>
        <div>
          <div className="sign-line">Store Incharge</div>
        </div>
      </div>

      <div className="mt-8 text-xs text-center text-gray-500 italic">
        Printed on {formatDate(new Date())}
      </div>
    </div>
  )
}

export const printWorkOrder = (wo, settings = {}) => {
  const html = renderToStaticMarkup(<WorkOrderPrintLayout wo={wo} settings={settings} />)
  printHTML(html, `WO_${wo.wo_number}`)
}
