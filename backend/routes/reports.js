import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get basic reports
router.get('/summary', async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (date_from && date_to) {
      dateFilter = 'WHERE date BETWEEN $1 AND $2';
      params.push(date_from, date_to);
    }

    const [deliveries, production, purchases] = await Promise.all([
      query(`SELECT COUNT(*) as count, COALESCE(SUM((SELECT SUM(di.quantity * di.price) FROM delivery_items di WHERE di.delivery_id = d.id)), 0) as total FROM deliveries d ${dateFilter}`, params),
      query(`SELECT COUNT(*) as count FROM production_batches pb ${dateFilter.replace('date', 'start_date')}`, params),
      query(`SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as total FROM purchases p ${dateFilter}`, params)
    ]);

    res.json({
      deliveries: deliveries.rows[0],
      production: production.rows[0], 
      purchases: purchases.rows[0]
    });
  } catch (error) {
    console.error('Get reports summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;