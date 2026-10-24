"use client"

import { useEffect, useRef, useState } from "react"
import { AlertCircle, ArrowUpRight, Database, Filter, Gauge, Search, Table2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getQualityIssues, loadDemoState } from "@/lib/demo-store"

const overview = [
  { label: "Missing values", icon: AlertCircle },
  { label: "Inconsistent data", icon: Table2 },
  { label: "Mixed date formats", icon: Filter },
]

function goToDatabases() {
  window.dispatchEvent(new CustomEvent("queryiq:navigate", { detail: "Databases" }))
}

export function DataQualityPage() {
  const searchRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState(loadDemoState)
  const [selectedTable, setSelectedTable] = useState("")
  const [filter, setFilter] = useState("")

  useEffect(() => {
    const sync = () => setState(loadDemoState())
    window.addEventListener("storage", sync)
    return () => window.removeEventListener("storage", sync)
  }, [])

  const profile = state.activeDatabaseId ? state.profiles[state.activeDatabaseId] : undefined
  const issues = profile ? getQualityIssues(profile) : []
  const visibleIssues = issues.filter((issue) => `${issue.table} ${issue.column} ${issue.issue}`.toLowerCase().includes(filter.toLowerCase()))
  const activeDatabase = state.databases.find((database) => database.id === state.activeDatabaseId)
  const columns = profile?.tables.find((table) => table.name === selectedTable)?.columns ?? []

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Workspace health</p>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Data Quality</h1>
          <p className="mt-2 text-sm text-muted-foreground">Monitor data consistency and identify issues across your connected tables.</p>
        </div>
        <Badge variant="outline" className="w-fit border-border text-[11px] text-muted-foreground"><Database data-icon="inline-start" />{activeDatabase?.name ?? "No database connected"}</Badge>
      </div>

      <section aria-label="Data quality overview" className="mt-8 grid gap-3 md:grid-cols-3">
        {overview.map(({ label, icon: Icon }) => (
          <Card key={label} className="border-border bg-card shadow-none">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{issues.length ? issues.filter((issue) => issue.issue === label).reduce((sum, issue) => sum + issue.count, 0) : "—"}</p></div>
                <div className="rounded-md border border-border bg-background/50 p-2 text-muted-foreground"><Icon /></div>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Not available</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-border bg-card shadow-none">
          <CardHeader className="flex-col items-stretch gap-4 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div><CardTitle className="text-sm font-semibold">Quality issues</CardTitle><p className="mt-1 text-xs text-muted-foreground">Review detected issues by table and column.</p></div>
            <div className="flex gap-2"><div className="relative flex-1 sm:w-48"><Search className="absolute left-2.5 top-2.5 text-muted-foreground" /><input ref={searchRef} aria-label="Filter quality issues" value={filter} onChange={(event) => setFilter(event.target.value)} disabled={!profile} placeholder="Filter issues" className="h-8 w-full rounded-md border border-border bg-background/40 pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60" /></div><Button variant="outline" disabled={!profile} className="h-8 border-border px-2.5 text-xs"><Filter data-icon="inline-start" />Filter</Button></div>
          </CardHeader>
          <CardContent className="px-0 pb-0"><div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="border-y border-border bg-background/20 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Table name</th><th className="px-3 py-3 font-medium">Column</th><th className="px-3 py-3 font-medium">Issue type</th><th className="px-5 py-3 text-right font-medium">Count</th></tr></thead><tbody>{visibleIssues.length ? visibleIssues.map((issue, index) => <tr key={`${issue.table}-${issue.column}-${index}`} className="border-t border-border/60"><td className="px-5 py-3">{issue.table}</td><td className="px-3 py-3">{issue.column}</td><td className="px-3 py-3">{issue.issue}</td><td className="px-5 py-3 text-right">{issue.count}</td></tr>) : <tr><td colSpan={4} className="px-5 py-14 text-center"><p className="text-xs font-medium">{profile ? "No matching issues" : "No data available"}</p><p className="mt-1 text-[11px] text-muted-foreground">{profile ? "The current filter found no quality issues." : "Connect a database to inspect data quality issues."}</p></td></tr>}</tbody></table></div></CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm font-semibold">Selected table profile</CardTitle><p className="mt-1 text-xs text-muted-foreground">Column-level profiling for a selected table.</p></CardHeader><CardContent className="px-5 pb-5">{profile ? <><select aria-label="Select profile table" value={selectedTable} onChange={(event) => setSelectedTable(event.target.value)} className="mb-3 h-8 w-full rounded-md border border-border bg-background/40 px-3 text-xs"><option value="">Select table</option>{profile.tables.map((table) => <option key={table.name} value={table.name}>{table.name}</option>)}</select>{columns.length ? <div className="flex flex-col gap-2">{columns.map((column) => <div key={column.name} className="flex justify-between rounded-md border border-border/70 px-3 py-2 text-xs"><span>{column.name}</span><span className="text-muted-foreground">{column.type || "unknown"}</span></div>)}</div> : <p className="py-8 text-center text-xs text-muted-foreground">Select a table to view columns.</p>}</> : <div className="flex min-h-[170px] flex-col items-center justify-center rounded-md border border-dashed border-border px-5 text-center"><Gauge className="text-muted-foreground" /><p className="mt-3 text-xs font-medium">No table selected</p></div>}</CardContent></Card>
          <Card className="border-border bg-card shadow-none"><CardHeader className="flex-row items-center justify-between space-y-0 px-5 pb-3 pt-5"><div><CardTitle className="text-sm font-semibold">Suggested fixes</CardTitle><p className="mt-1 text-xs text-muted-foreground">Review before making changes.</p></div><ArrowUpRight className="text-muted-foreground" /></CardHeader><CardContent className="px-5 pb-5"><div className="rounded-md border border-dashed border-border px-4 py-7 text-center"><p className="text-xs font-medium">No suggestions available</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Suggestions will appear after a database is connected.</p></div></CardContent></Card>
        </div>
      </div>

      <Card className="mt-6 border-border bg-card shadow-none"><CardContent className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center"><div><p className="text-sm font-medium">Connect a database to inspect data quality</p><p className="mt-1 text-xs text-muted-foreground">QueryIQ will calculate quality metrics from your connected data.</p></div><Button variant="outline" className="h-8 border-border text-xs" onClick={goToDatabases}>Go to Databases <ArrowUpRight data-icon="inline-end" /></Button></CardContent></Card>
    </main>
  )
}
