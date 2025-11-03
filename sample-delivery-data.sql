-- Sample delivery data for dashboard charts and daily planning
-- This script creates realistic delivery data for the last 30 days and upcoming week

-- First, ensure we have clients and products
DO $$
DECLARE
    client1_id UUID := '550e8400-e29b-41d4-a716-446655440001';
    client2_id UUID := '550e8400-e29b-41d4-a716-446655440002';
    client3_id UUID := '550e8400-e29b-41d4-a716-446655440003';
    client4_id UUID := '550e8400-e29b-41d4-a716-446655440004';
    
    product1_id UUID := '650e8400-e29b-41d4-a716-446655440001';
    product2_id UUID := '650e8400-e29b-41d4-a716-446655440002';
    product3_id UUID := '650e8400-e29b-41d4-a716-446655440003';
    product4_id UUID := '650e8400-e29b-41d4-a716-446655440004';
    product5_id UUID := '650e8400-e29b-41d4-a716-446655440005';
    product6_id UUID := '650e8400-e29b-41d4-a716-446655440006';
    
    delivery_id UUID;
    current_date DATE;
    i INTEGER;
BEGIN
    -- Insert sample clients if they don't exist
    INSERT INTO clients (id, name, business_name, phone, email, address, credit_limit, payment_terms, last_order_date)
    VALUES 
        (client1_id, 'Aibek', 'Coffee House "Sierra"', '+996-555-1234', 'aibek@sierra.kg', 'Chuy Ave 123, Bishkek', 50000, 30, CURRENT_DATE - INTERVAL '2 days'),
        (client2_id, 'Nargiza', 'Sweet Dreams Bakery', '+996-555-5678', 'nargiza@sweetdreams.kg', 'Manas Ave 456, Bishkek', 30000, 15, CURRENT_DATE - INTERVAL '5 days'),
        (client3_id, 'Timur', 'Royal Restaurant', '+996-555-9012', 'timur@royal.kg', 'Erkindik Blvd 789, Bishkek', 75000, 45, CURRENT_DATE - INTERVAL '1 day'),
        (client4_id, 'Elena', 'City Café Network', '+996-555-3456', 'elena@citycafe.kg', 'Jibek Jolu 101, Bishkek', 100000, 30, CURRENT_DATE - INTERVAL '3 days')
    ON CONFLICT (id) DO UPDATE SET
        last_order_date = EXCLUDED.last_order_date;

    -- Insert sample products if they don't exist
    INSERT INTO products (id, name, unit, price, category, description, is_available)
    VALUES 
        (product1_id, 'Dubai Chocolate Cake', 'piece', 2500, 'Dubai', 'Premium chocolate cake with gold leaf', true),
        (product2_id, 'Cheesecake Mango', 'piece', 1800, 'Fruit Cheesecake', 'Fresh mango cheesecake', true),
        (product3_id, 'Classic Vanilla Cake', 'piece', 1200, 'Classic', 'Traditional vanilla sponge cake', true),
        (product4_id, 'Dubai Pistachio Delight', 'piece', 2800, 'Dubai', 'Luxury pistachio cake with nuts', true),
        (product5_id, 'Strawberry Cheesecake', 'piece', 1600, 'Fruit Cheesecake', 'Fresh strawberry cheesecake', true),
        (product6_id, 'Chocolate Fudge Cake', 'piece', 1400, 'Cakes', 'Rich chocolate fudge cake', true)
    ON CONFLICT (id) DO NOTHING;

    -- Generate deliveries for the past 30 days
    current_date := CURRENT_DATE - INTERVAL '30 days';
    i := 1;
    
    WHILE current_date <= CURRENT_DATE + INTERVAL '7 days' LOOP
        -- Generate 1-3 deliveries per day (more on weekdays)
        FOR delivery_num IN 1..(CASE 
            WHEN EXTRACT(DOW FROM current_date) IN (6, 0) THEN 1 -- Weekend: 1 delivery
            ELSE 2 + (i % 2) -- Weekday: 2-3 deliveries
        END) LOOP
            
            delivery_id := gen_random_uuid();
            
            -- Create delivery
            INSERT INTO deliveries (
                id, 
                invoice_number, 
                client_id, 
                date, 
                status,
                notes,
                created_at
            ) VALUES (
                delivery_id,
                'INV' || lpad((i + delivery_num)::text, 6, '0'),
                CASE delivery_num % 4
                    WHEN 0 THEN client1_id
                    WHEN 1 THEN client2_id
                    WHEN 2 THEN client3_id
                    ELSE client4_id
                END,
                current_date,
                CASE 
                    WHEN current_date < CURRENT_DATE - INTERVAL '7 days' THEN 'Paid'
                    WHEN current_date < CURRENT_DATE THEN 
                        CASE (delivery_num % 3) 
                            WHEN 0 THEN 'Settled'
                            ELSE 'Paid'
                        END
                    ELSE 'Pending'
                END,
                CASE delivery_num % 3
                    WHEN 0 THEN 'Regular weekly order'
                    WHEN 1 THEN 'Special event catering'
                    ELSE NULL
                END,
                current_date + INTERVAL '8 hours'
            );
            
            -- Add delivery items (2-4 items per delivery)
            FOR item_num IN 1..(2 + (delivery_num % 3)) LOOP
                INSERT INTO delivery_items (
                    delivery_id,
                    product_id,
                    quantity,
                    price
                ) VALUES (
                    delivery_id,
                    CASE item_num % 6
                        WHEN 0 THEN product1_id
                        WHEN 1 THEN product2_id
                        WHEN 2 THEN product3_id
                        WHEN 3 THEN product4_id
                        WHEN 4 THEN product5_id
                        ELSE product6_id
                    END,
                    (1 + (item_num % 4)) * (CASE EXTRACT(DOW FROM current_date) WHEN 1 THEN 2 ELSE 1 END), -- More quantity on Mondays
                    CASE item_num % 6
                        WHEN 0 THEN 2500
                        WHEN 1 THEN 1800
                        WHEN 2 THEN 1200
                        WHEN 3 THEN 2800
                        WHEN 4 THEN 1600
                        ELSE 1400
                    END
                );
            END LOOP;
            
            -- Add some returns for completed deliveries (10% chance)
            IF current_date < CURRENT_DATE AND (delivery_num % 10 = 0) THEN
                INSERT INTO return_items (delivery_id, product_id, quantity, reason)
                SELECT delivery_id, product_id, 1, 'Quality issue'
                FROM delivery_items 
                WHERE delivery_id = delivery_id 
                LIMIT 1;
            END IF;
            
            -- Add payments for non-pending deliveries
            IF current_date < CURRENT_DATE THEN
                INSERT INTO payments (
                    delivery_id,
                    amount,
                    method,
                    payment_date,
                    notes
                ) SELECT 
                    delivery_id,
                    (SELECT SUM(quantity * price) FROM delivery_items WHERE delivery_id = delivery_id) * 0.8,
                    CASE delivery_num % 3
                        WHEN 0 THEN 'Cash'
                        WHEN 1 THEN 'Bank Transfer'
                        ELSE 'Card'
                    END,
                    current_date + INTERVAL '1 day',
                    'Payment received'
                WHERE EXISTS (SELECT 1 FROM delivery_items WHERE delivery_id = delivery_id);
            END IF;
            
        END LOOP;
        
        current_date := current_date + INTERVAL '1 day';
        i := i + 1;
    END LOOP;
    
    RAISE NOTICE 'Sample delivery data created successfully!';
    RAISE NOTICE 'Generated deliveries from % to %', CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE + INTERVAL '7 days';
END $$;