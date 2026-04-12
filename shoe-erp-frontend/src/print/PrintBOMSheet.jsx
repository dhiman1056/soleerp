import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server'
import { printHTML } from '../utils/printUtils'
import { formatCurrency } from '../utils/formatCurrency'

const BOMPrintLayout = ({ bom, settings }) => {
  const d = new Date()
  const dateStr = `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`
  const companyName = settings?.company_name || 'ShoeERP Manufacturing'
  const companyGstin = settings?.company_gstin ? ` | GSTIN: ${settings.company_gstin}` : ''
  const companyLogo = settings?.logo_url || null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
        {companyLogo && <img src={companyLogo} alt="Logo" style={{ maxHeight: '50px', marginRight: '15px' }} />}
        <h1 style={{ margin: 0 }}>{companyName} &mdash; Bill of Material</h1>
      </div>
      {settings?.company_address && <div className="text-center text-xs text-gray-600 mb-1">{settings.company_address}{companyGstin}</div>}
      <div className="text-right text-xs mb-4">Date Printed: {dateStr}</div>
      
      <div className="header-grid">
        <div className="header-card">
          <div className="mb-2"><strong>BOM Code:</strong> {bom.bom_code}</div>
          <div className="mb-2"><strong>Type:</strong> {bom.bom_type}</div>
        </div>
        <div className="header-card">
          <div className="mb-2"><strong>Output Product:</strong> {bom.output_description}</div>
          <div className="mb-2"><strong>SKU:</strong> {bom.output_sku}</div>
          <div className="mb-2"><strong>Output Qty:</strong> {bom.output_qty} {bom.output_uom}</div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th className="text-center">Sr. No</th>
            <th>SKU Code</th>
            <th>Description</th>
            <th className="text-right">Consume Qty</th>
            <th className="text-center">UOM</th>
            <th className="text-right">Rate (₹)</th>
            <th className="text-right">Value (₹)</th>
          </tr>
        </thead>
        <tbody>
          {bom.lines?.map((line, idx) => (
            <tr key={idx}>
              <td className="text-center">{idx + 1}</td>
              <td>{line.input_sku}</td>
              <td>{line.input_description}</td>
              <td className="text-right">{parseFloat(line.consume_qty).toFixed(4)}</td>
              <td className="text-center">{line.uom}</td>
              <td className="text-right">{formatCurrency(line.rate_at_bom)}</td>
              <td className="text-right">{formatCurrency(line.line_cost)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan="6" className="text-right font-bold">Total Material Cost per unit:</td>
            <td className="text-right font-bold">{formatCurrency(bom.total_bom_cost_per_unit || bom.total_material_cost)}</td>
          </tr>
        </tbody>
      </table>
      <div className="mt-8 text-xs text-center text-gray-500 italic">
        Printed on {dateStr}
      </div>
    </div>
  )
}

export const printBOMSheet = (bom, settings = {}) => {
  const html = renderToStaticMarkup(<BOMPrintLayout bom={bom} settings={settings} />)
  printHTML(html, `BOM_${bom.bom_code}`)
}
