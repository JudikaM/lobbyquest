-- Waktu final yang ditetapkan pengelola dari pilihan waktu agenda.
ALTER TABLE agendas ADD COLUMN final_option_id INTEGER REFERENCES time_options (id) ON DELETE SET NULL;
ALTER TABLE agendas ADD COLUMN finalized_at TEXT;
