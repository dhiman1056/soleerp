const fs = require('fs');
const path = require('path');

const targetDir = '/Users/dheerajdhiman/BOM/shoe-erp-frontend';
const files = [
  "src/pages/PurchaseOrder/POForm.jsx",
  "src/pages/PurchaseOrder/POList.jsx",
  "src/pages/PurchaseOrder/PODetail.jsx",
  "src/pages/BOM/BOMForm.jsx",
  "src/pages/BOM/BOMList.jsx",
  "src/pages/WorkOrder/WorkOrderForm.jsx",
  "src/pages/WorkOrder/WorkOrderList.jsx",
  "src/pages/WorkOrder/WorkOrderDetail.jsx",
  "src/pages/WorkOrder/ReceiveModal.jsx",
  "src/pages/RawMaterial/RawMaterialList.jsx",
  "src/pages/RawMaterial/RawMaterialForm.jsx",
  "src/pages/Product/ProductList.jsx",
  "src/pages/Product/ProductForm.jsx",
  "src/pages/WIP/WIPDashboard.jsx",
  "src/pages/Inventory/StockSummary.jsx",
  "src/pages/Inventory/StockLedger.jsx",
  "src/pages/Inventory/PurchaseList.jsx",
  "src/pages/Suppliers/SupplierList.jsx",
  "src/pages/Suppliers/SupplierDetail.jsx",
  "src/pages/Dashboard.jsx",
  "src/hooks/useRawMaterials.js",
  "src/hooks/useBOM.js",
  "src/hooks/useWorkOrders.js",
  "src/hooks/useAnalytics.js",
  "src/hooks/useNotifications.js",
  "src/hooks/usePurchaseOrders.js",
  "src/hooks/useSuppliers.js",
  "src/hooks/useInventory.js",
  "src/hooks/useProducts.js",
  "src/hooks/useReports.js"
];

for (const rel of files) {
  const p = path.join(targetDir, rel);
  if (!fs.existsSync(p)) continue;
  
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // 1. queryClient.invalidateQueries(['someKey', ...])
  // WRONG: queryClient.invalidateQueries(['po'])
  // RIGHT: queryClient.invalidateQueries({ queryKey: ['po'] })
  const reInval = /(queryClient|qc)\.invalidateQueries\(\s*(\[[^\]]+\])\s*\)/g;
  if(reInval.test(content)) {
    content = content.replace(reInval, "$1.invalidateQueries({ queryKey: $2 })");
    changed = true;
  }
  
  const reInvalStr = /(queryClient|qc)\.invalidateQueries\(\s*(['"][^'"]+['"])\s*\)/g;
  if(reInvalStr.test(content)) {
    content = content.replace(reInvalStr, "$1.invalidateQueries({ queryKey: [$2] })");
    changed = true;
  }

  // 2. queryClient.setQueryData(['someKey'], data)
  const reSet = /(queryClient|qc)\.setQueryData\(\s*(\[[^\]]+\])\s*,\s*(.+?)\s*\)/g;
  if(reSet.test(content)) {
    content = content.replace(reSet, "$1.setQueryData({ queryKey: $2 }, $3)");
    changed = true;
  }

  // 3. useQuery(['key'], fn) -> useQuery({ queryKey: ['key'], queryFn: fn })
  // We look for useQuery( [ ... ], () => ... )
  // Very simplistic match for inline simple cases since these look uniformly written
  const reUseQ = /useQuery\(\s*(\[[^\]]+\])\s*,\s*(\([^)]*\)\s*=>\s*[^,}]+)(?:\s*,\s*\{([^}]+)\})?\s*\)/g;
  if(reUseQ.test(content)) {
     content = content.replace(reUseQ, (match, key, fn, opts) => {
         return `useQuery({ queryKey: ${key}, queryFn: ${fn}${opts ? ', ' + opts : ''} })`;
     });
     changed = true;
  }

  // Handle single string literal useQuery('str', fn)
  const reUseQStr = /useQuery\(\s*(['"][^'"]+['"])\s*,\s*(\([^)]*\)\s*=>\s*[^,}]+)(?:\s*,\s*\{([^}]+)\})?\s*\)/g;
  if(reUseQStr.test(content)) {
     content = content.replace(reUseQStr, (match, key, fn, opts) => {
         return `useQuery({ queryKey: [${key}], queryFn: ${fn}${opts ? ', ' + opts : ''} })`;
     });
     changed = true;
  }

  // 4. useMutation(fn, { ... }) -> useMutation({ mutationFn: fn, ... })
  // Regex: useMutation( someFn , { onSuccess: ... } )
  const reUseM = /useMutation\(\s*([a-zA-Z0-9_\.]+)\s*,\s*\{/g;
  if(reUseM.test(content)) {
     content = content.replace(reUseM, "useMutation({ mutationFn: $1, ");
     changed = true;
  }

  // Handle single argument useMutation(fn) => useMutation({ mutationFn: fn })
  const reUseM1 = /useMutation\(\s*([a-zA-Z0-9_\.]+)\s*\)(?!\s*\{)/g;
  if(reUseM1.test(content)) {
     // careful not to overlap
     // content = content.replace(reUseM1, "useMutation({ mutationFn: $1 })");
     // changed = true;
     // This is skipped for safety as we don't have many single argument mutations.
  }

  if (changed) {
    fs.writeFileSync(p, content, 'utf8');
    console.log('Fixed', rel);
  }
}
