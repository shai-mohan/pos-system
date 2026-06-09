# Café POS System

A full-stack restaurant Point of Sale MVP built with **React**, **Node.js/Express**, and **MySQL**.

## Features

- **Menu Management** — Categories, items, availability (in/out of stock)
- **Order Management** — Walk-in, table, takeaway; add/edit/remove items; special instructions
- **Table Management** — Status tracking, assign orders, merge bills, transfer tables
- **Kitchen Display** — Order queue with status flow (New → Preparing → Ready → Served)
- **Payments** — Cash, card, QR, e-wallet; split bill; partial payments; receipts
- **Dashboard** — Today's sales, order count, avg order value, popular items
- **AI Recommendations** — Rule-based upsell suggestions based on cart items

## Quick Start

### Prerequisites

- Node.js 18+
- MySQL 8+ (or Docker)

### 1. Start MySQL

**Option A — Docker (recommended):**

```bash
docker compose up -d
```

Then update `backend/.env`:

```
DB_PASSWORD=root
```

**Option B — Local MySQL:**

Ensure MySQL is running and update `backend/.env` with your credentials.

### 2. Install & Initialize

```bash
npm run install:all
npm run init-db
```

### 3. Run the App

**Terminal 1 — Backend (port 3001):**

```bash
npm run backend
```

**Terminal 2 — Frontend (port 5173):**

```bash
npm run frontend
```

Open **http://localhost:5173**

### Login Roles

| Role | Access |
|------|--------|
| **Cashier / Waiter** | New orders, tables, kitchen, payments |
| **Manager / Owner** | All above + menu management + dashboard |

## Project Structure

```
pos-system/
├── backend/          # Express API + MySQL
│   ├── routes/       # menu, orders, tables, payments, dashboard
│   ├── db/           # schema.sql, seed.sql
│   └── scripts/      # init-db.js
├── frontend/         # React + Vite
│   └── src/
│       ├── pages/    # POS, Tables, Kitchen, Menu, Dashboard
│       └── components/
└── docker-compose.yml
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/menu/items` | List menu items |
| POST | `/api/orders` | Create order |
| POST | `/api/orders/:id/items` | Add item to order |
| PATCH | `/api/orders/:id/status` | Update order status |
| POST | `/api/orders/merge` | Merge multiple orders |
| POST | `/api/payments` | Process payment |
| POST | `/api/payments/split` | Split bill |
| GET | `/api/dashboard/summary` | Today's metrics |

## Edge Cases Handled

- Out-of-stock items blocked for new orders (existing orders unaffected)
- Order edits after kitchen submission revert status to "Preparing"
- Table transfer moves order to new table
- Merge bills combines multiple orders on same table
- Partial payments with balance tracking
- Order cancellation (soft delete, not removed from DB)
