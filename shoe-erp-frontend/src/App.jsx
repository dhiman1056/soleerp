import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute   from './components/ProtectedRoute.jsx'
import LoginPage        from './pages/Auth/LoginPage.jsx'
import Layout           from './components/layout/Layout.jsx'
import Dashboard        from './pages/Dashboard.jsx'
import RawMaterialList  from './pages/RawMaterial/RawMaterialList.jsx'
import ProductList      from './pages/Product/ProductList.jsx'
import BOMList          from './pages/BOM/BOMList.jsx'
import BOMForm          from './pages/BOM/BOMForm.jsx'
import WorkOrderList    from './pages/WorkOrder/WorkOrderList.jsx'
import WorkOrderDetail  from './pages/WorkOrder/WorkOrderDetail.jsx'
import WIPDashboard     from './pages/WIP/WIPDashboard.jsx'
import StockSummary     from './pages/Inventory/StockSummary.jsx'
import StockLedger      from './pages/Inventory/StockLedger.jsx'
import PurchaseList     from './pages/Inventory/PurchaseList.jsx'
import PurchaseForm    from './pages/Inventory/PurchaseForm.jsx'
import ReportsLayout       from './pages/Reports/ReportsLayout.jsx'
import ProductionSummary   from './pages/Reports/ProductionSummary.jsx'
import MaterialConsumption from './pages/Reports/MaterialConsumption.jsx'
import CostSheet           from './pages/Reports/CostSheet.jsx'
import WipAging            from './pages/Reports/WipAging.jsx'
import StockValuation      from './pages/Reports/StockValuation.jsx'

import SupplierList from './pages/Suppliers/SupplierList.jsx'
import SupplierDetail from './pages/Suppliers/SupplierDetail.jsx'
import POList from './pages/PurchaseOrder/POList.jsx'
import POForm from './pages/PurchaseOrder/POForm.jsx'
import PODetail from './pages/PurchaseOrder/PODetail.jsx'
import Settings from './pages/Settings/Settings.jsx'
import UserManagement from './pages/Users/UserManagement.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/raw-materials" element={<RawMaterialList />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/bom" element={<BOMList />} />
            <Route path="/bom/new" element={<BOMForm />} />
            <Route path="/bom/:id/edit" element={<BOMForm />} />
            <Route path="/work-orders" element={<WorkOrderList />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="/wip" element={<WIPDashboard />} />
            <Route path="/inventory/stock" element={<StockSummary />} />
            <Route path="inventory/ledger" element={<StockLedger />} />
            <Route path="inventory/purchases" element={<PurchaseList />} />
            <Route path="inventory/purchases/new" element={<PurchaseForm />} />
            
            {/* Procurement */}
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/purchase-orders" element={<POList />} />
            <Route path="/purchase-orders/new" element={<POForm />} />
            <Route path="/purchase-orders/:id" element={<PODetail />} />

            {/* Settings & Admin */}
            <Route path="/settings" element={<Settings />} />
            <Route path="/users" element={<UserManagement />} />

            {/* Reports */}
            <Route path="reports" element={<ReportsLayout />}>
              <Route index element={<Navigate to="production" replace />} />
              <Route path="production" element={<ProductionSummary />} />
              <Route path="consumption" element={<MaterialConsumption />} />
              <Route path="cost-sheet" element={<CostSheet />} />
              <Route path="wip-aging" element={<WipAging />} />
              <Route path="stock-valuation" element={<StockValuation />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>

      </Routes>
    </AuthProvider>
  )
}
