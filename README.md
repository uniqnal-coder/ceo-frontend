# CEO Frontend

React + Vite admin dashboard for the CEO School Management System. Talks to the
backend REST API (see `../ceo-backend`).

## Stack
- React 19 + React Router 7
- Vite 8 + Tailwind CSS 4
- Vitest + Testing Library
- Central API client with JWT auth (no direct DB access)

## Getting started
```bash
npm install
cp .env.example .env      # set VITE_API_URL
npm run dev               # http://localhost:5173
```

## Scripts
| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | ESLint |
| `npm test` | Run unit tests (Vitest) |

## Configuration
| Env var | Description |
| --- | --- |
| `VITE_API_URL` | Base URL of the backend API (e.g. `http://localhost:3000`) |

## Structure
```
src/
  api/client.js           Central fetch wrapper (auth, 401 redirect, errors)
  context/AuthContext.jsx Session state (login/logout, token storage)
  components/Layout.jsx    Sidebar + header shell (protected)
  components/ProtectedRoute.jsx
  pages/                   One screen per route (Students, Staff, Fees, Tasks,
                           Attendance, Feedback, Salary, Biometry, Evaluations)
  styles/page.js           Shared inline styles
  utils/                   toast + validation helpers
```

## Deployment
Static build. For SPA routing on Render/Netlify, `public/_redirects` rewrites all
paths to `index.html`. Set `VITE_API_URL` in the host environment.
