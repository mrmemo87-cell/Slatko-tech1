-- SQL Script to Replace All Clients and Materials
-- WARNING: This will delete all existing clients and materials data!
-- Make sure to backup your database before running this script.

-- Start transaction
BEGIN;

-- Clear existing data (be careful - this will delete all existing records)
DELETE FROM public.clients;
DELETE FROM public.materials;

-- Insert new clients
INSERT INTO public.clients (name, business_name, email, phone, address, credit_limit, payment_term_days, current_balance, is_active, risk_level, reliability_score) VALUES
('ONLINE', 'ONLINE', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('بيغ بايت', 'بيغ بايت', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('شاشليشني', 'شاشليشني', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('مراش', 'مراش', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('سونون', 'سونون', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('135', '135', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('بايراق', 'بايراق', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('كورداك', 'كورداك', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('دبل شوت', 'دبل شوت', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('تودور', 'تودور', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('pollen', 'pollen', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('شاشليك', 'شاشليك', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('وود', 'وود', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('كافينيي', 'كافينيي', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('بينوتشي', 'بينوتشي', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('ice', 'ice', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('تايمين', 'تايمين', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('لونا', 'لونا', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('فارينتشايا', 'فارينتشايا', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('كافيار', 'كافيار', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('زيرنو 2', 'زيرنو 2', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('سيلينتانا 2', 'سيلينتانا 2', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('شهرزاد', 'شهرزاد', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('أيل', 'أيل', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('زيرنو 1', 'زيرنو 1', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('زيرنو 3', 'زيرنو 3', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('bey', 'bey', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100),
('زادة', 'زادة', NULL, NULL, NULL, 0, 30, 0, true, 'LOW', 100);

-- Insert new materials
INSERT INTO public.materials (name, unit, stock, cost_per_unit, supplier, min_stock_level) VALUES
('Cream Cheese', 'kg', 0, 0, NULL, 0),
('Whipping Cream', 'liter', 0, 0, NULL, 0),
('Eggs', 'piece', 0, 0, NULL, 0),
('Sugar', 'kg', 0, 0, NULL, 0),
('Flour', 'kg', 0, 0, NULL, 0),
('Starch', 'kg', 0, 0, NULL, 0),
('Vanilia', 'bottle', 0, 0, NULL, 0),
('Butter', 'kg', 0, 0, NULL, 0),
('Sour cream', 'kg', 0, 0, NULL, 0),
('Biscuit', 'pack', 0, 0, NULL, 0),
('White Chocolate', 'kg', 0, 0, NULL, 0),
('Milk Chocolare', 'kg', 0, 0, NULL, 0),
('Dark Chocolate', 'kg', 0, 0, NULL, 0),
('Pistachio Butter', 'kg', 0, 0, NULL, 0),
('Kunafeh', 'kg', 0, 0, NULL, 0),
('Pistachio', 'kg', 0, 0, NULL, 0),
('Lemon', 'piece', 0, 0, NULL, 0),
('Milk', 'liter', 0, 0, NULL, 0),
('Baking Paper', 'roll', 0, 0, NULL, 0),
('Foil Paper', 'roll', 0, 0, NULL, 0),
('Napkins', 'pack', 0, 0, NULL, 0),
('Chocolate Box', 'piece', 0, 0, NULL, 0),
('Cake Box', 'piece', 0, 0, NULL, 0),
('Mango', 'piece', 0, 0, NULL, 0),
('Gelatin', 'pack', 0, 0, NULL, 0),
('Puree Mango', 'kg', 0, 0, NULL, 0),
('Puree Raspberries', 'kg', 0, 0, NULL, 0),
('Puree Passion Fruit', 'kg', 0, 0, NULL, 0),
('Raspberries', 'kg', 0, 0, NULL, 0),
('Cacao', 'kg', 0, 0, NULL, 0),
('Peanut Butter', 'kg', 0, 0, NULL, 0),
('Heavy Cream 33', 'liter', 0, 0, NULL, 0),
('Piping Bag', 'piece', 0, 0, NULL, 0),
('Chocolate Biscuit', 'pack', 0, 0, NULL, 0),
('Condensed Milk', 'can', 0, 0, NULL, 0),
('Washing Soap', 'bottle', 0, 0, NULL, 0),
('Trash Bag', 'roll', 0, 0, NULL, 0),
('Strech Wrap', 'roll', 0, 0, NULL, 0),
('Hair Net', 'pack', 0, 0, NULL, 0),
('Testing Box', 'piece', 0, 0, NULL, 0),
('Alpen Chocolate', 'bar', 0, 0, NULL, 0),
('Ghee', 'kg', 0, 0, NULL, 0),
('Peanut', 'kg', 0, 0, NULL, 0),
('Glaze Orange', 'bottle', 0, 0, NULL, 0),
('Glaze Pink', 'bottle', 0, 0, NULL, 0),
('Glaze Green', 'bottle', 0, 0, NULL, 0),
('Glaze Black', 'bottle', 0, 0, NULL, 0),
('Glaze White', 'bottle', 0, 0, NULL, 0),
('Glaze Yellow', 'bottle', 0, 0, NULL, 0),
('Glaze Blue', 'bottle', 0, 0, NULL, 0),
('Oil', 'liter', 0, 0, NULL, 0),
('Kitchen Towels', 'roll', 0, 0, NULL, 0),
('Food color', 'bottle', 0, 0, NULL, 0),
('cinamon', 'kg', 0, 0, NULL, 0),
('yeast', 'pack', 0, 0, NULL, 0),
('Kefir', 'liter', 0, 0, NULL, 0),
('mascarpone cheese', 'kg', 0, 0, NULL, 0),
('flowers decor', 'pack', 0, 0, NULL, 0),
('Lotus biscuit', 'pack', 0, 0, NULL, 0),
('Lotus butter', 'jar', 0, 0, NULL, 0),
('Honey', 'bottle', 0, 0, NULL, 0),
('Soda', 'bottle', 0, 0, NULL, 0),
('Baking powder', 'pack', 0, 0, NULL, 0),
('Milk butter', 'kg', 0, 0, NULL, 0),
('Salt', 'kg', 0, 0, NULL, 0),
('Brown sugar', 'kg', 0, 0, NULL, 0),
('vineger', 'bottle', 0, 0, NULL, 0),
('kakao', 'kg', 0, 0, NULL, 0);

-- Commit the transaction
COMMIT;

-- Verify the results
SELECT COUNT(*) as client_count FROM public.clients;
SELECT COUNT(*) as material_count FROM public.materials;

-- Display first few records to verify
SELECT name FROM public.clients LIMIT 10;
SELECT name FROM public.materials LIMIT 10;