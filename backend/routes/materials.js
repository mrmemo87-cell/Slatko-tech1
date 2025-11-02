import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all materials
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM materials ORDER BY name ASC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get materials error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create material
router.post('/', async (req, res) => {
  try {
    const { name, unit, stock = 0, cost_per_unit = 0, supplier, expiration_date, min_stock_level = 0 } = req.body;
    
    if (!name || !unit) {
      return res.status(400).json({ error: 'Name and unit are required' });
    }

    const result = await query(
      'INSERT INTO materials (name, unit, stock, cost_per_unit, supplier, expiration_date, min_stock_level) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [name, unit, stock, cost_per_unit, supplier, expiration_date, min_stock_level]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create material error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update material stock
router.patch('/:id/stock', async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    let queryText;
    let queryParams;

    switch (operation) {
      case 'add':
        queryText = 'UPDATE materials SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        queryParams = [quantity, req.params.id];
        break;
      case 'subtract':
        queryText = 'UPDATE materials SET stock = GREATEST(stock - $1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        queryParams = [quantity, req.params.id];
        break;
      case 'set':
      default:
        queryText = 'UPDATE materials SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        queryParams = [quantity, req.params.id];
        break;
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update material stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;