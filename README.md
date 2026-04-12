# ShoeERP — Shoe Manufacturing ERP System

A robust ERP system built specifically for the shoe manufacturing industry. It tracks raw materials, purchase orders, BOMs (Bill of Materials), sub-assemblies (upper, sole), final product assemblies, work orders, WIP aging, and multi-size product handling out of the box.

## Tech Stack
- **Backend:** Node.js, Express.js, PostgreSQL (pg driver)
- **Frontend:** React.js (Vite), TailwindCSS, Recharts
- **Auth:** JWT with role-based access control (Admin, Manager, Operator)
- **Deployment:** Docker, Nginx

## Quick Start (Docker)

The absolute easiest way to get ShoeERP running for production or testing is Docker. All services (PostgreSQL, Backend node API, Frontend Nginx) are configured out of the box in `docker-compose.yml`.

Ensure Docker is installed and running, then execute:
```bash
docker-compose up --build -d
```
The application will be available at `http://localhost:80`. The backend API runs alongside it and is automatically routed through Nginx proxy (`/api`).

## Default Login Credentials
Once the database seeds load automatically on the first start, you can login with:

| Role          | Email                    | Password     | Note                                |
|---------------|--------------------------|--------------|-------------------------------------|
| Admin         | admin@shoeerp.com        | Admin@123    | Full access to settings, edits      |
| Manager       | manager@shoeerp.com      | Manager@123  | Create/manage resources             |
| Operator      | operator@shoeerp.com     | Operator@123 | View-only and basic operations      |

## Manual Setup

Step by step without Docker:

### 1. PostgreSQL setup
- Install PostgreSQL.
- Create a DB `shoe_erp_db`.
- Run migrations: Execute SQL files placed inside `shoe-erp-backend/db` in the order defined by `init-order.sql` to initialize schema and seed users!

### 2. Backend setup
```bash
cd shoe-erp-backend
npm ci
cp ../.env.production .env # Modify if necessary
npm start # or npm run dev
```

### 3. Frontend setup
```bash
cd shoe-erp-frontend
npm ci
npm run build 
# and optionally `npm run preview` to test, or serve using Nginx etc.
```

## Module Overview

- **Inventory**: Tracks raw materials, stock ledger, stock adjustments.
- **BOM**: Handles Bills of Material with multi-layer assemblies and sizes.
- **Work Orders**: Planners use WOs with states, tracked in WIP.
- **Reports**: Generate production trends, inventory age, WIP aging.
- **Settings**: Adjust application level permissions, multi sizes setups, and print templates.
- **Analytics Dashboard**: Get a robust, bird's-eye view using Recharts-based multi-cards dashboard KPI.

## API Documentation

The backend REST API endpoints use JWT. Ensure `Authorization: Bearer <token>` is present.

### Key Routes
- `POST /api/auth/login` (Public) - Authenticate.
- `GET /api/analytics/overview` (Auth) - Complete Dashboard Data.
- `GET /api/boms` (Auth) - List all BOMs.
- `GET /api/inventory/stock` (Auth) - Fetch stock summary.
- `POST /api/work-orders` (Manager/Admin) - Create WO.
- `GET /api/search?q=...` (Auth) - Omnisearch across entities.

> See `src/routes/*.js` for full details on each module.

## Environment Variables

| Variable | Description |
|-----------|-----------|
| `DB_HOST` | Database Host |
| `DB_PORT` | DB Port (Usually 5432) |
| `DB_NAME` | Database Name |
| `DB_USER` | DB User |
| `DB_PASSWORD` | DB Password |
| `PORT` | Node API port |
| `NODE_ENV` | `production` or `development` |
| `JWT_SECRET`| Token signing string |

## Folder Structure

```
├── docker-compose.yml 
├── README.md
├── TESTING_CHECKLIST.md
├── shoe-erp-backend/
│   ├── Dockerfile
│   ├── db/                 # DB schemas and migrations
│   ├── src/                # Controllers, Routes, Services, Node App
├── shoe-erp-frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── src/                # Vite React App Setup
│   │   ├── components/     # UI
│   │   ├── pages/          # Layout pages
│   │   ├── hooks/          # API React Query integrations
│   │   ├── print/          # Invoices/Printouts layouts
```

## Deployment

Deploying ShoeERP using standard orchestrations or direct VPS nodes:
1. Copy the source code onto your Ubuntu VPS.
2. Ensure `docker` & `docker-compose` are fully functional.
3. Replace the mock environment variables in `.env.production` internally or mount via Docker env overrides.
4. Execute `docker-compose up --build -d`.
5. Expose ports and bind DNS directly to host 80 IP address.
