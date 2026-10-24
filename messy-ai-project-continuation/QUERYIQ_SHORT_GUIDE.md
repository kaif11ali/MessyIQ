# QueryIQ: Short Project Explanation

## Project in One Line

QueryIQ is a frontend prototype that lets users explore messy databases and ask plain-English questions through a guided, SQL-transparent analyst interface.

## Why We Created It

Business users often need database answers but do not know SQL or database schemas. Real databases are also difficult because they contain cryptic columns, missing values, mixed formats, duplicates, and inconsistent business rules.

QueryIQ is designed to make database analysis:

- Easier for non-SQL users
- More understandable
- Easier to inspect and review
- Safer to execute
- Suitable for demo and future production use

## Problem Statement

The traditional process requires users to:

1. Understand database tables and columns.
2. Write valid SQL.
3. Search and correct dirty values.
4. Join related tables.
5. Interpret raw result rows.

This creates delays and can lead to incorrect reports.

## Our Solution

QueryIQ provides a workspace where users can:

- Connect a SQLite demo database
- Inspect tables and columns
- Preview sample records
- Ask questions in plain English
- View generated SQL
- Review result rows
- Identify destructive or unsupported requests
- Inspect data-quality issues
- Review previous query runs

## Main Features

### 1. Dashboard

Provides workspace navigation and quick access to:

- AI Analyst
- Databases
- Data Quality
- Query History

### 2. Database Explorer

Allows a user to:

- Select a SQLite-named file
- View a demo table profile
- Search tables
- Select a table
- Inspect column names and types
- Preview sample records
- Switch between demo database connections

### 3. AI Analyst

Allows a user to:

- Enter a natural-language question
- Run a deterministic demo analysis
- View a generated SQL statement
- View answer text
- View result rows
- Review execution time
- Submit suggested questions

Example:

```text
How many customers are in the table?
```

The interface shows the matching count, generated SQL, and result table.

### 4. Safe Refusal

Requests containing destructive operations such as delete, drop, update, insert, truncate, or alter are refused before demo analysis.

The UI explains:

- The operation is not allowed
- Only read-only analysis is permitted
- No SQL is generated

This demonstrates the safety-first direction of the final product.

### 5. Data Quality

Displays:

- Missing-value metrics
- Inconsistent-data metrics
- Mixed-date metrics
- Quality issue table
- Issue filtering
- Selected table column profile

The current values are demo-generated and not calculated from real database files.

### 6. History & Tests

Shows:

- Previous question
- Run status
- Returned row count
- Execution time
- Generated SQL
- Answer summary
- Filtered and searchable history

## How the Project Works

```text
User selects a demo database
        ↓
Database profile is loaded
        ↓
User asks a question
        ↓
Frontend identifies a demo response
        ↓
SQL and rows are displayed
        ↓
Result or refusal is saved to history
```

All behavior happens in the browser using React state and local storage.

## Why It Is Useful

- Makes database data easier to explore
- Avoids requiring SQL knowledge
- Shows how AI-generated SQL can remain visible and reviewable
- Separates answer, SQL, data, and safety status
- Works without a backend or API key
- Provides a reliable presentation for hackathon judges
- Creates a clear foundation for real database integration

## Target Users

- Operations teams
- Business analysts
- Startup founders
- Internal support teams
- Data-quality teams
- Researchers
- Students and trainees
- Teams receiving SQLite exports

## Real-World Vision

In the final backend-connected version, the project will:

- Parse real SQLite schemas
- Identify relevant tables and columns
- Match dirty values
- Generate SQL using an open-weight model
- Validate SQL before execution
- Run only bounded read-only queries
- Explain real results
- Refuse unsupported questions
- Save persistent query history
- Support PostgreSQL and MySQL later

## Advantages

- Local-first frontend
- No Python dependency
- No proprietary model API required
- Fast and reliable demonstration
- Clear, inspectable SQL
- Structured success and refusal states
- Clean and responsive workspace interface
- Easy to extend with a real backend

## Current Limitations

- Uploaded SQLite files are not parsed yet.
- SQL is not executed against real database rows yet.
- The AI model is not called in this version.
- Data-quality metrics are demo-generated.
- History and databases are stored only in browser local storage.
- Arbitrary joins and complex business rules are not supported yet.

These limits are intentional because the current version is a frontend-only prototype.

## Demo Explanation

A short explanation for judges or customers:

> QueryIQ is a frontend-first database analyst prototype built for messy database environments. It allows a user to connect a database, inspect its schema and records, ask questions in plain English, review generated SQL, and receive a clear answer or safety refusal. The current demo runs entirely in the browser, making the user experience reliable and easy to evaluate. Real SQLite execution and open-weight model integration can be connected behind the same interface in the next stage.

## Technology

- Next.js
- React
- TypeScript
- Tailwind CSS
- Lucide icons
- Browser local storage

## Final Goal

The final goal is to build a secure, execution-focused database analyst that turns messy real-world databases into understandable answers while keeping SQL visible, validation observable, and unsupported questions honest.
