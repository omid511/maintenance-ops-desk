create extension if not exists pgcrypto;

create table if not exists actors (
  id text primary key,
  name text not null,
  role text not null check (role in ('landlord', 'tenant')),
  created_at timestamptz not null default now()
);

create table if not exists units (
  id text primary key,
  label text not null,
  address text not null,
  created_at timestamptz not null default now()
);

create table if not exists memberships (
  actor_id text not null references actors(id) on delete cascade,
  unit_id text not null references units(id) on delete cascade,
  membership_role text not null check (membership_role in ('owner', 'tenant', 'operator')),
  primary key (actor_id, unit_id)
);

create table if not exists maintenance_requests (
  id text primary key,
  unit_id text not null references units(id),
  reporter_id text not null references actors(id),
  title text not null,
  description text not null,
  category text not null,
  urgency text not null check (urgency in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'new',
  assigned_to text,
  visit_at timestamptz,
  sla_due_at timestamptz,
  escalation_level integer not null default 0,
  acknowledged_at timestamptz,
  closed_at timestamptz,
  version integer not null default 1,
  client_request_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reporter_id, client_request_id)
);

create table if not exists attachments (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references maintenance_requests(id) on delete cascade,
  object_key text,
  file_name text not null,
  content_type text not null,
  byte_size integer not null check (byte_size between 1 and 10000000),
  created_at timestamptz not null default now()
);

create table if not exists request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id text not null references maintenance_requests(id) on delete cascade,
  author_id text not null references actors(id),
  body text not null,
  visibility text not null check (visibility in ('tenant', 'internal')),
  created_at timestamptz not null default now()
);

create table if not exists request_events (
  id uuid primary key,
  request_id text not null references maintenance_requests(id) on delete cascade,
  kind text not null,
  actor_name text not null,
  detail text not null,
  visibility text not null default 'tenant' check (visibility in ('tenant', 'internal')),
  created_at timestamptz not null default now()
);

create index if not exists maintenance_requests_queue_idx on maintenance_requests (unit_id, status, updated_at desc);
create index if not exists maintenance_requests_sla_idx on maintenance_requests (sla_due_at, status);
create index if not exists request_events_timeline_idx on request_events (request_id, created_at desc);
