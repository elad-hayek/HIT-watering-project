-- ============================================================================
-- Migration 006: Add Plant Image Coordinates
-- Description: 
--   - Adds image_x_coordinate and image_y_coordinate to plants table
--   - These columns store pixel positions for plants placed on image-based areas
--   - Used in conjunction with image areas (photo_display_type = 'image')
--   - For map-based areas, lat/lng are used instead
-- Date Created: 2026-04-15
-- Prerequisites: Migration 005 must be run first
-- ============================================================================

USE watering_db;

-- ============================================================================
-- Step 1: Add image coordinate columns to plants table
-- ============================================================================
ALTER TABLE plants ADD COLUMN image_x_coordinate INT NULL DEFAULT NULL AFTER watering_volume_liters;
ALTER TABLE plants ADD COLUMN image_y_coordinate INT NULL DEFAULT NULL AFTER image_x_coordinate;

-- ============================================================================
-- Verification
-- ============================================================================
-- After this migration:
-- - plants table will have image_x_coordinate column (nullable INT for X pixel position)
-- - plants table will have image_y_coordinate column (nullable INT for Y pixel position)
-- - These are only used for plants in image-based areas
-- - For map-based areas, lat/lng coordinates are used instead
-- ============================================================================
