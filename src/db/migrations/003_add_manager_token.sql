-- Akses pengelola agenda. Hanya hash token yang disimpan; agenda lama
-- (dibuat sebelum migrasi ini) tidak punya pengelola.
ALTER TABLE agendas ADD COLUMN manager_token_hash TEXT;
