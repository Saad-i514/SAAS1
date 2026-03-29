-- SQL Script to Clear All Production Data
-- This preserves the database structure but removes all records
-- Execute this in your PostgreSQL database

-- Disable foreign key checks temporarily (PostgreSQL)
BEGIN;

-- Delete in correct order (respects foreign keys)
DELETE FROM transactions;
DELETE FROM products;
DELETE FROM suppliers;
DELETE FROM dynamic_columns;
DELETE FROM users;
DELETE FROM companies;

-- Commit the changes
COMMIT;

-- Verify all tables are empty
SELECT 'companies' as table_name, COUNT(*) as count FROM companies
UNION ALL
SELECT 'users', COUNT(*) FROM users
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'suppliers', COUNT(*) FROM suppliers
UNION ALL
SELECT 'transactions', COUNT(*) FROM transactions
UNION ALL
SELECT 'dynamic_columns', COUNT(*) FROM dynamic_columns;
