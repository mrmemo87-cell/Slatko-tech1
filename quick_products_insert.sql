-- Quick Products Insert Script
-- Run this in Supabase SQL Editor to add your products

INSERT INTO public.products (name, unit, price) VALUES
('New York Cheesecake', 'slice', 150),
('Red Velvet (Krasni Barxat)', 'slice', 130),
('Honey Cake (Medovik)', 'slice', 150),
('New York Strawberry', 'slice', 195),
('New York Raspberry', 'slice', 195),
('New York Pistachio', 'slice', 195),
('New York Mango', 'slice', 195),
('San Sebastian', 'slice', 185),
('Dubai San Sebastian', 'slice', 275),
('Dubai Solly', 'slice', 275),
('Dubai Cheesecake', 'slice', 275),
('Snickers', 'slice', 275);

-- Verify
SELECT name, price FROM public.products ORDER BY price;