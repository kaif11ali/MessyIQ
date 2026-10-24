"use client"

export type ColumnProfile = {
  name: string
  type: string
  primary_key: boolean
  nullable: boolean
  samples: string[]
}

export type TableProfile = {
  name: string
  row_count: number
  columns: ColumnProfile[]
}

export type DatabaseProfile = { tables: TableProfile[] }

export type DatabaseSummary = {
  id: string
  name: string
  table_count: number
  row_count: number
}

export type AnalysisResult = {
  id: string
  question: string
  status: "answer" | "rejected"
  answer: string
  sql: string
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  error?: string
  execution_ms: number
  strategy: string
}

export type QualityIssue = {
  table: string
  column: string
  issue: string
  count: number
}

export type DemoState = {
  activeDatabaseId: string | null
  databases: DatabaseSummary[]
  profiles: Record<string, DatabaseProfile>
  previews: Record<string, Record<string, unknown>[]>
  history: AnalysisResult[]
  qualityIssues: QualityIssue[]
}

const STORAGE_KEY = "queryiq-demo-state"

const demoProfile: DatabaseProfile = {
  tables: [
    {
      name: "customers",
      row_count: 2,
      columns: [
        { name: "id", type: "INTEGER", primary_key: true, nullable: false, samples: ["1", "2"] },
        { name: "name", type: "TEXT", primary_key: false, nullable: false, samples: ["CA", "TX"] },
        { name: "region", type: "TEXT", primary_key: false, nullable: false, samples: ["West", "South"] },
      ],
    },
  ],
}

const initialState: DemoState = {
  activeDatabaseId: null,
  databases: [],
  profiles: {},
  previews: {},
  history: [],
  qualityIssues: [],
}

export function loadDemoState(): DemoState {
  if (typeof window === "undefined") return initialState
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY)
    return saved ? (JSON.parse(saved) as DemoState) : initialState
  } catch {
    return initialState
  }
}

export function saveDemoState(state: DemoState) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function clearDemoState() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(STORAGE_KEY)
}

export function createDemoDatabase(fileName: string): { stateDatabase: DatabaseSummary; profile: DatabaseProfile } {
  const stateDatabase = {
    id: `demo-${Date.now()}`,
    name: fileName,
    table_count: demoProfile.tables.length,
    row_count: demoProfile.tables.reduce((sum, table) => sum + table.row_count, 0),
  }
  return { stateDatabase, profile: demoProfile }
}

export function createPreview(profile: DatabaseProfile) {
  const preview: Record<string, Record<string, unknown>[]> = {}
  for (const table of profile.tables) {
    preview[table.name] = table.columns.map((column) => ({
      [table.name]: table.name,
      [column.name]: column.samples[0] ?? "—",
    }))
  }
  preview.customers = [
    { id: 1, name: "CA", region: "West" },
    { id: 2, name: "TX", region: "South" },
  ]
  return preview
}

export function getQualityIssues(profile: DatabaseProfile): QualityIssue[] {
  return profile.tables.flatMap((table) =>
    table.columns.flatMap((column) => {
      const issues: QualityIssue[] = []
      if (column.samples.some((sample) => sample.trim().length === 0)) {
        issues.push({ table: table.name, column: column.name, issue: "Missing values", count: 2 })
      }
      if (column.samples.some((sample) => /n\/a/i.test(sample))) {
        issues.push({ table: table.name, column: column.name, issue: "Inconsistent data", count: 3 })
      }
      if (/date|time/i.test(column.name)) {
        issues.push({ table: table.name, column: column.name, issue: "Mixed date formats", count: 4 })
      }
      return issues
    }),
  )
}

export function analyzeDemo(question: string): AnalysisResult {
  const started = performance.now()
  const normalized = question.trim().toLowerCase()
  const destructive = /\b(delete|drop|update|insert|alter|truncate|attach|detach)\b/.test(normalized)
  if (destructive) {
    return {
      id: `query-${Date.now()}`,
      question,
      status: "rejected",
      answer: "The requested database operation is not allowed.",
      sql: "",
      columns: [],
      rows: [],
      row_count: 0,
      error: "Only read-only SELECT analysis is permitted.",
      execution_ms: 1,
      strategy: "Frontend safety refusal",
    }
  }

  let sql = 'SELECT "id", "name", "region" FROM "customers" LIMIT 100'
  let columns = ["id", "name", "region"]
  let rows: Record<string, unknown>[] = [
    { id: 1, name: "CA", region: "West" },
    { id: 2, name: "TX", region: "South" },
  ]
  let answer = "Found 2 customer records."

  if (/how many|count|number of/.test(normalized)) {
    sql = 'SELECT COUNT(*) AS "count" FROM "customers"'
    columns = ["count"]
    rows = [{ count: 2 }]
    answer = "The result is 2 customer records."
  } else if (/west/.test(normalized)) {
    sql = 'SELECT "id", "name", "region" FROM "customers" WHERE "region" = \'West\''
    columns = ["id", "name", "region"]
    rows = [{ id: 1, name: "CA", region: "West" }]
    answer = "Found 1 customer in the West region."
  } else if (/south/.test(normalized)) {
    sql = 'SELECT "id", "name", "region" FROM "customers" WHERE "region" = \'South\''
    columns = ["id", "name", "region"]
    rows = [{ id: 2, name: "TX", region: "South" }]
    answer = "Found 1 customer in the South region."
  }

  return {
    id: `query-${Date.now()}`,
    question,
    status: "answer",
    answer,
    sql,
    columns,
    rows,
    row_count: rows.length,
    execution_ms: Math.max(1, Math.round(performance.now() - started)),
    strategy: "Interactive frontend demo",
  }
}
