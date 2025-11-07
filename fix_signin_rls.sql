-- Fix sign-in issue by ensuring users can read their own profile
-- The problem: RLS is enabled on users table but policies may be blocking access

-- Step 1: Check current RLS status and policies on users table
DO $$
BEGIN
    RAISE NOTICE '=== Current RLS Status ===';
END $$;

SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'users';

-- Step 2: Drop any existing restrictive policies on users table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.users;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.users;
DROP POLICY IF EXISTS "Enable update for users" ON public.users;

-- Step 3: Create permissive policies for authenticated users
-- Allow all authenticated users to read all profiles (needed for role checking)
CREATE POLICY "Allow authenticated users to read all profiles"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Allow authenticated users to insert own profile"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth_user_id = auth.uid());

-- Allow authenticated users to update their own profile
CREATE POLICY "Allow authenticated users to update own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth_user_id = auth.uid())
WITH CHECK (auth_user_id = auth.uid());

-- Step 4: Also ensure user_roles table is accessible (if it exists)
DO $$
BEGIN
    -- Check if user_roles table exists
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
        -- Drop existing policy if any
        DROP POLICY IF EXISTS "Enable read access for user_roles" ON public.user_roles;
        
        -- Create new policy
        CREATE POLICY "Allow authenticated users to read user_roles"
        ON public.user_roles
        FOR SELECT
        TO authenticated
        USING (true);
        
        RAISE NOTICE 'user_roles table found - RLS policy created';
    ELSE
        RAISE NOTICE 'user_roles table does not exist - skipping (not needed for basic auth)';
    END IF;
END $$;

-- Step 5: Verify policies are created
DO $$
BEGIN
    RAISE NOTICE '=== RLS Policies Created Successfully ===';
    RAISE NOTICE 'Users can now:';
    RAISE NOTICE '  - Read all profiles (for role/username lookup)';
    RAISE NOTICE '  - Insert their own profile during signup';
    RAISE NOTICE '  - Update their own profile';
    RAISE NOTICE '  - Read user_roles table';
END $$;

-- Display active policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'users'
ORDER BY tablename, policyname;

-- Also check user_roles policies if the table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_roles') THEN
        RAISE NOTICE 'user_roles policies:';
        PERFORM schemaname, tablename, policyname
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_roles';
    END IF;
END $$;
