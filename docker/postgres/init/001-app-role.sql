-- POSTGRES_USER creates the migration/administration role. Next.js must never
-- connect as that role because PostgreSQL superusers bypass RLS.
CREATE ROLE way_of_life_app
  LOGIN
  PASSWORD 'way_of_life_app_local_password'
  NOSUPERUSER
  NOCREATEDB
  NOCREATEROLE
  NOINHERIT
  NOREPLICATION
  NOBYPASSRLS;

GRANT CONNECT ON DATABASE way_of_life TO way_of_life_app;
GRANT USAGE ON SCHEMA public TO way_of_life_app;
