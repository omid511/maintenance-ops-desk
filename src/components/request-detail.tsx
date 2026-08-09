"use client";

import { useEffect, useState } from "react";
import { ALLOWED_TRANSITIONS, CATEGORY_LABELS, formatDateTime, STATUS_LABELS, URGENCY_LABELS, type Actor, type MaintenanceRequest, type RequestStatus, type Unit } from "@/lib/domain";

interface RequestDetailProps {
  request: MaintenanceRequest;
  unit?: Unit;
  actor: Actor;
  onUpdate: (id: string, input: Record<string, unknown>) => Promise<void>;
  onAcknowledge: (id: string) => Promise<void>;
  onReopen: (id: string, reason: string) => Promise<void>;
}

export function RequestDetail({ request, unit, actor, onUpdate, onAcknowledge, onReopen }: RequestDetailProps) {
  const [note, setNote] = useState("");
  const [visitDate, setVisitDate] = useState(request.visitDate?.slice(0, 10) ?? "");
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState<RequestStatus>(request.status);
  const [message, setMessage] = useState("");
  const [assignee, setAssignee] = useState(request.assignedTo ?? "Morgan Lee");
  const [noteVisibility, setNoteVisibility] = useState<"tenant" | "internal">("tenant");
  const [reopenReason, setReopenReason] = useState("");

  useEffect(() => { setStatus(request.status); setVisitDate(request.visitDate?.slice(0, 10) ?? ""); setAssignee(request.assignedTo ?? "Morgan Lee"); }, [request.id, request.status, request.visitDate, request.assignedTo]);

  async function save(input: Record<string, unknown>, success: string) {
    setWorking(true); setMessage("");
    try { await onUpdate(request.id, input); setMessage(success); setNote(""); } catch { /* parent owns visible error state */ } finally { setWorking(false); }
  }

  const selectableStatuses = [request.status, ...ALLOWED_TRANSITIONS[request.status]];
  return <article className="detail-card">
    <div className="detail-heading"><div><span className="eyebrow">Request detail</span><h2>{request.title}</h2><p className="detail-location">{unit?.label} · {unit?.address}</p></div><span className={`status-pill status-${request.status}`}>{STATUS_LABELS[request.status]}</span></div>
    <div className="detail-facts"><div><span className="fact-label">Reported</span><strong>{formatDateTime(request.createdAt)}</strong></div><div><span className="fact-label">Urgency</span><strong className={`urgency-text urgency-text-${request.urgency}`}>{URGENCY_LABELS[request.urgency]}</strong></div><div><span className="fact-label">Category</span><strong>{CATEGORY_LABELS[request.category]}</strong></div></div>
    <p className="detail-description">{request.description}</p>
    {request.attachment && <div className="attachment-chip"><span aria-hidden="true">▧</span><span><strong>{request.attachment.name}</strong><small>Attachment metadata · {(request.attachment.size / 1024).toFixed(0)} KB</small></span></div>}
    {actor.role === "landlord" ? <div className="ops-panel"><span className="eyebrow">Operator actions</span><div className="action-grid"><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as RequestStatus)}>{selectableStatuses.map((item) => <option key={item} value={item}>{STATUS_LABELS[item]}</option>)}</select></label><label>Visit date<input type="date" value={visitDate} onChange={(event) => setVisitDate(event.target.value)} /></label><label>Assigned to<input value={assignee} onChange={(event) => setAssignee(event.target.value)} placeholder="Operator or vendor" /></label></div><div className="action-row"><button className="button button-dark" disabled={working || (status === request.status && assignee === request.assignedTo)} onClick={() => save({ status, assignedTo: assignee }, "Operation updated.")}>{working ? "Saving…" : "Update operation"}</button><button className="button button-quiet" disabled={working || !visitDate} onClick={() => save({ visitDate: new Date(`${visitDate}T12:00:00`).toISOString() }, "Visit saved.")}>Schedule visit</button></div><div className="action-grid"><label>Note visibility<select value={noteVisibility} onChange={(event) => setNoteVisibility(event.target.value as "tenant" | "internal")}><option value="tenant">Tenant-visible</option><option value="internal">Internal only</option></select></label><label>Escalation reason<input value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} placeholder="Optional SLA context" /></label></div><label>Note<textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add the next useful update…" /></label><div className="action-row"><button className="text-button" disabled={working || !note.trim()} onClick={() => save({ note, noteVisibility }, "Note added to timeline.")}>+ Add note to timeline</button><button className="text-button" disabled={working || !reopenReason.trim()} onClick={() => save({ escalationReason: reopenReason }, "Request escalated.")}>↑ Escalate</button></div>{message && <span className="inline-success" role="status">{message}</span>}</div> : <div className="tenant-action">{request.status === "done" ? <><div><span className="eyebrow">Your turn</span><h3>Does everything feel sorted?</h3><p>Acknowledge the work to close the loop for everyone.</p></div><button className="button button-primary" disabled={working} onClick={() => { setWorking(true); void onAcknowledge(request.id).finally(() => setWorking(false)); }}>{working ? "Saving…" : "Acknowledge completion"}</button></> : ["acknowledged", "closed"].includes(request.status) ? <><div><span className="eyebrow">Not quite right?</span><h3>Reopen this request</h3><p>Tell the operator what still needs attention.</p><input value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} placeholder="What still needs attention?" /></div><button className="button button-quiet" disabled={working || reopenReason.trim().length < 5} onClick={() => { setWorking(true); void onReopen(request.id, reopenReason).finally(() => setWorking(false)); }}>Reopen request</button></> : <p><span className="signal-dot" /> Your landlord has the next action. We’ll keep the timeline current here.</p>}</div>}
    <div className="timeline"><div className="timeline-header"><span className="eyebrow">Activity trail</span><span>{request.events.length} events</span></div>{request.events.slice().reverse().map((item) => <div className="timeline-item" key={item.id}><span className={`timeline-dot timeline-${item.kind}`} /><div><strong>{item.detail} {item.visibility === "internal" && <small className="internal-badge">Internal</small>}</strong><p>{item.actorName} · {formatDateTime(item.createdAt)}</p></div></div>)}</div>
  </article>;
}
