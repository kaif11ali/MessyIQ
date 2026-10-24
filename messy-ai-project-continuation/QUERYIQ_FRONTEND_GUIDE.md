# QueryIQ Frontend Guide

## Document Purpose

This document explains the complete QueryIQ frontend implementation created for the MessyIQ hackathon project. It is written for team members who need to understand, demonstrate, extend, or maintain the application.

This version is intentionally frontend-only. It does not contain a backend, database API, remote model integration, or real SQLite parsing. All application behavior is simulated deterministically in the browser so the interface can run reliably during development and demonstration.

## 1. Project Identity

- **Application name:** QueryIQ
- **Project type:** Interactive frontend prototype
- **Framework:** Next.js
- **UI library:** React
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Icon library:** Lucide React
- **Runtime state:** Browser local storage
- **Primary goal:** Demonstrate a secure, plain-language database analysis experience for messy SQLite databases
- **Current delivery mode:** Frontend-only prototype
- **Model constraint:** The original target supports open-weight models up to 8B parameters. No model is called in the current frontend-only build.

## 2. Business Problem

Business users often need answers from databases but do not know the schema, SQL syntax, or data-quality conventions. Database tables may contain:

- Cryptic table and column names
- Missing or inconsistent values
- Mixed date formats
- Duplicate records
- N/A and empty values
- Unclear business rules
- Unexpected join requirements

A polished text-to-SQL interface alone is not enough. The experience must make the result understandable and auditable. QueryIQ therefore presents:

- A plain-language question interface
- Database connection context
- Generated SQL
- Returned result rows
- Structured success/rejection states
- Data-quality information
- Query history

## 3. Current Scope

The current application demonstrates a complete frontend workflow:

1. Connect a demo SQLite database.
2. Inspect database tables and sample records.
3. Ask a business question in plain English.
4. View a generated SQL statement.
5. Inspect returned rows.
6. View structured destructive-operation refusal.
7. Inspect data-quality issues.
8. Review query history.
9. Navigate between desktop dashboard views.

The current implementation does not prove real database execution. A user-selected file name triggers a deterministic demo profile. This limitation must be made explicit when presenting or selling the prototype.

## 4. Target Users

### Primary end users

- Operations managers
- Small-business owners
- Junior analysts
- Data-quality teams
- Researchers
- Support teams working with exported SQLite data
- SQL learners
- Internal product teams reviewing operational reports

### Primary evaluators

- Hackathon judges
- Team mentors
- Product stakeholders
- Technical reviewers
- Potential pilot customers

### Ideal pilot organizations

- Companies with small SQLite exports
- Teams using local analytical datasets
- Organizations with low-concurrency reporting needs
- Training and education environments
- Internal teams that need schema exploration before implementing SQL

## 5. Value Proposition

QueryIQ aims to provide:

- Faster access to database answers.
- Less dependence on SQL expertise.
- Inspectable SQL instead of a hidden AI answer.
- Clear refusal when a request is unsafe or unsupported.
- A central place to inspect schema, quality issues, and query history.
- A local-first, privacy-friendly interface for demonstration and pilot use.

The short product promise is:

> Ask a question, inspect the SQL and evidence, and receive an answer or clear refusal.

## 6. Application Structure

```text
messy-ai-project-continuation/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ai-analyst-page.tsx
│   ├── database-explorer-page.tsx
│   ├── data-quality-page.tsx
│   ├── history-tests-page.tsx
│   └── ui/
├── lib/
│   ├── demo-store.ts
│   └── utils.ts
├── public/
├── next.config.mjs
├── package.json
├── tsconfig.json
└── QUERYIQ_FRONTEND_GUIDE.md
```

## 7. Application Shell

The main application shell is in `app/page.tsx`.

### Responsibilities

- Renders the left workspace navigation.
- Tracks the active page.
- Handles desktop and mobile navigation.
- Renders page headers.
- Displays workspace summary cards on the dashboard.
- Dispatches internal navigation events.

### Navigation items

- Dashboard
- AI Analyst
- Databases
- Data Quality
- History & Tests

Navigation is managed inside React state. Page components listen to custom browser events when a dashboard or nested button navigates to another page.

### Layout behavior

- Desktop screens use a fixed 252-pixel sidebar.
- Mobile screens use a slide-out sidebar.
- Main content uses a responsive maximum-width container.
- Tables and result layouts can scroll horizontally on narrow screens.
- Cards are compact and optimized for operational scanning rather than marketing presentation.

## 8. Frontend Demo State

The complete demo state model is in `lib/demo-store.ts`.

### State shape

The demo state contains:

- `activeDatabaseId`: the currently selected database
- `databases`: database summaries
- `profiles`: table and column definitions
- `previews`: sample rows
- `history`: completed demo analyses
- `qualityIssues`: generated quality observations

### Persistence

The state is stored in `localStorage` using the key `queryiq-demo-state`.

This provides:

- Persistence across page refreshes
- Persistent demo database selection
- Persistent query history
- No network or server dependency

When local storage is unavailable or contains invalid JSON, the application falls back to an empty initial state.

### Important limitation

Local storage is browser-local. It does not synchronize across devices and is not suitable for sensitive or regulated data without further security and storage design.

## 9. Demo Database Profile

Selecting a SQLite-named file creates a deterministic demo database named after that file.

### Table

The profile contains one table named `customers`.

### Columns

| Column | Type | Key or constraints | Samples |
|---|---|---|---|
| id | INTEGER | Primary key, required | 1, 2 |
| name | TEXT | Required | CA, TX |
| region | TEXT | Required | West, South |

### Rows

| id | name | region |
|---|---|---|
| 1 | CA | West |
| 2 | TX | South |

### Data behavior

The name “SQLite file” is intentional UI compatibility. The frontend does not read binary SQLite files. A file with `.db`, `.sqlite`, or `.sqlite3` in the name starts the demo profile.

This behavior is suitable for a visual prototype but must not be described as real database ingestion.

## 10. Database Explorer Page

The database explorer is implemented in `components/database-explorer-page.tsx`.

### Features

- SQLite file selection control
- Demo connection banner
- Table count
- Row count
- Table search
- Table selection
- Column badges
- Column type display
- Record preview
- Active database switching
- Connection status

### Upload interaction

When the user selects a file:

1. The browser receives the file name.
2. `createDemoDatabase()` creates a deterministic database summary.
3. `createPreview()` creates demo table rows.
4. The state store saves the profile and preview.
5. The new database becomes active.
6. The selected table is reset to avoid stale selection.

### Multiple database behavior

Each connection is stored in the demo state. Database buttons allow switching between previously created demo connections. Selecting another database updates the active database, profile, and table selection.

### Table preview

The preview uses the selected table's column definitions as headers and renders matching sample rows. Empty rows are represented clearly.

## 11. AI Analyst Page

The AI Analyst is implemented in `components/ai-analyst-page.tsx`.

### Features

- Textarea for natural-language questions
- Active database badge
- Suggested question buttons
- Analysis history navigation
- Loading state
- Answer state
- Rejected state
- Generated SQL display
- Result table
- Execution time
- Strategy label
- Error text
- Empty database state

### Supported demo questions

The deterministic analyzer recognizes:

- Questions containing “how many”, “count”, or “number of”
- Questions containing “West”
- Questions containing “South”
- General questions about customers
- Requests containing destructive operation words

### Count question example

Input:

```text
How many customers are in the table?
```

Result:

- SQL: `SELECT COUNT(*) AS "count" FROM "customers"`
- Columns: `count`
- Rows: `[{ count: 2 }]`
- Answer: `The result is 2 customer records.`

### Region question example

Input:

```text
Show me customers in the West region
```

Result:

- SQL: `SELECT "id", "name", "region" FROM "customers" WHERE "region" = 'West'`
- One matching customer is returned.

### General question example

Input:

```text
Show me all customers
```

Result:

- Two customer rows are returned.
- The page presents the SQL and result table.

### Destructive operation refusal

The frontend rejects natural-language requests containing words such as:

- delete
- drop
- update
- insert
- alter
- truncate
- attach
- detach

The result is structured:

- Status: `rejected`
- SQL: empty
- Answer: operation not allowed
- Error: only read-only SELECT analysis is permitted

This frontend demonstration is based on explicit keyword detection. It is not a complete SQL security validator.

### History behavior

Every analysis pushes the result to the beginning of the demo history array. State is persisted in local storage.

## 12. Data Quality Page

The Data Quality page is implemented in `components/data-quality-page.tsx`.

### Features

- Active database badge
- Missing-value metric
- Inconsistent-data metric
- Mixed-date metric
- Quality issue table
- Issue filtering
- Table selector
- Selected table column profile
- Suggested fix area

### Data quality behavior

The page reads the active profile and passes it to `getQualityIssues()`.

Current generated issue examples include:

- Missing values
- Inconsistent data
- Mixed date formats

The demo profile currently contains no missing, inconsistent, or date-formatted values, so UI metrics remain empty until the frontend store is extended with a richer fixture.

### Extension path

To produce useful real quality metrics, the project should replace demo fixtures with a real profile containing:

- Null percentages
- Empty-string percentages
- Distinct value counts
- Duplicate counts
- Date-format groups
- Type mismatch counts
- Outlier counts
- Foreign-key validity
- Referential integrity failures

## 13. History and Tests Page

The History & Tests page is implemented in `components/history-tests-page.tsx`.

### Features

- Search history
- Filter by status
- Successful result count
- Rejected result count
- Selected run details
- Generated SQL
- Answer text
- Execution metadata
- Evaluation metric placeholders

### Status filters

- All
- Successful
- Failed
- Rejected

### Current behavior

History comes from `loadDemoState().history`. A storage event updates the visible history when state changes in another browser context.

### Evaluation metrics

The current metrics are presentation placeholders:

- SQL execution success
- Answer correctness
- Unanswerable rejection

They do not perform an automated evaluation yet.

### Correctness gap

The prototype cannot claim execution accuracy until it:

- Runs real SQL.
- Uses gold question-answer pairs.
- Compares execution result sets.
- Measures refusal precision and recall.

## 14. Dashboard Page

The dashboard is in `app/page.tsx`.

### Current features

- Workspace overview
- “New analysis” action
- Static workspace metrics
- Recent query table
- Database connection panel
- Quick actions
- Navigation to major workflows

### Intentional placeholder behavior

Some dashboard metrics still display “—” or “Not available” because the frontend-only demo has no centralized dashboard aggregate API.

Future implementation should derive dashboard metrics from the shared demo state:

- Connected database count
- Query count
- Successful query count
- Quality issue count
- Recent runs
- Active database details

## 15. Shared UI Components

The `components/ui` directory contains reusable components derived from the UI system:

- Avatar
- Badge
- Button
- Card
- Separator

These components provide consistent styling and button variants throughout the application.

### Design conventions

- Compact 8-pixel-friendly corner radii
- Neutral dark workspace palette
- Blue primary action color
- Semantic red for destructive rejection
- Green for successful connection and completion
- Muted text for metadata
- Compact operational tables
- Explicit empty states
- Responsive cards and grids

## 16. Styling

Global styling is in `app/globals.css`.

### Styling approach

- Tailwind CSS utilities
- CSS variables for theme colors
- Dark color scheme
- Shared border, card, sidebar, and chart tokens
- Local component styling rather than external CSS modules
- Responsive Tailwind breakpoints

### Theme direction

The UI is currently intentionally dark and compact. It is intended to resemble an analyst workspace rather than a marketing landing page.

## 17. Core State and Component Interaction

```text
Database Explorer
      |
      | creates profile and preview
      v
localStorage queryiq-demo-state
      |
      +--> AI Analyst
      |      creates analysis result and history
      |
      +--> History & Tests
      |      reads history and selected run
      |
      +--> Data Quality
             derives issue metrics from profile
```

The state is not reactive between already-mounted tabs unless a browser storage event fires or the state is re-read. For a more reliable shared experience, the next implementation should use a React context or external state library.

## 18. Detailed Data Flow

### Database connection flow

```text
User selects file
  -> browser reads file name
  -> createDemoDatabase()
  -> create demo profile
  -> create demo preview
  -> update React state
  -> save state to localStorage
  -> set active database
  -> show database UI
```

### Analysis flow

```text
User enters question
  -> verify active database
  -> verify non-empty question
  -> analyzeDemo(question)
  -> detect destructive intent
  -> determine demo response
  -> add result to history
  -> save state
  -> show SQL and result
```

### Quality flow

```text
Load active profile
  -> scan profile columns
  -> generate issue counts
  -> filter by search text
  -> show issue table
  -> select table
  -> show profile columns
```

### History flow

```text
Load history from browser state
  -> apply status filter
  -> apply search filter
  -> render matching rows
  -> select result
  -> show SQL and answer
```

## 19. Component API

### `createDemoDatabase(fileName)`

Creates a database summary and demo profile.

Input:

```ts
fileName: string
```

Output:

```ts
{
  stateDatabase: DatabaseSummary,
  profile: DatabaseProfile
}
```

### `createPreview(profile)`

Creates row previews for each table in a profile.

Input:

```ts
profile: DatabaseProfile
```

Output:

```ts
Record<string, Record<string, unknown>[]>
```

### `analyzeDemo(question)`

Creates a deterministic analysis result.

Input:

```ts
question: string
```

Output:

```ts
AnalysisResult
```

### `getQualityIssues(profile)`

Creates quality issues from column names and sample values.

Input:

```ts
profile: DatabaseProfile
```

Output:

```ts
QualityIssue[]
```

### `loadDemoState()`

Reads state from local storage.

### `saveDemoState(state)`

Writes state to local storage.

### `clearDemoState()`

Deletes demo state from local storage.

## 20. Dependencies

The frontend uses:

- `next`
- `react`
- `react-dom`
- `lucide-react`
- `tailwindcss`
- `@tailwindcss/postcss`
- `class-variance-authority`
- `clsx`
- `tailwind-merge`
- `tw-animate-css`
- `@base-ui/react`
- `shadcn`
- `@vercel/analytics`
- TypeScript

Backend-oriented dependencies should not be added to this frontend-only branch unless real database execution is intentionally being restored.

## 21. Setup Instructions

### Requirements

- Node.js 20.18.1 or newer
- npm
- A modern browser

### Install

```bash
cd messy-ai-project-continuation
npm install
```

### Development server

```bash
npm run dev
```

The default script listens on:

```text
http://0.0.0.0:3000
```

Browser URLs:

```text
http://localhost:3000
http://<your-computer-ip>:3000
```

### Production build

```bash
npm run build
npm run start
```

### TypeScript validation

```bash
npx tsc --noEmit
```

## 22. Recommended Demo Script

### Step 1: Dashboard

Open the dashboard and explain that the interface is the workspace overview.

### Step 2: Database Explorer

Select a `.sqlite` file.

Explain:

- This demo creates a deterministic profile.
- The real prototype will parse uploaded SQLite files.
- The table and column metadata remain inspectable.

### Step 3: Table Preview

Select the `customers` table and show:

- `id`
- `name`
- `region`
- Two records
- Primary-key information

### Step 4: AI Analyst

Ask:

```text
How many customers are in the table?
```

Show:

- Generated SQL
- Result table
- Natural-language answer
- Execution duration

### Step 5: Region Query

Ask:

```text
Show customers in the West region
```

Show a smaller filtered result.

### Step 6: Safety Refusal

Ask:

```text
Delete all customers
```

Explain that the frontend blocks destructive intent before analysis and returns a structured rejection.

### Step 7: History

Open History & Tests and select one or both runs.

Show:

- Status
- Result count
- Execution time
- Generated SQL
- Answer

### Step 8: Data Quality

Open Data Quality and explain the intended quality workflow. Mention that issue data is demo-generated and must be replaced by real profile metrics.

## 23. Strengths of the Current Frontend

- Runs without a backend.
- Uses no proprietary model API.
- Works locally with no database credentials.
- Provides a complete navigation experience.
- Shows the SQL and returned evidence.
- Includes success and rejection states.
- Uses responsive UI components.
- Persists demo state across refreshes.
- Is easy to demonstrate in an unreliable network environment.
- Provides clear extension points for backend integration.

## 24. Weaknesses of the Current Frontend

- It does not parse uploaded SQLite files.
- It does not execute real SQL.
- It does not use a real 7B or 8B model.
- It cannot calculate real data-quality metrics.
- It cannot resolve dirty values from real database content.
- It cannot handle arbitrary joins or schema names.
- It does not have real authentication.
- It does not isolate users or datasets.
- It does not persist state to a database.
- It does not measure answer correctness.
- It may appear more capable than it is if demos omit the frontend-only caveat.

## 25. Real-World Use Potential

The UI can be useful for:

- Hackathon demonstrations
- User-interface design validation
- Product requirements workshops
- Frontend hire evaluations
- Prototype demonstrations
- Pilot onboarding screens
- Team walkthroughs
- Teaching text-to-SQL interaction concepts

The current implementation is not suitable for real financial, medical, security-sensitive, or production operational decisions.

## 26. Backend Integration Contract

A future backend should expose a stable contract while preserving the current UI components.

### Database upload

```text
POST /api/databases
```

Input: SQLite file

Output:

- Database ID
- Database name
- Table count
- Row count
- Schema profile

### Database retrieval

```text
GET /api/databases/:databaseId
```

Output:

- Database summary
- Table profile
- Column metadata
- Sample values

### Table preview

```text
GET /api/databases/:databaseId/tables/:tableName
```

Output:

- Table metadata
- Column names
- Limited rows

### Analysis

```text
POST /api/analyze
```

Input:

```json
{
  "database_id": "db-id",
  "question": "How many records are present?"
}
```

Output:

```json
{
  "status": "answer",
  "answer": "...",
  "sql": "SELECT ...",
  "columns": ["column"],
  "rows": [],
  "row_count": 2,
  "error": null,
  "execution_ms": 42,
  "strategy": "schema-grounded open-weight model"
}
```

### Refusal contract

```json
{
  "status": "rejected",
  "answer": "The requested operation is not allowed.",
  "sql": "",
  "columns": [],
  "rows": [],
  "row_count": 0,
  "error": "Only read-only SELECT analysis is permitted.",
  "execution_ms": 1,
  "strategy": "safety refusal"
}
```

## 27. Frontend-to-Backend Migration Plan

### Phase 1

Replace `lib/demo-store.ts` with typed API functions.

Recommended changes:

- Keep the existing UI types.
- Preserve database/profile response shapes.
- Replace local storage with server state only after authentication is implemented.
- Keep loading and error states.

### Phase 2

Add real SQLite upload and profiling.

Required backend components:

- Read-only database storage
- Schema profiler
- Table preview
- Row limits
- File validation
- Size limits
- File cleanup

### Phase 3

Add real SQL generation.

Required components:

- Schema linking
- Value matching
- Open-weight model integration
- Prompt tracing
- SQL extraction
- Refusal detection
- Retry loop

### Phase 4

Add real SQL validation and execution.

Required controls:

- AST allowlist
- Identifier validation
- Read-only SQLite connection
- Query timeout
- Row limit
- Forbidden function rejection
- Parameterized values
- Audit logging

### Phase 5

Add real quality and evaluation.

Required metrics:

- Execution-result accuracy
- Refusal precision
- Refusal recall
- Dirty-value resolution
- SQL syntax validity
- Query latency
- Model fallback rate
- Empty-result handling

## 28. Security Considerations

### Current frontend security

- No direct database access.
- No SQL execution.
- No server file upload processing.
- No model API key.
- Destructive natural-language keywords are refused in demo logic.

### Future backend security requirements

- Authentication
- Per-user database isolation
- Server-side SQL validation
- Read-only database connections
- Max query complexity
- Max returned rows
- Max result payload
- Query timeout
- Malicious SQL test suite
- Sensitive column masking
- Audit logs
- Secret-free frontend configuration
- Rate limiting
- TLS termination
- File malware scanning
- Database cleanup policies

## 29. Quality and Testing Strategy

### Frontend tests

- Database selection state.
- Table search.
- Table selection.
- Analysis result rendering.
- Destructive refusal rendering.
- History filtering.
- History search.
- Quality issue rendering.
- Mobile navigation.
- Local storage persistence.
- Invalid local storage handling.

### Suggested test tools

- Vitest
- React Testing Library
- Playwright
- Browser accessibility audits

### Recommended test fixtures

- No database
- One database
- Multiple databases
- Empty table
- Many tables
- Dirty column values
- Missing values
- Mixed dates
- Duplicate records
- Large result rows
- Unsafe question
- Ambiguous question
- Unanswerable question

## 30. Accessibility Recommendations

- Every icon-only control needs an accessible name.
- Suggested question buttons need visible focus styles.
- Table navigation should support keyboard operation.
- Status changes should be announced by a live region.
- Charts or visualizations need text summaries.
- Text contrast must be checked against the dark theme.
- Mobile navigation should trap focus while open.
- Dialogs and menus should manage focus correctly.
- The file input should have visible status feedback.

## 31. Performance Considerations

The frontend-only state is small and fast. Future growth will require:

- Pagination of history
- Pagination of database tables
- Virtualized result tables
- Query result limits
- Debounced search
- Memoized table filtering
- Indexed local state
- Server-side result streaming
- Cancellation for delayed analyses
- Cache invalidation
- Selective state persistence

## 32. Responsive Behavior

### Desktop

- Fixed left sidebar
- Multi-column dashboard
- Split database table/explorer layout
- Visible analysis and result panels

### Tablet

- Reduced sidebar or collapsed navigation
- Stacked analysis panels
- Responsive table scrolling

### Mobile

- Slide-out navigation
- Full-width controls
- Stacked cards
- Shorter result tables
- Horizontal table scrolling
- Touch-friendly file and suggestion controls

## 33. Advantages for the Hackathon

- Demonstrates all major product flows in a short time.
- Does not depend on Ollama availability.
- Does not depend on a cloud API key.
- Does not depend on an external database server.
- Is easy to run on a judge's local machine.
- Produces polished visual evidence.
- Allows explicit statement of frontend and backend scope.
- Provides a credible UI for adding real SQL generation later.

## 34. Risks for the Hackathon

- Judges may assume real SQL execution occurred.
- The demo profile is not tied to the uploaded file contents.
- A deterministic count or region response can be mistaken for model reasoning.
- Live database support cannot be inferred from the UI alone.
- The frontend-only scope may weaken claims about execution accuracy.
- The team must explain the staged architecture honestly.

The recommended presentation statement is:

> “This submission demonstrates the complete frontend workflow and interaction contract. The database upload and analysis responses are deterministic demo fixtures, ready to be replaced by the read-only SQL backend.”

## 35. Commercial Target

### Primary buyer

Operations or analytics leaders who need fast answers from local datasets but do not want employees writing SQL.

### Primary users

- Operations
- Business analysts
- Finance
- Research
- Internal support
- Data-quality teams

### Expected monetization

- Self-hosted team license
- SaaS workspace subscription
- Enterprise database integration
- On-premises deployment
- Professional services
- Domain-specific templates
- Support and training

## 36. Recommended MVP Definition

The minimum viable real product would include:

- Authentication
- Real SQLite upload
- Schema and sample profiling
- Schema-grounded open-weight model SQL generation
- AST validation
- Read-only execution
- Persistent database catalog
- Persistent query history
- Structured refusal
- Execution-result benchmark scoring
- Error handling
- Quality issue calculation
- Basic chart output

The current frontend meets the interface and interaction portion of that MVP.

## 37. Deployment Guidance

### Local demo deployment

Use Node.js and npm:

```bash
npm install
npm run dev
```

### Static preview

A static export is not required for the current Next.js application. It can run on a local Node server or be deployed to a compatible Next.js hosting environment.

### Production deployment concerns

- Upgrade Next.js to a secure fixed version.
- Set environment variables using the hosting platform.
- Add authentication before accepting real data.
- Serve through HTTPS.
- Add telemetry and error reporting.
- Configure storage policies.
- Remove demo fixtures.
- Configure browser CSP and security headers.

## 38. Security Upgrade Status

The project upgraded Next.js from `16.4.0` to `16.4.3` to address the published advisory reported by the Next.js upgrade tooling.

The project is not in a Git repository, so no Git commit or separate worktree was created.

The following setting was included as part of the required upgrade:

```js
experimental: {
  agentUpgrade: "security",
}
```

The Next configuration preserves the existing image and styling setup and no longer ignores build errors.

## 39. Cleanliness and Removed Work

The frontend-only cleanup removed:

- Backend API route handlers
- Server-side SQLite modules
- API client module
- `sql.js`
- `node-sql-parser`
- Backend temporary files
- Backend generated configuration
- Backend-only environment assumptions
- Stale package dependencies

The remaining application source is suitable for a frontend demonstration and can be developed independently of backend infrastructure.

## 40. Known Technical Issues to Monitor

- Next.js security and runtime version updates
- Node.js 20.18.1 engine requirement from transitive dependencies
- OneDrive file-lock behavior during npm operations
- Turbopack cache corruption if `.next` is deleted while a server is running
- Port 3000 conflicts with stale Next servers
- Local storage synchronization timing
- Browser storage size limits
- TypeScript build cache retention
- Security-upgrade telemetry configuration

### Recommended server recovery

If port 3000 is occupied:

```powershell
Get-NetTCPConnection -LocalPort 3000 -State Listen
Stop-Process -Id <OwningProcess> -Force
```

Then restart:

```bash
npm run dev
```

## 41. Extension Backlog

### High priority

- Real SQLite file parsing
- Real schema catalog
- Real open-weight model integration
- Real read-only SQL execution
- Backend API contract
- Persistent server database state
- Authentication
- Execution-result evaluation

### Medium priority

- Shared React context
- Query cancellation
- Chart generation
- Result pagination
- Database comparison
- Quality issue drilldown
- Saved dashboard views
- Export to CSV
- Export to PDF

### Lower priority

- Team collaboration
- Comments on query runs
- Shared saved prompts
- Enterprise identity provider
- Multi-dialect support
- Scheduled reports
- Alerting
- Semantic metrics catalog

## 42. Team Roles

### Frontend team

- Maintain responsive UI.
- Improve accessibility.
- Replace demo state with API state.
- Add charts and paginated result tables.
- Remove demo labels and placeholders.

### Backend team

- Implement database upload.
- Implement safe SQLite profiling.
- Implement SQL generation and execution.
- Implement persistent state.
- Implement authentication and authorization.

### AI team

- Improve schema linking.
- Improve dirty-value matching.
- Add question clarification.
- Improve query correction.
- Benchmark execution accuracy.

### Security team

- Implement AST validation.
- Audit SQL execution.
- Validate identifiers and values.
- Add file and upload controls.
- Add audit logs.
- Review model prompt injection exposure.

### QA team

- Create UI test suite.
- Create SQL security test suite.
- Create result-set benchmark.
- Create refusal benchmark.
- Create responsive browser tests.

### Product team

- Define target customer segments.
- Validate business-rule requirements.
- Measure task completion.
- Position the product.
- Prepare commercialization and pricing.

## 43. Final Technical Summary

QueryIQ in its current form is a reliable, frontend-only demonstration of a database analyst workspace. It demonstrates database connection, table exploration, natural-language query entry, SQL presentation, result rendering, structured refusal, quality inspection, and query history.

The central architectural decision is to keep frontend behavior deterministic and local. This makes the prototype stable, independent of model availability, and fast to demonstrate. The tradeoff is that real database upload and SQL execution are not implemented.

The project is ready for frontend evaluation and backend replacement. It should not be presented as a production text-to-SQL agent until real database parsing, schema linking, model orchestration, AST validation, read-only execution, persistence, authentication, and execution-result evaluation are implemented.
