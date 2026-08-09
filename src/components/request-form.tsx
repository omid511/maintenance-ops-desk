"use client";

import { useRef, useState, type FormEvent } from "react";
import { CATEGORY_LABELS, REQUEST_CATEGORIES, URGENCIES, URGENCY_LABELS, type Unit } from "@/lib/domain";

interface RequestFormProps {
  units: Unit[];
  onCreate: (input: Record<string, unknown>) => Promise<void>;
}

export function RequestForm({ units, onCreate }: RequestFormProps) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>("plumbing");
  const [urgency, setUrgency] = useState<string>("normal");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const requestKey = useRef(crypto.randomUUID());

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      await onCreate({ unitId, title, category, urgency, description, clientRequestId: requestKey.current, attachment: attachment ? { name: attachment.name, type: attachment.type, size: attachment.size } : undefined });
      setTitle(""); setDescription(""); setAttachment(null);
      requestKey.current = crypto.randomUUID();
      event.currentTarget.reset();
    } finally { setSaving(false); }
  }

  return <form className="request-form" onSubmit={submit}>
    <div className="form-intro"><span className="eyebrow">New request</span><h2>What needs attention?</h2><p>Give your landlord the useful detail first time.</p></div>
    <label>Home<select value={unitId} onChange={(event) => setUnitId(event.target.value)}>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.label}</option>)}</select></label>
    <label>Short summary<input required maxLength={100} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Bathroom fan stopped" /></label>
    <div className="form-grid"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}>{REQUEST_CATEGORIES.map((item) => <option key={item} value={item}>{CATEGORY_LABELS[item]}</option>)}</select></label><label>Urgency<select value={urgency} onChange={(event) => setUrgency(event.target.value)}>{URGENCIES.map((item) => <option key={item} value={item}>{URGENCY_LABELS[item]}</option>)}</select></label></div>
    <label>Description<textarea required maxLength={2000} rows={5} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="What happened? When did you first notice it?" /></label>
    <label className="file-field">Optional photo<input type="file" accept="image/*" onChange={(event) => setAttachment(event.target.files?.[0] ?? null)} /><span>{attachment ? `${attachment.name} · metadata only in demo` : "Attach a photo (10 MB max)"}</span></label>
    <button className="button button-primary" disabled={saving || !unitId}>{saving ? "Sending…" : "Send request"}<span aria-hidden="true">↗</span></button>
  </form>;
}
