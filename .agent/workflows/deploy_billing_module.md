---
description: Deploy the Bradesco Billing Module (Backend + Frontend)
---

# Deploy Bradesco Billing Module

This workflow guides you through setting up and running the new Billing Module.

## 1. Database Migration

Run the following SQL in your Supabase SQL Editor to create the necessary tables:

1. Open `supabase/migrations/20240217000000_create_cobranca.sql`
2. Copy the content.
3. Paste into Supabase SQL Editor and Run.

## 2. Backend Setup

Open a terminal in the `backend` folder:

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your DATABASE_URL
npm run build
npm start
```

The backend will start on port 3001.

## 3. Frontend Setup

Open a new terminal in the project root:

```bash
npm run build
npm run dev
```

The frontend will be available at `http://localhost:5173`.

## 4. Verification

1. Go to `http://localhost:5173/cobrancas`.
2. Verify that the "Gestão de Cobranças" page loads.
3. Check the "Configurações" tab (it should show masked credentials).
