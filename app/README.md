# Smart Scheduling System (Vanilla UI)

A modern, fully responsive web app for scheduling therapy sessions. Built with **HTML, CSS, and Vanilla JavaScript** (no React). Uses **Bootstrap 5** and **Bootstrap Icons** (CDN), **Google Font: Inter**, and custom CSS in `assets/css/styles.css`.

## Roles & access

| Role      | Access |
|-----------|--------|
| **ADMIN** | Dashboard, Manage Users, Manage Sessions, Schedules (view all), Settings |
| **THERAPIST** | Dashboard, My Schedule, My Availability, Settings |
| **CLIENT** | Dashboard, Therapist Directory, My Schedule, Settings |

- Not logged in → redirect to `login.html`.
- Logged in but opening a page not allowed for role → **Access Denied** section is shown and menu items are limited to allowed pages.

## Mock login

Use these credentials (see `assets/js/auth.js`):

- **Admin:** `admin@test.com` / `Admin123!`
- **Therapist:** `therapist@test.com` / `Therapist123!`
- **Client:** `client@test.com` / `Client123!`

Token, `userRole`, and `userId` are stored in `localStorage`.

## How to run

Serve the `app` folder over HTTP (required for `fetch` and clean routes). Examples:

- **VS Code:** “Live Server” extension, open `index.html`.
- **Node:** `npx serve app` or `npx http-server app -p 3000`.
- **Python:** `cd app && python3 -m http.server 8080`.

Then open `http://localhost:&lt;port&gt;/` (or the URL shown). Start from `index.html` or `login.html`.

## File structure

```
app/
├── index.html          # Landing
├── login.html
├── register.html
├── dashboard.html
├── my-schedule.html    # Role-based: therapist (sessions + availability) / client (bookings) / admin (all)
├── manage-users.html   # Admin only
├── manage-sessions.html # Admin only
├── therapist-directory.html # Client only
├── settings.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js      # Navigation, role checks, sidebar, topbar
│   │   ├── api.js      # API_BASE_URL = http://localhost:8080/api, fetch + mock fallback
│   │   ├── auth.js     # Mock login, localStorage
│   │   └── validators.js # Email, password, confirm password
│   └── images/
│       └── placeholders/
```

## Backend readiness

- **api.js** uses `API_BASE_URL = "http://localhost:8080/api"`, sends `Authorization: Bearer &lt;token&gt;`, and defines `login()`, `register()`, `getSessions()`, `getTherapists()`, `getUsers()`, `createAvailability()`, `bookSession()`, `updateSession()`, `cancelSession()`.
- If the API is unavailable or returns an error, the app falls back to mock data so the UI still works.

## Validation (validators.js)

- Email: valid format.
- Password: min 8 characters, 1 uppercase, 1 number.
- Confirm password: must match password.
- Errors are shown inline and submit is blocked until valid.

## Images

- Use local paths like `assets/images/hero.jpg`, `assets/images/therapist-1.jpg`.
- If an image is missing, the UI uses placeholder blocks/icons (e.g. therapist cards use an icon when no image URL).
