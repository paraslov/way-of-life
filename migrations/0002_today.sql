-- Stage 02 "Today": observations (check-in, symptoms, activities), the day
-- decision with its rule version and snapshot, and configurable targets.
-- Every table follows the user_settings pattern from 0001: non-null user_id,
-- RLS enabled and forced, one predicate in USING and WITH CHECK.

-- One row per user and calendar day in the user's zone (architecture §7).
-- Every observation is nullable: a missing value is UNKNOWN, not an error.
-- Ranges mirror src/lib/metrics/registry.ts.
CREATE TABLE daily_checkins (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  sleep_minutes smallint CHECK (sleep_minutes BETWEEN 0 AND 1080),
  sleep_score smallint CHECK (sleep_score BETWEEN 0 AND 100),
  bed_at timestamptz,
  wake_at timestamptz,
  rhr smallint CHECK (rhr BETWEEN 30 AND 120),
  hrv_ms smallint CHECK (hrv_ms BETWEEN 5 AND 250),
  hrv_status text CHECK (hrv_status IN ('balanced', 'unbalanced', 'low', 'poor')),
  energy smallint CHECK (energy BETWEEN 1 AND 5),
  desire smallint CHECK (desire BETWEEN 1 AND 3),
  legs smallint CHECK (legs BETWEEN 1 AND 3),
  steps integer CHECK (steps BETWEEN 0 AND 100000),
  -- Red flags sit outside the traffic light and override any decision (§6).
  red_flags text[] NOT NULL DEFAULT '{}' CHECK (
    red_flags <@ ARRAY['palpitations_exercise', 'chest_pain', 'presyncope', 'dyspnea']
  ),
  note text CHECK (char_length(note) <= 2000),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'garmin')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);

CREATE TABLE symptom_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key text NOT NULL CHECK (key ~ '^[a-z][a-z0-9_]{0,39}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  scale text NOT NULL CHECK (scale IN ('0_10', 'bool')),
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  sort smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key),
  -- Target of the composite foreign key below.
  UNIQUE (id, user_id)
);

CREATE TABLE symptom_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  local_date date NOT NULL,
  symptom_id uuid NOT NULL,
  -- 0–10, or 0/1 for yes/no symptoms.
  severity smallint NOT NULL CHECK (severity BETWEEN 0 AND 10),
  context text CHECK (context IN ('rest', 'exercise')),
  heart_rate smallint CHECK (heart_rate BETWEEN 30 AND 230),
  note text CHECK (char_length(note) <= 1000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, local_date, symptom_id),
  -- An entry can only point at its own user's definition.
  FOREIGN KEY (symptom_id, user_id)
    REFERENCES symptom_definitions (id, user_id) ON DELETE CASCADE
);

CREATE INDEX symptom_entries_symptom_idx ON symptom_entries (symptom_id, user_id);

-- The decision layer (§2): what the rules recommended, frozen with the rule
-- version and a snapshot of inputs, baselines and signals, and what the user chose.
CREATE TABLE day_decisions (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  rule_version text NOT NULL CHECK (char_length(rule_version) <= 20),
  planned_session text NOT NULL CHECK (char_length(planned_session) <= 40),
  recommended_action text NOT NULL CHECK (char_length(recommended_action) <= 40),
  chosen_action text CHECK (chosen_action IN ('accept', 'keep_original', 'skip', 'custom')),
  custom_text text CHECK (char_length(custom_text) <= 200),
  snapshot jsonb NOT NULL,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date),
  CHECK ((chosen_action IS NULL) = (decided_at IS NULL)),
  CHECK (custom_text IS NULL OR chosen_action = 'custom')
);

CREATE TABLE activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  type text NOT NULL CHECK (type IN (
    'easy_run', 'intensity', 'strength', 'strength_lite', 'power_balance',
    'mobility', 'trek', 'walk', 'walk_after_meal', 'rest', 'other'
  )),
  duration_min smallint CHECK (duration_min BETWEEN 0 AND 1440),
  rpe smallint CHECK (rpe BETWEEN 1 AND 10),
  avg_hr smallint CHECK (avg_hr BETWEEN 30 AND 230),
  distance_km numeric(6, 2) CHECK (distance_km BETWEEN 0 AND 1000),
  note text CHECK (char_length(note) <= 1000),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'garmin')),
  external_id text CHECK (char_length(external_id) <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  -- Upsert key for imports (§4); NULL external ids never collide.
  UNIQUE (user_id, source, external_id)
);

CREATE INDEX activities_user_date_idx ON activities (user_id, local_date);

-- "Minimum / target" per metric (§8). A new row with a later active_from
-- replaces the previous one without rewriting history.
CREATE TABLE targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  metric_key text NOT NULL CHECK (metric_key ~ '^[a-z_]+\.[a-z_]+$'),
  period text NOT NULL CHECK (period IN ('day', 'week')),
  minimum numeric NOT NULL CHECK (minimum >= 0),
  target_min numeric NOT NULL,
  target_max numeric NOT NULL,
  unit text NOT NULL CHECK (char_length(unit) <= 20),
  active_from date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, metric_key, active_from),
  CHECK (minimum <= target_min AND target_min <= target_max)
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'daily_checkins', 'symptom_definitions', 'symptom_entries',
    'day_decisions', 'activities', 'targets'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      $policy$
        CREATE POLICY %I ON %I FOR ALL TO PUBLIC
          USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
          WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      $policy$,
      table_name || '_by_user_id',
      table_name
    );
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'way_of_life_app') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM way_of_life_app', table_name);
      EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO way_of_life_app',
        table_name
      );
    END IF;
  END LOOP;
END
$$;
