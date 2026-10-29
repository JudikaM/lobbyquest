-- Peserta agenda dan pilihan waktu yang mereka bisa hadiri.
-- Peserta dikenali dari hash token di cookie, bukan dari nama.

CREATE TABLE participants (
  id         INTEGER PRIMARY KEY,
  agenda_id  INTEGER NOT NULL REFERENCES agendas (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX participants_agenda_id ON participants (agenda_id);

CREATE TABLE votes (
  participant_id INTEGER NOT NULL REFERENCES participants (id) ON DELETE CASCADE,
  time_option_id INTEGER NOT NULL REFERENCES time_options (id) ON DELETE CASCADE,
  PRIMARY KEY (participant_id, time_option_id)
);
