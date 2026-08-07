# New Drive Notes

## Right-click move workflow

- [ ] Add a right-click context menu action for selected files and folders named
      `Move to space`.
- [ ] Show the available destination spaces after choosing the action.
- [ ] Prompt for a new destination folder name, create that folder inside the selected
      space, and move all selected items into it.
- [ ] Validate permissions, duplicate folder names, move conflicts, and partial failures
      before connecting the workflow to the backend.

This workflow is intentionally not implemented yet.

## Space permissions

- [ ] Restrict space creation to users with the `admin` role.
- [ ] Add a visibility setting when creating or editing a space:
  - `Admin only`: only administrators can discover and open the space.
  - `Everyone`: all authenticated users can discover and open the space.
- [ ] Enforce space visibility in both navigation and direct-route authorization when the
      backend is connected.

These permission rules are intentionally not implemented yet.
