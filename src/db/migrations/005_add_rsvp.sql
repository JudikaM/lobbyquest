-- Konfirmasi kehadiran peserta untuk waktu final.
ALTER TABLE participants ADD COLUMN rsvp TEXT CHECK (rsvp IN ('yes', 'maybe', 'no'));
ALTER TABLE participants ADD COLUMN rsvp_at TEXT;
