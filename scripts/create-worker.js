// scripts/create-worker.js
// Creates a Supabase auth user (admin) and upserts a public.users row with role='worker'.
// Usage (PowerShell):
//   $env:SUPABASE_URL="https://your-project.supabase.co"
//   $env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
//   node .\scripts\create-worker.js aigerim@slatko.asia TemporaryPass123 Aigerim

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function createWorker(email, password, username = 'worker') {
  console.log('Creating auth user for', email);
  // Create auth user (admin)
  const { data: createData, error: createErr } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { username }
  });

  if (createErr) {
    console.error('Failed to create auth user:', createErr.message || createErr);
    process.exit(1);
  }

  // supabase.auth.admin.createUser may return different shapes depending on client version
  const auth_user_id = (createData && (createData.user?.id || createData.id)) || null;
  if (!auth_user_id) {
    console.error('Could not determine created auth user id from response:', createData);
    process.exit(1);
  }

  console.log('Auth user created with id:', auth_user_id);

  // Upsert into public.users
  console.log('Upserting into public.users...');
  const { data: upsertData, error: upsertErr } = await supabase
    .from('users')
    .upsert({ auth_user_id, username, role: 'worker', is_active: true }, { onConflict: 'auth_user_id' });

  if (upsertErr) {
    console.error('Failed to upsert public.users:', upsertErr.message || upsertErr);
    process.exit(1);
  }

  console.log('Upsert successful. Result:', upsertData);
  console.log('Done. Send a password reset/invite link via Supabase Dashboard or email the temporary password securely.');
}

// CLI args: email password username
const [email, password, username] = process.argv.slice(2);
if (!email || !password) {
  console.error('Usage: node scripts/create-worker.js <email> <temporaryPassword> [username]');
  process.exit(1);
}

createWorker(email, password, username || 'worker').catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
