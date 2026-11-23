# Admatrix Property - Architecture & Development Status

## 1. Project Overview & Architecture Separation
**Admatrix Property** has been architected into two cleanly decoupled services:
- **`backend/`**: Dedicated Node.js & Express REST API micro-service running on port `5000`.
  - Fully isolated backend containing Prisma ORM, PostgreSQL 16 database (`admatrix_property`), compliance engine, AI copy generator service, WhatsApp simulator, and REST controllers.
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

## 4. Production Engineering Roadmap & Completed Phases

### Phase 1A: PostgreSQL 16 Migration (Completed & Verified)
- Containerized PostgreSQL 16 on Docker (`admatrix-postgres`, port `5432`).
- Safe SQLite backup generated at `backend/prisma/backup/dev.db.backup`.
- Initialized clean PostgreSQL migrations with `@prisma/client` target:
  - `20261122071221_init_postgresql`
  - `20261122073829_add_user_password_hash`
- Verified schema relationships, foreign keys (`onDelete: Cascade`), and indices across all 9 models.
- Automated verification: 15 / 15 checks passing (`npm test`).

### Phase 1B: Authentication, Redis Sessions, RBAC & Multi-Tenancy (Completed & Verified)
- **Password Security**: Argon2id hashing with unique per-password salt.
- **Tokens & Sessions**:
  - 15-minute JWT Access Tokens signed with `JWT_ACCESS_SECRET`.
  - 7-day single-use rotating Refresh Tokens signed with `JWT_REFRESH_SECRET`.
  - HTTP-only, SameSite=Strict cookies + Bearer token support.
  - Redis 7 session store (`admatrix-redis`, port `6381`) enforcing instant token invalidation and replay attack prevention.
- **RBAC Roles**: `SUPER_ADMIN`, `BROKERAGE_ADMIN`, `BROKER`, `AGENT`.
  - Super Admin registration blocked on public endpoints (HTTP 403).
  - Role-based permissions guarding mutations (e.g., AGENT role blocked from property PUT/DELETE).
- **Organization-Level Multi-Tenancy**:
  - Complete data isolation enforced across every Prisma read, create, update, delete, join, and aggregation.
  - Foreign record queries return HTTP 404 (not found in tenant scope), eliminating cross-tenant leakage.
  - Cross-tenant campaign binding and WhatsApp dispatching strictly blocked.
- **Negative Security Hardening & Concurrency**:
  - Atomic Refresh Token consumption via Redis `GETDEL` (eliminates concurrent race conditions).
  - Cross-tenant relational injection protection in Leads (`campaignId`, `assignedToId`).
  - Strict CORS origin whitelisting (prohibits credentialed wildcard origin reflection).
  - Constant-time password verification on non-existent users (neutralizes email enumeration timing attacks).
  - Redis sliding-window rate limiters on auth endpoints (`/login`, `/register`).
  - Protected administrative endpoints (`/api/seed` restricted to `SUPER_ADMIN`).
- **Automated Verification**:
  - Negative Security Suite: 19 / 19 checks passing (`npm run test:security`).
  - Phase 1B Auth & RBAC Suite: 28 / 28 checks passing (`npm run test:auth`).
  - Full API Integration Audit: 22 / 22 endpoints passing (`npm run test:api`).
  - PostgreSQL Integration Suite: 15 / 15 checks passing (`npm test`).
  - Total Passing Security & Integration Assertions: 84 / 84 checks (100%).

### Phase 2A: Frontend Authentication & Role-Based Navigation (Completed & Verified)
- **Login & Registration Pages**:
  - `/login`: Email + password form with quick test personas (`Admin`, `Broker`, `Agent`, `Super Admin`). Session-expiry alerts.
  - `/register`: Complete brokerage onboarding with role selector (`BROKERAGE_ADMIN`, `BROKER`, `AGENT`), phone, password validation. Public `SUPER_ADMIN` blocked.
- **Client Architecture & Token Security**:
  - `frontend/src/lib/auth-context.tsx`: Centralized React Context managing `user`, `organization`, `role`, `login`, `register`, `logout`, and demo role switching.
  - `frontend/src/lib/api-client.ts`: Wrapper with in-memory `accessToken` storage (**Zero localStorage exposure**), automatic 401 interception, single-flight refresh token rotation via HTTP-only cookies, and session-expired events.
- **Route Protection & Role Navigation**:
  - `AppShell.tsx`: Full-screen authentication skeleton during initial hydration, automatic redirect to `/login?from=...` for unauthenticated visitors, role restriction guard page.
  - `Sidebar.tsx`: Role-aware navigation (e.g. `Campaigns`, `Team`, `Integrations` conditionally displayed based on active role permissions).
  - `Header.tsx`: Shows real user name, organization badge, active role, interactive role switcher for demoing all 4 roles, and sign-out trigger.
- **Verification**:
  - Next.js 14 production build (`npm run build`) passing with all 16 static/dynamic routes.
  - 4-Role End-to-End Auth Integration Audit passing (`SUPER_ADMIN`, `BROKERAGE_ADMIN`, `BROKER`, `AGENT`).

### Phase 2B: AWS S3 Media Storage & Asset Pipeline (Hardened & Verified)
- **AWS S3 Integration & SDK**:
  - Implemented in `backend/src/services/s3.service.ts` using `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`.
  - Environment-aware storage driver supporting production AWS S3 buckets (`PutObjectCommand`, `GetObjectCommand`, `DeleteObjectCommand`, `HeadObjectCommand`) and local storage emulator with identical HTTP PUT streaming semantics.
  - Multi-tenant S3 key partitioning: `organizations/{organizationId}/{category}/{timestamp}-{hex}-{cleanFileName}`.
- **Upload Verification & Binary Magic Byte Validation**:
  - `verifyObjectUpload(key, expectedMimeType)` validates physical storage presence, non-zero file size, and inspects binary magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`, WebP `RIFF...WEBP`, PDF `%PDF`).
  - Corrupted, truncated, or spoofed file uploads are rejected before database creation and purged from storage with retry.
- **Failed Upload Cleanup Tracking**:
  - If upload verification fails and storage purge fails after 3 retries, system explicitly reports `cleanupStatus: "CLEANUP_FAILED"` and `orphanedStorageKey`. It logs a critical alert and never claims the object was purged.
- **Deletion Safety & Atomic Distributed Locking**:
  - `PropertyLockService` implemented in `backend/src/services/property-lock.service.ts`: exclusive distributed locking via Redis `SET NX PX` with unique `lockToken` UUIDs.
  - Eliminates TOCTOU simultaneous deletion races: only one process can acquire the lock; concurrent DELETE requests are rejected with `HTTP 409 Conflict`.
  - Heartbeat lock extension: active deletions continuously refresh their TTL (30s) and DB timestamp with each asset, preventing slow deletions (>30s) from having their lock reclaimed.
  - Ownership-verified safe release: uses Redis Lua scripts to guarantee a worker only releases its own lock token.
  - Concurrent media uploads (`POST /presign-upload`, `POST /confirm`) and property edits (`PUT /properties/:id`) to a property in `DELETING` status are rejected with `HTTP 409 Conflict`.
  - Confirmation cleanup: already-issued presigned URLs confirmed against deleting or deleted properties are automatically purged from storage with retry (`cleanupStatus: "PURGED"`).
- **Partial Property Deletion Consistency**:
  - Sequential per-asset deletion: For each child `MediaAsset`, deletes physical storage object with retry, then immediately deletes that specific database record.
  - If storage deletion fails on any asset (tested on first, middle, or last asset), halts immediately, reverts property status to `ACTIVE`, and returns `HTTP 502 Bad Gateway` reporting deleted counts and preserved counts.
  - Guarantees database records never point to deleted files and undeleted storage files never lose their database records.
- **PostgreSQL Relational Media Model**:
  - Added `MediaAsset` model in `prisma/schema.prisma` (Migration: `20261122085039_add_media_asset`).
  - Stores `key`, `bucket`, `fileName`, `fileSize`, `mimeType`, `category`, `url`, `propertyId`, `creativeId`, `organizationId`, and `uploadedById`.
- **Frontend Image Pipelines**:
  - `frontend/src/lib/media-upload.ts`: Direct presigned PUT upload with `XMLHttpRequest` progress tracking `(0% - 100%)`. Zero AWS secret key exposure.
  - `frontend/src/components/ui/ImageUpload.tsx`: Drag-and-drop dropzone, live upload progress bars, preview cards, and removal triggers.
  - `frontend/src/app/properties/new/page.tsx`: Step 3 integrated with dedicated cover photo uploader and multi-file gallery uploader (up to 12 photos).
  - `frontend/src/app/properties/[id]/page.tsx`: Gallery thumbnail grid and verified S3 storage asset listing.
  - `frontend/src/app/ad-studio/page.tsx`: "Save to Assets" button dynamically exports HTML5 creative canvas to PNG blob and uploads directly as `AD_CREATIVE`.
- **Verification Evidence**:
  - Next.js 14 production build (`npm run build`): 16 / 16 routes compiled successfully.
  - S3 Media Storage & Concurrency Test Suite (`npm run test:media`): 96 / 96 tests passing across 10 test groups.
  - Dedicated Phase 2B Verification Suite (`src/verify-phase2b-storage.ts`): 23 passed, 0 failed, 1 unverified (live cloud credentials).
  - All regression suites passing (`npm run test:all`): `verify-integration` (15/15), `test:api` (22/22), `test:auth` (28/28), `test:security` (19/19), `test:media` (96/96).

---

## 6. Phase 2C.1: BullMQ Infrastructure, Redis Connections & Transactional Outbox (Completed)
- **BullMQ Infrastructure (`backend/src/lib/queue.ts`)**:
  - Redis connection factory with `maxRetriesPerRequest: null` complying with BullMQ blocking operations.
  - Initialized isolated queues: `campaignQueue` (`campaign-processing`), `whatsappQueue` (`whatsapp-processing`), `analyticsQueue` (`analytics-sync`).
  - Job ID Sanitizer (`formatJobId`): Enforces strict delimiter compliance (hyphens and underscores only, zero colons) across all custom job IDs to prevent Redis key corruption and delimiter bugs.
  - Graceful queue and worker shutdown helpers (`closeQueues`).
- **Transactional Outbox Engine (`backend/src/services/outbox.service.ts`)**:
  - `OutboxService.createEvent(tx, params)`: Guarantees atomic insertion within Prisma transactions, eliminating dual-write risks.
  - Atomic Claim Leases (`claimPendingEvents`): Utilizes PostgreSQL transactions and `FOR UPDATE SKIP LOCKED` / atomic batch claims to assign exclusive leases (`claimOwner`, `claimedAt`, `claimExpiresAt` for 60s), ensuring mutual exclusion across concurrent dispatchers.
  - Crash Recovery & Idempotent Re-dispatch (`recoverExpiredLeases`): Safely resets expired leases from dead/crashed dispatchers back to `PENDING`.
  - Deterministic Deduplication: Dispatches to BullMQ using deterministic `jobId: formatJobId('outbox', event.id)` ensuring at-most-once job creation in Redis even during process restarts.
- **Additive Database Migrations (`backend/prisma/schema.prisma`)**:
  - `OutboxEvent`: `id`, `aggregateType`, `aggregateId`, `eventType`, `payload`, `status`, `jobId`, `retryCount`, `lastError`, `claimOwner`, `claimedAt`, `claimExpiresAt`, `organizationId`, timestamps.
  - `WebhookEvent`: `id`, `provider`, `eventId`, `eventType`, `payload`, `status`, `organizationId`, timestamps, `@@unique([provider, eventId])`.
  - `ProviderOperation`: `id`, `provider`, `operationType`, `entityId`, `idempotencyKey` @unique, `status`, `providerReference`, `requestPayload`, `responsePayload`, `lastError`, `attempts`, `organizationId`, timestamps.
  - Additive fields on `Campaign` (`externalCampaignId`, `lastPublishError`, `syncStatus`) and `WhatsAppMessage` (`externalMessageId`, `organizationId`).
  - Applied migration: `20261122110541_add_phase2c_outbox_webhook_provider_operation`.
- **Verification Evidence**:
  - Dedicated Phase 2C.1 Audit Suite (`src/test-phase2c1-outbox.ts`): 46 Passed, 0 Failed across all 7 test categories.
  - Full Backend Regression Suite (`npm run test:all`): 108/108 S3 media storage tests passing, PostgreSQL integration audit (15/15), API audit, Auth RBAC, and Negative security all passing.
  - Next.js 14 Production Build (`npm run build`): All 16 static/dynamic routes compiled successfully.

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
