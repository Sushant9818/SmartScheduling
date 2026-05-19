# Vercel deployment

The Next.js app lives in **`frontend/`**. The repo root also has a legacy static `app/` folder (HTML) — do not deploy that as the main site.

## Required: Root Directory = `frontend`

1. [Vercel Project Settings](https://vercel.com/sushant9818s-projects/smart-scheduling/settings) → **General** → **Root Directory** → set to `frontend` and save.
2. **Framework Preset:** Next.js (auto-detected).
3. **Build Command:** `npm run build` (default).
4. **Environment variables** (Production):
   - `NEXT_PUBLIC_API_BASE_URL` = your API URL, e.g. `https://your-api.example.com/api`

Do **not** use a root-level legacy `vercel.json` with `builds` — it deploys only a `/404` page. The Next.js app lives in `frontend/src/app/`.

Redeploy after changing Root Directory (push to `main` or `cd frontend && vercel deploy --prod`).

## Project link

- Vercel project: **smart-scheduling** (`prj_ASyBdrqARMtSIL1ULuK7SEaAPtvu`)
- Production URL: https://smart-scheduling-eta.vercel.app
- CLI link files: `frontend/.vercel/project.json` and `.vercel/project.json`

Duplicate projects (**smart-scheduling-baxq**, **smart-scheduling-cmhs**) can be removed in the Vercel dashboard to avoid confusion.

## 404 troubleshooting

| Symptom | Fix |
|--------|-----|
| All routes 404 | Set **Root Directory** to `frontend` |
| Home works, `/login` 404 | Wrong project (static `app/` folder); use `frontend` root |
| Build OK, API fails | Set `NEXT_PUBLIC_API_BASE_URL` in Vercel env vars |
