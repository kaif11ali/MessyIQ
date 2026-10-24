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

type DashboardData = {
  source: "demo" | "supabase";
  updatedAt: string;
  totals: {
    students: number;
    active: number;
    graduates: number;
    supportFlags: number;
    completionRate: number;
  };
  cohorts: Array<{ year: number; students: number }>;
  programs: Array<{ name: string; students: number; active: number }>;
  statuses: Array<{ name: string; students: number }>;
};

type AnalysisResponse = {
  answer: string;
  aiNotice?: string;
  metrics: Array<{ label: string; value: string; detail: string }>;
  rows: Array<Record<string, string | number>>;
  evidence: { sourceRows: number; latestStatusRows: number; dataQuality: number };
  source: "demo" | "supabase";
};

const suggestions = [
  "How many students are active by program?",
  "Who left and what were the main reasons?",
  "Which students need retention support?",
];

export default function Home() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashboardError, setDashboardError] = useState("");
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [analysisError, setAnalysisError] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  useEffect(() => {
    void fetchDashboard()
      .then(setDashboard)
      .catch((error: unknown) => {
        setDashboardError(error instanceof Error ? error.message : "Dashboard could not load.");
      });
  }, []);

  async function loadDashboard() {
    setRefreshing(true);
    setDashboardError("");
    try {
      setDashboard(await fetchDashboard());
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
        body: JSON.stringify({ question: cleanQuestion }),
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

  const maxCohort = Math.max(1, ...(dashboard?.cohorts.map(({ students }) => students) ?? [1]));
  const maxProgram = Math.max(1, ...(dashboard?.programs.map(({ students }) => students) ?? [1]));

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand">
          <span className="brand-mark"><BookOpen size={18} /></span>
          <span>MessyIQ</span>
          <span className="brand-tag">EDUCATION</span>
          <button className="icon-button sidebar-close" onClick={() => setMobileNav(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <a className="nav-item active" href="#overview" onClick={() => setMobileNav(false)}><Activity size={16} /> Overview</a>
        <a className="nav-item" href="#programs" onClick={() => setMobileNav(false)}><GraduationCap size={16} /> Programs</a>
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
          <div className="breadcrumbs">Workspace <ChevronRight size={13} /> Education</div>
          <div className="top-actions">
            {dashboard && <span className={`source-badge ${dashboard.source}`}><i />{dashboard.source === "supabase" ? "Supabase live" : "Sample data"}</span>}
            <button className="icon-button" onClick={() => void loadDashboard()} aria-label="Refresh dashboard" disabled={refreshing}><RefreshCw size={16} className={refreshing ? "spin" : ""} /></button>
            <a className="help-link" href="#data-source"><CircleHelp size={16} /><span>Data setup</span></a>
          </div>
        </header>

        <div className="page-scroll">
          <section className="page-heading">
            <div>
              <span className="eyebrow">ACADEMIC OVERVIEW</span>
              <h1>Make the next student decision count.</h1>
              <p>A clear view of enrollment, progress, and where support may be needed.</p>
            </div>
            <div className="heading-aside"><span className="period-mark" /><div><small>LAST REFRESHED</small><strong>{dashboard ? new Date(dashboard.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "Loading data…"}</strong></div></div>
          </section>

          {dashboardError && <div className="error-banner" role="alert"><AlertTriangle size={17} /><span>{dashboardError}</span><button onClick={() => void loadDashboard()}>Try again</button></div>}

          <section className="stats-grid" aria-label="Student overview metrics">
            <article className="stat-card stat-primary">
              <div className="stat-top"><span>Students represented</span><span className="stat-icon"><Users size={16} /></span></div>
              <strong>{dashboard ? dashboard.totals.students.toLocaleString() : "—"}</strong>
              <small>Unique latest-status records</small>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Continuing study</span><span className="stat-icon"><Activity size={16} /></span></div>
              <strong>{dashboard ? dashboard.totals.active.toLocaleString() : "—"}</strong>
              <small>Admitted, enrolled, or promoted</small>
            </article>
            <article className="stat-card">
              <div className="stat-top"><span>Graduated</span><span className="stat-icon"><GraduationCap size={17} /></span></div>
              <strong>{dashboard ? dashboard.totals.graduates.toLocaleString() : "—"}</strong>
              <small>{dashboard ? `${dashboard.totals.completionRate}% of records shown` : "Latest status recorded"}</small>
            </article>
            <article className="stat-card stat-attention">
              <div className="stat-top"><span>Support signals</span><span className="stat-icon"><AlertTriangle size={16} /></span></div>
              <strong>{dashboard ? dashboard.totals.supportFlags.toLocaleString() : "—"}</strong>
              <small>Low attendance or fees not paid</small>
            </article>
          </section>

          <section className="insight-grid">
            <article className="panel cohort-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">INTAKE</span><h2>Students by cohort</h2><p>Admission year · latest status per student</p></div>
                <span className="panel-icon"><Activity size={17} /></span>
              </div>
              {dashboard?.cohorts.length ? <div className="cohort-list">
                {dashboard.cohorts.map(({ year, students }, index) => <div className="cohort-row" key={year}>
                  <span className="cohort-year">{year}</span>
                  <div className="bar-track"><span className={`bar-fill shade-${index % 4}`} style={{ width: `${Math.max(4, (students / maxCohort) * 100)}%` }} /></div>
                  <strong>{students}</strong>
                </div>)}
              </div> : <div className="chart-empty">{dashboardError ? "Data is unavailable." : "Loading cohort data…"}</div>}
              <div className="panel-foot"><span>Intake size</span><span>Students</span></div>
            </article>

            <article className="panel status-panel">
              <div className="panel-heading">
                <div><span className="eyebrow">STUDENT JOURNEY</span><h2>Where students are</h2><p>Distribution by current status</p></div>
                <span className="panel-icon"><ShieldCheck size={17} /></span>
              </div>
              <div className="status-list">
                {dashboard?.statuses.length ? dashboard.statuses.map(({ name, students }) => <div className="status-row" key={name}>
                  <span className="status-name"><i className={`status-indicator status-${name.toLowerCase().replaceAll(" ", "-")}`} />{name}</span>
                  <span className="status-track"><i style={{ width: `${Math.max(4, (students / Math.max(1, dashboard.totals.students)) * 100)}%` }} /></span>
                  <strong>{students}</strong>
                </div>) : <div className="chart-empty">{dashboardError ? "Data is unavailable." : "Loading status data…"}</div>}
              </div>
              <div className="panel-foot"><span>Latest status only</span><span>Counts</span></div>
            </article>
          </section>

          <section className="panel programs-panel" id="programs">
            <div className="panel-heading programs-heading">
              <div><span className="eyebrow">PROGRAM MIX</span><h2>Enrollment across programs</h2><p>Student counts and those in continuing study</p></div>
              <a href="#analyst" className="text-link">Explore with analyst <ArrowUpRight size={14} /></a>
            </div>
            {dashboard?.programs.length ? <div className="program-list">
              {dashboard.programs.map(({ name, students, active }) => <div className="program-row" key={name}>
                <span className="program-name">{name}</span>
                <div className="program-track"><span style={{ width: `${Math.max(3, (students / maxProgram) * 100)}%` }} /></div>
                <strong>{students}</strong><span className="program-active"><span>{active}</span> continuing</span>
              </div>)}
            </div> : <div className="chart-empty">{dashboardError ? "Program data is unavailable." : "Loading program data…"}</div>}
          </section>

          <section className="analyst-panel" id="analyst">
            <div className="analyst-intro">
              <span className="analyst-icon"><Sparkles size={16} /></span>
              <div><span className="eyebrow">MESSYIQ ANALYST</span><h2>Ask a question, get evidence.</h2><p>Only approved education data is used to answer.</p></div>
            </div>
            <div className="analyst-box">
              <textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void askAnalyst(); } }} placeholder="Try: How many students are currently active by program?" aria-label="Ask about education data" />
              <button className="send-button" onClick={() => void askAnalyst()} disabled={!question.trim() || loading} aria-label="Send question">{loading ? <RefreshCw size={17} className="spin" /> : <Send size={16} />}</button>
            </div>
            <div className="suggestion-list"><span>Try asking</span>{suggestions.map((item) => <button key={item} onClick={() => { setQuestion(item); void askAnalyst(item); }}>{item}</button>)}</div>
            {analysisError && <div className="analysis-error" role="alert"><AlertTriangle size={16} />{analysisError}</div>}
            {loading && <div className="analysis-loading">Checking policy and verified student aggregates…</div>}
            {analysis && <div className="analysis-result">
              <div className="result-title"><span><Check size={14} /> Verified answer</span><small>{analysis.source === "supabase" ? "Supabase data" : "Sample data"}</small></div>
              <p>{analysis.answer}</p>
              {analysis.aiNotice && <div className="ai-notice"><Sparkles size={13} />{analysis.aiNotice}</div>}
              <div className="result-metrics">{analysis.metrics.map((metric) => <div key={metric.label}><small>{metric.label}</small><strong>{metric.value}</strong><span>{metric.detail}</span></div>)}</div>
              {analysis.rows.length > 0 && <div className="result-table-wrap"><table><thead><tr>{Object.keys(analysis.rows[0]).map((key) => <th key={key}>{key.replaceAll("_", " ")}</th>)}</tr></thead><tbody>{analysis.rows.map((row, index) => <tr key={index}>{Object.values(row).map((value, cellIndex) => <td key={cellIndex}>{value}</td>)}</tr>)}</tbody></table></div>}
              <small className="result-evidence">{analysis.evidence.sourceRows} source records · {analysis.evidence.dataQuality}% data completeness</small>
            </div>}
          </section>

          <footer className="page-footer" id="data-source">
            <span><ShieldCheck size={14} /> Read-only education data. No student names sent to AI.</span>
            <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer">Configure Supabase <ArrowUpRight size={13} /></a>
          </footer>
        </div>
      </main>
    </div>
  );
}

async function fetchDashboard(): Promise<DashboardData> {
  const response = await fetch("/api/dashboard", { cache: "no-store" });
  const payload = await response.json() as DashboardData | { error?: string };
  if (!response.ok) {
    throw new Error("error" in payload ? payload.error : "Dashboard could not load.");
  }
  return payload as DashboardData;
}
