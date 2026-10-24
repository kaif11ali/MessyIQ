MessyIQ — Complete Build Guide (Zero to Working AI Data Analyst)

Project name: MessyIQ
Goal: Build an AI data analyst that lets authorized users ask questions in plain English, generates and validates SQL, runs approved read-only queries against a connected database, verifies results, and explains findings with tables/charts.
Language constraint: No Python. Use JavaScript/TypeScript throughout.
AI provider: Groq API (user already has a Groq API key).

1. Product overview

MessyIQ is a database analysis assistant—not a database with magical access to every organization’s records. It can only analyze databases that an authorized administrator deliberately connects and grants access to.

Example question

“Which school had the largest decrease in student enrollment compared with the previous year?”

High-level flow

User signs in and selects a workspace/data source they are authorized to use.

Backend loads only the approved database schema and relevant metadata.

Groq receives the question plus relevant schema context and drafts a structured analysis/SQL plan.

Backend validates the plan and SQL independently of the model.

Backend executes approved read-only SQL using a restricted database account.

Backend checks the results, handles empty/ambiguous cases, and records an audit event.

UI displays the answer, supporting rows, and optional charts.

Important: Groq generates suggestions; it does not grant database permissions. Authorization, SQL safety, and query execution are enforced by the backend and database.

2. Recommended stack

Layer

Technology

Runtime

Node.js LTS

Language

TypeScript

Frontend

React + Vite

Styling

Tailwind CSS

API server

Express

AI

Groq API / groq-sdk

Main application database

PostgreSQL

ORM for application data

Prisma

Validation

Zod

Customer SQL safety

PostgreSQL read-only role + allowlist/AST-based SQL validation

Charts

Recharts

Authentication

A vetted authentication library/provider; secure cookie sessions preferred for a browser app

API testing

Postman or Bruno

Version control

Git

Keep MessyIQ’s application database separate from any customer/business database that MessyIQ analyzes.

Application DB: users, workspaces, connections, conversations, audit logs, and query history.

Customer DB: the actual school, retail, finance, or other business data being analyzed.

Never copy customer data into the application DB unless a clear, necessary, authorized product feature requires it.

3. Prerequisites

Install these tools:

Node.js LTS: https://nodejs.org/

Visual Studio Code: https://code.visualstudio.com/

PostgreSQL: https://www.postgresql.org/download/

Git: https://git-scm.com/

Check the installations in a terminal:

node -v
npm -v
git --version

Keep the Groq API key private. Do not paste it into chat, source code, screenshots, or GitHub.

4. Repository layout

Create this initial structure:

MessyIQ/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   │   └── env.ts
│   │   ├── routes/
│   │   │   └── analyst.routes.ts
│   │   ├── middleware/
│   │   ├── services/
│   │   │   ├── groq.service.ts
│   │   │   ├── schema.service.ts
│   │   │   ├── sql-validator.service.ts
│   │   │   ├── query-executor.service.ts
│   │   │   └── analyst.service.ts
│   │   ├── app.ts
│   │   └── server.ts
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── types/
│   │   ├── App.tsx
│   │   └── main.tsx
│   └── package.json
└── README.md

Expand the structure only when each phase needs the new files.

5. Phase 1 — Create the project and backend

From a terminal:

mkdir MessyIQ
cd MessyIQ
mkdir backend frontend
cd backend
npm init -y

Install runtime dependencies:

npm install express cors dotenv groq-sdk zod pg @prisma/client

Install development dependencies:

npm install -D typescript tsx @types/node @types/express @types/cors prisma
npx tsc --init

Create backend/.gitignore:

node_modules/
dist/
.env
coverage/

Add scripts to the scripts section of backend/package.json (merge these with the existing JSON; do not create a second scripts property):

{
  "dev": "tsx watch src/server.ts",
  "build": "tsc",
  "start": "node dist/server.js"
}

Configure tsconfig.json for a consistent Node TypeScript setup. One straightforward option is module: "NodeNext", moduleResolution: "NodeNext", target: "ES2022", rootDir: "src", outDir: "dist", strict: true, and esModuleInterop: true. With NodeNext, follow Node's ESM/package rules consistently; if using ESM, set "type": "module" in package.json and use .js extensions in relative imports as required by TypeScript's NodeNext output.

Create folders:

mkdir -p src/config src/routes src/middleware src/services

On Windows PowerShell, if mkdir -p does not work, create the folders using VS Code Explorer or run mkdir src\config, src\routes, src\middleware, src\services.

6. Phase 2 — Configure Groq securely

Create backend/.env locally:

PORT=5000
GROQ_API_KEY=replace_with_your_real_key
GROQ_MODEL=replace_with_a_model_currently_available_in_your_Groq_console

Use a model ID currently available to your Groq account. Do not assume a model ID will remain available forever; check the official model list: https://console.groq.com/docs/models

Create backend/.env.example (safe to commit):

PORT=5000
GROQ_API_KEY=
GROQ_MODEL=
DATABASE_URL=

Never commit .env. The frontend must never receive GROQ_API_KEY; all Groq calls go through the backend.

src/config/env.ts

import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GROQ_MODEL: z.string().min(1, "GROQ_MODEL is required"),
});

export const env = schema.parse(process.env);

src/services/groq.service.ts

import Groq from "groq-sdk";
import { env } from "../config/env.js";

const groq = new Groq({ apiKey: env.GROQ_API_KEY });

export async function askGroq(question: string): Promise<string> {
  const response = await groq.chat.completions.create({
    model: env.GROQ_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are MessyIQ, an AI data analyst. Be clear and honest. Do not claim to have queried a database unless the application actually executed a query. Do not invent results.",
      },
      { role: "user", content: question },
    ],
    temperature: 0.2,
  });

  return response.choices[0]?.message?.content ?? "";
}

src/app.ts

import express from "express";
import cors from "cors";
import { askGroq } from "./services/groq.service.js";

export const app = express();

app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "MessyIQ API" });
});

app.post("/api/ai/test", async (req, res) => {
  const question = req.body?.question;

  if (typeof question !== "string" || question.trim().length === 0) {
    return res.status(400).json({ error: "question must be a non-empty string" });
  }

  try {
    const answer = await askGroq(question.trim());
    return res.json({ answer });
  } catch (error) {
    console.error("Groq request failed:", error);
    return res.status(502).json({
      error: "The AI provider request failed. Check server configuration and logs.",
    });
  }
});

src/server.ts

import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, () => {
  console.log(`MessyIQ API listening on http://localhost:${env.PORT}`);
});

Start the server:

npm run dev

Test the health endpoint in a browser or API client:

GET http://localhost:5000/health

Expected response:

{
  "ok": true,
  "service": "MessyIQ API"
}

Test Groq using Postman/Bruno:

POST http://localhost:5000/api/ai/test
Content-Type: application/json

Body:

{
  "question": "Explain what a database table is in two sentences."
}

Expected: JSON containing an answer from Groq. Do not expose raw provider errors or API keys to frontend users.

Official SDK: https://github.com/groq/groq-typescript
Official API docs: https://console.groq.com/docs

7. Phase 3 — Set up the application database

The application database stores MessyIQ's own records. It is distinct from the business database being queried.

Create a local PostgreSQL database, for example messyiq_app, and set the connection string in backend/.env:

DATABASE_URL=postgresql://DB_USER:DB_PASSWORD@localhost:5432/messyiq_app

Use your own local database username/password; do not commit this URL.

Initialize Prisma:

npx prisma init

Keep only one DATABASE_URL declaration in .env. Define application models in prisma/schema.prisma, then run:

npx prisma migrate dev --name init
npx prisma generate

Suggested application entities

User — account identity and auth-provider identifier.

Workspace — organization/project container.

WorkspaceMember — user role within a workspace.

DataSource — metadata for an approved external database connection; protect credentials.

SchemaSnapshot — sanitized table/column metadata and refresh timestamp.

Conversation — chat session and workspace reference.

Message — user questions and assistant responses.

QueryRun — query status, duration, safe summary, and row count; avoid logging sensitive result contents by default.

AuditEvent — who attempted which action and whether it was allowed.

Feedback — optional user rating/correction.

Enforce workspace-level access in backend queries. Do not trust a workspace ID or data-source ID supplied by the browser without checking the signed-in user's membership and role.

8. Phase 4 — Build a demo business database

Start with a small synthetic dataset rather than connecting a real organization's database immediately.

Example schema:

CREATE TABLE schools (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT
);

CREATE TABLE enrollment (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  school_id BIGINT NOT NULL REFERENCES schools(id),
  academic_year INTEGER NOT NULL,
  student_count INTEGER NOT NULL CHECK (student_count >= 0)
);

INSERT INTO schools (name, district) VALUES
  ('Sunrise School', 'North'),
  ('Green Valley School', 'South'),
  ('Riverbank School', 'East');

INSERT INTO enrollment (school_id, academic_year, student_count) VALUES
  (1, 2024, 500), (1, 2025, 430),
  (2, 2024, 380), (2, 2025, 350),
  (3, 2024, 410), (3, 2025, 300);

Run the SQL in a separate demo business database. Later, create a dedicated database role for MessyIQ that has only the required SELECT privileges. Do not use a PostgreSQL superuser or an owner account for AI-generated queries.

9. Phase 5 — Schema discovery

Implement schema.service.ts to retrieve permitted schema metadata from PostgreSQL's catalog or information_schema.

Return only metadata needed by the model, such as:

approved schema/table names,

column names and types,

primary/foreign-key relationships,

safe descriptions supplied by an administrator.

Do not send entire tables or sensitive sample rows to the LLM as a shortcut. Filter tables and columns according to the connected user's permissions. Refresh schema snapshots when the source changes.

10. Phase 6 — Natural language to SQL

The AI should produce a structured proposal, not execute arbitrary text. Prefer JSON output with fields such as:

{
  "needs_clarification": false,
  "clarification_question": null,
  "sql": "SELECT ...",
  "explanation": "Compare enrollment counts between two academic years.",
  "assumptions": ["The latest two available academic years are being compared."]
}

Use a Zod schema to validate the response shape. Treat every model output as untrusted input, even when the provider returns valid JSON.

Example system instructions for SQL drafting

You are drafting SQL for PostgreSQL, not executing it.

Use only tables and columns in the supplied schema.

Generate exactly one read-only SELECT statement.

Never produce DDL, DML, transaction control, stored procedures, or multiple statements.

Do not guess missing schema fields.

If the time range, metric, or comparison is ambiguous, ask a clarifying question.

Use parameters for user-provided values instead of interpolating them into SQL.

Return the requested structured format.

These prompt rules are not a security boundary. The backend must independently validate all SQL.

11. Phase 7 — SQL safety and execution

Before executing a generated query:

Authenticate the user.

Confirm workspace membership and permission to use the selected data source.

Resolve the data source server-side; do not accept arbitrary database URLs from the browser.

Parse SQL with a PostgreSQL-compatible parser/AST validator. Do not rely on regex alone.

Permit exactly one SELECT (and only explicitly approved read-only constructs).

Reject DDL/DML, multiple statements, unsafe functions, unapproved schemas/tables, and system catalogs unless explicitly needed.

Verify every referenced table and column against the approved schema and user's data permissions.

Use parameterized values; never interpolate raw user text into SQL.

Execute with a dedicated database role that has only SELECT permissions.

Apply statement timeout, result row limit, connection timeout, and cancellation support.

Record an audit event without logging secrets or unnecessarily storing sensitive row data.

Return a safe error message if validation or execution fails.

For PostgreSQL, read-only transactions can provide an additional safeguard, but they do not replace restricted database credentials and SQL validation. Use a separate connection pool/credentials per authorized data source, with strict limits.

Do not expose a general endpoint that accepts any SQL string and runs it against any database.

12. Phase 8 — Verify results and compose answers

The model must not invent results. Pass the actual query result (after limiting/redacting sensitive data) to the answer-generation stage, along with the original question and SQL summary.

The response should distinguish:

verified facts from returned rows,

assumptions,

missing data,

ambiguity or limitations.

If no rows are returned, say so. If the question cannot be answered from available columns, ask the user to clarify or connect the relevant data. Avoid claiming causal explanations from simple correlations.

Recommended internal orchestration:

receive question
  -> authenticate + authorize
  -> load approved schema
  -> ask Groq for a structured SQL proposal
  -> validate proposal format
  -> validate SQL and permissions
  -> execute read-only query with limits
  -> verify/shape results
  -> ask Groq to explain the actual results
  -> save conversation and audit metadata
  -> return answer + table/chart data

13. Phase 9 — Frontend

Create the React app from the project root:

cd ../frontend
npm create vite@latest . -- --template react-ts
npm install
npm install recharts

Install and configure Tailwind CSS using the current official instructions for the Vite version you install: https://tailwindcss.com/docs/installation

Suggested screens

Sign in

Workspace dashboard

Data sources — add/test connection, view permissions, refresh schema

AI analyst chat — question box, conversation history, answer, query explanation

Results — sortable table, export only if authorized, chart suggestions

Query details — safe SQL preview, status, duration, assumptions

Settings/audit — workspace membership, data-source access, audit history

UI principles

Premium, clean analytics dashboard.

Responsive layout and accessible contrast.

Clear loading, empty, success, and error states.

Show which data source is being queried.

Show assumptions and the source/time range used for comparisons.

Do not display the Groq API key or database credentials in the frontend.

Never use a browser-supplied role or workspace ID as proof of authorization.

Use a frontend environment variable such as VITE_API_BASE_URL=http://localhost:5000 only for the backend base URL. Never use VITE_GROQ_API_KEY; all Vite variables are exposed to the browser bundle.

14. Suggested API endpoints

Method

Endpoint

Purpose

GET

/health

Service health check

POST

/api/ai/test

Development-only Groq connectivity test; protect or remove before production

GET

/api/workspaces

List workspaces accessible to the user

GET

/api/data-sources

List authorized data sources

POST

/api/data-sources

Create a data-source configuration after validation

POST

/api/data-sources/:id/test

Test an authorized connection

POST

/api/data-sources/:id/schema/refresh

Refresh schema metadata

POST

/api/analyst/ask

Run the question-analysis workflow

GET

/api/conversations/:id

Load an authorized conversation

GET

/api/query-runs/:id

Retrieve safe query status/metadata

All routes other than health should use proper authentication and authorization. Add rate limiting, request validation, CSRF protection where applicable, and safe error handling before production. The development /api/ai/test route should not be left publicly accessible.

15. Testing checklist

Groq integration

Server starts when valid environment variables exist.

Server fails safely when the key/model is missing.

A test question receives a response.

Invalid key, rate limit, timeout, and provider outage produce safe errors.

The API key never appears in browser responses or logs.

SQL safety

A valid SELECT over approved tables is accepted.

DROP, DELETE, UPDATE, INSERT, and ALTER are rejected.

Multiple SQL statements are rejected.

Access to an unapproved table is rejected.

User A cannot access User B's workspace/data source.

Queries time out and result limits are enforced.

SQL-injection attempts do not bypass authorization or parameterization.

Answer quality

Correct answer for known demo data.

Empty result is explained honestly.

Ambiguous question triggers clarification.

Unsupported question does not produce fabricated results.

Answer explains assumptions and relevant data range.

Frontend

Loading/error/empty states work.

User can view a table of returned rows.

Charts use actual result values.

Secrets are absent from the built frontend.

Unauthorized routes and data are blocked by the backend.

16. Local development run order

Start PostgreSQL.

Create the MessyIQ application database.

Create the separate demo business database and sample tables.

Configure backend .env with Groq settings and application DB URL.

In backend/, run Prisma migrations after defining the schema.

In backend/, run npm run dev.

Check http://localhost:5000/health.

Test POST http://localhost:5000/api/ai/test with a harmless question.

In frontend/, run npm run dev.

Build the UI, connect it to backend endpoints, and implement authentication before connecting real customer data.

The Groq connectivity test in Phase 2 only proves the model API works. It does not mean database analysis is complete; the schema, SQL validation, safe executor, result verification, and UI still need to be implemented.

17. Deployment and production readiness

Before production:

Store provider/database credentials in a secrets manager or secure hosting environment.

Use TLS for network connections.

Use restricted database roles and approved network access.

Enforce workspace/data-source authorization on every request.

Add rate limits, request-size limits, statement timeouts, and usage budgets.

Avoid logging API keys, connection strings, or sensitive query results.

Define data retention and deletion policies.

Review privacy, compliance, and contractual requirements for the data being analyzed and the AI provider.

Pin dependency versions, scan dependencies, and keep backups.

Monitor provider errors, latency, token usage, query cost, and unsafe-query rejections.

Add human review or confirmation for high-impact operations; the initial product should be read-only.

18. Milestones

Milestone 1 — Groq works

Backend starts and returns a model answer through the server.

Milestone 2 — Demo database works

Backend can connect to the synthetic PostgreSQL database and inspect approved schema metadata.

Milestone 3 — Safe SQL pipeline works

A natural-language question becomes a validated, read-only query and returns real demo data.

Milestone 4 — Verified analyst answers

The assistant explains the actual results and asks clarification when needed.

Milestone 5 — Frontend works

React chat, tables, and charts use the backend API.

Milestone 6 — Multi-user access works

Authentication, workspaces, data-source permissions, audit events, and rate limits are enforced.

Milestone 7 — Deployment

Secrets, TLS, monitoring, backups, and production security checks are complete.

19. Official references

Node.js: https://nodejs.org/

Express: https://expressjs.com/

TypeScript: https://www.typescriptlang.org/docs/

Groq API docs: https://console.groq.com/docs

Groq model list: https://console.groq.com/docs/models

Groq TypeScript SDK: https://github.com/groq/groq-typescript

PostgreSQL: https://www.postgresql.org/docs/

Prisma: https://www.prisma.io/docs

React: https://react.dev/

Vite: https://vite.dev/guide/

Tailwind CSS: https://tailwindcss.com/docs/installation

Zod: https://zod.dev/

Final rule

MessyIQ should never claim to know data it has not actually queried. The LLM proposes; the backend authorizes and validates; the restricted database executes; the application verifies the result; then the LLM explains the evidence.
