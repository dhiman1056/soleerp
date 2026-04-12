'use strict';

const { query } = require('../config/db');

async function getSettingBoolean(key, defaultVal = true) {
  const { rows } = await query(`SELECT setting_value FROM company_settings WHERE setting_key = $1`, [key]);
  if (rows.length === 0) return defaultVal;
  return rows[0].setting_value === 'true';
}

async function getSettingString(key, defaultVal = '') {
  const { rows } = await query(`SELECT setting_value FROM company_settings WHERE setting_key = $1`, [key]);
  if (rows.length === 0) return defaultVal;
  return rows[0].setting_value;
}

exports.generateLowStockNotifications = async () => {
  const isEnabled = await getSettingBoolean('notify_low_stock', true);
  if (!isEnabled) return 0;
  
  const targetRoles = await getSettingString('low_stock_notify_roles', 'admin,manager');
  const dftlReorderLvlStr = await getSettingString('default_reorder_level', '50');
  const defaultReorderLevel = parseInt(dftlReorderLvlStr) || 50;

  // We join with material_master if you wanted specific RM constraints,
  // but using global default reorder level against stock_summary:
  const { rows: inventory } = await query(`
     SELECT s.sku_code, s.current_qty, m.description, m.uom 
     FROM stock_summary s
     JOIN raw_material_master m ON m.sku_code = s.sku_code
     WHERE s.current_qty <= $1
  `, [defaultReorderLevel]);

  let count = 0;
  for (const item of inventory) {
    const title = `Low Stock: ${item.description}`;
    const msg = `Current stock ${parseFloat(item.current_qty).toFixed(2)} ${item.uom} is at or below reorder level ${defaultReorderLevel}`;
    
    // Check if generated today to prevent spam
    const { rows: existing } = await query(`
      SELECT id FROM notifications 
      WHERE reference_id = $1 AND notification_type = 'LOW_STOCK' AND DATE(created_at) = CURRENT_DATE
    `, [item.sku_code]);

    if(existing.length === 0) {
       await query(`
         INSERT INTO notifications (notification_type, title, message, reference_type, reference_id, severity, target_roles)
         VALUES ('LOW_STOCK', $1, $2, 'STOCK', $3, 'WARNING', $4)
       `, [title, msg, item.sku_code, targetRoles]);
       count++;
    }
  }
  return count;
};


exports.generatePendingWONotifications = async () => {
  const isEnabled = await getSettingBoolean('notify_pending_wo', true);
  if (!isEnabled) return 0;

  // WOs older than 7 days that are not completed
  const { rows: wos } = await query(`
     SELECT wo.id, wo.wo_number, wo.planned_qty, wo.received_qty, wo.wo_date, pm.description as product
     FROM work_order_header wo
     JOIN bom_header bh ON bh.id = wo.bom_id
     JOIN product_master pm ON pm.sku_code = bh.output_sku
     WHERE wo.status IN ('ISSUED','WIP','PARTIAL') 
       AND wo.wo_date <= NOW() - INTERVAL '7 days'
  `);

  let count = 0;
  for (const wo of wos) {
    const diffTime = Math.abs(new Date() - new Date(wo.wo_date));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const wipQty = parseFloat(wo.planned_qty) - parseFloat(wo.received_qty);

    const title = `Pending WO: ${wo.wo_number}`;
    const msg = `Work Order ${wo.wo_number} for ${wo.product} has been pending for ${diffDays} days. WIP Qty: ${wipQty.toFixed(2)}`;

    const { rows: existing } = await query(`
      SELECT id FROM notifications 
      WHERE reference_id = $1 AND notification_type = 'PENDING_WO' AND DATE(created_at) = CURRENT_DATE
    `, [wo.wo_number]);

    if(existing.length === 0) {
       await query(`
         INSERT INTO notifications (notification_type, title, message, reference_type, reference_id, severity, target_roles)
         VALUES ('PENDING_WO', $1, $2, 'WORK_ORDER', $3, 'WARNING', 'admin,manager')
       `, [title, msg, wo.wo_number]);
       count++;
    }
  }
  return count;
};

exports.generatePODueNotifications = async () => {
  const isEnabled = await getSettingBoolean('notify_po_due', true);
  if (!isEnabled) return 0;

  // POs due <= 2 days from now
  const { rows: pos } = await query(`
     SELECT po.po_no, po.expected_delivery_date, po.status, s.supplier_name
     FROM purchase_orders po
     JOIN suppliers s ON s.id = po.supplier_id
     WHERE po.status IN ('SENT','PARTIAL_RECEIVED')
       AND po.expected_delivery_date IS NOT NULL
       AND po.expected_delivery_date <= NOW() + INTERVAL '2 days'
  `);

  let count = 0;
  for (const po of pos) {
    const isOverdue = new Date(po.expected_delivery_date) < new Date();
    const severity = isOverdue ? 'CRITICAL' : 'WARNING';
    
    // Format date string explicitly instead of object
    const strDate = new Date(po.expected_delivery_date).toLocaleDateString();

    const title = `PO Due: ${po.po_no}`;
    const msg = `PO ${po.po_no} from ${po.supplier_name} expected by ${strDate} — Status: ${po.status}`;

    const { rows: existing } = await query(`
      SELECT id FROM notifications 
      WHERE reference_id = $1 AND notification_type = 'PO_DUE' AND DATE(created_at) = CURRENT_DATE
    `, [po.po_no]);

    if(existing.length === 0) {
       await query(`
         INSERT INTO notifications (notification_type, title, message, reference_type, reference_id, severity, target_roles)
         VALUES ('PO_DUE', $1, $2, 'PURCHASE_ORDER', $3, $4, 'admin,manager')
       `, [title, msg, po.po_no, severity]);
       count++;
    }
  }
  return count;
};
