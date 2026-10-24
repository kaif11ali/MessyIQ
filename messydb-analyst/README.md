# MessyIQ Multi-Industry Analyst

MessyIQ is a read-only multi-industry analyst backed by Supabase and Groq. The workspace currently demonstrates four categories: education, retail, workforce, and operations. It produces aggregate dashboards and verified summaries; it does not execute model-generated SQL or make decisions about people.

## Included data

The migrations create 120 synthetic education records plus 45 synthetic records in each of retail, workforce, and operations (255 synthetic records total), with category-specific tables and an aggregate read view. They do not contain real Manipal University data or real customer, student, or employee records. The education data models admission, term/status progression, leave, exit reasons, and graduation. No blacklist or automated disciplinary labels are created.

## 1. Create and seed Supabase

1. Create a project at https://supabase.com/dashboard.
2. Open **SQL Editor**.
3. Run `supabase/migrations/202610250001_education_analyst.sql`.
4. Run `supabase/migrations/202610250002_multi_domain_demo.sql`.
5. Confirm 120 rows in `education_students` and 135 rows in `messyiq_demo_records`.

The migrations use synthetic fixture records. Do not treat them as official university or business data.

## 2. Configure server environment

Copy `.env.example` to `.env.local`:

```powershell
Copy-Item .env.example .env.local
```

Set these values locally:

```text
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-server-only-service-role-key
GROQ_API_KEY=your-groq-key
GROQ_MODEL=llama-3.3-70b-versatile
```

Get Supabase values from **Project Settings > API** and create a Groq key at https://console.groq.com. Use a model currently available to your account.

- Never paste keys into chat, commit them, or put the service-role key in a `NEXT_PUBLIC_` variable.
- The service-role credential is used server-side in this local demo and can bypass RLS. For production, use authenticated user-scoped access or a narrowly scoped server credential with tenant-aware RLS.
- Groq is optional: verified summaries still work without it or when the provider is out of quota.
- Restart Next.js after changing `.env.local`.

Use **Test APIs** in the dashboard to check actual credentials. The check reports status, not secret values. It does not imply connectivity until both providers return a successful test.

## 3. Run locally

```powershell
npm install
npm run dev
```

Open http://localhost:3000.

The overview API is `GET /api/dashboard?domain=education|retail|workforce|operations`. Analyst questions are sent to `POST /api/analyst` with a category and question. If Supabase is not configured, the app labels its synthetic sample data. A Groq quota/provider failure falls back to a verified deterministic summary.

Example questions:

- "How many students are active by program?"
- "What are the recorded reasons for leaving?"
- "How many orders are still processing by product group?"
- "What exit reasons are documented across departments?"
- "How many work orders are open by facility?"

## Demo categories

| Category | Source tables | Example fields |
| --- | --- | --- |
| Education | `education_students`, `education_academic_events` | Program, cohort, term status, GPA, attendance, fee status, recorded leave/exit reason |
| Retail | `messyiq_retail_orders` | Product group, region, order status/value, delivery/refund follow-up |
| Workforce | `messyiq_workforce_engagements` | Department, engagement status, leave/exit follow-up reason |
| Operations | `messyiq_operations_work_orders` | Facility, issue type, priority, work status, inspection/parts review signal |

## Safety and data scope

All bundled records are synthetic and are not Manipal University data. To load real records, obtain explicit authorization and use a lawful, institution-approved export; do not scrape or invent personal student records. These migrations are demo fixtures, not a production university database schema.

Groq receives only the question and verified aggregates, never person-level records. The app does not accept free-form SQL. It cannot create a blacklist or label a student, employee, applicant, or customer as good/bad. Individual consequential requests are stopped and returned as requiring qualified human review; aggregate signals and documented reasons are context, not a finding or decision.

The categories and common aggregate view are a demonstration. Connecting another industry requires an authorized schema mapping; the model cannot discover or query arbitrary tables by itself. Before production use, add authentication, tenant authorization, least-privilege database access, and RLS policies tied to the signed-in user's organization.

## Validate

```powershell
npm run lint
npm run build
npm run start -- -p 3100
```
