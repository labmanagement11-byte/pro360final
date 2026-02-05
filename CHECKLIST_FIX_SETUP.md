# 🔧 Checklist Fix - Setup Instructions

## Problem
Employees see "0/0 completadas" with empty checklists when assignments are created.

## Root Cause  
The `calendar_assignments` table uses numeric IDs (e.g., 125), but `cleaning_checklist` table expects UUID values for the `calendar_assignment_id` column.

## Solution
Convert to UUID-based references for checklist items.

## What's Been Done ✅

1. **Code Updated** (Commits 30a5b89 + afe2297)
   - `createCalendarAssignment()`: Now generates UUID and attempts to store in `checklist_uuid` column
   - `createCleaningChecklistItems()`: Uses UUID instead of numeric ID
   - `getCleaningChecklistItems()`: Retrieves items using UUID, with fallbacks
   - Fallback to localStorage if column doesn't exist yet

2. **Checklist Items Created** for assignment 125
   - UUID: `bd068b93-8489-402b-ba2b-f702da285795`
   - 7 items created in `cleaning_checklist` table

3. **Deployed** to Vercel
   - Latest code is live and ready

## What's Needed ⏳

Run this SQL in Supabase SQL Editor to complete the setup:

```sql
ALTER TABLE calendar_assignments 
ADD COLUMN checklist_uuid UUID;

UPDATE calendar_assignments 
SET checklist_uuid = 'bd068b93-8489-402b-ba2b-f702da285795'
WHERE id = 125;
```

**Steps to execute:**
1. Go to https://supabase.com/dashboard
2. Select your project (pro360final)
3. Go to SQL Editor
4. Paste the SQL above
5. Click "Run"

## After Running SQL

✨ Employee "chava" should now see 7 checklist items when viewing assignment 125

**New assignments created after the latest deploy will work automatically** because the code now:
- Generates UUID when creating assignments
- Stores UUID in database
- Uses UUID to link checklist items

## Files Created (for reference)
- `ADD_CHECKLIST_UUID_COLUMN.sql` - The SQL migration script
- `setup-checklist-uuid.js` - Verification script
- Various debug scripts in root directory

## Testing

After running the SQL:
1. Log in as manager and assign a cleaning task
2. Employee logs in and clicks "Ver Checklist"
3. Items should appear (not 0/0)
4. Can mark items as complete

---

**Status**: Code deployed ✅ | Database schema pending ⏳ | Testing needed 🔍
