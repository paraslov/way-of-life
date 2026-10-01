-- D26: morning energy moves from 1–5 to 1–10, like RPE. Stored answers keep
-- their meaning under a linear ×2 (1→2 … 5→10), so personal baselines stay
-- comparable. Decision snapshots are history under RULES_VERSION 1.0 and keep
-- the 1–5 value they were made with.
ALTER TABLE daily_checkins DROP CONSTRAINT daily_checkins_energy_check;
UPDATE daily_checkins SET energy = energy * 2 WHERE energy IS NOT NULL;
ALTER TABLE daily_checkins
  ADD CONSTRAINT daily_checkins_energy_check CHECK (energy BETWEEN 1 AND 10);

-- D26: evening calm ↔ irritability for the day, a Vitality observation.
ALTER TABLE day_evenings
  ADD COLUMN mood text CHECK (
    mood IN ('very_irritable', 'irritable', 'normal', 'calm', 'positive')
  );
