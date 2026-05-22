# Deploy backend on Render

Frontend: **Vercel** (`frontend/`) — https://smart-scheduling-eta.vercel.app  
API: **Render** (`backend/`) — use `render.yaml` or create a **Web Service** manually.

**Deploy failing on start?** → [`backend/TROUBLESHOOTING_DEPLOY.md`](backend/TROUBLESHOOTING_DEPLOY.md)  
**One command:** `cd backend && npm run setup:render-env` → edit `MONGO_URI` → Render → **Add from .env**

## Quick fix checklist (common Render failures)

| Issue | Fix |
|--------|-----|
| Build fails / wrong app | **Root Directory** = `backend` |
| Crash on start | Set `MONGO_URI` (MongoDB Atlas), `JWT_SECRET`, `REFRESH_TOKEN_SECRET` |
| `JWT_SECRET must be set` | Add secrets in Render → Environment |
| MongoDB connection error | Use Atlas connection string; allow `0.0.0.0/0` or Render IPs |
| Login works locally, fails in prod | Set `FRONTEND_URL=https://smart-scheduling-eta.vercel.app` |
| CORS error in browser | Same `FRONTEND_URL`; optional `ALLOWED_ORIGINS` for preview URLs |
| Cookies / refresh fail | Frontend `NEXT_PUBLIC_API_BASE_URL` must be `https://<api>.onrender.com/api` |

## 1. MongoDB Atlas (required — fixes `ECONNREFUSED 127.0.0.1:27017`)

Render has **no** local MongoDB. If `MONGO_URI` is missing or `mongodb://localhost:27017/...`, the app will crash.

1. [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) → **Create** free cluster (M0).
2. **Database Access** → add user + password (save the password).
3. **Network Access** → **Add IP Address** → **Allow Access from Anywhere** (`0.0.0.0/0`) for Render.
4. **Database** → **Connect** → **Drivers** → copy the connection string, e.g.  
   `mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/smart-scheduling?retryWrites=true&w=majority`
5. Replace `<password>` with your real password (URL-encode special characters).

### Set on Render (critical)

**Dashboard → your Web Service → Environment → Add:**

| Key | Value |
|-----|--------|
| `MONGO_URI` | Your full `mongodb+srv://...` string (not localhost) |

Remove any `MONGO_URI` that says `localhost` or `127.0.0.1`. **Save** → **Manual Deploy**.

## 2. Render Web Service

**Option A — Blueprint**

1. Render Dashboard → **New** → **Blueprint**
2. Connect repo `Sushant9818/SmartScheduling`
3. Apply `render.yaml` from repo root
4. Fill `MONGO_URI` and email vars when prompted

**Option B — Manual**

| Setting | Value |
|---------|--------|
| Root Directory | `backend` |
| Runtime | Node |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/api/health` |

## 3. Environment variables (Render)

| Variable | Example / notes |
|----------|------------------|
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://smart-scheduling-eta.vercel.app` |
| `MONGO_URI` | `mongodb+srv://...` (Atlas) |
| `JWT_SECRET` | Long random string (≠ refresh secret) |
| `REFRESH_TOKEN_SECRET` | Different long random string |
| `ALLOWED_ORIGINS` | Optional: `https://preview-url.vercel.app` |
| `EMAIL_*` | Optional; for password reset emails |

`PORT` is set automatically by Render — do not override.

## 4. Vercel frontend

In Vercel → **smart-scheduling** → Environment Variables:

```
NEXT_PUBLIC_API_BASE_URL=https://smart-scheduling-api.onrender.com/api
```

(Use your actual Render service URL from the dashboard.)

Redeploy Vercel after changing env.

## 5. Verify

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
# {"status":"ok"}
```

Then open https://smart-scheduling-eta.vercel.app/login and register/login.

## Render MCP (Cursor)

Set `RENDER_API_KEY` in `~/.zshrc`, restart Cursor. See `.cursor/RENDER_MCP.md`.
