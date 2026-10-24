"use client"

import { useEffect, useState } from "react"
import {
  Activity,
  ArrowUpRight,
  ChevronDown,
  CircleHelp,
  Database,
  FileClock,
  Gauge,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Table2,
  TerminalSquare,
  X,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { AiAnalystPage } from "@/components/ai-analyst-page"
import { DatabaseExplorerPage } from "@/components/database-explorer-page"
import { DataQualityPage } from "@/components/data-quality-page"
import { HistoryTestsPage } from "@/components/history-tests-page"

const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "AI Analyst", icon: Sparkles },
  { label: "Databases", icon: Database },
  { label: "Data Quality", icon: Gauge },
  { label: "History & Tests", icon: FileClock },
]

function navigateTo(label: string) {
  window.dispatchEvent(new CustomEvent("queryiq:navigate", { detail: label }))
}

export default function Page() {
  const [active, setActive] = useState("Dashboard")
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleNavigation = (event: Event) => {
      const target = (event as CustomEvent<string>).detail
      if (navigation.some((item) => item.label === target)) setActive(target)
    }
    window.addEventListener("queryiq:navigate", handleNavigation)
    return () => window.removeEventListener("queryiq:navigate", handleNavigation)
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-border bg-sidebar px-3 py-4 transition-transform duration-200 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center justify-between px-2 pb-7">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Sparkles data-icon="inline-start" /></div>
            <span className="text-[15px] font-semibold tracking-tight">Query<span className="text-primary">IQ</span></span>
          </div>
          <button aria-label="Close navigation" className="text-muted-foreground lg:hidden" onClick={() => setMobileOpen(false)}><X /></button>
        </div>

        <nav aria-label="Main navigation" className="flex flex-col gap-1">
          <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Workspace</p>
          {navigation.map((item) => {
            const Icon = item.icon
            const isActive = active === item.label
            return <button key={item.label} type="button" aria-current={isActive ? "page" : undefined} onClick={() => { setActive(item.label); setMobileOpen(false) }} className={`flex h-9 items-center gap-3 rounded-md px-3 text-left text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isActive ? "bg-sidebar-accent text-foreground" : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"}`}><Icon data-icon="inline-start" />{item.label}</button>
          })}
        </nav>

        <div className="mt-auto flex flex-col gap-1">
          <Separator className="mb-3 bg-border/70" />
          <button className="flex h-9 items-center gap-3 rounded-md px-3 text-[13px] font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"><Settings data-icon="inline-start" />Settings</button>
          <div className="mt-3 rounded-lg border border-border/80 bg-background/30 p-3">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="size-2 rounded-full bg-muted-foreground" /><span className="text-[12px] font-medium">No databases connected</span></div><CircleHelp className="text-muted-foreground" /></div>
            <p className="mt-1.5 pl-4 text-[11px] text-muted-foreground">Connect a database to begin</p>
          </div>
        </div>
      </aside>

      <div className="lg:pl-[252px]">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/95 px-5 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3"><button aria-label="Open navigation" className="text-muted-foreground lg:hidden" onClick={() => setMobileOpen(true)}><Menu /></button><span className="text-sm font-medium">{active}</span></div>
          <div className="flex items-center gap-4"><button aria-label="Search" className="text-muted-foreground hover:text-foreground"><Search /></button><Separator orientation="vertical" className="h-5" /><div className="flex items-center gap-2"><Avatar className="size-7"><AvatarFallback className="bg-primary/15 text-[11px] font-semibold text-primary">TM</AvatarFallback></Avatar><span className="hidden text-xs font-medium sm:block">Tufail Malek</span><ChevronDown className="text-muted-foreground" /></div></div>
        </header>

        {active === "AI Analyst" ? (
          <AiAnalystPage />
        ) : active === "Databases" ? (
          <DatabaseExplorerPage />
        ) : active === "Data Quality" ? (
          <DataQualityPage />
        ) : active === "History & Tests" ? (
          <HistoryTestsPage />
        ) : (
          <main className="mx-auto max-w-[1440px] px-5 py-8 lg:px-8 lg:py-10">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Workspace overview</p><h1 className="text-2xl font-semibold tracking-tight lg:text-[28px]">Good morning, Tufail</h1><p className="mt-2 text-sm text-muted-foreground">Here&apos;s what&apos;s happening across your data workspace.</p></div><Button className="h-9 gap-2 bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90" onClick={() => navigateTo("AI Analyst")}><Plus data-icon="inline-start" />New analysis</Button></div>

          <section aria-label="Workspace statistics" className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {["Connected databases", "Queries executed", "Successful queries", "Data quality issues"].map((label) => <Card key={label} className="border-border bg-card shadow-none"><CardContent className="p-4"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">—</p></div><div className="rounded-md border border-border bg-background/50 p-2 text-muted-foreground"><Activity /></div></div><p className="mt-3 text-[11px] text-muted-foreground">Not available</p></CardContent></Card>)}
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_310px]">
            <Card className="border-border bg-card shadow-none"><CardHeader className="flex-row items-center justify-between space-y-0 px-5 pb-4 pt-5"><div><CardTitle className="text-sm font-semibold">Recent queries</CardTitle><p className="mt-1 text-xs text-muted-foreground">Your team&apos;s latest database analyses</p></div><Button variant="ghost" className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => navigateTo("History & Tests")}>View all <ArrowUpRight data-icon="inline-end" /></Button></CardHeader><CardContent className="px-0 pb-0"><div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-xs"><thead className="border-y border-border bg-background/20 text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Query</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 text-right font-medium">Rows returned</th><th className="px-5 py-3 text-right font-medium">Execution time</th></tr></thead><tbody><tr><td colSpan={4} className="px-5 py-12 text-center text-xs text-muted-foreground">No queries yet</td></tr></tbody></table></div></CardContent></Card>

            <div className="flex flex-col gap-6"><Card className="border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm font-semibold">Database connections</CardTitle></CardHeader><CardContent className="flex flex-col gap-3 px-5 pb-5"><div className="rounded-md border border-dashed border-border px-4 py-7 text-center"><p className="text-xs font-medium">No databases connected</p><p className="mt-1 text-[11px] text-muted-foreground">Connect a database to see connection details.</p></div><Button variant="outline" className="mt-1 h-8 w-full border-border text-xs" onClick={() => navigateTo("Databases")}><Plus data-icon="inline-start" />Connect database</Button></CardContent></Card><Card className="border-border bg-card shadow-none"><CardHeader className="px-5 pb-3 pt-5"><CardTitle className="text-sm font-semibold">Quick actions</CardTitle></CardHeader><CardContent className="grid gap-2 px-5 pb-5"><Button variant="outline" className="h-9 justify-start gap-2 border-border text-xs" onClick={() => navigateTo("AI Analyst")}><Sparkles data-icon="inline-start" />Ask AI Analyst</Button><Button variant="outline" className="h-9 justify-start gap-2 border-border text-xs" onClick={() => navigateTo("Data Quality")}><Table2 data-icon="inline-start" />Explore data quality</Button></CardContent></Card></div>
          </div>
          </main>
        )}
      </div>
    </div>
  )
}

