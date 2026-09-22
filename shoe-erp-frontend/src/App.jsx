import React, { Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import ProtectedRoute   from './components/ProtectedRoute.jsx'
import Layout           from './components/layout/Layout.jsx'
import PageLoader       from './components/common/PageLoader.jsx'

// Lazy-loaded routes & pages
const LoginPage        = React.lazy(() => import('./pages/Auth/LoginPage.jsx'))
const Dashboard        = React.lazy(() => import('./pages/Dashboard.jsx'))
const ProductList      = React.lazy(() => import('./pages/Product/ProductList.jsx'))
const ProductForm      = React.lazy(() => import('./pages/Product/ProductForm.jsx'))
const BOMList          = React.lazy(() => import('./pages/BOM/BOMList.jsx'))
const BOMForm          = React.lazy(() => import('./pages/BOM/BOMForm.jsx'))
const WorkOrderList    = React.lazy(() => import('./pages/WorkOrder/WorkOrderList.jsx'))
const WorkOrderDetail  = React.lazy(() => import('./pages/WorkOrder/WorkOrderDetail.jsx'))
const WIPDashboard     = React.lazy(() => import('./pages/WIP/WIPDashboard.jsx'))
const StockSummary     = React.lazy(() => import('./pages/Inventory/StockSummary.jsx'))
const StockLedger      = React.lazy(() => import('./pages/Inventory/StockLedger.jsx'))
const PurchaseList     = React.lazy(() => import('./pages/Inventory/PurchaseList.jsx'))
const PurchaseForm     = React.lazy(() => import('./pages/Inventory/PurchaseForm.jsx'))
const ReportsLayout       = React.lazy(() => import('./pages/Reports/ReportsLayout.jsx'))
const ProductionSummary   = React.lazy(() => import('./pages/Reports/ProductionSummary.jsx'))
const MaterialConsumption = React.lazy(() => import('./pages/Reports/MaterialConsumption.jsx'))
const CostSheet           = React.lazy(() => import('./pages/Reports/CostSheet.jsx'))
const WipAging            = React.lazy(() => import('./pages/Reports/WipAging.jsx'))
const StockValuation      = React.lazy(() => import('./pages/Reports/StockValuation.jsx'))
const PurchaseReport      = React.lazy(() => import('./pages/Reports/PurchaseReport.jsx'))

const SupplierList     = React.lazy(() => import('./pages/Suppliers/SupplierList.jsx'))
const SupplierDetail   = React.lazy(() => import('./pages/Suppliers/SupplierDetail.jsx'))
const POList           = React.lazy(() => import('./pages/PurchaseOrder/POList.jsx'))
const POForm           = React.lazy(() => import('./pages/PurchaseOrder/POForm.jsx'))
const PODetail         = React.lazy(() => import('./pages/PurchaseOrder/PODetail.jsx'))
const Settings         = React.lazy(() => import('./pages/Settings/Settings.jsx'))
const SettingsLayout   = React.lazy(() => import('./pages/Settings/SettingsLayout.jsx'))
const CompanySettings     = React.lazy(() => import('./pages/Settings/CompanySettings.jsx'))
const FinancialSettings   = React.lazy(() => import('./pages/Settings/FinancialSettings.jsx'))
const InventorySettings   = React.lazy(() => import('./pages/Settings/InventorySettings.jsx'))
const NotificationSettings= React.lazy(() => import('./pages/Settings/NotificationSettings.jsx'))
const UserManagement      = React.lazy(() => import('./pages/Users/UserManagement.jsx'))
const LocationMaster      = React.lazy(() => import('./pages/Masters/LocationMaster.jsx'))
const CompanyMaster       = React.lazy(() => import('./pages/Masters/CompanyMaster.jsx'))
const DepartmentMaster    = React.lazy(() => import('./pages/Masters/DepartmentMaster.jsx'))
const CategoryMaster      = React.lazy(() => import('./pages/Masters/CategoryMaster.jsx'))
const SubCategoryMaster   = React.lazy(() => import('./pages/Masters/SubCategoryMaster.jsx'))
const BrandMaster         = React.lazy(() => import('./pages/Masters/BrandMaster.jsx'))
const ManufacturerMaster  = React.lazy(() => import('./pages/Masters/ManufacturerMaster.jsx'))
const CustomerMaster      = React.lazy(() => import('./pages/Masters/CustomerMaster.jsx'))
const UOMMaster           = React.lazy(() => import('./pages/Masters/UOMMaster.jsx'))
const GSTMaster           = React.lazy(() => import('./pages/Masters/GSTMaster.jsx'))
const HSNMaster           = React.lazy(() => import('./pages/Masters/HSNMaster.jsx'))
const DesignMaster        = React.lazy(() => import('./pages/Masters/DesignMaster.jsx'))
const ComponentsMaster    = React.lazy(() => import('./pages/Masters/ComponentsMaster.jsx'))
const DivisionMaster      = React.lazy(() => import('./pages/Masters/DivisionMaster.jsx'))
const TeamMaster          = React.lazy(() => import('./pages/Masters/TeamMaster.jsx'))
const EmployeeMaster      = React.lazy(() => import('./pages/Masters/EmployeeMaster.jsx'))
const ColorMaster         = React.lazy(() => import('./pages/Masters/ColorMaster.jsx'))

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<PageLoader />}>
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
                <Route path="employee-master"       element={<EmployeeMaster />} />
                <Route path="color-master"          element={<ColorMaster />} />
              </Route>

              <Route path="/users" element={<UserManagement />} />
              <Route path="/masters/companies"   element={<CompanyMaster />} />
              <Route path="/masters/departments" element={<DepartmentMaster />} />
              <Route path="/masters/categories"    element={<CategoryMaster />} />
              <Route path="/masters/sub-categories" element={<SubCategoryMaster />} />
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
              <Route path="/masters/employees"       element={<EmployeeMaster />} />
              <Route path="/masters/colors"          element={<ColorMaster />} />
              <Route path="/masters/locations"       element={<LocationMaster />} />

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
      </Suspense>
    </AuthProvider>
  )
}
