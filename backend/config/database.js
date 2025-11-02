import pkg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pkg;
dotenv.config();

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'slatko_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

// Create connection pool
export const pool = new Pool(dbConfig);

// Test the connection
pool.on('connect', () => {
  console.log('📊 Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Database query helper function
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('📝 Executed query', { text: text.substring(0, 50), duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('❌ Database query error:', error);
    throw error;
  }
};

// Database initialization
export const initializeDatabase = async () => {
  try {
    console.log('🔧 Initializing database...');
    
    // Create tables if they don't exist
    await createTables();
    
    // Create indexes for better performance
    await createIndexes();
    
    // Insert default data if needed
    await insertDefaultData();
    
    console.log('✅ Database initialization completed');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
};

// Create all necessary tables
const createTables = async () => {
  const queries = [
    // Users table for authentication
    `CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'manager', 'user')),
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Materials table
    `CREATE TABLE IF NOT EXISTS materials (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(50) NOT NULL,
      stock DECIMAL(10,3) DEFAULT 0,
      cost_per_unit DECIMAL(10,2) DEFAULT 0,
      supplier VARCHAR(255),
      expiration_date DATE,
      min_stock_level DECIMAL(10,3) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Products table
    `CREATE TABLE IF NOT EXISTS products (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      unit VARCHAR(50) NOT NULL,
      stock DECIMAL(10,3) DEFAULT 0,
      price DECIMAL(10,2) NOT NULL,
      cost DECIMAL(10,2) DEFAULT 0,
      category VARCHAR(100),
      description TEXT,
      is_active BOOLEAN DEFAULT true,
      shelf_life_days INTEGER DEFAULT 7,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Clients table
    `CREATE TABLE IF NOT EXISTS clients (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      business_name VARCHAR(255),
      email VARCHAR(100),
      phone VARCHAR(20),
      address TEXT,
      credit_limit DECIMAL(10,2) DEFAULT 0,
      payment_term_days INTEGER DEFAULT 30,
      current_balance DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      risk_level VARCHAR(10) DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
      last_order_date DATE,
      total_order_value DECIMAL(12,2) DEFAULT 0,
      reliability_score INTEGER DEFAULT 100 CHECK (reliability_score >= 0 AND reliability_score <= 100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Production batches table
    `CREATE TABLE IF NOT EXISTS production_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      batch_number VARCHAR(100) UNIQUE NOT NULL,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      quantity DECIMAL(10,3) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE,
      batch_status VARCHAR(20) DEFAULT 'PLANNED' CHECK (batch_status IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'QUALITY_HOLD', 'REJECTED')),
      labor_hours DECIMAL(8,2) DEFAULT 0,
      overhead_cost DECIMAL(10,2) DEFAULT 0,
      total_cost DECIMAL(10,2) DEFAULT 0,
      cost_per_unit DECIMAL(10,4) DEFAULT 0,
      quality_score INTEGER CHECK (quality_score >= 0 AND quality_score <= 100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Material costs for production batches
    `CREATE TABLE IF NOT EXISTS production_material_costs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      production_batch_id UUID REFERENCES production_batches(id) ON DELETE CASCADE,
      material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
      quantity DECIMAL(10,3) NOT NULL,
      cost DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Deliveries table
    `CREATE TABLE IF NOT EXISTS deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      invoice_number VARCHAR(100) UNIQUE NOT NULL,
      client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
      date DATE NOT NULL,
      status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Settled', 'Paid')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Delivery items
    `CREATE TABLE IF NOT EXISTS delivery_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      quantity DECIMAL(10,3) NOT NULL,
      price DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Return items
    `CREATE TABLE IF NOT EXISTS return_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE CASCADE,
      quantity DECIMAL(10,3) NOT NULL,
      reason VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Payments
    `CREATE TABLE IF NOT EXISTS payments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
      amount DECIMAL(10,2) NOT NULL,
      method VARCHAR(50) DEFAULT 'cash' CHECK (method IN ('cash', 'card', 'bank_transfer', 'check')),
      reference VARCHAR(100),
      date DATE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Purchases table
    `CREATE TABLE IF NOT EXISTS purchases (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      supplier VARCHAR(255) NOT NULL,
      date DATE NOT NULL,
      total_amount DECIMAL(10,2) DEFAULT 0,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'received', 'cancelled')),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Purchase items
    `CREATE TABLE IF NOT EXISTS purchase_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      purchase_id UUID REFERENCES purchases(id) ON DELETE CASCADE,
      material_id UUID REFERENCES materials(id) ON DELETE CASCADE,
      quantity DECIMAL(10,3) NOT NULL,
      unit_cost DECIMAL(10,2) NOT NULL,
      total_cost DECIMAL(10,2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    
    // Sync log for offline support
    `CREATE TABLE IF NOT EXISTS sync_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      table_name VARCHAR(100) NOT NULL,
      record_id UUID NOT NULL,
      operation VARCHAR(20) NOT NULL CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE')),
      user_id UUID REFERENCES users(id),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      data JSONB
    )`
  ];

  for (const query of queries) {
    await pool.query(query);
  }
};

// Create database indexes for performance
const createIndexes = async () => {
  const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_deliveries_client_id ON deliveries(client_id)',
    'CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(date)',
    'CREATE INDEX IF NOT EXISTS idx_deliveries_status ON deliveries(status)',
    'CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id)',
    'CREATE INDEX IF NOT EXISTS idx_delivery_items_product_id ON delivery_items(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_production_batches_product_id ON production_batches(product_id)',
    'CREATE INDEX IF NOT EXISTS idx_production_batches_status ON production_batches(batch_status)',
    'CREATE INDEX IF NOT EXISTS idx_production_batches_date ON production_batches(start_date)',
    'CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name)',
    'CREATE INDEX IF NOT EXISTS idx_products_name ON products(name)',
    'CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name)',
    'CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp)',
    'CREATE INDEX IF NOT EXISTS idx_sync_log_table_record ON sync_log(table_name, record_id)'
  ];

  for (const index of indexes) {
    await pool.query(index);
  }
};

// Insert default data
const insertDefaultData = async () => {
  // Check if admin user exists
  const adminExists = await pool.query('SELECT id FROM users WHERE role = $1 LIMIT 1', ['admin']);
  
  if (adminExists.rows.length === 0) {
    // Create default admin user (password should be changed immediately)
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4)',
      ['admin', 'admin@slatko.com', hashedPassword, 'admin']
    );
    
    console.log('🔑 Default admin user created (username: admin, password: admin123)');
    console.log('⚠️  Please change the default password immediately!');
  }
};