"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronRight, Database, FileUp, Search, Table2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createDemoDatabase, createPreview, loadDemoState, saveDemoState, type TableProfile } from "@/lib/demo-store"

export function DatabaseExplorerPage() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState(loadDemoState)
  const [selectedTable, setSelectedTable] = useState<TableProfile | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => saveDemoState(state), [state])

  const activeId = state.activeDatabaseId
  const activeDatabase = state.databases.find((database) => database.id === activeId)
  const profile = activeId ? state.profiles[activeId] : undefined
  const preview = activeId && selectedTable ? state.previews[`${activeId}:${selectedTable.name}`] ?? [] : []

  function connectFile(file: File | undefined) {
    if (!file) return
    const { stateDatabase, profile: demoProfile } = createDemoDatabase(file.name)
    const tablePreviews = createPreview(demoProfile)
    setState((current) => {
      const previews = { ...current.previews }
      for (const table of demoProfile.tables) previews[`${stateDatabase.id}:${table.name}`] = tablePreviews[table.name] ?? []
      return {
        ...current,
        activeDatabaseId: stateDatabase.id,
        databases: [stateDatabase, ...current.databases],
        profiles: { ...current.profiles, [stateDatabase.id]: demoProfile },
        previews,
      }
    })
    setSelectedTable(null)
  }

  return (
    <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Workspace data</p>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Databases</h1>
          <p className="mt-2 text-sm text-muted-foreground">Inspect your database schema and data.</p>
        </div>
        <div>
          <input ref={inputRef} type="file" accept=".db,.sqlite,.sqlite3,application/x-sqlite3" className="sr-only" onChange={(event) => { connectFile(event.target.files?.[0]); event.target.value = "" }} />
          <Button type="button" className="h-9 gap-2 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90" onClick={() => inputRef.current?.click()}>
            <FileUp data-icon="inline-start" />Select SQLite file
          </Button>
        </div>
      </div>

      {activeDatabase ? <Card className="mt-8 border-border bg-card shadow-none"><CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><div className="rounded-md border border-border bg-background/50 p-2 text-muted-foreground"><FileUp /></div><div><p className="text-xs font-medium">{activeDatabase.name}</p><p className="mt-1 text-[11px] text-muted-foreground">{activeDatabase.table_count} demo table · {activeDatabase.row_count} rows</p></div></div><Badge variant="outline" className="w-fit border-border text-[10px] text-muted-foreground"><Check data-icon="inline-start" /> Demo connected</Badge></CardContent></Card> : null}

      <div className="mt-8 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="h-fit border-border bg-card shadow-none">
          <CardHeader className="px-5 pb-3 pt-5"><div className="flex items-center justify-between"><CardTitle className="text-sm font-semibold">Tables</CardTitle><Badge variant="secondary" className="text-[10px]">{profile?.tables.length ?? 0}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Tables from the connected database</p></CardHeader>
          <CardContent className="px-5 pb-5">{profile ? <div className="flex max-h-[420px] flex-col gap-1 overflow-y-auto">{profile.tables.filter((table) => table.name.toLowerCase().includes(search.toLowerCase())).map((table) => <button key={table.name} type="button" onClick={() => setSelectedTable(table)} className={`flex items-center justify-between rounded-md px-3 py-2.5 text-left text-xs transition-colors ${selectedTable?.name === table.name ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}><span className="flex min-w-0 items-center gap-2"><Table2 className="shrink-0" /><span className="truncate">{table.name}</span></span><span className="ml-2 shrink-0 text-[10px]">{table.row_count}</span></button>)}</div> : <div className="rounded-md border border-dashed border-border px-4 py-8 text-center"><Table2 className="mx-auto text-muted-foreground" /><p className="mt-3 text-xs font-medium">No database connected</p><p className="mt-1 text-[11px] text-muted-foreground">Connect a SQLite database to view tables.</p></div>}</CardContent>
        </Card>

        <Card className="border-border bg-card shadow-none">
          <CardHeader className="flex-col items-stretch gap-4 px-5 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between sm:gap-3"><div><CardTitle className="text-sm font-semibold">Table explorer</CardTitle><p className="mt-1 text-xs text-muted-foreground">Select a table to inspect its columns and records.</p></div><div className="relative sm:w-52"><Search className="absolute left-2.5 top-2.5 text-muted-foreground" /><input aria-label="Search tables" value={search} onChange={(event) => setSearch(event.target.value)} disabled={!profile} placeholder="Search tables" className="h-8 w-full rounded-md border border-border bg-background/40 pl-8 pr-3 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 disabled:cursor-not-allowed disabled:opacity-60" /></div></CardHeader>
          <CardContent className="px-5 pb-5">{selectedTable ? <div className="overflow-x-auto"><div className="mb-3 flex flex-wrap gap-2">{selectedTable.columns.map((column) => <Badge key={column.name} variant="outline" className="border-border text-[10px] text-muted-foreground">{column.name}: {column.type || "unknown"}</Badge>)}</div><table className="w-full min-w-[640px] text-left text-xs"><thead className="border-y border-border bg-background/20 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr>{selectedTable.columns.map((column) => <th key={column.name} className="whitespace-nowrap px-3 py-3 font-medium">{column.name}</th>)}</tr></thead><tbody>{preview.map((row, index) => <tr key={index} className="border-b border-border/60">{selectedTable.columns.map((column) => <td key={column.name} className="max-w-56 truncate px-3 py-3">{String(row[column.name] ?? "—")}</td>)}</tr>)}</tbody></table>{preview.length === 0 ? <p className="py-10 text-center text-xs text-muted-foreground">The table is empty.</p> : null}</div> : <div className="flex min-h-[260px] flex-col items-center justify-center rounded-md border border-dashed border-border px-6 text-center"><div className="rounded-full border border-border bg-background/50 p-3 text-muted-foreground"><Database /></div><p className="mt-4 text-sm font-medium">{profile ? "Select a table" : "No database connected"}</p><p className="mt-2 max-w-sm text-xs leading-5 text-muted-foreground">{profile ? "Choose a table to view its schema and a preview of records." : "Connect a SQLite database to see its schema, row counts, and a preview of records."}</p>{profile ? null : <Button variant="outline" className="mt-5 h-8 border-border text-xs" onClick={() => inputRef.current?.click()}><FileUp data-icon="inline-start" />Connect database</Button>}</div>}</CardContent>
        </Card>
      </div>

      {state.databases.length > 0 ? <div className="mt-6 flex flex-wrap gap-2">{state.databases.map((database) => <Button key={database.id} size="sm" variant={database.id === activeId ? "secondary" : "outline"} onClick={() => { setState((current) => ({ ...current, activeDatabaseId: database.id })); setSelectedTable(null) }}>{database.name}</Button>)}</div> : null}

      <Card className="mt-6 border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="flex items-center gap-2 text-sm font-semibold"><Check className="text-muted-foreground" />Connection status</CardTitle></CardHeader><CardContent className="px-5 pb-5"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className={`size-2 rounded-full ${profile ? "bg-emerald-500" : "bg-muted-foreground"}`} />{activeDatabase ? `${activeDatabase.name} connected` : "No database connected"}<ChevronRight className="ml-auto" /></div></CardContent></Card>
    </main>
  )
}
