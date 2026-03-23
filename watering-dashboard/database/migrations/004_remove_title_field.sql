-- ============================================================================
-- Migration 004: Remove Title Field
-- Description: Removes the unused title column from the users table
-- Date Created: 2026-03-23
-- Prerequisites: Migration 003 must be run first
-- ============================================================================

USE watering_db;

-- ============================================================================
-- Step 1: Drop the title column from users table
-- ============================================================================
ALTER TABLE users DROP COLUMN title;

-- ============================================================================
-- Verification
-- ============================================================================
-- After this migration, the users table will have these columns:
-- id, username, password, lastname, name, city, role, created_at
-- ============================================================================
