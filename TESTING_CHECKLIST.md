# Shoe ERP Testing Checklist

This document contains a comprehensive testing checklist to verify all modules and functionalities before marking the system production-ready.

## Authentication
- [ ] Login with admin credentials
- [ ] Login with manager credentials  
- [ ] Login with operator credentials
- [ ] Verify operator cannot see Delete buttons
- [ ] Verify operator cannot access admin-only APIs
- [ ] Token expiry after 8 hours redirects to login
- [ ] Logout clears token and redirects to login

## Raw Material Master
- [ ] Create new raw material with all fields
- [ ] Edit existing raw material rate
- [ ] Soft delete raw material
- [ ] Search by SKU and description
- [ ] Verify deleted material not shown in BOM dropdown

## Bill of Material
- [ ] Create BOM for Semi-Finished product
- [ ] Create BOM for Finished Good (via SF)
- [ ] Create BOM with size variants (UK6 vs UK10 different leather qty)
- [ ] Verify total material cost calculated correctly
- [ ] Edit BOM and verify cost updates
- [ ] Verify BOM type filters work in WO form

## Work Orders
- [ ] Create RM→SF work order with size breakup
- [ ] Verify stock deducted automatically on WO issue
- [ ] Create WO when stock is insufficient — verify warning shown
- [ ] Receive partial qty — verify status = PARTIAL
- [ ] Receive remaining qty — verify status = RECEIVED
- [ ] Verify WIP qty = planned - received at all times
- [ ] Verify SF stock increases after RM→SF WO received
- [ ] Verify FG stock increases after SF→FG WO received

## Inventory
- [ ] Add purchase — verify stock_ledger entry created
- [ ] Add purchase — verify stock_summary updated
- [ ] Stock adjustment IN — verify balance increases
- [ ] Stock adjustment OUT — verify balance decreases
- [ ] Stock adjustment OUT more than available — verify blocked
- [ ] Set reorder level — verify low stock badge appears
- [ ] View ledger for SKU — verify running balance correct

## Purchase Orders
- [ ] Create PO with multiple lines
- [ ] Send PO — verify status changes to SENT
- [ ] Receive partial GRN — verify PO status = PARTIAL_RECEIVED
- [ ] Receive remaining — verify PO status = RECEIVED
- [ ] Verify stock updated on GRN
- [ ] Verify supplier ledger updated on GRN
- [ ] Record supplier payment — verify outstanding reduces
- [ ] Cancel PO — verify only works if no GRN exists

## Reports
- [ ] Production report with date filter
- [ ] Material consumption report for specific SKU
- [ ] Cost sheet for product — all sizes
- [ ] WIP aging report — verify correct age buckets
- [ ] Stock valuation as of specific date
- [ ] All Excel exports download correctly
- [ ] All PDF exports download correctly

## Notifications
- [ ] Low stock notification appears when stock <= reorder level
- [ ] Pending WO notification after 7 days
- [ ] PO due notification 2 days before delivery
- [ ] Mark single notification as read
- [ ] Mark all as read
- [ ] Bell badge count updates every 60 seconds

## Settings
- [ ] Update company name — verify reflects in print header
- [ ] Update logo URL — verify shows in print
- [ ] Create new user — verify can login
- [ ] Change user role — verify new permissions apply
- [ ] Reset user password — verify old password rejected
- [ ] Deactivate user — verify login blocked

## Print & Export
- [ ] Print BOM sheet — verify company header shows
- [ ] Print Work Order — verify size breakup table shows
- [ ] Print Purchase Order — verify supplier address shows
- [ ] Print GRN — verify signature lines present
- [ ] WIP Excel export with filters applied
- [ ] Stock valuation PDF export

## Dashboard
- [ ] All 6 KPI cards load correctly
- [ ] Production trend line chart renders
- [ ] Period selector changes chart data
- [ ] WIP donut chart shows correct segments
- [ ] Supplier performance table shows on-time rate
- [ ] Dashboard auto-refreshes every 5 minutes
- [ ] Low stock alerts panel shows correct items
