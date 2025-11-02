import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all purchases
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT p.*, 
             COALESCE(
               (SELECT json_agg(
                 json_build_object(
                   'id', pi.id,
                   'material_id', pi.material_id,
                   'quantity', pi.quantity,
                   'unit_cost', pi.unit_cost,
                   'total_cost', pi.total_cost,
                   'material_name', m.name,
                   'material_unit', m.unit
                 )
               ) FROM purchase_items pi 
               LEFT JOIN materials m ON pi.material_id = m.id 
               WHERE pi.purchase_id = p.id), 
               '[]'::json
             ) as items
      FROM purchases p
      ORDER BY p.date DESC, p.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create purchase
router.post('/', async (req, res) => {
  try {
    const { supplier, date, items, notes } = req.body;
    
    if (!supplier || !date || !items || items.length === 0) {
      return res.status(400).json({ error: 'Supplier, date, and items are required' });
    }

    // Calculate total amount
    const total_amount = items.reduce((sum, item) => sum + item.total_cost, 0);

    // Create purchase
    const result = await query(
      'INSERT INTO purchases (supplier, date, total_amount, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [supplier, date, total_amount, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Create purchase error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;