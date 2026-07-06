# Changelog

## v2.0.0 — Rebuild & modernization

The app previously **did not build** (missing files + missing deps). This release
makes it build and run, routes all data through the hardened backend REST API,
and modernizes the toolchain.

### 🐛 Critical fixes (app was broken)
- **Missing `src/config/supabaseClient.js`** — 6 components imported it; it never
  existed, so the build failed. Those components now use the backend REST API and
  the file is no longer needed.
- **`Dashboard.jsx` imported `./components/Students|Staff|Fees`** which live in
  `src/pages/` — broken imports. Replaced by a router-driven layout.
- **Case-sensitive import bug** — `App.jsx` imported `./Login` while the file was
  `login.jsx`; worked on macOS, **broke on Linux/Render builds**. Fixed via a
  proper `src/pages/Login.jsx`.
- **Missing dependencies** used in code: `axios`, `@fortawesome/fontawesome-free`,
  Tailwind CSS. Resolved (axios dropped; FontAwesome + Tailwind installed).

### 🔐 Security
- Removed hardcoded demo credentials from the login screen.
- Removed direct browser→Supabase access (which would have required exposing DB
  keys). All data now flows through the authenticated backend API.

### 🏗️ Architecture
- **Central API client** (`src/api/client.js`): `VITE_API_URL` base, bearer-token
  injection, JSON handling, typed errors, and automatic logout + redirect on 401.
- **React Router 7**: real routes, a protected layout shell (`Layout`), and
  `ProtectedRoute` guards instead of manual conditional rendering.
- **Auth context** (`src/context/AuthContext.jsx`): single source of truth for the
  session; adopts the backend's access/refresh token response.
- **Env-based config** — the backend URL is no longer hardcoded in 19 places.
- All 9 resource screens (Students, Staff, Fees, Tasks, Attendance, Feedback,
  Salary, Biometry, Evaluations) use the API client; admin-only screens degrade
  gracefully on 403.

### ⬆️ Toolchain
- Switched from the experimental `rolldown-vite` fork to **standard Vite 8**.
- Added **Tailwind CSS 4** (via `@tailwindcss/vite`) so existing utility classes
  render.
- Added **Vitest 4** + Testing Library with a small unit-test suite.
- ESLint passes clean; production build succeeds.

### 🧹 Cleanup
- Deleted dead files: `Dashboard.jsx`, `Dashboard-Updated.jsx` (duplicate),
  `login.jsx`, `App.css`, `New Text Document.txt`, `IntegrationTest.jsx`,
  unused `LoadingSkeleton.jsx`, and the 6 old Supabase components.

### ⚠️ Notes
- `Fees` was realigned to the backend contract (`student_id`, `paid`, `reminder`,
  `date`) so it actually persists. The richer fields (due dates, payment methods)
  would require extending the backend `fees` schema.
- For static hosting (Render/Netlify), `public/_redirects` provides SPA fallback.
- Set `VITE_API_URL` in the host's env (see `.env.example`).
