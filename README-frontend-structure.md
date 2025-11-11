Frontend structure

Where to edit

- `app/users/...` — authoritative user-facing pages. Edit these to change the user experience.
- `app/admin/...` — authoritative admin/asielen pages. Edit these to change the admin experience.
- `components/` — shared UI components used by both users and admin. There are no `components/admin` wrappers; components are shared to avoid duplication.
- `app/(tabs)` — lightweight re-exports to `app/users/(tabs)` to keep a single source of truth for top-level user tabs. Edit `app/users/(tabs)` when changing user tab pages.

Auth & tokens

- Tokens are stored in Expo SecureStore keys:
  - Users: `userToken`, `user`, `userId`
  - Admin: `adminToken`, `admin`, `adminId`
- Use `app/lib/useAuth.ts` for small auth helpers (get token, logout flows).

API helper

- `app/lib/api.ts` centralizes requests and automatically injects the correct Authorization header based on `isAdmin` flag.
  - Usage examples:
    - api.get('/users/123')
    - api.post('/users', body)
    - api.patch('/asielen/123/home', payload, true) // `true` for admin requests
  - The helper knows the API base URL (`https://my-express-app-ne4l.onrender.com`) and sets `Content-Type: application/json` for JSON requests. For multipart/form-data (file upload) continue using `fetch(...)` directly so the boundary is set automatically.

Recommended developer workflow

1. Run a TypeScript typecheck and lint before refactoring: `npx tsc --noEmit && npx eslint "app/**/*.{ts,tsx}" --ext .ts,.tsx`.
2. When changing API calls, prefer the `api` helper for JSON endpoints to ensure consistent headers and base URL. Keep raw `fetch` for multipart/form-data uploads.
3. Edit pages under `app/users` or `app/admin` — the top-level `app/(tabs)` re-exports point at `app/users/(tabs)`.

Notes

- If you add new admin-only endpoints, pass the `isAdmin` boolean (third argument) to `api` methods so the admin token is used.
- Consider moving the API base URL to an environment variable if you deploy to other environments.
