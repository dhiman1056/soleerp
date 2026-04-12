'use strict';

const { query, pool } = require('../config/db');

const getAllPurchaseOrders = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT po.*, s.supplier_name as supplier
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      ORDER BY po.po_date DESC
    `);
    return res.status(200).json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT po.*, s.supplier_name,
        json_agg(json_build_object(
          'id', l.id, 'line_no', l.line_no,
          'sku_code', l.sku_code, 'sku_description', l.sku_description,
          'ordered_qty', l.ordered_qty, 'received_qty', l.received_qty,
          'pending_qty', l.pending_qty, 'rate', l.rate,
          'line_value', l.line_value
        )) as lines
      FROM purchase_orders po
      LEFT JOIN suppliers s ON po.supplier_id = s.id
      LEFT JOIN po_lines l ON l.po_id = po.id
      WHERE po.id = $1
      GROUP BY po.id, s.supplier_name
    `, [req.params.id]);

    if (rows.length === 0) return res.status(404).json({ message: 'PO not found' });
    return res.status(200).json({ success: true, data: rows[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

const createPurchaseOrder = async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { po_date, supplier_id, expected_delivery_date, remarks, lines } = req.body;

    const numRes = await client.query(`SELECT COALESCE(MAX(CAST(SUBSTRING(po_no FROM 4) AS INTEGER)), 0) + 1 AS next_num FROM purchase_orders`);
    const po_no = `PO-${String(numRes.rows[0].next_num).padStart(3, '0')}`;

    let total_value = 0;
    if (lines && lines.length > 0) {
      lines.forEach(l => {
        total_value += parseFloat(l.ordered_qty) * parseFloat(l.rate);
      });
    }

    const { rows: poRow } = await client.query(`
      INSERT INTO purchase_orders (
        po_no, po_date, supplier_id, supplier_name, expected_delivery_date, status, total_value, remarks
      ) VALUES ($1, $2, $3, (SELECT supplier_name FROM suppliers WHERE id = $3), $4, 'DRAFT', $5, $6) RETURNING *
    `, [po_no, po_date, supplier_id, expected_delivery_date, total_value, remarks]);

    const poId = poRow[0].id;

    if (lines && lines.length > 0) {
      for (let i = 0; i < lines.length; i++) {
        const l = lines[i];
        const line_value = parseFloat(l.ordered_qty) * parseFloat(l.rate);
        
        await client.query(`
          INSERT INTO po_lines (
             po_id, line_no, sku_code, sku_description, uom, 
             ordered_qty, pending_qty, rate, line_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [poId, i + 1, l.sku_code, l.sku_description, l.uom, l.ordered_qty, l.ordered_qty, l.rate, line_value]);
      }
    }

    await client.query('COMMIT');
    return res.status(201).json({ success: true, data: poRow[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ message: err.message });
  } finally {
    client.release();
  }
};

const updatePurchaseOrder = async (req, res) => res.status(501).json({ message: 'Not Implemented' });
const sendPurchaseOrder = async (req, res) => res.status(501).json({ message: 'Not Implemented' });
const cancelPurchaseOrder = async (req, res) => res.status(501).json({ message: 'Not Implemented' });
const getPOReceipts = async (req, res) => res.status(501).json({ message: 'Not Implemented' });
const receivePurchaseOrder = async (req, res) => res.status(501).json({ message: 'Not Implemented' });
const getGRNDetail = async (req, res) => res.status(501).json({ message: 'Not Implemented' });

module.exports = {
  getAllPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  sendPurchaseOrder,
  cancelPurchaseOrder,
  getPOReceipts,
  receivePurchaseOrder,
  getGRNDetail
};
