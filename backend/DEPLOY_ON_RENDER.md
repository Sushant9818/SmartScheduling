# Deploy backend on Render

Repo: **https://github.com/Sushant9818/SmartScheduling**  
API folder: **`backend/`**

---

## Before you start

1. **MongoDB Atlas** (free): [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)  
   - Cluster → **Connect** → **Drivers** → copy `mongodb+srv://...`  
   - **Network Access** → allow `0.0.0.0/0`  
   - See `ATLAS_QUICKSTART.md`

2. **Generate Render env file** (on your Mac):

```bash
cd backend
npm run setup:render-env
```

Edit **`render.env`** → set **`MONGO_URI`** to your Atlas string (JWT secrets are already generated).

---

## Option A — New Web Service (recommended)

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New +** → **Web Service**
2. Connect **GitHub** → repo **SmartScheduling**
3. Settings:

| Field | Value |
|-------|--------|
| **Name** | `smart-scheduling-api` |
| **Region** | Oregon (or nearest) |
| **Branch** | `main` |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance type** | Free |

4. **Advanced** → **Health Check Path**: `/api/health`

5. **Environment** → **Add from .env** → upload `backend/render.env`

6. **Create Web Service** (or **Save** if editing existing)

7. Wait for deploy. **Logs** should show:
   ```
   MongoDB Connected
   API listening on port ...
   ```

8. Copy your URL, e.g. `https://smart-scheduling-api.onrender.com`

9. Test:
   ```bash
   curl https://smart-scheduling-api.onrender.com/api/health
   ```

---

## Option B — Blueprint (`render.yaml`)

1. **New +** → **Blueprint**
2. Select repo **SmartScheduling**
3. Render reads root `render.yaml` (root dir `backend`, auto JWT secrets)
4. When prompted, enter **`MONGO_URI`** (Atlas)
5. Deploy

---

## Connect Vercel frontend

Vercel → project **smart-scheduling** → **Environment**:

```
NEXT_PUBLIC_API_BASE_URL=https://YOUR-SERVICE.onrender.com/api
```

Redeploy Vercel. Production site: https://smart-scheduling-eta.vercel.app

---

## If deploy fails

See **`TROUBLESHOOTING_DEPLOY.md`**.

Common fix: Environment missing vars → `npm run setup:render-env` → **Add from .env** on Render.

---

## Optional: push env via CLI

```bash
export RENDER_API_KEY="rnd_..."   # from Render Account Settings → API Keys
./backend/scripts/push-render-env.sh backend/render.env
```
