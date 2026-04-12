'use strict';

const { query, pool } = require('../config/db');

const getProductionSummary = async (req, res) => {
  try {
    const { from_date, to_date, wo_type, status } = req.query

    let conditions = []
    let params = []

    if (from_date) {
      params.push(from_date)
      conditions.push(`w.wo_date >= $${params.length}`)
    }
    if (to_date) {
      params.push(to_date)
      conditions.push(`w.wo_date <= $${params.length}`)
    }
    if (wo_type) {
      params.push(wo_type)
      conditions.push(`w.wo_type = $${params.length}`)
    }
    if (status) {
      params.push(status)
      conditions.push(`w.status = $${params.length}`)
    }

    const where = conditions.length 
      ? `WHERE ${conditions.join(' AND ')}` : ''

    const summary = await query(`
      SELECT
        COUNT(*) as total_work_orders,
        COALESCE(SUM(w.planned_qty), 0) as total_planned_qty,
        COALESCE(SUM(w.received_qty), 0) as total_received_qty,
        COALESCE(SUM(w.planned_qty - w.received_qty), 0) as total_wip_qty,
        CASE WHEN SUM(w.planned_qty) > 0
          THEN ROUND((SUM(w.received_qty) / SUM(w.planned_qty)) * 100, 2)
          ELSE 0
        END as completion_rate
      FROM work_order_header w
      ${where}
    `, params)

    const byWoType = await query(`
      SELECT
        w.wo_type,
        COUNT(*) as orders,
        COALESCE(SUM(w.planned_qty), 0) as planned,
        COALESCE(SUM(w.received_qty), 0) as received,
        COALESCE(SUM(w.planned_qty - w.received_qty), 0) as wip
      FROM work_order_header w
      ${where}
      GROUP BY w.wo_type
    `, params)

    const byProduct = await query(`
      SELECT
        b.output_sku as fg_sku,
        p.description as fg_desc,
        COALESCE(SUM(w.planned_qty), 0) as planned,
        COALESCE(SUM(w.received_qty), 0) as received,
        COALESCE(SUM(w.planned_qty - w.received_qty), 0) as wip
      FROM work_order_header w
      JOIN bom_header b ON w.bom_id = b.id
      JOIN product_master p ON b.output_sku = p.sku_code
      ${where}
      GROUP BY b.output_sku, p.description
      ORDER BY planned DESC
    `, params)

    const dailyTrend = await query(`
      SELECT
        wo_date as date,
        COALESCE(SUM(planned_qty), 0) as planned,
        COALESCE(SUM(received_qty), 0) as received
      FROM work_order_header w
      ${where}
      GROUP BY wo_date
      ORDER BY wo_date
    `, params)

    res.json({
      success: true,
      data: {
        summary: summary.rows[0],
        byWoType: byWoType.rows,
        byProduct: byProduct.rows,
        dailyTrend: dailyTrend.rows
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

const getMaterialConsumption = async (req, res) => {
  try {
    const { from_date, to_date, sku_code } = req.query;
    let baseWhere = `WHERE pm.product_type = 'RAW_MATERIAL'`;
    const params = [];
    if(sku_code) { params.push(sku_code); baseWhere += ` AND pm.sku_code = $${params.length}`; }

    const matRes = await query(`
      SELECT 
        pm.sku_code, pm.description, pm.uom, ss.avg_rate,
        COALESCE(ss.current_qty, 0) as closing_stock,
        COALESCE((SELECT SUM(qty_out) FROM stock_ledger sl WHERE sl.sku_code = pm.sku_code AND sl.transaction_type = 'WO_ISSUE' ${from_date ? `AND sl.transaction_date >= '${from_date}'` : ''} ${to_date ? `AND sl.transaction_date <= '${to_date}'` : ''}), 0) as consumed,
        COALESCE((SELECT SUM(value_out) FROM stock_ledger sl WHERE sl.sku_code = pm.sku_code AND sl.transaction_type = 'WO_ISSUE' ${from_date ? `AND sl.transaction_date >= '${from_date}'` : ''} ${to_date ? `AND sl.transaction_date <= '${to_date}'` : ''}), 0) as totalConsumptionValue,
        COALESCE((SELECT SUM(qty_in) FROM stock_ledger sl WHERE sl.sku_code = pm.sku_code AND sl.transaction_type = 'PURCHASE' ${from_date ? `AND sl.transaction_date >= '${from_date}'` : ''} ${to_date ? `AND sl.transaction_date <= '${to_date}'` : ''}), 0) as purchased,
        COALESCE((SELECT SUM(value_in) FROM stock_ledger sl WHERE sl.sku_code = pm.sku_code AND sl.transaction_type = 'PURCHASE' ${from_date ? `AND sl.transaction_date >= '${from_date}'` : ''} ${to_date ? `AND sl.transaction_date <= '${to_date}'` : ''}), 0) as totalPurchaseValue
      FROM product_master pm
      LEFT JOIN stock_summary ss ON ss.sku_code = pm.sku_code
      ${baseWhere}
    `, params);
    
    let summary = { totalMaterialsConsumed: 0, totalConsumptionValue: 0, totalPurchaseValue: 0, consumptionRatio: 0 };
    let byMaterial = [];

    matRes.rows.forEach(r => {
      const consumed = parseFloat(r.consumed);
      const purchased = parseFloat(r.purchased);
      const valC = parseFloat(r.totalconsumptionvalue);
      const valP = parseFloat(r.totalpurchasevalue);
      
      if(consumed > 0 || purchased > 0) {
        if(consumed > 0) summary.totalMaterialsConsumed += 1;
        summary.totalConsumptionValue += valC;
        summary.totalPurchaseValue += valP;
        
        const openingStock = parseFloat(r.closing_stock) + consumed - purchased;
        
        byMaterial.push({
          rmSku: r.sku_code,
          description: r.description,
          uom: r.uom,
          openingStock: +openingStock.toFixed(3),
          purchased: +purchased.toFixed(3),
          consumed: +consumed.toFixed(3),
          closingStock: parseFloat(r.closing_stock),
          avgRate: parseFloat(r.avg_rate),
          totalConsumptionValue: valC
        });
      }
    });

    return res.status(200).json({ success: true, data: { summary, byMaterial } });
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
};

const getCostSheet = async (req, res) => {
  try {
    const fgSku = req.params.fgSku;
    const prodRes = await query(`SELECT sku_code, description, product_type FROM product_master WHERE sku_code = $1`, [fgSku]);
    if(!prodRes.rows.length) return res.status(404).json({ success: false, message: 'Product not found' });
    
    const product = { sku: fgSku, description: prodRes.rows[0].description, type: prodRes.rows[0].product_type };

    const bomRes = await query(`SELECT id FROM bom_header WHERE output_sku = $1 AND is_active = TRUE ORDER BY id DESC LIMIT 1`, [fgSku]);
    if(!bomRes.rows.length) return res.status(404).json({ success: false, message: 'Active BOM not found for this product.' });
    const bomId = bomRes.rows[0].id;

    const linesRes = await query(`SELECT bl.input_sku, pm.description, bl.consume_qty, bl.rate_at_bom FROM bom_lines bl JOIN product_master pm ON pm.sku_code = bl.input_sku WHERE bl.bom_id = $1`, [bomId]);
    
    let totalAllSizes = 0;
    let md = [];
    linesRes.rows.forEach(l => {
       const qty = parseFloat(l.consume_qty);
       const rate = parseFloat(l.rate_at_bom);
       const val = qty * rate;
       totalAllSizes += val;
       md.push({ sku: l.input_sku, desc: l.description, qty, rate, value: +val.toFixed(2) });
    });

    return res.status(200).json({
      success: true, 
      data: {
        product,
        costSheet: {
          materialCost: +totalAllSizes.toFixed(2),
          materialBreakdown: md
        }
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
};

const getWipAging = async (req, res) => {
  try {
    const as_of_date = req.query.as_of_date || new Date().toISOString().slice(0, 10);
    
    const woRes = await query(`
      SELECT wo.id, wo.wo_number, wo.wo_date, wo.planned_qty, wo.received_qty, (wo.planned_qty - wo.received_qty) as wip_qty,
             pm.description as product_desc
      FROM work_order_header wo
      JOIN bom_header bh ON bh.id = wo.bom_id
      JOIN product_master pm ON pm.sku_code = bh.output_sku
      WHERE wo.status IN ('ISSUED', 'PARTIAL') AND wo.wo_date <= $1
    `, [as_of_date]);

    const todayMillis = new Date(as_of_date).getTime();
    
    let summary = { total: 0, value: 0 };
    let agingMap = {
      '0-7 days': { bucket: '0-7 days', count: 0, qty: 0, value: 0 },
      '8-15 days': { bucket: '8-15 days', count: 0, qty: 0, value: 0 },
      '16-30 days': { bucket: '16-30 days', count: 0, qty: 0, value: 0 },
      '30+ days': { bucket: '30+ days', count: 0, qty: 0, value: 0 }
    };
    
    const details = [];

    for (const wo of woRes.rows) {
      const woDateMillis = new Date(wo.wo_date).getTime();
      const ageDays = Math.floor((todayMillis - woDateMillis) / (1000 * 60 * 60 * 24));
      let bucket = '30+ days';
      if (ageDays <= 7) bucket = '0-7 days';
      else if (ageDays <= 15) bucket = '8-15 days';
      else if (ageDays <= 30) bucket = '16-30 days';

      const wipQty = parseFloat(wo.wip_qty);
      const lines = await query(`SELECT SUM(consume_qty * rate_at_bom) as unit_cost FROM bom_lines WHERE bom_id = (SELECT bom_id FROM work_order_header WHERE id = $1)`, [wo.id]);
      const unitCost = parseFloat(lines.rows[0]?.unit_cost || 0);
      const wipValue = wipQty * unitCost;

      summary.total += 1;
      summary.value += wipValue;

      agingMap[bucket].count += 1;
      agingMap[bucket].qty += wipQty;
      agingMap[bucket].value += wipValue;

      details.push({
        woId: wo.wo_number,
        product: wo.product_desc,
        woDate: new Date(wo.wo_date).toISOString().slice(0, 10),
        ageDays,
        wipQty,
        wipValue: +wipValue.toFixed(2)
      });
    }

    return res.status(200).json({
      success: true, 
      data: {
        summary: { total: summary.total, value: +summary.value.toFixed(2) },
        aging: Object.values(agingMap).map(a => ({ ...a, value: +a.value.toFixed(2) })),
        details: details.sort((a,b) => b.ageDays - a.ageDays)
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
};

const getStockValuation = async (req, res) => {
  try {
    const category = req.query.category;
    let where = `1=1`;
    const params = [];
    if (category && category !== 'ALL') {
       params.push(category);
       where += ` AND pm.product_type = $1`;
    }

    const resQuery = await query(`
      SELECT pm.sku_code, pm.description, pm.product_type, pm.uom, ss.current_qty, ss.avg_rate, ss.current_value, ss.reorder_level
      FROM stock_summary ss
      JOIN product_master pm ON pm.sku_code = ss.sku_code
      WHERE ${where}
      ORDER BY pm.sku_code
    `, params);

    let summary = {
      totalSkus: 0,
      totalValue: 0
    };

    const items = resQuery.rows.map(r => {
      const v = parseFloat(r.current_value || 0);
      summary.totalSkus += 1;
      summary.totalValue += v;
      return {
        sku: r.sku_code,
        description: r.description,
        category: r.product_type,
        uom: r.uom,
        qty: parseFloat(r.current_qty),
        avgRate: parseFloat(r.avg_rate),
        value: v,
        reorderLevel: parseFloat(r.reorder_level || 0),
        isLowStock: parseFloat(r.current_qty) <= parseFloat(r.reorder_level || 0)
      };
    });

    return res.status(200).json({ success: true, data: { summary, items } });
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
};

module.exports = {
  getProductionSummary,
  getMaterialConsumption,
  getCostSheet,
  getWipAging,
  getStockValuation
};
