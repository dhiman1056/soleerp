'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('../config/db');

const USERS = [
  { name: 'Admin User',    email: 'admin@shoecompany.com',    password: 'Admin@123',    role: 'admin'    },
  { name: 'Manager User',  email: 'manager@shoecompany.com',  password: 'Manager@123',  role: 'manager'  },
  { name: 'Operator User', email: 'operator@shoecompany.com', password: 'Operator@123', role: 'operator' },
];

(async () => {
  try {
    for (const u of USERS) {
      const hash = await bcrypt.hash(u.password, 10);
      await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE
           SET password_hash = EXCLUDED.password_hash,
               role          = EXCLUDED.role`,
        [u.name, u.email, hash, u.role],
      );
      console.log(`✅  Seeded ${u.role}: ${u.email}`);
    }
    console.log('\nDone. Run your backend and log in at /login.\n');
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
})();
