'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { query } = require('../config/db');

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    // Fetch active user
    const result = await query(
      `SELECT id, name, email, password_hash, role
       FROM   users
       WHERE  email = $1 AND is_active = TRUE`,
      [email.trim().toLowerCase()],
    );

    if (!result.rows.length) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user    = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const payload = { id: user.id, name: user.name, email: user.email, role: user.role };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Client-side only — backend simply acknowledges
const logout = (_req, res) => {
  return res.status(200).json({ success: true, message: 'Logged out successfully.' });
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Returns the decoded user from req.user (attached by authMiddleware)
const me = (req, res) => {
  return res.status(200).json({ success: true, data: req.user });
};

// ─── GET /api/users ─────────────────────────────────────────────────────────
const getAllUsers = async (req, res, next) => {
  try {
    const { rows } = await query(`
       SELECT id, name, email, role, is_active, last_login, phone, department 
       FROM users ORDER BY id ASC
    `);
    return res.json({ success: true, data: rows });
  } catch(err) {
    next(err);
  }
};

// ─── POST /api/users ────────────────────────────────────────────────────────
const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Name, email, password and role are required' });
    }

    const hash = await bcrypt.hash(password, 10);

    const { rows } = await query(`
      INSERT INTO users (name, email, password_hash, role, phone, department)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role, phone, department
    `, [name, email, hash, role, phone, department]);

    return res.status(201).json({ success: true, data: rows[0] });
  } catch(err) {
    if (err.code === '23505') return res.status(400).json({ success: false, message: 'Email is already in use.' });
    next(err);
  }
};

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, phone, department, is_active } = req.body;

    if (id == req.user.id && role && role !== req.user.role) {
      return res.status(400).json({ success: false, message: "Cannot change your own role." });
    }

    const { rows } = await query(`
      UPDATE users SET 
        name = COALESCE($1, name),
        role = COALESCE($2, role),
        phone = COALESCE($3, phone),
        department = COALESCE($4, department),
        is_active = COALESCE($5, is_active)
      WHERE id = $6 RETURNING id, name, email, role, phone, department, is_active
    `, [name, role, phone, department, is_active, id]);

    if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, data: rows[0] });
  } catch(err) {
    next(err);
  }
};

// ─── PUT /api/users/:id/reset-password ─────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { new_password } = req.body;

    if(!new_password) return res.status(400).json({ success: false, message: "new_password is required" });
    
    const hash = await bcrypt.hash(new_password, 10);
    const { rows } = await query(`UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id`, [hash, id]);
    
    if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    return res.json({ success: true, message: "Password reset successfully" });
  } catch(err) {
    next(err);
  }
};

// ─── DELETE /api/users/:id ───────────────────────────────────────────────────
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id == req.user.id) {
       return res.status(400).json({ success: false, message: "Cannot deactivate your own account" });
    }

    const { rows } = await query(`UPDATE users SET is_active = FALSE WHERE id = $1 RETURNING id`, [id]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    
    return res.json({ success: true, message: "User deactivated successfully" });
  } catch(err) {
    next(err);
  }
};


module.exports = { login, logout, me, getAllUsers, createUser, updateUser, resetPassword, deleteUser };
