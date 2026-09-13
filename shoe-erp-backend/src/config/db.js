'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('railway.internal')
        ? false
        : { rejectUnauthorized: false },
    }
  : {
      host:     process.env.DB_HOST || process.env.PGHOST || 'localhost',
      port:     Number(process.env.DB_PORT || process.env.PGPORT) || 5432,
      database: process.env.DB_NAME || process.env.PGDATABASE || 'shoe_erp_db',
      user:     process.env.DB_USER || process.env.PGUSER || 'postgres',
      password: process.env.DB_PASSWORD || process.env.PGPASSWORD || '',
      ssl: process.env.NODE_ENV === 'production' && !process.env.DB_HOST?.includes('localhost')
        ? { rejectUnauthorized: false }
        : false,
    };

const pool = new Pool({
  ...connectionConfig,
  max:                 10,
  idleTimeoutMillis:   30_000,
  connectionTimeoutMillis: 10_000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

/**
 * Convenience wrapper — returns rows array directly.
 * @param {string} text  — SQL query string
 * @param {any[]}  params — Bound parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client for manual transaction control.
 * Always call client.release() in a finally block.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };
