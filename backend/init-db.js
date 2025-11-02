import { initializeDatabase } from './config/database.js';

console.log('🚀 Starting database initialization...');

try {
  await initializeDatabase();
  console.log('✅ Database initialization completed successfully!');
  console.log('💡 Default admin user created:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   ⚠️  Please change this password immediately after first login!');
  process.exit(0);
} catch (error) {
  console.error('❌ Database initialization failed:', error);
  process.exit(1);
}