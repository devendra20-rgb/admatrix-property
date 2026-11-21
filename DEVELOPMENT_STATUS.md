# Admatrix Property - Architecture & Development Status

## 1. Project Overview & Architecture Separation
**Admatrix Property** has been architected into two cleanly decoupled services:
- **`backend/`**: Dedicated Node.js & Express REST API micro-service running on port `5000`.
  - Fully isolated backend containing Prisma ORM, SQLite database (`backend/dev.db`), compliance engine, AI copy generator service, WhatsApp simulator, and REST controllers.
  - CORS enabled for frontend clients.
- **`frontend/`**: Dedicated Next.js 14 client application running on port `3000`.
  - Contains client components, page views, Tailwind CSS design system, Lucide icons, and Recharts.
  - Proxies `/api/*` requests through Next.js rewrites to `http://localhost:5000/api/*` or uses environment variable `BACKEND_URL`.

---

## 2. Directory Structure
```text
Admatrix/
├── backend/                  # Dedicated Express & Prisma REST API
│   ├── prisma/
│   │   └── schema.prisma    # Relational Database Schema
│   ├── src/
│   │   ├── server.ts         # Express Server on Port 5000
│   │   ├── seed.ts           # Database Seeder
│   │   ├── lib/
│   │   │   ├── prisma.ts     # Prisma Client
│   │   │   └── sample-data.ts# Dubai Real Estate Benchmark Data
│   │   ├── services/
│   │   │   ├── compliance.service.ts # DLD Trakheesi Engine
│   │   │   └── ai.service.ts # English & Arabic Ad Copy Generator
│   │   └── routes/
│   │       ├── properties.router.ts
│   │       ├── campaigns.router.ts
│   │       ├── leads.router.ts
│   │       ├── compliance.router.ts
│   │       ├── ai.router.ts
│   │       ├── whatsapp.router.ts
│   │       └── seed.router.ts
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                 # Dedicated Next.js Client App
│   ├── src/
│   │   ├── app/              # Next.js App Router (UI Pages)
│   │   │   ├── page.tsx      # Executive Dashboard
│   │   │   ├── properties/   # Portfolio & 6-step Creation Wizard
│   │   │   ├── ad-studio/    # AI Ad Studio & Creative Canvas
│   │   │   ├── campaigns/    # Meta & Google Campaign Manager
│   │   │   ├── leads/        # Lead CRM & WhatsApp Drawer
│   │   │   ├── analytics/    # Analytics & CSV Export
│   │   │   ├── team/         # Brokerage Team Management
│   │   │   ├── integrations/ # API Integrations
│   │   │   └── settings/     # Brokerage ORN & Settings
│   │   └── components/       # AppShell, Sidebar, Header, Badges
│   ├── next.config.mjs       # Rewrites proxying /api/* to Port 5000
│   ├── tailwind.config.ts    # Design Tokens
│   └── package.json
│
├── package.json              # Root Orchestration Scripts
├── DEVELOPMENT_STATUS.md
└── Deployment.md
```

---

## 3. How to Run

### Run Both Simultaneously (Root):
```bash
npm run dev
```

### Or Run Independently:
```bash
# Terminal 1 (Backend on http://localhost:5000):
npm run dev:backend

# Terminal 2 (Frontend on http://localhost:3000):
npm run dev:frontend
```

---

## 4. Completed Modules
1. **Module 1**: Authentication & Multi-Tenant Roles (Simulate Brokerage Admin, Individual Broker, Agent, Super Admin).
2. **Module 2**: Dashboard / Executive Overview (Live KPIs, Spend vs. Lead charts, Trakheesi Guard status).
3. **Module 3**: Property Management System (Search, filters, 6-stage property creation wizard, details view).
4. **Module 4**: Trakheesi Compliance Engine (Permit validation, expiry, Madmoun QR, Form A, off-plan escrow check).
5. **Module 5**: AI Ad Studio (English & Arabic ad copy generator, 1:1, 4:5, 9:16 format switcher, canvas PNG export).
6. **Module 6**: Campaign Management (Meta & Google ad manager, compliance gatekeeper, 1-click status toggles).
7. **Module 7**: Lead Management CRM (Status pipeline, search, property & campaign attribution).
8. **Module 8**: WhatsApp Business Integration (Cloud API workflow, pre-approved templates, slide-over chat drawer).
9. **Module 9**: Analytics & Reporting (CPL trends, platform share, community ROI, CSV report export).
10. **Module 10**: Brokerage & Team Management (Agent roster, BRN management, approval workflows).
11. **Module 11**: Integrations & Settings (Meta, Google, WhatsApp, DLD Trakheesi, RERA ORN).
