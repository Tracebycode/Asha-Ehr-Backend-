# 🏥 ASHA-EHR Backend

> **Digitizing rural healthcare workflows for PHCs, ASHA workers, families, members & health visits.**
> An offline-first, sync-capable **Node.js + TypeScript** REST API backed by **PostgreSQL (Supabase)**.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Project Structure](#project-structure)
4. [Architecture](#architecture)
5. [User Roles & Authority Levels](#user-roles--authority-levels)
6. [Modules & API Routes](#modules--api-routes)
   - [Auth](#-auth)
   - [Users](#-users)
   - [Areas](#-areas)
   - [Families](#-families)
   - [Family Members](#-family-members)
   - [Health Records](#-health-records)
   - [Sync](#-sync)
   - [Tasks](#-tasks-wip)
7. [Sync Engine (Deep Dive)](#sync-engine-deep-dive)
8. [Security Model](#security-model)
9. [Database Schema Patterns](#database-schema-patterns)
10. [Environment Variables](#environment-variables)
11. [Running Locally](#running-locally)
12. [Project Status](#project-status)

---

## Overview

ASHA-EHR is a backend system built to digitise rural healthcare data collection in India. It powers a Flutter mobile app used by ASHA workers in the field — often without internet.

**Core capabilities:**

- Secure **JWT-based authentication** with strict role enforcement per route
- Hierarchical data model: `PHC → Area → ASHA → Family → Member → Health Record`
- **Optimistic concurrency** (version-locked updates) and **soft deletes** across all entities
- **Offline-first** bidirectional sync engine for Flutter/SQLite clients
- **Workflow state machine** (`draft → submitted → verified → locked`) on records
- **Server-authoritative ownership** — ASHA ownership fields (`asha_id`, `phc_id`, `area_id`) are always derived from the JWT and the DB, never trusted from the client

---

## Tech Stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| **Runtime**    | Node.js ≥ 18                                     |
| **Language**   | TypeScript 5                                     |
| **Framework**  | Express.js 5                                     |
| **Database**   | PostgreSQL via Supabase (`pg` connection pool)   |
| **Auth**       | JWT — Access Token (15 min) + Refresh Token (7d) |
| **Validation** | Zod 4                                            |
| **Security**   | RBAC (`authenticateheader` + `authorize(role)`)  |
| **Dev Tools**  | `ts-node`, TypeScript compiler                   |

---

## Project Structure

```
Asha-Ehr-Backend/
├── src/
│   ├── app.ts                         # Express app, middleware, route mounting, 404 handler
│   ├── server.ts                      # HTTP server, graceful shutdown, process guards
│   ├── lib/
│   │   ├── db.ts                      # pg Pool (single shared instance)
│   │   └── password.ts                # bcrypt hash / compare helpers
│   ├── middleware/
│   │   ├── auth.ts                    # authenticateheader + authorize(role)
│   │   └── globalerrorhandler.ts      # Centralised AppError-aware error handler
│   ├── utils/
│   │   ├── Apperror.ts                # Custom AppError (statusCode + optional field errors)
│   │   └── jwt.ts                     # generateAccessToken / verifyAccessToken / refresh variants
│   ├── types/
│   │   ├── express.d.ts               # Express Request augmentation → req.user
│   │   └── userjwt.ts                 # JWT payload shape (userid, role, phc_id)
│   └── modules/
│       ├── auth/                      # Login, JWT issuance
│       ├── users/                     # PHC Admin creates staff accounts
│       ├── area/                      # Area assignment (PHC Admin only)
│       ├── family/                    # Family registration (ASHA)
│       ├── members/                   # Family member CRUD + workflow (ASHA)
│       ├── health/                    # Health record CRUD + workflow (ASHA)
│       ├── sync/                      # Bidirectional offline sync engine
│       └── tasks/                     # Task assignment ANM → ASHA [WIP]
├── infra/
│   └── migrations/db/                 # Ordered SQL migration scripts (000 → 020)
├── .env
├── tsconfig.json
└── package.json
```

### Module Anatomy

Every module follows the same layered pattern:

```
<module>.routes.ts      → Route definitions + middleware chain
<module>.controller.ts  → Thin; calls service, returns HTTP response
<module>.services.ts    → All business logic + transaction management
<module>.repository.ts  → Raw parameterised SQL (pg PoolClient)
<module>.schema.ts      → Zod validation schemas
<module>.types.ts       → TypeScript interfaces & types
<module>.middleware.ts  → Zod-powered request validation middleware
```

---

## Architecture

```
Flutter App (SQLite, offline)
        │
        │  HTTPS / JWT
        ▼
┌──────────────────────────────────────────────┐
│              Express.js API                  │
│                                              │
│  POST /api/auth/login                        │
│  POST /api/users/create      [phc_admin]     │
│  POST /api/areas/assign      [phc_admin]     │
│  POST /api/families          [asha]          │
│  POST /api/members           [asha]          │
│  POST /api/health-records    [asha]          │
│  POST /api/sync              [any auth]      │
│                                              │
│  ┌────────────┐  ┌───────────┐  ┌─────────┐ │
│  │  Auth MW   │  │  Zod Val  │  │ AppError│ │
│  │(JWT verify)│  │(per route)│  │ Handler │ │
│  └────────────┘  └───────────┘  └─────────┘ │
└─────────────────────────┬────────────────────┘
                          │  pg Pool (SSL)
                          ▼
                   PostgreSQL (Supabase)
```

**Request lifecycle:**
`Incoming Request → CORS → JSON parse → authenticateheader → authorize(role) → Zod validate → Controller → Service (BEGIN) → Repository (SQL) → COMMIT/ROLLBACK → Response`

---

## User Roles & Authority Levels

| Role        | Authority Level | Capabilities                                      |
| ----------- | --------------- | ------------------------------------------------- |
| `phc_admin` | 1               | Creates users, assigns areas                      |
| `doctor`    | 2               | Read-only clinical access                         |
| `anm`       | 3               | Supervises ASHAs, assigns tasks                   |
| `asha`      | 4               | Creates families, members, health records; syncs  |

Role is embedded in the JWT payload and enforced by the `authorize(role)` middleware on every protected route. Authority level is stored in the `users` table.

---

## Modules & API Routes

All routes are prefixed with `/api`. Every route except `POST /api/auth/login` requires:

```
Authorization: Bearer <access_token>
```

There is also a server health-check:

```
GET /health   → { status: "ok", timestamp, service }
```

---

### 🔐 Auth

**Base path:** `/api/auth`

| Method | Path     | Auth | Role | Description                     |
| ------ | -------- | ---- | ---- | ------------------------------- |
| `POST` | `/login` | ❌   | —    | Authenticate; returns JWT token |

**Request:**
```json
{
  "phone": "9876543210",
  "password": "yourPassword"
}
```

**Response:**
```json
{
  "success": true,
  "token": "<access_token>"
}
```

JWT payload: `{ userid, role, phc_id }`

> Only active users (`is_active = true`, `status = 'active'`) can log in.

---

### 👤 Users

**Base path:** `/api/users`

| Method | Path      | Auth | Role        | Description                                  |
| ------ | --------- | ---- | ----------- | -------------------------------------------- |
| `POST` | `/create` | ✅   | `phc_admin` | Create a new ANM, ASHA, or Doctor account    |

**Request:**
```json
{
  "name": "Priya Sharma",
  "phone": "9876543210",
  "password": "securePass",
  "gender": "female",
  "dob": "1995-06-15",
  "education_level": "graduate",
  "role": "asha"
}
```

- `phc_id` is auto-set from the admin's JWT — clients cannot spoof it
- `authority_level` is derived server-side from `role`

---

### 🗺️ Areas

**Base path:** `/api/areas`

| Method | Path      | Auth | Role        | Description                     |
| ------ | --------- | ---- | ----------- | ------------------------------- |
| `POST` | `/assign` | ✅   | `phc_admin` | Assign an area to a user        |

**Request:**
```json
{
  "user_id": "<uuid>",
  "area_id": "<uuid>"
}
```

- `phc_id` and `assigned_by` are injected from the admin's JWT
- Duplicate area assignments are rejected (400)
- Area mapping stored in `user_area_map` table

---

### 🏠 Families

**Base path:** `/api/families`

| Method | Path | Auth | Role   | Description           |
| ------ | ---- | ---- | ------ | --------------------- |
| `POST` | `/`  | ✅   | `asha` | Register a new family |

**Request:**
```json
{
  "head_member_id": "<uuid>",
  "address_line": "House 12, Main Road",
  "landmark": "Near Temple",
  "device_name": "device-abc",
  "device_created_at": "2026-03-20T10:00:00Z"
}
```

- `phc_id`, `area_id`, `asha_id` are all resolved server-side from JWT + `user_area_map`
- Client cannot inject ownership fields

---

### 👨‍👩‍👧 Family Members

**Base path:** `/api/members`

| Method   | Path            | Auth | Role   | Description                            |
| -------- | --------------- | ---- | ------ | -------------------------------------- |
| `POST`   | `/`             | ✅   | `asha` | Add a new member to a family           |
| `PATCH`  | `/:id`          | ✅   | `asha` | Update member details (version-locked) |
| `DELETE` | `/:id`          | ✅   | `asha` | Soft delete a member                   |
| `PATCH`  | `/:id/workflow` | ✅   | `asha` | Transition workflow state              |

**Workflow states:** `draft → submitted → verified → locked`

**Key rules:**
- Aadhaar number is globally unique — duplicate check enforced
- Updates blocked if `workflow_status = 'locked'`
- Version must match current DB version (optimistic concurrency)
- Soft delete sets `is_active = false`, row is never removed

---

### 🩺 Health Records

**Base path:** `/api/health-records`

| Method   | Path            | Auth | Role       | Description                                  |
| -------- | --------------- | ---- | ---------- | -------------------------------------------- |
| `POST`   | `/`             | ✅   | `asha`     | Create a health record                       |
| `PATCH`  | `/:id`          | ✅   | `asha`     | Update record (version-locked)               |
| `DELETE` | `/:id`          | ✅   | `asha`     | Soft delete                                  |
| `PATCH`  | `/:id/workflow` | ✅   | any (auth) | Workflow transition                          |

**Visit types:** `general` | `anc` | `pnc` | `immunization` | `nutrition`

**Workflow states:** `draft → submitted → verified → locked` (also `verified → corrected → submitted`)

**Verification roles** (can set `verified` / `locked` / `corrected`): `supervisor`, `phc_officer`, `admin`

**Key rules:**
- `data_json` is a flexible JSONB field — structure varies by `visit_type`
- ASHA can only modify records she created (`asha_id` check)
- Edits and deletes are blocked on `locked` records
- Ownership (`phc_id`, `area_id`, `asha_id`) is resolved from `member → family` context on the server

---

### 🔄 Sync

**Base path:** `/api/sync`

| Method | Path | Auth | Role       | Description                              |
| ------ | ---- | ---- | ---------- | ---------------------------------------- |
| `POST` | `/`  | ✅   | any (auth) | Bidirectional offline sync (push + pull) |

See [Sync Engine Deep Dive](#sync-engine-deep-dive) below.

---

### 📋 Tasks *(WIP)*

Module scaffolded. Business logic pending.

**Planned:**
- ANM assigns visit tasks to ASHA workers
- Tasks link to: Family, Member, Area
- Status: `pending → in_progress → completed → verified`

---

## Sync Engine (Deep Dive)

The sync module is the core of the offline-first architecture. It handles a Flutter client that works on SQLite locally and syncs when connectivity is available.

### Request Format

```json
{
  "request_id": "<uuid-v4>",
  "device_id": "flutter-device-xyz",
  "last_sync_seq": 1041,
  "changes": {
    "families":       [ <SyncChange>, ... ],
    "family_members": [ <SyncChange>, ... ],
    "health_records": [ <SyncChange>, ... ],
    "tasks":          [ <SyncChange>, ... ]
  }
}
```

Each `SyncChange`:
```json
{
  "id":        "<uuid>",
  "operation": "insert | update | delete",
  "version":   2,
  "data":      { ... },
  "metadata":  {
    "device_created_at":   "2026-03-20T10:00:00Z",
    "device_updated_at":   "2026-03-20T12:00:00Z",
    "last_modified_device": "flutter-device-xyz"
  }
}
```

### Response Format

```json
{
  "applied":   [ { "table": "families", "id": "<uuid>" } ],
  "conflicts": [ { "table": "family_members", "id": "<uuid>", "server_version": 4, "server_data": { ... } } ],
  "changes": {
    "families":       [ ... ],
    "family_members": [ ... ],
    "health_records": [ ... ]
  },
  "new_sync_seq": 1050
}
```

### Processing Pipeline

```
POST /api/sync
   │
   ├─ 1. JWT auth + Zod validation (middleware)
   │
   ├─ 2. FetchAshaData (user_id → users JOIN user_area_map)
   │       Builds AshaContext: { asha_id, phc_id, area_id, last_modified_by, last_modified_role }
   │
   ├─ BEGIN transaction
   │
   ├─ 3. Idempotency check
   │       If request_id already in sync_requests → return cached response (no re-processing)
   │
   ├─ 4. Apply changes (FK-safe order: families → family_members → health_records → tasks)
   │       Per change:
   │         • Inject ownership fields from AshaContext (client values are overridden)
   │         • Validate allowed fields (whitelist per table)
   │         • INSERT  → ON CONFLICT (id) DO NOTHING  → "inserted" | "skipped"
   │         • UPDATE  → WHERE id = $1 AND version = $2 AND is_active = true
   │                    → "updated" | ConflictEntry (version mismatch)
   │         • DELETE  → soft-delete (is_active = false, version++, sync_seq++)
   │                    → "deleted" | "skipped" (already inactive) | ConflictEntry
   │
   ├─ 5. Pull delta (rows WHERE sync_seq > last_sync_seq)
   │       Parallel fetch across: families, family_members, health_records
   │       Max 200 rows per table per sync
   │
   ├─ 6. Store idempotency record in sync_requests (same transaction)
   │
   └─ COMMIT → return response
```

### Key Guarantees

| Property              | How it's enforced                                                              |
| --------------------- | ------------------------------------------------------------------------------ |
| **Idempotency**       | `request_id` (UUID) stored in `sync_requests`; duplicates return cached result |
| **Atomicity**         | All writes + idempotency record in a single DB transaction                     |
| **FK safety**         | Strict table order: `families → family_members → health_records → tasks`       |
| **Conflict detection**| Version mismatch → returned in `conflicts[]`, not applied                      |
| **Partial success**   | Each row processed independently; conflicts don't block other rows             |
| **Ownership security**| ASHA context always fetched from DB; client-supplied IDs are always overridden |
| **Field whitelist**   | Only DB-safe columns accepted per table; unknown fields throw 400              |

### Validation Rules

| Rule                              | Detail                                              |
| --------------------------------- | --------------------------------------------------- |
| `request_id` format               | Must be a valid UUID v4                             |
| `change.id` format                | Must be a valid UUID v4                             |
| `operation`                       | Must be `"insert"`, `"update"`, or `"delete"`       |
| `data` for insert/update          | Must be non-empty                                   |
| `data` for delete                 | Must be empty                                       |
| `last_sync_seq`                   | Integer ≥ 0                                         |
| Max changes per table per request | 500                                                 |

### Ownership Injection (Per Table)

| Table            | Fields overridden from AshaContext                           |
| ---------------- | ------------------------------------------------------------ |
| `families`       | `phc_id`, `asha_id`, `area_id`, `last_modified_by`, `last_modified_role` |
| `family_members` | `last_modified_by`, `last_modified_role`                     |
| `health_records` | `phc_id`, `asha_id`, `area_id`                               |
| `tasks`          | *(none — tasks are assigned by ANM, not ASHA)*               |

---

## Security Model

| Rule                                  | Implementation                                        |
| ------------------------------------- | ----------------------------------------------------- |
| All protected routes require JWT      | `authenticateheader` middleware (401 if missing/bad)  |
| Role enforcement per route            | `authorize("role")` middleware (403 if wrong role)    |
| ASHA ownership always server-derived  | `FetchAshaData` called once per sync request          |
| Client cannot inject `asha_id` etc.  | Ownership fields overwritten from `AshaContext`       |
| Version locks prevent overwrites      | `version` check on every UPDATE                       |
| Soft deletes — no hard data loss      | `is_active = false` + `version++` instead of DELETE   |
| `phc_id` always from JWT              | Never accepted from client body                       |
| Input validation on every route       | Zod schemas in module middleware                      |
| Global error handler                  | `AppError`-aware; hides stack traces from client      |

---

## Database Schema Patterns

All mutable tables share these common columns:

```sql
id                   UUID PRIMARY KEY DEFAULT gen_random_uuid()
version              INT  NOT NULL DEFAULT 1          -- optimistic concurrency
is_active            BOOL NOT NULL DEFAULT true       -- soft delete flag
workflow_status      TEXT                             -- draft|submitted|verified|locked
sync_seq             BIGINT DEFAULT nextval('global_sync_seq')  -- monotonic, used for delta pulls
created_at           TIMESTAMPTZ DEFAULT NOW()
updated_at           TIMESTAMPTZ DEFAULT NOW()        -- auto-bumped by trigger
device_created_at    TIMESTAMPTZ                      -- device-reported creation time
device_updated_at    TIMESTAMPTZ                      -- device-reported update time
last_modified_by     UUID REFERENCES users(id)        -- audit: who last wrote this row
last_modified_role   TEXT                             -- audit: their role at time of write
last_modified_device TEXT                             -- audit: originating device ID
```

### Migration Files (`infra/migrations/db/`)

| File                             | Description                                      |
| -------------------------------- | ------------------------------------------------ |
| `000_triggers_function.sql`      | Shared `updated_at` trigger function             |
| `000.1_create_organisation.sql`  | Organisation table                               |
| `001_create_phcs.sql`            | PHC (Primary Health Centres) table               |
| `002_create_phc_areas.sql`       | PHC Areas / Villages table                       |
| `003_create_users.sql`           | Users table (all roles)                          |
| `004_create_user_area_map.sql`   | User ↔ Area mapping (`user_area_map`)            |
| `005_create_families.sql`        | Families table                                   |
| `006_create_family_members.sql`  | Family Members (Aadhaar uniqueness)              |
| `007_create_health_records.sql`  | Health Records (JSONB `data_json`)               |
| `008_create_tasks.sql`           | Tasks table (ANM → ASHA assignment)              |
| `009_create_sync_logs.sql`       | `sync_requests` — idempotency log                |
| `010_create_conflict_logs.sql`   | Conflict log table                               |
| `020_indexes_health_records.sql` | Indexes for sync delta pulls                     |
| `020_indexes_tasks.sql`          | Indexes on tasks                                 |

---

## Environment Variables

Create `.env` in the project root:

```env
# PostgreSQL (Supabase connection string)
DATABASE_URL="postgresql://<user>:<password>@<host>:5432/postgres"

# JWT secrets — use long random strings in production
ACCESS_TOKEN_SECRET="your-access-token-secret"
REFRESH_TOKEN_SECRET="your-refresh-token-secret"

# Server port (default: 3000)
PORT=3000
```

> ⚠️ Never commit real secrets to version control. Ensure `.env` is in `.gitignore`.

---

## Running Locally

### Prerequisites

- Node.js ≥ 18
- A PostgreSQL database (Supabase or local `psql`)
- All migration scripts applied in order

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Create and fill in .env
cp .env.example .env

# 3. Apply migrations (in order) via Supabase SQL editor or psql
# infra/migrations/db/000_triggers_function.sql
# infra/migrations/db/000.1_create_organisation.sql
# ... through 020_indexes_tasks.sql

# 4. Start development server
npm run dev
# → ts-node src/server.ts
# → 🚀 http://localhost:3000
# → Health: http://localhost:3000/health

# 5. Build + run for production
npx tsc
npm start
# → node dist/server.js
```

### Quick Test (Postman / curl)

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","password":"yourPassword"}'

# Use the returned token on protected routes
curl -X POST http://localhost:3000/api/families \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{...}'
```

Full API reference: [`api.md`](./api.md)

---

## Project Status

| Module              | Status           | Notes                                                   |
| ------------------- | ---------------- | ------------------------------------------------------- |
| Auth                | ✅ Complete      | Phone + password login, JWT access token                |
| Users               | ✅ Complete      | PHC Admin creates ANM / ASHA / Doctor accounts          |
| Areas               | ✅ Complete      | Area assignment via `user_area_map`, duplicate guard    |
| Families            | ✅ Complete      | Create, server-side ownership resolution                |
| Family Members      | ✅ Complete      | CRUD, Aadhaar uniqueness, version-lock, soft delete, workflow |
| Health Records      | ✅ Complete      | CRUD, JSONB `data_json`, version-lock, workflow, role-gated verification |
| **Sync Engine V1**  | ✅ Complete      | Bidirectional sync, idempotency, conflict detection, ownership enforcement |
| Tasks               | 🚧 In Progress   | Module scaffolded, business logic pending               |
| Refresh Token Flow  | 🚧 Pending       | `generateRefreshToken` exists, no refresh route yet     |
| Immunization        | ⛔ Not started   |                                                         |
| Vaccination Schedule| ⛔ Not started   |                                                         |
| Analytics Dashboard | ⛔ Not started   |                                                         |

---

*Last updated: March 2026*
