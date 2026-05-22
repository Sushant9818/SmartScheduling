# Fix `MONGO_URI points to localhost` on Render (5 minutes)

Render **cannot** run `mongodb://localhost:27017`. You need **MongoDB Atlas** (free).

**Common cause:** `backend/.env` was committed to GitHub with a localhost URL. Render loaded that file on deploy. The repo no longer tracks `backend/.env`; set `MONGO_URI` in the **Render Dashboard** (see step 5).

## Step 1 — Atlas cluster

1. Go to https://www.mongodb.com/cloud/atlas/register
2. Create a **free M0** cluster (any cloud/region).
3. Wait until status is **Active**.

## Step 2 — Database user

1. **Security → Database Access → Add New Database User**
2. Username + password (save the password).
3. Built-in role: **Atlas admin** or **readWriteAnyDatabase** (dev).

## Step 3 — Network access

1. **Security → Network Access → Add IP Address**
2. **Allow Access from Anywhere** (`0.0.0.0/0`)  
   (Required so Render’s servers can connect.)

## Step 4 — Connection string

1. **Database → Connect → Drivers**
2. Copy the string, e.g.:

```
mongodb+srv://myuser:<password>@cluster0.abcd123.mongodb.net/?retryWrites=true&w=majority
```

3. Replace `<password>` with your real password.  
   If the password has `@`, `#`, `:`, etc., [URL-encode](https://www.urlencoder.org/) it.
4. Add a database name before `?` if missing:

```
mongodb+srv://myuser:PASSWORD@cluster0.abcd123.mongodb.net/smart-scheduling?retryWrites=true&w=majority
```

## Step 5 — Paste into Render

1. Open https://dashboard.render.com
2. Your service → **Environment**
3. Find **`MONGO_URI`**:
   - **Delete** `mongodb://localhost:27017/...` if present
   - **Add / Edit** → paste your `mongodb+srv://...` string
4. Click **Save, rebuild, and deploy** (or **Save and deploy**).

## Step 6 — Verify

Logs should show:

```
MongoDB Connected
API listening on port ...
```

Test:

```bash
curl https://YOUR-SERVICE.onrender.com/api/health
```

---

### Optional: import from file

1. Copy `render.env.example` → `render.env` (do not commit `render.env`)
2. Fill in `MONGO_URI` and secrets
3. Render → Environment → **Add from .env** → upload `render.env`

### Optional: CLI (if you have `RENDER_API_KEY`)

```bash
export RENDER_API_KEY="rnd_..."
export RENDER_SERVICE_ID="srv_..."   # from Render service URL/settings
./backend/scripts/set-render-mongo-uri.sh 'mongodb+srv://user:pass@cluster.../smart-scheduling?retryWrites=true&w=majority'
```
