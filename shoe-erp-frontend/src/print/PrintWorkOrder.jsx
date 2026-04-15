// No React or renderToStaticMarkup needed — plain HTML string rendered via window.open
import { formatCurrency } from '../utils/formatCurrency'
import { formatDate }     from '../utils/formatDate'

export const printWorkOrder = (wo, settings = {}) => {
  const wipQty      = parseFloat(wo.planned_qty  || 0) - parseFloat(wo.received_qty || 0)
  const companyName = settings?.company_name    || 'ShoeERP Manufacturing'
  const companyAddr = settings?.company_address || ''
  const companyGstin = settings?.company_gstin  ? ` | GSTIN: ${settings.company_gstin}` : ''
  const logoUrl     = settings?.logo_url        || ''

  // Use wo.lines (getWorkOrder returns lines); wo.bom_lines is the old field name
  const lines = Array.isArray(wo.lines) ? wo.lines : []

  // Compute total from lines (total_bom_cost_per_unit not returned by backend)
  const totalMaterialValue = lines.reduce((sum, l) => {
    const totalQty = parseFloat(l.consume_qty || 0) * parseFloat(wo.planned_qty || 0)
    return sum + totalQty * parseFloat(l.rate_at_bom || 0)
  }, 0)

  const linesHtml = lines.length > 0 ? `
    <h3 style="margin:24px 0 8px; border-bottom:2px solid #333; padding-bottom:4px;">Material Consumption</h3>
    <table>
      <thead>
        <tr>
          <th style="text-align:center;">Sr. No</th>
          <th>SKU Code</th>
          <th>Material Description</th>
          <th style="text-align:right;">Qty/Unit</th>
          <th style="text-align:right;">Total Qty</th>
          <th style="text-align:center;">UOM</th>
          <th style="text-align:right;">Rate (₹)</th>
          <th style="text-align:right;">Total Value (₹)</th>
        </tr>
      </thead>
      <tbody>
        ${lines.map((l, idx) => {
          const totalQty = parseFloat(l.consume_qty || 0) * parseFloat(wo.planned_qty || 0)
          const totalVal = totalQty * parseFloat(l.rate_at_bom || 0)
          return `
            <tr>
              <td style="text-align:center;">${idx + 1}</td>
              <td style="font-family:monospace;">${l.input_sku || ''}</td>
              <td>${l.description || ''}</td>
              <td style="text-align:right;">${parseFloat(l.consume_qty || 0).toFixed(4)}</td>
              <td style="text-align:right;">${totalQty.toFixed(4)}</td>
              <td style="text-align:center;">${l.uom || ''}</td>
              <td style="text-align:right;">${formatCurrency(l.rate_at_bom)}</td>
              <td style="text-align:right;">${formatCurrency(totalVal)}</td>
            </tr>`
        }).join('')}
        <tr>
          <td colspan="7" style="text-align:right; font-weight:bold; border-top:2px solid #333;">Total Material Value:</td>
          <td style="text-align:right; font-weight:bold; border-top:2px solid #333;">${formatCurrency(totalMaterialValue)}</td>
        </tr>
      </tbody>
    </table>
  ` : ''

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <title>Work Order ${wo.wo_number || ''}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #111; padding: 24px; }
    .logo-header { display: flex; align-items: center; justify-content: center; margin-bottom: 8px; gap: 16px; }
    .logo-header img { max-height: 50px; }
    .company-title { font-size: 22px; font-weight: bold; }
    .doc-title { font-size: 18px; font-weight: bold; color: #444; text-align: right; }
    .company-sub { text-align: center; font-size: 11px; color: #666; margin-bottom: 16px; }
    .header-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 16px 0; }
    .header-card { border: 1px solid #ddd; border-radius: 6px; padding: 12px; background: #fafafa; }
    .header-card div { margin-bottom: 6px; font-size: 13px; }
    .header-card div:last-child { margin-bottom: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 12px; }
    th, td { border: 1px solid #ccc; padding: 7px 10px; }
    th { background: #f0f0f0; font-weight: bold; }
    .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 24px; margin-top: 48px; }
    .sign-line { border-top: 1px solid #555; padding-top: 6px; text-align: center; font-size: 11px; color: #555; }
    .footer { margin-top: 24px; text-align: center; font-size: 10px; color: #999; font-style: italic; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="logo-header">
    ${logoUrl ? `<img src="${logoUrl}" alt="Logo"/>` : ''}
    <div>
      <div class="company-title">${companyName}</div>
      <div class="doc-title">Work Order</div>
    </div>
  </div>
  ${companyAddr ? `<div class="company-sub">${companyAddr}${companyGstin}</div>` : ''}

  <div class="header-grid">
    <div class="header-card">
      <div><strong>WO Number:</strong> ${wo.wo_number || ''}</div>
      <div><strong>WO Date:</strong>   ${formatDate(wo.wo_date)}</div>
      <div><strong>BOM Code:</strong>  ${wo.bom_code || ''}</div>
      <div><strong>WO Type:</strong>   ${(wo.wo_type || '').replace(/_/g, ' → ')}</div>
      <div><strong>From Store:</strong> ${wo.from_store || ''}</div>
      <div><strong>To Store:</strong>   ${wo.to_store || ''}</div>
    </div>
    <div class="header-card">
      <div><strong>Product:</strong>      ${wo.product_name || wo.output_sku || ''}</div>
      <div><strong>Status:</strong>       ${wo.status || ''}</div>
      <div><strong>Planned Qty:</strong>  ${parseFloat(wo.planned_qty  || 0).toFixed(2)}</div>
      <div><strong>Received Qty:</strong> ${parseFloat(wo.received_qty || 0).toFixed(2)}</div>
      <div><strong>WIP Qty:</strong>      ${wipQty.toFixed(2)}</div>
    </div>
  </div>

  ${linesHtml}

  <div class="sign-grid">
    <div><div class="sign-line">Prepared By</div></div>
    <div><div class="sign-line">Approved By</div></div>
    <div><div class="sign-line">Store Incharge</div></div>
  </div>

  <div class="footer">Printed on ${formatDate(new Date())}</div>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print.')
    return
  }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}
