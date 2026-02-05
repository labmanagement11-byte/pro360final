-- Add checklist_uuid column to calendar_assignments table
-- This column stores a UUID that references items in the cleaning_checklist table
-- Run this in Supabase SQL Editor to complete the setup

ALTER TABLE calendar_assignments 
ADD COLUMN checklist_uuid UUID;

-- Update existing assignment 125 with the UUID that was created for its checklist items
UPDATE calendar_assignments 
SET checklist_uuid = 'bd068b93-8489-402b-ba2b-f702da285795'
WHERE id = 125;

-- Verify the update
SELECT id, checklist_uuid, employee, date FROM calendar_assignments WHERE id = 125;
