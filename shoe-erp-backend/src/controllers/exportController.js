const { getClient } = require('../config/db');
const ExcelJS       = require('exceljs');
const PDFDocument   = require('pdfkit');
const reportController = require('./reportController');

const applyHeaderStyle = (worksheet, headerRowIndex = 1) => {
  worksheet.getRow(headerRowIndex).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(headerRowIndex).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
};

// Reuse the v_wip view for export data
const getWipData = async () => {
  const qv = `
    SELECT 
      wo_id,
      wo_number,
      bom_code,
      output_sku,
      output_description,
      wo_type,
      wo_date,
      from_store,
      to_store,
      planned_qty,
      received_qty,
      wip_qty,
      wip_value,
      status
    FROM v_wip
    ORDER BY wo_type, wo_number DESC
  `;
  const client = await getClient();
  const viewRes = await client.query(qv);
  client.release();
  return viewRes.rows;
};

// GET /api/export/stock/excel
const exportStockExcel = async (req, res, next) => {
  const client = await getClient();
  try {
    const sumRes = await client.query(`
      SELECT p.sku_code, p.description, p.uom,
             COALESCE(s.current_qty, 0) AS current_qty,
             COALESCE(s.avg_rate, p.rate, 0) AS avg_rate,
             COALESCE(s.current_value, 0) AS current_value,
             COALESCE(s.reorder_level, 0) AS reorder_level
      FROM product_master p
      LEFT JOIN stock_summary s ON s.sku_code = p.sku_code
      ORDER BY p.sku_code
    `);

    const alertsRes = await client.query(`
      SELECT p.sku_code, p.description, p.uom, 
             COALESCE(s.current_qty, 0) AS current_qty, 
             s.reorder_level,
             (s.reorder_level - COALESCE(s.current_qty, 0)) AS shortage_qty
      FROM product_master p
      JOIN stock_summary s ON p.sku_code = s.sku_code
      WHERE COALESCE(s.current_qty, 0) <= s.reorder_level AND s.reorder_level > 0
      ORDER BY shortage_qty DESC
    `);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shoe ERP';

    // Summary Sheet
    const sheet1 = workbook.addWorksheet('Stock Summary');
    sheet1.addRow(['SKU Code', 'Description', 'UOM', 'Current Qty', 'Avg Rate', 'Current Value', 'Reorder Level']);
    applyHeaderStyle(sheet1);
    sumRes.rows.forEach(r => sheet1.addRow([
      r.sku_code, r.description, r.uom, parseFloat(r.current_qty), parseFloat(r.avg_rate), parseFloat(r.current_value), parseFloat(r.reorder_level)
    ]));

    // Low Stock Alert Sheet
    const sheet2 = workbook.addWorksheet('Low Stock Alerts');
    sheet2.addRow(['SKU Code', 'Description', 'UOM', 'Current Qty', 'Reorder Level', 'Shortage Qty']);
    applyHeaderStyle(sheet2);

    alertsRes.rows.forEach(r => sheet2.addRow([
      r.sku_code, r.description, r.uom, parseFloat(r.current_qty), parseFloat(r.reorder_level), parseFloat(r.shortage_qty)
    ]));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'Stock_Report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  } finally {
    client.release();
  }
};

const createMockRes = () => ({
  data: null,
  status: function() { return this; },
  json: function(d) { this.data = d; return this; }
});

const exportProductionExcel = async (req, res, next) => {
  try {
    const mockRes = createMockRes();
    await reportController.getProductionSummary(req, mockRes, next);
    if (!mockRes.data) return;
    
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Shoe ERP';
    
    const ws = workbook.addWorksheet('By Product');
    ws.columns = [
      { header: 'Product SKU', key: 'fgSku', width: 20 },
      { header: 'Description', key: 'fgDesc', width: 30 },
      { header: 'Planned Qty', key: 'planned', width: 15 },
      { header: 'Received Qty', key: 'received', width: 15 },
      { header: 'WIP Qty', key: 'wip', width: 15 },
      { header: 'Value (₹)', key: 'value', width: 20 }
    ];
    applyHeaderStyle(ws);
    mockRes.data.byProduct.forEach(r => ws.addRow(r));
    
    const ws2 = workbook.addWorksheet('By Size');
    ws2.columns = [
      { header: 'Size Code', key: 'sizeCode', width: 15 },
      { header: 'Planned Qty', key: 'planned', width: 15 },
      { header: 'Received Qty', key: 'received', width: 15 },
      { header: 'WIP Qty', key: 'wip', width: 15 }
    ];
    applyHeaderStyle(ws2);
    mockRes.data.bySize.forEach(r => ws2.addRow(r));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Production_Report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

const exportConsumptionExcel = async (req, res, next) => {
  try {
    const mockRes = createMockRes();
    await reportController.getMaterialConsumption(req, mockRes, next);
    if (!mockRes.data) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Material Consumption');
    ws.columns = [
      { header: 'SKU', key: 'rmSku', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'UOM', key: 'uom', width: 10 },
      { header: 'Opening Stock', key: 'openingStock', width: 15 },
      { header: 'Purchased', key: 'purchased', width: 15 },
      { header: 'Consumed', key: 'consumed', width: 15 },
      { header: 'Closing Stock', key: 'closingStock', width: 15 },
      { header: 'Avg Rate (₹)', key: 'avgRate', width: 15 },
      { header: 'Total Value (₹)', key: 'totalConsumptionValue', width: 20 }
    ];
    applyHeaderStyle(ws);
    mockRes.data.byMaterial.forEach(r => ws.addRow(r));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Consumption_Report.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

const exportCostSheetExcel = async (req, res, next) => {
  try {
    const mockRes = createMockRes();
    const client = await getClient();
    const prods = await client.query(`SELECT sku_code FROM product_master WHERE product_type = 'FINISHED'`);
    
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Cost Sheets');
    ws.columns = [
      { header: 'FG SKU', key: 'sku', width: 20 },
      { header: 'Average Cost (₹)', key: 'avg', width: 15 },
      { header: 'Lowest Cost (₹)', key: 'low', width: 15 },
      { header: 'Highest Cost (₹)', key: 'high', width: 15 }
    ];
    applyHeaderStyle(ws);

    for (const p of prods.rows) {
       req.params = { fgSku: p.sku_code };
       await reportController.getCostSheet(req, mockRes, next);
       if (mockRes.data && mockRes.data.success !== false) {
          ws.addRow({
             sku: mockRes.data.product.sku,
             avg: mockRes.data.costSheet.averageCost,
             low: mockRes.data.costSheet.lowestCost?.value || 0,
             high: mockRes.data.costSheet.highestCost?.value || 0
          });
       }
    }
    client.release();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=CostSheets.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

const exportWipAgingExcel = async (req, res, next) => {
  try {
    const mockRes = createMockRes();
    await reportController.getWipAging(req, mockRes, next);
    if (!mockRes.data) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('WIP Aging Details');
    ws.columns = [
      { header: 'WO Number', key: 'woId', width: 20 },
      { header: 'Product', key: 'product', width: 30 },
      { header: 'WO Date', key: 'woDate', width: 15 },
      { header: 'Age (Days)', key: 'ageDays', width: 15 },
      { header: 'WIP Qty', key: 'wipQty', width: 15 },
      { header: 'WIP Value (₹)', key: 'wipValue', width: 20 }
    ];
    applyHeaderStyle(ws);
    mockRes.data.details.forEach(r => ws.addRow(r));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=WIP_Aging.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

const exportStockValuationExcel = async (req, res, next) => {
  try {
    const mockRes = createMockRes();
    await reportController.getStockValuation(req, mockRes, next);
    if (!mockRes.data) return;

    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet('Stock Valuation');
    ws.columns = [
      { header: 'SKU', key: 'sku', width: 20 },
      { header: 'Description', key: 'description', width: 30 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'UOM', key: 'uom', width: 10 },
      { header: 'Qty', key: 'qty', width: 15 },
      { header: 'Avg Rate (₹)', key: 'avgRate', width: 15 },
      { header: 'Value (₹)', key: 'value', width: 20 },
      { header: 'Low Stock', key: 'isLowStock', width: 15 }
    ];
    applyHeaderStyle(ws);
    mockRes.data.items.forEach(r => ws.addRow({ ...r, isLowStock: r.isLowStock ? 'YES' : 'NO' }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Stock_Valuation.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
};

const exportWIPExcel = async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=WIP_Report.xlsx');
    res.send('mock-excel-data');
  } catch (err) { next(err); }
};

const exportWIPPdf = async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=WIP_Report.pdf');
    res.send('mock-pdf-data');
  } catch (err) { next(err); }
};

const exportBOMExcel = async (req, res, next) => {
  try {
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=BOM_Report.xlsx');
    res.send('mock-excel-data');
  } catch (err) { next(err); }
};

// Aliasing the older ones to exactly what user wants
const exportWIPAgingExcel = exportWipAgingExcel;

module.exports = {
  exportWIPExcel,
  exportWIPPdf,
  exportBOMExcel,
  exportStockExcel,
  exportProductionExcel,
  exportConsumptionExcel,
  exportCostSheetExcel,
  exportWIPAgingExcel,
  exportStockValuationExcel
};
