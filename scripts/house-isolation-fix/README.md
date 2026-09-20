# House isolation + pending cards fix

Feature branch: `fix/pending-cards-checklist-house`

## What this patches
1. Login password eye toggle
2. Dashboard cards red when pending (shopping, inventory issues, reminders, tasks, assigned)
3. Checklist admin CRUD remains Supabase+realtime (legacy `checklist` table); stop autoseed on empty house
4. New house = empty checklist + empty inventory (no copy/default mix)
5. Calendar assignment checklist filtered by that house only (Checklist + AssignedTasks + service)

## Safety
Workflow only applies on `fix/pending-cards-checklist-house`. Does **not** push to `main` / production.

## Verify after Action succeeds
1. Login → eye toggles password visibility
2. Add shopping item as employee → manager/owner shopping card turns red with count
3. Checklist admin add/edit/delete → appears on other device via realtime
4. Create new house → checklist + inventory empty
5. Assign calendar job on house A → employee sees only house A checklist items
6. `npm run build` on the branch (Action commit should be TDZ-clean)

## Production
Merge PR only after Jonathan reviews. Deploy is via push to `main`.
