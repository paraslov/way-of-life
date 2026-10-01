-- D27: a missed or incomplete day can be filled in for 7 days afterwards.
-- The decision of that day is never recomputed (D25); this marks a morning
-- that was entered or corrected after its day ended.
ALTER TABLE daily_checkins ADD COLUMN late_edited_at timestamptz;
