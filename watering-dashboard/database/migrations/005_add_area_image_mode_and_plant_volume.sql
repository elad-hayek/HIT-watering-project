-- ============================================================================
-- Migration 005: Add Area Image Display Mode and Plant Watering Volume
-- Description: 
--   - Adds photo_display_type to areas table to track whether area displays map or image
--   - Adds watering_volume_liters to plants table to track volume dispensed per watering
-- Date Created: 2026-04-15
-- Prerequisites: Migration 004 must be run first
-- ============================================================================

USE watering_db;

-- ============================================================================
-- Step 1: Add photo_display_type to areas table
-- ============================================================================
ALTER TABLE areas ADD COLUMN photo_display_type ENUM('map', 'image') DEFAULT 'map' AFTER photo_url;

-- ============================================================================
-- Step 2: Add watering_volume_liters to plants table
-- ============================================================================
ALTER TABLE plants ADD COLUMN watering_volume_liters DECIMAL(10, 2) NULL DEFAULT NULL AFTER watering_frequency_days;

-- ============================================================================
-- Verification
-- ============================================================================
-- After this migration:
-- - areas table will have photo_display_type column (values: 'map' or 'image', default 'map')
-- - plants table will have watering_volume_liters column (nullable decimal for volume in liters)
-- ============================================================================
