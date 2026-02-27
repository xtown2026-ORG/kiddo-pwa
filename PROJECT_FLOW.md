# PWA Kiddo - Full Project Flow

## 1. Project Overview

`pwa-kiddo` is a React + Vite Progressive Web App with role-based experiences for:

- `student`
- `teacher`
- `parent`

Core stack:

- React 19
- React Router
- MUI
- Axios
- `vite-plugin-pwa` (service worker + manifest)
- Socket.io client (quiz/group real-time features)


## 2. Boot Flow (App Startup)

Entry path:

1. `src/main.jsx`
2. `src/app/App.jsx`

`src/main.jsx` initializes:

- `ThemeProvider`
- `AuthProvider`
- `BrowserRouter`
- `registerServiceWorker()`

So all pages run inside theme + auth context + router.


## 3. Environment and API Base

Config source:

- `.env`
- `src/api/config.js`
- `vite.config.js` proxy

Key behavior:

- `VITE_API_BASE_URL=/api` (frontend uses relative base URL)
- Vite dev proxy forwards `/api` to `VITE_LOCAL_API_TARGET` (default `http://127.0.0.1:3002`)

This means browser calls `http://localhost:5174/api/...`, and Vite forwards to backend.


## 4. Authentication Flow

Main auth logic:

- `src/auth/AuthProvider.jsx`
- `src/api/auth.api.js`
- `src/modules/login/useLogin.jsx`

### Login

1. `LoginForm` -> `useLogin.handleLogin()`
2. Calls `loginApi("/auth/login")`
3. Expects `{ token }`
4. `AuthProvider.login(token)` validates and stores token in `localStorage`
5. Decodes JWT with `jwt-decode` and sets `user`

### Session restore

On app refresh:

1. `AuthProvider` reads token from `localStorage`
2. Validates token shape + expiry
3. Restores `user` from token payload

### Profile hydration

After token is active, provider fetches role profile:

- student -> `/students/me`
- teacher -> fallback chain:
  - `/teachers/me`
  - `/teachers/profile`
  - `/teacher/me`
- parent -> `/parents/parents/profile`

and merges `name/phone/email/avatar` into auth user state.

### Logout

- Local logout always clears token/user
- server logout API is currently placeholder


## 5. Route Protection and Access Control

Top-level router:

- `src/app/App.jsx`

Guards:

- `RequireAuth`: must be logged in
- `RequireRole`: role must match route
- `ForceProfileCompletion`: redirects first-login users
- `RequireApproval`: redirects non-approved users to `/approval-pending`

Flow:

1. `/login` is public
2. `/student/*`, `/teacher/*`, `/parent/*` are protected by all guards
3. `/unauthorized` is protected
4. unknown path redirects authenticated user to role home


## 6. Role App Shells

### Student app

File: `src/pages/StudentApp.jsx`

Contains lazy routes:

- dashboard, profile, timetable, attendance, diary, notifications
- report cards
- group chat
- ai-chat, voice-chat
- quiz flows
- themes

### Teacher app

File: `src/pages/TeacherApp.jsx`

Contains lazy routes:

- dashboard, profile, timetable, diary, notifications
- class sessions
- approvals
- exams/create
- assigned classes
- report card entry
- AI tools
- group chat
- quiz multiplayer pages
- themes

### Parent app

File: `src/pages/ParentApp.jsx`

Contains routes:

- dashboard, profile, timetable, attendance, diary, notifications
- report card detail
- group chat
- themes


## 7. API Layer and Request Lifecycle

Files:

- `src/api/axios.js`
- `src/api/axios.interceptors.js`
- `src/api/config.js`

Behavior:

1. Axios instance created with `baseURL` + timeout
2. Request timestamp metadata added
3. Request/response logs printed in dev
4. Auth interceptor injects `Authorization: Bearer <token>`
5. Token expiry checked before request
6. Retry policy for retryable failures
7. On `401`: logout
8. On `403 Forbidden role`: one-time redirect to `/unauthorized`


## 8. Main Feature Modules (High-Level)

API files are under `src/modules/**/**.api.js`.

Primary modules:

- Dashboard: `/students|teachers|parents/dashboard`
- Timetable: section and teacher timetable endpoints
- Attendance: role-specific summaries + teacher marking endpoints
- Diary/Homework: CRUD and analytics endpoints
- Notifications: create/list/acknowledge
- Group chat: groups + messages + delete
- Profile: get/update role-specific profile
- Report card: student list/detail + teacher entry
- Teacher class sessions: start/end/list + attendance marking
- Approvals: pending list + approve/reject flows
- AI chat/tools: `/rag/ask`, `/teacher/ai`
- Quiz: single/multi quiz endpoints + leaderboard/history


## 9. First Login and Approval Flow

First login page:

- `src/pages/FirstLoginPage.jsx`

Steps:

1. Detect `user.first_login === true`
2. Collect role-specific profile fields
3. Optional avatar upload through `cloudStorageService`
4. Submit via `completeProfileApi`
5. If backend returns new token, replace session with `login(newToken)`
6. Navigate to `/`

Approval gate:

- `RequireApproval` fetches profile and checks `approval_status`
- non-approved users are redirected to `ApprovalPending`
- page supports re-check and logout


## 10. File Upload/Cloud Storage Flow

Main file:

- `src/services/cloudStorage.js`

Design:

- pluggable provider interface (`StorageProvider`)
- current default provider: `base64`
- optional provider: S3 + CloudFront (via backend upload endpoint)
- Cloudinary provider stub exists but not implemented

Profile upload path:

1. `profile.api.uploadProfilePicture(file, userId)`
2. image validate/compress via `utils/imageUtils`
3. upload via cloud storage service
4. URL stored in profile payload


## 11. PWA Flow

PWA config:

- `vite.config.js` with `VitePWA`
- `public/manifest.json`
- `src/pwa/serviceWorker.js`

Capabilities:

- installable manifest
- service worker registration
- update prompt (`onNeedRefresh`)
- offline-ready event
- cache management helpers


## 12. Offline and Online Behavior

- `useOnlineStatus` in app root shows `OfflinePage` when offline
- service worker helper emits notifications for online/offline events
- offline manager supports pending request queue abstraction


## 13. Realtime/Interactive Features

- Socket-based quiz/group-chat support exists in quiz/group-chat modules
- Voice/speech and 3D robot helpers are present (`src/speech`, `src/three`)
- some helper files are minimal placeholders and can be expanded


## 14. Current Known Integration Dependency

Frontend is role-guarded, but final authorization is backend-driven.

If backend returns `403 Forbidden role` on teacher endpoints:

- frontend now redirects to `/unauthorized`
- permanent fix must be backend role normalization + route guard mapping + fresh login tokens


## 15. End-to-End Flow Summary

1. App boots -> providers + router + service worker
2. Auth restores token -> decodes user
3. App routes user by role
4. Guards enforce login, role, profile completion, approval
5. Feature pages call module APIs through shared axios instance
6. Interceptors handle auth headers, retries, and auth/role errors
7. PWA layer handles caching, updates, and offline behavior


## 16. How to Convert This to PDF

If you want PDF, easiest options:

1. Open `PROJECT_FLOW.md` in VS Code and print to PDF
2. Use `pandoc`:

```bash
pandoc PROJECT_FLOW.md -o PROJECT_FLOW.pdf
```

