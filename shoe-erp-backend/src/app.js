require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost',
    'https://bubbly-smile-production-9451.up.railway.app',
    'https://soleerp.in',
    'https://www.soleerp.in'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())
app.use(morgan('dev'))

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() })
})

const migrate = require('./db/migrate')
migrate()

app.use('/api/auth',          require('./routes/authRoutes'))
app.use('/api/raw-materials', require('./routes/rawMaterialRoutes'))
app.use('/api/products',      require('./routes/productRoutes'))
app.use('/api/masters',       require('./routes/masterRoutes'))
app.use('/api/bom',           require('./routes/bomRoutes'))
app.use('/api/work-orders',   require('./routes/workOrderRoutes'))
app.use('/api/inventory',     require('./routes/inventoryRoutes'))
app.use('/api/purchase-orders', require('./routes/purchaseOrderRoutes'))
app.use('/api/suppliers',     require('./routes/supplierRoutes'))
app.use('/api/reports',       require('./routes/reportRoutes'))
app.use('/api/analytics',     require('./routes/analyticsRoutes'))
app.use('/api/export',        require('./routes/exportRoutes'))
app.use('/api/settings',      require('./routes/settingsRoutes'))
app.use('/api/notifications', require('./routes/notificationRoutes'))
app.use('/api/sizes',         require('./routes/sizeRoutes'))
app.use('/api/search',        require('./routes/searchRoutes'))
app.use('/api/locations',     require('./routes/locationRoutes'))
app.use('/api/companies',     require('./routes/companyRoutes'))
app.use('/api/departments',   require('./routes/departmentRoutes'))
app.use('/api/categories',    require('./routes/categoryRoutes'))
app.use('/api/sub-categories', require('./routes/subCategoryRoutes'))
app.use('/api/brands',         require('./routes/brandRoutes'))
app.use('/api/manufacturers',  require('./routes/manufacturerRoutes'))
app.use('/api/customers',      require('./routes/customerRoutes'))
app.use('/api/uom',            require('./routes/uomRoutes'))
app.use('/api/gst',            require('./routes/gstRoutes'))
app.use('/api/hsn',            require('./routes/hsnRoutes'))
app.use('/api/designs',        require('./routes/designRoutes'))
app.use('/api/components',     require('./routes/componentsRoutes'))
app.use('/api/divisions',      require('./routes/divisionRoutes'))
app.use('/api/teams',          require('./routes/teamRoutes'))
app.use('/api/employees',      require('./routes/employeeRoutes'))
app.use('/api/colors',         require('./routes/colorRoutes'))

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message || 'Internal Server Error' })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => console.log(`Server running on port ${PORT}`))

process.on('SIGTERM', () => {
  console.log('Shutting down gracefully...')
  process.exit(0)
})

module.exports = app
