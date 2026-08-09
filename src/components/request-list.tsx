"use client";

import { CATEGORY_LABELS, STATUS_LABELS, URGENCY_LABELS, type MaintenanceRequest, type Unit } from "@/lib/domain";

interface RequestListProps {
  requests: MaintenanceRequest[];
  units: Unit[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  filter: string;
}

function RequestRow({ request, unit, selected, onSelect }: { request: MaintenanceRequest; unit?: Unit; selected: boolean; onSelect: () => void }) {
  return (
    <button className={`request-row ${selected ? "request-row-selected" : ""}`} onClick={onSelect} aria-pressed={selected}>
      <span className={`urgency-mark urgency-${request.urgency}`} aria-label={`${URGENCY_LABELS[request.urgency]} urgency`} />
      <span className="request-row-content">
        <span className="request-row-topline"><span>{unit?.label ?? "Unknown unit"}</span><span className="request-date">{new Date(request.updatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></span>
        <strong>{request.title}</strong>
        <span className="request-row-meta"><span>{CATEGORY_LABELS[request.category]}</span><span>·</span><span>{STATUS_LABELS[request.status]}</span></span>
      </span>
      <span className="row-arrow" aria-hidden="true">↗</span>
    </button>
  );
}

export function RequestList({ requests, units, selectedId, onSelect, filter }: RequestListProps) {
  const visible = filter === "all" ? requests : requests.filter((request) => request.status === filter);
  if (visible.length === 0) {
    return <div className="empty-state" role="status"><span className="empty-glyph">∅</span><h3>No requests here</h3><p>New maintenance reports will land in this queue.</p></div>;
  }
  return <div className="request-list" role="list">{visible.map((request) => <RequestRow key={request.id} request={request} unit={units.find((unit) => unit.id === request.unitId)} selected={request.id === selectedId} onSelect={() => onSelect(request.id)} />)}</div>;
}
