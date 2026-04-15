-- ============================================================================
-- Migration 003: Add Area Manager and Admin Permission Levels
-- Description: Extends permission enum to support 'area_manager' and 'admin'
-- Date Created: 2026-03-17
-- Prerequisites: Migration 002 (RBAC system) must be run first
-- ============================================================================

USE watering_db;

-- ============================================================================
-- Step 1: Modify user_area_mapping permission enum
-- Add 'area_manager' and 'admin' permission levels
-- Permission levels now: 'read' (view only), 'update' (edit plants), 
--                        'area_manager' (manage area and users), 'admin' (full admin)
-- ============================================================================
ALTER TABLE user_area_mapping 
MODIFY COLUMN permission ENUM('read', 'update', 'area_manager', 'admin') DEFAULT 'read';

-- ============================================================================
-- Migration complete
-- Next steps:
-- - Restart the backend application to load the new permissions
-- - Users can now be assigned as area_manager or admin for specific areas
-- ============================================================================
