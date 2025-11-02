import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all products
router.get('/', async (req, res) => {
  try {
    const { active_only = 'false', category = null, search = null } = req.query;
    
    let queryText = 'SELECT * FROM products WHERE 1=1';
    const queryParams = [];
    let paramCount = 0;

    if (active_only === 'true') {
      queryText += ` AND is_active = true`;
    }

    if (category) {
      paramCount++;
      queryText += ` AND category = $${paramCount}`;
      queryParams.push(category);
    }

    if (search) {
      paramCount++;
      queryText += ` AND (name ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      queryParams.push(`%${search}%`);
    }

    queryText += ' ORDER BY name ASC';

    const result = await query(queryText, queryParams);
    res.json(result.rows);

  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM products WHERE id = $1', [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new product
router.post('/', async (req, res) => {
  try {
    const { name, unit, price, cost, category, description, stock = 0, shelf_life_days = 7 } = req.body;

    // Validate required fields
    if (!name || !unit || !price) {
      return res.status(400).json({ error: 'Name, unit, and price are required' });
    }

    const result = await query(
      `INSERT INTO products (name, unit, stock, price, cost, category, description, shelf_life_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [name, unit, stock, price, cost || 0, category, description, shelf_life_days]
    );

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['products', result.rows[0].id, 'CREATE', req.user.id, JSON.stringify(result.rows[0])]
    );

    res.status(201).json(result.rows[0]);

  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Product with this name already exists' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update product
router.put('/:id', async (req, res) => {
  try {
    const { name, unit, stock, price, cost, category, description, is_active, shelf_life_days } = req.body;

    // Build dynamic update query
    const fields = [];
    const values = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      fields.push(`name = $${paramCount}`);
      values.push(name);
    }

    if (unit !== undefined) {
      paramCount++;
      fields.push(`unit = $${paramCount}`);
      values.push(unit);
    }

    if (stock !== undefined) {
      paramCount++;
      fields.push(`stock = $${paramCount}`);
      values.push(stock);
    }

    if (price !== undefined) {
      paramCount++;
      fields.push(`price = $${paramCount}`);
      values.push(price);
    }

    if (cost !== undefined) {
      paramCount++;
      fields.push(`cost = $${paramCount}`);
      values.push(cost);
    }

    if (category !== undefined) {
      paramCount++;
      fields.push(`category = $${paramCount}`);
      values.push(category);
    }

    if (description !== undefined) {
      paramCount++;
      fields.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (is_active !== undefined) {
      paramCount++;
      fields.push(`is_active = $${paramCount}`);
      values.push(is_active);
    }

    if (shelf_life_days !== undefined) {
      paramCount++;
      fields.push(`shelf_life_days = $${paramCount}`);
      values.push(shelf_life_days);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at and id parameters
    paramCount++;
    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    paramCount++;
    values.push(req.params.id);

    const queryText = `UPDATE products SET ${fields.join(', ')} WHERE id = $${paramCount} RETURNING *`;

    const result = await query(queryText, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['products', result.rows[0].id, 'UPDATE', req.user.id, JSON.stringify(result.rows[0])]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update product stock (separate endpoint for inventory management)
router.patch('/:id/stock', async (req, res) => {
  try {
    const { quantity, operation = 'set' } = req.body; // operation: 'set', 'add', 'subtract'

    if (quantity === undefined) {
      return res.status(400).json({ error: 'Quantity is required' });
    }

    let queryText;
    let queryParams;

    switch (operation) {
      case 'add':
        queryText = 'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        queryParams = [quantity, req.params.id];
        break;
      case 'subtract':
        queryText = 'UPDATE products SET stock = GREATEST(stock - $1, 0), updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        queryParams = [quantity, req.params.id];
        break;
      case 'set':
      default:
        queryText = 'UPDATE products SET stock = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *';
        queryParams = [quantity, req.params.id];
        break;
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['products', result.rows[0].id, 'UPDATE', req.user.id, JSON.stringify({ operation, quantity, new_stock: result.rows[0].stock })]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update product stock error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete product (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    // Check if user has admin privileges for deletion
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Soft delete by setting is_active = false
    const result = await query(
      'UPDATE products SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['products', result.rows[0].id, 'DELETE', req.user.id, JSON.stringify(result.rows[0])]
    );

    res.json({ message: 'Product deactivated successfully' });

  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get low stock products
router.get('/alerts/low-stock', async (req, res) => {
  try {
    const { threshold = 5 } = req.query;

    const result = await query(
      'SELECT * FROM products WHERE stock <= $1 AND is_active = true ORDER BY stock ASC',
      [threshold]
    );

    res.json(result.rows);

  } catch (error) {
    console.error('Get low stock products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get product categories
router.get('/meta/categories', async (req, res) => {
  try {
    const result = await query(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != \'\' ORDER BY category ASC'
    );

    res.json(result.rows.map(row => row.category));

  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;