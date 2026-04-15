-- ============================================================================
-- Migration 008: Make lat/lng Nullable for Image-Based Areas
-- Description:
--   - Modifies plants table to allow NULL lat/lng coordinates
--   - Necessary for image-based areas that use pixel coordinates instead
--   - For map-based areas, lat/lng will still be required (enforced via application logic)
--   - Plants in image areas will have NULL lat/lng and use image_x_coordinate/image_y_coordinate instead
-- Date Created: 2026-04-15
-- Prerequisites: Migration 007 must be run first
-- ============================================================================

USE watering_db;

-- ============================================================================
-- Step 1: Modify lat column to allow NULL
-- ============================================================================
ALTER TABLE plants MODIFY COLUMN lat DECIMAL(10,7) NULL;

-- ============================================================================
-- Step 2: Modify lng column to allow NULL
-- ============================================================================
ALTER TABLE plants MODIFY COLUMN lng DECIMAL(10,7) NULL;

-- ============================================================================
-- Verification
-- ============================================================================
-- After this migration:
-- - lat column can now be NULL (for image-based area plants)
-- - lng column can now be NULL (for image-based area plants)
-- - Application logic enforces that either (lat, lng) OR (image_x_coordinate, image_y_coordinate) are provided
-- - Map-based areas will continue to require lat/lng values
-- - Image-based areas will use image coordinates instead
-- ============================================================================
