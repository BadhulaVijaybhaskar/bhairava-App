# Bhairava Real Estate — Admin App

Next.js (App Router) + Prisma + Supabase PostgreSQL + custom JWT auth.

## Setup

1. Copy `.env.example` → `.env` and fill Supabase URLs/keys + `DATABASE_URL` / `DIRECT_URL`
2. `npm install`
3. `npx prisma migrate deploy`
4. `npm run db:seed`
5. `npm run dev` → http://localhost:3000

## Default admin (from seed)

- Email: `admin@bhairava.com`
- Mobile: `9999999999`
- Password: `Admin@12345`

## Stack notes

- Local/dev DB: **Supabase Postgres** (no Docker required)
- Auth: custom JWT (access + rotating refresh) — Admin only for now
- Other roles are seeded but have no portals yet
