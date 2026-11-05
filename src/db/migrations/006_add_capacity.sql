-- Kuota party opsional: batas jumlah peserta yang mengonfirmasi hadir.
ALTER TABLE agendas ADD COLUMN capacity INTEGER CHECK (capacity IS NULL OR capacity BETWEEN 2 AND 50);
