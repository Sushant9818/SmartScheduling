# Render environment variables (fix deploy crashes)

After removing `backend/.env` from git, **all** values must be set in Render.

## Required variables

| Key | Example / how to get |
|-----|----------------------|
| `NODE_ENV` | `production` |
| `MONGO_URI` | `mongodb+srv://...` from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) — see `ATLAS_QUICKSTART.md` |
| `JWT_SECRET` | Random string (32+ chars) — generate below |
| `REFRESH_TOKEN_SECRET` | **Different** random string |
| `FRONTEND_URL` | `https://smart-scheduling-eta.vercel.app` |

Email (`EMAIL_*`) is optional unless you use password reset.

## Generate JWT secrets (terminal)

```bash
openssl rand -base64 48   # use for JWT_SECRET
openssl rand -base64 48   # use for REFRESH_TOKEN_SECRET (must differ)
```

Or:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Add in Render (fastest)

1. https://dashboard.render.com → **smart-scheduling-api** (or your service name)
2. **Environment** → add each key/value above
3. **Save, rebuild, and deploy**

### Bulk import

```bash
cp backend/render.env.example backend/render.env
# Edit render.env — set MONGO_URI, JWT_SECRET, REFRESH_TOKEN_SECRET
```

Render → Environment → **Add from .env** → upload `backend/render.env`

## Success logs

```
MongoDB Connected
API listening on port ...
```
