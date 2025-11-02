import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all deliveries with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      status = null, 
      client_id = null, 
      date_from = null, 
      date_to = null, 
      limit = 100, 
      offset = 0 
    } = req.query;

    let queryText = `
      SELECT 
        d.*,
        c.name as client_name,
        c.business_name,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', di.id,
              'product_id', di.product_id,
              'quantity', di.quantity,
              'price', di.price,
              'product_name', p.name,
              'product_unit', p.unit
            )
          ) FROM delivery_items di 
          LEFT JOIN products p ON di.product_id = p.id 
          WHERE di.delivery_id = d.id), 
          '[]'::json
        ) as items,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', ri.id,
              'product_id', ri.product_id,
              'quantity', ri.quantity,
              'reason', ri.reason,
              'product_name', p.name
            )
          ) FROM return_items ri 
          LEFT JOIN products p ON ri.product_id = p.id 
          WHERE ri.delivery_id = d.id), 
          '[]'::json
        ) as returned_items,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', pay.id,
              'amount', pay.amount,
              'method', pay.method,
              'reference', pay.reference,
              'date', pay.date
            )
          ) FROM payments pay WHERE pay.delivery_id = d.id), 
          '[]'::json
        ) as payments
      FROM deliveries d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;

    if (status) {
      paramCount++;
      queryText += ` AND d.status = $${paramCount}`;
      queryParams.push(status);
    }

    if (client_id) {
      paramCount++;
      queryText += ` AND d.client_id = $${paramCount}`;
      queryParams.push(client_id);
    }

    if (date_from) {
      paramCount++;
      queryText += ` AND d.date >= $${paramCount}`;
      queryParams.push(date_from);
    }

    if (date_to) {
      paramCount++;
      queryText += ` AND d.date <= $${paramCount}`;
      queryParams.push(date_to);
    }

    queryText += ` ORDER BY d.date DESC, d.created_at DESC`;
    
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    queryParams.push(limit);
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    const result = await query(queryText, queryParams);
    res.json(result.rows);

  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single delivery
router.get('/:id', async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        d.*,
        c.name as client_name,
        c.business_name,
        c.credit_limit,
        c.current_balance,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', di.id,
              'product_id', di.product_id,
              'quantity', di.quantity,
              'price', di.price,
              'product_name', p.name,
              'product_unit', p.unit
            )
          ) FROM delivery_items di 
          LEFT JOIN products p ON di.product_id = p.id 
          WHERE di.delivery_id = d.id), 
          '[]'::json
        ) as items,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', ri.id,
              'product_id', ri.product_id,
              'quantity', ri.quantity,
              'reason', ri.reason,
              'product_name', p.name
            )
          ) FROM return_items ri 
          LEFT JOIN products p ON ri.product_id = p.id 
          WHERE ri.delivery_id = d.id), 
          '[]'::json
        ) as returned_items,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', pay.id,
              'amount', pay.amount,
              'method', pay.method,
              'reference', pay.reference,
              'date', pay.date
            )
          ) FROM payments pay WHERE pay.delivery_id = d.id), 
          '[]'::json
        ) as payments
      FROM deliveries d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.id = $1
    `, [req.params.id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get delivery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create new delivery (mobile-optimized)
router.post('/', async (req, res) => {
  const client = await query('BEGIN');
  
  try {
    const { client_id, date, items, notes = null } = req.body;

    // Validate required fields
    if (!client_id || !date || !items || items.length === 0) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Client, date, and items are required' });
    }

    // Generate invoice number
    const invoiceResult = await query(
      'SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM \'INV([0-9]+)\') AS INTEGER)), 0) + 1 as next_number FROM deliveries WHERE invoice_number ~ \'INV[0-9]+\''
    );
    const invoiceNumber = `INV${String(invoiceResult.rows[0].next_number).padStart(6, '0')}`;

    // Create delivery
    const deliveryResult = await query(
      'INSERT INTO deliveries (invoice_number, client_id, date, notes) VALUES ($1, $2, $3, $4) RETURNING *',
      [invoiceNumber, client_id, date, notes]
    );

    const delivery = deliveryResult.rows[0];

    // Validate and create delivery items
    for (const item of items) {
      const { product_id, quantity, price } = item;
      
      if (!product_id || !quantity || !price || quantity <= 0 || price < 0) {
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid item data: product_id, quantity > 0, and price >= 0 are required' });
      }

      // Check product availability
      const productResult = await query('SELECT stock, name FROM products WHERE id = $1 AND is_active = true', [product_id]);
      if (productResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(400).json({ error: `Product with ID ${product_id} not found or inactive` });
      }

      const product = productResult.rows[0];
      if (product.stock < quantity) {
        await query('ROLLBACK');
        return res.status(400).json({ 
          error: `Insufficient stock for ${product.name}. Available: ${product.stock}, Requested: ${quantity}` 
        });
      }

      // Create delivery item
      await query(
        'INSERT INTO delivery_items (delivery_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
        [delivery.id, product_id, quantity, price]
      );

      // Update product stock
      await query(
        'UPDATE products SET stock = stock - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, product_id]
      );
    }

    await query('COMMIT');

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['deliveries', delivery.id, 'CREATE', req.user.id, JSON.stringify({ delivery, items })]
    );

    // Return the created delivery with full details
    const fullDeliveryResult = await query(`
      SELECT 
        d.*,
        c.name as client_name,
        c.business_name,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', di.id,
              'product_id', di.product_id,
              'quantity', di.quantity,
              'price', di.price,
              'product_name', p.name,
              'product_unit', p.unit
            )
          ) FROM delivery_items di 
          LEFT JOIN products p ON di.product_id = p.id 
          WHERE di.delivery_id = d.id), 
          '[]'::json
        ) as items
      FROM deliveries d
      LEFT JOIN clients c ON d.client_id = c.id
      WHERE d.id = $1
    `, [delivery.id]);

    res.status(201).json(fullDeliveryResult.rows[0]);

  } catch (error) {
    await query('ROLLBACK');
    console.error('Create delivery error:', error);
    
    if (error.code === '23503') { // Foreign key violation
      res.status(400).json({ error: 'Invalid client or product ID' });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update delivery status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Pending', 'Settled', 'Paid'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: Pending, Settled, Paid' });
    }

    const result = await query(
      'UPDATE deliveries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['deliveries', req.params.id, 'UPDATE', req.user.id, JSON.stringify({ status })]
    );

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add return items to delivery
router.post('/:id/returns', async (req, res) => {
  const client = await query('BEGIN');
  
  try {
    const { returns } = req.body; // Array of { product_id, quantity, reason }

    if (!returns || returns.length === 0) {
      await query('ROLLBACK');
      return res.status(400).json({ error: 'Returns array is required' });
    }

    // Check if delivery exists
    const deliveryResult = await query('SELECT id, status FROM deliveries WHERE id = $1', [req.params.id]);
    if (deliveryResult.rows.length === 0) {
      await query('ROLLBACK');
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Process each return
    for (const returnItem of returns) {
      const { product_id, quantity, reason = null } = returnItem;
      
      if (!product_id || !quantity || quantity <= 0) {
        await query('ROLLBACK');
        return res.status(400).json({ error: 'Invalid return data: product_id and quantity > 0 are required' });
      }

      // Verify the product was in the original delivery
      const deliveryItemResult = await query(
        'SELECT quantity FROM delivery_items WHERE delivery_id = $1 AND product_id = $2',
        [req.params.id, product_id]
      );

      if (deliveryItemResult.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(400).json({ error: `Product was not part of this delivery` });
      }

      // Check if return quantity doesn't exceed delivered quantity (minus already returned)
      const existingReturnsResult = await query(
        'SELECT COALESCE(SUM(quantity), 0) as returned_qty FROM return_items WHERE delivery_id = $1 AND product_id = $2',
        [req.params.id, product_id]
      );

      const deliveredQty = deliveryItemResult.rows[0].quantity;
      const alreadyReturned = existingReturnsResult.rows[0].returned_qty;
      
      if (quantity > (deliveredQty - alreadyReturned)) {
        await query('ROLLBACK');
        return res.status(400).json({ 
          error: `Return quantity exceeds available amount. Delivered: ${deliveredQty}, Already returned: ${alreadyReturned}` 
        });
      }

      // Create return item
      await query(
        'INSERT INTO return_items (delivery_id, product_id, quantity, reason) VALUES ($1, $2, $3, $4)',
        [req.params.id, product_id, quantity, reason]
      );

      // Update product stock (add back returned items)
      await query(
        'UPDATE products SET stock = stock + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [quantity, product_id]
      );
    }

    await query('COMMIT');

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['deliveries', req.params.id, 'UPDATE', req.user.id, JSON.stringify({ returns })]
    );

    res.json({ message: 'Returns processed successfully' });

  } catch (error) {
    await query('ROLLBACK');
    console.error('Add returns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add payment to delivery
router.post('/:id/payments', async (req, res) => {
  try {
    const { amount, method = 'cash', reference = null, date } = req.body;

    if (!amount || amount <= 0 || !date) {
      return res.status(400).json({ error: 'Amount > 0 and date are required' });
    }

    const validMethods = ['cash', 'card', 'bank_transfer', 'check'];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Check if delivery exists
    const deliveryResult = await query('SELECT id FROM deliveries WHERE id = $1', [req.params.id]);
    if (deliveryResult.rows.length === 0) {
      return res.status(404).json({ error: 'Delivery not found' });
    }

    // Create payment
    const result = await query(
      'INSERT INTO payments (delivery_id, amount, method, reference, date) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [req.params.id, amount, method, reference, date]
    );

    // Update client balance if needed
    const deliveryInfo = await query(`
      SELECT d.client_id, 
             COALESCE(SUM(di.quantity * di.price), 0) as total_amount,
             COALESCE((SELECT SUM(ri.quantity * di.price) 
                      FROM return_items ri 
                      JOIN delivery_items di ON ri.delivery_id = di.delivery_id AND ri.product_id = di.product_id 
                      WHERE ri.delivery_id = d.id), 0) as return_amount,
             COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.delivery_id = d.id), 0) as total_paid
      FROM deliveries d
      LEFT JOIN delivery_items di ON d.id = di.delivery_id
      WHERE d.id = $1
      GROUP BY d.id, d.client_id
    `, [req.params.id]);

    const delivery = deliveryInfo.rows[0];
    const netAmount = delivery.total_amount - delivery.return_amount;
    const balance = netAmount - delivery.total_paid;

    // Update delivery status based on payment
    let newStatus = 'Pending';
    if (balance <= 0.01) { // Account for floating point precision
      newStatus = 'Paid';
    } else if (delivery.total_paid > 0) {
      newStatus = 'Settled';
    }

    await query(
      'UPDATE deliveries SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [newStatus, req.params.id]
    );

    // Log sync event
    await query(
      'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5)',
      ['deliveries', req.params.id, 'UPDATE', req.user.id, JSON.stringify({ payment: result.rows[0], new_status: newStatus })]
    );

    res.status(201).json({
      payment: result.rows[0],
      delivery_status: newStatus,
      remaining_balance: Math.max(balance, 0)
    });

  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get delivery statistics
router.get('/stats/summary', async (req, res) => {
  try {
    const { date_from = null, date_to = null } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (date_from && date_to) {
      dateFilter = 'WHERE d.date BETWEEN $1 AND $2';
      params.push(date_from, date_to);
    }

    const result = await query(`
      SELECT 
        COUNT(*) as total_deliveries,
        COUNT(*) FILTER (WHERE d.status = 'Pending') as pending_deliveries,
        COUNT(*) FILTER (WHERE d.status = 'Settled') as settled_deliveries,
        COUNT(*) FILTER (WHERE d.status = 'Paid') as paid_deliveries,
        COALESCE(SUM(
          (SELECT SUM(di.quantity * di.price) FROM delivery_items di WHERE di.delivery_id = d.id) -
          COALESCE((SELECT SUM(ri.quantity * 
            (SELECT di2.price FROM delivery_items di2 WHERE di2.delivery_id = ri.delivery_id AND di2.product_id = ri.product_id LIMIT 1)
          ) FROM return_items ri WHERE ri.delivery_id = d.id), 0)
        ), 0) as total_revenue,
        COALESCE(SUM((SELECT SUM(p.amount) FROM payments p WHERE p.delivery_id = d.id)), 0) as total_payments
      FROM deliveries d ${dateFilter}
    `, params);

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;