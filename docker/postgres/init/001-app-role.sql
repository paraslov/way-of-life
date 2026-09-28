-- POSTGRES_USER creates the migration/administration role. Next.js must never
-- connect as that role because PostgreSQL superusers bypass RLS.
CREATE ROLE mylife_app
  LOGIN
  PASSWORD 'mylife_app_local_password'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE mylife TO mylife_app;
GRANT USAGE ON SCHEMA public TO mylife_app;
