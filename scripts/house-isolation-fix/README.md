# House isolation + pending cards fix

Feature branch only: `fix/pending-cards-checklist-house`.

Do **not** merge to `main` / production until Jonathan reviews live preview.

## Scripts
- `patch_login.py` — password eye toggle
- `patch_dashboard_css.py` — red pending card styles
- `patch_dashboard_pending_cards.py` — pending counts + badges
- `patch_dashboard_no_autoseed.py` — empty new houses (no auto-seed)
- `patch_assigned_tasks_house_checklist.py` — per-house checklist subtasks
- `patch_checklist_house.py` — assignmentId → house filter
- `patch_calendar.py` — pass assignment house into Checklist
- `patch_service_house_isolation.py` — empty createHouse + legacy checklist fallback

## Apply
GitHub Action `apply-house-isolation-fix.yml` runs `assemble_parts.py` then `apply_all.py` on this branch only.
