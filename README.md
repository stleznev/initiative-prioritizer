# Initiative Prioritizer

This project is a proof‑of‑concept implementation of a mobile‑first web app for pairwise
scoring and prioritisation of business initiatives. It uses Next.js 14 (App Router) and
Prisma with a PostgreSQL database. The UI is built with Tailwind CSS and supports both
Russian (`ru`) and English (`en`) locales.

> **Note**: This repository contains only a skeleton implementation. It demonstrates the
> basic structure and scaffolding required to implement the full specification, but it
> does not yet include all of the user‑flow or admin‑flow features. The remaining
> features can be added following the patterns established here.

## Getting started

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env` file in the project root and set the following variables:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require"
   ADMIN_TOKEN="your-admin-token"
   NEXT_PUBLIC_APP_NAME="Initiative Prioritizer"
   ```

3. **Prepare the database**

   Run Prisma migrations to set up the schema in your Postgres database:

   ```bash
   npx prisma migrate deploy
   ```

4. **Run the development server**

   ```bash
   npm run dev
   ```

   The app will be available at http://localhost:3000.

## Deployment

The project is designed to be deployed on Vercel. Ensure that the environment
variables (`DATABASE_URL`, `ADMIN_TOKEN`, etc.) are configured in the Vercel
dashboard. Use `npm run build` to build the app, followed by `npm start` to
serve it.

## License

This project is provided without any warranty. Use at your own risk.