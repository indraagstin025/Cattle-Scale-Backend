-- a. Gender hanya 'male' atau 'female' (sesuai URD)
ALTER TABLE cattle
  ADD CONSTRAINT chk_cattle_gender CHECK (gender IN ('male', 'female'));

-- b. Hanya 1 firmware aktif dalam satu waktu
CREATE UNIQUE INDEX idx_one_active_firmware
  ON firmware_releases (is_active) WHERE is_active = true;

-- c. Kode pairing unik selama belum dipakai
CREATE UNIQUE INDEX idx_pairing_code_unique_pending
  ON pairing_codes (code) WHERE used = false;

-- d. Battery level harus 0-100
ALTER TABLE devices
  ADD CONSTRAINT chk_battery_level_range CHECK (battery_level BETWEEN 0 AND 100);

-- e. Weight harus positif
ALTER TABLE weight_logs
  ADD CONSTRAINT chk_weight_positive CHECK (weight > 0);

-- f. Trigger sinkronisasi current_weight (safety net)
CREATE OR REPLACE FUNCTION sync_current_weight() RETURNS TRIGGER AS $$
BEGIN
  UPDATE cattle SET current_weight = NEW.weight, updated_at = NOW()
  WHERE id = NEW.cattle_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_current_weight
AFTER INSERT ON weight_logs
FOR EACH ROW EXECUTE FUNCTION sync_current_weight();