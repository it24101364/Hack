# Student Care

Student Complaint Management System with a React frontend and Express/MongoDB backend.

## Structure

- `frontend/` contains the React, Vite, Tailwind, pages, styles, and client configuration.
- `backend/` contains the Express routes, Mongoose models, middleware, scripts, and server configuration.

## Run locally

1. Start MongoDB locally, or set `MONGODB_URI` to a hosted MongoDB connection.
2. Copy `backend/.env.example` to `backend/.env` and set a private `JWT_SECRET`.
3. From the project root, install all workspace dependencies:

   ```sh
   npm install
   ```

4. Start the API:

   ```sh
   npm run backend
   ```

5. In another terminal, start the client:

   ```sh
   npm run frontend
   ```

To promote an existing registered user to administrator, run `cd backend && npm run make-admin -- user@example.com`.

To create the default local administrator, run `cd backend && npm run seed-admin`. It creates `admin@studentcare.local` with password `Admin@12345`; set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME`, and `ADMIN_STUDENT_ID` in `backend/.env` before running it to use different credentials.

The API runs on port `5001` by default and exposes protected student complaint and admin management endpoints, including `GET /api/admin/dashboard`, `GET /api/admin/complaints`, and the status/response PATCH endpoints.

## Deploy

Production URLs:

- Frontend: https://hack-frontend-d3kjjm935-czonelanka-9521.vercel.app
- Backend: https://hack-b1n4.onrender.com
- Health check: https://hack-b1n4.onrender.com/api/health

Set these deployment environment variables before redeploying:

- Vercel: `VITE_API_URL=https://hack-b1n4.onrender.com/api`
- Render: `CLIENT_URL=https://hack-frontend-d3kjjm935-czonelanka-9521.vercel.app`

Do not add a trailing slash to either value. Vite environment changes require a new frontend deployment, and backend CORS changes require a new Render deployment.