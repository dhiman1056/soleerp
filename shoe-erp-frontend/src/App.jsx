import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute   from './components/ProtectedRoute.jsx'
import LoginPage        from './pages/Auth/LoginPage.jsx'
import Layout           from './components/layout/Layout.jsx'
import Dashboard        from './pages/Dashboard.jsx'
import ProductList      from './pages/Product/ProductList.jsx'
import ProductForm      from './pages/Product/ProductForm.jsx'
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
import PurchaseReport      from './pages/Reports/PurchaseReport.jsx'

import SupplierList from './pages/Suppliers/SupplierList.jsx'
import SupplierDetail from './pages/Suppliers/SupplierDetail.jsx'
import POList from './pages/PurchaseOrder/POList.jsx'
import POForm from './pages/PurchaseOrder/POForm.jsx'
import PODetail from './pages/PurchaseOrder/PODetail.jsx'
import Settings            from './pages/Settings/Settings.jsx'
import SettingsLayout      from './pages/Settings/SettingsLayout.jsx'
import CompanySettings     from './pages/Settings/CompanySettings.jsx'
import FinancialSettings   from './pages/Settings/FinancialSettings.jsx'
import InventorySettings   from './pages/Settings/InventorySettings.jsx'
import NotificationSettings from './pages/Settings/NotificationSettings.jsx'
import UserManagement      from './pages/Users/UserManagement.jsx'
import LocationMaster      from './pages/Settings/LocationMaster.jsx'
import CompanyMaster       from './pages/Masters/CompanyMaster.jsx'
import DepartmentMaster    from './pages/Masters/DepartmentMaster.jsx'
import CategoryMaster      from './pages/Masters/CategoryMaster.jsx'
import SubCategoryMaster   from './pages/Masters/SubCategoryMaster.jsx'
import SizeMaster          from './pages/Masters/SizeMaster.jsx'
import BrandMaster         from './pages/Masters/BrandMaster.jsx'
import ManufacturerMaster  from './pages/Masters/ManufacturerMaster.jsx'
import CustomerMaster      from './pages/Masters/CustomerMaster.jsx'
import UOMMaster           from './pages/Masters/UOMMaster.jsx'
import GSTMaster           from './pages/Masters/GSTMaster.jsx'
import HSNMaster           from './pages/Masters/HSNMaster.jsx'
import DesignMaster        from './pages/Masters/DesignMaster.jsx'
import ComponentsMaster    from './pages/Masters/ComponentsMaster.jsx'
import DivisionMaster      from './pages/Masters/DivisionMaster.jsx'
import TeamMaster          from './pages/Masters/TeamMaster.jsx'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="/products" element={<ProductList />} />
            <Route path="/products/new" element={<ProductForm />} />
            <Route path="/products/:sku/edit" element={<ProductForm />} />
            <Route path="/bom" element={<BOMList />} />
            <Route path="/bom/new" element={<BOMForm />} />
            <Route path="/bom/:id/edit" element={<BOMForm />} />
            <Route path="/work-orders" element={<WorkOrderList />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="/wip" element={<WIPDashboard />} />
            <Route path="/inventory/stock" element={<StockSummary />} />
            <Route path="/inventory/ledger" element={<StockLedger />} />
            <Route path="/inventory/purchases" element={<PurchaseList />} />
            <Route path="/inventory/purchases/new" element={<PurchaseForm />} />
            
            {/* Procurement */}
            <Route path="/suppliers" element={<SupplierList />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/purchase-orders" element={<POList />} />
            <Route path="/purchase-orders/new" element={<POForm />} />
            <Route path="/purchase-orders/:id" element={<PODetail />} />

            {/* Analytics */}
            <Route path="/analytics" element={<Dashboard />} />

            {/* Settings & Admin */}
            {/* Legacy flat route kept for backwards compat */}
            <Route path="/settings" element={<Settings />} />

            {/* Tabbed settings layout with sub-routes */}
            <Route path="/settings-v2" element={<SettingsLayout />}>
              <Route index element={<CompanySettings />} />
              <Route path="company"      element={<CompanySettings />} />
              <Route path="financial"    element={<FinancialSettings />} />
              <Route path="inventory"    element={<InventorySettings />} />
              <Route path="notification" element={<NotificationSettings />} />
              <Route path="users"          element={<UserManagement />} />
              <Route path="locations"      element={<LocationMaster />} />
              <Route path="company-master"     element={<CompanyMaster />} />
              <Route path="department-master"  element={<DepartmentMaster />} />
              <Route path="category-master"    element={<CategoryMaster />} />
              <Route path="sub-category-master" element={<SubCategoryMaster />} />
              <Route path="size-master"          element={<SizeMaster />} />
              <Route path="brand-master"         element={<BrandMaster />} />
              <Route path="manufacturer-master"  element={<ManufacturerMaster />} />
              <Route path="customer-master"       element={<CustomerMaster />} />
              <Route path="uom-master"            element={<UOMMaster />} />
              <Route path="gst-master"            element={<GSTMaster />} />
              <Route path="hsn-master"            element={<HSNMaster />} />
              <Route path="design-master"         element={<DesignMaster />} />
              <Route path="components-master"     element={<ComponentsMaster />} />
              <Route path="division-master"       element={<DivisionMaster />} />
              <Route path="team-master"           element={<TeamMaster />} />
            </Route>

            <Route path="/users" element={<UserManagement />} />
            <Route path="/masters/companies"   element={<CompanyMaster />} />
            <Route path="/masters/departments" element={<DepartmentMaster />} />
            <Route path="/masters/categories"    element={<CategoryMaster />} />
            <Route path="/masters/sub-categories" element={<SubCategoryMaster />} />
            <Route path="/masters/sizes"           element={<SizeMaster />} />
            <Route path="/masters/brands"          element={<BrandMaster />} />
            <Route path="/masters/manufacturers"   element={<ManufacturerMaster />} />
            <Route path="/masters/customers"       element={<CustomerMaster />} />
            <Route path="/masters/uom"             element={<UOMMaster />} />
            <Route path="/masters/gst"             element={<GSTMaster />} />
            <Route path="/masters/hsn"             element={<HSNMaster />} />
            <Route path="/masters/designs"         element={<DesignMaster />} />
            <Route path="/masters/components"      element={<ComponentsMaster />} />
            <Route path="/masters/divisions"       element={<DivisionMaster />} />
            <Route path="/masters/teams"           element={<TeamMaster />} />

            {/* Reports */}
            <Route path="/reports" element={<ReportsLayout />}>
              <Route index element={<Navigate to="production" replace />} />
              <Route path="production" element={<ProductionSummary />} />
              <Route path="consumption" element={<MaterialConsumption />} />
              <Route path="cost-sheet" element={<CostSheet />} />
              <Route path="wip-aging" element={<WipAging />} />
              <Route path="stock-valuation" element={<StockValuation />} />
              <Route path="purchase" element={<PurchaseReport />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>

      </Routes>
    </AuthProvider>
  )
}
