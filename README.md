# Breco System — Bills Records

A bills management system built with **Laravel 12** (API backend) + **React** (Vite frontend) + **Supabase PostgreSQL**.

---

## Requirements

- PHP 8.2+, Composer
- Node.js 18+, npm

---

## Setup & Run

### 1. Backend (Laravel)

```bash
cd backend
php artisan serve
# Runs at http://localhost:8000
```

### 2. Frontend (React)

```bash
cd frontend
npm run dev
# Runs at http://localhost:5173
```

---

## Database

- **Type:** PostgreSQL (Supabase)
- **Host:** aws-1-ap-southeast-1.pooler.supabase.com
- **Port:** 6543
- **Database:** postgres

Migrations already ran. Default categories and payment channels can be seeded via `php artisan db:seed`.

---

## Features

| Feature | Description |
|---|---|
| New Bill | Input category, total amount, due date, notes |
| Auto Ticket # | Format: `BRC-YYYYMMDD-XXXX` — unique per bill |
| Partial Payments | Multiple payments under one ticket number |
| Auto Date Paid | Set to today automatically on each payment |
| Status Tracking | `unpaid` → `partial` → `paid` auto-updated |
| Ticket Search | Backend-filtered search by ticket number |
| Category Filter | Filter bills by category |
| Status Filter | Filter by unpaid / partial / paid |
| Settings | Manage categories and payment channels |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/bills` | List bills (search, filter, paginate) |
| POST | `/api/v1/bills` | Create new bill |
| GET | `/api/v1/bills/search?ticket=BRC-` | Search by ticket number |
| GET | `/api/v1/bills/{id}` | Get bill with payments |
| PUT | `/api/v1/bills/{id}` | Update bill |
| DELETE | `/api/v1/bills/{id}` | Delete bill |
| POST | `/api/v1/bills/{id}/payments` | Add payment to bill |
| DELETE | `/api/v1/bills/{id}/payments/{pid}` | Remove payment |
| GET | `/api/v1/categories` | List categories |
| GET | `/api/v1/payment-channels` | List payment channels |
