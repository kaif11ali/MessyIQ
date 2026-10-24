"use client"

import { useEffect, useState } from "react"
import { AlertCircle, ArrowUpRight, Database, History, LoaderCircle, Send, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { analyzeDemo, loadDemoState, saveDemoState, type AnalysisResult } from "@/lib/demo-store"

const suggestions = [
  "Show me revenue growth by region this quarter",
  "Which customers have duplicate records?",
  "Find orders with missing shipping addresses",
]

export function AiAnalystPage() {
  const [prompt, setPrompt] = useState("")
  const [state, setState] = useState(loadDemoState)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => saveDemoState(state), [state])

  async function runAnalysis() {
    if (!prompt.trim() || !state.activeDatabaseId) return
    setIsRunning(true)
    setError("")
    setResult(null)
    try {
      const nextResult = analyzeDemo(prompt)
      setResult(nextResult)
      setState((current) => ({ ...current, history: [nextResult, ...current.history] }))
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Analysis failed")
    } finally {
      setIsRunning(false)
    }
  }

  const activeDatabase = state.databases.find((database) => database.id === state.activeDatabaseId)

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">AI-powered analysis</p>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">AI Analyst</h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">Ask questions about your data in plain English.</p>
        </div>
        <Button type="button" variant="outline" className="h-9 gap-2 border-border px-4 text-xs font-semibold" onClick={() => window.dispatchEvent(new CustomEvent("queryiq:navigate", { detail: "History & Tests" }))}><History data-icon="inline-start" />Analysis history</Button>
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="flex flex-col gap-6">
          <Card className="border-primary/30 bg-card shadow-none">
            <CardHeader className="px-5 pb-3 pt-5">
              <div className="flex items-center justify-between"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="text-primary" />New analysis</CardTitle><Badge variant="outline" className="border-border text-[10px] text-muted-foreground"><Database data-icon="inline-start" /> {activeDatabase?.name ?? "No database connected"}</Badge></div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <textarea aria-label="Analysis question" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask a question about your data..." className="min-h-[144px] w-full resize-none rounded-md border border-border bg-background/50 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-primary/50" />
              <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-center"><p className="text-[11px] text-muted-foreground">{activeDatabase ? `Analyzing ${activeDatabase.table_count} tables in read-only mode.` : "Connect a database to run an analysis."}</p><Button disabled={!prompt.trim() || !state.activeDatabaseId || isRunning} onClick={() => void runAnalysis()} className="h-9 gap-2 bg-primary px-4 text-xs font-semibold text-primary-foreground">{isRunning ? <LoaderCircle className="animate-spin" /> : <Send data-icon="inline-start" />} {isRunning ? "Running" : "Run analysis"}</Button></div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm font-semibold">Try asking</CardTitle><p className="mt-1 text-xs text-muted-foreground">Suggested questions are available once a database is connected.</p></CardHeader><CardContent className="grid gap-2 px-5 pb-5">{suggestions.map((suggestion) => <button key={suggestion} onClick={() => setPrompt(suggestion)} className="flex items-center justify-between rounded-md border border-border/70 bg-background/20 px-3 py-2.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"><span>{suggestion}</span><ArrowUpRight className="shrink-0 text-muted-foreground" /></button>)}</CardContent></Card>
        </div>

        <Card className="h-fit border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm font-semibold">Analysis results</CardTitle><p className="mt-1 text-xs text-muted-foreground">Verified output and generated SQL.</p></CardHeader><CardContent className="px-5 pb-5">{error ? <div className="flex gap-3 rounded-md border border-destructive/40 bg-destructive/5 p-4 text-xs text-destructive"><AlertCircle className="shrink-0" /><span>{error}</span></div> : result ? <div className="space-y-4"><div className={`rounded-md border p-4 ${result.status === "answer" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold">{result.status === "answer" ? "Analysis complete" : "Query rejected"}</p><Badge variant="outline" className="border-border text-[10px]">{result.execution_ms} ms</Badge></div><p className="mt-3 text-xs leading-5 text-foreground">{result.answer}</p>{result.error ? <p className="mt-2 text-[11px] leading-5 text-amber-300">{result.error}</p> : null}</div><div><p className="mb-2 text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">Generated SQL</p><pre className="max-h-52 overflow-auto rounded-md border border-border bg-background/50 p-3 text-[11px] leading-5 text-foreground"><code>{result.sql || "No SQL was generated."}</code></pre></div>{result.rows.length > 0 ? <div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[440px] text-left text-xs"><thead className="border-b border-border bg-background/30 text-[10px] uppercase text-muted-foreground"><tr>{result.columns.map((column) => <th key={column} className="px-3 py-2.5 font-medium">{column}</th>)}</tr></thead><tbody>{result.rows.map((row, index) => <tr key={index} className="border-b border-border/50">{result.columns.map((column) => <td key={column} className="max-w-52 truncate px-3 py-2.5">{String(row[column] ?? "—")}</td>)}</tr>)}</tbody></table></div> : <p className="text-xs text-muted-foreground">No result rows.</p>}<p className="text-[10px] text-muted-foreground">{result.strategy}</p></div> : <div className="rounded-md border border-dashed border-border p-6 text-center"><p className="text-sm font-medium">{activeDatabase ? "Ready to analyze" : "Connect a database to begin"}</p><p className="mt-2 text-xs text-muted-foreground">No data available</p>{activeDatabase ? null : <Button variant="outline" className="mt-4 h-8 border-border text-xs" onClick={() => window.dispatchEvent(new CustomEvent("queryiq:navigate", { detail: "Databases" }))}>Go to Databases</Button>}</div>}</CardContent></Card>
      </div>
    </main>
  )
}
