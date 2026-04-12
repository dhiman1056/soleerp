-- =============================================================================
-- SHOE MANUFACTURING ERP — ONE-SHOT INITIALIZER
-- Drops and recreates the database, runs schema + seed in one command:
--
--   psql -U postgres -f db/init.sql
-- =============================================================================

\c postgres

DROP DATABASE IF EXISTS shoe_erp_db;
CREATE DATABASE shoe_erp_db
    ENCODING    = 'UTF8'
    LC_COLLATE  = 'en_US.UTF-8'
    LC_CTYPE    = 'en_US.UTF-8'
    TEMPLATE    = template0;

\c shoe_erp_db

\i db/schema.sql
\i db/seed.sql
