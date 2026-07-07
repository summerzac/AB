# AB Marketplace

A B2B manufacturer marketplace (Alibaba-style): manufacturers create accounts,
list products with variants, chat directly with buyers, and ship orders
through an integrated EasyPost shipping backend.

## Structure

- `server/` — Express + TypeScript API (Prisma/Postgres, Socket.IO chat, EasyPost shipping)
- `web/` — Next.js (TypeScript) frontend

## Quick start

```bash
# 1. Postgres
createdb ab_marketplace   # or set DATABASE_URL to point elsewhere

# 2. API server
cd server
cp .env.example .env
npm install
npx prisma migrate deploy
npm run seed
npm run dev        # http://localhost:4000

# 3. Web frontend
cd ../web
cp .env.local.example .env.local
npm install
npm run dev         # http://localhost:3000
```

## Features

- **Auth**: manufacturers and buyers register/login with JWT-based sessions.
- **Catalog**: manufacturers create products with variants (e.g. color/size),
  each with its own SKU, price, stock and dimensions/weight for shipping.
- **Marketplace**: public search/browse/filter by category and keyword.
- **Chat**: buyers message manufacturers directly (per-product or general
  inquiry), delivered in real time over Socket.IO and persisted to Postgres.
- **Orders & shipping**: buyers check out with a shipping address, the API
  requests live rates from EasyPost, the buyer picks a rate, and the order is
  placed with a purchased shipping label and tracking number.

## Shipping provider

Shipping is integrated via [EasyPost](https://www.easypost.com/). By default
`server/.env.example` ships with EasyPost's public **test API key**
(`EZTK...`), which returns realistic mock rates/labels/tracking with no
account needed. Swap in a production key (`EASYPOST_API_KEY`) to go live.
