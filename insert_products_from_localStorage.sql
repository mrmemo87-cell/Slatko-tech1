-- SQL Script to Insert Products from localStorage to Supabase
-- These are the products that were added through the app interface but stored in localStorage

-- Clear existing products first (optional - remove this line if you want to keep existing products)
-- DELETE FROM public.products;

-- Insert the products from your app interface
INSERT INTO public.products (name, unit, price, cost, category, description, is_active, shelf_life_days) VALUES
('New York Cheesecake', 'slice', 150, 0, 'Cheesecakes', 'Classic New York style cheesecake', true, 7),
('Red Velvet (Krasni Barxat)', 'slice', 130, 0, 'Cakes', 'Traditional red velvet cake', true, 5),
('Honey Cake (Medovik)', 'slice', 150, 0, 'Cakes', 'Traditional honey layered cake', true, 5),
('New York Strawberry', 'slice', 195, 0, 'Cheesecakes', 'New York cheesecake with strawberry topping', true, 7),
('New York Raspberry', 'slice', 195, 0, 'Cheesecakes', 'New York cheesecake with raspberry topping', true, 7),
('New York Pistachio', 'slice', 195, 0, 'Cheesecakes', 'New York cheesecake with pistachio flavor', true, 7),
('New York Mango', 'slice', 195, 0, 'Cheesecakes', 'New York cheesecake with mango topping', true, 7),
('San Sebastian', 'slice', 185, 0, 'Cheesecakes', 'Basque burnt cheesecake', true, 5),
('Dubai San Sebastian', 'slice', 275, 0, 'Premium', 'Premium Dubai style San Sebastian cheesecake', true, 5),
('Dubai Solly', 'slice', 275, 0, 'Premium', 'Premium Dubai style Solly cake', true, 5),
('Dubai Cheesecake', 'slice', 275, 0, 'Premium', 'Premium Dubai style cheesecake', true, 7),
('Snickers', 'slice', 275, 0, 'Premium', 'Snickers flavored premium cake', true, 5);

-- Verify the insert
SELECT COUNT(*) as total_products FROM public.products;
SELECT name, unit, price FROM public.products ORDER BY name;