import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get all production batches
router.get('/', async (req, res) => {
  try {
    const result = await query(`
      SELECT pb.*, p.name as product_name, p.unit as product_unit,
             COALESCE(
               (SELECT json_agg(
                 json_build_object(
                   'material_id', pmc.material_id,
                   'quantity', pmc.quantity,
                   'cost', pmc.cost,
                   'material_name', m.name,
                   'material_unit', m.unit
                 )
               ) FROM production_material_costs pmc 
               LEFT JOIN materials m ON pmc.material_id = m.id 
               WHERE pmc.production_batch_id = pb.id), 
               '[]'::json
             ) as material_costs
      FROM production_batches pb
      LEFT JOIN products p ON pb.product_id = p.id
      ORDER BY pb.start_date DESC, pb.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Get production batches error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create production batch
router.post('/', async (req, res) => {
  const client = await query('BEGIN');
  
  try {
    const { product_id, quantity, start_date, material_costs = [], notes } = req.body;
    
    if (!product_id || !quantity || !start_date) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Product ID, quantity, and start date are required' });
    }

    // Generate batch number
    const batchResult = await query(
      'SELECT COALESCE(MAX(CAST(SUBSTRING(batch_number FROM \'B([0-9]+)\') AS INTEGER)), 0) + 1 as next_number FROM production_batches WHERE batch_number ~ \'B[0-9]+\''
    );
    const batchNumber = `B${String(batchResult.rows[0].next_number).padStart(6, '0')}`;

    // Calculate total cost from materials
    let totalCost = 0;
    for (const materialCost of material_costs) {
      totalCost += materialCost.cost;
    }

    // Create production batch
    const result = await query(
      'INSERT INTO production_batches (batch_number, product_id, quantity, start_date, total_cost, cost_per_unit, notes) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [batchNumber, product_id, quantity, start_date, totalCost, totalCost / quantity, notes]
    );

    const batch = result.rows[0];

    // Add material costs
    for (const materialCost of material_costs) {
      await query(
        'INSERT INTO production_material_costs (production_batch_id, material_id, quantity, cost) VALUES ($1, $2, $3, $4)',
        [batch.id, materialCost.material_id, materialCost.quantity, materialCost.cost]
      );
    }

    await query('COMMIT');

    res.status(201).json(batch);
  } catch (error) {
    await query('ROLLBACK');
    console.error('Create production batch error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update batch status
router.patch('/:id/status', async (req, res) => {
  try {
    const { batch_status } = req.body;
    const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'QUALITY_HOLD', 'REJECTED'];
    
    if (!validStatuses.includes(batch_status)) {
      return res.status(400).json({ error: 'Invalid batch status' });
    }

    const result = await query(
      'UPDATE production_batches SET batch_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [batch_status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Production batch not found' });
    }

    // If completed, update product stock
    if (batch_status === 'COMPLETED') {
      await query(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [result.rows[0].quantity, result.rows[0].product_id]
      );
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update batch status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;