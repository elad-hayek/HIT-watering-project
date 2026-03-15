-- RBAC System Migration
-- This migration adds role-based access control to the watering dashboard

USE watering_db;

-- Step 1: Add role column to users table
ALTER TABLE users ADD COLUMN role ENUM('user', 'area_manager', 'admin') DEFAULT 'user' AFTER title;

-- Step 2: Create user_area_mapping table
-- Maps which users manage which areas (for area managers)
DROP TABLE IF EXISTS user_area_mapping;
CREATE TABLE user_area_mapping (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `area_id` int NOT NULL,
  `assigned_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` int,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_area` (`user_id`, `area_id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_area` (`area_id`),
  FOREIGN KEY (`user_id`) REFERENCES users(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`area_id`) REFERENCES areas(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_by`) REFERENCES users(`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Step 3: Seed first admin user (the existing admin user)
UPDATE users SET role = 'admin' WHERE username = '340969674' LIMIT 1;

-- Step 4: Set test users to appropriate roles
UPDATE users SET role = 'area_manager' WHERE username = '111111111' LIMIT 1;
UPDATE users SET role = 'user' WHERE username = '222222222' LIMIT 1;

-- Step 5: Create role definitions reference table (optional but helpful)
DROP TABLE IF EXISTS role_definitions;
CREATE TABLE role_definitions (
  `id` int NOT NULL AUTO_INCREMENT,
  `role_name` VARCHAR(50) NOT NULL UNIQUE,
  `display_name` VARCHAR(100) NOT NULL,
  `hierarchy_level` int NOT NULL,
  `can_manage_users` BOOLEAN DEFAULT FALSE,
  `can_view_all_areas` BOOLEAN DEFAULT FALSE,
  `can_create_areas` BOOLEAN DEFAULT FALSE,
  `can_view_activity` BOOLEAN DEFAULT FALSE,
  `description` TEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Insert role definitions
INSERT INTO role_definitions (role_name, display_name, hierarchy_level, can_manage_users, can_view_all_areas, can_create_areas, can_view_activity, description) VALUES
  ('user', 'User', 1, FALSE, FALSE, FALSE, FALSE, 'Basic user - can only view assigned areas'),
  ('area_manager', 'Area Manager', 2, FALSE, FALSE, TRUE, TRUE, 'Can manage assigned areas and lower-tier users'),
  ('admin', 'Administrator', 3, TRUE, TRUE, TRUE, TRUE, 'Full system access');
