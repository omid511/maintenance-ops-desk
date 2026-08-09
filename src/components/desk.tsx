"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RequestDetail } from "@/components/request-detail";
import { RequestForm } from "@/components/request-form";
import { RequestList } from "@/components/request-list";
import { STATUS_LABELS, type Actor, type MaintenanceRequest, type RequestStatus, type Unit } from "@/lib/domain";

type Filter = "all" | RequestStatus;
interface DeskData { actor: Actor; units: Unit[]; requests: MaintenanceRequest[]; summary: { total: number; open: number; overdue: number; urgent: number; byStatus: Record<string, number> } }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Something went wrong.");
  return body as T;
}

export function Desk() {
  const [data, setData] = useState<DeskData | null>(null);
  const [role, setRole] = useState<"landlord" | "tenant">("landlord");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"updated" | "urgency" | "sla">("updated");

  const refresh = useCallback(async (nextRole: "landlord" | "tenant" = role) => {
    setLoading(true); setError("");
    try {
      await api<{ actor: Actor }>("/api/session", { method: "POST", body: JSON.stringify({ role: nextRole }) });
      const next = await api<DeskData>("/api/requests");
      setData(next); setRole(nextRole); setSelectedId((current) => next.requests.some((item) => item.id === current) ? current : next.requests[0]?.id ?? null);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not load the demo desk."); } finally { setLoading(false); }
  }, [role]);

  const booted = useRef(false);
  useEffect(() => { if (!booted.current) { booted.current = true; void refresh("landlord"); } }, [refresh]);

  const selected = data?.requests.find((request) => request.id === selectedId) ?? null;
  const visibleRequests = useMemo(() => {
    if (!data) return [];
    const urgencyRank: Record<string, number> = { urgent: 4, high: 3, normal: 2, low: 1 };
    return data.requests.filter((request) => !query.trim() || `${request.title} ${request.description} ${request.category} ${request.assignedTo ?? ""}`.toLowerCase().includes(query.trim().toLowerCase())).sort((a, b) => sort === "urgency" ? urgencyRank[b.urgency] - urgencyRank[a.urgency] : sort === "sla" ? new Date(a.slaDueAt ?? a.updatedAt).getTime() - new Date(b.slaDueAt ?? b.updatedAt).getTime() : new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [data, query, sort]);

  async function createRequest(input: Record<string, unknown>) { try { await api("/api/requests", { method: "POST", body: JSON.stringify(input) }); setNotice("Request sent to your landlord."); await refresh("tenant"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not send request."); throw caught; } }
  async function updateRequest(id: string, input: Record<string, unknown>) { try { const current = data?.requests.find((item) => item.id === id); await api(`/api/requests/${id}`, { method: "PATCH", body: JSON.stringify({ ...input, expectedVersion: current?.version }) }); setNotice("Timeline updated."); await refresh(role); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not update request."); throw caught; } }
  async function acknowledge(id: string) { try { const current = data?.requests.find((item) => item.id === id); await api(`/api/requests/${id}/acknowledge`, { method: "POST", body: JSON.stringify({ expectedVersion: current?.version }) }); setNotice("Thanks — the request is acknowledged."); await refresh("tenant"); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not acknowledge request."); throw caught; } }
  async function reopen(id: string, reason: string) { try { await api(`/api/requests/${id}/reopen`, { method: "POST", body: JSON.stringify({ reason }) }); setNotice("Request reopened for another look."); await refresh(role); } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not reopen request."); throw caught; } }

  return <main className="app-shell">
    <aside className="sidebar"><div className="brand"><span className="brand-mark">⌁</span><span>maintenance<br /><strong>desk</strong></span></div><div className="sidebar-rule" /><nav aria-label="Workspace"><span className="nav-label">Workspace</span><a className="nav-item nav-item-active" href="#queue"><span>◎</span> Request queue <b>{data?.requests.length ?? "–"}</b></a><a className="nav-item" href="#units"><span>⌂</span> My units</a><a className="nav-item" href="#about"><span>↗</span> How it works</a></nav><div className="sidebar-footer"><span className="eyebrow">Demo workspace</span><p>Built for the small moments that keep a home working.</p><span className="online-indicator"><i /> Local data only</span></div></aside>
    <section className="workspace"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">⌁</span><strong>maintenance desk</strong></div><div className="topbar-meta"><span className="demo-badge"><i /> Demo mode</span><span className="topbar-date">{new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(new Date())}</span><div className="role-switcher" role="group" aria-label="Demo role"><button className={role === "landlord" ? "role-active" : ""} onClick={() => void refresh("landlord")}>Landlord</button><button className={role === "tenant" ? "role-active" : ""} onClick={() => void refresh("tenant")}>Tenant</button></div></div></header>
      <div className="content"><div className="page-intro"><div><span className="eyebrow">{role === "landlord" ? "Landlord workspace" : "Tenant workspace"}</span><h1>{role === "landlord" ? "Keep every home moving." : "Your home, in the loop."}</h1><p>{role === "landlord" ? "One clear next action for every maintenance request." : "Report a problem once. See what happens next."}</p></div><div className="intro-stamp"><span>{role === "landlord" ? "Queue health" : "Your requests"}</span><strong>{data ? data.requests.length.toString().padStart(2, "0") : "–"}</strong><small>active record{data?.requests.length === 1 ? "" : "s"}</small></div></div>
        {error && <div className="alert alert-error" role="alert"><strong>Couldn’t update the desk.</strong><span>{error}</span><button onClick={() => { setError(""); void refresh(role); }}>Retry</button></div>}
        {notice && <div className="alert alert-success" role="status"><span>{notice}</span><button aria-label="Dismiss notification" onClick={() => setNotice("")}>×</button></div>}
        {loading ? <div className="loading-layout" aria-busy="true" aria-label="Loading maintenance desk"><div className="skeleton skeleton-wide" /><div className="skeleton skeleton-list" /><div className="skeleton skeleton-detail" /></div> : data && <>
          {role === "tenant" ? <div className="tenant-layout"><RequestForm units={data.units} onCreate={createRequest} /><section className="request-section" id="queue"><div className="section-heading"><div><span className="eyebrow">Your activity</span><h2>Requests you’ve raised</h2></div><span className="section-count">{data.requests.length} total</span></div><RequestList requests={visibleRequests} units={data.units} selectedId={selectedId} onSelect={setSelectedId} filter={filter} /></section><section className="detail-column tenant-detail-column">{selected ? <RequestDetail request={selected} unit={data.units.find((unit) => unit.id === selected.unitId)} actor={data.actor} onUpdate={updateRequest} onAcknowledge={acknowledge} onReopen={reopen} /> : <div className="empty-detail"><span>↗</span><h2>Select a request</h2><p>Choose one from your activity to see its shared timeline.</p></div>}</section></div> : <div className="landlord-layout"><section className="queue-column" id="queue"><div className="metric-strip"><div><span className="metric-number">{data.summary.open}</span><span>Needs action</span></div><div><span className="metric-number metric-alert">{data.summary.urgent}</span><span>High attention</span></div><div><span className="metric-number">{data.summary.overdue}</span><span>Past SLA</span></div></div><div className="section-heading"><div><span className="eyebrow">The live queue</span><h2>Requests</h2></div><span className="section-count">{data.summary.total} total</span></div><div className="queue-tools"><input aria-label="Search requests" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, unit, assignee…" /><select aria-label="Sort requests" value={sort} onChange={(event) => setSort(event.target.value as "updated" | "urgency" | "sla")}><option value="updated">Recently updated</option><option value="urgency">Urgency first</option><option value="sla">SLA due first</option></select></div><div className="filter-row" role="tablist" aria-label="Filter requests">{(["all", "new", "triaged", "scheduled", "in_progress", "blocked", "done", "closed"] as Filter[]).map((item) => <button key={item} role="tab" aria-selected={filter === item} className={filter === item ? "filter-active" : ""} onClick={() => setFilter(item)}>{item === "all" ? "All" : STATUS_LABELS[item]}</button>)}</div><RequestList requests={visibleRequests} units={data.units} selectedId={selectedId} onSelect={setSelectedId} filter={filter} /></section><section className="detail-column">{selected ? <RequestDetail request={selected} unit={data.units.find((unit) => unit.id === selected.unitId)} actor={data.actor} onUpdate={updateRequest} onAcknowledge={acknowledge} onReopen={reopen} /> : <div className="empty-detail"><span>↗</span><h2>Select a request</h2><p>Choose one from the queue to see its next action and activity trail.</p></div>}</section></div>}
        </>}
      </div>
    </section>
  </main>;
}
