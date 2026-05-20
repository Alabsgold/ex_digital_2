# EX-AMS — EX-Digital Attendance Management System

> A full-stack, real-time university attendance management system with barcode scanning, QR codes, live attendance streaming, and role-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18 + TypeScript + Vite + TailwindCSS |
| **Backend** | FastAPI (Python 3.11) |
| **Database** | PostgreSQL 15 |
| **Cache / Pub-Sub** | Redis 7 |
| **Auth** | JWT (HS256) + bcrypt |
| **Barcode Scanning** | ZXing (`@zxing/browser` + `@zxing/library`) |
| **Containerisation** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx (gateway) |
| **Realtime** | Server-Sent Events (SSE) |

---

## System Architecture

```
Browser → Nginx Gateway (port 80)
              ├─ /api/* → FastAPI Backend (port 8000)
              └─ /* → React Frontend (Nginx static)

Backend → PostgreSQL (persistent data)
        → Redis (session cache + SSE pub/sub)
```

---

## User Roles

| Role | Description |
|---|---|
| **Admin** | Full system access — manage users, courses, bulk import, ERP sync |
| **Lecturer** | Manage own courses, start/end sessions, scan barcodes, roll call |
| **Student** | Enroll in courses, mark own attendance, view history |

---

## Features

### 🔐 Authentication
- JWT-based login with email or matric number
- Role-based access control (Admin / Lecturer / Student)
- Password strength validation (uppercase, lowercase, digit, min 8 chars)
- Token revocation (logout invalidates token via Redis/DB)
- Session-aware API — 401 globally redirects to login

### 👑 Admin Features
- **User Management** — Create, edit, deactivate users; bulk CSV/Excel import
- **Course Management** — Create, archive, assign lecturers, enroll students
- **ERP Sync** — Sync pending students from the university ERP
- **Global Attendance Ledger** — View every attendance record across the university, filter by course/date/status, and export to CSV
- **Dashboard** — System stats: total users, active sessions, attendance trends, department breakdown
- **System Health** — DB + Redis connectivity monitoring

### 🎓 Lecturer Features
- **Course Overview** — See all assigned courses with enrollment counts and attendance percentages
- **Session Management** — Start timed attendance sessions (1–180 min) with optional venue
- **Barcode Scanner** — ZXing-powered live camera scanner for student ID barcodes (Code-128, QR, Code-39)
  - Rear-camera preferred, native hardware acceleration on supported devices
  - Real-time feedback overlays (success, not enrolled, already marked, not registered)
  - Auto-resumes after each scan — no stop/restart cycle
- **Roll Call** — Browse enrolled student list with search, tick to select multiple students, mark all in one submit
  - Already-marked students shown greyed out with a green tick
  - Live count badge while selecting
- **Live Attendance Stream** — Real-time SSE feed shows students as they mark attendance
  - Pre-loads all previously-marked students on connect
  - Shows name, matric number, time, and status (present / late)
- **Reporting & Export** — View a 7-day attendance trend chart and instantly export course attendance data to CSV for offline analysis
- **End Session** — Confirmed end stops all further attendance submissions

### 🎒 Student Features
- **Course Enrollment** — Browse and self-enroll into available courses (filtered by level)
- **Attendance Marking** — Enter session code or scan lecturer's QR code to mark attendance
  - Status determined automatically: `present` (early) or `late` (past grace window)
- **Attendance History** — View all attendance records with filtering by course, date range, and status
- **Statistics Dashboard** — Overall attendance percentage + per-course breakdown with session totals

---

## API Endpoints

### Auth (`/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/login` | Login, get JWT token |
| POST | `/auth/logout` | Revoke token |
| GET | `/auth/me` | Get current user profile |

### Courses (`/courses`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/courses/` | List courses (scoped by role) |
| GET | `/courses/available` | List courses available to enroll |
| POST | `/courses/` | Create course (Admin) |
| GET | `/courses/{id}` | Get course details |
| PATCH | `/courses/{id}` | Update course (Admin) |
| DELETE | `/courses/{id}` | Archive course (Admin) |
| POST | `/courses/{id}/enroll` | Bulk enroll students (Admin) |
| POST | `/courses/{id}/self-enroll` | Student self-enroll / lecturer claim |
| GET | `/courses/{id}/students` | List enrolled students (Admin/Lecturer) |
| POST | `/courses/{id}/assign-lecturer` | Assign lecturer (Admin) |
| GET | `/courses/{id}/attendance/stats` | Course attendance statistics |
| GET | `/courses/{id}/attendance/export` | Stream full course attendance as CSV |

### Sessions (`/sessions`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/sessions/start` | Start a new session (Lecturer) |
| GET | `/sessions/active` | List active sessions (Lecturer) |
| POST | `/sessions/{id}/end` | End a session (Lecturer) |
| GET | `/sessions/{id}/attendees` | List attendees of a session |
| GET | `/sessions/{id}/attendees/stream` | SSE stream for live attendance |
| GET | `/sessions/{id}/qr` | Get QR code data for a session |

### Attendance (`/attendance`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/attendance/rapid-scan` | Student marks via QR/session code |
| POST | `/attendance/manual` | Lecturer marks student by student ID |
| POST | `/attendance/barcode-scan` | Lecturer marks via matric barcode scan |
| GET | `/attendance/my` | Student's own attendance records |
| GET | `/attendance/stats` | Student's own attendance statistics |
| GET | `/attendance/lecturer-stats` | Lecturer's dashboard statistics and trend |

### Admin (`/admin`)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/admin/users` | Paginated user list |
| POST | `/admin/users` | Create user |
| PATCH | `/admin/users/{id}` | Update user |
| POST | `/admin/users/bulk-import` | Bulk CSV/Excel import |
| POST | `/admin/users/{id}/reset-password` | Reset a user's password |
| GET | `/admin/dashboard/stats` | Dashboard statistics |
| GET | `/admin/attendance/records` | Paginated global attendance ledger |
| GET | `/admin/system/health` | System health check |
| GET | `/admin/erp/sync-status` | ERP sync status |
| POST | `/admin/erp/sync` | Trigger ERP sync |

---

## Getting Started

### Prerequisites
- Docker Desktop installed and running
- Git

### 1. Clone the repository
```bash
git clone <repo-url>
cd EX-AMS
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your settings (DB credentials, JWT secret, etc.)
```

### 3. Build and start all services
```bash
docker-compose build
docker-compose up -d
```

### 4. Apply database migrations
```bash
docker-compose exec backend alembic upgrade head
```

### 5. Create the first admin user
```bash
docker-compose exec backend python -c "
from app.database import sync_engine
# Or use the /auth/register endpoint with role=admin
"
```
Or simply `POST /auth/register` with `{ role: 'admin' }` from the first registered user, then promote via admin panel.

### 6. Open the app
Navigate to `http://localhost` in your browser.

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | required |
| `REDIS_URL` | Redis connection string | required |
| `JWT_SECRET` | Secret key for JWT signing | required |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry | `60` |
| `BCRYPT_ROUNDS` | Password hash rounds | `12` |
| `QR_SCAN_WINDOW_MINUTES` | Minutes before scan is marked "late" | `15` |
| `SESSION_GRACE_PERIOD_MINUTES` | Extra time after session ends Redis key is kept | `5` |
| `RATE_LIMIT_RAPID_SCAN` | Rate limit for rapid QR scan endpoint | `30/minute` |

---

## Project Structure

```
EX-AMS/
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app entry point
│   │   ├── config.py         # Settings (Pydantic)
│   │   ├── database.py       # Async SQLAlchemy + Redis
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic request/response schemas
│   │   ├── routers/          # API route handlers
│   │   │   ├── auth.py
│   │   │   ├── courses.py
│   │   │   ├── sessions.py
│   │   │   ├── attendance.py
│   │   │   └── admin.py
│   │   └── utils/
│   │       ├── security.py   # JWT, bcrypt, RBAC
│   │       ├── helpers.py    # Code/UUID generators
│   │       └── rate_limit.py
│   ├── alembic/              # Database migrations
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BarcodeScannerModal.tsx   # ZXing barcode scanner
│   │   │   ├── RollCallModal.tsx         # Enrolled student list + tick marking
│   │   │   ├── LiveAttendeesStream.tsx   # Real-time SSE attendee feed
│   │   │   ├── StartSessionModal.tsx
│   │   │   ├── QrScannerModal.tsx
│   │   │   └── ...
│   │   ├── pages/
│   │   │   ├── LecturerSessions.tsx
│   │   │   ├── LecturerDashboard.tsx
│   │   │   ├── StudentDashboard.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   └── ...
│   │   ├── store/
│   │   │   ├── sessionStore.ts   # Zustand session + SSE state
│   │   │   ├── authStore.ts
│   │   │   └── ...
│   │   └── lib/
│   │       └── apiClient.ts  # Axios with JWT interceptors
│   └── package.json
├── gateway/
│   └── nginx.conf            # Reverse proxy config
├── docker-compose.yml
└── .env.example
```

---

## Attendance Status Logic

| Status | Condition |
|---|---|
| `present` | Scanned within `QR_SCAN_WINDOW_MINUTES` of session start |
| `late` | Scanned after `QR_SCAN_WINDOW_MINUTES` but session still active |
| Manual / Roll Call | Always marked as `present` |

---

## Barcode Scanner Details

The scanner uses **ZXing (Zebra Crossing)** — the industry standard barcode library:
- Formats: **Code-128** (primary), **QR Code**, **Code-39**
- `TRY_HARDER` hint enabled for angled / partial barcodes
- `delayBetweenScanAttempts: 300ms` — efficient, low CPU usage
- Rear-facing camera preferred on mobile devices
- Native hardware `BarcodeDetector` API used where available

---

## License

MIT — see [LICENSE](LICENSE).
