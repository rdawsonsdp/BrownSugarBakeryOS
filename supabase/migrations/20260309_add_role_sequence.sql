-- Add role_sequence column to staff table for role-based pseudo-names
-- e.g. "Staff 1", "Staff 2", "Manager 1"

ALTER TABLE staff ADD COLUMN IF NOT EXISTS role_sequence integer;

-- Make first_name and last_name nullable (no longer required for pseudo-name system)
ALTER TABLE staff ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE staff ALTER COLUMN last_name DROP NOT NULL;

-- Backfill existing staff with sequence numbers per role within each zone
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY zone_id, role_id ORDER BY created_at) AS seq
  FROM staff
)
UPDATE staff
SET role_sequence = numbered.seq
FROM numbered
WHERE staff.id = numbered.id
  AND staff.role_sequence IS NULL;

-- Update display_name for existing staff to use role-based pseudo-names
UPDATE staff
SET display_name = r.name_en || ' ' || staff.role_sequence
FROM roles r
WHERE staff.role_id = r.id
  AND staff.role_sequence IS NOT NULL;
