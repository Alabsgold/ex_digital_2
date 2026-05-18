# EX-Digital — Enterprise Attendance Management System

> A production-grade, real-time attendance management platform built for universities.  
> QR-code scanning · Role-based access · PWA · ERP integration · Live SSE streams.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Quick Start (Docker)](#quick-start-docker)
6. [Local Development (Without Docker)](#local-development-without-docker)
7. [Environment Variables](#environment-variables)
8. [Database Migrations](#database-migrations)
9. [API Reference](#api-reference)
10. [Role-Based Access Control](#role-based-access-control)
11. [Authentication Flow](#authentication-flow)
12. [QR Attendance Flow](#qr-attendance-flow)
13. [ERP Gateway](#erp-gateway)
14. [Frontend PWA](#frontend-pwa)
15. [Default Credentials](#default-credentials)
16. [Known Issues & Fixes Applied](#known-issues--fixes-applied)
17. [Testing](#testing)
18. [Deployment](#deployment)
19. [Contributing](#contributing)

---

## Overview

**EX-Digital** is a full-stack attendance management system designed for academic institutions. It supports three user roles — **Admin**, **Lecturer**, and **Student** — each with a tailored dashboard experience.

Key capabilities:

- 📱 **QR Code Scanning** — Lecturers generate session QR codes; students scan them to mark attendance
- ⚡ **Real-time Streams** — Server-Sent Events (SSE) push live attendance updates to the lecturer's dashboard
- 🔐 **JWT Authentication** — Stateless auth with token revocation via a revoked-tokens table
- 🏛️ **RBAC** — Granular role-based access control enforced at every API endpoint
- 🔄 **ERP Sync** — A Flask gateway handles HMAC-signed webhooks from external ERP systems
- 📊 **Attendance Analytics** — Per-course statistics, trend charts, and department breakdowns
- 📲 **PWA** — Installable Progressive Web App with offline queue for attendance scans
- 🐳 **Docker-first** — One-command startup via `docker-compose`

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                         Browser (PWA)                            │
│              React 18 + Vite + Zustand + TailwindCSS             │
│                    Port 3000 (Docker) / 5173 (dev)               │
└─────────────────────────┬────────────────────────────────────────┘
                          │ HTTP / SSE
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│               FastAPI Backend (Python 3.11+)                    │
│    Async SQLAlchemy · Pydantic v2 · JWT · SlowAPI · Alembic     │
│                         Port 8000                               │
└──────┬───────────────────────────────────────┬──────────────────┘
       │                                       │
       ▼                                       ▼
┌─────────────┐                      ┌──────────────────┐
│ PostgreSQL  │                      │  Redis           │
│  (Port 5432)│                      │  (Port 6379)     │
│  Main DB    │                      │  Rate limiting   │
└─────────────┘                      └──────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│              Flask ERP Gateway (Port 5001)                       │
│     HMAC-SHA256 webhook receiver · API-key protected export      │
└──────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend
| Component | Technology |
|-----------|-----------|
| Framework | FastAPI 0.115 |
| ORM | SQLAlchemy 2.0 (async) |
| Database | PostgreSQL 15 |
| Cache / Rate Limit | Redis 7 |
| Auth | python-jose (JWT HS256) + passlib (bcrypt) |
| Migrations | Alembic |
| Validation | Pydantic v2 |
| Server | Uvicorn (ASGI) |
| ERP Gateway | Flask + HMAC-SHA256 |

### Frontend
| Component | Technology |
|-----------|-----------|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Styling | TailwindCSS 3 + custom tokens |
| State | Zustand v5 (persisted) |
| HTTP | Axios |
| Animation | Framer Motion |
| QR Scan | html5-qrcode |
| QR Display | qrcode.react |
| Charts | Recharts |
| PWA | vite-plugin-pwa (Workbox) |
| Routing | React Router v6 |

---

## Project Structure

```
EX-AMS/
├── .env                        # Root env (backend + Docker secrets)
├── .env.example                # Template — copy to .env
├── docker-compose.yml          # Full-stack orchestration
│
├── backend/
│   ├── Dockerfile
│   ├── alembic/                # Database migration scripts
│   │   └── env.py
│   ├── alembic.ini
│   ├── requirements.txt
│   ├── app/
│   │   ├── main.py             # FastAPI app factory + lifespan
│   │   ├── config.py           # Pydantic settings (env-driven)
│   │   ├── database.py         # Async engine, session factory, Redis pool
│   │   ├── models/
│   │   │   ├── __init__.py     # All ORM models (User, Course, Session, Attendance, …)
│   │   │   └── base.py         # SQLAlchemy declarative Base
│   │   ├── schemas/
│   │   │   └── __init__.py     # All Pydantic v2 request/response schemas
│   │   ├── routers/
│   │   │   ├── auth.py         # /auth — register, login, logout, reset-password, bulk-import
│   │   │   ├── courses.py      # /courses — CRUD, enrollment, lecturer assignment
│   │   │   ├── sessions.py     # /sessions — start, end, SSE live stream
│   │   │   ├── attendance.py   # /attendance — QR scan, manual mark, history
│   │   │   └── admin.py        # /admin — dashboard stats, user management
│   │   └── utils/
│   │       ├── security.py     # JWT creation/verification, bcrypt, RBAC dependencies
│   │       ├── helpers.py      # QR/session generators, HMAC utils, CSV parser
│   │       └── rate_limit.py   # SlowAPI limiter instance
│   └── tests/
│
├── frontend/
│   ├── Dockerfile
│   ├── .env                    # Frontend Vite env (VITE_API_URL)
│   ├── nginx.conf              # Nginx config for production container
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx            # App entry + routing
│       ├── index.css           # Global styles + design tokens
│       ├── lib/
│       │   ├── apiClient.ts    # Axios instance + JWT interceptor
│       │   ├── offlineQueue.ts # IndexedDB-backed offline scan queue
│       │   └── useNetworkStatus.ts
│       ├── store/
│       │   ├── authStore.ts    # Zustand auth state + login/register/logout actions
│       │   ├── courseStore.ts
│       │   ├── sessionStore.ts
│       │   ├── attendanceStore.ts
│       │   └── adminStore.ts
│       ├── components/         # Reusable UI components
│       └── pages/
│           ├── LandingPage.tsx
│           ├── LoginPage.tsx
│           ├── RegisterPage.tsx
│           ├── StudentDashboard.tsx
│           ├── StudentAttendanceHistory.tsx
│           ├── LecturerDashboard.tsx
│           ├── LecturerSessions.tsx
│           ├── LecturerCourses.tsx
│           ├── AdminDashboard.tsx
│           ├── AdminUserManagement.tsx
│           ├── AdminCourseManagement.tsx
│           ├── AdminERPSync.tsx
│           └── SettingsPage.tsx
│
└── gateway/
    ├── Dockerfile
    ├── requirements.txt
    └── app.py                  # Flask ERP gateway with HMAC-SHA256 webhook
```

---

## Quick Start (Docker)

### Prerequisites
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running

### Steps

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd EX-AMS

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum change POSTGRES_PASSWORD and JWT_SECRET

# 3. Start all services
docker-compose up --build

# Services will be available at:
# Frontend  → http://localhost:3000
# Backend   → http://localhost:8000
# API Docs  → http://localhost:8000/docs  (DEBUG=true only)
# Gateway   → http://localhost:5001
```

The backend automatically:
1. Creates all database tables on first boot
2. Seeds a default admin account (see [Default Credentials](#default-credentials))

---

## Local Development (Without Docker)

### Backend

```bash
cd backend

# Create and activate virtualenv
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate    # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Ensure PostgreSQL and Redis are running locally, then set env vars
# (or copy root .env and adjust DATABASE_URL / REDIS_URL to use localhost)

# Run dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Configure API URL
# Create frontend/.env (already exists after cloning):
# VITE_API_URL=http://localhost:8000

# Start dev server
npm run dev
# → http://localhost:5173
```

### Gateway

```bash
cd gateway
pip install -r requirements.txt
python app.py
# → http://localhost:5001
```

---

## Environment Variables

Copy `.env.example` to `.env` in the project root. **Never commit `.env` to source control.**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ENVIRONMENT` | No | `development` | `development` or `production` |
| `DEBUG` | No | `false` | Enables `/docs`, verbose SQL logging |
| `DATABASE_URL` | **Yes** | — | Async PostgreSQL URL (`postgresql+asyncpg://...`) |
| `DATABASE_URL_SYNC` | No | — | Sync URL for Alembic migrations |
| `POSTGRES_PASSWORD` | **Yes** | — | Injected into the Postgres Docker service |
| `REDIS_URL` | **Yes** | — | Redis connection URL |
| `JWT_SECRET` | **Yes** | — | Min 32 characters. Use a random 64-char hex string in production |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | No | `30` | Token lifetime in minutes |
| `HMAC_SECRET` | **Yes** | — | Min 32 chars. Used to verify ERP webhook signatures |
| `GATEWAY_API_KEY` | **Yes** | — | API key for protected gateway export endpoints |
| `CORS_ORIGINS` | No | `["http://localhost:3000","http://localhost:5173"]` | JSON array of allowed frontend origins |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt work factor (higher = slower but more secure) |
| `SESSION_DURATION_MINUTES` | No | `10` | Default attendance session duration |
| `SESSION_GRACE_PERIOD_MINUTES` | No | `5` | Minutes after session end that QR scans are still accepted |
| `QR_SCAN_WINDOW_MINUTES` | No | `5` | QR validity window |
| `DEFAULT_ADMIN_EMAIL` | No | `admin@exdigital.local` | Seeded admin email |
| `DEFAULT_ADMIN_PASSWORD` | No | `Admin@123456` | Seeded admin password — **change in production** |
| `DEFAULT_ADMIN_NAME` | No | `System Administrator` | Seeded admin display name |

### Frontend-only (`frontend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:8000` | Backend base URL for the Vite dev server |

---

## Database Migrations

Alembic is configured for async PostgreSQL migrations.

```bash
cd backend

# Generate a new migration after model changes
alembic revision --autogenerate -m "describe your change"

# Apply pending migrations
alembic upgrade head

# Roll back one migration
alembic downgrade -1

# View migration history
alembic history
```

> **Note:** In development, `main.py` calls `Base.metadata.create_all` on startup as a convenience. In production, always run migrations explicitly with Alembic.

---

## API Reference

All endpoints are prefixed with the host (e.g. `http://localhost:8000`).  
Interactive docs available at `/docs` when `DEBUG=true`.

### Authentication (`/auth`)

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/auth/register` | No | Register a new student account |
| `POST` | `/auth/login` | No | Login with email or matric number |
| `GET` | `/auth/me` | JWT | Get current user's profile |
| `POST` | `/auth/logout` | JWT | Revoke current token |
| `POST` | `/auth/reset-password` | Admin | Admin resets any user's password |
| `POST` | `/auth/bulk-import` | Admin | Import users from CSV file |

#### `POST /auth/register`
```json
{
  "email": "student@university.edu",
  "password": "MyPass123",
  "full_name": "Adebayo Okonkwo",
  "matric_number": "CSC/19/0001",
  "department": "Computer Science",
  "level": "300"
}
```
Returns: `{ "access_token": "...", "token_type": "bearer", "user": { ... } }`

#### `POST /auth/login`
```json
{
  "login": "student@university.edu",   // or matric number
  "password": "MyPass123"
}
```

### Courses (`/courses`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/courses/` | All | List courses (scoped by role) |
| `POST` | `/courses/` | Admin, Lecturer | Create a new course |
| `GET` | `/courses/{id}` | All | Get course details |
| `PATCH` | `/courses/{id}` | Admin | Update course |
| `DELETE` | `/courses/{id}` | Admin | Archive course |
| `POST` | `/courses/{id}/enroll` | Admin | Enroll students |
| `POST` | `/courses/{id}/assign-lecturer` | Admin | Assign lecturer |
| `GET` | `/courses/{id}/attendance/stats` | All | Attendance statistics |

### Sessions (`/sessions`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `POST` | `/sessions/start` | Lecturer, Admin | Start an attendance session |
| `POST` | `/sessions/{id}/end` | Lecturer, Admin | End a session |
| `GET` | `/sessions/active` | All | List active sessions |
| `GET` | `/sessions/{id}` | All | Get session details |
| `GET` | `/sessions/{id}/stream` | Lecturer, Admin | SSE live attendance stream |
| `GET` | `/sessions/qr/{qr_uuid}` | Public | Get QR session info |

### Attendance (`/attendance`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `POST` | `/attendance/scan` | Student | Submit QR scan(s) (rapid scan batch) |
| `POST` | `/attendance/manual` | Lecturer, Admin | Manually mark attendance |
| `GET` | `/attendance/my` | Student | Student's own attendance history |
| `GET` | `/attendance/my/stats` | Student | Student's attendance statistics |
| `GET` | `/attendance/session/{id}` | Lecturer, Admin | All attendance for a session |

### Admin (`/admin`)

| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/admin/dashboard/stats` | Admin | Full dashboard statistics |
| `GET` | `/admin/users` | Admin | Paginated user list |
| `POST` | `/admin/users` | Admin | Create any user (any role) |
| `PATCH` | `/admin/users/{id}` | Admin | Update user details |
| `DELETE` | `/admin/users/{id}` | Admin | Deactivate user |
| `GET` | `/admin/erp/status` | Admin | ERP sync status |
| `POST` | `/admin/erp/trigger` | Admin | Trigger manual ERP sync |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | DB + Redis health status + uptime |

---

## Role-Based Access Control

Three roles are enforced at the FastAPI dependency level:

| Role | Capabilities |
|------|-------------|
| **student** | View enrolled courses, scan QR for attendance, view own history/stats |
| **lecturer** | Create courses, start/end sessions, view live SSE stream, manually mark attendance |
| **admin** | Full access — user management, course management, ERP sync, bulk import, reset passwords |

Role dependencies in `utils/security.py`:
- `get_current_user` — any authenticated user
- `require_student` — student only
- `require_lecturer` — lecturer only
- `require_admin` — admin only
- `require_admin_or_lecturer` — either admin or lecturer

---

## Authentication Flow

```
1. User submits registration/login form
        │
        ▼
2. Frontend (authStore.ts) calls POST /auth/register or /auth/login
        │
        ▼
3. Backend validates credentials / creates user
        │
        ▼
4. JWT is issued (HS256, 30-min expiry, includes user ID + role)
        │
        ▼
5. Token stored in localStorage via Zustand persist middleware
        │
        ▼
6. Axios interceptor (apiClient.ts) attaches Bearer token to every request
        │
        ▼
7. On 401, interceptor clears state and redirects to /login
        │
        ▼
8. On logout, POST /auth/logout adds JTI to revoked_tokens table
```

Password requirements (enforced on both frontend and backend):
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

---

## QR Attendance Flow

```
Lecturer                          Student
   │                                 │
   ├─ POST /sessions/start ──────────┤
   │  (course_id, duration, venue)   │
   │                                 │
   │◄── { qr_uuid, session_code } ───┤
   │                                 │
   ├─ Displays QR code on screen     │
   │                                 │
   │                    Scans QR ────┤
   │                                 │
   │              POST /attendance/scan
   │              { scans: [{ qr_uuid, timestamp }] }
   │                                 │
   │◄── SSE /sessions/{id}/stream ───┤
   │    (live attendance updates)    │
   │                                 │
   ├─ POST /sessions/{id}/end ───────┤
```

- The QR code contains the `qr_uuid` (UUID4 string).
- Sessions auto-expire after `SESSION_DURATION_MINUTES` + `SESSION_GRACE_PERIOD_MINUTES`.
- Duplicate scans within the same session return `already_marked` (not an error).
- The rapid scan endpoint accepts up to 50 scans in a single request (offline sync batch).

---

## ERP Gateway

The Flask gateway (`gateway/app.py`) acts as a secure intermediary between external ERP systems and EX-Digital.

### Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/health` | None | Gateway health check |
| `POST` | `/webhook/erp-sync` | HMAC-SHA256 | Receive signed attendance records |
| `GET` | `/erp/attendance-export` | API Key | Export unsynced records |
| `POST` | `/erp/trigger-sync` | API Key | Manually trigger sync |

### Webhook Signature Verification

Incoming webhooks must include an `X-Hub-Signature-256` header:

```
X-Hub-Signature-256: sha256=<hmac_sha256_hex_of_body>
```

Computed as:
```python
import hmac, hashlib
sig = "sha256=" + hmac.new(HMAC_SECRET.encode(), body, hashlib.sha256).hexdigest()
```

Requests older than 5 minutes (based on the `timestamp` field in the payload) are rejected to prevent replay attacks.

---

## Frontend PWA

The frontend is a Progressive Web App installable on mobile and desktop.

- **Offline support**: QR scans are queued in IndexedDB (`offlineQueue.ts`) when the network is unavailable and synced when connectivity is restored.
- **Auto-update**: Service worker auto-updates via `vite-plugin-pwa`.
- **Theme**: Dark glassmorphism design with neon-green accent (`#00FF88`).

### Build for Production

```bash
cd frontend
npm run build
# Output in frontend/dist/
```

---

## Default Credentials

On first startup, if no users exist, a default admin account is seeded:

| Field | Value |
|-------|-------|
| Email | `admin@exdigital.local` |
| Password | `Admin@123456` |
| Role | `admin` |

> ⚠️ **Change these immediately in production** by setting `DEFAULT_ADMIN_EMAIL` and `DEFAULT_ADMIN_PASSWORD` in your `.env`, or updating the account via the admin dashboard after first login.

---

## Known Issues & Fixes Applied

### 🐛 Bug Fix: Registration Failed — Matric Number Validation

**Symptom:** The registration form showed "Registration failed" even with valid data.

**Root Cause:** The backend `RegisterRequest` schema enforced the regex `^[A-Z0-9]{5,20}$` on `matric_number`, which **rejects** common Nigerian university matric formats that contain slashes or hyphens (e.g. `CSC/19/0001`). The frontend's placeholder text demonstrates exactly this format, leading to a **422 Unprocessable Entity** response that was surfaced as "Registration failed."

**Fix Applied:**
- `backend/app/schemas/__init__.py` — Pattern updated to `^[A-Za-z0-9\-/]{4,25}$`
- `frontend/src/pages/RegisterPage.tsx` — Client-side validation regex aligned with backend

### 🐛 Bug Fix: Missing Frontend `.env` File

**Symptom:** The `VITE_API_URL` environment variable was not defined, forcing the API client to always use the hardcoded `http://localhost:8000` fallback.

**Fix Applied:** Created `frontend/.env` with `VITE_API_URL=http://localhost:8000`.

### ⚠️ Known Limitation: `db.flush()` vs `db.commit()` in Routers

All router endpoints use `await db.flush()` (not `await db.commit()`). The actual commit happens in the `get_db()` dependency after the endpoint returns. This is correct behaviour, but means that if the response is sent and then the commit fails at the dependency level, the client will have received a success response for data that was not persisted.

**Mitigation:** This is unlikely to happen in practice with PostgreSQL. Alembic migrations should be used to manage schema changes, not `create_all`.

---

## Testing

```bash
cd backend

# Run all tests
pytest tests/ -v

# With coverage
pytest tests/ --cov=app --cov-report=term-missing
```

Test files are located in `backend/tests/`. Tests use `pytest-asyncio` and `anyio` for async test support.

---

## Deployment

### Production Checklist

- [ ] Set `ENVIRONMENT=production` in `.env`
- [ ] Set `DEBUG=false`
- [ ] Generate a strong `JWT_SECRET` (min 64 random hex chars): `openssl rand -hex 32`
- [ ] Generate a strong `HMAC_SECRET`: `openssl rand -hex 32`
- [ ] Change `DEFAULT_ADMIN_PASSWORD` or delete the default account after first login
- [ ] Set `CORS_ORIGINS` to your actual production domain(s)
- [ ] Use Alembic for DB migrations (`alembic upgrade head`) — do not rely on `create_all`
- [ ] Set up HTTPS (nginx reverse proxy with SSL certificate)
- [ ] Configure proper `POSTGRES_PASSWORD`
- [ ] Ensure Redis is password-protected in production

### Docker Production Build

```bash
docker-compose -f docker-compose.yml up --build -d
```

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Commit your changes: `git commit -m "feat: describe your change"`
4. Push to your branch: `git push origin feature/my-feature`
5. Open a Pull Request

### Commit Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add bulk CSV import for lecturers
fix: correct matric number regex to allow slashes
docs: update API reference for session endpoints
refactor: extract attendance stats into shared helper
```

---

*Built with ❤️ — EX-Digital Team*
