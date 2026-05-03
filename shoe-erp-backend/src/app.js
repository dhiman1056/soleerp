require('dotenv').config()
const express = require('express')
const cors = require('cors')
const morgan = require('morgan')

const app = express()

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost',
    'https://bubbly-smile-production-9451.up.railway.app'
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
