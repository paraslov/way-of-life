-- Design handoff: optional evening observations and the user's weekly context.
CREATE TABLE day_evenings (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  walk_after_meal smallint CHECK (walk_after_meal BETWEEN 0 AND 3),
  protein_band text CHECK (protein_band IN ('under_105', '105_120', '120_140', 'over_140')),
  fiber_band text CHECK (fiber_band IN ('under_20', '20_25', '25_35', 'over_35')),
  bedtime_target text CHECK (bedtime_target IN ('22_30', '23_00', '23_30', 'later')),
  decision_fit text CHECK (decision_fit IN ('ok', 'more', 'less')),
  note text CHECK (char_length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);

CREATE TABLE week_modes (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  mode text NOT NULL DEFAULT 'normal' CHECK (mode IN ('normal', 'deload', 'travel', 'illness')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start)
);

CREATE TABLE weekly_reviews (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  helped text CHECK (char_length(helped) <= 2000),
  hurt text CHECK (char_length(hurt) <= 2000),
  change_next boolean,
  change_text text CHECK (char_length(change_text) <= 500),
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, week_start),
  CHECK (change_text IS NULL OR change_next = true)
);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['day_evenings', 'week_modes', 'weekly_reviews']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
    EXECUTE format(
      $policy$
        CREATE POLICY %I ON %I FOR ALL TO PUBLIC
          USING (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
          WITH CHECK (user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid)
      $policy$,
      table_name || '_by_user_id', table_name
    );
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'way_of_life_app') THEN
      EXECUTE format('REVOKE ALL ON TABLE %I FROM way_of_life_app', table_name);
      EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE %I TO way_of_life_app', table_name);
    END IF;
  END LOOP;
END
$$;
