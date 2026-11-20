-- Hochzeit Sarah & Bene – Datenbank-Schema (PostgreSQL 14+)
-- Eigene Anmeldung in der App (kein Supabase). Alles hinter Login + Freischaltung.
-- Rollen: admin (Sarah & Bene) · planer (Trauzeugen/Helfer) · gast
-- Status: pending (wartet auf Freischaltung) · approved · rejected
-- Zugriffsschutz: Die App prüft Rolle/Status serverseitig bei jedem Zugriff. Die Anwendung
-- verbindet sich mit einem eigenen DB-Benutzer (siehe deploy/setup-server.sh), nicht als Superuser.

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text not null default '',
  password_hash text not null,
  role text not null default 'gast' check (role in ('admin', 'planer', 'gast')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create unique index users_email_lower_idx on public.users (lower(email));

create table public.sessions (
  token_hash text primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index sessions_user_idx on public.sessions (user_id);
create index sessions_expires_idx on public.sessions (expires_at);

-- Fehlversuche beim Login (Schutz vor Passwort-Raten) und Registrierungen (Begrenzung pro IP)
create table public.login_attempts (
  id bigserial primary key,
  kind text not null default 'login' check (kind in ('login', 'register')),
  email text not null,
  ip text not null default '',
  created_at timestamptz not null default now()
);
create index login_attempts_email_idx on public.login_attempts (lower(email), created_at);
create index login_attempts_ip_idx on public.login_attempts (ip, created_at);
create index login_attempts_created_idx on public.login_attempts (created_at);

-- ───────────────────────── Inhalte für die Gäste (lesen: alle Freigeschalteten, schreiben: Planer) ─────────────────────────
create table public.site_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table public.schedule_items (
  id uuid primary key default gen_random_uuid(),
  time time,
  title text not null,
  description text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.accommodations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'Hotel',
  address text,
  url text,
  price_per_night numeric(10, 2) check (price_per_night is null or price_per_night >= 0),
  distance text,
  booking_code text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.faq (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.gifts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  url text,
  price numeric(10, 2) check (price is null or price >= 0),
  reserved_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Zusagen der Gäste (jeder Gast genau eine Zeile)
create table public.rsvps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  attending text not null default 'offen' check (attending in ('offen', 'zusage', 'absage')),
  persons integer not null default 1 check (persons between 0 and 10),
  companions text,
  diet text,
  song_wish text,
  message text,
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Planung (nur Planer/Admin) ─────────────────────────
create table public.plan_settings (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Sonstiges',
  title text not null,
  vendor text,
  planned numeric(12, 2) not null default 0 check (planned >= 0),
  actual numeric(12, 2) check (actual is null or actual >= 0),
  paid numeric(12, 2) not null default 0 check (paid >= 0),
  status text not null default 'Idee',
  due_date date,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  phase text not null default '3 – 6 Monate vorher',
  due_date date,
  assignee text not null default 'Beide',
  priority text not null default 'Mittel',
  done boolean not null default false,
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Sonstiges',
  name text not null,
  status text not null default 'Idee',
  price numeric(12, 2) check (price is null or price >= 0),
  url text,
  contact text,
  phone text,
  email text,
  rating text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  side text not null default 'Beide',
  group_name text,
  priority text not null default 'B – gerne',
  invited boolean not null default false,
  rsvp text not null default 'offen',
  persons integer not null default 1 check (persons between 0 and 10),
  diet text,
  table_no text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'Sonstiges',
  url text,
  price numeric(12, 2) check (price is null or price >= 0),
  status text not null default 'Idee',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ───────────────────────── Startdaten ─────────────────────────
insert into public.site_settings (key, value) values
  ('bride_name', 'Sarah'),
  ('groom_name', 'Bene'),
  ('wedding_date', ''),
  ('wedding_time', ''),
  ('welcome_text', 'Wir heiraten! Hier findet ihr alles, was ihr für unseren großen Tag wissen müsst.'),
  ('venue_name', ''),
  ('venue_address', ''),
  ('venue_url', ''),
  ('map_url', ''),
  ('arrival_info', ''),
  ('parking_info', ''),
  ('dresscode', ''),
  ('kids_info', ''),
  ('rsvp_deadline', ''),
  ('gifts_text', ''),
  ('photos_url', ''),
  ('contact_name', ''),
  ('contact_phone', ''),
  ('contact_email', '')
on conflict (key) do nothing;

insert into public.plan_settings (key, value) values ('budget_total', '0') on conflict (key) do nothing;

insert into public.faq (question, answer, sort_order) values
  ('Wo soll ich übernachten?', 'Unter „Anfahrt & Unterkunft“ findet ihr Empfehlungen und Buchungsstichworte.', 10),
  ('Dürfen Kinder mitkommen?', 'Das tragen wir noch ein.', 20),
  ('Was ist mit Geschenken?', 'Alles dazu steht unter „Wunschliste“.', 30),
  ('Bis wann muss ich zu- oder absagen?', 'Bitte gebt eure Rückmeldung über „Zusage“ ab; die Frist steht auf der Startseite.', 40);

insert into public.budget_items (category, title, planned) values
  ('Location & Miete', 'Location-Miete', 0),
  ('Catering & Getränke', 'Menü / Buffet', 0),
  ('Catering & Getränke', 'Getränke', 0),
  ('Hochzeitstorte & Süßes', 'Hochzeitstorte', 0),
  ('Fotograf & Video', 'Fotograf', 0),
  ('Musik & Unterhaltung', 'DJ / Band', 0),
  ('Trauung', 'Standesamt-Gebühren / Redner / Kirche', 0),
  ('Outfit Braut', 'Brautkleid & Änderungen', 0),
  ('Outfit Bräutigam', 'Anzug & Accessoires', 0),
  ('Ringe', 'Trauringe', 0),
  ('Styling', 'Friseur & Make-up', 0),
  ('Blumen & Deko', 'Brautstrauß & Blumenschmuck', 0),
  ('Blumen & Deko', 'Deko Location', 0),
  ('Papeterie', 'Einladungen, Menükarten, Danksagungen', 0),
  ('Transport', 'Hochzeitsauto / Shuttle', 0),
  ('Unterkunft', 'Hochzeitsnacht', 0),
  ('Flitterwochen', 'Reise', 0),
  ('Gastgeschenke', 'Gastgeschenke', 0),
  ('Sonstiges & Puffer', 'Trinkgelder, Porto, Überstunden Dienstleister, Puffer', 0);

insert into public.tasks (title, phase, assignee, priority) values
  ('Gesamtbudget festlegen und Prioritäten besprechen', '1 – 12+ Monate vorher', 'Beide', 'Hoch'),
  ('Gästeliste als Rohfassung schreiben (A/B/C-Kategorien)', '1 – 12+ Monate vorher', 'Beide', 'Hoch'),
  ('Wunschtermin und Jahreszeit festlegen', '1 – 12+ Monate vorher', 'Beide', 'Hoch'),
  ('Location besichtigen und buchen', '1 – 12+ Monate vorher', 'Beide', 'Hoch'),
  ('Standesamt: Termin reservieren und Unterlagen klären', '1 – 12+ Monate vorher', 'Beide', 'Hoch'),
  ('Art der Trauung klären (standesamtlich, frei, kirchlich)', '2 – 9 bis 12 Monate vorher', 'Beide', 'Hoch'),
  ('Trauzeugen fragen', '2 – 9 bis 12 Monate vorher', 'Beide', 'Mittel'),
  ('Fotograf anfragen und buchen', '2 – 9 bis 12 Monate vorher', 'Beide', 'Hoch'),
  ('DJ / Band anfragen und buchen', '2 – 9 bis 12 Monate vorher', 'Beide', 'Mittel'),
  ('Save-the-Date versenden', '2 – 9 bis 12 Monate vorher', 'Beide', 'Mittel'),
  ('Brautkleid und Anzug aussuchen', '3 – 6 bis 9 Monate vorher', 'Beide', 'Hoch'),
  ('Catering / Menü festlegen', '3 – 6 bis 9 Monate vorher', 'Beide', 'Hoch'),
  ('Hotelzimmer-Kontingent für Gäste klären', '3 – 6 bis 9 Monate vorher', 'Beide', 'Mittel'),
  ('Trauringe aussuchen', '3 – 6 bis 9 Monate vorher', 'Beide', 'Mittel'),
  ('Urlaub für Hochzeit und Flitterwochen beantragen', '3 – 6 bis 9 Monate vorher', 'Beide', 'Hoch'),
  ('Hochzeitstorte planen', '3 – 6 bis 9 Monate vorher', 'Beide', 'Niedrig'),
  ('Einladungen gestalten und drucken', '4 – 3 bis 6 Monate vorher', 'Beide', 'Mittel'),
  ('Einladungen verschicken', '4 – 3 bis 6 Monate vorher', 'Beide', 'Hoch'),
  ('Deko und Blumen besprechen', '4 – 3 bis 6 Monate vorher', 'Beide', 'Mittel'),
  ('Friseur und Make-up buchen', '4 – 3 bis 6 Monate vorher', 'Sarah', 'Mittel'),
  ('Flitterwochen buchen', '4 – 3 bis 6 Monate vorher', 'Beide', 'Mittel'),
  ('Transport / Hochzeitsauto organisieren', '4 – 3 bis 6 Monate vorher', 'Beide', 'Niedrig'),
  ('Rückmeldungen der Gäste einsammeln', '5 – 1 bis 3 Monate vorher', 'Beide', 'Hoch'),
  ('Sitzordnung erstellen', '5 – 1 bis 3 Monate vorher', 'Beide', 'Mittel'),
  ('Ablaufplan für den Tag schreiben und teilen', '5 – 1 bis 3 Monate vorher', 'Beide', 'Hoch'),
  ('Probefrisur / Probe-Make-up', '5 – 1 bis 3 Monate vorher', 'Sarah', 'Niedrig'),
  ('Namenskarten und Gastgeschenke vorbereiten', '5 – 1 bis 3 Monate vorher', 'Beide', 'Niedrig'),
  ('Alle Dienstleister final bestätigen', '6 – Letzte Woche', 'Beide', 'Hoch'),
  ('Umschläge für Trinkgelder und Restzahlungen vorbereiten', '6 – Letzte Woche', 'Beide', 'Mittel'),
  ('Notfallset und Ablauf an Trauzeugen übergeben', '6 – Letzte Woche', 'Trauzeugen', 'Mittel'),
  ('Danksagungen verschicken', '7 – Nach der Hochzeit', 'Beide', 'Mittel'),
  ('Namensänderung und Behördengänge erledigen', '7 – Nach der Hochzeit', 'Beide', 'Mittel'),
  ('Fotos sichten und mit Gästen teilen', '7 – Nach der Hochzeit', 'Beide', 'Niedrig');

