// Environment Configuration Verification
// Run this to check Supabase setup consistency

export function verifySupabaseConfig() {
  console.log('🔍 Verifying Supabase Configuration...');
  
  const config = {
    url: 'https://wfbvvbqzvolkbktvpnaq.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmYnZ2YnF6dm9sa2JrdHZwbmFxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwOTcyNjYsImV4cCI6MjA3NzY3MzI2Nn0.Q27Y-EJy0g2-XvQDXcbgo9K8UxwbBzCrTAkRaSi1NKE',
    environment: process.env.NODE_ENV || 'development'
  };
  
  // Verify URL format
  const urlValid = config.url.startsWith('https://') && config.url.includes('.supabase.co');
  
  // Verify key format (should be JWT)
  const keyValid = config.anonKey.split('.').length === 3; // JWT has 3 parts
  
  console.log('📋 Configuration Check:');
  console.log('  URL Valid:', urlValid ? '✅' : '❌', config.url);
  console.log('  Key Valid:', keyValid ? '✅' : '❌');
  console.log('  Environment:', config.environment);
  
  // Test connection
  return {
    url: config.url,
    keyValid,
    urlValid,
    environment: config.environment,
    status: urlValid && keyValid ? 'READY' : 'INVALID'
  };
}

// Schema verification queries (run in Supabase SQL Editor)
export const SCHEMA_VERIFICATION_SQL = `
-- Verify all required tables exist with correct structure
SELECT 'SCHEMA VERIFICATION:' as check;

-- Check tables exist
SELECT 
  'TABLES CHECK' as verification,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN '✅' ELSE '❌' END as products,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'clients') THEN '✅' ELSE '❌' END as clients,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN '✅' ELSE '❌' END as materials,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deliveries') THEN '✅' ELSE '❌' END as deliveries,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'production_batches') THEN '✅' ELSE '❌' END as production_batches;

-- Check RLS is enabled
SELECT 
  'RLS STATUS' as verification,
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('products', 'clients', 'materials', 'deliveries', 'production_batches');

-- Check policies exist
SELECT 
  'POLICIES COUNT' as verification,
  schemaname,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Test data access
SELECT 'DATA ACCESS TEST' as verification;
SELECT 'Products count:' as table_name, COUNT(*) as count FROM products;
SELECT 'Materials count:' as table_name, COUNT(*) as count FROM materials;
SELECT 'Clients count:' as table_name, COUNT(*) as count FROM clients;

SELECT 'SCHEMA VERIFICATION COMPLETE ✅' as status;
`;

console.log('🔧 Schema Verification SQL ready - paste into Supabase SQL Editor:');
console.log(SCHEMA_VERIFICATION_SQL);