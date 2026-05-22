# Render deploy troubleshooting

Use this when the deploy **build succeeds** but the service **exits with status 1** on start.

## Quick fix (most common)

```bash
cd backend
npm run setup:render-env
```

1. Open **`backend/render.env`** (created for you).
2. Replace **`MONGO_URI`** with your [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) `mongodb+srv://...` string (see `ATLAS_QUICKSTART.md`).
3. [Render Dashboard](https://dashboard.render.com) → your web service → **Environment**.
4. **Add from .env** → upload `backend/render.env`.
5. **Save, rebuild, and deploy**.

---

## Error → fix

| Log message | Cause | Fix |
|-------------|--------|-----|
| `MONGO_URI points to localhost` | Local DB URL on Render | Set Atlas `mongodb+srv://...` in Environment; remove localhost |
| `MONGO_URI is not set` | No DB URL in Environment | Add `MONGO_URI` in Render |
| `JWT_SECRET must be set` / missing `JWT_SECRET` | Secrets not in Environment | Run `npm run setup:render-env` and import file |
| `MongoDB connection error` | Wrong Atlas password / IP blocked | Atlas → Network Access → `0.0.0.0/0`; fix password in URI |
| `JWT_SECRET` and `REFRESH_TOKEN_SECRET` must be different | Same value for both | Use two different random strings |
| Build OK, site 502 / timeout | App still crashing on start | Check **Logs** tab right after deploy |

---

## Required Render settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `backend` |
| **Build Command** | `npm install` (or `npm install; npm run build`) |
| **Start Command** | `npm start` |
| **Health Check Path** | `/api/health` |

## Required environment variables

| Variable | Required |
|----------|----------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | Atlas `mongodb+srv://...` |
| `JWT_SECRET` | Random 32+ chars |
| `REFRESH_TOKEN_SECRET` | Different random string |
| `FRONTEND_URL` | `https://smart-scheduling-eta.vercel.app` |

`PORT` is set by Render automatically.

---

## Verify deploy

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

Expected: `{"status":"ok"}`

Render **Logs** should show:

```
MongoDB Connected
API listening on port ...
```

---

## Connect Vercel frontend

Vercel → **smart-scheduling** → Environment:

```
NEXT_PUBLIC_API_BASE_URL=https://YOUR-SERVICE.onrender.com/api
```

Redeploy Vercel after saving.

---

## CLI push (optional)

If you have a [Render API key](https://dashboard.render.com/u/settings#api-keys):

```bash
export RENDER_API_KEY="rnd_..."
cd backend && npm run setup:render-env
# edit render.env → set MONGO_URI
../backend/scripts/push-render-env.sh backend/render.env
```

---

## Do not commit secrets

- `backend/.env` — local only (gitignored)
- `backend/render.env` — local only (gitignored)
- Never put secrets in `render.yaml` or GitHub
