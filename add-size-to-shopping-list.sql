-- Add size column to shopping_list table
ALTER TABLE shopping_list 
ADD COLUMN IF NOT EXISTS size TEXT DEFAULT 'Mediano';

-- Update existing records to have default size
UPDATE shopping_list 
SET size = 'Mediano' 
WHERE size IS NULL;

-- Verify the column was added
SELECT 'size column added successfully to shopping_list table' as status;
