-- ============================================================================
-- Migration 009: Remove Seeded Users
-- Description: Removes sample users created by the initial schema migration
-- Date Created: 2026-05-29
-- Prerequisites: Migration 008 must be run first
-- ============================================================================

USE watering_db;

DELETE FROM users
WHERE username IN ('340969674', '111111111', '222222222');

-- ============================================================================
-- Migration complete
-- ============================================================================
