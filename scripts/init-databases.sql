-- Runs once, on first container start. POSTGRES_DB creates my_accounts_dev; the
-- integration suite needs its own database.
CREATE DATABASE my_accounts_test OWNER my_accounts;
-- The browser E2E suite's own database, so it never truncates the integration suite's.
CREATE DATABASE my_accounts_e2e_test OWNER my_accounts;
