# Smart Scheduling – Run & verify

## Crash fix (missing export)

- **Issue:** `adminRoutes.js` imported `listAvailability` from `availabilityController.js`, which only exported `getAvailability`, etc.
- **Fix:** `availabilityController.js` now exports `listAvailability = getAvailability` (alias) and `listAllAvailability` (admin: list all slots). `adminRoutes.js` imports `getAvailability`, `createAvailability`, `updateAvailability`, `deleteAvailability`, `listAllAvailability` and uses them for `/api/admin/availability` (GET all or `?therapistId=`, POST, PATCH, DELETE).

## 1. Backend

```bash
cd backend
npm install
# Ensure .env has: PORT=5001, MONGO_URI, JWT_SECRET, REFRESH_TOKEN_SECRET (all required)
node src/server.js
```

- API: `http://localhost:5001`
- Health: `curl http://localhost:5001/api/health` → `{"status":"ok"}`

## 2. Create first admin (dev-only)

```bash
cd backend
node src/seed/createAdmin.js
```

- If no admin exists: **Admin created** (email: `admin@smart.com`, password: `Admin@123`).
- If one exists: **Admin already exists**.

## 3. Frontend

```bash
cd frontend
npm install
# Optional .env.local: NEXT_PUBLIC_API_BASE_URL=http://localhost:5001/api
# Do NOT set NEXT_PUBLIC_USE_MOCK_AUTH so real backend auth is used
npm run dev
```

- App: `http://localhost:3000`

## 4. Login as admin and check dashboard

1. Open `http://localhost:3000/login`.
2. Sign in: **admin@smart.com** / **Admin@123**.
3. You should land on the dashboard.
4. As admin you can:
   - See **Dashboard** (overview stats and sessions per week from `/api/admin/stats/*`).
   - Open **Users** (list from `/api/admin/users`).
   - Open **Sessions** (list from `/api/sessions`, update status via `/api/sessions/:id/status`).
   - Use **Auth Debug** (`/dashboard/auth-debug`) to confirm token and refresh cookie.

## 5. Auth and cookies

- **Access token**: Sent in `Authorization: Bearer <token>` (from AuthProvider state).
- **Refresh token**: httpOnly cookie set by backend on login/refresh; browser sends it when `credentials: "include"` is used.
- **401 handling**: Backend returns `code: "NO_AUTH"` (missing header), `"TOKEN_EXPIRED"` (expired JWT), or `"TOKEN_INVALID"`. Only `TOKEN_EXPIRED` triggers a single refresh + retry in `http.ts`; others redirect to login.

## 6. Admin API routes (all require auth + role admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/admin/stats/overview | Overview stats |
| GET | /api/admin/stats/sessions-per-week?weeks=8 | Sessions per week |
| GET | /api/admin/users | List users |
| GET | /api/admin/therapists | List therapists |
| POST | /api/admin/therapists | Create therapist + user |
| PATCH | /api/admin/therapists/:id | Update therapist |
| DELETE | /api/admin/therapists/:id | Delete therapist |
| GET | /api/admin/clients | List clients |
| POST | /api/admin/clients | Create client |
| PATCH | /api/admin/clients/:id | Update client |
| DELETE | /api/admin/clients/:id | Delete client |
| GET | /api/admin/sessions | List sessions |
| POST | /api/admin/sessions | Create session (therapistId, clientId, start, end) |
| PATCH | /api/admin/sessions/:id/reschedule | Reschedule |
| PATCH | /api/admin/sessions/:id/status | Update status (scheduled/cancelled/completed) |
| DELETE | /api/admin/sessions/:id | Delete session |
| GET | /api/admin/availability | List all availability (or ?therapistId= for one) |
| POST | /api/admin/availability | Create slot (body: therapistId, dayOfWeek, startTime, endTime) |
| PATCH | /api/admin/availability/:id | Update slot |
| DELETE | /api/admin/availability/:id | Delete slot |

## 7. Fix 401 / refresh cookie

- **CORS**: Backend must use `origin: "http://localhost:3000"` and `credentials: true` (not `"*"`). See `backend/src/app.js`.
- **Cookie**: Login response must set `refreshToken` with `httpOnly: true`, `sameSite: "lax"`, `secure: false`, `path: "/"`. See `authController.setRefreshCookie`.
- **Frontend**: All fetch calls use `credentials: "include"` (handled in `lib/http.ts`). After login, check DevTools → Application → Cookies → `http://localhost:5001` for `refreshToken`.
- **Refresh**: `POST /api/auth/refresh` must receive `Cookie: refreshToken=...`; ensure the request is to the same origin (e.g. `http://localhost:5001`) so the browser sends the cookie.

## 8. Curl / Postman examples

**Login (get access token):**
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@smart.com","password":"Admin@123"}' \
  -c cookies.txt -b cookies.txt -v
```
Use `-c cookies.txt -b cookies.txt` to save/use cookies (refreshToken). Copy the `token` from the JSON body for `Authorization: Bearer <token>`.

**Admin list users:**
```bash
curl -X GET "http://localhost:5001/api/admin/users" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Admin list availability (all):**
```bash
curl -X GET "http://localhost:5001/api/admin/availability" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b cookies.txt
```

**Admin create availability:**
```bash
curl -X POST "http://localhost:5001/api/admin/availability" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"therapistId":"THERAPIST_OBJECT_ID","dayOfWeek":"MONDAY","startTime":"09:00","endTime":"17:00"}' \
  -b cookies.txt
```

## 9. Client scheduling (book & reschedule)

- **GET /api/sessions** – Returns sessions by role: client = own only, therapist = own only, admin = all. Populated therapist/client names.
- **POST /api/sessions/book** – **Client only.** Body: `therapistId`, `startAt`, `endAt` (ISO), optional `notes`. Backend uses `req.user.clientId` (ignores clientId from body). Validates therapist exists, time within therapist availability for that weekday, no conflict (client + therapist). Creates status `scheduled`.
- **PATCH /api/sessions/:id/reschedule** – Client can reschedule only own session. Body: `startAt`, `endAt` (or `newStart`/`newEnd`). Same availability + conflict checks.
- **PATCH /api/sessions/:id/status** – Client may set only `cancelled` on own; therapist may confirm/complete own; admin any.
- **GET /api/availability?therapistId=...** – Requires auth (client/therapist/admin). Returns slots for that therapist (clients use this to see available times when booking).

**Login as client** (after creating a client user and linking to a Client document):
```bash
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"client@example.com","password":"ClientPass1"}' \
  -c cookies.txt -b cookies.txt
```
Save the `token` from the response as `CLIENT_TOKEN`.

**List my sessions (client):**
```bash
curl -X GET "http://localhost:5001/api/sessions" \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -b cookies.txt
```

**Get therapist availability (for booking):**
```bash
curl -X GET "http://localhost:5001/api/availability?therapistId=THERAPIST_OBJECT_ID" \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -b cookies.txt
```

**Book a session (client only):**
```bash
# startAt/endAt must be ISO (e.g. UTC). Time must fall within therapist availability for that weekday.
curl -X POST "http://localhost:5001/api/sessions/book" \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"therapistId":"THERAPIST_OBJECT_ID","startAt":"2026-02-09T14:00:00.000Z","endAt":"2026-02-09T14:30:00.000Z","notes":"First session"}' \
  -b cookies.txt
```

**Reschedule a session (client, own session only):**
```bash
curl -X PATCH "http://localhost:5001/api/sessions/SESSION_ID/reschedule" \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"startAt":"2026-02-10T15:00:00.000Z","endAt":"2026-02-10T15:30:00.000Z"}' \
  -b cookies.txt
```

**Cancel a session (client, own only):**
```bash
curl -X PATCH "http://localhost:5001/api/sessions/SESSION_ID/status" \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}' \
  -b cookies.txt
```
