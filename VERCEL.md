# Vercel deployment

The Next.js app lives in **`frontend/`**. The repo root also has a legacy static `app/` folder (HTML) — do not deploy that as the main site.

## Recommended (simplest)

1. In [Vercel Project Settings](https://vercel.com/docs/projects/overview#project-settings) → **General** → **Root Directory**, set:
   ```
   frontend
   ```
2. **Framework Preset:** Next.js (auto-detected).
3. **Build Command:** `npm run build` (default).
4. **Environment variables** (Production):
   - `NEXT_PUBLIC_API_BASE_URL` = your API URL, e.g. `https://your-api.example.com/api`

Redeploy after changing Root Directory.

## Alternative (build from repo root)

If you keep the repository root as the Vercel root, the root `vercel.json` uses `@vercel/next` with `frontend/package.json`. Ensure `.vercelignore` excludes `app/` and `backend/`.

## 404 troubleshooting

| Symptom | Fix |
|--------|-----|
| All routes 404 | Set **Root Directory** to `frontend` |
| Home works, `/login` 404 | Wrong project (static `app/` folder); use `frontend` root |
| Build OK, API fails | Set `NEXT_PUBLIC_API_BASE_URL` in Vercel env vars |
