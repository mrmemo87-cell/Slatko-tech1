-- Fix RLS to allow workers to READ product and client information
-- Workers need to see product names and client names in production portal
-- But cannot modify them

-- ============= PRODUCTS TABLE =============
-- Drop all existing product policies to clean slate
DROP POLICY IF EXISTS "products_only_non_workers" ON public.products;
DROP POLICY IF EXISTS "products_read_all" ON public.products;
DROP POLICY IF EXISTS "products_write_non_workers" ON public.products;
DROP POLICY IF EXISTS "products_update_non_workers" ON public.products;
DROP POLICY IF EXISTS "products_delete_non_workers" ON public.products;

-- Allow all authenticated users to READ products
CREATE POLICY "products_read_all" ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- Restrict WRITE operations to non-workers only
CREATE POLICY "products_write_non_workers" ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_worker_role());

CREATE POLICY "products_update_non_workers" ON public.products
  FOR UPDATE
  TO authenticated
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

CREATE POLICY "products_delete_non_workers" ON public.products
  FOR DELETE
  TO authenticated
  USING (NOT is_worker_role());

-- ============= CLIENTS TABLE =============
-- Drop all existing client policies to clean slate
DROP POLICY IF EXISTS "clients_only_non_workers" ON public.clients;
DROP POLICY IF EXISTS "clients_read_all" ON public.clients;
DROP POLICY IF EXISTS "clients_write_non_workers" ON public.clients;
DROP POLICY IF EXISTS "clients_update_non_workers" ON public.clients;
DROP POLICY IF EXISTS "clients_delete_non_workers" ON public.clients;

-- Allow all authenticated users to READ clients
CREATE POLICY "clients_read_all" ON public.clients
  FOR SELECT
  TO authenticated
  USING (true);

-- Restrict WRITE operations to non-workers only
CREATE POLICY "clients_write_non_workers" ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (NOT is_worker_role());

CREATE POLICY "clients_update_non_workers" ON public.clients
  FOR UPDATE
  TO authenticated
  USING (NOT is_worker_role())
  WITH CHECK (NOT is_worker_role());

CREATE POLICY "clients_delete_non_workers" ON public.clients
  FOR DELETE
  TO authenticated
  USING (NOT is_worker_role());

