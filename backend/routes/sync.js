import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from './auth.js';

const router = express.Router();
router.use(authenticateToken);

// Get sync changes since timestamp
router.get('/changes', async (req, res) => {
  try {
    const { since_timestamp } = req.query;
    
    if (!since_timestamp) {
      return res.status(400).json({ error: 'since_timestamp parameter is required' });
    }

    const result = await query(
      'SELECT * FROM sync_log WHERE timestamp > $1 ORDER BY timestamp ASC',
      [since_timestamp]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Get sync changes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record offline changes (for when mobile app comes back online)
router.post('/upload', async (req, res) => {
  try {
    const { changes } = req.body; // Array of offline changes
    
    if (!changes || !Array.isArray(changes)) {
      return res.status(400).json({ error: 'Changes array is required' });
    }

    const results = [];
    
    for (const change of changes) {
      // Process offline changes and apply to database
      // This would need more sophisticated conflict resolution
      const result = await query(
        'INSERT INTO sync_log (table_name, record_id, operation, user_id, data) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [change.table_name, change.record_id, change.operation, req.user.id, change.data]
      );
      results.push(result.rows[0]);
    }

    res.json({ processed: results.length, results });
  } catch (error) {
    console.error('Upload sync changes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;