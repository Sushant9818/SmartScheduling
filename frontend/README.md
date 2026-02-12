# Smart Scheduling System – Next.js Dashboard

Modern SaaS dashboard for the **Smart Scheduling System**, built with Next.js (App Router), TypeScript, Tailwind CSS, shadcn-style UI, and role-based access.

## Tech stack

- **Next.js** (latest) with App Router
- **TypeScript**
- **Tailwind CSS** (v4)
- **shadcn-style components** (Radix UI + Tailwind)
- **lucide-react** icons
- **recharts** for charts
- **react-hook-form** + **zod** for forms and validation
- **@tanstack/react-query** for API fetching and caching
- **sonner** for toasts

## Roles and access

| Role       | Access |
|-----------|--------|
| **ADMIN** | Dashboard, My Schedule, Admin Users, Admin Sessions, Settings |
| **THERAPIST** | Dashboard, My Schedule, Availability, Settings |
| **CLIENT** | Dashboard, My Schedule, Therapists (directory), Settings |

- Not logged in → redirect to `/login`.
- Logged in but opening a route not allowed for your role → redirect to `/access-denied`.
- Sidebar only shows links allowed for the current role.

## Install and run

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test accounts (mock login)

Use these credentials on `/login`:

| Role       | Email                | Password      |
|-----------|----------------------|---------------|
| Admin     | admin@test.com       | Admin123!     |
| Therapist | therapist@test.com   | Therapist123! |
| Client    | client@test.com      | Client123!    |

After login you are redirected to `/dashboard`. Sidebar and pages depend on the selected role.

## Backend connection setup

1. **Start the backend** (this repo uses **Node/Express** on port **5001** by default; for Spring Boot use port 8080).
   - Node: from `backend/` run `npm run dev` or `node src/server.js`; the server logs `Server running on <PORT>`.
   - Spring Boot: `mvn spring-boot:run` or `./gradlew bootRun` (typically port 8080).
2. **Configure the frontend** with the API base URL:
   - Copy `.env.example` to `.env.local`: `cp .env.example .env.local`
   - Set the correct base URL (include `/api`, no trailing slash):
     - Spring Boot: `NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api`
     - Node backend: `NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api`
   - The app reads this in `lib/config.ts`; `lib/http.ts` and `lib/api.ts` use that single source. If unset, the frontend falls back to `http://localhost:8080/api`.
3. **Health check:** Backend should expose `GET /api/health` returning `{ "status": "ok" }`. The dashboard header shows a **Backend Status** badge (Connected / Disconnected) using this endpoint.
4. **Auth:** JWT is sent in the `Authorization: Bearer <token>` header. On 401, the app clears auth and redirects to `/login`.
5. **Connection errors:** If the backend is not running or the port is wrong, the app shows a toast and uses mock data so the page does not crash.

## API base URL (legacy / override)

To change the API base URL without using env:

- **Environment:** set `NEXT_PUBLIC_API_BASE_URL` in `.env.local` (see above). The code uses this in `lib/config.ts`; `lib/http.ts` and `lib/api.ts` use that single source.
- Do not hardcode the URL in `lib/api.ts`; use `API_BASE_URL` from `lib/config.ts`.

If the API is down or returns an error, the app falls back to mock data from `lib/mockData.ts` so the UI still works.

## API contract (Spring Boot)

The frontend (`lib/api.ts`) is aligned with this backend contract:

- **Base:** `/api`, **Auth:** `Authorization: Bearer <JWT>`, **Roles:** ADMIN, THERAPIST, CLIENT.
- **Auth:** `POST /api/auth/register` (name, email, password, role), `POST /api/auth/login`, `GET /api/auth/me`.
- **Users (Admin):** `GET/POST /api/users`, `PATCH /api/users/{id}`, `POST /api/users/{id}/disable`, `.../enable`.
- **Therapists:** `GET /api/therapists` (q, specialty, minRating, page, size), `GET /api/therapists/{id}`.
- **Availability:** `GET/POST /api/availability` (therapistId filter for admin), `PATCH/DELETE /api/availability/{slotId}`. Body: therapistId, dayOfWeek (e.g. "MONDAY"), startTime, endTime, recurringWeekly.
- **Sessions:** `GET /api/sessions` (status, from, to, q; admin: therapistId, clientId). `POST /api/sessions` (therapistId, startAt, endAt, notes). `PATCH /api/sessions/{id}/reschedule`, `PATCH /api/sessions/{id}/status` (e.g. CONFIRMED, COMPLETED, CANCELLED).
- **Admin stats:** `GET /api/admin/stats/overview`, `GET /api/admin/stats/sessions-per-week?weeks=8`.
- **Optional:** `POST /api/matching/suggest-therapists`, `GET /api/therapists/{id}/available-slots?from=&to=&durationMinutes=`.

Backend enforces self-only (therapist/client see only their own sessions/availability).

## Date/time and timezones

- **Backend:** Stores `Instant` (UTC); transports ISO-8601 UTC with `Z` (e.g. `2026-02-10T18:00:00Z`). Session: `startAt`, `endAt`. Availability: `DayOfWeek` + `LocalTime` + timezone; slot generation converts to Instant at the edge.
- **Frontend:** Converts only at the edges:
  - **Display:** API `startAt`/`endAt` (Instant) → local time via `new Date(isoUtc)` and `formatInstantToLocal()` in `lib/datetime.ts`. Session list/table show date and time in the user’s local timezone.
  - **Send:** Local date/time from pickers → ISO-8601 UTC with `new Date(localDate + 'T' + localTime).toISOString()`. See `buildSessionTimes()` / `buildSessionTimesUTC()` in `lib/api.ts` and `lib/datetime.ts`.
- **Availability:** UI sends `dayOfWeek` (e.g. `"MONDAY"`), `startTime`/`endTime` (local time strings). Backend stores with timezone context and converts to Instant when generating bookable slots.

## Routes

| Route | Description |
|-------|-------------|
| `/` | Marketing landing |
| `/login` | Login (mock + API) |
| `/register` | Registration form |
| `/access-denied` | Shown when role cannot access a page |
| `/dashboard` | Role-based overview (KPIs, charts) |
| `/dashboard/my-schedule` | Sessions/bookings (role-specific actions) |
| `/dashboard/availability` | Therapist only – manage availability slots |
| `/dashboard/therapists` | Client only – therapist directory and book |
| `/dashboard/admin/users` | Admin only – users table and add/edit |
| `/dashboard/admin/sessions` | Admin only – sessions table and filters |
| `/dashboard/settings` | Profile, password, notifications (all roles) |

## Project structure

The app uses the **App Router** only. Routes live under `src/app/`. The previous Pages Router code is in `src/pages.disabled/` (not used).

```
frontend/
├── src/
│   └── app/                # App Router
│       ├── layout.tsx
│       ├── page.tsx        # Landing
│       ├── login/
│       ├── register/
│       ├── access-denied/
│       └── dashboard/
│           ├── layout.tsx  # Sidebar + navbar
│           ├── page.tsx
│           ├── my-schedule/
│           ├── availability/
│           ├── therapists/
│           ├── admin/users/
│           ├── admin/sessions/
│           └── settings/
├── components/
│   ├── ui/                 # Button, Card, Dialog, etc.
│   ├── SidebarNav.tsx
│   ├── RoleBadge.tsx
│   ├── KpiCard.tsx
│   ├── SessionTable.tsx
│   ├── SessionCardList.tsx
│   ├── ProtectedRoute.tsx
│   └── QueryProvider.tsx
├── context/
│   └── AuthProvider.tsx
├── lib/
│   ├── auth.ts             # Token, role, userId, userName (localStorage)
│   ├── api.ts              # API client + mock fallback
│   ├── mockData.ts
│   ├── roles.ts            # Nav items and canAccessRoute
│   └── utils.ts
└── README.md
```

## Build

```bash
npm run build
npm run start
```
