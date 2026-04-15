-- Migration 007: Add image dimensions to areas table
-- Stores the width and height of uploaded area images for validation

ALTER TABLE areas
ADD COLUMN photo_width INT DEFAULT NULL,
ADD COLUMN photo_height INT DEFAULT NULL;

-- Add indexes for better querying
ALTER TABLE areas
ADD INDEX idx_photo_dimensions (photo_width, photo_height);
