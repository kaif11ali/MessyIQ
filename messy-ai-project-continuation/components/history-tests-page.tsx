"use client"

import { useEffect, useMemo, useState } from "react"
import { CheckCircle2, Clock3, FileClock, Filter, Search, ShieldAlert, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { loadDemoState, type AnalysisResult } from "@/lib/demo-store"

const filters = ["All", "Successful", "Failed", "Rejected"] as const

type FilterValue = (typeof filters)[number]

export function HistoryTestsPage() {
  const [activeFilter, setActiveFilter] = useState<FilterValue>("All")
  const [search, setSearch] = useState("")
  const [history, setHistory] = useState<AnalysisResult[]>(loadDemoState().history)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [selected, setSelected] = useState<AnalysisResult | null>(null)

  useEffect(() => {
    const syncHistory = () => setHistory(loadDemoState().history)
    syncHistory()
    window.addEventListener("storage", syncHistory)
    return () => window.removeEventListener("storage", syncHistory)
  }, [])

  const filteredResults = useMemo(() => history.filter((item) => {
    const matchesSearch = item.question.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = activeFilter === "All" || (activeFilter === "Successful" && item.status === "answer") || (activeFilter === "Failed" && item.status !== "answer" && item.error) || (activeFilter === "Rejected" && item.status === "rejected")
    return matchesSearch && matchesStatus
  }), [activeFilter, history, search])
  const hasHistory = history.length > 0

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Workspace activity</p>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">History &amp; Tests</h1>
          <p className="mt-2 text-sm text-muted-foreground">Review query runs and evaluate your analyst&apos;s answers.</p>
        </div>
        <Badge variant="outline" className="w-fit border-border text-[11px] text-muted-foreground"><FileClock data-icon="inline-start" />No query history</Badge>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="border-border bg-card shadow-none">
          <CardHeader className="flex-col items-stretch gap-4 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <div><CardTitle className="text-sm font-semibold">Query history</CardTitle><p className="mt-1 text-xs text-muted-foreground">Search and review executed analyst queries.</p></div>
            <div className="relative sm:w-56"><Search className="absolute left-2.5 top-2.5 text-muted-foreground" /><input aria-label="Search query history" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search history" className="h-8 w-full rounded-md border border-border bg-background/40 pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/70" /></div>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="flex gap-1 border-y border-border bg-background/20 px-5 py-2">
              {filters.map((filter) => <Button key={filter} variant={activeFilter === filter ? "secondary" : "ghost"} className="h-7 px-2.5 text-[11px]" onClick={() => setActiveFilter(filter)}>{filter}</Button>)}
              <Button type="button" variant="ghost" disabled className="ml-auto h-7 px-2.5 text-[11px] text-muted-foreground"><Filter data-icon="inline-start" />Filters unavailable</Button>
            </div>
            <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Question</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 text-right font-medium">Rows returned</th><th className="px-5 py-3 text-right font-medium">Execution time</th></tr></thead><tbody>{filteredResults.length > 0 ? filteredResults.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer border-t border-border/60 hover:bg-accent/40"><td className="max-w-[320px] truncate px-5 py-3 font-medium">{item.question}</td><td className="px-3 py-3"><Badge variant="outline" className="border-border text-[10px]">{item.status}</Badge></td><td className="px-3 py-3 text-right">{item.row_count}</td><td className="px-5 py-3 text-right text-muted-foreground">{item.execution_ms} ms</td></tr>) : <tr><td colSpan={4} className="px-5 py-14 text-center"><p className="text-xs font-medium">{hasError ? "Unable to load query history" : isLoading ? "Loading query history" : !hasHistory ? "No query history" : "No matching queries"}</p><p className="mt-1 text-[11px] text-muted-foreground">Run a question in AI Analyst to create a history entry.</p></td></tr>}</tbody></table></div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm font-semibold">Query details</CardTitle><p className="mt-1 text-xs text-muted-foreground">Select a run to inspect its generated SQL and result.</p></CardHeader><CardContent className="px-5 pb-5">{selected ? <div className="space-y-3"><p className="text-xs font-medium">{selected.answer}</p>{selected.error ? <p className="text-[11px] text-amber-300">{selected.error}</p> : null}<pre className="max-h-64 overflow-auto rounded-md border border-border bg-background/40 p-3 text-[10px] leading-5"><code>{selected.sql}</code></pre></div> : <div className="flex min-h-[190px] flex-col items-center justify-center rounded-md border border-dashed border-border px-5 text-center"><Clock3 className="text-muted-foreground" /><p className="mt-3 text-xs font-medium">No query selected</p><p className="mt-1 text-[11px] leading-5 text-muted-foreground">Generated SQL and validation outcomes will appear after a query is run.</p></div>}</CardContent></Card>
          <Card className="border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm font-semibold">Evaluation</CardTitle><p className="mt-1 text-xs text-muted-foreground">Calculated from completed test runs.</p></CardHeader><CardContent className="flex flex-col gap-2 px-5 pb-5">{[["SQL execution success", CheckCircle2], ["Answer correctness", ShieldAlert], ["Unanswerable rejection", XCircle]].map(([label, Icon]) => <div key={label as string} className="flex items-center justify-between rounded-md border border-border/70 bg-background/20 p-3"><div className="flex items-center gap-2.5"><Icon className="text-muted-foreground" /><span className="text-xs">{label as string}</span></div><span className="text-xs font-medium text-muted-foreground">—</span></div>)}<p className="pt-1 text-[11px] text-muted-foreground">No test runs available.</p></CardContent></Card>
        </div>
      </div>
    </main>
  )
}
