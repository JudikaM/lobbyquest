-- Agenda dan pilihan waktunya. Semua waktu disimpan sebagai teks ISO 8601 UTC.

CREATE TABLE agendas (
  id          INTEGER PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  kind        TEXT NOT NULL CHECK (kind IN ('mabar', 'nongkrong')),
  description TEXT,
  location    TEXT,
  timezone    TEXT NOT NULL,
  created_at  TEXT NOT NULL
);

CREATE TABLE time_options (
  id        INTEGER PRIMARY KEY,
  agenda_id INTEGER NOT NULL REFERENCES agendas (id) ON DELETE CASCADE,
  starts_at TEXT NOT NULL,
  ends_at   TEXT NOT NULL,
  CHECK (ends_at > starts_at),
  UNIQUE (agenda_id, starts_at, ends_at)
);
