# 🏥 ASHA-EHR Backend

> **Digitizing rural healthcare workflows for PHCs, ANMs, ASHA workers, families, members & health visits.**  
> An offline-first, sync-capable Node.js + TypeScript REST API backed by PostgreSQL (Supabase).

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [User Roles](#user-roles)
5. [Modules & API Routes](#modules--api-routes)
   - [Auth](#-auth-module)
   - [Users](#-users-module)
   - [Areas](#-areas-module)
   - [Families](#-families-module)
   - [Family Members](#-family-members-module)
   - [Health Records](#-health-records-module)
   - [Sync](#-sync-module)
   - [Tasks](#-tasks-module-coming-soon)
6. [Sync Engine](#sync-engine)
7. [Database Schema & Migrations](#database-schema--migrations)
8. [Security Model](#security-model)
9. [Environment Variables](#environment-variables)
10. [Running Locally](#running-locally)
11. [Project Status](#project-status)

---

## Overview

ASHA-EHR is a backend system built to digitize rural healthcare data collection in India. It supports:

- Secure JWT-based authentication with role enforcement
- Hierarchical data model: **Organisation → PHC → Area → ANM → ASHA → Family → Member → Health Record**
- Version-locked updates (optimistic concurrency) and soft deletes across all entities
- Offline-first architecture with a **bidirectional sync engine** for Flutter clients
- Full workflow state tracking (draft → submitted → verified → locked) on records

---

## Tech Stack

| Layer         | Technology                                      |
| ------------- | ----------------------------------------------- |
| **Runtime**   | Node.js                                         |
| **Language**  | TypeScript 5 (strict mode, ES2020 target)       |
| **Framework** | Express.js 5                                    |
| **Database**  | PostgreSQL via Supabase (connection pool: `pg`) |
| **Auth**      | JWT — Access Token (15 min) + Refresh Token (7d)|
| **Validation**| Zod 4                                           |
| **Security**  | Backend role-based access control (RBAC)        |
| **Dev Tools** | ts-node, TypeScript compiler                    |

---

## Project Structure

```
Asha-Ehr-Backend/
├── src/
│   ├── app.ts                        # Express app setup, route mounting
│   ├── server.ts                     # HTTP server entry point (port 3000)
│   ├── lib/
│   │   ├── db.ts                     # pg connection pool
│   │   └── password.ts               # bcrypt helpers
│   ├── middleware/
│   │   ├── auth.ts                   # authenticateheader + authorize(role)
│   │   └── globalerrorhandler.ts     # Central error handler (AppError aware)
│   ├── utils/
│   │   ├── jwt.ts                    # generateAccessToken / generateRefreshToken / verify*
│   │   └── Apperror.ts               # Custom AppError class
│   ├── types/
│   │   ├── express.d.ts              # Express Request augmentation (req.user)
│   │   └── userjwt.ts                # JWT payload shape
│   └── modules/
│       ├── auth/                     # Login, JWT issuance
│       ├── users/                    # PHC Admin creates ANM/ASHA/Doctor accounts
│       ├── area/                     # Area assignment (PHC Admin)
│       ├── family/                   # Family registry (ASHA)
│       ├── members/                  # Family member CRUD + workflow (ASHA)
│       ├── health/                   # Health records CRUD + workflow (ASHA)
│       ├── sync/                     # Bidirectional offline sync engine
│       └── tasks/                    # Task assignment (ANM → ASHA) [WIP]
├── infra/
│   ├── architecture.md
│   └── migrations/db/                # Ordered SQL migration scripts (000–020)
├── .env                              # Environment variables (see below)
├── tsconfig.json
└── package.json
```

Each module follows a consistent **layered architecture**:

```
<module>.routes.ts      → Route definitions + middleware chain
<module>.controller.ts  → Thin controller (call service, return response)
<module>.service.ts     → Business logic
<module>.repository.ts  → Raw SQL queries (pg pool / client)
<module>.schema.ts      → Zod validation schemas
<module>.types.ts       → TypeScript interfaces & types
<module>.middleware.ts  → Module-specific request validation middleware
```

---

## User Roles

| Role          | Description                                          |
| ------------- | ---------------------------------------------------- |
| `phc_admin`   | Manages users & areas; creates ANM/ASHA/Doctor accounts |
| `anm`         | Supervises assigned ASHAs; assigns tasks             |
| `asha`        | Creates & manages families, members, health records  |
| `doctor`      | Read-only clinical data access                       |

Role is embedded in the JWT payload and enforced by the `authorize(role)` middleware on every protected route.

---

## Modules & API Routes

All routes are prefixed with `/api`. Every route except `POST /api/auth/login` requires:

```
Authorization: Bearer <access_token>
```

---

### 🔐 Auth Module

**Base path:** `/api/auth`

| Method | Path     | Auth | Role | Description                          |
| ------ | -------- | ---- | ---- | ------------------------------------ |
| `POST` | `/login` | ❌   | —    | Authenticate user; returns JWT tokens |

**Request body:**
```json
{
  "phone": "9876543210",
  "password": "yourPassword"
}
```

**Response:**
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>"
}
```

JWT payload includes: `user_id`, `role`, `phc_id`, `anm_id`, `asha_id`.

---

### 👤 Users Module

**Base path:** `/api/users`

| Method | Path      | Auth | Role        | Description                              |
| ------ | --------- | ---- | ----------- | ---------------------------------------- |
| `POST` | `/create` | ✅   | `phc_admin` | Create a new ANM, ASHA, or Doctor account |

**Request body:**
```json
{
  "phone": "9876543210",
  "password": "securePass",
  "role": "asha",
  "name": "Priya Sharma",
  "phc_id": "<uuid>"
}
```

---

### 🗺️ Areas Module

**Base path:** `/api/areas`

| Method | Path      | Auth | Role        | Description                        |
| ------ | --------- | ---- | ----------- | ---------------------------------- |
| `POST` | `/assign` | ✅   | `phc_admin` | Assign a PHC area to an ANM / ASHA |

> Constraint: One Area = One ANM. Auto-maps ASHA → ANM based on area.

---

### 🏠 Families Module

**Base path:** `/api/families`

| Method | Path | Auth | Role   | Description               |
| ------ | ---- | ---- | ------ | ------------------------- |
| `POST` | `/`  | ✅   | `asha` | Register a new family     |

**Request body:**
```json
{
  "area_id": "<uuid>",
  "address_line": "House 12, Main Road",
  "landmark": "Near Temple"
}
```

Auto-links: `phc_id`, `area_id`, `anm_id`, `asha_id` from the authenticated user's JWT.

---

### 👨‍👩‍👧 Family Members Module

**Base path:** `/api/members`

| Method   | Path             | Auth | Role   | Description                                   |
| -------- | ---------------- | ---- | ------ | --------------------------------------------- |
| `POST`   | `/`              | ✅   | `asha` | Add a new member to a family                  |
| `PATCH`  | `/:id`           | ✅   | `asha` | Update member details (version-locked)        |
| `DELETE` | `/:id`           | ✅   | `asha` | Soft delete a member (`deleted_at` timestamp) |
| `PATCH`  | `/:id/workflow`  | ✅   | `asha` | Transition member workflow state              |

**Features:**
- Aadhaar number uniqueness validation
- Auto-assigns family head on first member
- Version-locked updates (optimistic concurrency — client must send current `version`)
- Soft delete (sets `deleted_at`, does not remove row)
- Workflow states: `draft → submitted → verified → locked`

---

### 🩺 Health Records Module

**Base path:** `/api/health-records`

| Method   | Path             | Auth | Role        | Description                                    |
| -------- | ---------------- | ---- | ----------- | ---------------------------------------------- |
| `POST`   | `/`              | ✅   | `asha`      | Create a new health record                     |
| `PATCH`  | `/:id`           | ✅   | `asha`      | Update a health record (version-locked)        |
| `DELETE` | `/:id`           | ✅   | `asha`      | Soft delete a health record                    |
| `PATCH`  | `/:id/workflow`  | ✅   | any (auth)  | Transition record workflow state               |

**Features:**
- Flexible JSONB `data_json` field for different visit types (ANC, PNC, general, etc.)
- Version-locked updates — edits blocked on locked records
- Linked to: member, family, area, task, ANM, PHC
- Audit fields (`created_by`, `updated_by`) set from JWT

---

### 🔄 Sync Module

**Base path:** `/api/sync`

| Method | Path | Auth | Role        | Description                             |
| ------ | ---- | ---- | ----------- | --------------------------------------- |
| `POST` | `/`  | ✅   | any (auth)  | Bidirectional offline sync (push + pull)|

See [Sync Engine](#sync-engine) section below for full details.

---

### 📋 Tasks Module *(Work In Progress)*

**Base path:** *(not yet mounted)*

Planned features:
- ANM assigns tasks to ASHA workers (ANC, PNC, household visit, etc.)
- Tasks link to: Family, Member, Area
- Status flow: `pending → in_progress → completed → verified`

---

## Sync Engine

The Sync Module implements a **bidirectional, transactional, offline-first sync** for Flutter clients.

### How It Works

```
Client (Flutter / SQLite)
  │
  │  POST /api/sync
  │  { request_id, device_id, last_sync_seq, changes: { families[], family_members[], health_records[], tasks[] } }
  ▼
Server
  1. Idempotency check → if request_id already processed, return cached response
  2. Apply changes in FK-safe order: families → family_members → health_records → tasks
     - INSERT: inserts new rows
     - UPDATE: version check → apply or mark as conflict
     - DELETE: soft delete (sets deleted_at)
  3. Pull delta changes since last_sync_seq for this user
  4. Store idempotency record (sync_logs table) inside same transaction
  5. COMMIT
  ▼
Response
  {
    "applied":  [{ "table": "families", "id": "<uuid>" }, ...],
    "conflicts": [{ "table": "...", "id": "...", "server_version": 3, "server_data": {...} }],
    "changes":  { "families": [...], "family_members": [...], "health_records": [...], "tasks": [...] },
    "new_sync_seq": 1042
  }
```

### Key Guarantees

| Property           | How it's achieved                                              |
| ------------------ | -------------------------------------------------------------- |
| **Idempotency**    | `request_id` (UUID) stored in `sync_logs`; duplicate requests return cached response |
| **Atomicity**      | All writes + idempotency record inside a single DB transaction |
| **FK Safety**      | Changes applied in strict order: `families → family_members → health_records → tasks` |
| **Conflict Detection** | Version mismatch → row returned in `conflicts[]`, not applied |
| **Partial Success** | Each table processed independently; conflicts don't block other rows |

### Validation Rules

- `request_id` and all change `id`s must be valid UUIDs
- `operation` must be `"insert"`, `"update"`, or `"delete"`
- `data` must be non-empty for `insert`/`update`; must be empty for `delete`
- Max **500 changes per table** per request
- `last_sync_seq` must be `>= 0`

---

## Database Schema & Migrations

Migration files are located in `infra/migrations/db/` and should be run in order:

| File                             | Description                                         |
| -------------------------------- | --------------------------------------------------- |
| `000_triggers_function.sql`      | Shared trigger function for `updated_at`            |
| `000.1_create_organisation.sql`  | Organisation table                                  |
| `001_create_phcs.sql`            | PHC (Primary Health Centres) table                  |
| `002_create_phc_areas.sql`       | PHC Areas / Villages table                          |
| `003_create_users.sql`           | Users table (all roles)                             |
| `004_create_user_area_map.sql`   | User-Area mapping (ANM/ASHA ↔ Area)                 |
| `005_create_families.sql`        | Families table                                      |
| `006_create_family_members.sql`  | Family Members table (Aadhaar uniqueness)            |
| `007_create_health_records.sql`  | Health Records table (JSONB data_json)              |
| `008_create_tasks.sql`           | Tasks table (ANM → ASHA assignment)                 |
| `009_create_sync_logs.sql`       | Sync idempotency log (request_id deduplication)     |
| `010_create_conflict_logs.sql`   | Conflict log table                                  |
| `020_indexes_health_records.sql` | Indexes on health_records for sync lookups          |
| `020_indexes_tasks.sql`          | Indexes on tasks                                    |

### Key Schema Patterns

All mutable tables share these common fields:

```sql
id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
version       INTEGER NOT NULL DEFAULT 1      -- optimistic concurrency
workflow_status TEXT                          -- draft | submitted | verified | locked
deleted_at    TIMESTAMPTZ                     -- soft delete
created_by    UUID REFERENCES users(id)
updated_by    UUID REFERENCES users(id)
created_at    TIMESTAMPTZ DEFAULT now()
updated_at    TIMESTAMPTZ DEFAULT now()       -- auto-updated by trigger
sync_seq      BIGSERIAL                       -- monotonic counter for delta pulls
device_id     TEXT                            -- originating device
```

---

## Security Model

| Rule                              | Implementation                                  |
| --------------------------------- | ----------------------------------------------- |
| All protected routes require JWT  | `authenticateheader` middleware                 |
| Role enforcement per route        | `authorize("role")` middleware                  |
| ASHA sees only her own families   | `asha_id` filter in repository queries          |
| ANM sees only her ASHA's data     | `anm_id` scoping                                |
| PHC Admin sees full PHC           | `phc_id` scoping                                |
| Doctor → read-only clinical data  | Role check; no write routes for `doctor`        |
| Version locks prevent overwrites  | `version` check on every UPDATE                 |
| Soft deletes, no hard data loss   | `deleted_at` timestamp instead of `DELETE`      |

---

## Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection string (Supabase)
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/postgres"

# JWT secrets (change these in production!)
ACCESS_TOKEN_SECRET="your-access-token-secret"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"

# Server port
PORT=3000
```

> ⚠️ **Never commit real secrets to version control.** Add `.env` to `.gitignore`.

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- A PostgreSQL database (Supabase or local)
- Run all migration scripts in `infra/migrations/db/` against your database

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env
# Edit .env with your database URL and JWT secrets

# 3. Run migrations (in order) against your DB
# (use Supabase SQL editor or psql)

# 4. Start development server
npm run dev
# → ts-node src/server.ts → http://localhost:3000

# 5. Build for production
npx tsc
npm start
# → node dist/server.js
```

### Testing with Postman

Add this header to all authenticated requests:
```
Authorization: Bearer <access_token>
```

A full API reference is available in [`api.md`](./api.md).

---

## Project Status

| Module              | Status           | Notes                                              |
| ------------------- | ---------------- | -------------------------------------------------- |
| Auth                | ✅ Complete      | Login, JWT (access + refresh)                      |
| Users               | ✅ Complete      | PHC Admin creates ANM / ASHA / Doctor              |
| Areas               | ✅ Complete      | Area assignment, one-area-one-ANM constraint       |
| Families            | ✅ Complete      | Create family, auto-link hierarchy                 |
| Family Members      | ✅ Complete      | CRUD, version-lock, soft delete, workflow          |
| Health Records      | ✅ Complete      | CRUD, JSONB data, version-lock, workflow           |
| **Sync Engine**     | ✅ Complete (V1) | Bidirectional sync, idempotency, conflict handling |
| Tasks               | 🚧 In Progress   | Scaffolded, business logic pending                 |
| Immunization        | ⛔ Pending       | Not yet started                                    |
| Vaccination Schedule| ⛔ Pending       | Not yet started                                    |
| Analytics Dashboard | ⛔ Pending       | Not yet started                                    |

---

*Last updated: February 2026*
