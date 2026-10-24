"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Database,
  GraduationCap,
  Menu,
  MessageSquareText,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { isWorkspaceDomain, type WorkspaceDashboard, type WorkspaceDomain } from "@/lib/organization-analytics";

type DashboardData = WorkspaceDashboard;

type AnalysisResponse = {
  answer: string;
  answerType?: "human_review_required";
  safeguard?: string;
  aiNotice?: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  rows: Array<Record<string, string | number>>;
  evidence: { sourceRows: number; latestStatusRows: number; dataQuality: number };
  source: "demo" | "supabase" | "none";
};

type ConnectionCheck = { configured: boolean; connected: boolean; message: string };

const domains: Array<{ id: WorkspaceDomain; label: string }> = [
  { id: "education", label: "Education" },
  { id: "retail", label: "Retail" },
  { id: "workforce", label: "Workforce" },
  { id: "operations", label: "Operations" },
];

const suggestions: Record<WorkspaceDomain, string[]> = {
  education: ["How many students are active by program?", "What are the recorded reasons for leaving?", "Which groups have support signals?"],
  retail: ["How many orders are still processing?", "Which product groups have the most returns?", "What follow-up reasons are recorded?"],
  workforce: ["How many engagements are active by department?", "What exit reasons are documented?", "Which departments have open follow-ups?"],
  operations: ["How many work orders are open by facility?", "What are the common recorded issue types?", "Which work needs a human safety review?"],
};

export default function Home() {
  const [domain, setDomain] = useState<WorkspaceDomain>("education");
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [testingConnections, setTestingConnections] = useState(false);
  const [connections, setConnections] = useState<{ supabase: ConnectionCheck; groq: ConnectionCheck } | null>(null);

  useEffect(() => {
    void fetchDashboard(domain)
      .then(setDashboard)
      .catch((error: unknown) => {
        setDashboardError(error instanceof Error ? error.message : "Dashboard could not load.");
      });
  }, [domain]);

  async function loadDashboard() {
    setRefreshing(true);
    setDashboardError("");
    try {
      setDashboard(await fetchDashboard(domain));
    } catch (error) {
      setDashboardError(error instanceof Error ? error.message : "Dashboard could not load.");
    } finally {
      setRefreshing(false);
    }
  }

  async function askAnalyst(prompt = question) {
    const cleanQuestion = prompt.trim();
    if (!cleanQuestion || loading) return;
    setQuestion(cleanQuestion);
    setAnalysis(null);
    setAnalysisError("");
    setLoading(true);
    try {
      const response = await fetch("/api/analyst", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: cleanQuestion, domain }),
      });
      const payload = await response.json() as AnalysisResponse & { error?: string };
      if (!response.ok) throw new Error(payload.error ?? "The analyst could not complete that request.");
      setAnalysis(payload);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : "The analyst service is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  async function testConnections() {
    setTestingConnections(true);
    try {
      const response = await fetch("/api/connections", { method: "POST", cache: "no-store" });
      const result = await response.json() as { supabase: ConnectionCheck; groq: ConnectionCheck };
      if (!response.ok) throw new Error("Connection check could not complete.");
      setConnections(result);
    } catch (error) {
      setConnections({
        supabase: { configured: false, connected: false, message: error instanceof Error ? error.message : "Connection check failed." },
        groq: { configured: false, connected: false, message: "Connection check failed." },
      });
    } finally {
      setTestingConnections(false);
    }
  }

  const maxPeriod = Math.max(1, ...(dashboard?.periods.map(({ records }) => records) ?? [1]));
  const maxGroup = Math.max(1, ...(dashboard?.groups.map(({ records }) => records) ?? [1]));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><BookOpen size={18} /></span>
          <span>MessyIQ</span>
          <span className="brand-tag">ANALYTICS</span>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <a className="nav-item active" href="#overview" onClick={() => setMobileNav(false)}><Activity size={16} /> Overview</a>
        <a className="nav-item" href="#programs" onClick={() => setMobileNav(false)}><GraduationCap size={16} /> Categories</a>
        <a className="nav-item" href="#analyst" onClick={() => setMobileNav(false)}><MessageSquareText size={16} /> Ask the analyst</a>
        <div className="sidebar-note">
          <span className="note-mark"><ShieldCheck size={15} /></span>
          <strong>Built for careful decisions.</strong>
          <p>Answers use verified student aggregates. Student-level records stay out of AI prompts.</p>
        </div>
        <div className="sidebar-bottom">
          <span className={`connection-dot ${dashboard?.source === "supabase" ? "connected" : ""}`} />
          <div><strong>{dashboard?.source === "supabase" ? "Live data connected" : dashboard?.source === "demo" ? "Demo data" : "Checking connection"}</strong>
            <small>{dashboard?.source === "supabase" ? "Supabase · read-only" : dashboard?.source === "demo" ? "Connect Supabase for live insights" : "Education workspace"}</small></div>
          <Database size={15} />
        </div>
      </aside>

      {mobileNav && <button className="nav-backdrop" onClick={() => setMobileNav(false)} aria-label="Close menu" />}

      <main className="main-stage" id="overview">
        <header className="topbar">
          <button className="icon-button menu-button" onClick={() => setMobileNav(true)} aria-label="Open menu"><Menu size={19} /></button>
          <div className="breadcrumbs">Workspace <ChevronRight size={13} /> {domains.find((item) => item.id === domain)?.label}</div>
          <div className="top-actions">
            <label className="domain-picker-label" htmlFor="domain-picker">DATA CATEGORY</label>
            <select
              id="domain-picker"
              className="domain-picker"
              value={domain}
              onChange={(event) => {
                const selectedDomain = event.target.value;
                if (!isWorkspaceDomain(selectedDomain)) return;
                setDashboard(null);
                setDashboardError("");
                setAnalysis(null);
                setDomain(selectedDomain);
              }}
            >
              {domains.map(({ id, label }) => <option value={id} key={id}>{label}</option>)}
            </select>
            {dashboard && <span className={`source-badge ${dashboard.source}`}><i />{dashboard.source === "supabase" ? "Supabase live" : "Sample data"}</span>}
            <button className="icon-button" onClick={() => void loadDashboard()} aria-label="Refresh dashboard" disabled={refreshing}><RefreshCw size={16} className={refreshing ? "spin" : ""} /></button>
            <button className="test-connection-button" onClick={() => void testConnections()} disabled={testingConnections}>
              <CircleHelp size={15} />{testingConnections ? "Checking…" : "Test APIs"}
            </button>
          </div>
        </header>

        <div className="page-scroll">
          <section className="page-heading">
            <div>
              <span className="eyebrow">{dashboard?.domainLabel.toUpperCase() ?? "MULTI-INDUSTRY"} OVERVIEW</span>
              <h1>{domain === "education" ? "Make the next student decision count." : `A clearer view of ${domain} operations.`}</h1>
              <p>Evidence-led summaries for people to review, never automated verdicts.</p>
            </div>
            <div className="heading-aside"><span className="period-mark" /><div><small>LAST REFRESHED</small><strong>{dashboard ? new Date(dashboard.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Loading data…"}</strong></div></div>
          </section>

          {dashboardError && <div className="error-banner" role="alert"><AlertTriangle size={17} /><span>{dashboardError}</span><button onClick={() => void loadDashboard()}>Try again</button></div>}
          {connections && <div className="connection-results" aria-live="polite">
            <div className={connections.supabase.connected ? "connection-ok" : "connection-pending"}><strong>Supabase {connections.supabase.connected ? "connected" : "not connected"}</strong><span>{connections.supabase.message}</span></div>
            <div className={connections.groq.connected ? "connection-ok" : "connection-pending"}><strong>Groq {connections.groq.connected ? "connected" : "not connected"}</strong><span>{connections.groq.message}</span></div>
          </div>}

          <section className="stats-grid" aria-label={`${dashboard?.domainLabel ?? "Workspace"} overview metrics`}>
            <article className="stat-card stat-primary">
              <div className="stat-top"><span>{dashboard?.unit ?? "Records"} represented</span><span className="stat-icon"><Users size={16} /></span></div>
              <strong>{dashboard ? dashboard.totals.records.toLocaleString() : "—"}</strong>
              <small>{dashboard?.domain === "education" ? "Unique latest-status records" : "Synthetic records in selected category"}</small>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>{dashboard?.activeLabel ?? "Active"}</span><span className="stat-icon"><Activity size={16} /></span></div>
              <strong>{dashboard ? dashboard.totals.active.toLocaleString() : "—"}</strong>
              <small>Based on recorded status</small>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>{dashboard?.completedLabel ?? "Completed"}</span><span className="stat-icon"><GraduationCap size={17} /></span></div>
              <strong>{dashboard ? dashboard.totals.completed.toLocaleString() : "—"}</strong>
              <small>{dashboard ? `${dashboard.totals.completionRate}% of records shown` : "Latest status recorded"}</small>
            </article>
            <article className="stat-card stat-attention">
              <div className="stat-top"><span>{dashboard?.reviewLabel ?? "Review signals"}</span><span className="stat-icon"><AlertTriangle size={16} /></span></div>
              <strong>{dashboard ? dashboard.totals.review.toLocaleString() : "—"}</strong>
              <small>Context for a qualified human review</small>
            </article>
          </section>

          <section className="insight-grid">
            <article className="panel cohort-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">RECORD TIMELINE</span><h2>{dashboard?.domain === "education" ? "Students by cohort" : "Records by year"}</h2><p>{dashboard?.domain === "education" ? "Admission year · latest status per student" : "Year recorded in the selected category"}</p></div>
                <span className="panel-icon"><Activity size={17} /></span>
              </div>
              {dashboard?.periods.length ? <div className="cohort-list">
                {dashboard.periods.map(({ year, records }, index) => <div className="cohort-row" key={year}>
                  <span className="cohort-year">{year}</span>
                  <div className="bar-track"><span className={`bar-fill shade-${index % 4}`} style={{ width: `${Math.max(4, (records / maxPeriod) * 100)}%` }} /></div>
                  <strong>{records}</strong>
                </div>)}
              </div> : <div className="chart-empty">{dashboardError ? "Data is unavailable." : "Loading cohort data…"}</div>}
              <div className="panel-foot"><span>{dashboard?.domain === "education" ? "Intake size" : "Records by period"}</span><span>{dashboard?.unit ?? "Records"}</span></div>
            </article>

            <article className="panel status-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">CURRENT STATUS</span><h2>Where records stand</h2><p>Distribution by recorded status</p></div>
                <span className="panel-icon"><ShieldCheck size={17} /></span>
              </div>
              <div className="status-list">
                {dashboard?.statuses.length ? dashboard.statuses.map(({ name, records }) => <div className="status-row" key={name}>
                  <span className="status-name"><i className={`status-indicator status-${name.toLowerCase().replaceAll(" ", "-")}`} />{name}</span>
                  <span className="status-track"><i style={{ width: `${Math.max(4, (records / Math.max(1, dashboard.totals.records)) * 100)}%` }} /></span>
                  <strong>{records}</strong>
                </div>) : <div className="chart-empty">{dashboardError ? "Data is unavailable." : "Loading status data…"}</div>}
              </div>
              <div className="panel-foot"><span>{dashboard?.domain === "education" ? "Latest status only" : "Recorded status"}</span><span>Counts</span></div>
            </article>
          </section>

          <section className="panel programs-panel" id="programs">
            <div className="panel-heading programs-heading">
              <div><span className="eyebrow">{dashboard?.segmentLabel.toUpperCase() ?? "CATEGORY"} MIX</span><h2>Records by {dashboard?.segmentLabel.toLowerCase() ?? "category"}</h2><p>Counts and active records in each group</p></div>
              <a href="#analyst" className="text-link">Explore with analyst <ArrowUpRight size={14} /></a>
            </div>
            {dashboard?.groups.length ? <div className="program-list">
              {dashboard.groups.map(({ name, records, active }) => <div className="program-row" key={name}>
                <span className="program-name">{name}</span>
                <div className="program-track"><span style={{ width: `${Math.max(3, (records / maxGroup) * 100)}%` }} /></div>
                <strong>{records}</strong><span className="program-active"><span>{active}</span> active</span>
              </div>)}
            </div> : <div className="chart-empty">{dashboardError ? "Program data is unavailable." : "Loading program data…"}</div>}
          </section>

          <section className="analyst-panel" id="analyst">
            <div className="analyst-intro">
              <span className="analyst-icon"><Sparkles size={16} /></span>
              <div><span className="eyebrow">MESSYIQ ANALYST</span><h2>Ask a question, get evidence.</h2><p>Only verified aggregate data from {dashboard?.domainLabel.toLowerCase() ?? "this category"} is used to answer.</p></div>
            </div>
            <div className="analyst-box">
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void askAnalyst(); } }} placeholder={`Ask about ${dashboard?.domainLabel.toLowerCase() ?? "this category"} records…`} aria-label={`Ask about ${dashboard?.domainLabel.toLowerCase() ?? "workspace"} data`} />
              <button className="send-button" onClick={() => void askAnalyst()} disabled={!question.trim() || loading} aria-label="Send question">{loading ? <RefreshCw size={17} className="spin" /> : <Send size={16} />}</button>
            </div>
            <div className="suggestion-list"><span>Try asking</span>{suggestions[domain].map((item) => <button key={item} onClick={() => { setQuestion(item); void askAnalyst(item); }}>{item}</button>)}</div>
            {analysisError && <div className="analysis-error" role="alert"><AlertTriangle size={16} />{analysisError}</div>}
            {loading && <div className="analysis-loading">Checking policy and verified {dashboard?.domainLabel.toLowerCase() ?? "workspace"} aggregates…</div>}
            {analysis && <div className="analysis-result">
              <div className="result-title"><span><Check size={14} /> {analysis.answerType === "human_review_required" ? "Human review required" : "Verified answer"}</span><small>{analysis.source === "supabase" ? "Supabase data" : analysis.source === "demo" ? "Sample data" : "No lookup performed"}</small></div>
              <p>{analysis.answer}</p>
              {analysis.aiNotice && <div className="ai-notice"><Sparkles size={13} />{analysis.aiNotice}</div>}
              {analysis.safeguard && <div className="safeguard-note"><ShieldCheck size={14} />{analysis.safeguard}</div>}
              <div className="result-metrics">{analysis.metrics.map((metric) => <div key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.detail}</span></div>)}</div>
              {analysis.rows.length > 0 && <div className="result-table-wrap"><table><thead><tr>{Object.keys(analysis.rows[0]).map((key) => <th key={key}>{key.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{analysis.rows.map((row, index) => <tr key={index}>{Object.values(row).map((value, cellIndex) => <td key={cellIndex}>{value}</td>)}</tr>)}</tbody></table></div>}
              {analysis.evidence.sourceRows > 0 && <small className="result-evidence">{analysis.evidence.sourceRows} source records · {analysis.evidence.dataQuality}% data completeness</small>}
            </div>}
          </section>

          <footer className="page-footer" id="data-source">
            <span><ShieldCheck size={14} /> Aggregate-only, read-only analysis. No person-level verdicts.</span>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Configure Supabase <ArrowUpRight size={13} /></a>
          </footer>
        </div>
      </main>
    </div>
  );
}

async function fetchDashboard(domain: WorkspaceDomain): Promise<DashboardData> {
  const response = await fetch(`/api/dashboard?domain=${encodeURIComponent(domain)}`, { cache: "no-store" });
  const payload = await response.json() as DashboardData | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload ? payload.error : "Dashboard could not load.");
  }
  return payload as DashboardData;
}
