'use strict';

const { query } = require('../config/db');

exports.globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.length < 2) return res.json({ success: true, data: [] });

    const searchStr = `%${q}%`;
    const results = [];

    // Search Work Orders
    const { rows: wos } = await query(`
      SELECT 'work_orders' as type, id as target_id, title, subtitle
      FROM (
        SELECT id, wo_number as title, 'Work Order' as subtitle
        FROM work_order_header
        WHERE wo_number ILIKE $1
        LIMIT 3
      ) as wo
    `, [searchStr]);
    results.push(...wos);

    // Search BOMs
    const { rows: boms } = await query(`
      SELECT 'boms' as type, id as target_id, title, subtitle
      FROM (
        SELECT id, bom_code as title, output_description as subtitle
        FROM bom_header
        WHERE bom_code ILIKE $1 OR output_description ILIKE $1
        LIMIT 3
      ) as bom
    `, [searchStr]);
    results.push(...boms);

    // Search Suppliers
    const { rows: suppliers } = await query(`
      SELECT 'suppliers' as type, id as target_id, title, subtitle
      FROM (
        SELECT id, supplier_name as title, supplier_code as subtitle
        FROM suppliers
        WHERE supplier_name ILIKE $1 OR supplier_code ILIKE $1
        LIMIT 3
      ) as sup
    `, [searchStr]);
    results.push(...suppliers);

    // Search Raw Materials
    const { rows: materials } = await query(`
      SELECT 'inventory' as type, sku_code as target_id, title, subtitle
      FROM (
        SELECT sku_code, description as title, sku_code as subtitle
        FROM raw_material_master
        WHERE sku_code ILIKE $1 OR description ILIKE $1
        LIMIT 3
      ) as mat
    `, [searchStr]);
    
    // Convert 'inventory' type to map to Stock Summary component
    const mappedMaterials = materials.map(m => ({ 
      type: 'inventory/stock', 
      target_id: null, // Material UI handles filter via search params
      queryKey: m.subtitle,
      title: m.title, 
      subtitle: `Material SKU: ${m.subtitle}`
    }));
    
    results.push(...mappedMaterials);

    res.json({ success: true, data: results });
  } catch(err) {
    next(err);
  }
};
