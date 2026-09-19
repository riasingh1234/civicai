-- Run this in the Supabase SQL editor before pointing the backend at a project.
-- Also create a public storage bucket named "evidence" for the photos.

create table if not exists reports (
  id               text primary key,
  issue            text,
  category         text,
  severity         text,
  confidence       text,
  department       text,
  routing_reason   text,
  complaint        text,
  complaint_hi     text,
  location         text,
  address          text,
  lat              double precision,
  lng              double precision,
  description      text,
  language         text default 'en',
  image_url        text,
  after_image_url  text,
  phash            text,
  status           text default 'Submitted',
  -- set when this report is merged into an existing one
  parent_id        text references reports (id),
  resolution_note  text default '',
  verification     jsonb,
  created_at       timestamptz default now(),
  resolved_at      timestamptz
);

create index if not exists reports_parent_idx on reports (parent_id);
create index if not exists reports_status_idx on reports (status);
create index if not exists reports_location_idx on reports (lat, lng);

create table if not exists notifications (
  id         text primary key,
  report_id  text references reports (id) on delete cascade,
  message    text not null,
  kind       text default 'status',
  read       boolean default false,
  created_at timestamptz default now()
);

create index if not exists notifications_report_idx on notifications (report_id);
