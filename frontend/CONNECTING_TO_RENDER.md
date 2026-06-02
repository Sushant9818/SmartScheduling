# Production: Vercel frontend → Render backend

## Vercel (required)

**Project → Settings → Environment Variables** (Production + Preview):

```bash
VITE_API_URL=https://YOUR-SERVICE.onrender.com/api
```

Alternative (same effect):

```bash
NEXT_PUBLIC_API_BASE_URL=https://YOUR-SERVICE.onrender.com/api
```

Redeploy after saving. Without this, the UI calls localhost and shows **Disconnected**.

## Render (required)

| Variable | Example |
|----------|---------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | `mongodb+srv://...` (Atlas, not localhost) |
| `JWT_SECRET` | long random string |
| `REFRESH_TOKEN_SECRET` | different long random string |
| `FRONTEND_URL` | `https://smart-scheduling-eta.vercel.app` |

Optional: `ALLOWED_ORIGINS` for trusted preview URLs (comma-separated).

CORS allows `localhost:3000`, `localhost:5173`, `FRONTEND_URL`, and any URLs explicitly listed in `ALLOWED_ORIGINS`.

## Verify

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
# {"status":"ok","message":"Smart Scheduling API is running"}

curl https://YOUR-SERVICE.onrender.com/
# {"status":"ok","message":"..."}
```

If Render returns **502**, check **Logs** (usually wrong/missing `MONGO_URI`).
