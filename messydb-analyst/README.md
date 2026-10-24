# MessyIQ Education Dashboard

MessyIQ is a read-only education dashboard and analyst backed by Supabase and Groq. The overview reports student counts by cohort, program, and latest academic status, plus completion and support indicators. The analyst answers questions about admissions, retention, leave and withdrawal reasons, at-risk signals, and graduation.

## Included data

The migration creates 120 synthetic student profiles, their admission-to-graduation events, and `education_student_overview` with each student's latest status. No real student data is included.

## 1. Create Supabase project

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**.
3. Run `supabase/migrations/202610250001_education_analyst.sql` once.
4. Confirm 120 rows in `education_students`.

## 2. Configure server environment

Copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Set:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile
```

Get the Supabase values from **Project Settings > API**. Keep the service-role key server-only and never use a `NEXT_PUBLIC_` prefix. Create the Groq key at https://console.groq.com and choose a model available to your account.

You only need to set these values in the local `messydb-analyst/.env.local` file:

- `SUPABASE_URL`: your Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: the service-role key for the server-side read-only connection used by this demo. Never paste this key into chat, browser code, screenshots, or source control.
- `GROQ_API_KEY`: optional for the dashboard; required for AI-written explanations. Verified metrics and summaries continue to work if Groq is unavailable or over quota.
- `GROQ_MODEL`: a model enabled for your Groq account.

Restart the Next.js development server after changing `.env.local`. The app reads the approved `education_student_overview` view on the server and only returns aggregate dashboard data to the browser. Do not share any credential values to connect the project; add them locally instead.

## 3. Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000.

The dashboard API is `GET /api/dashboard`; analyst questions are sent to `POST /api/analyst`. If Supabase is not configured, the app explicitly labels its synthetic sample data. A Groq quota/provider error is logged on the server and the analyst displays the verified deterministic summary instead of failing the analysis.

Example questions:

- "How many students are active by program?"
- "Who left and what were the main reasons?"
- "Which students need retention support?"
- "How many students graduated by cohort?"

## Safety

Unsafe or abusive language is rejected before data access. Groq receives only verified aggregates, not raw student records. The app reads one approved view and accepts no free-form SQL.

For production, authenticate users and use Supabase RLS. Replace synthetic records with authorized data only.

## Validate

```powershell
npm run lint
npm run build
npm run start -- -p 3100
```
