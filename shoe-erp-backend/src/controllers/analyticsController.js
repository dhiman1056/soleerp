'use strict';

exports.getOverview = async (req, res) => {
  try {
    const pool = require('../config/db')
    
    const [production, wip, inventory, procurement] = 
      await Promise.all([
        pool.query(`
          SELECT 
            COUNT(*) as total_orders,
            COALESCE(SUM(planned_qty),0) as planned,
            COALESCE(SUM(received_qty),0) as received,
            COALESCE(SUM(planned_qty - received_qty),0) as wip_qty
          FROM work_order_header
          WHERE DATE_TRUNC('month', wo_date) = DATE_TRUNC('month', NOW())
        `),
        pool.query(`
          SELECT 
            COUNT(*) as total_orders,
            COALESCE(SUM(planned_qty - received_qty),0) as total_qty
          FROM work_order_header
          WHERE planned_qty > received_qty
        `),
        pool.query(`
          SELECT 
            COUNT(*) as total_skus,
            COALESCE(SUM(current_value),0) as total_value,
            COUNT(CASE WHEN current_qty <= reorder_level 
              AND reorder_level > 0 THEN 1 END) as low_stock_count,
            COUNT(CASE WHEN current_qty = 0 THEN 1 END) 
              as out_of_stock_count
          FROM stock_summary
        `),
        pool.query(`
          SELECT 
            COUNT(CASE WHEN status IN ('SENT','PARTIAL_RECEIVED') 
              THEN 1 END) as open_pos,
            COALESCE(SUM(CASE WHEN status IN ('SENT','PARTIAL_RECEIVED') 
              THEN total_value ELSE 0 END),0) as open_po_value
          FROM purchase_orders
        `)
      ])

    res.json({
      success: true,
      data: {
        production: {
          thisMonth: {
            planned: Number(production.rows[0].planned),
            received: Number(production.rows[0].received),
            wipQty: Number(production.rows[0].wip_qty),
            completionRate: production.rows[0].planned > 0
              ? Math.round((production.rows[0].received / 
                production.rows[0].planned) * 100)
              : 0
          }
        },
        inventory: {
          totalSkus: Number(inventory.rows[0].total_skus),
          totalStockValue: Number(inventory.rows[0].total_value),
          lowStockCount: Number(inventory.rows[0].low_stock_count),
          outOfStockCount: Number(inventory.rows[0].out_of_stock_count)
        },
        procurement: {
          openPOs: Number(procurement.rows[0].open_pos),
          openPOValue: Number(procurement.rows[0].open_po_value)
        },
        wip: {
          totalOrders: Number(wip.rows[0].total_orders),
          totalQty: Number(wip.rows[0].total_qty)
        }
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getProductionTrend = async (req, res) => {
  try {
    const pool = require('../config/db')
    const period = req.query.period || '30d'
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30
    
    const result = await pool.query(`
      SELECT 
        DATE(wo_date) as date,
        COALESCE(SUM(planned_qty),0) as planned,
        COALESCE(SUM(received_qty),0) as received,
        COALESCE(SUM(planned_qty - received_qty),0) as wip
      FROM work_order_header
      WHERE wo_date >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(wo_date)
      ORDER BY date
    `)
    
    res.json({
      success: true,
      data: {
        labels: result.rows.map(r => r.date),
        planned: result.rows.map(r => Number(r.planned)),
        received: result.rows.map(r => Number(r.received)),
        wip: result.rows.map(r => Number(r.wip))
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getWipByAge = async (req, res) => {
  try {
    const pool = require('../config/db')
    const result = await pool.query(`
      SELECT
        CASE 
          WHEN NOW() - wo_date <= INTERVAL '7 days' THEN '0-7 days'
          WHEN NOW() - wo_date <= INTERVAL '15 days' THEN '8-15 days'
          WHEN NOW() - wo_date <= INTERVAL '30 days' THEN '16-30 days'
          ELSE '30+ days'
        END as bucket,
        COUNT(*) as count,
        COALESCE(SUM(planned_qty - received_qty),0) as qty
      FROM work_order_header
      WHERE planned_qty > received_qty
      GROUP BY bucket
      ORDER BY MIN(wo_date)
    `)
    
    res.json({
      success: true,
      data: {
        buckets: result.rows.map(r => r.bucket),
        counts: result.rows.map(r => Number(r.count)),
        values: result.rows.map(r => Number(r.qty))
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getProductMix = async (req, res) => {
  try {
    const pool = require('../config/db')
    const period = req.query.period || '30d'
    const days = period === '90d' ? 90 : 30
    
    const result = await pool.query(`
      SELECT 
        b.output_sku as fg_sku,
        p.description as fg_desc,
        COALESCE(SUM(w.planned_qty),0) as planned,
        COALESCE(SUM(w.received_qty),0) as received
      FROM work_order_header w
      JOIN bom_header b ON w.bom_id = b.id
      JOIN product_master p ON b.output_sku = p.sku_code
      WHERE w.wo_date >= NOW() - INTERVAL '${days} days'
      GROUP BY b.output_sku, p.description
      ORDER BY planned DESC
      LIMIT 10
    `)
    
    res.json({
      success: true,
      data: {
        labels: result.rows.map(r => r.fg_desc),
        qty: result.rows.map(r => Number(r.planned)),
        value: result.rows.map(r => Number(r.received))
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getMaterialConsumptionTrend = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        materials: [],
        series: []
      }
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getSupplierPerformance = async (req, res) => {
  try {
    const pool = require('../config/db')
    const result = await pool.query(`
      SELECT 
        s.supplier_name as name,
        COUNT(po.id) as total_pos,
        COALESCE(SUM(po.total_value),0) as total_value,
        0 as on_time_rate,
        0 as outstanding
      FROM suppliers s
      LEFT JOIN purchase_orders po ON po.supplier_id = s.id
      GROUP BY s.id, s.supplier_name
      ORDER BY total_value DESC
      LIMIT 5
    `)
    
    res.json({
      success: true,
      data: result.rows.map(r => ({
        name: r.name,
        totalPOs: Number(r.total_pos),
        totalValue: Number(r.total_value),
        onTimeRate: Number(r.on_time_rate),
        outstanding: Number(r.outstanding)
      }))
    })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
}

exports.getStockMovement = async (req, res) => {
  try {
    const pool = require('../config/db');
    const { sku_code, period = '30d' } = req.query;
    if (!sku_code) throw new Error('sku_code is required');

    const intervalMap = { '30d': '30 days', '90d': '90 days' };
    const interval = intervalMap[period] || '30 days';

    const result = await pool.query(`
      SELECT 
        to_char(transaction_date, 'Mon DD') as label,
        SUM(qty_in) as qty_in,
        SUM(qty_out) as qty_out,
        MAX(sku_description) as description
      FROM stock_ledger
      WHERE sku_code = $1 AND transaction_date >= CURRENT_DATE - $2::interval
      GROUP BY transaction_date
      ORDER BY transaction_date
    `, [sku_code, interval]);

    res.json({
      success: true,
      data: {
        sku: sku_code,
        description: result.rows[0]?.description || '',
        labels: result.rows.map(r => r.label),
        qtyIn: result.rows.map(r => parseFloat(r.qty_in)),
        qtyOut: result.rows.map(r => parseFloat(r.qty_out))
      }
    });
  } catch(err) {
    res.status(500).json({ message: err.message })
  }
};

exports.getCostTrend = async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        product: req.query.fg_sku || 'Unknown',
        labels: [],
        avgCost: []
      }
    });
  } catch(err) {
    res.status(500).json({ message: err.message })
  }
};
