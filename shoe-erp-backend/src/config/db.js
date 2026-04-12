'use strict';

require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME     || 'shoe_erp_db',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max:                 10,
  idleTimeoutMillis:   30_000,
  connectionTimeoutMillis: 5_000,
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
