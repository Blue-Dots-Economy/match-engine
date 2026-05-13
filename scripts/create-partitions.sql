-- DPG Items Table Partition Setup Script
-- Run this script on the DPG database to create partitions for the items table
-- This is required before agents can create items

-- List of common item types to create partitions for
-- Add more item types as needed for your use case

DO $$
DECLARE
    item_types TEXT[] := ARRAY[
        'profile',
        'document',
        'credential',
        'action',
        'event',
        'preference',
        'address',
        'contact',
        'payment',
        'subscription'
    ];
    type_name TEXT;
BEGIN
    FOREACH type_name IN ARRAY item_types
    LOOP
        -- Check if partition already exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_partitions 
            WHERE table_name = 'items' AND partition_name = 'items_' || type_name
        ) THEN
            EXECUTE format(
                'CREATE TABLE items_%I PARTITION OF items FOR VALUES IN (%L)',
                type_name,
                type_name
            );
            RAISE NOTICE 'Created partition: items_%s', type_name;
        ELSE
            RAISE NOTICE 'Partition already exists: items_%s', type_name;
        END IF;
    END LOOP;
END $$;

-- Verify partitions
SELECT 
    partition_name,
    partition_keys,
    partition_description
FROM information_schema.table_partitions 
WHERE table_name = 'items'
ORDER BY partition_name;