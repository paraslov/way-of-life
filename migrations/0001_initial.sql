-- Authentication and settings. Carried over from ACT 0001 + 0002 (the account
-- lock columns were never needed here, so they are simply absent).

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_email_is_normalized CHECK (email = lower(email))
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX sessions_user_id_idx ON sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE login_throttle (
  key_hash text PRIMARY KEY CHECK (length(key_hash) = 64),
  scope text NOT NULL CHECK (scope IN ('account', 'source', 'pair')),
  failure_count integer NOT NULL DEFAULT 0 CHECK (failure_count >= 0),
  window_started_at timestamptz NOT NULL DEFAULT now(),
  blocked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX login_throttle_updated_at_idx ON login_throttle(updated_at);

-- The pattern for every user-owned table: non-null user_id, RLS enabled and
-- forced, the same predicate in USING and WITH CHECK, and access only through
-- withCurrentUserDb() so the identity is transaction-local.
CREATE TABLE user_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings FORCE ROW LEVEL SECURITY;

CREATE POLICY user_settings_by_user_id
  ON user_settings
  FOR ALL
  TO PUBLIC
  USING (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  )
  WITH CHECK (
    user_id = NULLIF(current_setting('app.current_user_id', true), '')::uuid
  );

-- The authentication tables do not use per-user RLS because they are queried
-- before a user is authenticated. The runtime role gets only the operations the
-- application uses: it cannot create accounts, change password hashes, change
-- activation state, or read migration metadata.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'way_of_life_app') THEN
    REVOKE ALL ON TABLE users FROM way_of_life_app;
    REVOKE ALL ON TABLE sessions FROM way_of_life_app;
    REVOKE ALL ON TABLE user_settings FROM way_of_life_app;
    REVOKE ALL ON TABLE login_throttle FROM way_of_life_app;
    REVOKE ALL ON TABLE schema_migrations FROM way_of_life_app;

    GRANT SELECT (id, email, password_hash, is_active) ON users TO way_of_life_app;
    GRANT UPDATE (last_login_at, updated_at) ON users TO way_of_life_app;
    GRANT SELECT, INSERT, DELETE ON sessions TO way_of_life_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON user_settings TO way_of_life_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON login_throttle TO way_of_life_app;
  END IF;
END
$$;
