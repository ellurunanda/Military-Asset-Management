# Military Asset Management System

A full-stack web application for managing military assets across multiple bases with role-based access control (RBAC).

## Tech Stack

- **Frontend**: React (Create React App), React Router, Axios
- **Backend**: Node.js, Express.js
- **Database**: MySQL (via MySQL Workbench)
- **Auth**: JWT (JSON Web Tokens) + bcryptjs

## Project Structure

```
military asset management/
├── backend/
│   ├── index.js              # Express server entry point
│   ├── .env                  # Environment variables (DB config, JWT secret)
│   ├── package.json
│   ├── database/
│   │   └── schema.js         # MySQL schema + seed data
│   ├── middleware/
│   │   └── auth.js           # JWT auth + RBAC middleware
│   └── routes/
│       ├── auth.js           # Login, register, user management
│       ├── purchases.js      # Asset purchase endpoints
│       ├── transfers.js      # Asset transfer endpoints
│       ├── assignments.js    # Assignment & expenditure endpoints
│       └── dashboard.js      # Summary & analytics endpoints
└── military-asset-management/
    ├── .env                  # REACT_APP_API_URL
    ├── package.json
    └── src/
        ├── App.js            # Main app with routing
        ├── index.js          # React entry point
        ├── index.css         # Global dark theme styles
        ├── context/
        │   └── AuthContext.js  # Auth state management
        ├── services/
        │   └── api.js          # Axios API service layer
        └── components/
            ├── Login.js        # Login page
            ├── Navbar.js       # Navigation bar
            ├── Dashboard.js    # Asset summary dashboard
            ├── Purchases.js    # Purchase management
            ├── Transfers.js    # Transfer management
            └── Assignments.js  # Assignments & expenditures
```

## Setup Instructions

### Prerequisites
- Node.js (v16+)
- MySQL Server (MySQL Workbench)

### 1. Database Setup

Open MySQL Workbench and create the database:

```sql
CREATE DATABASE military_assets;
```

### 2. Backend Setup

```bash
cd backend
```

Edit `.env` with your MySQL credentials:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password_here
DB_NAME=military_assets
JWT_SECRET=military_asset_mgmt_secret_key_2024
PORT=5000
```

Install dependencies and start:
```bash
npm install
npm start
```

The server will automatically create all tables and seed initial data on first run.

### 3. Frontend Setup

```bash
cd military-asset-management
npm install
npm start
```

The React app will open at `http://localhost:3000`

---

## Login Credentials

| Role | Username | Password | Access Level |
|------|----------|----------|--------------|
| Admin | `admin` | `admin123` | Full access to all bases and all features |
| Base Commander (Alpha Base) | `commander_alpha` | `commander123` | Own base only — view/transfer/assign |
| Base Commander (Bravo Base) | `commander_bravo` | `commander123` | Own base only — view/transfer/assign |
| Logistics Officer | `logistics_officer` | `logistics123` | All bases — view/purchase/transfer/assign |

---

## Role-Based Access Control (RBAC)

| Feature | Admin | Base Commander | Logistics Officer |
|---------|-------|----------------|-------------------|
| Dashboard (all bases) | ✅ | ❌ (own base only) | ✅ |
| View Purchases | ✅ | ✅ (own base) | ✅ |
| Create Purchases | ✅ | ❌ | ✅ |
| View Transfers | ✅ | ✅ (own base) | ✅ |
| Create Transfers | ✅ | ✅ (from own base) | ✅ |
| View Assignments | ✅ | ✅ (own base) | ✅ |
| Create Assignments | ✅ | ✅ (own base) | ✅ |
| Record Expenditures | ✅ | ✅ (own base) | ✅ |
| Delete Records | ✅ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ |

---

## API Endpoints

### Auth
- `POST /api/auth/login` — Login
- `GET /api/auth/me` — Get current user
- `GET /api/auth/users` — List users (admin)
- `POST /api/auth/register` — Create user (admin)

### Dashboard
- `GET /api/dashboard/summary` — Asset balance summary
- `GET /api/dashboard/bases` — List all bases
- `GET /api/dashboard/asset-types` — List all asset types
- `GET /api/dashboard/net-movements` — Net movement details

### Purchases
- `GET /api/purchases` — List purchases
- `GET /api/purchases/:id` — Get purchase
- `POST /api/purchases` — Create purchase
- `DELETE /api/purchases/:id` — Delete purchase (admin)

### Transfers
- `GET /api/transfers` — List transfers
- `GET /api/transfers/:id` — Get transfer
- `POST /api/transfers` — Create transfer
- `DELETE /api/transfers/:id` — Delete transfer (admin)

### Assignments
- `GET /api/assignments` — List assignments
- `POST /api/assignments` — Create assignment
- `PATCH /api/assignments/:id/return` — Mark as returned
- `GET /api/assignments/expenditures` — List expenditures
- `POST /api/assignments/expenditures` — Record expenditure

---

## Data Models

### Bases
- id, name, location, created_at

### Asset Types
- id, name, category (vehicle/weapon/ammunition/equipment), unit, created_at

### Users
- id, username, password (hashed), role, base_id, created_at

### Purchases
- id, asset_type_id, base_id, quantity, purchase_date, notes, created_by, created_at

### Transfers
- id, asset_type_id, from_base_id, to_base_id, quantity, transfer_date, status, notes, created_by, created_at

### Assignments
- id, asset_type_id, base_id, assigned_to, quantity, assignment_date, return_date, status, notes, created_by, created_at

### Expenditures
- id, asset_type_id, base_id, quantity, expenditure_date, reason, notes, created_by, created_at

---

## To Restart Later

```bash
# Terminal 1 — Backend
cd backend
node index.js

# Terminal 2 — Frontend
cd military-asset-management
npm start# Military-Asset-Management
