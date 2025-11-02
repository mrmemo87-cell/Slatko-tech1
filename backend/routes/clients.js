import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all clients
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM clients WHERE is_active = true ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create client
router.post('/', async (req, res) => {
  try {
    const { name, business_name, email, phone, address, credit_limit = 0 } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const result = await query(
      'INSERT INTO clients (name, business_name, email, phone, address, credit_limit) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, business_name, email, phone, address, credit_limit]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;